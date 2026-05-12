"use client";

import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn, WHATSAPP_URL } from "@/lib/utils";

// Ticker fictício de últimos prêmios — duplicado pra loop seamless
const TICKER_ENTRIES: ReadonlyArray<{
  city: string;
  state: string;
  amount: string;
}> = [
  { city: "São Paulo", state: "SP", amount: "R$ 12.500" },
  { city: "Rio de Janeiro", state: "RJ", amount: "R$ 4.000" },
  { city: "Belo Horizonte", state: "MG", amount: "R$ 25.000" },
  { city: "Curitiba", state: "PR", amount: "R$ 8.700" },
  { city: "Salvador", state: "BA", amount: "R$ 50.000" },
  { city: "Recife", state: "PE", amount: "R$ 3.200" },
  { city: "Fortaleza", state: "CE", amount: "R$ 17.800" },
  { city: "Porto Alegre", state: "RS", amount: "R$ 6.500" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft golden gradient backdrop */}
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-gradient-to-b from-accent-light/40 via-background/40 to-background"
      />

      <div className="container mx-auto px-6 pb-24 pt-16 md:pb-32 md:pt-28">
        {/* Pulsing on-chain badge */}
        <div className="flex justify-center">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-light/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/80",
              "animate-gold-pulse",
            )}
          >
            <ShieldCheck className="size-3.5 text-accent" />
            Auditado on-chain · SUSEP
          </span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto mt-8 max-w-4xl text-balance text-center text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          O primeiro título de capitalização
          <span className="block text-accent">auditado por blockchain</span>
          do Brasil.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-center text-base text-muted-foreground md:text-lg">
          Sorteios <strong className="text-foreground">provably fair</strong>.
          Pagamento via PIX. Prêmios via WhatsApp.
          <span className="block">Confiança absoluta — verificável em 1 clique.</span>
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#planos"
            className={buttonClasses({ variant: "primary", size: "lg" })}
          >
            Quero participar
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#provably-fair"
            className={buttonClasses({ variant: "secondary", size: "lg" })}
          >
            <Sparkles className="size-4 text-accent" />
            Como funciona o provably fair
          </a>
        </div>

        {/* Trust strip */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          PIX instantâneo · Sem cartão · Comece com R$ 10 · Cancele quando quiser
        </p>

        {/* Live ticker — últimos ganhadores */}
        <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card/60 shadow-[0_1px_2px_-1px_rgb(0_0_0_/_0.04),0_2px_8px_-2px_rgb(0_0_0_/_0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-foreground/[0.06] px-5 py-3">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Últimos ganhadores · ao vivo
            </span>
          </div>

          {/* Edge fade masks */}
          <div className="relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-card to-transparent"
            />
            <div className="flex w-max animate-ticker gap-10 py-4 pr-10">
              {[...TICKER_ENTRIES, ...TICKER_ENTRIES].map((entry, idx) => (
                <div
                  key={`${entry.city}-${idx}`}
                  className="flex items-center gap-3 whitespace-nowrap text-sm"
                >
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                    🏆
                  </span>
                  <span className="font-semibold">
                    {entry.city}, {entry.state}
                  </span>
                  <span className="text-muted-foreground">levou</span>
                  <span className="font-bold text-accent">{entry.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
