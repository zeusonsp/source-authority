# source-authority-brand-monitor

Worker Cloudflare pro **Pilar 2 — Detecção de uso indevido da marca**.

## Status

**B5.3 — scaffold** entregue. Stubs de CT poll + digest builder logam mas não fazem trabalho real ainda.

**Próximos sub-blocos:**
- **B5.4** — implementar CT poll via Cert Spotter API (substituir `runCtPollStub`)
- **B5.6** — implementar digest diário (substituir `runDailyDigestStub`)
- **B5.7** — triage flow integration

## Cron triggers

```
*/15 * * * *   CT log poll (a cada 15min)
0 12 * * *     Digest diário 09:00 BRT (12:00 UTC)
```

## Secrets requeridos (via `wrangler secret put`)

- `SUPABASE_URL` — `https://lzsxunsqkduoemlhydut.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — admin Supabase
- `CERTSPOTTER_API_KEY` — Cert Spotter (B5.4)
- `RESEND_API_KEY` — mesmo do apps/landing

## Deploy

```bash
cd workers/brand-monitor
wrangler deploy
```

Worker fica disponível em `source-authority-brand-monitor.zeusonsp.workers.dev`. Cron triggers iniciam automaticamente após primeiro deploy.

## Tech debt

- B5.4 CT poll implementation
- B5.6 digest builder + Resend templates
- Cursor de polling por (company, term) — tabela helper futura
- Pure `ctx.waitUntil` sem bounded await (conforme tech debt do `workers/tracker`)
