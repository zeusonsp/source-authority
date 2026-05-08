-- 0008 — alerts (brand protection / domain monitoring) — Pilar 2
--
-- Append-only escrita pelo Cloudflare Worker workers/brand-monitor via
-- service_role (BYPASSRLS). Leitura via dashboard com RLS por membership
-- (mesmo pattern de events 0004). Triagem via RPC public.triage_alert
-- que também escreve audit_log atomicamente.
--
-- Sem coluna updated_at — mudança de status é sempre via triage_alert
-- que popula triaged_at/triaged_by. Status terminal (resolved/dismissed)
-- não é re-editável pelo MVP (re-abrir = inserir alerta novo).
-- ═════════════════════════════════════════════════════════════════════════════

-- Adiciona colunas em companies pra suportar monitoramento:
--   protected_brand_terms — termos da marca pra monitorar (ex: ['zeus','zeustec'])
--   owned_domains         — allowlist (não alerta sobre certs/domínios próprios)
alter table public.companies
  add column if not exists protected_brand_terms text[] not null default '{}'::text[];

alter table public.companies
  add column if not exists owned_domains text[] not null default '{}'::text[];

comment on column public.companies.protected_brand_terms is
  'Termos da marca pra monitoramento (lowercase). Ex: [''zeus'', ''zeus tecnologia'', ''zeusoficial''].';

comment on column public.companies.owned_domains is
  'Domínios próprios da empresa — allowlist. Workers ignoram alertas em hosts que terminam com qualquer um desses. Ex: [''zeusoficial.com'', ''zeustecnologia.com.br''].';


-- ═════════════════════════════════════════════════════════════════════════════
-- alerts
-- ═════════════════════════════════════════════════════════════════════════════

create table public.alerts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- Tipo do sinal. Estende-se via ALTER constraint quando Phase 6 trouxer
  -- novos detectores (ex: 'social_impersonation', 'paid_ad_misuse').
  type        text not null,

  -- Tier do sinal. Auto-atribuído pelo worker no INSERT a partir de
  -- data.squat_score + data.has_mx_record + matching contra owned_domains.
  -- Sem 'critical' no MVP — evita fatigue antes de termos confirmação
  -- de phishing kit ativo.
  severity    text not null default 'medium',

  -- FSM: new → triaged → (dismissed | resolved). Transição out-of-new é
  -- exclusiva da RPC triage_alert (escreve audit_log atomicamente).
  status      text not null default 'new',

  -- Módulo que disparou. Permite debug por origem ('certspotter',
  -- 'dnstwist', 'manual', futuramente 'censys', 'twitter_api').
  source      text not null,

  -- Payload type-specific. Sem schema enforçado no DB pela mesma razão
  -- de events.* — o writer é confiável (worker próprio + service_role).
  -- Shape esperado por type:
  --   ct_log_match  → { host, issuer, not_before, not_after,
  --                     cert_sha256, squat_score, certspotter_id }
  --   domain_squat  → { host, registrar, registered_at, has_mx,
  --                     has_a, ns_servers[] }
  --   dns_anomaly   → { host, anomaly_type, observed_value,
  --                     expected_value }
  --   mention       → { url, snippet, source_platform, captured_at }
  data        jsonb not null default '{}'::jsonb,

  -- Triagem. NULL enquanto status='new'.
  triaged_at  timestamptz,
  triaged_by  uuid references public.profiles(id) on delete set null,

  constraint alerts_type_values check (
    type in ('domain_squat','ct_log_match','dns_anomaly','mention')
  ),
  constraint alerts_severity_values check (
    severity in ('low','medium','high')
  ),
  constraint alerts_status_values check (
    status in ('new','triaged','dismissed','resolved')
  ),

  -- Coerência: triaged_at e triaged_by só existem em status != 'new'.
  -- 'new' tem ambos NULL; demais têm triaged_at preenchido.
  constraint alerts_triage_coherent check (
    (status = 'new' and triaged_at is null and triaged_by is null)
    or (status <> 'new' and triaged_at is not null)
  )
);

comment on table public.alerts is
  'Alertas de proteção de marca. Append-only via Cloudflare Worker brand-monitor com service_role. Triagem via RPC triage_alert (escreve audit_log). Schema do data JSONB documentado em comment — não enforçado no DB.';

-- Índice principal: dashboard /alertas filtra por (company, status) e
-- ordena por data desc. Cobre as queries quentes (lista, contadores,
-- drawer).
create index alerts_company_status_created_idx
  on public.alerts(company_id, status, created_at desc);

-- Índice parcial pro badge "alertas novos" no sidebar — query é
-- COUNT(*) WHERE company_id = X AND status = 'new'. Partial index
-- economiza espaço (a maioria dos alertas vai pra triaged/dismissed
-- em poucos dias).
create index alerts_company_new_idx
  on public.alerts(company_id)
  where status = 'new';

-- Dedupe lookup do worker — evita re-inserir o mesmo cert duas vezes.
-- Funcional em jsonb extraction; usa GIN não vale a pena pra equality
-- exata num único campo.
create index alerts_cert_sha256_idx
  on public.alerts((data->>'cert_sha256'))
  where data ? 'cert_sha256';


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — alerts
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.alerts enable row level security;

-- SELECT: qualquer membership (member, admin, owner). Alertas são parte
-- do valor central do produto, não trilha de segurança — mesmo critério
-- de events, diferente de audit_log.
create policy "alerts_select_members"
  on public.alerts for select
  to authenticated
  using (public.is_company_member(company_id));

-- INSERT: nenhuma policy = nenhuma permissão pra authenticated/anon.
-- Worker brand-monitor escreve via service_role key (BYPASSRLS).

-- UPDATE: nenhuma policy. Mudança de status flui exclusivamente pela
-- RPC public.triage_alert (SECURITY DEFINER) que valida is_company_member
-- + escreve audit_log atomicamente. Garante que toda transição de
-- status aparece no audit trail.

-- DELETE: nenhuma policy. Alertas são imutáveis. "Apagar" = status='dismissed'.


-- ═════════════════════════════════════════════════════════════════════════════
-- RPC: triage_alert
--
-- Único caminho de mudança de status. Atomic: update + audit_log na
-- mesma transação. 'new' → triaged|dismissed|resolved é permitido;
-- estados terminais (dismissed/resolved) não voltam pra new.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.triage_alert(
  _alert_id   uuid,
  _new_status text,
  _note       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid;
  _old_status text;
  _user_id    uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if _new_status not in ('triaged','dismissed','resolved') then
    raise exception 'invalid status: %', _new_status using errcode = '22023';
  end if;

  select company_id, status
    into _company_id, _old_status
    from public.alerts
   where id = _alert_id;

  if _company_id is null then
    raise exception 'alert not found' using errcode = 'P0002';
  end if;

  if not public.is_company_member(_company_id) then
    raise exception 'forbidden: not a member of company %', _company_id
      using errcode = '42501';
  end if;

  -- Status terminal não muda mais. Re-abrir = INSERT novo alerta.
  if _old_status in ('dismissed','resolved') then
    raise exception 'alert already terminal: %', _old_status
      using errcode = '22023';
  end if;

  update public.alerts
     set status     = _new_status,
         triaged_at = now(),
         triaged_by = _user_id
   where id = _alert_id;

  perform public.log_audit_event(
    _company_id,
    'alert.triaged',
    jsonb_build_object(
      'alert_id',   _alert_id,
      'old_status', _old_status,
      'new_status', _new_status,
      'note',       _note
    )
  );

  return _alert_id;
end;
$$;

comment on function public.triage_alert(uuid, text, text) is
  'Único caminho de mudança de status em alerts. Valida membership, bloqueia transição out-of-terminal, escreve audit_log atomicamente.';

revoke all on function public.triage_alert(uuid, text, text) from public;
revoke all on function public.triage_alert(uuid, text, text) from anon;
revoke all on function public.triage_alert(uuid, text, text) from authenticated;
revoke all on function public.triage_alert(uuid, text, text) from service_role;

grant execute on function public.triage_alert(uuid, text, text) to authenticated;
