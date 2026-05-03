# Source Authority — Cérebro do Projeto

## Sobre o produto

Source Authority é uma plataforma SaaS B2B brasileira que oferece a empresas:

1. Um link mestre rastreável que substitui qualquer link na bio/comunicação
2. Detecção de uso indevido de conteúdo da marca
3. Atribuição de venda em redes de revenda/afiliados

Cliente-alvo: empresas premium brasileiras com 50k+ seguidores em IG/TikTok, faturamento R$ 1mi-100mi/ano, com rede de revenda ou conteúdo viral.

Pricing: R$ 97-1.497/mês (4 planos) + add-ons.

## Stack obrigatória — NÃO MUDE sem aprovação explícita do Nathan

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Backend: Next.js API routes + Supabase (Postgres, Auth, Storage)
- Tracking edge: Cloudflare Workers + KV
- Analytics: Tinybird (free tier inicial)
- Pagamentos: Stripe (recorrente) + Pagar.me (PIX BR)
- Deploy: Vercel (front+api) + Cloudflare (edge tracking)
- Observability: Sentry + Vercel Analytics

## Subagentes especializados

Quando uma tarefa exigir conhecimento profundo, invoque o subagente certo usando o comando `/agents` ou criando-os via configuração.

### @architect

- **Especialidade**: arquitetura de sistemas, decisões técnicas, schema de DB.
- **Quando usar**: início de cada fase, decisões irreversíveis, dúvidas sobre stack.
- **Comportamento**: cético, prioriza simplicidade, documenta trade-offs.

### @frontend

- **Especialidade**: React, Next.js 14, Tailwind, shadcn/ui, animações sutis.
- **Quando usar**: criação/edição de telas, componentes, fluxo UX.
- **Comportamento**: mobile-first, acessibilidade A11Y, Manrope como fonte.

### @backend

- **Especialidade**: APIs Next.js, Supabase, OAuth (Meta, TikTok), webhooks.
- **Quando usar**: endpoints, integrações externas, lógica de negócio.
- **Comportamento**: TypeScript estrito, Zod para validação, error handling sempre.

### @reviewer

- **Especialidade**: code review, segurança, performance, testes.
- **Quando usar**: ANTES de qualquer deploy ou merge para main.
- **Comportamento**: questiona tudo, busca edge cases, valida segurança.

## Identidade visual

- Background: `#0A0A0A` (preto profundo)
- Foreground: `#FAFAFA`
- Accent: `#C9A94B` (dourado Zeus)
- Accent light: `#F5E9C4`
- Font: Manrope (Google Fonts), pesos 400/500/700/800
- Vibe: tech premium minimalista (Linear, Vercel, OpenAI)

## Regras de código IMUTÁVEIS

1. TypeScript estrito (`strict: true`) sempre. Nada de `any` sem justificativa.
2. Zod para validar TODA input externa (forms, APIs, webhooks).
3. Tratamento de erro explícito (`try/catch` + log estruturado).
4. Variáveis de ambiente NUNCA hardcoded — sempre `process.env`.
5. Comentários em português apenas para lógica de negócio brasileira. Código técnico em inglês (nomes de variáveis, funções).
6. Componentes React em `PascalCase`, hooks em `camelCase` com prefixo `use`.
7. Server Components por padrão. Client Components só quando necessário.
8. Nada de `localStorage`/`sessionStorage` para dados sensíveis.
9. Rate limiting em todas as APIs públicas.
10. LGPD: NUNCA logar dados pessoais (e-mail, telefone) sem hash/mask.

## Workflow obrigatório

Antes de cada tarefa significativa:

1. Ler `docs/ROADMAP.md` para entender em que fase estamos
2. Ler `docs/DECISIONS.md` para evitar refazer escolhas
3. Atualizar `docs/DECISIONS.md` ao tomar nova decisão técnica
4. Rodar testes ANTES de propor commit
5. NUNCA fazer commit direto em `main` — sempre PR via branch `feature/*`

## Anti-padrões PROIBIDOS

- Usar libs sem checar manutenção e estrelas no GitHub
- Implementar autenticação manual (use Supabase Auth)
- Implementar pagamento manual (use Stripe Checkout)
- Fazer deploy sem rodar testes
- Fazer mudança grande sem documentar em `DECISIONS.md`
- Adicionar dependências pesadas sem justificar
- Otimizar performance prematuramente

## Quando travar — pergunte ao Nathan

Sempre pergunte ao Nathan ANTES de:

- Mudar de stack ou de fornecedor (Supabase → Firebase, etc.)
- Adicionar custo recorrente novo (qualquer SaaS pago)
- Decidir entre 2+ caminhos arquiteturais
- Tomar decisão que afete preço ou modelo de negócio
- Lidar com dados pessoais de forma diferente do padrão

## Glossário do produto

- **Link mestre**: a URL única da empresa (ex: `oficial.sourceauthority.com.br/zeus`)
- **Slug**: identificador da empresa na URL (ex: `zeus`, `marca-x`)
- **Evento**: cada clique ou interação registrada
- **Detecção**: alerta de uso indevido de conteúdo
- **Tenant**: cada empresa cliente (multi-tenant architecture)
- **Subagente**: instância especializada do Claude Code (`@architect`, etc.)
