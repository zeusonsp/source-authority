import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da plataforma Source Authority — como coletamos, usamos e protegemos dados pessoais conforme LGPD.",
};

const LAST_UPDATED = "07 de maio de 2026";

export default function PrivacidadePage() {
  return (
    <article className="space-y-8 text-foreground">
      <header className="border-b border-border pb-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Esta Política de Privacidade descreve como{" "}
          <strong className="text-foreground">Zeus Tecnologia</strong> trata
          dados pessoais coletados via plataforma{" "}
          <strong className="text-foreground">Source Authority</strong>, em
          conformidade com a{" "}
          <strong className="text-foreground">
            Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
          </strong>
          . Para detalhes específicos sobre direitos do titular, consulte{" "}
          <a className="text-accent hover:underline" href="/lgpd">
            /lgpd
          </a>
          .
        </p>
      </section>

      <Section title="1. Quem somos (Controlador)">
        <p>
          <strong className="text-foreground">Zeus Tecnologia</strong>, com
          sede em Alphaville, São Paulo, é a Controladora dos dados pessoais
          tratados na plataforma Source Authority. Para contato com o
          Encarregado de Dados (DPO):{" "}
          <a className="text-accent hover:underline" href="mailto:contato@sourceauthority.com.br">
            contato@sourceauthority.com.br
          </a>
          .
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p>Coletamos três categorias de dados:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong className="text-foreground">Cadastrais (do Cliente):</strong>{" "}
            nome, e-mail, telefone, empresa, cargo, CNPJ, dados de cobrança.
            Coletados via formulário de signup e form{" "}
            <a className="text-accent hover:underline" href="/demo">
              /demo
            </a>
            .
          </li>
          <li>
            <strong className="text-foreground">De tráfego (de visitantes do link mestre):</strong>{" "}
            endereço IP, país, cidade aproximada, tipo de dispositivo,
            User-Agent, idioma, referrer, UTMs. Coletados automaticamente
            pelo Cloudflare Worker no momento do clique.
          </li>
          <li>
            <strong className="text-foreground">De uso da Plataforma:</strong>{" "}
            logs de login, ações no painel, sessões, configurações. Usados pra
            debug e suporte.
          </li>
        </ul>
        <p>
          NÃO coletamos: nome, e-mail, telefone ou identificadores diretos do
          visitante final do link mestre (só metadata anonimizada). NÃO
          rastreamos atividade do visitante após o clique sair do nosso domínio.
        </p>
      </Section>

      <Section title="3. Por que coletamos (Bases legais LGPD)">
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong className="text-foreground">Execução de contrato</strong>{" "}
            (art. 7º, V): dados cadastrais e de uso necessários pra prestar o
            Serviço contratado.
          </li>
          <li>
            <strong className="text-foreground">Legítimo interesse</strong>{" "}
            (art. 7º, IX): dados de tráfego dos visitantes do link mestre, pra
            fornecer ao Cliente analytics agregada de origem (UTM, geo,
            device). Não há identificação direta do visitante.
          </li>
          <li>
            <strong className="text-foreground">Cumprimento de obrigação legal</strong>{" "}
            (art. 7º, II): retenção de dados fiscais (notas, contratos)
            conforme legislação tributária brasileira.
          </li>
          <li>
            <strong className="text-foreground">Consentimento</strong> (art. 7º, I):
            uso de cookies não-essenciais (analytics opcional).
          </li>
        </ul>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>
          Compartilhamos dados estritamente com sub-processadores necessários
          pra operação do Serviço, todos com contratos de tratamento de dados
          (DPA) assinados:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong className="text-foreground">Supabase</strong> (banco de
            dados, autenticação) — dados em região US East
          </li>
          <li>
            <strong className="text-foreground">Cloudflare</strong> (edge
            tracking, CDN, DNS) — anycast global
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> (hospedagem
            web/dashboard) — região Washington D.C.
          </li>
          <li>
            <strong className="text-foreground">Resend</strong> (envio de
            e-mails transacionais) — região São Paulo
          </li>
          <li>
            <strong className="text-foreground">Upstash</strong> (rate
            limiting Redis) — região São Paulo
          </li>
          <li>
            <strong className="text-foreground">Stripe / Pagar.me</strong>{" "}
            (processamento de pagamento) — quando contratação ativada
          </li>
        </ul>
        <p>
          Não vendemos, alugamos ou cedemos dados pessoais a terceiros pra
          qualquer finalidade comercial fora do escopo do Serviço.
        </p>
      </Section>

      <Section title="5. Por quanto tempo retemos">
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong className="text-foreground">Cadastrais:</strong> durante
            vigência do contrato + 5 anos pós-cancelamento (prazo legal
            tributário).
          </li>
          <li>
            <strong className="text-foreground">De tráfego (events):</strong>{" "}
            12 meses do clique. Após esse prazo, agregação anônima é
            preservada; rows individuais são deletadas.
          </li>
          <li>
            <strong className="text-foreground">Logs de uso:</strong> 90 dias.
          </li>
          <li>
            <strong className="text-foreground">Leads do form /demo:</strong>{" "}
            18 meses após o último contato comercial.
          </li>
        </ul>
      </Section>

      <Section title="6. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais proporcionais aos riscos
          tratados: criptografia em trânsito (TLS 1.3) e em repouso (AES-256
          via Supabase), Row-Level Security (RLS) por tenant, autenticação
          multi-fator no painel admin, rotação periódica de chaves, logs de
          acesso auditáveis e backup diário.
        </p>
        <p>
          Nenhum sistema é 100% inviolável. Em caso de incidente que afete
          dados pessoais, notificamos a ANPD e os titulares afetados em
          prazos compatíveis com art. 48 da LGPD.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          Usamos cookies estritamente necessários (sessão de login,
          configurações de UI). Cookies de analytics não-essenciais entrarão
          em fase futura, com banner de consentimento explícito.
        </p>
      </Section>

      <Section title="8. Direitos do titular">
        <p>
          Você (titular dos dados) pode, a qualquer momento, exercer os
          direitos garantidos pelo art. 18 da LGPD:
          <strong className="text-foreground"> confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento</strong>
          . Detalhes de como exercer cada direito em{" "}
          <a className="text-accent hover:underline" href="/lgpd">
            /lgpd
          </a>
          .
        </p>
      </Section>

      <Section title="9. Atualizações">
        <p>
          Esta Política pode ser atualizada. Mudanças materiais são
          notificadas por e-mail e publicadas nesta página com 15 dias de
          antecedência da entrada em vigor.
        </p>
        <p>
          Dúvidas:{" "}
          <a className="text-accent hover:underline" href="mailto:contato@sourceauthority.com.br">
            contato@sourceauthority.com.br
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
