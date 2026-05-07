import { Globe2, Radar, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

const features = [
  {
    icon: Radar,
    title: "Tracking de origem real",
    body:
      "UTM, referrer, geo, device, idioma, fingerprint anônimo. Dashboard mostra exatamente de onde cada clique veio — Reels, Story, repost, e-mail, WhatsApp.",
    bullets: [
      "Atribuição cross-platform unificada",
      "Geolocalização país + cidade",
      "Detecção mobile / desktop / tablet",
    ],
  },
  {
    icon: Globe2,
    title: "Alertas de proteção de marca",
    body:
      "Monitoramos domínios sound-alike, registros novos em CT logs e patterns de DNS pra avisar você antes do cliente cair em fraude. Notificação no e-mail e webhook.",
    bullets: [
      "Sound-alike + typosquatting detection",
      "Certificate Transparency log monitoring",
      "Alertas em tempo real (e-mail + webhook)",
    ],
  },
  {
    icon: Sparkles,
    title: "Link premium com sua identidade",
    body:
      "Domínio próprio (ou subdomínio Source Authority), design custom com sua paleta, sem watermark. Coerente com a marca premium que você construiu.",
    bullets: [
      "Custom domain a partir do Growth",
      "Tema configurável (cores, fonte, layout)",
      "Zero watermark, zero ads",
    ],
  },
];

export function Solucao() {
  return (
    <section
      id="solucao"
      className="relative border-t border-border/60 py-24 md:py-32 scroll-mt-16"
    >
      {/* Acento dourado sutil no fundo da seção */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center_top,_hsl(var(--accent)/0.05),_transparent_70%)]"
      />

      <div className="container mx-auto px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              Source Authority
            </span>
            <h2 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Entrega o que falta.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
              Três pilares que substituem ferramentas genéricas com a
              profundidade que marcas premium brasileiras precisam.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="flex h-full flex-col rounded-2xl border border-border bg-card/60 p-7 transition-all hover:-translate-y-0.5 hover:border-accent/40"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                <ul className="mt-6 space-y-2 border-t border-border/60 pt-5 text-xs">
                  {feature.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-accent"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
