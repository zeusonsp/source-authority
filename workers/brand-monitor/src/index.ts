/**
 * source-authority-brand-monitor — Pilar 2 (detecção de uso indevido).
 *
 * Two scheduled triggers:
 *   1. Every 15min: CT log poll via Cert Spotter API.
 *      Pra cada empresa com `protected_brand_terms`:
 *        - GET /v1/issuances?domain={term}&include_subdomains=true
 *               &match_wildcards=true&after={last_id}
 *        - dedupe via cursor (último certspotter_id já alertado)
 *        - skip se cert pertence a `companies.owned_domains` (allowlist)
 *        - score severity baseado em similaridade (Levenshtein + substring)
 *        - INSERT em alerts (status='new')
 *        - high-severity: log only por enquanto (B5.6 dispatch Resend).
 *
 *   2. Daily 09:00 BRT: digest builder.
 *      Pra cada empresa com `alerts.status='new' AND severity IN
 *      ('medium','low') AND created_at > now()-1day`:
 *        - aggrega
 *        - manda 1 email Resend com tabela de alertas
 *
 * Estado deste arquivo: B5.4 implementa CT poll real. B5.6 implementa
 * notifications (digest + dispatch high-severity).
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CERTSPOTTER_API_KEY: string;
  RESEND_API_KEY: string;
}

// Limite por empresa por execução. Cada term expande pra 1 chamada Cert
// Spotter. Cap protege contra empresa com lista enorme drenando o budget
// de requests do free tier (75/hora).
const MAX_TERMS_PER_COMPANY = 5;

// User-Agent identificável pra Cert Spotter abuse desk caso passemos do
// rate limit. Inclui versão do worker pra correlacionar com deploys.
const CERTSPOTTER_UA = "source-authority-brand-monitor/1.0";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string;
  protected_brand_terms: string[];
  owned_domains: string[];
}

interface CertspotterIssuance {
  id: string;
  dns_names: string[];
  pubkey_sha256: string;
  not_before: string;
  not_after: string;
  issuer?: { name?: string } | string;
}

interface AlertInsertPayload {
  company_id: string;
  type: "ct_log_match";
  severity: "low" | "medium" | "high";
  status: "new";
  source: "certspotter";
  data: {
    host: string;
    issuer: string | null;
    not_before: string;
    not_after: string;
    cert_sha256: string;
    certspotter_id: string;
    brand_term: string;
  };
}

interface CursorRow {
  data: { certspotter_id?: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — scheduled + fetch
// ─────────────────────────────────────────────────────────────────────────────

export default {
  /**
   * Scheduled handler — Cloudflare invoca conforme [triggers.crons]
   * em wrangler.toml.
   *
   * `controller.cron` retorna a expressão exata que disparou — usamos pra
   * branch entre os dois jobs.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log(
      `[brand-monitor] scheduled run cron="${controller.cron}" at ${new Date(controller.scheduledTime).toISOString()}`,
    );

    if (controller.cron === "*/15 * * * *") {
      await runCtPoll(env, ctx);
    } else if (controller.cron === "0 12 * * *") {
      // B5.6: implementar runDailyDigest(env, ctx)
      await runDailyDigestStub(env, ctx);
    } else {
      console.warn(`[brand-monitor] unknown cron expression: ${controller.cron}`);
    }
  },

  /**
   * HTTP fetch handler — útil pra health-check / manual trigger.
   *
   * GET / → 200 com info de versão e jobs disponíveis.
   * POST /trigger?job=ct-poll → manual trigger (require admin token);
   *   só pra debug em dev. Em prod fica desabilitado por enquanto.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        worker: "source-authority-brand-monitor",
        jobs: ["ct-poll (every 15min)", "daily-digest (09:00 BRT)"],
        status: "ct-poll live — B5.4",
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// ─────────────────────────────────────────────────────────────────────────────
// CT poll — main loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll Cert Spotter pra cada empresa com protected_brand_terms.
 *
 * Cursor strategy: lê o maior `data->>'certspotter_id'` já alertado pra
 * (company, type=ct_log_match) e usa como `after` na próxima chamada.
 * Se não há alerta prévio, chama sem `after` — Cert Spotter retorna o
 * batch recente (últimas issuances). Isso evita backfill de anos de CT
 * logs no primeiro run; a partir do 2º run a empresa já tem cursor.
 *
 * Severity buckets:
 *   - high   → Levenshtein(host_label, term) ≤ 2  (typosquat plausível)
 *   - medium → host contém term como substring  (extension/misuse)
 *   - low    → match no Cert Spotter mas sem proximidade visual forte
 *
 * Per-company try/catch protege a batch: se 1 empresa falhar a request,
 * as outras seguem. Falhas são logadas mas não sobem.
 */
async function runCtPoll(env: Env, ctx: ExecutionContext): Promise<void> {
  const startedAt = Date.now();
  let highSeverityCount = 0;
  let totalAlertsInserted = 0;
  let companiesProcessed = 0;
  let companiesFailed = 0;

  const companies = await fetchCompaniesWithTerms(env);
  console.log(
    `[brand-monitor] ct-poll fetched ${companies.length} companies with brand terms`,
  );

  for (const company of companies) {
    try {
      const result = await pollCompany(env, company);
      highSeverityCount += result.highCount;
      totalAlertsInserted += result.insertedCount;
      companiesProcessed += 1;
    } catch (err) {
      companiesFailed += 1;
      console.error(
        `[brand-monitor] company ${company.id} ct-poll failed:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log(
    `[brand-monitor] ct-poll done: companies_ok=${companiesProcessed} companies_failed=${companiesFailed} alerts_inserted=${totalAlertsInserted} elapsed_ms=${Date.now() - startedAt}`,
  );
  console.log(
    `[brand-monitor] high-severity alerts inserted: ${highSeverityCount}`,
  );

  // ctx parameter ainda não é usado — mantido pra paridade com runDailyDigest
  // e pra futuro fire-and-forget de notificações em B5.6.
  void ctx;
}

interface CompanyResult {
  highCount: number;
  insertedCount: number;
}

async function pollCompany(env: Env, company: CompanyRow): Promise<CompanyResult> {
  const terms = company.protected_brand_terms.slice(0, MAX_TERMS_PER_COMPANY);
  const ownedDomains = (company.owned_domains ?? []).map((d) => d.toLowerCase());

  let highCount = 0;
  let insertedCount = 0;

  // Cursor é por company (não por term) — o critério de dedupe é "este
  // certspotter_id já gerou alerta nesta empresa?". Termos diferentes
  // podem casar no mesmo cert (ex: 'zeus' e 'zeustec' em zeustec.io)
  // mas isso só impacta qual brand_term registramos no payload, não a
  // existência do alerta. Usar cursor por company evita re-trabalho.
  const cursor = await fetchLastCertspotterCursor(env, company.id);

  for (const term of terms) {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) continue;

    let issuances: CertspotterIssuance[];
    try {
      issuances = await fetchCertspotterIssuances(normalizedTerm, cursor);
    } catch (err) {
      console.error(
        `[brand-monitor] certspotter fetch failed company=${company.id} term="${normalizedTerm}":`,
        err instanceof Error ? err.message : String(err),
      );
      continue;
    }

    for (const issuance of issuances) {
      const host = (issuance.dns_names?.[0] ?? "").trim().toLowerCase();
      if (!host) continue;

      // Wildcard puro sem subdomain útil — descarta. "*.foo.com" não dá
      // pra phishar usuários sem antes registrar um subdomain concreto;
      // alertaríamos cedo demais. Wildcard com prefixo (ex: "*.app.foo.com")
      // ainda passa porque o host_label não é só "*".
      if (host.startsWith("*.") && host.split(".").length <= 3) {
        // ex: "*.foo.com" (3 labels) → skip; "*.app.foo.com" (4) → keep
        const labels = host.split(".");
        if (labels.length <= 3) continue;
      }

      if (isOwnedDomain(host, ownedDomains)) continue;

      const cleanHost = host.startsWith("*.") ? host.slice(2) : host;
      const severity = scoreSeverity(cleanHost, normalizedTerm);
      const issuer = extractIssuerName(issuance.issuer);

      const payload: AlertInsertPayload = {
        company_id: company.id,
        type: "ct_log_match",
        severity,
        status: "new",
        source: "certspotter",
        data: {
          host,
          issuer,
          not_before: issuance.not_before,
          not_after: issuance.not_after,
          cert_sha256: issuance.pubkey_sha256,
          certspotter_id: issuance.id,
          brand_term: normalizedTerm,
        },
      };

      try {
        await insertAlert(env, payload);
        insertedCount += 1;
        if (severity === "high") highCount += 1;
      } catch (err) {
        console.error(
          `[brand-monitor] alert insert failed company=${company.id} host="${host}":`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  return { highCount, insertedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase / PostgREST
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCompaniesWithTerms(env: Env): Promise<CompanyRow[]> {
  // protected_brand_terms tem default '{}' (NOT NULL). Filtro PostgREST
  // pra arrays não-vazios é "not.eq.{}". Encode literal do array literal.
  const url =
    `${env.SUPABASE_URL}/rest/v1/companies` +
    `?select=id,protected_brand_terms,owned_domains` +
    `&protected_brand_terms=not.eq.%7B%7D`;

  const resp = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`fetchCompaniesWithTerms PostgREST ${resp.status}: ${text}`);
  }

  return (await resp.json()) as CompanyRow[];
}

/**
 * Lê o certspotter_id mais recente já alertado pra esta empresa.
 * Cert Spotter `after` espera o id do último issuance que vimos —
 * passar o maior id que já alertamos pula tudo até ele inclusive.
 *
 * Retorna null em duas situações:
 *   - empresa nunca teve alerta ct_log_match → primeiro run, batch recente
 *   - alerta existe mas data->>'certspotter_id' é vazio (não deveria,
 *     mas defensivo contra payloads legados)
 */
async function fetchLastCertspotterCursor(
  env: Env,
  companyId: string,
): Promise<string | null> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/alerts` +
    `?company_id=eq.${encodeURIComponent(companyId)}` +
    `&type=eq.ct_log_match` +
    `&source=eq.certspotter` +
    `&order=created_at.desc` +
    `&limit=1` +
    `&select=data`;

  const resp = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`fetchLastCertspotterCursor PostgREST ${resp.status}: ${text}`);
  }

  const rows = (await resp.json()) as CursorRow[];
  const cursor = rows[0]?.data?.certspotter_id;
  return cursor && typeof cursor === "string" ? cursor : null;
}

async function insertAlert(env: Env, alert: AlertInsertPayload): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/alerts`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(alert),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`insertAlert PostgREST ${resp.status}: ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cert Spotter
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCertspotterIssuances(
  term: string,
  cursor: string | null,
): Promise<CertspotterIssuance[]> {
  const params = new URLSearchParams({
    domain: term,
    include_subdomains: "true",
    match_wildcards: "true",
    expand: "dns_names,issuer",
  });
  if (cursor) params.set("after", cursor);

  const url = `https://api.certspotter.com/v1/issuances?${params.toString()}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": CERTSPOTTER_UA,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`certspotter ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as CertspotterIssuance[];
  return Array.isArray(data) ? data : [];
}

function extractIssuerName(
  issuer: CertspotterIssuance["issuer"],
): string | null {
  if (!issuer) return null;
  if (typeof issuer === "string") return issuer;
  if (typeof issuer === "object" && typeof issuer.name === "string") {
    return issuer.name;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifica a proximidade do host com o termo da marca.
 *
 *   high   → label do host (sem TLD) está a ≤2 edits do term. Ex:
 *            term='zeus' vs host='zeu5tech.com' → label='zeu5tech',
 *            mas considera também só o root label (primeiro segmento)
 *            ou termos compostos. Isso pega typosquat clássico.
 *   medium → host contém term como substring. Ex: term='zeus' vs
 *            'zeusbrasil.com' → não é typo mas é misuse plausível.
 *   low    → match no Cert Spotter mas sem proximidade direta;
 *            Cert Spotter já fez o filtro grosso (substring/wildcard).
 *
 * O `host` aqui já vem sem o prefixo wildcard ("*."). Comparações são
 * lowercase (normalizadas no caller).
 */
function scoreSeverity(host: string, term: string): "low" | "medium" | "high" {
  if (!host || !term) return "low";

  // Tira TLDs simples comuns (1-2 partes finais). Não precisamos de PSL
  // perfeito — só queremos comparar o "miolo" do nome. Ex: "zeu5tech.com.br"
  // → "zeu5tech"; "zeustech.io" → "zeustech".
  const labels = host.split(".").filter(Boolean);
  if (labels.length === 0) return "low";

  // Pega os 1-2 primeiros labels como "miolo" (cobre subdomain.brand.com
  // e brand.com mas evita comparar brand inteira com TLD).
  const primaryLabel = labels[0] ?? "";
  const distance = levenshtein(primaryLabel, term);

  if (distance <= 2) return "high";

  // Tenta também concatenação de labels iniciais — pega "zeus-tech.com".
  const compoundLabel = primaryLabel.replace(/[-_]/g, "");
  if (levenshtein(compoundLabel, term) <= 2) return "high";

  if (host.includes(term)) return "medium";

  return "low";
}

/**
 * Levenshtein clássico (matriz O(n*m)). Inputs do mundo real ficam em
 * dezenas de chars (label de domínio), então não vale a pena otimizar
 * pra two-row. Retorna inteiro ≥ 0.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  // dp[i][j] = edits to convert a[0..i] → b[0..j]
  const prev: number[] = new Array(n + 1);
  const curr: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j] ?? 0;
  }

  return prev[n] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Owned-domain matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True se o host pertence (é igual ou subdomain) a algum owned_domain.
 *
 * Match é por sufixo de label boundary — "zeustec.com.br" ∈
 * "tec.com.br" só se "zeustec.com.br" termina exatamente em ".tec.com.br"
 * OU é igual a "tec.com.br". Evita falso positivo de substring puro.
 *
 * Inputs já vêm lowercase do caller.
 */
function isOwnedDomain(host: string, ownedDomains: string[]): boolean {
  if (ownedDomains.length === 0) return false;
  const cleanHost = host.startsWith("*.") ? host.slice(2) : host;

  for (const owned of ownedDomains) {
    const ownedClean = owned.trim().toLowerCase().replace(/^\*\./, "");
    if (!ownedClean) continue;
    if (cleanHost === ownedClean) return true;
    if (cleanHost.endsWith(`.${ownedClean}`)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily digest (B5.6) — stub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stub: B5.6 implementa digest diário real.
 *
 * Plano:
 *   1. Pra cada empresa com alertas new+medium/low nas últimas 24h:
 *      - aggregate group by type/severity
 *      - render HTML email (template Source Authority dark/dourado)
 *      - send via Resend pra owners+admins (SELECT memberships JOIN profiles)
 */
async function runDailyDigestStub(
  _env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  console.log(
    "[brand-monitor] runDailyDigestStub — TODO B5.6: digest builder",
  );
}
