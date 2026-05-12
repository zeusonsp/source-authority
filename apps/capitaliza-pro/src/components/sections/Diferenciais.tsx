import {
  Link2,
  MessageCircle,
  Zap,
  Bot,
  Users,
  Trophy,
} from "lucide-react";

/**
 * Diferenciais tech — premium NOT estética dominante.
 * Cards 2x3 com borda amarela em fundo branco. Cada card destaca
 * UM diferencial que ninguém mais (Resenha/concorrentes) oferece.
 */

const DIFERENCIAIS = [
  {
    icon: Link2,
    title: "Auditado em Blockchain",
    desc: "Cada sorteio publicado em hash on-chain Polygon. Auditável em 1 clique. Não dá pra trapacear.",
    accent: "#5C2D9C",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp como interface",
    desc: "Compre, receba número, veja resultado — tudo no WhatsApp. Sem cadastros chatos.",
    accent: "#25D366",
  },
  {
    icon: Zap,
    title: "PIX em 5 minutos",
    desc: "Ganhou? Recebe no PIX em até 5 minutos. Sem burocracia, sem fila.",
    accent: "#FFD700",
  },
  {
    icon: Bot,
    title: "Suporte 24/7 com IA",
    desc: "Atendimento humanizado por inteligência artificial Claude. Tire qualquer dúvida em segundos.",
    accent: "#054C2D",
  },
  {
    icon: Users,
    title: "Programa de afiliados",
    desc: "Indique e ganhe. Comissão automática via PIX a cada amigo que comprar.",
    accent: "#16A34A",
  },
  {
    icon: Trophy,
    title: "Gamificação real",
    desc: "Conquistas, streaks e ranking de premiados. Vire seu hábito da sorte.",
    accent: "#F59E0B",
  },
] as const;

export function Diferenciais() {
  return (
    <section
      id="diferenciais"
      className="relative bg-white py-14 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#5C2D9C]">
            Por que somos diferentes
          </p>
          <h2 className="text-balance text-3xl font-extrabold uppercase text-[#054C2D] sm:text-5xl">
            Tecnologia que <span className="text-[#5C2D9C]">ninguém mais</span> oferece
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Capitalização tradicional + diferenciais únicos no mercado brasileiro.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {DIFERENCIAIS.map((d) => {
            const Icon = d.icon;
            return (
              <article
                key={d.title}
                className="group relative flex flex-col rounded-3xl border-2 border-[#FFD700] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:p-7"
              >
                <div
                  className="mb-5 flex size-14 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: d.accent }}
                >
                  <Icon className="size-7" strokeWidth={2.2} />
                </div>
                <h3 className="mb-2 text-lg font-extrabold uppercase text-[#054C2D] sm:text-xl">
                  {d.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {d.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
