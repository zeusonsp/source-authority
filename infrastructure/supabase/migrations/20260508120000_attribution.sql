-- 0010 — Pillar 3 v1: Attribution per reseller code.
--
-- Pilar 3 do produto = "Atribuição de venda em redes de revenda/afiliados".
-- Esta migration entrega a fundação:
--   1. Coluna `events.referrer_code` (text, nullable) — capturada pelo tracker
--      do query param `?ref=<code>` na URL do link mestre.
--   2. Tabela `reseller_codes` — empresa cadastra os codes válidos com nome
--      do revendedor. Tracker NÃO valida em tempo real (preserva latência);
--      reports filtram com JOIN.
--
-- v2 (futuro): match Stripe customer/subscription com reseller via
-- `events.referrer_code` em window pré-checkout, popula tabela
-- `attributions` (sale_id, reseller_code, amount, attributed_at).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. events.referrer_code
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists referrer_code text;

comment on column public.events.referrer_code is
  'Código de revendedor capturado de ?ref=<code> na URL do tracker. '
  'Não-validado em runtime (qualquer string até 64 chars passa). '
  'Cruzamento com reseller_codes acontece em /relatorios.';

-- CHECK pra evitar payload abusivo (alguém colocando 4kb na query string).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_referrer_code_length'
  ) then
    alter table public.events
      add constraint events_referrer_code_length check (
        referrer_code is null or char_length(referrer_code) <= 64
      );
  end if;
end $$;

-- Índice partial pra filtros "por revendedor" — só rows com code (a maioria
-- dos eventos não tem ref code, esse partial mantém o índice pequeno).
create index if not exists events_company_referrer_idx
  on public.events(company_id, referrer_code, created_at desc)
  where referrer_code is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela `reseller_codes`
--
-- Empresa cadastra códigos válidos (ex: 'ana', 'joao_2026', 'instagram').
-- Schema simples — nome é apenas pra UI/relatório, não-único.
-- Code é unique POR empresa (multi-tenant): empresas diferentes podem usar
-- "ana" sem conflito.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.reseller_codes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,

  -- Código exato como aparece em ?ref=<code>. case-sensitive porque "ANA"
  -- vs "ana" pode importar (ex: "instagram" vs "Instagram" como sources
  -- distintas). UI normaliza pra lowercase ao criar mas não força.
  code        text not null,

  -- Nome amigável pra exibir em /relatorios.
  name        text not null,

  -- Notas internas opcionais (ex: "comissão 10%", "campanha jan/2026").
  notes       text,

  created_at  timestamptz not null default now(),
  -- ON DELETE SET NULL pra preservar atribuição em audit_log se profile
  -- for deletado (mesmo padrão do project — ver feedback memory).
  created_by  uuid references public.profiles(id) on delete set null,

  -- Unique (company, code) — empresa A pode ter "ana", empresa B pode ter
  -- "ana" também sem conflito.
  constraint reseller_codes_code_unique unique (company_id, code),

  -- Limites razoáveis (mesmo CHECK que events.referrer_code pra consistência).
  constraint reseller_codes_code_format check (
    char_length(code) between 1 and 64
    and code !~ '\s'  -- Sem espaços (URL-safe).
  ),
  constraint reseller_codes_name_length check (
    char_length(name) between 1 and 100
  )
);

comment on table public.reseller_codes is
  'Códigos de revendedor cadastrados pela empresa. Cruzamento com '
  'events.referrer_code via JOIN em /relatorios.';

create index reseller_codes_company_idx
  on public.reseller_codes(company_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
--
-- SELECT: members podem ler (todos veem códigos da empresa).
-- INSERT/UPDATE/DELETE: admin/owner only (mesmo padrão de companies update).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.reseller_codes enable row level security;

create policy "reseller_codes_select_members"
  on public.reseller_codes for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "reseller_codes_insert_admins"
  on public.reseller_codes for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy "reseller_codes_update_admins"
  on public.reseller_codes for update
  to authenticated
  using (public.is_company_admin(company_id));

create policy "reseller_codes_delete_admins"
  on public.reseller_codes for delete
  to authenticated
  using (public.is_company_admin(company_id));
