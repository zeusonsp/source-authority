import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { isInternalRequestAuthorized } from "@/app/api/internal/_auth";
import { env } from "@/lib/env-server";
import { computeDHash, hammingDistance } from "@/lib/content/hash";
import { fetchSource } from "@/lib/content/fetch-source";
import {
  isSerpApiConfigured,
  reverseImageSearchAllEngines,
} from "@/lib/integrations/serpapi";

/**
 * POST /api/internal/content/reverse-search
 *
 * Pra um conteúdo cadastrado, faz Google Reverse Image Search via SerpAPI
 * e gera alertas pra cada match com similaridade ≥ 81% (Hamming ≤ 12).
 *
 * Auth: Bearer INTERNAL_NOTIFICATIONS_SECRET. Chamado por:
 *   - Server action manual (botão "Buscar reposts agora" na UI)
 *   - Worker brand-monitor cron 12h (futuro)
 *
 * Flow:
 *   1. Carrega contents row
 *   2. Re-fetch og:image fresh (CDN URLs expiram, então sempre re-fetch)
 *   3. Upload temp pra usar como image_url no SerpAPI? Não — passa
 *      diretamente o thumbnail_url do source. Se não funcionar, fallback.
 *   4. SerpAPI google_reverse_image → lista de URLs encontrados
 *   5. Pra cada URL: fetch og:image → dHash → compare → se match insert alert
 *   6. Retorna {results_seen, matches_found}
 */

const requestSchema = z.object({
  content_id: z.string().uuid(),
});

const SIMILARITY_THRESHOLD = 12;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSerpApiConfigured()) {
    return NextResponse.json(
      { error: "serpapi_not_configured" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data: content, error: contentErr } = await supabase
    .from("contents")
    .select(
      "id, company_id, source_url, source_platform, thumbnail_url, thumbnail_dhash, title",
    )
    .eq("id", parsed.data.content_id)
    .single();

  if (contentErr || !content) {
    return NextResponse.json({ error: "content_not_found" }, { status: 404 });
  }

  if (!content.thumbnail_dhash) {
    return NextResponse.json(
      { error: "no_dhash", detail: "Conteúdo ainda não tem dHash computado." },
      { status: 422 },
    );
  }

  // Resolve thumbnail URL — prefer cached thumbnail_url, fallback re-fetch.
  let imageUrl = content.thumbnail_url;
  if (!imageUrl) {
    const fresh = await fetchSource(content.source_url);
    if (!fresh.ok) {
      return NextResponse.json(
        { error: "thumbnail_unavailable", detail: fresh.reason },
        { status: 422 },
      );
    }
    imageUrl = fresh.metadata.thumbnail_url;
  }
  if (!imageUrl) {
    return NextResponse.json(
      { error: "no_image_url" },
      { status: 422 },
    );
  }

  let serpResponse;
  try {
    serpResponse = await reverseImageSearchAllEngines(imageUrl);
  } catch (err) {
    console.error("[reverse-search] serpapi failed", err);
    return NextResponse.json(
      { error: "serpapi_failed", detail: String(err) },
      { status: 502 },
    );
  }

  const serpResults = serpResponse.results;
  const resultsSeen = serpResults.length;
  let matchesFound = 0;
  const highAlertIds: string[] = [];

  // Lista de domínios a ignorar — sites onde o original PRÓPRIO está hospedado.
  // Evita criar alerta dizendo "achei tua arte na tua página".
  const ownDomains = new Set<string>([
    new URL(content.source_url).hostname,
    "sourceauthority.com.br",
    "app.sourceauthority.com.br",
  ]);

  for (const result of serpResults.slice(0, 30)) {
    if (!result.link) continue;
    let resultHost: string;
    try {
      resultHost = new URL(result.link).hostname;
    } catch {
      continue;
    }
    if (ownDomains.has(resultHost)) continue;

    // Re-fetch og:image do resultado pra computar dHash localmente.
    const remote = await fetchSource(result.link).catch(() => null);
    if (!remote || !remote.ok) continue;

    let resultHash: string;
    try {
      resultHash = await computeDHash(remote.thumbnail);
    } catch {
      continue;
    }

    const distance = hammingDistance(resultHash, content.thumbnail_dhash);
    if (distance > SIMILARITY_THRESHOLD) continue;

    const similarity = 1 - distance / 64;
    const severity = distance <= 6 ? "high" : "medium";

    const { data: inserted, error: alertErr } = await supabase
      .from("alerts")
      .insert({
        company_id: content.company_id,
        type: "content_repost",
        severity,
        status: "new",
        source: "google_reverse_image",
        data: {
          suspect_url: result.link,
          suspect_host: resultHost,
          suspect_title: result.title ?? null,
          suspect_thumbnail: result.thumbnail ?? null,
          suspect_snippet: result.snippet ?? null,
          matched_content_id: content.id,
          matched_content_title: content.title ?? null,
          matched_content_url: content.source_url,
          hamming_distance: distance,
          similarity_score: Number(similarity.toFixed(3)),
          discovery_engine: "serpapi_google_reverse_image",
        },
      })
      .select("id")
      .single();

    if (alertErr || !inserted) {
      console.warn("[reverse-search] alert insert failed", alertErr);
      continue;
    }
    matchesFound += 1;
    if (severity === "high") highAlertIds.push(inserted.id);
  }

  // Fire-and-forget notify pra alerts high.
  for (const alertId of highAlertIds) {
    void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/internal/alerts/notify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INTERNAL_NOTIFICATIONS_SECRET}`,
      },
      body: JSON.stringify({ alert_id: alertId }),
    }).catch(() => {});
  }

  return NextResponse.json({
    results_seen: resultsSeen,
    matches_found: matchesFound,
    per_engine: serpResponse.per_engine,
    engine_errors: serpResponse.errors,
  });
}
