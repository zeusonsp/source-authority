import Link from "next/link";
import { Check } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  highlightLabel?: string;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "97",
    tagline: "Pra quem está começando a profissionalizar a presença digital.",
    features: [
      "1 link mestre",
      "Tracking básico (clicks + país)",
      "5.000 cliques/mês",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Growth",
    price: "297",
    tagline: "Pra marca em crescimento que precisa entender canais.",
    features: [
      "5 links",
      "Tracking completo (UTM + device + referrer)",
      "50.000 cliques/mês",
      "Relatórios exportáveis (CSV)",
      "Suporte prioritário",
    ],
    highlight: true,
    highlightLabel: "Mais escolhido",
  },
  {
    name: "Pro",
    price: "697",
    tagline: "Pra empresa premium com rede de revenda.",
    features: [
      "25 links",
      "Alertas de proteção de marca",
      "250.000 cliques/mês",
      "Multi-tenant pra agências",
      "Webhook + integrações",
    ],
  },
  {
    name: "Business",
    price: "1.497",
    tagline: "Pra grupo, holding ou multi-empresa.",
    features: [
      "Links ilimitados",
      "White-label completo",
      "Cliques ilimitados",
      "SLA contratual",
      "Account manager dedicado",
    ],
  },
];

export function Pricing() {
  return (
    <section className="border-t border-border/60 py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Planos transparentes.{" "}
            <span className="text-muted-foreground">Sem surpresa na fatura.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground">
            Pague pelo que usa. Upgrade ou downgrade a qualquer momento.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-card/40 p-7 transition-colors",
                plan.highlight
                  ? "border-accent/60 bg-card/70 shadow-[0_0_0_1px_hsl(var(--accent)/0.4),0_20px_60px_-15px_hsl(var(--accent)/0.25)]"
                  : "border-border hover:border-border/80",
              )}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                  {plan.highlightLabel}
                </span>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {plan.tagline}
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-border/60 pt-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-accent"
                      aria-hidden
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/demo"
                className={cn(
                  buttonClasses({
                    variant: plan.highlight ? "primary" : "secondary",
                    size: "md",
                  }),
                  "mt-7 w-full",
                )}
              >
                Começar
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/demo"
            className={buttonClasses({ variant: "primary", size: "lg" })}
          >
            Começar com 14 dias grátis
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}
