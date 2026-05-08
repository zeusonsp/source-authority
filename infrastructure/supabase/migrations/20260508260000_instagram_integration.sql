-- 0016 — Instagram Graph API integration scaffold.
--
-- 2 tabelas pra suporte ao OAuth + hashtag watch:
--
-- 1. `instagram_connections`: 1 conta IG Business conectada por empresa.
--    Guarda access_token (long-lived 60 dias), refresh procedure futuro.
-- 2. `hashtag_watches`: hashtags que worker brand-monitor vai polling
--    a cada 4h via Instagram Graph API. Limit: 30 por empresa (limit IG).
-- ═════════════════════════════════════════════════════════════════════════════


create table public.instagram_connections (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,

  -- Instagram Business Account ID (numeric, ~10-17 chars).
  ig_user_id      text not null,
  -- Username público (@zeustec).
  ig_username     text,
  -- Page ID Facebook associada (Instagram Business requer Page).
  fb_page_id      text,
  fb_page_name    text,

  -- Access token long-lived (60 dias). Refresh quando ficar < 7 dias pra expirar.
  access_token    text not null,
  token_expires_at timestamptz,

  -- Permissões/scopes que o user concedeu.
  granted_scopes  text[] default '{}',

  connected_at    timestamptz not null default now(),
  connected_by    uuid references public.profiles(id) on delete set null,
  last_polled_at  timestamptz,

  -- Status: 'active' | 'expired' (token vencido) | 'revoked' (user revogou).
  status          text not null default 'active',

  constraint ig_status_values check (status in ('active', 'expired', 'revoked')),
  constraint ig_company_unique unique (company_id)
);

comment on table public.instagram_connections is
  'Conexão OAuth Instagram Business por empresa. 1:1 com companies. '
  'access_token é long-lived (60d) — worker precisa refresh proativo.';

create index instagram_connections_status_idx
  on public.instagram_connections(status, last_polled_at)
  where status = 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- Hashtag Watch table
-- ─────────────────────────────────────────────────────────────────────────────

create table public.hashtag_watches (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,

  -- Hashtag SEM o # (ex: 'zeus', 'zeustech', 'leds'). Lowercase normalizado.
  hashtag         text not null,

  -- Hashtag ID do Instagram (resolvido via Graph API IG Hashtag Search).
  -- Cacheado pra evitar resolução repetida.
  ig_hashtag_id   text,

  -- Cursor do último polling — usado em proximo poll só pega novos posts.
  last_post_cursor text,
  last_polled_at  timestamptz,

  -- Active = worker poolla. Inactive = pausada manualmente.
  active          boolean not null default true,

  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,

  constraint hashtag_format check (
    hashtag ~ '^[a-z0-9_]+$' and char_length(hashtag) between 1 and 64
  ),
  constraint hashtag_company_unique unique (company_id, hashtag)
);

comment on table public.hashtag_watches is
  'Hashtags que o brand-monitor worker monitora via Instagram Hashtag '
  'Search API. Limit: 30 hashtags por empresa (Instagram Graph API rule).';

create index hashtag_watches_company_idx
  on public.hashtag_watches(company_id, active);

create index hashtag_watches_polling_idx
  on public.hashtag_watches(last_polled_at)
  where active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.instagram_connections enable row level security;
alter table public.hashtag_watches enable row level security;

create policy "ig_connections_select_members"
  on public.instagram_connections for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "ig_connections_insert_admins"
  on public.instagram_connections for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy "ig_connections_update_admins"
  on public.instagram_connections for update
  to authenticated
  using (public.is_company_admin(company_id));

create policy "ig_connections_delete_admins"
  on public.instagram_connections for delete
  to authenticated
  using (public.is_company_admin(company_id));


create policy "hashtag_watches_select_members"
  on public.hashtag_watches for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "hashtag_watches_all_admins"
  on public.hashtag_watches for all
  to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));
