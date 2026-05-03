# Source Authority — Especificação do Produto (MVP)

## Visão

Plataforma SaaS B2B brasileira que entrega 3 valores principais para empresas premium com presença digital ativa:

1. **SABER** — quem clica, onde, quando, em qual canal
2. **ATRIBUIR** — qual revendedor/Reel/campanha trouxe a venda
3. **DETECTAR** — quando o conteúdo da marca é usado fora dos canais oficiais

## Personas (clientes-alvo)

### Persona 1: Founder de marca de luxo (tipo Zeus)

- Faturamento R$ 5-50mi/ano
- 100k-1mi seguidores no IG
- Conteúdo viral frequente
- Sofre com vendedores não-autorizados e impersonação
- Decisor único (founder/CEO)
- Disposto a pagar R$ 697-1.497/mês

### Persona 2: Marca com rede de revenda (cosmética/suplementos)

- 50-2000 revendedoras ativas
- Falta de visibilidade sobre distribuição
- Sistemas de cupom obsoletos
- Disposto a pagar R$ 297-697/mês + add-ons

### Persona 3: Criador monetizado

- 100k-1mi seguidores
- Vende curso/produto próprio
- Atribuição quebrada (UTM não funciona em WhatsApp)
- Disposto a pagar R$ 97-297/mês

## Funcionalidades MVP (Fase 1 — primeiros 6 semanas)

### 1. Onboarding (4 passos)

**Passo 1: dados da empresa**

- Nome, CNPJ, segmento (dropdown), tamanho

**Passo 2: conectar Instagram**

- OAuth oficial via Meta Graph API
- Captura: username, ID, foto, métricas básicas

**Passo 3: conectar TikTok + WhatsApp Business**

- OAuth TikTok Business API
- Cadastro WhatsApp Business (número validado por SMS)

**Passo 4: escolher slug do link mestre**

- Validação em tempo real (disponibilidade)
- Preview ao vivo: `oficial.sourceauthority.com.br/[slug]`
- Confirmação visual ao concluir

### 2. Link mestre rastreável

URL pública: `oficial.sourceauthority.com.br/[slug]`

**Comportamento:**

- Roteamento via Cloudflare Workers (latência <50ms)
- Captura de dados na passagem:
  - Origem (User-Agent + Referer parsing → IG/TikTok/WhatsApp/etc)
  - Geolocalização via IP (cidade/estado/país)
  - Device fingerprint anônimo (hash SHA-256 de UA+lang+screen, sem PII)
  - Timestamp UTC com timezone do cliente
- Redirect inteligente:
  - Regras configuráveis: "se origem = IG, redirecione para X"
  - Default: URL principal cadastrada pela empresa
- Logging assíncrono: evento vai para fila, não bloqueia redirect

### 3. Dashboard principal

**KPIs no topo (cards):**

- Cliques hoje
- Cliques 30d
- Alertas ativos
- Reposts detectados (7d)

**Gráficos:**

- Linha: cliques por hora últimas 24h
- Mapa: cliques por estado (Brasil)
- Pizza: distribuição por origem (IG/TikTok/WhatsApp/etc)

**Tabela:**

- Últimos 50 cliques (paginação)
- Colunas: timestamp, origem, cidade, dispositivo, geo

**Filtros:**

- Período (24h / 7d / 30d / 90d / custom)
- Origem (multi-select)
- Estado/cidade

### 4. Página /alertas

Lista de detecções de uso indevido. Cada alerta exibe:

- Tipo (impersonação / repost / volume anormal / domínio similar)
- Severidade (alta/média/baixa)
- Descrição em linguagem natural
- Screenshot/preview da detecção
- 3 ações 1-clique:
  - `[Aprovar e creditar]`
  - `[Notificar autor]`
  - `[Acionar takedown]`

**Fontes de detecção MVP (apenas fontes viáveis):**

1. Google Alerts (menções textuais)
2. Domain monitoring (DNStwist — novos domínios similares)
3. Cliques anômalos no link mestre (volume/padrão fora do normal)
4. Submissão manual (cliente reporta)

**NÃO INCLUIR no MVP:**

- Detecção automática de vídeo via fingerprinting (V1.5+)
- Scraping em massa de IG/TikTok público (V1.5+, requer infra)
- DMCA takedown automático (V2.0+, requer parceria jurídica)

### 5. Página /link (configuração)

- URL atual destacada com botão copiar
- QR code do link (gerado server-side)
- Configurações de redirect:
  - Default URL
  - Regras condicionais (se origem = X, redirecione para Y)
- Histórico de mudanças no link (audit log)

### 6. Página /relatorios

- Lista de relatórios mensais auto-gerados
- Cada relatório em PDF: cliques + alertas + comparação MoM
- Botão "Gerar relatório agora" (manual)

### 7. Página /configuracoes

3 abas:

- **Perfil**: dados da empresa, canais conectados (com status), trocar slug
- **Plano**: plano atual, uso (cliques este mês / franquia), upgrade/downgrade
- **Equipe**: convidar membros, permissões (admin/member/viewer)

## Modelo de cobrança

4 planos públicos (Starter, Growth, Pro, Business) + 1 tier Enterprise sob consulta para casos especiais (5mi+ cliques/mês, multi-empresa, SSO).

Cobrança híbrida (base + variável):

| Plano      | R$/mês       | Cliques inclusos | Acima da franquia |
| ---------- | ------------ | ---------------- | ----------------- |
| Starter    | R$ 97        | 10k/mês          | R$ 0,008/clique   |
| Growth     | R$ 297       | 50k/mês          | R$ 0,005/clique   |
| Pro        | R$ 697       | 200k/mês         | R$ 0,003/clique   |
| Business   | R$ 1.497     | 1mi/mês          | R$ 0,002/clique   |
| Enterprise | sob consulta | 5mi+/mês         | negociado         |

Cobrança mensal recorrente via Stripe.
Trial gratuito de 14 dias para Starter e Growth.

> **Nota sobre Enterprise**: contratos são negociados caso a caso. Escopo, preço, SLA e features adicionais (SSO, multi-empresa, suporte dedicado) são definidos em contrato individual.

## Métricas de sucesso do MVP

- 30+ empresas em beta privado pago após 90 dias
- Latência P95 do link mestre < 100ms global
- Uptime > 99,9%
- NPS > 50
