import { Check, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn, WHATSAPP_URL } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  highlight?: boolean;
  badge?: string;
  features: ReadonlyArray<string>;
  cta: string;
};

const PLANS: ReadonlyArray<Plan> = [
  {
    id: "express",
    name: "Resenha Express",
    tagline: "Comece agora",
    price: "10",
    features: [
      "1 número da sorte",
      "Sorteio semanal",
      "Resultado on-chain",
      "Notificação WhatsApp",
    ],
    cta: "Participar por R$ 10",
  },
  {
    id: "plus",
    name: "Resenha Plus",
    tagline: "Mais popular",
    price: "25",
    highlight: true,
    badge: "Recomendado",
    features: [
      "3 números da sorte",
      "+ 1 número bônus surpresa",
      "Sorteio semanal",
      "Acesso ao grupo VIP no WhatsApp",
      "Achievements + ranking",
    ],
    cta: "Participar por R$ 25",
  },
  {
    id: "vip",
    name: "Resenha VIP",
    tagline: "Para quem quer mais chances",
    price: "100",
    features: [
      "12 números da sorte",
      "Sorteio semanal",
      "Acesso a sorteio mensal R$ 50.000",
      "Concierge dedicado",
      "Streak protector + early access",
    ],
    cta: "Participar por R$ 100",
  },
];

export function Planos() {
  return (
    <section
      id="planos"
      className="relative border-t border-foreground/[0.04] py-24 md:py-32"
    >
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-light/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Escolha seu plano
          </span>
          <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight md:text-5xl">
            Comece pequeno. Vai longe.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground md:text-lg">
            Sem mensalidade obrigatória. Você participa quando quiser, dos
            sorteios que quiser. Cancelamento em 1 clique.
          </p>
        </div>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8 transition-all duration-300",
                plan.highlight
                  ? "border-accent/60 bg-gradient-to-b from-accent-light/30 to-card shadow-[0_16px_48px_-16px_hsl(var(--accent)/0.3)] lg:-translate-y-2 lg:scale-[1.02]"
                  : "border-foreground/[0.08] bg-card hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_32px_-12px_rgb(0_0_0_/_0.1)]",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground shadow-[0_4px_12px_-2px_hsl(var(--accent)/0.5)]">
                  <Sparkles className="size-3" />
                  {plan.badge}
                </span>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {plan.tagline}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight">
                  {plan.name}
                </h3>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    R$
                  </span>
                  <span className="text-5xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/sorteio</span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        plan.highlight
                          ? "bg-accent text-accent-foreground"
                          : "bg-accent-light text-accent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/85">{feat}</span>
                  </li>
                ))}
              </ul>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonClasses({
                    variant: plan.highlight ? "primary" : "secondary",
                    size: "lg",
                  }),
                  "mt-10 w-full",
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Todos os planos incluem auditoria on-chain · PIX instantâneo na premiação · regulamento SUSEP
        </p>
      </div>
    </section>
  );
}
