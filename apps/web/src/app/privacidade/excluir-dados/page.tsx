import type { Metadata } from "next";

/**
 * /privacidade/excluir-dados — instruções de exclusão de dados (LGPD + Meta).
 *
 * Página estática pública. Atende dois requisitos:
 *
 * 1. Meta App Review: precisa de URL pública com instruções claras de como
 *    o user pode solicitar exclusão. Linkamos esta página no painel Meta
 *    como "User Data Deletion Instructions URL".
 *
 * 2. LGPD art. 18: titular tem direito de pedir eliminação de dados pessoais
 *    tratados com seu consentimento. Esta página explica os canais.
 *
 * Não usa form server-action para deleção direta (Fase futura, quando
 * houver volume) — fluxo atual é via email pra privacidade@sourceauthority.com.br
 * com confirmação humana.
 */

export const metadata: Metadata = {
  title: "Excluir meus dados",
  description:
    "Como solicitar a exclusão dos seus dados pessoais da plataforma Source Authority — LGPD art. 18 e exigências Meta.",
};

const SUPPORT_EMAIL = "privacidade@sourceauthority.com.br";

export default function ExcluirDadosPage() {
  const mailtoSubject = encodeURIComponent("Solicitação de exclusão de dados");
  const mailtoBody = encodeURIComponent(
    [
      "Olá,",
      "",
      "Solicito a exclusão dos meus dados pessoais armazenados pela plataforma Source Authority, conforme art. 18, VI da LGPD.",
      "",
      "Dados de identificação (preencha):",
      "- Nome completo:",
      "- E-mail cadastrado:",
      "- Empresa (se aplicável):",
      "- Conta Instagram/Facebook conectada (se aplicável):",
      "",
      "Aguardo confirmação dentro do prazo legal de 15 dias.",
      "",
      "Atenciosamente,",
    ].join("\n"),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <article className="space-y-8 text-foreground">
        <header className="border-b border-border pb-6">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Excluir meus dados
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Como solicitar a remoção dos seus dados da plataforma Source
            Authority.
          </p>
        </header>

        <section className="space-y-4 leading-relaxed text-muted-foreground">
          <p>
            Você tem o direito de solicitar a exclusão dos seus dados pessoais
            tratados pela plataforma Source Authority a qualquer momento,
            conforme o{" "}
            <strong className="text-foreground">
              art. 18, VI da Lei Geral de Proteção de Dados (LGPD)
            </strong>
            .
          </p>
          <p>
            Esta página descreve os canais disponíveis. Para política completa,
            consulte{" "}
            <a className="text-accent hover:underline" href="/privacidade">
              /privacidade
            </a>
            .
          </p>
        </section>

        <Section title="1. Solicitação por e-mail (recomendado)">
          <p>
            Envie um e-mail para{" "}
            <a
              className="text-accent hover:underline"
              href={`mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            informando:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Nome completo;</li>
            <li>E-mail cadastrado na plataforma;</li>
            <li>Empresa associada (se aplicável);</li>
            <li>
              Conta Instagram/Facebook conectada à plataforma (se aplicável).
            </li>
          </ul>
          <p>
            Confirmamos a exclusão em até{" "}
            <strong className="text-foreground">15 dias corridos</strong> a
            partir do recebimento. Pedidos que envolvam dados Meta
            (Facebook/Instagram) seguem o prazo agregado de até 30 dias da
            política Meta + LGPD.
          </p>
        </Section>

        <Section title="2. Solicitação via Meta (Facebook / Instagram)">
          <p>
            Se você conectou sua conta Instagram à Source Authority e deseja
            revogar acesso e excluir os dados associados, use o caminho oficial
            da Meta:
          </p>
          <ol className="ml-6 list-decimal space-y-2">
            <li>
              Acesse{" "}
              <a
                className="text-accent hover:underline"
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noreferrer noopener"
              >
                Configurações do Facebook → Aplicativos e Sites
              </a>
              ;
            </li>
            <li>
              Encontre <strong className="text-foreground">Source Authority</strong>{" "}
              na lista;
            </li>
            <li>
              Clique em <strong className="text-foreground">Remover</strong>;
            </li>
            <li>
              No diálogo, marque a opção{" "}
              <strong className="text-foreground">
                "Excluir todas as atividades anteriores"
              </strong>{" "}
              e confirme.
            </li>
          </ol>
          <p>
            A Meta nos notifica automaticamente. Processamos a remoção em até
            30 dias e você pode acompanhar o status pela URL retornada no
            momento da solicitação.
          </p>
        </Section>

        <Section title="3. O que é apagado">
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Dados cadastrais:</strong>{" "}
              nome, e-mail, telefone, vínculo com empresa.
            </li>
            <li>
              <strong className="text-foreground">Tokens OAuth Meta:</strong>{" "}
              access tokens Instagram/Facebook são revogados imediatamente.
            </li>
            <li>
              <strong className="text-foreground">Conteúdos coletados:</strong>{" "}
              hashes e referências a posts associados ao seu perfil são
              removidos.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Mantemos por obrigação legal: registros mínimos de auditoria
            (anonimizados) por até 5 anos para fins fiscais e de defesa em
            processo judicial, conforme art. 16 da LGPD.
          </p>
        </Section>

        <Section title="4. Encarregado de Dados (DPO)">
          <p>
            Para assuntos relacionados à proteção de dados, contate o
            Encarregado:{" "}
            <a
              className="text-accent hover:underline"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Esta página atende aos requisitos da Meta Platforms Inc. para apps
            integrados a Facebook/Instagram (User Data Deletion Instructions)
            e ao art. 18 da LGPD (Lei nº 13.709/2018).
          </p>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
