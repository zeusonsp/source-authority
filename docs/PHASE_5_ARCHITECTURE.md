# Phase 5 — Brand Protection / Domain Monitoring — Architecture

> Research output produced 2026-05-07 by subagent (read-only research, no commits).
> Re-verify pricing/limits at vendor pages before B5.3 begins.

## Decisão central

**Cert Spotter (sslmate.com) free tier + DNStwist como gerador de permutação local.**

CT logs são a fonte de maior signal/noise pra detecção de squat — quem registra `zeus-oficial.com.br` pra phishing precisa de cert SSL em 2026, e isso vira evento em CT logs em segundos. Cert Spotter já filtra por watchlist server-side (vs nós baixar 10M certs/dia do feed Google direto).

**Custo MVP:** R$ 0 (Cert Spotter free até 100 dominios monitorados). DNStwist é MIT.

## Stack do worker

- `workers/brand-monitor/` — sibling de `workers/tracker/`
- Cron `*/15 * * * *` poll Cert Spotter + dedupe + INSERT
- Cron `0 12 * * *` (09:00 BRT) digest builder pra alertas medium/low
- Secrets: `CERTSPOTTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`

## Notificações

| Severity | Canal | Quando |
|---|---|---|
| `high` | Email imediato pra owners+admins | At INSERT time pelo Worker |
| `medium` | Digest 09:00 BRT | Cron diário aggregando últimas 24h |
| `low` | Digest 09:00 BRT | Mesmo |
| Webhook (Business plan) | Push imediato | Phase 5.5 — separate `company_webhooks` table |

Reusa `notifications/resend.ts` pattern do `apps/landing` em `apps/web/src/lib/notifications/`.

## Order de implementação (sub-blocos B5)

- **B5.1** — Migration `0008_alerts.sql` + RPC `triage_alert` ✅ DRAFT escrito
- **B5.2** — `companies.protected_brand_terms` + `owned_domains` (incluso em B5.1) + UI em /configuracoes
- **B5.3** — Worker `workers/brand-monitor/` scaffold + secrets + cron stub
- **B5.4** — CT poll loop completo (Cert Spotter API + dedupe + severity scoring + INSERT)
- **B5.5** — Página `/alertas` no apps/web ✅ DRAFT escrito
- **B5.6** — `renderAlertImmediateEmail` + `renderAlertDigestEmail` em `apps/web/src/lib/notifications/`
- **B5.7** — Triage flow buttons + drawer com JSONB pretty-render + audit_log integration

## Fluxo de dados

```
Cert Spotter API ─┐
                  │ HTTPS poll 15min (filtered by brand_term)
                  ▼
      ┌─ workers/brand-monitor (Cloudflare CF) ─┐
      │ - dedupe vs alerts.data->>cert_sha256   │
      │ - score severity (lev distance + MX)    │
      │ - skip allowlist (owned_domains)        │
      └────────────────────┬────────────────────┘
                           │ POST /rest/v1/alerts
                           ▼
              ┌──── Supabase Postgres ────┐
              │ public.alerts (RLS)       │
              │ INSERT TRIGGER: high → pg │
              └─────┬─────────────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
  apps/web /alertas         Resend (immediate or digest)
  (Server Component         to: owners+admins
   + Client filters)        HTML dark/dourado template
```

## Tradeoffs aceitos

- Não detectamos squatters que **nunca** emitem cert SSL (parked domains, internal phishing) — Phase 6 expansion.
- Single-vendor dependency (Cert Spotter) — fallback Censys (free 250 queries/mo) pra Business tier.
- Per-minute cron resolution suficiente pra MVP — quando precisar de schedules per-customer, fanout via queue.

## Não-decididos (revisar quando chegar B5.3)

- DNStwist roda no Worker ou pre-computado no DB? Worker tem 50ms CPU limit free; DNStwist em Python não roda no Worker. Alternativa: porta do algoritmo em JS/WASM, OU compute em server action periódica.
- `pg_notify` vs Worker calling Resend direto? Worker direto é mais simples; pg_notify exige listener Vercel Function.
- Webhook delivery retry queue — Phase 5.5.

## Pricing references (Jan 2026 cutoff — re-verificar)

- Cert Spotter: <https://sslmate.com/certspotter/pricing> — free 100 monitored domains, $15/mo for 250
- Censys: <https://censys.com/pricing> — free 250 queries/mo
- Cloudflare Workers Cron: <https://developers.cloudflare.com/workers/configuration/cron-triggers/> — free plan 100k requests/day
- DNStwist: <https://github.com/elceef/dnstwist> — MIT, free
