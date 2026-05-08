-- 0009 — Billing (Stripe primary, Pagar.me em Phase 8 só pra Pix recorrente)
--
-- Fase 7 — Pagamentos. Adiciona ao schema:
--   1. 5 colunas Stripe em `companies` (customer/subscription/status/dates) +
--      flag `billing_exempt` (piloto/dogfood, Zeus continua "free").
--   2. Tabela `subscription_events` (mirror imutável de webhooks Stripe;
--      coluna `payment_provider` antecipa Pagar.me em Phase 8).
--   3. RPC `apply_subscription_event` (SECURITY DEFINER, service_role-only)
--      — único caminho de escrita, idempotente via UNIQUE(provider, event_id).
--
-- Provider primário: Stripe. Stripe Checkout (hosted) + Customer Portal cobre
-- ~70% do código vs Pagar.me. Pix Automático recorrente nativo só vem em
-- Phase 8 (Pagar.me dual-provider — DX vale mais que ~0.6pp de fee diferença).
--
-- RLS: companies.stripe_* segue policies existentes (members select,
-- admins update). subscription_events: SELECT-only pra admin/owner.
-- Escrita exclusiva via RPC chamada pelo webhook handler com
-- SUPABASE_SERVICE_ROLE_KEY (bypassa RLS naturalmente).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas billing em `companies`
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.companies
  add column if not exists stripe_customer_id      text unique,
  add column if not exists stripe_subscription_id  text unique,
  add column if not exists billing_status          text not null default 'none',
  add column if not exists trial_ends_at           timestamptz,
  add column if not exists plan_renewed_at         timestamptz,
  add column if not exists billing_exempt          boolean not null default false;

-- Estados conhecidos de billing_status (CHECK adicionado separado pra
-- não falhar se a coluna existir parcialmente em runs anteriores):
--   none      → recém-criada, ainda sem checkout (default)
--   trialing  → Stripe trial 14d ativo
--   active    → assinatura paga em dia
--   past_due  → falha de cobrança em retry (Stripe Smart Retries)
--   canceled  → cancelada (cancel_at_period_end consumido OU dunning fail)
--   exempt    → piloto/dogfood (billing_exempt=true) — não tocar via webhook
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_billing_status_values'
  ) then
    alter table public.companies
      add constraint companies_billing_status_values check (
        billing_status in ('none','trialing','active','past_due','canceled','exempt')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'companies_stripe_customer_id_format'
  ) then
    alter table public.companies
      add constraint companies_stripe_customer_id_format check (
        stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'companies_stripe_subscription_id_format'
  ) then
    alter table public.companies
      add constraint companies_stripe_subscription_id_format check (
        stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
      );
  end if;
end $$;

comment on column public.companies.stripe_customer_id is
  'Stripe customer ID (cus_xxx). 1:1 com a empresa. UNIQUE pra prevenir double-link em webhooks fora-de-ordem.';
comment on column public.companies.stripe_subscription_id is
  'Stripe subscription ativa atual (sub_xxx). NULL = sem assinatura paga (starter free ou exempt).';
comment on column public.companies.billing_status is
  'Estado da assinatura. none/trialing/active/past_due/canceled/exempt. Atualizado via webhook handler.';
comment on column public.companies.trial_ends_at is
  'Quando o trial expira. NULL após trial consumido.';
comment on column public.companies.plan_renewed_at is
  'Última renovação bem-sucedida (invoice.payment_succeeded). Pra UI "renova em DD/MM".';
comment on column public.companies.billing_exempt is
  'Pilot/dogfood flag. true = webhook handler ignora atualizações, plano fica fixo. Manual via SQL admin only.';

-- Índices úteis pro admin futuro / queries por estado
create index if not exists companies_billing_status_idx
  on public.companies(billing_status)
  where billing_status in ('past_due','canceled');

create index if not exists companies_trial_ends_at_idx
  on public.companies(trial_ends_at)
  where trial_ends_at is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed: Zeus = exempt (dogfood, não cobra)
-- Idempotente, matched-by-slug.
-- ─────────────────────────────────────────────────────────────────────────────

update public.companies
   set billing_exempt = true,
       billing_status = 'exempt',
       updated_at     = now()
 where slug = 'zeus';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tabela `subscription_events`
--
-- Mirror imutável de webhooks Stripe (e futuros Pagar.me em Fase 8).
-- Idempotência via UNIQUE em (provider, provider_event_id). Audit trail
-- completo: a query "como a assinatura X chegou no estado atual?" é
-- timeline ordenada desta tabela.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.subscription_events (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid references public.companies(id) on delete set null,

  -- Provider do evento. 'stripe' default; 'pagarme' chega em Fase 8.
  payment_provider    text not null default 'stripe',

  -- ID nativo do evento no provider (ex Stripe: 'evt_xxx'). UNIQUE por
  -- provider — chave de idempotência. ON CONFLICT DO NOTHING no INSERT
  -- protege de retries do Stripe (que retenta por até 3 dias).
  provider_event_id   text not null,

  -- Tipo do evento (ex: 'checkout.session.completed', 'invoice.payment_failed').
  event_type          text not null,

  -- Payload completo do webhook (pra debug / replay futuro).
  payload             jsonb not null default '{}'::jsonb,

  -- Quando o handler processou (vs created_at do evento no Stripe).
  -- NULL enquanto não processado (raros casos de queue futura).
  processed_at        timestamptz,

  created_at          timestamptz not null default now(),

  constraint subscription_events_provider_values check (
    payment_provider in ('stripe','pagarme')
  ),

  constraint subscription_events_provider_event_unique
    unique (payment_provider, provider_event_id)
);

comment on table public.subscription_events is
  'Mirror imutável de webhooks de billing. UNIQUE em (provider, provider_event_id) é a idempotency key. Escrita SÓ via RPC apply_subscription_event chamada pelo webhook handler com service_role.';

create index subscription_events_company_created_idx
  on public.subscription_events(company_id, created_at desc);

create index subscription_events_event_type_idx
  on public.subscription_events(event_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — subscription_events
--
-- SELECT: só admin/owner. Member/viewer não vê histórico financeiro.
-- INSERT/UPDATE/DELETE: nenhuma policy = nenhum acesso via PostgREST.
-- Escrita exclusiva via RPC apply_subscription_event chamada pelo webhook
-- handler com SUPABASE_SERVICE_ROLE_KEY (que bypassa RLS).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subscription_events enable row level security;

create policy "subscription_events_select_admins"
  on public.subscription_events for select
  to authenticated
  using (
    company_id is not null
    and public.is_company_admin(company_id)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: apply_subscription_event
--
-- Chamada pelo webhook handler (Vercel API route) com service_role.
-- Atômica: insert subscription_events + update companies + audit_log.
-- Idempotente: ON CONFLICT no UNIQUE (provider, provider_event_id).
--
-- O handler decide quais campos passar baseado em event_type:
--   - checkout.session.completed     → set customer/subscription/status='trialing'
--   - customer.subscription.updated  → update plan + status
--   - customer.subscription.deleted  → status='canceled', plan='starter'
--   - invoice.payment_succeeded      → status='active', plan_renewed_at=now()
--   - invoice.payment_failed         → status='past_due'
--
-- Se _company_id é NULL (webhook chegou antes do checkout-success grava
-- o customer_id no DB), gravamos só em subscription_events e o handler
-- retenta resolução. Stripe garante ordem na maioria dos casos.
--
-- Se billing_exempt=true na empresa, ignora updates em companies (mas
-- ainda grava em subscription_events pra audit).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.apply_subscription_event(
  _company_id          uuid,
  _provider            text,
  _provider_event_id   text,
  _event_type          text,
  _payload             jsonb,
  _new_plan            text default null,
  _new_status          text default null,
  _stripe_customer_id  text default null,
  _stripe_sub_id       text default null,
  _trial_ends_at       timestamptz default null,
  _renewed_at          timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _event_id uuid;
  _exempt   boolean := false;
  _existing uuid;
begin
  -- 1. Idempotency check + insert event row.
  insert into public.subscription_events (
    company_id, payment_provider, provider_event_id, event_type, payload, processed_at
  )
  values (
    _company_id, _provider, _provider_event_id, _event_type, _payload, now()
  )
  on conflict (payment_provider, provider_event_id) do nothing
  returning id into _event_id;

  -- Se já existia (retry duplicado do Stripe), short-circuit. Nada a fazer.
  if _event_id is null then
    select id into _existing
      from public.subscription_events
     where payment_provider = _provider
       and provider_event_id = _provider_event_id;
    return _existing;
  end if;

  -- 2. Sem company_id resolvido → só gravamos o evento. Handler tenta
  -- de novo no próximo webhook (Stripe envia customer.created antes de
  -- subscription.created normalmente).
  if _company_id is null then
    return _event_id;
  end if;

  -- 3. Verifica exempt antes de tocar companies.
  select billing_exempt into _exempt
    from public.companies
   where id = _company_id;

  if _exempt then
    -- Audit mesmo assim ("evento ignorado por exempt") — visibilidade.
    perform public.log_audit_event(
      _company_id,
      'billing.event_ignored_exempt',
      jsonb_build_object('event_type', _event_type, 'event_id', _provider_event_id)
    );
    return _event_id;
  end if;

  -- 4. Update companies. COALESCE preserva valores antigos quando o
  -- webhook não traz aquele campo (ex: payment_succeeded só atualiza
  -- renewed_at + status, não mexe no plan).
  update public.companies
     set stripe_customer_id     = coalesce(_stripe_customer_id, stripe_customer_id),
         stripe_subscription_id = coalesce(_stripe_sub_id,      stripe_subscription_id),
         plan                   = coalesce(_new_plan,           plan),
         billing_status         = coalesce(_new_status,         billing_status),
         trial_ends_at          = coalesce(_trial_ends_at,      trial_ends_at),
         plan_renewed_at        = coalesce(_renewed_at,         plan_renewed_at),
         updated_at             = now()
   where id = _company_id;

  -- 5. Audit log (convenção existente "<entidade>.<verbo>").
  perform public.log_audit_event(
    _company_id,
    'billing.' || replace(_event_type, '.', '_'),
    jsonb_build_object(
      'provider',      _provider,
      'event_id',      _provider_event_id,
      'new_plan',      _new_plan,
      'new_status',    _new_status,
      'renewed_at',    _renewed_at
    )
  );

  return _event_id;
end;
$$;

comment on function public.apply_subscription_event(
  uuid, text, text, text, jsonb, text, text, text, text, timestamptz, timestamptz
) is
  'Aplica evento de billing recebido via webhook. Idempotente via UNIQUE provider+event_id. Respeita billing_exempt. SÓ pode ser chamada pelo webhook handler com service_role (revoke abaixo).';

-- LOCKDOWN: nenhum role authenticated/anon executa esta RPC. Só
-- service_role (usado pelo webhook handler em Vercel API route).
revoke all on function public.apply_subscription_event(
  uuid, text, text, text, jsonb, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_subscription_event(
  uuid, text, text, text, jsonb, text, text, text, text, timestamptz, timestamptz
) to service_role;
