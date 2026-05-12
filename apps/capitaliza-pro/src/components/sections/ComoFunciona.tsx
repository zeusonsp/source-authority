import { Banknote, MessageSquare, Trophy } from "lucide-react";

const STEPS: ReadonlyArray<{
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Compre seu número",
    body: "Pelo WhatsApp ou pelo site. Pagamento via PIX em segundos. Recebe confirmação imediata com seus números.",
  },
  {
    number: "02",
    icon: Trophy,
    title: "Aguarde o sorteio",
    body: "Toda quinta-feira às 21h, ao vivo no YouTube. Hash do resultado já publicado on-chain antes do sorteio começar.",
  },
  {
    number: "03",
    icon: Banknote,
    title: "Ganhou? PIX em 5 min.",
    body: "Prêmio cai direto na sua conta em até 5 minutos. Sem burocracia, sem ligação, sem ir em lugar nenhum.",
  },
];

export function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="relative border-t border-foreground/[0.04] py-24 md:py-32"
    >
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-light/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Como funciona
          </span>
          <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight md:text-5xl">
            Três passos. Cinco minutos. Vida nova.
          </h2>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          {/* Connecting line on desktop */}
          <div
            aria-hidden
            className="absolute left-1/2 top-12 hidden h-[2px] w-[66%] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent md:block"
          />

          <ol className="relative grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.number}
                  className="group relative rounded-2xl border border-foreground/[0.06] bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_32px_-12px_rgb(0_0_0_/_0.1)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.5)]">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-3xl font-extrabold text-accent/15">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
