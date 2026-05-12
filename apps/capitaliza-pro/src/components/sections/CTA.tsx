import { MessageCircle, ShieldCheck } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { WHATSAPP_URL } from "@/lib/utils";

export function CTA() {
  return (
    <section className="border-t border-foreground/[0.04] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-light/40 via-card to-card p-10 shadow-[0_24px_64px_-24px_hsl(var(--accent)/0.3)] md:p-16">
          {/* Decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-accent/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-accent-light/30 blur-3xl"
          />

          <div className="relative text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/80 backdrop-blur">
              <ShieldCheck className="size-3.5 text-accent" />
              Atendimento humano · Resposta em minutos
            </span>

            <h2 className="mt-6 text-balance text-3xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
              Pronto pra mudar de vida
              <span className="block text-accent">com confiança?</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground md:text-lg">
              Fale agora com nosso time no WhatsApp. Sem robô, sem espera.
              Tire suas dúvidas, escolha seu plano, e jogue no próximo sorteio.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "whatsapp", size: "xl" })}
              >
                <MessageCircle className="size-5 fill-current" />
                Falar no WhatsApp
              </a>
              <a
                href="#provably-fair"
                className={buttonClasses({ variant: "secondary", size: "xl" })}
              >
                Quero ver o demo primeiro
              </a>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground sm:flex-row sm:gap-6">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                Time disponível agora
              </span>
              <span>Mais de 48 mil participantes ativos*</span>
              <span>SUSEP autorizado</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
