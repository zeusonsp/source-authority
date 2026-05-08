-- 0015 — Innovation #1: AI Semantic Plágio Detection.
--
-- Quando dHash retorna distância inconclusiva (10-30 = "possível repost"),
-- usuário clica "🧠 Analisar com IA". Servidor envia thumbnail original +
-- thumbnail suspeito + captions (se disponível) pro Claude Vision API.
-- Claude retorna verdict + reasoning detalhado.
--
-- Detecta casos que dHash sozinho não pega:
--   - Reupload com filtro/edição agressiva (mesmo storyboard, edit diferente)
--   - "Inspiração" — mesmo conceito, gravação totalmente nova
--   - Mirror horizontal + recorte (dHash falha, AI vê semântica)
--   - Recriação com layout/cores diferentes mas tema idêntico
--
-- Custo: ~$0.005-0.02 por análise (Claude Sonnet vision input). Absorvido
-- pelo Source Authority — repassado em margem dos planos.
-- ═════════════════════════════════════════════════════════════════════════════


create table public.ai_analyses (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,

  -- Contexto da análise
  content_id      uuid references public.contents(id) on delete set null,
  suspect_url     text not null,
  suspect_thumbnail_url text,

  -- Modelo usado (pra audit + custo). Ex: 'claude-sonnet-4-5', 'claude-opus-4'.
  model           text not null,

  -- Veredito principal: 'plagio_direto' | 'inspiracao_clara' | 'similar_inconclusivo' | 'diferente'.
  verdict         text not null,

  -- Confidence 0.00-1.00 reportado pelo modelo (heurística — modelo não dá
  -- score nativo, derivamos do reasoning).
  confidence      numeric(3, 2),

  -- Justificativa textual gerada pelo modelo.
  reasoning       text,

  -- Custo agregado da chamada em centavos USD * 100 (precisão de centavo).
  -- Ex: $0.0124 = 124 (centavos × 100). Pra reporting de margem.
  cost_micro_usd  integer,

  -- Tokens (audit + debug).
  input_tokens    integer,
  output_tokens   integer,

  analyzed_at     timestamptz not null default now(),
  analyzed_by     uuid references public.profiles(id) on delete set null,

  constraint ai_analyses_verdict_values check (
    verdict in (
      'plagio_direto', 'inspiracao_clara', 'similar_inconclusivo', 'diferente'
    )
  ),
  constraint ai_analyses_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.ai_analyses is
  'Análises Claude Vision API solicitadas via /meu-conteudo "Analisar com IA". '
  'Disparadas quando dHash distance é inconclusiva. Cobre plágio narrativo + '
  'reupload com edits agressivos.';

create index ai_analyses_company_idx
  on public.ai_analyses(company_id, analyzed_at desc);

create index ai_analyses_content_idx
  on public.ai_analyses(content_id, analyzed_at desc)
  where content_id is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: members veem; só admins/owners disparam (custo).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.ai_analyses enable row level security;

create policy "ai_analyses_select_members"
  on public.ai_analyses for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "ai_analyses_insert_admins"
  on public.ai_analyses for insert
  to authenticated
  with check (public.is_company_admin(company_id));
