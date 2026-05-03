# Source Authority

Plataforma SaaS B2B brasileira de proteção de marca e atribuição de tracking para empresas premium com presença digital ativa.

**Status:** Bootstrap (pré-Fase 1 do roadmap)

## O que é

Source Authority oferece a empresas três valores principais:

1. **SABER** — quem clica nos seus links, onde, quando, em qual canal
2. **ATRIBUIR** — qual revendedor, Reel ou campanha trouxe a venda
3. **DETECTAR** — quando o conteúdo da marca é usado fora dos canais oficiais

Cliente-alvo: empresas premium brasileiras com 50k+ seguidores em IG/TikTok e faturamento R$ 1mi-100mi/ano.

## Documentação

A documentação fundacional do projeto está organizada assim:

| Arquivo | O que contém |
| ------- | ------------ |
| [`CLAUDE.md`](./CLAUDE.md) | Cérebro do projeto: stack, regras imutáveis, subagentes, identidade visual |
| [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md) | Especificação detalhada do MVP (personas, features, pricing) |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | 8 fases do desenvolvimento, com checkboxes e validações |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Log de decisões técnicas (formato ADR-lite) |

## Stack

Next.js 14 · TypeScript · Tailwind · shadcn/ui · Supabase · Cloudflare Workers · Stripe · Pagar.me · Vercel · Sentry

Justificativas e trade-offs em [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Workflow

Desenvolvimento conduzido com Claude Code operando como 4 subagentes especializados (`@architect`, `@frontend`, `@backend`, `@reviewer`). Detalhes em [`CLAUDE.md`](./CLAUDE.md).

## Para desenvolvedores

Setup e instruções de execução serão adicionados quando a Fase 1 (Foundation) iniciar.

---

© 2026 Zeus Tecnologia · Confidencial
