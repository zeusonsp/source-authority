import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LGPD — Direitos do Titular",
  description:
    "Como exercer seus direitos como titular de dados pessoais perante a Source Authority, conforme LGPD (Lei 13.709/2018).",
};

const LAST_UPDATED = "07 de maio de 2026";

export default function LGPDPage() {
  return (
    <article className="space-y-8 text-foreground">
      <header className="border-b border-border pb-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          LGPD — Direitos do Titular
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          A{" "}
          <strong className="text-foreground">
            Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)
          </strong>{" "}
          garante a você (titular dos dados) controle sobre como seus dados
          pessoais são tratados pela{" "}
          <strong className="text-foreground">Source Authority</strong>{" "}
          (operada pela <strong className="text-foreground">Zeus Tecnologia</strong>).
          Esta página explica cada direito previsto no art. 18 da LGPD e como
          exercê-lo.
        </p>
        <p>
          Para visão geral de quais dados coletamos e por quê, consulte{" "}
          <a className="text-accent hover:underline" href="/privacidade">
            /privacidade
          </a>
          . Os termos contratuais ficam em{" "}
          <a className="text-accent hover:underline" href="/termos">
            /termos
          </a>
          .
        </p>
      </section>

      <Section title="1. Encarregado de Dados (DPO)">
        <p>
          Em conformidade com art. 41 da LGPD, designamos um Encarregado de
          Proteção de Dados como ponto de contato com você e com a Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong className="text-foreground">E-mail:</strong>{" "}
            <a className="text-accent hover:underline" href="mailto:contato@sourceauthority.com.br">
              contato@sourceauthority.com.br
            </a>
          </li>
          <li>
            <strong className="text-foreground">Empresa:</strong> Zeus
            Tecnologia
          </li>
          <li>
            <strong className="text-foreground">Endereço:</strong> Alphaville,
            São Paulo, Brasil
          </li>
        </ul>
      </Section>

      <Section title="2. Seus 9 direitos previstos no art. 18">
        <p>
          Você pode, a qualquer momento e gratuitamente, solicitar:
        </p>

        <Right
          icon="✓"
          title="Confirmação de tratamento"
          desc="Saber se a Source Authority trata algum dado pessoal seu (incluindo eventos de tráfego, lead em /demo, conta de usuário)."
        />
        <Right
          icon="📂"
          title="Acesso aos dados"
          desc="Receber em até 15 dias todos os dados pessoais que temos sobre você, em formato simplificado e/ou completo (art. 9º LGPD)."
        />
        <Right
          icon="✏️"
          title="Correção"
          desc="Solicitar correção de dados incompletos, inexatos ou desatualizados. No painel, você mesmo pode editar dados de cadastro em /configuracoes."
        />
        <Right
          icon="🔒"
          title="Anonimização ou bloqueio"
          desc="Pedir que dados desnecessários, excessivos ou tratados em desconformidade sejam anonimizados ou bloqueados."
        />
        <Right
          icon="🗑️"
          title="Eliminação"
          desc="Solicitar exclusão dos seus dados pessoais, exceto quando obrigação legal nossa (ex: registros tributários por 5 anos) ou exercício regular de direito justifique manutenção."
        />
        <Right
          icon="📤"
          title="Portabilidade"
          desc="Receber seus dados em formato estruturado e legível por máquina (JSON ou CSV) pra transferir a outro fornecedor."
        />
        <Right
          icon="🔍"
          title="Informação sobre compartilhamento"
          desc="Saber com quais entidades públicas e privadas compartilhamos seus dados. Lista atualizada em /privacidade #4."
        />
        <Right
          icon="🚫"
          title="Revogação de consentimento"
          desc="Quando o tratamento depender de consentimento (ex: cookies de analytics), você pode revogá-lo a qualquer momento sem prejuízo de funcionalidades essenciais."
        />
        <Right
          icon="⚖️"
          title="Revisão de decisões automatizadas"
          desc="Pedir revisão humana de decisões tomadas exclusivamente com base em tratamento automatizado que afetem seus interesses (ex: anti-fraude no /demo). Hoje não temos esse tipo de decisão automatizada com efeito sobre você."
        />
      </Section>

      <Section title="3. Como solicitar">
        <p>
          Envie e-mail pra{" "}
          <a className="text-accent hover:underline" href="mailto:contato@sourceauthority.com.br">
            contato@sourceauthority.com.br
          </a>{" "}
          com:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Assunto: <code className="rounded bg-secondary/40 px-2 py-0.5 text-xs">[LGPD] Solicitação de [tipo do direito]</code></li>
          <li>Seu nome completo, CPF e e-mail vinculado à conta (pra autenticarmos a solicitação)</li>
          <li>Descrição do direito que pretende exercer</li>
          <li>Prazo desejado (respeitamos 15 dias corridos a partir do recebimento, conforme art. 19 LGPD)</li>
        </ul>
        <p>
          Resposta será enviada pelo mesmo e-mail, em formato compatível
          (texto pra confirmação, JSON/CSV pra portabilidade, etc.).
        </p>
      </Section>

      <Section title="4. Exclusão imediata pelo painel">
        <p>
          Cliente com conta ativa pode solicitar exclusão imediata via{" "}
          <strong className="text-foreground">Configurações → Excluir conta</strong>{" "}
          (em fase de implementação). Os dados são marcados pra exclusão e
          deletados em até 30 dias, exceto retenções legalmente
          obrigatórias.
        </p>
      </Section>

      <Section title="5. Reclamação à ANPD">
        <p>
          Se entender que seu direito não foi adequadamente atendido por nós,
          você pode apresentar reclamação à Autoridade Nacional de Proteção
          de Dados:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Site:{" "}
            <a
              className="text-accent hover:underline"
              href="https://www.gov.br/anpd/"
              target="_blank"
              rel="noopener noreferrer"
            >
              gov.br/anpd
            </a>
          </li>
          <li>Telefone: 0800 282 0011</li>
        </ul>
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

function Right({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card/40 p-4">
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}
