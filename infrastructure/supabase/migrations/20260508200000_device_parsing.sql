-- 0013 — Device & browser parsing (UA decomposition).
--
-- Atualmente events.user_agent guarda a string completa do UA, mas pra
-- agregação ("quantos usuários estão em iPhone 14 Pro?") precisa parsing.
--
-- Adiciona 6 colunas vindas de ua-parser-js (server-side, no tracker
-- worker e no /api/pixel route handler):
--   - browser_name       : "Chrome", "Safari", "Firefox", "Edge"
--   - browser_version    : "120.0.0", "17.2", etc
--   - os_name            : "Windows", "macOS", "iOS", "Android"
--   - os_version         : "11", "14.2", "17.2", etc
--   - device_vendor      : "Apple", "Samsung", "Google"
--   - device_model       : "iPhone", "SM-G998B", "Pixel 7" (raw UA value)
--
-- Pra Chromium-based browsers, navigator.userAgentData.getHighEntropyValues()
-- no pixel.js dá values mais precisos (device_model em particular).
-- Compatible: ~70% do tráfego BR.
-- ═════════════════════════════════════════════════════════════════════════════


alter table public.events
  add column if not exists browser_name text,
  add column if not exists browser_version text,
  add column if not exists os_name text,
  add column if not exists os_version text,
  add column if not exists device_vendor text,
  add column if not exists device_model text;

-- Length sane (UA-parsed strings são curtos por natureza).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_device_strings_lengths'
  ) then
    alter table public.events
      add constraint events_device_strings_lengths check (
        (browser_name is null or char_length(browser_name) <= 64)
        and (browser_version is null or char_length(browser_version) <= 32)
        and (os_name is null or char_length(os_name) <= 64)
        and (os_version is null or char_length(os_version) <= 32)
        and (device_vendor is null or char_length(device_vendor) <= 64)
        and (device_model is null or char_length(device_model) <= 128)
      );
  end if;
end $$;

-- Índices úteis pra agregações ("Top 10 OS dos visitantes").
create index if not exists events_company_browser_idx
  on public.events(company_id, browser_name, created_at desc)
  where browser_name is not null;

create index if not exists events_company_os_idx
  on public.events(company_id, os_name, created_at desc)
  where os_name is not null;

comment on column public.events.browser_name is
  'Browser parsed do UA (Chrome, Safari, Firefox, Edge, Opera, Samsung Internet, etc).';
comment on column public.events.os_name is
  'Sistema operacional parsed (Windows, macOS, iOS, Android, Linux, ChromeOS).';
comment on column public.events.device_vendor is
  'Fabricante (Apple, Samsung, Google, Xiaomi, etc). NULL pra desktop genérico.';
comment on column public.events.device_model is
  'Modelo do device (ex: "iPhone", "SM-G998B"). Em Chromium pode vir mais preciso via userAgentData.';
