-- 0006 — índices de performance pra queries de /relatorios
--
-- Análise: queries esperadas em relatórios filtram por
-- `(company_id, created_at >= X, created_at <= Y)` e agrupam por geo
-- (ip_country) e device. O índice `events_company_created_idx`
-- (company_id, created_at desc) da migration 0004 já cobre o filtro
-- temporal e o ORDER BY. Mas pra GROUP BY heavy num dataset de >100k
-- eventos por empresa, sem índice secundário em ip_country/device o
-- planner faz seq scan + sort em memória.
--
-- Adicionados 2 índices compostos:
--   1. (company_id, ip_country) WHERE ip_country IS NOT NULL
--      Partial — evita indexar rows sem geo (wrangler dev local + edge
--      cases onde Cloudflare não geolocate). Reduz tamanho ~30% em
--      datasets reais. Cobre Top Países + Mapa-múndi.
--   2. (company_id, device) full
--      Cobre breakdown de devices na página de relatórios.
--
-- Sem índice em (company_id, lang) — distribuição de idiomas tem
-- cardinalidade baixa (10-20 valores típicos), GROUP BY é OK em scan
-- linear pequeno. Adicionar se virar gargalo medido.
-- ═════════════════════════════════════════════════════════════════════════════

create index events_company_country_idx
  on public.events (company_id, ip_country)
  where ip_country is not null;

create index events_company_device_idx
  on public.events (company_id, device);
