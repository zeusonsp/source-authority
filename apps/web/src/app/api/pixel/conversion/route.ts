import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";
import { env as clientEnv } from "@/lib/env";
import { env } from "@/lib/env-server";

/**
 * POST /api/pixel/conversion — Pillar 3 v2 conversion attribution.
 *
 * Cliente chama via `window.saTrack('conversion', {...})` (pixel.js)
 * quando uma venda acontece (página de obrigado / order confirmation).
 *
 * Atribuição: last-click within session.
 *   - Procura último events.referrer_code pra mesmo session_id (qualquer
 *     período — não tem janela de 30d porque events são do mesmo browser
 *     do mesmo visitor).
 *   - Se encontra: conversion.reseller_code = match. Caso contrário: NULL
 *     (atribuição orgânica / direta).
 *
 * Idempotência via UNIQUE (company_id, external_id) — chamadas duplicadas
 * pro mesmo external_id retornam 204 sem inserir nova row.
 *
 * CORS aberto. Sempre 204 (silently swallows errors no client).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  external_id: z.string().min(1).max(200),
  amount_cents: z.number().int().min(0),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .default("BRL"),
  session_id: z.string().max(64).nullable().optional(),
  // ISO 8601 — opcional. Default = now() no DB.
  occurred_at: z.string().datetime().nullable().optional(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function noContent() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch {
    return noContent();
  }

  const supabase = createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Lookup company.
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", parsed.slug)
    .maybeSingle();

  if (!company) return noContent();

  // Atribuição: último event do mesmo session_id que tinha referrer_code.
  let resellerCode: string | null = null;
  let sourceEventId: string | null = null;

  if (parsed.session_id) {
    const { data: matchEvent } = await supabase
      .from("events")
      .select("id, referrer_code")
      .eq("company_id", company.id)
      .eq("session_id", parsed.session_id)
      .not("referrer_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchEvent && matchEvent.referrer_code) {
      resellerCode = matchEvent.referrer_code;
      sourceEventId = matchEvent.id;
    }
  }

  // INSERT idempotente. ON CONFLICT DO NOTHING via UNIQUE constraint.
  const { error } = await supabase.from("conversions").insert({
    company_id: company.id,
    external_id: parsed.external_id,
    amount_cents: parsed.amount_cents,
    currency: parsed.currency,
    reseller_code: resellerCode,
    session_id: parsed.session_id ?? null,
    source_event_id: sourceEventId,
    occurred_at: parsed.occurred_at ?? new Date().toISOString(),
  });

  if (error) {
    // 23505 = duplicate (external_id já registrado) → não é erro real,
    // é a idempotência funcionando.
    if (error.code !== "23505") {
      console.error("[pixel/conversion] insert error", {
        slug: parsed.slug,
        external_id: parsed.external_id,
        err: error.message,
      });
    }
  }

  return noContent();
}
