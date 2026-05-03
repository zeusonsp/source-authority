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
