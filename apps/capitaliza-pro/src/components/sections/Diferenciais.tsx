import {
  Bot,
  Gamepad2,
  Link2,
  MessageCircle,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Differential = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const DIFFERENTIALS: ReadonlyArray<Differential> = [
  {
    icon: Link2,
    title: "Provably Fair Blockchain",
    body: "Cada sorteio é publicado em hash on-chain Polygon antes de acontecer. Auditável em 1 clique. Manipulação impossível.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp como interface",
    body: "Compre, receba seus números, veja resultados — tudo no WhatsApp. Zero fricção, zero app pra baixar.",
  },
  {
    icon: Zap,
    title: "PIX instantâneo",
    body: "Compra em segundos via PIX. Se ganhar, o prêmio cai direto na sua conta em até 5 minutos. Sem burocracia.",
  },
  {
    icon: Bot,
    title: "AI Concierge 24/7",
    body: "Inteligência artificial Claude responde dúvidas a qualquer hora. Pergunte sobre regulamento, sorteios, prêmios.",
  },
  {
    icon: Users,
    title: "Programa de afiliados",
    body: "Influenciadores ganham comissão automática via PIX por cada venda gerada. Tracking transparente em tempo real.",
  },
  {
    icon: Gamepad2,
    title: "Gamificação real",
    body: "Streaks, achievements e ranking. Vire participação em hábito. Os top 100 ganham bônus mensal automático.",
  },
];

export function Diferenciais() {
  return (
    <section id="diferenciais" className="border-t border-foreground/[0.04] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-light/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Por que somos diferente
          </span>
          <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight md:text-5xl">
            Capitalização como deveria sempre ter sido.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground md:text-lg">
            Tecnologia de ponta em um setor que ainda opera no papel.
            Transparência radical em um mercado que vive de opacidade.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:gap-6">
          {DIFFERENTIALS.map((d) => {
            const Icon = d.icon;
            return (
              <Card
                key={d.title}
                className="group relative overflow-hidden p-8 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgb(0_0_0_/_0.12)] hover:border-accent/30"
              >
                {/* Hover gold glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-accent/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />

                <div className="relative flex items-start gap-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-light/50 text-accent ring-1 ring-accent/10">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold tracking-tight">
                      {d.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {d.body}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
