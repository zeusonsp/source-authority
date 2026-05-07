# tracker — Cloudflare Worker do link mestre

Resolve `oficial.sourceauthority.com.br/[slug]` → 302 pra URL destino da
empresa, registrando cada clique em `public.events`.

## Setup local

```bash
cp .dev.vars.example .dev.vars
# Preenche .dev.vars com:
#   SUPABASE_URL              = URL pública do projeto Supabase
#   SUPABASE_SERVICE_ROLE_KEY = service_role (NÃO anon — escreve em events
#                               bypassando RLS via BYPASSRLS attribute)
pnpm install
pnpm dev
```

Worker sobe em `http://localhost:8787`. Teste:

```bash
curl -i http://localhost:8787/zeus
# Esperado: 302 Location: https://zeusoficial.com

curl -i http://localhost:8787/slug-inexistente
# Esperado: 404 com HTML "Link não encontrado"

curl -i http://localhost:8787/
# Esperado: 404 (sem slug)
```

Confirma evento criado:

```sql
select count(*) from public.events
where company_id = (select id from public.companies where slug = 'zeus');
```

## Deploy em produção

```bash
pnpm wrangler login                                      # OAuth Cloudflare
pnpm wrangler secret put SUPABASE_URL                    # cola valor
pnpm wrangler secret put SUPABASE_SERVICE_ROLE_KEY       # cola valor
pnpm wrangler deploy
```

URL ficará em `https://source-authority-tracker.<subdomain>.workers.dev`.

## Decisões arquiteturais

- **Multi-tenant via `companies.default_redirect_url`** (Bloco A, 2026-05-06): cada empresa configura seu destino na coluna `default_redirect_url` (CHECK força HTTPS only). Worker faz `select=id,default_redirect_url` no lookup do slug. URL null/vazia → 404 "empresa sem destino configurado". Configuração via UI em `/configuracoes` → RPC `update_company`.
- **`service_role` key**: necessário pro INSERT em `events` — RLS bloqueia escrita pra `authenticated`/`anon`; `service_role` bypassa via `BYPASSRLS`.
- **Insert com `ctx.waitUntil` + race de 200ms**: redirect não fica refém de latência do PostgREST. Inserts lentos continuam em background sem bloquear o redirect.
- **Subdomínio `.workers.dev` gratuito**: MVP. Custom domain (`oficial.sourceauthority.com.br`) entra junto do GTM, não nesta fase.
- **Sem dependência de roteamento**: handler único, parsing manual de path. Adiciona itty-router/hono quando tivermos >3 rotas.

## Observabilidade

- Logs do worker em produção: dashboard Cloudflare → Workers → source-authority-tracker → Logs.
- Failures de insert são logadas via `console.error` mas não bloqueiam o redirect (decisão deliberada — UX > completude analytics).
