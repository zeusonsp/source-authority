/**
 * source-authority-brand-monitor — Pilar 2 (detecção de uso indevido).
 *
 * Two scheduled triggers:
 *   1. Every 15min: CT log poll via Cert Spotter API.
 *      Pra cada empresa com `protected_brand_terms`:
 *        - GET /v1/issuances?domain={term}&include_subdomains=true
 *               &match_wildcards=true&after={last_id}
 *        - dedupe vs alerts.data->>'cert_sha256' (UNIQUE em DB)
 *        - skip se cert pertence a `companies.owned_domains` (allowlist)
 *        - score severity baseado em similaridade + has_mx
 *        - INSERT em alerts (status='new')
 *        - se severity='high', dispara email Resend imediatamente
 *
 *   2. Daily 09:00 BRT: digest builder.
 *      Pra cada empresa com `alerts.status='new' AND severity IN
 *      ('medium','low') AND created_at > now()-1day`:
 *        - aggrega
 *        - manda 1 email Resend com tabela de alertas
 *
 * Estado deste arquivo: SKELETON. B5.3 entrega só o scaffold + cron
 * triggers + log "scheduled run started". B5.4 implementa CT poll.
 * B5.6 implementa notifications.
 *
 * Tech debt rastreado em CLAUDE.md (Fase 3.5): trocar bounded await
 * em workers/tracker por pure ctx.waitUntil. Mesma diretriz aqui —
 * insertEvents/sendEmails são fire-and-forget; não esperar response.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CERTSPOTTER_API_KEY: string;
  RESEND_API_KEY: string;
}

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
      // B5.4: implementar runCtPoll(env, ctx)
      await runCtPollStub(env, ctx);
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
        status: "scaffolded — B5.3",
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Stub: B5.4 implementa CT poll real contra Cert Spotter API.
 *
 * Plano:
 *   1. SELECT companies WHERE array_length(protected_brand_terms, 1) > 0
 *   2. Pra cada empresa:
 *      - SELECT last cursor de monitoring_state (tabela helper futura
 *        OU coluna em companies)
 *      - Pra cada term em protected_brand_terms:
 *        - GET https://api.certspotter.com/v1/issuances?domain={term}
 *                 &include_subdomains=true&match_wildcards=true&after={cursor}
 *        - dedupe vs alerts.data->>'cert_sha256'
 *        - skip se host bate com qualquer owned_domains
 *        - severity = scoreSquat(host, brand_canonical, hasMx)
 *        - INSERT em alerts via service_role (bypass RLS)
 *        - se severity='high', enqueue email Resend imediato
 */
async function runCtPollStub(_env: Env, _ctx: ExecutionContext): Promise<void> {
  console.log("[brand-monitor] runCtPollStub — TODO B5.4: CT log poll");
}

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
