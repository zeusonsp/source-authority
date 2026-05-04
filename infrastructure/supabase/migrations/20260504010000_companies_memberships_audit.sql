-- 0002 — companies, memberships, audit_log
--
-- Fundação multi-tenant da Fase 2 (Onboarding & Empresa).
--
-- Modelo:
--   companies    → 1 tenant (empresa cliente)
--   memberships  → N:N profiles ↔ companies, com role (4 níveis)
--   audit_log    → trilha imutável (append-only) de eventos por empresa
--
-- Isolamento por tenant via RLS + helpers SECURITY DEFINER.
-- Slug check no onboarding via RPC pública (escapa do RLS sem vazar dados).
-- Reserved slugs (api, app, oficial, login, admin, www, dashboard, etc.)
-- ficam validados em app-layer (Zod) — mais fácil evoluir do que CHECK no DB.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. companies
-- ═════════════════════════════════════════════════════════════════════════════

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  cnpj        text unique,
  segment     text,
  size        text,
  plan        text not null default 'starter',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Slug: lowercase, alfanumérico, hífens internos opcionais (não duplos,
  -- não no início/fim). Comprimento 2-32 (empresas de 2 letras como "ai"
  -- são caso real; 32 dá margem sem custo).
  constraint companies_slug_format check (
    slug ~ '^[a-z0-9](-?[a-z0-9])+$'
    and length(slug) between 2 and 32
  ),

  -- CNPJ: opcional, mas quando preenchido tem que ser 14 dígitos.
  -- Validação de DV (dígito verificador) fica em app-layer (Zod).
  constraint companies_cnpj_format check (
    cnpj is null or cnpj ~ '^\d{14}$'
  ),

  -- Plano: enumerado em texto pra evitar dor de ALTER TYPE quando virar
  -- Enterprise ou planos custom.
  constraint companies_plan_values check (
    plan in ('starter','growth','pro','business','enterprise')
  )
);

comment on table public.companies is
  'Tenants (empresas clientes). 1 linha = 1 empresa. Slug é o id público em oficial.sourceauthority.com.br/[slug]. created_by vira NULL se a conta do criador for apagada — atribuição histórica preservada via audit_log.';

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. memberships
-- ═════════════════════════════════════════════════════════════════════════════

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id)  on delete cascade,
  role        text not null,
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 4 níveis de role:
  --   owner  → controle total, único que pode transferir/excluir empresa
  --   admin  → tudo menos transferir/excluir empresa
  --   member → uso operacional (ver dashboard, configurar link)
  --   viewer → leitura apenas
  constraint memberships_role_values check (
    role in ('owner','admin','member','viewer')
  ),

  -- Mesmo user só pode ter 1 membership por empresa.
  constraint memberships_unique_per_company unique (company_id, user_id)
);

comment on table public.memberships is
  'N:N profiles ↔ companies. role: owner > admin > member > viewer. "Quem é dono" = membership com role=owner (sem coluna owner_id em companies pra evitar divergência de estado). Regra "≥1 owner por empresa" é enforçada em app-layer.';

create index memberships_user_id_idx    on public.memberships(user_id);
create index memberships_company_id_idx on public.memberships(company_id);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. audit_log
-- ═════════════════════════════════════════════════════════════════════════════

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only. Convenção: action = "<entidade>.<verbo>" (ex: company.slug_changed, member.invited, member.role_changed). Escrita exclusiva via RPC public.log_audit_event.';

-- Índice para a query de "atividade recente da empresa" (Configurações).
create index audit_log_company_created_idx
  on public.audit_log(company_id, created_at desc);


-- ═════════════════════════════════════════════════════════════════════════════
-- Helpers de RLS
--
-- SECURITY DEFINER para conseguirem ler memberships independentemente das
-- policies do caller. STABLE porque dependem só de auth.uid() e do snapshot
-- da transação. search_path = public para evitar function-search-path attack.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.is_company_member(_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where company_id = _company_id
      and user_id = auth.uid()
  );
$$;

comment on function public.is_company_member(uuid) is
  'Helper RLS — true se auth.uid() é membro (qualquer role) da empresa.';
revoke all     on function public.is_company_member(uuid) from public;
grant execute  on function public.is_company_member(uuid) to authenticated;

create or replace function public.is_company_admin(_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where company_id = _company_id
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

comment on function public.is_company_admin(uuid) is
  'Helper RLS — true se auth.uid() é owner ou admin da empresa.';
revoke all     on function public.is_company_admin(uuid) from public;
grant execute  on function public.is_company_admin(uuid) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — companies
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.companies enable row level security;

-- SELECT: só membros enxergam a empresa.
create policy "companies_select_members"
  on public.companies for select
  to authenticated
  using (public.is_company_member(id));

-- INSERT: privilégio table-level revogado de authenticated/anon. Único
-- caminho de criação = RPC public.create_company (SECURITY DEFINER atômica
-- que cria companies + memberships(owner) + audit_log numa transação,
-- contornando a galinha-e-ovo de RLS no bootstrap).
revoke insert on public.companies from authenticated, anon;

-- UPDATE: só owner/admin.
create policy "companies_update_admins"
  on public.companies for update
  to authenticated
  using       (public.is_company_admin(id))
  with check  (public.is_company_admin(id));

-- DELETE: nenhuma policy = nenhuma permissão. Exclusão de empresa exige
-- fluxo dedicado (export de dados, confirmação) fora do escopo do MVP.


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — memberships
-- ═════════════════════════════════════════════════════════════════════════════

-- ATENÇÃO: NÃO aplicar `alter table memberships force row level security`.
-- As policies abaixo invocam helpers SECURITY DEFINER (is_company_admin)
-- que consultam a própria memberships. O bypass de RLS depende do owner
-- da function ter atributo BYPASSRLS (default do role postgres no Supabase).
-- FORCE quebra essa premissa e induz recursão (erro 42P17) em qualquer
-- SELECT que dispare a policy.
alter table public.memberships enable row level security;

-- SELECT: o próprio user vê suas memberships; admin vê toda a equipe da
-- empresa.
create policy "memberships_select_self_or_admin"
  on public.memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_admin(company_id)
  );

-- INSERT: só admin/owner adicionando alguém à empresa. O bootstrap do
-- primeiro owner acontece via RPC create_company (SECURITY DEFINER, bypass
-- RLS — não passa por esta policy). Convite via link de email exigirá uma
-- RPC accept_invitation futura (Fase 2.5/3, ainda não implementada).
create policy "memberships_insert_admin"
  on public.memberships for insert
  to authenticated
  with check (public.is_company_admin(company_id));

-- UPDATE: só admin/owner (mudança de role, etc.).
create policy "memberships_update_admin"
  on public.memberships for update
  to authenticated
  using       (public.is_company_admin(company_id))
  with check  (public.is_company_admin(company_id));

-- DELETE: admin remove qualquer um; o próprio user pode sair sozinho.
create policy "memberships_delete_admin_or_self"
  on public.memberships for delete
  to authenticated
  using (
    public.is_company_admin(company_id)
    or user_id = auth.uid()
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- RLS — audit_log (append-only via RPC)
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.audit_log enable row level security;

-- SELECT: só admin/owner. Audit é informação sensível; member/viewer não vê.
create policy "audit_log_select_admins"
  on public.audit_log for select
  to authenticated
  using (public.is_company_admin(company_id));

-- INSERT/UPDATE/DELETE: nenhuma policy = nenhum acesso direto via PostgREST.
-- Único caminho de escrita = function public.log_audit_event (abaixo).


-- ═════════════════════════════════════════════════════════════════════════════
-- RPC: is_slug_available
--
-- Onboarding (passo 4) chama esta RPC pra validar disponibilidade do slug
-- em tempo real. Sem ela, RLS bloquearia SELECT direto em companies.
-- SECURITY DEFINER + retorno boolean (não vaza qual empresa "tomou" o slug).
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.is_slug_available(_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.companies where slug = lower(_slug)
  );
$$;

comment on function public.is_slug_available(text) is
  'Onboarding — true se o slug está livre. Não vaza qual empresa o ocupa. Rate limit obrigatório no API route que chama esta função.';

revoke all     on function public.is_slug_available(text) from public;
grant execute  on function public.is_slug_available(text) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- RPC: create_company
--
-- Onboarding bootstrap atômico. Resolve a galinha-e-ovo de RLS — sem isto,
-- INSERT em memberships exigiria membership prévia (policy depende de
-- is_company_admin). SECURITY DEFINER bypassa RLS pra fazer os 3 INSERTs
-- (companies + memberships(owner) + audit_log) numa transação.
--
-- App-side flow:
--   1. UI chama is_slug_available(_slug) pra UX em tempo real
--   2. UI chama create_company(...) que re-valida e cria atomicamente
--   3. Race no slug entre (1) e (2) → erro 23505 com mensagem genérica
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.create_company(
  _name    text,
  _slug    text,
  _segment text default null,
  _size    text default null,
  _cnpj    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id    uuid;
  _norm_slug  text;
  _company_id uuid;
begin
  -- Auth gate. SECURITY DEFINER não muda auth.uid() — vem do JWT do caller.
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'unauthenticated'
      using errcode = '42501';
  end if;

  -- Normalização server-side (defesa em profundidade vs slug.ts no app).
  _norm_slug := lower(trim(_slug));

  -- Pre-check pra mensagem de erro amigável. Manter este RAISE FORA do
  -- EXCEPTION handler senão ele é capturado (mesmo errcode 23505) e a
  -- mensagem amigável se perde.
  if not public.is_slug_available(_norm_slug) then
    raise exception 'slug "%" já está em uso', _norm_slug
      using errcode = '23505';
  end if;

  -- Bootstrap atômico. Qualquer falha aqui faz rollback dos 3 INSERTs.
  begin
    -- plan herda default 'starter' da tabela. Mudança de plano é fluxo
    -- separado (Fase 7, via Stripe webhook → update companies set plan = ...).
    insert into public.companies (slug, name, cnpj, segment, size, created_by)
    values (_norm_slug, _name, _cnpj, _segment, _size, _user_id)
    returning id into _company_id;

    insert into public.memberships (company_id, user_id, role, invited_by)
    values (_company_id, _user_id, 'owner', _user_id);

    perform public.log_audit_event(
      _company_id,
      'company.created',
      jsonb_build_object('slug', _norm_slug, 'name', _name)
    );
  exception
    when unique_violation then
      -- Race no slug (entre pre-check e INSERT) ou CNPJ duplicado.
      raise exception 'conflito de unicidade ao criar empresa: %', sqlerrm
        using errcode = '23505';
  end;

  return _company_id;
end;
$$;

comment on function public.create_company(text, text, text, text, text) is
  'Onboarding — cria empresa + membership owner + audit_log atomicamente. SECURITY DEFINER pra contornar a galinha-e-ovo de RLS na criação inicial. App deve chamar is_slug_available antes pra UX, mas a RPC re-valida.';

revoke all     on function public.create_company(text, text, text, text, text) from public;
grant execute  on function public.create_company(text, text, text, text, text) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- RPC: log_audit_event
--
-- Único caminho de escrita em audit_log. Verifica que o caller é membro
-- da empresa antes de inserir. SECURITY DEFINER pra contornar a ausência
-- de policy de INSERT na tabela.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.log_audit_event(
  _company_id uuid,
  _action     text,
  _payload    jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'forbidden: not a member of company %', _company_id
      using errcode = '42501';
  end if;

  insert into public.audit_log (company_id, actor_id, action, payload)
  values (_company_id, auth.uid(), _action, _payload)
  returning id into _id;

  return _id;
end;
$$;

comment on function public.log_audit_event(uuid, text, jsonb) is
  'Único caminho de escrita em audit_log. Convenção de action: "<entidade>.<verbo>".';

revoke all     on function public.log_audit_event(uuid, text, jsonb) from public;
grant execute  on function public.log_audit_event(uuid, text, jsonb) to authenticated;
