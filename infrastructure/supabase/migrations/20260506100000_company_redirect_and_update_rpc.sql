-- 0005 — companies.default_redirect_url + seed Zeus + RPC update_company
--
-- Generaliza o Worker tracker pra multi-cliente: em vez de hardcode
-- `https://zeusoficial.com` no código do worker, cada empresa configura
-- seu destino no campo `companies.default_redirect_url` e o worker faz
-- lookup junto do slug.
--
-- Esta migration tem 3 partes coesas (mesma intenção: introduzir o conceito
-- de default_redirect_url no schema E na API):
--   1. Adiciona coluna `default_redirect_url` em `companies` com CHECK
--      forçando HTTPS only.
--   2. Faz seed do dogfood Zeus (primeiro cliente, URL conhecida).
--   3. Cria RPC `update_company` (SECURITY DEFINER) com validação
--      server-side de permissão (admin/owner) + audit log automático.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Coluna default_redirect_url
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.companies
  add column default_redirect_url text,
  add constraint companies_default_redirect_url_format check (
    default_redirect_url is null
    or (
      default_redirect_url ~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/.*)?$'
      and length(default_redirect_url) <= 500
    )
  );

comment on column public.companies.default_redirect_url is
  'URL de destino do link mestre. Worker lê esse campo no lookup do slug. NULL = empresa sem destino configurado, Worker retorna 404 amigável. CHECK força HTTPS only (defesa em profundidade contra http leak de referrer).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed dogfood Fase 3 — Zeus é primeiro cliente, URL conhecida no momento
--    desta migration. Idempotente: matched-by-slug, mesmo valor toda vez.
-- ─────────────────────────────────────────────────────────────────────────────

update public.companies
   set default_redirect_url = 'https://zeusoficial.com',
       updated_at           = now()
 where slug = 'zeus';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC update_company
--
-- Atualiza dados da empresa. Validação de permissão (admin/owner) feita
-- server-side via is_company_admin — não confia em RLS do client. Audit
-- log automático em `company.updated`.
--
-- Validações em ordem (early-fail):
--   1. auth.uid() not null   → raise 'unauthenticated' / 42501
--   2. is_company_admin      → raise 'forbidden'       / 42501
--   3. _name length >= 2     → raise '...'             / 23514
--   4. _default_redirect_url HTTPS regex (se não-null) → raise '...' / 23514
--   5. UPDATE + audit log
--
-- O CHECK na coluna funciona como rede de segurança caso essa validação
-- aqui falhe por algum bug futuro — defesa em profundidade.
-- Slug não é alterável aqui (semântica "permanente após criação"); pra
-- mudar slug exige fluxo dedicado no futuro (redirect 301 do antigo, etc).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.update_company(
  _company_id            uuid,
  _name                  text,
  _segment               text,
  _size                  text,
  _default_redirect_url  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'unauthenticated'
      using errcode = '42501';
  end if;

  if not public.is_company_admin(_company_id) then
    raise exception 'forbidden: only owner/admin can update company'
      using errcode = '42501';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'name precisa ter pelo menos 2 caracteres'
      using errcode = '23514';
  end if;

  if _default_redirect_url is not null and (
    _default_redirect_url !~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/.*)?$'
    or length(_default_redirect_url) > 500
  ) then
    raise exception 'default_redirect_url deve começar com https:// e ter no máximo 500 caracteres'
      using errcode = '23514';
  end if;

  update public.companies
     set name                 = _name,
         segment              = _segment,
         size                 = _size,
         default_redirect_url = _default_redirect_url,
         updated_at           = now()
   where id = _company_id;

  perform public.log_audit_event(
    _company_id,
    'company.updated',
    jsonb_build_object(
      'changed_by', _user_id,
      'name',       _name,
      'segment',    _segment,
      'size',       _size,
      'redirect',   _default_redirect_url
    )
  );
end;
$$;

comment on function public.update_company(uuid, text, text, text, text) is
  'Atualiza dados da empresa. Validação de permissão (admin/owner) feita server-side via is_company_admin — não confia em RLS do client. Audit log automático em company.updated.';

revoke all     on function public.update_company(uuid, text, text, text, text) from public, anon, authenticated, service_role;
grant execute  on function public.update_company(uuid, text, text, text, text) to authenticated;
