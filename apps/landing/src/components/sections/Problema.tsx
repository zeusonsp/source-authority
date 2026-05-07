import { AlertTriangle, EyeOff, ShieldOff } from "lucide-react";
import { Reveal } from "@/components/reveal";

const dores = [
  {
    icon: EyeOff,
    title: "Linktree não rastreia origem real",
    body:
      "Todo clique parece igual no painel. Você não sabe se o lead veio do Reels, do feed, do story ou de um repost — então não sabe onde investir mais.",
  },
  {
    icon: ShieldOff,
    title: "Sua marca está sendo registrada em domínios parecidos",
    body:
      "Concorrentes e fraudadores compram domínios sound-alike (suamarca-oficial.com, suamarca.shop) sem você ficar sabendo. Quando descobre, já tem cliente confuso.",
  },
  {
    icon: AlertTriangle,
    title: "Você gasta milhares em ads sem saber qual canal converte",
    body:
      "UTM quebra em WhatsApp e e-mail. Cada plataforma reporta números diferentes. No fim do mês, decisão de orçamento vira chute.",
  },
];

export function Problema() {
  return (
    <section className="border-t border-border/60 bg-background py-24 md:py-32">
      <div className="container mx-auto px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Você não sabe de onde vem seu tráfego.{" "}
              <span className="font-medium">
                Nem quem está copiando sua marca.
              </span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {dores.map((dor) => {
            const Icon = dor.icon;
            return (
              <article
                key={dor.title}
                className="group rounded-xl border border-border bg-card/40 p-6 transition-colors hover:border-border/80 hover:bg-card/60"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-secondary/40 text-accent">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {dor.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {dor.body}
                </p>
              </article>
            );
          })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
