import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";
import { env as clientEnv } from "@/lib/env";
import { env } from "@/lib/env-server";
import { parseUserAgent } from "@/lib/tracking/parse-ua";

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
  url_path: z.string().max(500).nullable().optional(),
  referrer: z.string().max(2000).nullable().optional(),
  ref: z.string().max(64).nullable().optional(),
  lang: z.string().max(20).nullable().optional(),
  session_id: z.string().max(64).nullable().optional(),
  // Browser/device (pixel.js coleta).
  screen_width: z.number().int().min(0).max(16384).nullable().optional(),
  screen_height: z.number().int().min(0).max(16384).nullable().optional(),
  viewport_width: z.number().int().min(0).max(16384).nullable().optional(),
  viewport_height: z.number().int().min(0).max(16384).nullable().optional(),
  color_depth: z.number().int().min(0).max(64).nullable().optional(),
  device_pixel_ratio: z.number().min(0).max(10).nullable().optional(),
  network_type: z
    .enum(["slow-2g", "2g", "3g", "4g", "5g", "unknown"])
    .nullable()
    .optional(),
  // UTM params (paralelo ao ?ref= proprietário).
  utm_source: z.string().max(200).nullable().optional(),
  utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(),
  utm_term: z.string().max(200).nullable().optional(),
  utm_content: z.string().max(200).nullable().optional(),
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

  // Vercel Edge headers — mesma família do CF: x-vercel-ip-* + x-vercel-ip-timezone, etc.
  const ua = req.headers.get("user-agent") ?? null;
  const ipCountryRaw = req.headers.get("x-vercel-ip-country");
  const ipCountry =
    ipCountryRaw && /^[A-Z]{2}$/i.test(ipCountryRaw)
      ? ipCountryRaw.toUpperCase()
      : null;
  const ipCity = req.headers.get("x-vercel-ip-city") ?? null;
  const ipRegion = req.headers.get("x-vercel-ip-country-region") ?? null;
  const ipContinent = req.headers.get("x-vercel-ip-continent") ?? null;
  const ipTimezone = req.headers.get("x-vercel-ip-timezone") ?? null;
  const ipLatRaw = req.headers.get("x-vercel-ip-latitude");
  const ipLngRaw = req.headers.get("x-vercel-ip-longitude");
  const parseCoord = (v: string | null): number | null => {
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  const uaParsed = parseUserAgent(ua);
  // Mantém compat com lógica antiga (campo `device` continua existindo
  // como mobile/desktop/tablet/unknown). uaParsed.device_type é a fonte.
  const device = uaParsed.device_type;
  const referrerCode = parseRefCode(parsed.ref ?? null);

  const insertResult = await supabase.from("events").insert({
    company_id: company.id,
    device,
    // Geo
    ip_country: ipCountry,
    ip_city: ipCity,
    ip_region: ipRegion,
    ip_continent: ipContinent,
    ip_timezone: ipTimezone,
    ip_latitude: parseCoord(ipLatRaw),
    ip_longitude: parseCoord(ipLngRaw),
    // Headers / UA
    lang: parsed.lang ?? null,
    referrer: parsed.referrer ?? null,
    user_agent: ua,
    // Parsed UA (Migration 0013).
    browser_name: uaParsed.browser_name,
    browser_version: uaParsed.browser_version,
    os_name: uaParsed.os_name,
    os_version: uaParsed.os_version,
    device_vendor: uaParsed.device_vendor,
    device_model: uaParsed.device_model,
    referrer_code: referrerCode,
    session_id: parsed.session_id ?? null,
    // URL context
    url_path: parsed.url_path ?? null,
    utm_source: parsed.utm_source ?? null,
    utm_medium: parsed.utm_medium ?? null,
    utm_campaign: parsed.utm_campaign ?? null,
    utm_term: parsed.utm_term ?? null,
    utm_content: parsed.utm_content ?? null,
    // Browser/device (pixel-only)
    screen_width: parsed.screen_width ?? null,
    screen_height: parsed.screen_height ?? null,
    viewport_width: parsed.viewport_width ?? null,
    viewport_height: parsed.viewport_height ?? null,
    color_depth: parsed.color_depth ?? null,
    device_pixel_ratio: parsed.device_pixel_ratio ?? null,
    network_type: parsed.network_type ?? null,
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

function parseRefCode(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().slice(0, 64);
  if (!cleaned || /\s/.test(cleaned)) return null;
  return cleaned;
}
