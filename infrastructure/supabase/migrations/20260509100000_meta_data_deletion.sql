-- 0018 — Meta data deletion request queue (App Review prereq).
--
-- Meta App Review exige 2 callbacks públicos antes de aprovar permissões
-- como `ig_hashtag_search`:
--
--   1. Deauthorize Callback (instantâneo): user revoga app no Meta Business
--      Suite → POST signed_request → apagamos token IG da empresa. Não usa
--      esta tabela; flow direto em DELETE instagram_connections.
--
--   2. Data Deletion Callback (≤30 dias): user solicita deleção total dos
--      dados Meta dele. Enfileiramos aqui pra processamento async (compatível
--      com prazos LGPD que admitem janela operacional). Worker dedicado vai
--      consumir 'queued' rows, apagar dados associados, marcar 'completed'.
--
-- Esta tabela é a "fila pública" — Meta consulta /data-deletion-status/<code>
-- pra confirmar processamento. Por isso o `confirmation_code` precisa ser
-- determinístico (primeiros 16 chars do sha256 do user_id Meta) — Meta envia
-- o mesmo code no payload caso re-consulte o status.
-- ═════════════════════════════════════════════════════════════════════════════

create table public.meta_data_deletion_requests (
  id                uuid primary key default gen_random_uuid(),

  -- ID numérico Meta do user que solicitou deleção. Vem do `signed_request`
  -- decodificado pelo callback. Não é FK pra profiles porque o user pode
  -- nunca ter completado signup no Source Authority — Meta exige aceitar
  -- a request mesmo assim.
  user_id           text not null,

  -- Code determinístico = sha256(user_id).slice(0, 16). Idempotente: Meta
  -- pode reenviar a mesma request e o mesmo code resolve. Usado também
  -- como path param em /data-deletion-status/<code>.
  confirmation_code text not null,

  -- Status da request:
  --   queued     → enfileirada, ainda não processada
  --   processing → worker pegou e está processando
  --   completed  → tudo deletado, log preservado pra audit
  status            text not null default 'queued',

  requested_at      timestamptz not null default now(),
  completed_at      timestamptz,

  -- Diagnóstico — opcional, preenchido pelo worker quando processa.
  notes             text,

  constraint meta_deletion_status_values check (
    status in ('queued','processing','completed')
  ),

  -- Evita inserir 2 rows pro mesmo user (idempotência). Se Meta reenviar,
  -- ON CONFLICT DO NOTHING + retornar code existente.
  constraint meta_deletion_user_unique unique (user_id)
);

comment on table public.meta_data_deletion_requests is
  'Fila pública de requests de deleção de dados Meta (LGPD/App Review). '
  'Worker dedicado processa rows queued. confirmation_code é determinístico '
  '(sha256(user_id) primeiros 16 chars) — Meta consulta status via esse code.';

-- Índice por status pra worker pegar rows queued rapidinho.
create index meta_deletion_status_idx
  on public.meta_data_deletion_requests(status, requested_at)
  where status in ('queued','processing');

-- Lookup público por confirmation_code (página /data-deletion-status/<code>).
create index meta_deletion_code_idx
  on public.meta_data_deletion_requests(confirmation_code);


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
--
-- Esta tabela NÃO é tenant-scoped (não tem company_id) — Meta callbacks são
-- públicos por especificação. Inserts vêm de route handler com service-role
-- (bypassa RLS). SELECT pela página de status público também usa service-role
-- via server component. Logo, sem policies pra authenticated/anon — tudo
-- bloqueado por default.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.meta_data_deletion_requests enable row level security;

-- Sem policies = sem acesso direto via PostgREST. Toda escrita/leitura
-- passa por route handlers server-side com service role.
