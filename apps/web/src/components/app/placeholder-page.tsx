import { cn } from "@/lib/utils";

type PlaceholderPageProps = {
  title: string;
  /** Texto curto tipo "Em construção · Fase 3" — vira badge dourado discreto. */
  badge: string;
  /** Parágrafo explicando o que vem na fase. */
  description: string;
  /** Variante visual: 'em-construcao' = badge accent; 'parcial' = badge muted. */
  variant?: "em-construcao" | "parcial";
};

export function PlaceholderPage({
  title,
  badge,
  description,
  variant = "em-construcao",
}: PlaceholderPageProps) {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-3">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-medium",
              variant === "em-construcao"
                ? "border border-accent/30 bg-accent/10 text-accent"
                : "border border-border bg-secondary text-muted-foreground",
            )}
          >
            {badge}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
