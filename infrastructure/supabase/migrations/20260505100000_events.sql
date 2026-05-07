-- 0004 — events (cliques no link mestre)
--
-- Append-only. Escrita exclusiva pelo Cloudflare Worker via service_role
-- (bypassa RLS por atributo BYPASSRLS do role no Supabase). Leitura via
-- dashboard com RLS por membership (mesmo pattern de companies/audit_log
-- na 0002).
--
-- Sem updated_at + trigger — eventos são imutáveis após inserção. Sem RPC
-- de escrita (worker chama PostgREST `/rest/v1/events` direto com
-- service_role key).
-- ═════════════════════════════════════════════════════════════════════════════

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- Device parsing best-effort no worker. Valores canônicos:
  --   mobile   — celular
  --   tablet   — iPad/Android tablet
  --   desktop  — laptop/PC
  --   unknown  — User-Agent ausente ou não parseável
  device      text,

  -- ISO 3166-1 alpha-2 (ex: 'BR', 'US'). Vem de cf-ipcountry header do
  -- Cloudflare. Null se Cloudflare não conseguir geolocate.
  ip_country  text,

  -- Cidade do cf-ipcity header. Granularidade variável (cidade/estado).
  ip_city     text,

  -- Primeiro valor de Accept-Language (ex: 'pt-BR', 'en-US'). Útil pra
  -- atribuir audiência por idioma.
  lang        text,

  -- Referrer header (URL completa) ou null se acesso direto.
  referrer    text,

  -- User-Agent cru pra debug e fallback de parsing.
  user_agent  text,

  constraint events_device_values check (
    device is null or device in ('mobile','desktop','tablet','unknown')
  ),

  constraint events_ip_country_format check (
    ip_country is null or ip_country ~ '^[A-Z]{2}$'
  )
);

comment on table public.events is
  'Cliques no link mestre. Append-only. Escrita exclusiva via Cloudflare Worker com service_role. Leitura via dashboard com RLS por membership.';

-- Índice principal: query "últimos eventos de tal empresa" e agregações
-- por janela temporal (dashboard). Composto cobre WHERE company_id = X
-- ORDER BY created_at DESC LIMIT N.
create index events_company_created_idx
  on public.events(company_id, created_at desc);


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — events
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.events enable row level security;

-- Acesso liberado pra qualquer membership (member, admin,
-- owner). Eventos compõem o dashboard operacional do produto
-- - é o caso de uso primário, não exceção. Diferente de
-- audit_log que é admin-only por ser trilha de segurança.
create policy "events_select_members"
  on public.events for select
  to authenticated
  using (public.is_company_member(company_id));

-- INSERT/UPDATE/DELETE: sem policy = sem permissão pra authenticated/anon.
-- Cloudflare Worker escreve via service_role key (BYPASSRLS bypassa
-- policies inteiras). Sem RPC dedicada — INSERT direto via PostgREST
-- com service_role auth header.
