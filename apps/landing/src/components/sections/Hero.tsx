import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/**
 * Hero da landing — primeira seção acima da dobra.
 *
 * Estrutura: badge sutil + H1 grande + subhead + 2 CTAs + mockup
 * placeholder do dashboard.
 *
 * TODO(landing-mockup): substituir o placeholder por screenshot real
 * do /relatorios ou /dashboard com leve sombra/blur. Idealmente um
 * <Image> com prioridade pra LCP. Sub-bloco futuro (B3 ou B4).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient sutil no topo pra dar profundidade tipo Linear/Vercel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,_hsl(var(--accent)/0.08),_transparent_60%)]"
      />

      <div className="container mx-auto px-6 pb-24 pt-20 md:pt-32 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            Source Authority — beta privado
          </span>

          <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Saiba quem te encontra.{" "}
            <span className="text-accent">Proteja sua marca.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
            Link-in-bio premium com tracking de origem e alertas de proteção
            de marca em tempo real.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/demo" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Solicitar demo
              <ArrowRight className="size-4" />
            </Link>
            <Link href="#solucao" className={buttonClasses({ variant: "secondary", size: "lg" })}>
              Ver como funciona
            </Link>
          </div>
        </div>

        {/* Mockup placeholder. Mantido como caixa estilizada até trocar
            por screenshot real (TODO no docblock acima). */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="relative rounded-2xl border border-border bg-gradient-to-b from-card to-background p-2 shadow-[0_30px_80px_-20px_hsl(var(--accent)/0.15)]">
            <div className="aspect-[16/10] w-full rounded-xl border border-border/60 bg-card/40">
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-widest">
                  mockup
                </span>
                <span className="text-sm">
                  Screenshot do /relatorios entra aqui
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
