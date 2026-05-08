-- 0012 — Event capture expansion (LGPD-compliant rich tracking).
--
-- Adiciona 21 colunas à tabela `events` cobrindo:
--   1. Geo enriquecida via Cloudflare cf object (region, postal, timezone,
--      lat/lng, continent, ASN/ISP).
--   2. Browser/device fields via JS pixel (screen, viewport, color depth,
--      pixel ratio, network type).
--   3. URL context (path) + UTM params (source/medium/campaign/term/content).
--
-- Todas nullable + com defaults seguros — eventos antigos continuam válidos.
-- Sem PII direta (sem IP, sem session token persistente entre browsers,
-- sem device fingerprinting). Tudo derivado e anônimo.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Geo enriquecida (server-side via CF tracker worker)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  -- Estado/UF (BR: SP, RJ, MG; US: CA, NY; etc).
  add column if not exists ip_region text,
  -- Continente (NA, SA, EU, AS, AF, OC, AN).
  add column if not exists ip_continent text,
  -- ZIP/CEP (Cloudflare Pro+ retorna; em Free é null).
  add column if not exists ip_postal_code text,
  -- IANA timezone (ex: America/Sao_Paulo).
  add column if not exists ip_timezone text,
  -- Lat/lng aproximados (~city precision; rural pode pegar TZ central).
  add column if not exists ip_latitude double precision,
  add column if not exists ip_longitude double precision,
  -- ASN (Autonomous System Number) + nome da operadora.
  -- Ex: 26599 / "AS26599 TELEFONICA BRASIL S.A".
  add column if not exists ip_asn integer,
  add column if not exists ip_organization text,
  -- Path da URL (sem query string) — útil pra "página /produtos/X mais clicada".
  add column if not exists url_path text,
  -- UTM params padrão Google Analytics — paralelo ao ?ref= proprietário.
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Browser/device (client-side via pixel.js)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  -- screen.width / screen.height (display físico).
  add column if not exists screen_width integer,
  add column if not exists screen_height integer,
  -- window.innerWidth / innerHeight (viewport real após chrome browser).
  add column if not exists viewport_width integer,
  add column if not exists viewport_height integer,
  -- screen.colorDepth (24, 30, etc).
  add column if not exists color_depth integer,
  -- window.devicePixelRatio (1.0 standard, 2.0 retina, 3.0 some mobile).
  add column if not exists device_pixel_ratio numeric(4, 2),
  -- navigator.connection.effectiveType (4g, 3g, 2g, slow-2g) — só Chromium.
  add column if not exists network_type text;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHECK constraints pra evitar abuse via payloads gigantes
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_geo_text_lengths') then
    alter table public.events
      add constraint events_geo_text_lengths check (
        (ip_region is null or char_length(ip_region) <= 64)
        and (ip_continent is null or char_length(ip_continent) <= 4)
        and (ip_postal_code is null or char_length(ip_postal_code) <= 20)
        and (ip_timezone is null or char_length(ip_timezone) <= 64)
        and (ip_organization is null or char_length(ip_organization) <= 200)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_url_text_lengths') then
    alter table public.events
      add constraint events_url_text_lengths check (
        (url_path is null or char_length(url_path) <= 500)
        and (utm_source is null or char_length(utm_source) <= 200)
        and (utm_medium is null or char_length(utm_medium) <= 200)
        and (utm_campaign is null or char_length(utm_campaign) <= 200)
        and (utm_term is null or char_length(utm_term) <= 200)
        and (utm_content is null or char_length(utm_content) <= 200)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_device_dims_sane') then
    alter table public.events
      add constraint events_device_dims_sane check (
        (screen_width is null or screen_width between 0 and 16384)
        and (screen_height is null or screen_height between 0 and 16384)
        and (viewport_width is null or viewport_width between 0 and 16384)
        and (viewport_height is null or viewport_height between 0 and 16384)
        and (color_depth is null or color_depth between 0 and 64)
        and (device_pixel_ratio is null or device_pixel_ratio between 0 and 10)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_lat_lng_sane') then
    alter table public.events
      add constraint events_lat_lng_sane check (
        (ip_latitude is null or ip_latitude between -90 and 90)
        and (ip_longitude is null or ip_longitude between -180 and 180)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_network_type_values') then
    alter table public.events
      add constraint events_network_type_values check (
        network_type is null
        or network_type in ('slow-2g', '2g', '3g', '4g', '5g', 'unknown')
      );
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Índices úteis pra agregações em /relatorios
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists events_company_region_idx
  on public.events(company_id, ip_region, created_at desc)
  where ip_region is not null;

create index if not exists events_company_utm_source_idx
  on public.events(company_id, utm_source, created_at desc)
  where utm_source is not null;

create index if not exists events_company_url_path_idx
  on public.events(company_id, url_path, created_at desc)
  where url_path is not null;


-- Comments documentando intenção pra futuros devs / DBAs.
comment on column public.events.ip_region is
  'Estado/UF (CF cf.region). Ex: SP, RJ, CA, NY.';
comment on column public.events.ip_continent is
  'Código de continente (CF cf.continent). NA/SA/EU/AS/AF/OC/AN.';
comment on column public.events.ip_postal_code is
  'CEP/ZIP (CF cf.postalCode). Pode ser null em Free tier do CF.';
comment on column public.events.ip_timezone is
  'IANA timezone (CF cf.timezone). Ex: America/Sao_Paulo.';
comment on column public.events.ip_latitude is
  'Latitude IP-derived. Precisão ~cidade. NULL = não disponível.';
comment on column public.events.ip_longitude is
  'Longitude IP-derived. Mesmo nivel da ip_latitude.';
comment on column public.events.ip_asn is
  'ASN da operadora (ex: 26599 = TELEFONICA BR). Útil pra filtrar bots.';
comment on column public.events.ip_organization is
  'Nome ASN (ex: "TELEFONICA BRASIL S.A"). Operadora/ISP humanizado.';

comment on column public.events.screen_width is
  'screen.width — resolução física do monitor.';
comment on column public.events.viewport_width is
  'window.innerWidth — viewport real (após barras do browser).';
comment on column public.events.device_pixel_ratio is
  'window.devicePixelRatio (retina = 2.0).';
comment on column public.events.network_type is
  'navigator.connection.effectiveType. Só Chromium-based browsers.';

comment on column public.events.url_path is
  'pathname da URL acessada (sem query). Pra page-view analytics.';
comment on column public.events.utm_source is
  'utm_source padrão GA. Ex: "instagram", "newsletter".';
