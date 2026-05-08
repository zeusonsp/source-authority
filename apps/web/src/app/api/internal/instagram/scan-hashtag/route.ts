import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { computeDHash, hammingDistance } from "@/lib/content/hash";
import { isInternalRequestAuthorized } from "@/app/api/internal/_auth";
import { env } from "@/lib/env-server";
import {
  downloadMediaBuffer,
  fetchHashtagRecentMedia,
  pickThumbnailUrl,
  resolveHashtagId,
} from "@/lib/integrations/instagram-graph";

/**
 * POST /api/internal/instagram/scan-hashtag
 *
 * Endpoint chamado pelo workers/brand-monitor a cada 4h. Pra cada
 * (instagram_connection × hashtag_watch) ativo, faz:
 *
 *   1. Resolve ig_hashtag_id (cache no row se não tiver).
 *   2. Fetch recent media na hashtag via Instagram Graph API.
 *   3. Filtra posts novos via cursor (last_post_cursor = id do mais recente
 *      processado na execução anterior).
 *   4. Pra cada post novo: download thumbnail → dHash → compare contra
 *      contents.thumbnail_dhash da empresa.
 *   5. Se Hamming distance ≤ 12 (similaridade ≥ 81%), insere alert
 *      type='content_repost' com severity='high' (≤6) ou 'medium' (≤12).
 *   6. Atualiza last_post_cursor (post mais recente visto) + last_polled_at.
 *
 * Auth: Bearer INTERNAL_NOTIFICATIONS_SECRET (mesmo helper das outras
 * /api/internal/* — worker já manda esse header).
 *
 * Failure mode: try/catch por watch — uma hashtag falhar (token expirado,
 * rate limit, etc.) não derruba as outras. Worker já loga + segue.
 */

const requestSchema = z.object({
  company_id: z.string().uuid(),
  watch_id: z.string().uuid(),
  hashtag: z.string().regex(/^[a-z0-9_]+$/),
  ig_user_id: z.string(),
  access_token: z.string().min(20),
  ig_hashtag_id: z.string().nullable().optional(),
  last_post_cursor: z.string().nullable().optional(),
});

const SIMILARITY_THRESHOLD = 12;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    company_id,
    watch_id,
    hashtag,
    ig_user_id,
    access_token,
    ig_hashtag_id: cachedHashtagId,
    last_post_cursor,
  } = parsed.data;

  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  let hashtagId = cachedHashtagId ?? null;
  if (!hashtagId) {
    try {
      hashtagId = await resolveHashtagId(hashtag, ig_user_id, access_token);
    } catch (err) {
      console.error("[scan-hashtag] resolveHashtagId failed", err);
      return NextResponse.json(
        { error: "resolve_failed", detail: String(err) },
        { status: 502 },
      );
    }
    if (!hashtagId) {
      // Hashtag desconhecida pelo Instagram (ex: muito nicho). Não erro fatal.
      await supabase
        .from("hashtag_watches")
        .update({ last_polled_at: new Date().toISOString() })
        .eq("id", watch_id);
      return NextResponse.json({
        posts_seen: 0,
        posts_new: 0,
        alerts_created: 0,
        note: "hashtag_not_found",
      });
    }
  }

  let media;
  try {
    media = await fetchHashtagRecentMedia(hashtagId, ig_user_id, access_token);
  } catch (err) {
    console.error("[scan-hashtag] fetch_recent_media failed", err);
    return NextResponse.json(
      { error: "fetch_failed", detail: String(err) },
      { status: 502 },
    );
  }

  const posts = media.data ?? [];
  const postsSeen = posts.length;

  // Filtra só novos via cursor (mantém ordem retornada pela API: descendente).
  let newPosts = posts;
  if (last_post_cursor) {
    const idx = posts.findIndex((p) => p.id === last_post_cursor);
    if (idx >= 0) newPosts = posts.slice(0, idx);
  }

  if (newPosts.length === 0) {
    await supabase
      .from("hashtag_watches")
      .update({
        ig_hashtag_id: hashtagId,
        last_polled_at: new Date().toISOString(),
      })
      .eq("id", watch_id);
    return NextResponse.json({
      posts_seen: postsSeen,
      posts_new: 0,
      alerts_created: 0,
    });
  }

  const { data: contents } = await supabase
    .from("contents")
    .select("id, thumbnail_dhash, source_url, title")
    .eq("company_id", company_id)
    .eq("status", "ready")
    .not("thumbnail_dhash", "is", null);

  const candidateContents = (contents ?? []).filter((c) => c.thumbnail_dhash);

  let alertsCreated = 0;
  const highAlertIds: string[] = [];

  for (const post of newPosts) {
    const thumbUrl = pickThumbnailUrl(post);
    if (!thumbUrl) continue;
    if (candidateContents.length === 0) continue;

    const buffer = await downloadMediaBuffer(thumbUrl);
    if (!buffer) continue;

    let postHash: string;
    try {
      postHash = await computeDHash(buffer);
    } catch (err) {
      console.warn("[scan-hashtag] dHash failed", post.id, err);
      continue;
    }

    let bestMatch: {
      contentId: string;
      distance: number;
      title: string | null;
    } | null = null;
    for (const content of candidateContents) {
      const distance = hammingDistance(postHash, content.thumbnail_dhash!);
      if (distance > SIMILARITY_THRESHOLD) continue;
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          contentId: content.id,
          distance,
          title: content.title ?? null,
        };
      }
    }

    if (!bestMatch) continue;

    const similarity = 1 - bestMatch.distance / 64;
    const severity = bestMatch.distance <= 6 ? "high" : "medium";

    const { data: inserted, error: alertErr } = await supabase
      .from("alerts")
      .insert({
        company_id,
        type: "content_repost",
        severity,
        status: "new",
        source: "instagram_hashtag",
        data: {
          ig_post_id: post.id,
          ig_post_url: post.permalink,
          ig_post_username: post.username ?? null,
          ig_post_timestamp: post.timestamp,
          ig_post_caption: post.caption?.slice(0, 500) ?? null,
          thumbnail_url: thumbUrl,
          post_dhash: postHash,
          matched_content_id: bestMatch.contentId,
          matched_content_title: bestMatch.title,
          hamming_distance: bestMatch.distance,
          similarity_score: Number(similarity.toFixed(3)),
          hashtag,
        },
      })
      .select("id")
      .single();

    if (alertErr || !inserted) {
      console.error("[scan-hashtag] alert insert failed", alertErr);
      continue;
    }
    alertsCreated += 1;
    if (severity === "high") highAlertIds.push(inserted.id);
  }

  // Cursor = ID do post mais recente (primeiro do batch novo).
  const newCursor = newPosts[0]?.id ?? last_post_cursor ?? null;
  await supabase
    .from("hashtag_watches")
    .update({
      ig_hashtag_id: hashtagId,
      last_post_cursor: newCursor,
      last_polled_at: new Date().toISOString(),
    })
    .eq("id", watch_id);

  // High-severity → fire-and-forget notification por alert.
  for (const alertId of highAlertIds) {
    void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/internal/alerts/notify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INTERNAL_NOTIFICATIONS_SECRET}`,
      },
      body: JSON.stringify({ alert_id: alertId }),
    }).catch((err) => {
      console.warn("[scan-hashtag] notify dispatch failed", err);
    });
  }

  return NextResponse.json({
    posts_seen: postsSeen,
    posts_new: newPosts.length,
    alerts_created: alertsCreated,
  });
}
