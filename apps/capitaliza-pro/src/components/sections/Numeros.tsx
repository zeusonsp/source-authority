import { ShieldCheck, TrendingUp, Trophy, Users } from "lucide-react";

const STATS: ReadonlyArray<{
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  suffix?: string;
  label: string;
}> = [
  {
    icon: Trophy,
    value: "R$ 2,4",
    suffix: "M",
    label: "em prêmios distribuídos*",
  },
  {
    icon: Users,
    value: "48",
    suffix: "mil",
    label: "participantes ativos*",
  },
  {
    icon: TrendingUp,
    value: "127",
    label: "sorteios realizados*",
  },
  {
    icon: ShieldCheck,
    value: "100",
    suffix: "%",
    label: "auditável on-chain",
  },
];

export function Numeros() {
  return (
    <section className="relative border-t border-foreground/[0.04] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight md:text-5xl">
            Os números falam por si.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground md:text-lg">
            Cada centavo distribuído. Cada sorteio verificável.
            Tudo na luz do dia.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_32px_-12px_rgb(0_0_0_/_0.1)] md:p-8"
              >
                <div className="flex justify-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent-light/50 text-accent">
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-xl font-bold text-accent md:text-2xl">
                      {stat.suffix}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-tight text-muted-foreground md:text-sm">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/70">
          * Dados simulados — versão demonstrativa do site.
        </p>
      </div>
    </section>
  );
}
