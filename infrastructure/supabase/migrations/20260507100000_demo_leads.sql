-- 0007 — demo_leads (lead capture do form /demo na landing)
--
-- Tabela de leads gerados pelo form em apps/landing/src/app/demo.
-- Append-only: leads não são editados nem deletados pelo produto;
-- são copiados manualmente pra CRM/planilha conforme o pipeline
-- comercial evoluir.
--
-- Pattern: igual `events` (migration 0004) — escrita exclusiva via
-- server action do apps/landing com service_role key (BYPASSRLS).
-- Sem RPC: o insert é simples, sem lógica condicional, sem auth.uid()
-- (lead é anônimo até virar conta), sem joins com outras tabelas.
-- Server action revalida o input via Zod antes de inserir.
--
-- RLS habilitada com ZERO policies — nem SELECT pra dashboard.
-- Triagem dos leads acontece via Telegram + e-mail (notificação
-- imediata). Acesso a histórico fica pra fase futura quando virar
-- /admin/leads no apps/web.
-- ═════════════════════════════════════════════════════════════════════════════

create table public.demo_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- Campos do form (Zod no client + revalidação no server action).
  name        text not null,
  email       text not null,
  company     text,
  phone       text,

  -- Enum de tamanho. Validado por Zod no client e server; CHECK aqui é
  -- defesa em profundidade contra service_role com payload malformado.
  employees   text not null,

  use_case    text,

  -- Atribuição: UTMs e referrer capturados client-side (UTMs via
  -- searchParams no Server Component, referrer via document.referrer
  -- no Client Component após mount). Tudo opcional.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,

  -- Forensics: IP via x-forwarded-for / x-real-ip header, User-Agent
  -- via header. Capturados no server action (Vercel popula). Útil pra
  -- detectar abuso (bots passando o honeypot) e correlacionar com geo
  -- futura.
  ip_address    text,
  user_agent    text,

  -- Caps generosos pra evitar abuse (lead com 1MB de use_case). Length
  -- bate com os Zod limits do client (apps/landing/src/lib/demo/schemas.ts).
  constraint demo_leads_name_length     check (length(name) between 2 and 100),
  constraint demo_leads_email_length    check (length(email) between 5 and 200),
  constraint demo_leads_company_length  check (company is null or length(company) <= 100),
  constraint demo_leads_phone_length    check (phone is null or length(phone) <= 20),
  constraint demo_leads_use_case_length check (use_case is null or length(use_case) <= 1000),

  -- Enum fechado de tamanhos. Match com EMPLOYEE_RANGES em schemas.ts.
  constraint demo_leads_employees_values check (
    employees in ('1-10','11-50','51-200','200+')
  )
);

comment on table public.demo_leads is
  'Leads gerados pelo form /demo na landing. Append-only. Escrita exclusiva via server action do apps/landing com service_role. Sem RLS policies — sem leitura por usuário autenticado neste momento.';

-- Índice principal: query "últimos N leads" pra triagem (futura UI
-- /admin/leads ou export pra planilha).
create index demo_leads_created_idx
  on public.demo_leads (created_at desc);


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — demo_leads
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.demo_leads enable row level security;

-- ZERO policies. Consequências:
--   - service_role: bypassa RLS por BYPASSRLS attribute → consegue
--     INSERT (server action funciona).
--   - authenticated/anon: zero policy = zero acesso. Nem SELECT, nem
--     INSERT, nem UPDATE, nem DELETE. RLS bloqueia tudo silenciosamente
--     (PostgREST retorna [] em SELECT, erro em INSERT).
--
-- Quando virar /admin/leads (fase futura): adicionar policy SELECT
-- usando is_company_member ou role-based check específico ao pattern
-- de admin global.
