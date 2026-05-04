-- 0001 — profiles table + RLS + auto-create trigger on signup
--
-- Estende auth.users com campos app-specific (display_name, avatar_url).
-- RLS: usuário só lê/atualiza o próprio profile.
-- Trigger: ao criar um auth.user (signup), popular automaticamente o profile.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Extensão app-specific de auth.users (display_name, avatar, etc).';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS

alter table public.profiles enable row level security;

create policy "profiles_select_self"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: mantém updated_at em sincronia em UPDATEs

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: popula profile automaticamente ao criar um auth.user
--
-- security definer + search_path = public é o pattern padrão Supabase para
-- triggers que escrevem em outros schemas a partir de auth.users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
