import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso da plataforma Source Authority — condições gerais para empresas premium brasileiras.",
};

const LAST_UPDATED = "07 de maio de 2026";

export default function TermosPage() {
  return (
    <article className="space-y-8 text-foreground">
      <header className="border-b border-border pb-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Termos de Uso
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Estes Termos de Uso (&quot;Termos&quot;) regem o acesso e uso da
          plataforma <strong className="text-foreground">Source Authority</strong>{" "}
          (&quot;Plataforma&quot;, &quot;Serviço&quot;), operada por{" "}
          <strong className="text-foreground">Zeus Tecnologia</strong> (&quot;Zeus&quot;,
          &quot;nós&quot;), pessoa jurídica de direito privado com sede em
          Alphaville, São Paulo, Brasil. Ao criar conta, contratar plano ou usar
          qualquer funcionalidade, o usuário (&quot;Cliente&quot;) declara que
          leu, entendeu e concorda integralmente com estes Termos.
        </p>
      </section>

      <Section title="1. Objeto">
        <p>
          A Plataforma fornece (i) link mestre rastreável para substituir links
          em bio/comunicação, com captura de origem (UTM, geo, device,
          referrer); (ii) detecção de uso indevido de marca via monitoramento
          de domínios e Certificate Transparency logs; (iii) atribuição de
          venda em redes de revenda. Funcionalidades específicas variam por
          plano contratado.
        </p>
      </Section>

      <Section title="2. Cadastro e elegibilidade">
        <p>
          O cadastro é restrito a pessoas jurídicas regularmente constituídas
          no Brasil, com CNPJ ativo, faturamento mínimo de R$ 1 milhão/ano e
          presença digital orgânica (50.000+ seguidores agregados em IG/TikTok
          ou equivalente). Cadastros que não atendam aos critérios podem ser
          recusados ou cancelados a qualquer momento.
        </p>
        <p>
          O Cliente é responsável por manter precisos e atualizados os dados
          fornecidos no cadastro, incluindo razão social, CNPJ, e-mail de
          contato e dados de cobrança.
        </p>
      </Section>

      <Section title="3. Planos e pagamentos">
        <p>
          A Plataforma opera em modelo SaaS por assinatura mensal recorrente.
          Os planos atuais (Starter, Growth, Pro, Business) e seus respectivos
          valores estão publicados em{" "}
          <a className="text-accent hover:underline" href="/#pricing">
            sourceauthority.com.br#pricing
          </a>
          . O ciclo de cobrança inicia na data de contratação e renova
          automaticamente até cancelamento.
        </p>
        <p>
          Reajustes anuais seguem o IPCA acumulado dos 12 meses anteriores.
          Mudanças de plano (upgrade/downgrade) entram em vigor no próximo
          ciclo. Inadimplência por mais de 7 (sete) dias suspende acesso; após
          30 (trinta) dias, a conta pode ser desativada com perda de dados não
          exportados.
        </p>
      </Section>

      <Section title="4. Uso permitido">
        <p>
          O Cliente concorda em usar a Plataforma exclusivamente para
          finalidades legítimas relacionadas à própria atividade comercial. É
          expressamente proibido: (a) revender, sublicenciar ou redistribuir
          acessos sem autorização escrita; (b) usar a Plataforma para
          atividades ilegais, fraudulentas, difamatórias, ou que violem
          direitos de terceiros; (c) tentativas de engenharia reversa,
          scraping massivo ou bypass de rate limits; (d) divulgar links
          mestres em campanhas de spam, phishing ou conteúdo enganoso.
        </p>
      </Section>

      <Section title="5. Propriedade intelectual">
        <p>
          Todo o software, design, marca, logotipo, documentação e código da
          Plataforma são propriedade exclusiva da Zeus Tecnologia. O Cliente
          recebe uma licença não-exclusiva, intransferível e revogável para
          usar a Plataforma durante a vigência da assinatura.
        </p>
        <p>
          O Cliente mantém propriedade integral sobre os dados que insere
          (nome da empresa, links, conteúdo de campanhas) e sobre os eventos
          de tráfego coletados na sua conta. A Zeus tem licença limitada para
          processar esses dados exclusivamente para entregar o Serviço.
        </p>
      </Section>

      <Section title="6. Limitação de responsabilidade">
        <p>
          A Plataforma é fornecida &quot;como está&quot;. A Zeus envida
          melhores esforços para manter SLA de 99,5% mensal, mas não garante
          operação ininterrupta nem livre de erros. Em nenhuma hipótese a
          Zeus será responsável por lucros cessantes, danos indiretos,
          incidentais, especiais ou consequenciais decorrentes do uso ou
          impossibilidade de uso da Plataforma. A responsabilidade total
          agregada da Zeus, em qualquer hipótese, fica limitada ao valor
          efetivamente pago pelo Cliente nos 12 (doze) meses anteriores ao
          evento que originou a controvérsia.
        </p>
      </Section>

      <Section title="7. Cancelamento">
        <p>
          O Cliente pode cancelar a qualquer momento via painel ou
          solicitação por escrito ao suporte. O cancelamento entra em vigor
          ao final do ciclo de cobrança em curso (sem reembolso proporcional).
          Após cancelamento, os dados ficam acessíveis por 30 dias para
          export, e são excluídos definitivamente em seguida.
        </p>
        <p>
          A Zeus pode suspender ou cancelar o acesso unilateralmente em caso
          de violação destes Termos, com notificação por e-mail e prazo de 7
          dias para regularização (exceto em casos de violação grave, em que
          o cancelamento é imediato).
        </p>
      </Section>

      <Section title="8. Foro e legislação aplicável">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do
          Brasil. Fica eleito o foro da Comarca de São Paulo/SP como
          competente para dirimir qualquer controvérsia, com renúncia
          expressa a qualquer outro, por mais privilegiado que seja.
        </p>
      </Section>

      <Section title="9. Disposições gerais">
        <p>
          A Zeus pode atualizar estes Termos a qualquer momento, mediante
          aviso por e-mail e publicação da versão revisada nesta página com
          30 dias de antecedência. O uso continuado após o prazo equivale a
          aceitação tácita.
        </p>
        <p>
          Para tirar dúvidas: <a className="text-accent hover:underline" href="mailto:contato@sourceauthority.com.br">contato@sourceauthority.com.br</a>.
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
