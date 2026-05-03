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
