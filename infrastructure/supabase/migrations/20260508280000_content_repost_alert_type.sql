-- 0017 — Pillar 2 V2.1: novo alert type 'content_repost' pra hashtag scanner.
--
-- Worker brand-monitor varre hashtag posts via Instagram Graph API a cada 4h.
-- Match por perceptual hash (dHash) contra contents.thumbnail_dhash da empresa.
-- Quando Hamming distance ≤ 12, insere alert com type='content_repost'.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.alerts
  drop constraint if exists alerts_type_values;

alter table public.alerts
  add constraint alerts_type_values check (
    type in (
      'domain_squat',
      'ct_log_match',
      'dns_anomaly',
      'mention',
      'content_repost'
    )
  );
