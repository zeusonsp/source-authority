/**
 * source-authority-tracker — Worker do link mestre.
 *
 * Fluxo: GET /[slug] → lookup company por slug (id + default_redirect_url) →
 *        INSERT em events → 302 pra companies.default_redirect_url.
 *
 * Multi-tenant: cada empresa configura seu destino em
 * `companies.default_redirect_url` via /configuracoes (RPC update_company).
 * Worker lê esse campo no lookup do slug. Se null/vazio → 404 "empresa
 * sem destino configurado".
 *
 * Insert é fire-and-forget canônico Cloudflare: ctx.waitUntil mantém o
 * promise vivo após o response. Redirect retorna imediatamente, sem
 * esperar PostgREST. Falha de insert não atrapalha o redirect.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface CompanyRow {
  id: string;
  default_redirect_url: string | null;
}

interface EventPayload {
  company_id: string;
  device: "mobile" | "desktop" | "tablet" | "unknown";
  // Geo (CF cf object)
  ip_country: string | null;
  ip_city: string | null;
  ip_region: string | null;
  ip_continent: string | null;
  ip_postal_code: string | null;
  ip_timezone: string | null;
  ip_latitude: number | null;
  ip_longitude: number | null;
  ip_asn: number | null;
  ip_organization: string | null;
  // Headers / UA
  lang: string | null;
  referrer: string | null;
  user_agent: string | null;
  // Parsed UA (Migration 0013)
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_vendor: string | null;
  device_model: string | null;
  // URL context
  url_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  /**
   * Pillar 3 — código de revendedor capturado de `?ref=<code>` na URL.
   * NÃO validado contra reseller_codes em runtime (preserva latência);
   * /relatorios cruza com JOIN. Capped 64 chars (CHECK no DB).
   */
  referrer_code: string | null;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const slug = url.pathname.split("/").filter(Boolean)[0];

    if (!slug) {
      return notFound();
    }

    const company = await lookupCompany(env, slug);
    if (!company) {
      return notFound();
    }

    // Empresa existe mas não configurou destino. Sem evento — não há
    // redirect pra rastrear. Retorna 404 com mensagem específica pra
    // distinguir de "slug inexistente".
    if (!company.default_redirect_url) {
      return notConfigured();
    }

    const event = buildEvent(request, company.id);

    // Pure fire-and-forget. ctx.waitUntil mantém o promise vivo após o
    // response retornar — Cloudflare não mata o isolate enquanto o
    // promise pendurado nele resolve. Redirect sai já-já.
    ctx.waitUntil(
      insertEvent(env, event).catch((err) => {
        console.error("event insert failed:", err);
      }),
    );

    return Response.redirect(company.default_redirect_url, 302);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Supabase / PostgREST
// ─────────────────────────────────────────────────────────────────────────────

async function lookupCompany(
  env: Env,
  slug: string,
): Promise<CompanyRow | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/companies?slug=eq.${encodeURIComponent(
    slug,
  )}&select=id,default_redirect_url`;
  const resp = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!resp.ok) {
    console.error("company lookup failed:", resp.status, await resp.text());
    return null;
  }
  const rows = (await resp.json()) as CompanyRow[];
  return rows[0] ?? null;
}

async function insertEvent(env: Env, event: EventPayload): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/events`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(event),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PostgREST ${resp.status}: ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event building
// ─────────────────────────────────────────────────────────────────────────────

interface CFRequest extends Request {
  cf?: {
    country?: string;
    city?: string;
    region?: string;
    continent?: string;
    postalCode?: string;
    timezone?: string;
    latitude?: string;
    longitude?: string;
    asn?: number;
    asOrganization?: string;
    [key: string]: unknown;
  };
}

function buildEvent(request: Request, company_id: string): EventPayload {
  const cfRequest = request as CFRequest;
  const ua = request.headers.get("user-agent");
  const ipCountryHeader = request.headers.get("cf-ipcountry");
  const ipCountry =
    (cfRequest.cf?.country ?? ipCountryHeader ?? null)?.toUpperCase() ?? null;

  // Pillar 3 — captura `?ref=<code>` da URL. URL constructor já decodifica
  // URL-encoding (ex: %20 → espaço). Trimamos, normalizamos pra lowercase
  // (case-insensitive matching com reseller_codes), e cap em 64 chars (DB
  // CHECK constraint). Vazio ou só whitespace → null.
  const url = new URL(request.url);
  const refRaw = url.searchParams.get("ref");
  const referrer_code = parseRefCode(refRaw);

  // Helper: parse CF lat/lng (vem como string, ex: "-23.5505").
  const parseCoord = (v: unknown): number | null => {
    if (typeof v !== "string") return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  // Helper: trim + cap pra strings que podem vir grandes.
  const cap = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s.slice(0, max) : null;
  };

  const cf = cfRequest.cf;
  const sp = url.searchParams;

  // Parse UA pra extrair browser/os/device. Implementação inline (regex) —
  // sem dependência externa pra evitar conflito de versões em Workers.
  const uaParsed = parseFullUA(ua);

  return {
    company_id,
    device: uaParsed.device_type,
    browser_name: uaParsed.browser_name,
    browser_version: uaParsed.browser_version,
    os_name: uaParsed.os_name,
    os_version: uaParsed.os_version,
    device_vendor: uaParsed.device_vendor,
    device_model: uaParsed.device_model,
    // CHECK do DB exige ISO 3166-1 alpha-2 maiúsculo ou null. Normalizamos.
    ip_country: ipCountry && /^[A-Z]{2}$/.test(ipCountry) ? ipCountry : null,
    // cf-ipcity não é header padrão Cloudflare. A API canônica é
    // request.cf.city. Em wrangler dev local cf é undefined → null.
    ip_city: cf?.city ?? null,
    ip_region: cap(cf?.region, 64),
    ip_continent: cap(cf?.continent, 4),
    ip_postal_code: cap(cf?.postalCode, 20),
    ip_timezone: cap(cf?.timezone, 64),
    ip_latitude: parseCoord(cf?.latitude),
    ip_longitude: parseCoord(cf?.longitude),
    ip_asn: typeof cf?.asn === "number" ? cf.asn : null,
    ip_organization: cap(cf?.asOrganization, 200),
    lang: parseAcceptLanguage(request.headers.get("accept-language")),
    referrer: request.headers.get("referer"),
    user_agent: ua,
    url_path: cap(url.pathname, 500),
    utm_source: cap(sp.get("utm_source"), 200),
    utm_medium: cap(sp.get("utm_medium"), 200),
    utm_campaign: cap(sp.get("utm_campaign"), 200),
    utm_term: cap(sp.get("utm_term"), 200),
    utm_content: cap(sp.get("utm_content"), 200),
    referrer_code,
  };
}

function parseRefCode(raw: string | null): string | null {
  if (!raw) return null;
  // Lowercase pra match consistente. Se cliente quiser case-sensitive
  // (ex: "Instagram" vs "instagram" como sources distintas), trocamos
  // depois. v1 padroniza pra reduzir typos.
  const cleaned = raw.trim().toLowerCase().slice(0, 64);
  // Reject strings com whitespace interno ou chars de controle.
  if (!cleaned || /[\s -]/.test(cleaned)) return null;
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// UA parsing — inline regex (sem dep externa pra Workers ficar leve).
// Cobre ~95% dos UAs em produção (Chrome/Safari/Firefox/Edge + iOS/Android/
// Windows/macOS + iPhone/iPad/Samsung/Pixel/Xiaomi/Motorola).
// Mesma lógica que apps/web/src/lib/tracking/parse-ua.ts — DRY refactor
// pra packages/shared quando 3rd consumer aparecer.
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedUA {
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_vendor: string | null;
  device_model: string | null;
  device_type: "mobile" | "desktop" | "tablet" | "unknown";
}

function parseFullUA(ua: string | null): ParsedUA {
  if (!ua) {
    return {
      browser_name: null,
      browser_version: null,
      os_name: null,
      os_version: null,
      device_vendor: null,
      device_model: null,
      device_type: "unknown",
    };
  }

  // Browser
  let browserName: string | null = null;
  let browserVersion: string | null = null;
  let m = ua.match(/Edg\/([\d.]+)/);
  if (m) {
    browserName = "Edge";
    browserVersion = m[1] ?? null;
  } else if ((m = ua.match(/OPR\/([\d.]+)|Opera\/([\d.]+)/))) {
    browserName = "Opera";
    browserVersion = m[1] ?? m[2] ?? null;
  } else if ((m = ua.match(/Chrome\/([\d.]+)/))) {
    browserName = "Chrome";
    browserVersion = m[1] ?? null;
  } else if ((m = ua.match(/Firefox\/([\d.]+)/))) {
    browserName = "Firefox";
    browserVersion = m[1] ?? null;
  } else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) {
    browserName = "Safari";
    browserVersion = m[1] ?? null;
  } else if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) {
    browserName = "Samsung Internet";
    browserVersion = m[1] ?? null;
  }

  // OS
  let osName: string | null = null;
  let osVersion: string | null = null;
  if (/iPhone|iPad|iPod/.test(ua)) {
    osName = "iOS";
    const im = ua.match(/OS (\d+[._]\d+(?:[._]\d+)?)/);
    osVersion = im ? im[1]!.replace(/_/g, ".") : null;
  } else if ((m = ua.match(/Android (\d+(?:\.\d+)*)/))) {
    osName = "Android";
    osVersion = m[1] ?? null;
  } else if ((m = ua.match(/Windows NT (\d+\.\d+)/))) {
    osName = "Windows";
    const v = m[1]!;
    const human: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    osVersion = human[v] ?? v;
  } else if ((m = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/))) {
    osName = "macOS";
    osVersion = m[1]!.replace(/_/g, ".");
  } else if (/CrOS/.test(ua)) {
    osName = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    osName = "Linux";
  }

  // Device
  let deviceType: ParsedUA["device_type"] = "desktop";
  let deviceVendor: string | null = null;
  let deviceModel: string | null = null;

  if (/iPad/.test(ua)) {
    deviceVendor = "Apple";
    deviceModel = "iPad";
    deviceType = "tablet";
  } else if (/iPhone/.test(ua)) {
    deviceVendor = "Apple";
    deviceModel = "iPhone";
    deviceType = "mobile";
  } else if (/iPod/.test(ua)) {
    deviceVendor = "Apple";
    deviceModel = "iPod";
    deviceType = "mobile";
  } else if (
    (m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\s*[;)])/))
  ) {
    deviceModel = m[1]!.trim().slice(0, 128);
    if (/^SM-|Galaxy|^GT-|^SC-/i.test(deviceModel)) deviceVendor = "Samsung";
    else if (/^Pixel/i.test(deviceModel)) deviceVendor = "Google";
    else if (/^MI |^Redmi|Xiaomi|^M\d{4}/i.test(deviceModel)) deviceVendor = "Xiaomi";
    else if (/^Moto|^XT/i.test(deviceModel)) deviceVendor = "Motorola";
    else if (/^LG|^LM-/i.test(deviceModel)) deviceVendor = "LG";
    else if (/^OPPO|^CPH/i.test(deviceModel)) deviceVendor = "Oppo";
    else if (/^vivo|^V\d{4}/i.test(deviceModel)) deviceVendor = "Vivo";
    else if (/^HUAWEI|^Honor|^ANE/i.test(deviceModel)) deviceVendor = "Huawei";
    else if (/^OnePlus/i.test(deviceModel)) deviceVendor = "OnePlus";
    deviceType = "mobile";
  } else if (/Android/.test(ua)) {
    deviceType = "mobile";
  } else if (/Tablet|PlayBook|Silk|Kindle/.test(ua)) {
    deviceType = "tablet";
  } else if (/Mobi|webOS|BlackBerry|IEMobile/.test(ua)) {
    deviceType = "mobile";
  }

  return {
    browser_name: browserName ? browserName.slice(0, 64) : null,
    browser_version: browserVersion ? browserVersion.slice(0, 32) : null,
    os_name: osName ? osName.slice(0, 64) : null,
    os_version: osVersion ? osVersion.slice(0, 32) : null,
    device_vendor: deviceVendor ? deviceVendor.slice(0, 64) : null,
    device_model: deviceModel ? deviceModel.slice(0, 128) : null,
    device_type: deviceType,
  };
}

function parseAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  // Pega o primeiro locale do header (ex: "pt-BR,pt;q=0.9,en;q=0.8" → "pt-BR").
  const first = header.split(",")[0]?.trim().split(";")[0]?.trim();
  return first || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

function notFound(): Response {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Link não encontrado · Source Authority</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0A0A0A;
      color: #FAFAFA; display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; }
    main { text-align: center; max-width: 420px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; color: #C9A94B; font-weight: 600; }
    p { color: #888; margin: 0; line-height: 1.5; font-size: 0.95rem; }
  </style>
</head>
<body>
  <main>
    <h1>Link não encontrado</h1>
    <p>Esse endereço não corresponde a nenhuma empresa cadastrada na Source Authority.</p>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function notConfigured(): Response {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Empresa sem destino configurado · Source Authority</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0A0A0A;
      color: #FAFAFA; display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; }
    main { text-align: center; max-width: 460px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; color: #C9A94B; font-weight: 600; }
    p { color: #888; margin: 0 0 1rem; line-height: 1.5; font-size: 0.95rem; }
    p.hint { color: #666; font-size: 0.85rem; }
  </style>
</head>
<body>
  <main>
    <h1>Empresa sem destino configurado</h1>
    <p>O administrador desta empresa ainda não configurou o link mestre.</p>
    <p class="hint">Se você é admin/owner desta conta, acesse o painel da Source Authority e configure o destino em Configurações → Link mestre.</p>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
