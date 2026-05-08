-- 0011 — Pillar 3 v2: Conversions (revenue attribution).
--
-- v1 (migration 0010) capturava cliques com ?ref=<code>. v2 fecha o
-- loop atribuindo VENDAS REAIS aos revendedores via 2 mecanismos:
--
-- 1. Pixel JS no site do cliente envia `saTrack('conversion', {...})`
--    quando uma venda acontece (página de obrigado / order confirmation).
-- 2. Conversions.session_id casa com o último events.session_id que
--    tinha referrer_code → atribuição last-click within-session.
--
-- Idempotência via UNIQUE(company_id, external_id): se cliente
-- chama saTrack 2x pra mesma order (page reload, retry), só uma row.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. events.session_id (pra match last-click)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists session_id text;

comment on column public.events.session_id is
  'UUID gerado pelo pixel.js, persistido em localStorage. Usado pra '
  'casar conversões → eventos com referrer_code dentro da mesma sessão. '
  'NULL pra eventos do tracker (link mestre) — não tem como saber sessão '
  'do visitante antes do redirect.';

-- Index pra lookup rápido em conversões.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_session_id_length'
  ) then
    alter table public.events
      add constraint events_session_id_length check (
        session_id is null or char_length(session_id) <= 64
      );
  end if;
end $$;

create index if not exists events_session_id_idx
  on public.events(session_id, created_at desc)
  where session_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela `conversions`
--
-- Mirror das vendas reais reportadas pelo cliente via pixel.
-- Atribuição é resolvida no momento do INSERT (denormalizada em
-- reseller_code) — facilita queries em /revendedores e /relatorios
-- sem JOIN custoso.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.conversions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,

  -- ID interno do cliente (ex: 'ORDER_12345', UUID, número da NF).
  -- Idempotência via UNIQUE(company_id, external_id).
  external_id  text not null,

  -- Valor em centavos. BIGINT pra suportar transações grandes (até R$ 92 quatrilhões).
  amount_cents bigint not null,

  -- ISO 4217 (3 chars). Default BRL pra mercado brasileiro.
  currency     text not null default 'BRL',

  -- Resolvido ao INSERT cruzando session_id ou cookie. NULL = orgânica
  -- (visitor não passou por link com ?ref= na sessão).
  reseller_code text,

  -- Match key: session_id que veio do pixel.js. Pra debug/auditoria.
  session_id   text,

  -- Fk pro evento que justificou a atribuição (último click com ref+session match).
  -- ON DELETE SET NULL pra preserve audit em caso de purge de events antigos.
  source_event_id uuid references public.events(id) on delete set null,

  -- Quando aconteceu a venda no sistema do cliente.
  -- Default = now() (conversão recém-reportada). Cliente pode override
  -- passando occurred_at no payload pra backfill.
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),

  -- Constraints
  constraint conversions_external_id_length check (
    char_length(external_id) between 1 and 200
  ),
  constraint conversions_amount_nonneg check (amount_cents >= 0),
  constraint conversions_currency_format check (
    char_length(currency) = 3 and currency = upper(currency)
  ),
  constraint conversions_reseller_code_length check (
    reseller_code is null or char_length(reseller_code) <= 64
  ),
  constraint conversions_session_id_length check (
    session_id is null or char_length(session_id) <= 64
  ),
  constraint conversions_external_unique unique (company_id, external_id)
);

comment on table public.conversions is
  'Vendas reportadas pelo pixel.js do cliente, com atribuição '
  'last-click within-session em reseller_code (denormalizada). '
  'UNIQUE(company_id, external_id) é a idempotency key.';

-- Índices úteis pra agregações
create index conversions_company_occurred_idx
  on public.conversions(company_id, occurred_at desc);

create index conversions_company_reseller_idx
  on public.conversions(company_id, reseller_code, occurred_at desc)
  where reseller_code is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — conversions
--
-- SELECT: members (todos veem agregação por revendedor).
-- INSERT/UPDATE/DELETE: nenhuma policy = nenhum acesso via PostgREST.
-- Escrita exclusiva via API endpoint /api/pixel/conversion (apps/web)
-- com SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.conversions enable row level security;

create policy "conversions_select_members"
  on public.conversions for select
  to authenticated
  using (public.is_company_member(company_id));
