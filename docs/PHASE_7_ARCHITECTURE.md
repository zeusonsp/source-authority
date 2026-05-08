# Phase 7 — Pagamentos / Stripe Billing — Architecture

> Research output produzido 2026-05-08 por subagent (read-only research).
> Re-verificar pricing pages BR antes de signar TOS — fees BR variam com Selic.

## Decisão central

**Stripe primário + dual-provider (Pagar.me) só pra Pix recorrente em Phase 8.**

Stripe Checkout + Customer Portal + Subscriptions corta ~70% do código vs Pagar.me. Pix Automático recorrente fica como Phase 8 (Pagar.me suporta nativamente, Stripe não tem GA em BR).

**Fees:** Stripe BR ~3.99% + R$ 0,39 cartão / 1.19% Pix one-shot.

## Sub-blocos B7

| Sub-bloco | Escopo | Tempo |
|---|---|---|
| **B7.1** | Migration `0008_billing.sql` (5 colunas em companies + `subscription_events` + RPC `apply_subscription_event`) | 0.5d |
| **B7.2** | Stripe setup + 4 Products/Prices BRL recurring monthly + env vars | 0.5d |
| **B7.3** | Server actions `createCheckoutSession` + `createPortalSession` | 1d |
| **B7.4** | Webhook handler `app/api/billing/stripe/webhook/route.ts` (signature verify + idempotency + apply RPC) | 1d |
| **B7.5** | UI `/configuracoes/plano` + sucesso + `<BillingBanner />` global | 1.5d |
| **B7.6** | Resend templates (welcome paid, payment_failed, canceled) | 0.5d |
| **B7.7** | E2E + Stripe CLI dev loop | 1d |

**Total:** ~6 dias úteis = 1.5 sprints.

## Migration `0008_billing.sql` (vai pra `20260508100000_billing.sql`)

Adiciona em `companies`:
- `stripe_customer_id text unique` (cus_xxx format check)
- `stripe_subscription_id text unique` (sub_xxx format check)
- `billing_status text` enum {none, trialing, active, past_due, canceled, exempt}
- `trial_ends_at timestamptz`
- `plan_renewed_at timestamptz`
- `billing_exempt boolean default false` (pilot/dogfood — Zeus ficará true)

Cria tabela `subscription_events`:
- Mirror imutável de webhooks
- UNIQUE em `(payment_provider, provider_event_id)` = idempotency key
- Coluna `payment_provider` antecipa Pagar.me em Phase 8
- RLS SELECT only pra admin/owner

Cria RPC `apply_subscription_event` SECURITY DEFINER:
- service_role-only (revoke pra public/anon/authenticated)
- Idempotente via ON CONFLICT
- Respeita `billing_exempt` (não toca companies se true)
- Audit trail via `log_audit_event('billing.<verb>')`

Seed: `update companies set billing_exempt=true, billing_status='exempt' where slug='zeus'`.

## Decisões importantes

- **Stripe Checkout (hosted), não Elements** — PCI turn-key, Pix one-shot incluso, BRL nativo. Tradeoff: menos controle visual.
- **Webhook em Vercel API route, não Worker** — SDK Stripe Node é mais robusto pra signature verify; volume baixo (~1 evento/cliente/mês), cold start aceitável.
- **NF-e: NÃO no MVP** — emissão manual via Stone Conta / portal prefeitura até ~50 clientes. Em Phase 9, integrar NFE.io quando volume justificar.
- **Free tier piloto** via flag `billing_exempt` em companies (não overload do `plan='enterprise'`).
- **Cancelamento** = `cancel_at_period_end: true` (mantém acesso até fim do ciclo, sem reembolso pro-rata).
- **Dunning** = Stripe Smart Retries (4 em 21d) + email Resend + banner app + downgrade gracioso pra `starter` se falhar tudo.

## Fluxo

```
signup → onboarding (plan='starter', billing_status='none')
       → /configuracoes "Mudar plano" → /configuracoes/plano (4 cards)
       → server action createCheckoutSession → Stripe Checkout (cartão/Pix)
       → success_url=/configuracoes/plano/sucesso (polling DB)
       → CONCURRENTLY: webhook /api/billing/stripe/webhook
            → verify signature
            → apply_subscription_event RPC (atomic insert event + update company + audit_log)
       → Resend "Bem-vindo ao plano X"

LIFECYCLE:
  invoice.payment_succeeded  → status='active', plan_renewed_at=now()
  invoice.payment_failed     → status='past_due' → email + banner
  subscription.updated       → upgrade/downgrade plan
  subscription.deleted       → status='canceled', plan='starter' (downgrade gracioso)
```

## Pricing references (verificar antes de commit)

- https://stripe.com/br/pricing
- https://docs.stripe.com/payments/pix
- https://docs.stripe.com/billing/subscriptions/overview
- https://docs.stripe.com/webhooks/signatures
- https://pagar.me/precos
- https://docs.pagar.me/docs/assinaturas-pix
- https://www.bcb.gov.br/estabilidadefinanceira/pixautomatico
- https://nfe.io/precos
