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
  ip_country: string | null;
  ip_city: string | null;
  lang: string | null;
  referrer: string | null;
  user_agent: string | null;
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
    [key: string]: unknown;
  };
}

function buildEvent(request: Request, company_id: string): EventPayload {
  const cfRequest = request as CFRequest;
  const ua = request.headers.get("user-agent");
  const ipCountryHeader = request.headers.get("cf-ipcountry");
  const ipCountry =
    (cfRequest.cf?.country ?? ipCountryHeader ?? null)?.toUpperCase() ?? null;

  return {
    company_id,
    device: parseDevice(ua),
    // CHECK do DB exige ISO 3166-1 alpha-2 maiúsculo ou null. Normalizamos.
    ip_country: ipCountry && /^[A-Z]{2}$/.test(ipCountry) ? ipCountry : null,
    // cf-ipcity não é header padrão Cloudflare. A API canônica é
    // request.cf.city. Em wrangler dev local cf é undefined → null.
    ip_city: cfRequest.cf?.city ?? null,
    lang: parseAcceptLanguage(request.headers.get("accept-language")),
    referrer: request.headers.get("referer"),
    user_agent: ua,
  };
}

function parseDevice(
  ua: string | null,
): "mobile" | "desktop" | "tablet" | "unknown" {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  // Tablet primeiro (iPad é também Mobile na regex genérica).
  if (/ipad|tablet|playbook|silk/.test(lower)) return "tablet";
  if (/mobi|android|iphone|ipod|opera mini|iemobile/.test(lower))
    return "mobile";
  return "desktop";
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
