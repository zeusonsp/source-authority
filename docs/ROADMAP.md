# Source Authority — Roadmap de Desenvolvimento

## Filosofia: ship → measure → iterate

Cada fase entrega algo testável e em produção. Não é "vou construir tudo e depois testar". É "construo o mínimo viável da fase, deploy, testo, e só avanço quando funciona".

## FASE 1 — Foundation (Semanas 1-2)

**Subagente principal:** `@architect`

**Entregas:**

- [ ] Repositório monorepo configurado (Turborepo ou similar)
- [ ] Next.js 14 + TypeScript estrito + Tailwind + shadcn/ui
- [ ] Supabase projeto criado, conectado, schema inicial
- [ ] Auth via Supabase (email + OAuth Google)
- [ ] Layout base autenticado (sidebar + topbar)
- [ ] Deploy em Vercel funcionando
- [ ] Domínio `app.sourceauthority.com.br` configurado

**Validação:** você consegue criar conta, fazer login, ver dashboard vazio. Sem isso, NÃO avança para Fase 2.

## FASE 2 — Onboarding & Empresa (Semanas 2-3)

**Subagente principal:** `@frontend` + `@backend`

**Entregas:**

- [ ] Modelo de dados: empresas, users, memberships
- [ ] Onboarding 4 passos (sem OAuth IG/TikTok ainda)
- [ ] Validação de slug em tempo real
- [ ] Página de configurações (perfil + plano placeholder)
- [ ] Audit log de mudanças

**Validação:** você cria empresa "Zeus Tecnologia", escolhe slug "zeus", e vê tudo salvo no Supabase.

## FASE 3 — Link Mestre & Tracking Básico (Semanas 3-4)

**Subagente principal:** `@backend` + `@architect`

**Entregas:**

- [ ] Cloudflare Worker para resolver `oficial.sourceauthority.com.br/[slug]`
- [ ] Captura de evento (origem, geo, device fingerprint)
- [ ] Banco de eventos no Supabase (otimizado para escrita)
- [ ] Endpoint de redirect com latência < 100ms
- [ ] Página `/link` (configurar destino, copiar URL, QR code)

**Validação:** você acessa `oficial.sourceauthority.com.br/zeus` pelo celular, o evento aparece no Supabase em < 5 segundos.

## FASE 4 — Dashboard com Analytics (Semanas 4-5)

**Subagente principal:** `@frontend`

**Entregas:**

- [ ] KPIs cards (cliques hoje/30d, alertas, reposts)
- [ ] Gráfico de cliques por hora (Recharts)
- [ ] Mapa de cliques por estado
- [ ] Tabela de últimos cliques com filtros
- [ ] Refresh em tempo real (Supabase Realtime)

**Validação:** você gera 50 cliques em testes, todos aparecem no dashboard em < 30 segundos, com origem/geo corretos.

## FASE 5 — OAuth IG/TikTok (Semanas 5-6)

**Subagente principal:** `@backend`

**Entregas:**

- [ ] Integração Meta Graph API (login Instagram Business)
- [ ] Integração TikTok Business API
- [ ] WhatsApp Business cadastro (número + validação)
- [ ] Tokens criptografados no banco
- [ ] Renovação automática de tokens

**Validação:** você conecta a conta do Zeus no IG, vê seus dados (followers, posts) puxados via API.

## FASE 6 — Detecção de Uso Indevido v1 (Semanas 6-7)

**Subagente principal:** `@backend`

**Entregas:**

- [ ] Integração Google Alerts via RSS
- [ ] DNStwist worker (rodando 1x/dia, salvando domínios similares)
- [ ] Detector de cliques anômalos (volume/origem fora do padrão)
- [ ] Página `/alertas` com lista, filtros e ações 1-clique
- [ ] Notificações por e-mail (Resend)

**Validação:** o sistema detecta uma menção real ao "Zeus Tecnologia" via Google Alerts e envia e-mail para você.

## FASE 7 — Pagamentos (Semanas 7-8)

**Subagente principal:** `@backend`

**Entregas:**

- [ ] Stripe Checkout para 4 planos
- [ ] Webhooks de Stripe (pagamento, cancelamento, falha)
- [ ] Pagar.me como alternativa BR (PIX recorrente)
- [ ] Página de upgrade/downgrade no app
- [ ] Trial gratuito 14 dias funcionando

**Validação:** você assina o plano Pro com cartão real, recebe e-mail de confirmação, e vê o plano ativo no app.

## FASE 8 — Polish & Beta Launch (Semanas 8-10)

**Subagente principal:** `@reviewer` (auditoria final)

**Entregas:**

- [ ] Testes E2E críticos (Playwright)
- [ ] Sentry configurado
- [ ] Analytics de uso (PostHog ou similar)
- [ ] Termos de uso + política de privacidade (LGPD)
- [ ] Onboarding tutorial in-app
- [ ] Documentação de API básica
- [ ] Preparar lista de 30 empresas para beta privado

**Validação:** 5 empresas-piloto fazem onboarding completo sem ajuda humana, NPS > 50 nas primeiras 2 semanas.

## Saídas após o MVP

- **V1.5 (Semanas 11-18):** detecção de vídeo via fingerprinting + scraping legal.
- **V2.0 (Semanas 19-26):** DMCA takedown gerenciado + WhatsApp API monitoring.
