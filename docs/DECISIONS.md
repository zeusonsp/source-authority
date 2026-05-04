# Source Authority — Log de Decisões Técnicas

Este arquivo registra decisões técnicas tomadas durante o desenvolvimento.
Formato: ADR-lite (Architecture Decision Record).

## Como usar

A cada decisão técnica não-trivial, adicione uma entrada nova ao topo seguindo o template abaixo. Nunca apague entradas — marque como `superseded` se uma decisão for revisitada.

## Template

```markdown
### YYYY-MM-DD · Título curto da decisão
- **Contexto:** o problema/situação que motivou a decisão
- **Opções consideradas:** A, B, C
- **Decisão:** qual escolhemos
- **Justificativa:** por quê (trade-offs aceitos)
- **Status:** active | superseded by ...
- **Decidido por:** Nathan + @architect
```

---

## Decisões

### 2026-05-03 · Estratégia dogfood-first com Zeus Tecnologia (Caminho 5)

- **Contexto:** Após concluir a Fase 1 (auth + base), Nathan considerou três alternativas para o próximo chunk: (a) Caminho 1 — sidebar + 5 placeholders e seguir o ROADMAP linearmente; (b) Caminho 2 — `/dashboard` rico com mock data, demais páginas placeholder; (c) Caminho 4 — Chunk B+ original com 5 páginas mockadas. A análise do `@architect` apontou que (b) e (c) violam a filosofia "ship → measure → iterate" do ROADMAP, geram retrabalho de 30-70% quando dados reais chegarem nas Fases 3-4, e caem no anti-padrão "demo trap" alertado no briefing seção 08. Founder identificou um caminho não listado: usar o Zeus Tecnologia (@zeustecnologiaonlife, 712k seguidores no IG, tráfego real diário) como primeiro cliente real para validação técnica em produção.
- **Opções consideradas:**
  - A) Caminho 1 — Disciplina pura ROADMAP-aligned (sidebar + placeholders → Fase 2 onboarding)
  - B) Caminho 2 — Dashboard mock + sidebar/topbar + outras páginas placeholder (compromisso entre dogma e demo)
  - C) Caminho 3 — Pausa de 1-2 dias pra Figma de 5 telas, depois volta pro código
  - D) Caminho 4 — Chunk B+ completo com 5 páginas mockadas (request original do founder)
  - E) **Caminho 5 — Dogfood-first com Zeus Tecnologia: Fase 2 → Fase 3 → Fase 4 sem mock data, usando Zeus como primeiro cliente real**
- **Decisão:** Opção E (Caminho 5)
- **Justificativa:** Mock data carrega três custos invisíveis: (1) lock-in de schema/component API antes de saber a query real, (2) ausência de empty/error/timezone states que produção exige, (3) feedback enganoso de demos com dados ficcionais. Dogfood com Zeus elimina os três — schema é validado contra evento real do Cloudflare Worker, componentes são desenhados contra dados reais de clique do IG do Zeus, e qualquer feedback que vier vem de comportamento real (do próprio founder operando no próprio negócio). Adicionalmente: case study "funciona com 712k seguidores em produção" é mais forte do que demo bonito; trade-off "vou ver produto" é resolvido por satisfação real (Zeus criando conta, slug funcionando, eventos chegando) ao invés de mock; e qualquer cliente futuro pode ser onboarded com a mesma infraestrutura usada pra Zeus.
- **Implicações operacionais (não-óbvias):** (1) Dogfood = produção desde Fase 3 — Sentry adiantado (era Fase 8 no ROADMAP, vira Fase 3); (2) bio do @zeustecnologiaonlife troca pra `oficial.sourceauthority.com.br/zeus` — plano de rollback obrigatório; (3) privacy policy do Zeus precisa ser atualizada antes da troca (LGPD: tracking de IP hash); (4) Cloudflare Workers free tier (100k req/dia) pode estourar em viral — upgrade pro plan ($5/mês) já planejado; (5) Supabase connection pooler ativado na Fase 3, não Fase 6.
- **Ordem de execução acordada:** Fase 2 (Onboarding minimal) → Fase 3 (Worker + tracking) → Fase 4 (Dashboard real). Sem pular fases. Sem mock data em qualquer ponto.
- **Status:** active
- **Decidido por:** Nathan + @architect (sessão de 2026-05-03, 1h da manhã do segundo dia, decisão tomada com clareza após @architect apresentar análise de risco dos 4 caminhos alternativos)

### 2026-05-03 · Google OAuth adiado para Fase 2 ou 3

- **Contexto:** A Fase 1 do roadmap originalmente previa "Auth via Supabase (email + OAuth Google)". Configurar Google OAuth requer Google Cloud project, OAuth client, consent screen e configuração no Supabase Dashboard. Founder priorizou velocidade de execução.
- **Opções consideradas:**
  - A) Email/senha + Google OAuth na Fase 1 (escopo original)
  - B) Apenas email/senha na Fase 1; Google OAuth diferido
- **Decisão:** Opção B
- **Justificativa:** Email/senha do Supabase Auth é built-in, sem setup externo. Google OAuth não é requisito crítico do MVP — é conveniência. Mover para Fase 2 ou 3 economiza ~1h de setup externo agora e não bloqueia a validação ("criar conta, fazer login, ver dashboard vazio").
- **Status:** active
- **Decidido por:** Nathan + @architect

### 2026-05-03 · Sidebar com 5 itens placeholder na Fase 1

- **Contexto:** A Fase 1 só entrega Dashboard funcional, mas o produto final terá sidebar com Dashboard, /link, /alertas, /relatorios, /configuracoes. Renderizar sidebar completa desde o início ou só Dashboard?
- **Opções consideradas:**
  - A) Sidebar com 5 itens; páginas /link, /alertas, /relatorios, /configuracoes em "Em breve"
  - B) Só Dashboard; sidebar cresce conforme as fases entregam
- **Decisão:** Opção A
- **Justificativa:** Custo zero adicional (placeholder pages são triviais). Modelo mental do produto inteiro disponível desde o dia 1, útil para demos com clientes potenciais durante o ciclo de validação. Reduz refatoração da sidebar nas Fases 4-7.
- **Status:** active
- **Decidido por:** Nathan + @architect

### 2026-05-03 · `apps/web` único com route groups

- **Contexto:** A plataforma terá site público (landing) e dashboard autenticado. Manter no mesmo Next.js app ou separar em `apps/landing` + `apps/web`?
- **Opções consideradas:**
  - A) `apps/web` único com route groups Next.js (`(marketing)`, `(auth)`, `(app)`)
  - B) `apps/landing` + `apps/web` separados, com deploys independentes
- **Decisão:** Opção A
- **Justificativa:** Compartilhar design system e infra acelera o MVP. Trade-off aceito: a landing rebuilda quando o dashboard muda. Opção B só faz sentido se a landing virar gargalo real (improvável no MVP). Migrar para B é factível mais tarde se necessário.
- **Status:** active
- **Decidido por:** Nathan + @architect

### 2026-05-03 · Monorepo: Turborepo + pnpm workspaces

- **Contexto:** O projeto terá múltiplos pacotes (`apps/web`, futuramente `infrastructure/cloudflare` worker e `packages/shared` para tipos compartilhados). Como organizar workspace e build?
- **Opções consideradas:**
  - A) Next.js standalone (sem monorepo)
  - B) pnpm workspaces sozinho
  - C) Turborepo + pnpm workspaces
- **Decisão:** Opção C
- **Justificativa:** O Cloudflare Worker (Fase 3) precisará compartilhar tipos de evento com o app web via `packages/shared`. Turborepo dá cache de tasks (`build`/`lint`/`test`/`typecheck`) entre pacotes — paga o overhead (~30 min de setup) nas Fases 3-4 quando o ciclo de build começa a doer. pnpm workspaces sozinho funcionaria mas perde caching. Standalone foi descartado por gerar refactor obrigatório na Fase 3.
- **Status:** active
- **Decidido por:** Nathan + @architect

### 2026-05-03 · Stack inicial do MVP

- **Contexto:** Projeto Source Authority em fase de bootstrap. Necessidade de stack moderna, brasileira-friendly, com time-to-market rápido e custo previsível. Founder não-técnico (Nathan) usando Claude Code como par, com possibilidade de contratar dev sênior depois.
- **Opções consideradas:**
  - A) Next.js 14 + Supabase + Cloudflare Workers + Vercel
  - B) Firebase + Cloud Functions (Google ecosystem)
  - C) AWS (Amplify ou SST) + DynamoDB
- **Decisão:** Opção A
- **Justificativa:** Next.js + Supabase tem o melhor equilíbrio entre velocidade de desenvolvimento, custo previsível, ecossistema robusto e curva de aprendizado para founder não-técnico. Firebase descartado por menor flexibilidade SQL e custos imprevisíveis em escala. AWS descartado por complexidade prematura para MVP. Cloudflare Workers para edge tracking porque latência <50ms global é requisito do produto.
- **Status:** active
- **Decidido por:** Nathan + @architect (sessão de bootstrap)
