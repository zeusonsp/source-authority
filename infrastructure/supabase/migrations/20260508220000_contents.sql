-- 0014 — Pillar 2.5: Content Registry (anti-plagio fundação).
--
-- Cliente cadastra seus conteúdos originais (vídeos do Instagram/TikTok/YouTube
-- ou upload direto). Sistema computa perceptual hash da thumbnail/keyframe pra
-- match contra reposts suspeitos.
--
-- V1 escopo: URL-based, image-only (thumbnail). V2 adiciona ffmpeg + audio
-- fingerprint + scan proativo de hashtags.
--
-- Match flow:
--   1. POST /api/internal/content/register {source_url} → fetch og:image
--      ou oEmbed → dHash → INSERT contents.
--   2. UI "Verificar repost" → fetch suspect URL → dHash → Hamming distance
--      contra contents.perceptual_hash → similarity score 0-1.
--   3. Match >0.85 → cria alert (type='content_repost', severity='high').
-- ═════════════════════════════════════════════════════════════════════════════


create table public.contents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,

  -- Source: 'instagram' | 'tiktok' | 'youtube' | 'reels' | 'shorts' | 'web'.
  source_platform text not null,
  -- URL canônica do post original.
  source_url      text not null,
  -- ID nativo do post no provider (parsed da URL pra dedupe + linking futuro).
  external_id     text,

  -- Thumbnail / keyframe representativo.
  thumbnail_url   text,
  thumbnail_dhash text,

  -- Metadata
  title           text,
  notes           text,
  duration_seconds numeric(8, 2),

  -- Pipeline state — 'pending' até hash computar; 'ready' = match-pronto;
  -- 'failed' = fetch falhou (URL inválida, post privado, etc).
  status          text not null default 'pending',
  status_detail   text,

  registered_at   timestamptz not null default now(),
  registered_by   uuid references public.profiles(id) on delete set null,

  constraint contents_platform_values check (
    source_platform in (
      'instagram', 'tiktok', 'youtube', 'reels', 'shorts', 'web', 'upload'
    )
  ),
  constraint contents_source_url_format check (
    char_length(source_url) between 5 and 2000
  ),
  constraint contents_status_values check (
    status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint contents_dhash_hex check (
    thumbnail_dhash is null
    or thumbnail_dhash ~ '^[0-9a-f]{16}$'
  ),
  -- Unique pra dedupe — empresa não cadastra mesmo URL 2x.
  constraint contents_company_url_unique unique (company_id, source_url)
);

comment on table public.contents is
  'Registry de conteúdo original do cliente (Pillar 2.5). Perceptual hash da '
  'thumbnail é usado pra detectar repost via Hamming distance. V1: image-only.';

create index contents_company_idx
  on public.contents(company_id, registered_at desc);

create index contents_dhash_idx
  on public.contents(thumbnail_dhash)
  where thumbnail_dhash is not null;

create index contents_status_idx
  on public.contents(company_id, status)
  where status in ('pending', 'processing');


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — members veem; admin/owner cadastra+edita+deleta.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.contents enable row level security;

create policy "contents_select_members"
  on public.contents for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "contents_insert_admins"
  on public.contents for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy "contents_update_admins"
  on public.contents for update
  to authenticated
  using (public.is_company_admin(company_id));

create policy "contents_delete_admins"
  on public.contents for delete
  to authenticated
  using (public.is_company_admin(company_id));
