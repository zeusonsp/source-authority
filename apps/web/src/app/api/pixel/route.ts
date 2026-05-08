import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";
import { env as clientEnv } from "@/lib/env";
import { env } from "@/lib/env-server";

/**
 * POST /api/pixel — endpoint público de tracking via JavaScript embed.
 *
 * Recebe ping de `pixel.js` rodando no site do cliente (zeusoficial.com etc).
 * 1 evento por sessão (dedupe no client via sessionStorage).
 *
 * CORS aberto (necessário pra rodar em qualquer domínio do cliente).
 * Não exige auth — público por design (mesma natureza de Google Analytics
 * collect endpoint). Validação anti-abuse: slug precisa existir + match
 * em companies.slug.
 *
 * Returns 204 sempre que processou (evita logs de erro no console do
 * cliente). 400 só pra body inválido óbvio. 4xx/5xx são silently
 * swallowed pelo pixel.js.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  url: z.string().url().max(2000).nullable().optional(),
  referrer: z.string().max(2000).nullable().optional(),
  ref: z.string().max(64).nullable().optional(),
  lang: z.string().max(20).nullable().optional(),
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
    // Body inválido — retornamos 204 mesmo assim pra evitar leak de
    // detalhes. Pixel.js silently swallows non-2xx anyway.
    return noContent();
  }

  const supabase = createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Lookup company por slug. Se não existir, drop silencioso.
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", parsed.slug)
    .maybeSingle();

  if (!company) return noContent();

  // Parse User-Agent + headers Vercel pra device + ip_country (mesmo
  // pattern do tracker worker mas em Node).
  const ua = req.headers.get("user-agent") ?? null;
  const ipCountryRaw = req.headers.get("x-vercel-ip-country");
  const ipCountry =
    ipCountryRaw && /^[A-Z]{2}$/i.test(ipCountryRaw)
      ? ipCountryRaw.toUpperCase()
      : null;
  const ipCity = req.headers.get("x-vercel-ip-city") ?? null;

  const device = parseDevice(ua);
  const referrerCode = parseRefCode(parsed.ref ?? null);

  const insertResult = await supabase.from("events").insert({
    company_id: company.id,
    device,
    ip_country: ipCountry,
    ip_city: ipCity,
    lang: parsed.lang ?? null,
    referrer: parsed.referrer ?? null,
    user_agent: ua,
    referrer_code: referrerCode,
  });

  if (insertResult.error) {
    console.error("[pixel] insert error", {
      slug: parsed.slug,
      err: insertResult.error.message,
    });
    // Ainda retorna 204 — não vamos punir o visitante com erro 500
    // por bug nosso. Stripe/Sentry pega via console error.
  }

  return noContent();
}

function parseDevice(
  ua: string | null,
): "mobile" | "desktop" | "tablet" | "unknown" {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(lower)) return "tablet";
  if (/mobi|android|iphone|ipod|opera mini|iemobile/.test(lower)) {
    return "mobile";
  }
  return "desktop";
}

function parseRefCode(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().slice(0, 64);
  if (!cleaned || /\s/.test(cleaned)) return null;
  return cleaned;
}
