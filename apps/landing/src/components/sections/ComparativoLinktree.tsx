import { Check, Lock, X } from "lucide-react";

type Cell = "yes" | "no" | "paywall";

type Row = {
  feature: string;
  linktree: Cell;
  linktreeLabel?: string;
  sourceAuthority: Cell;
  sourceAuthorityLabel?: string;
};

const rows: Row[] = [
  {
    feature: "Tracking de origem detalhado",
    linktree: "no",
    sourceAuthority: "yes",
  },
  {
    feature: "Geo + device + referrer",
    linktree: "no",
    sourceAuthority: "yes",
  },
  {
    feature: "Alertas de domínios falsificados",
    linktree: "no",
    sourceAuthority: "yes",
  },
  {
    feature: "Domínio próprio sem .linktr.ee",
    linktree: "paywall",
    linktreeLabel: "Plano Pro",
    sourceAuthority: "yes",
    sourceAuthorityLabel: "Todos planos",
  },
  {
    feature: "Multi-tenant pra agências",
    linktree: "no",
    sourceAuthority: "yes",
  },
  {
    feature: "Relatórios exportáveis (CSV)",
    linktree: "paywall",
    linktreeLabel: "Plano Pro",
    sourceAuthority: "yes",
  },
  {
    feature: "Suporte em português",
    linktree: "no",
    sourceAuthority: "yes",
  },
  {
    feature: "Compliance LGPD nativo",
    linktree: "no",
    sourceAuthority: "yes",
  },
];

function CellIcon({ cell, label }: { cell: Cell; label?: string }) {
  if (cell === "yes") {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
        <Check className="size-4" aria-hidden />
        {label ?? "Incluso"}
      </span>
    );
  }
  if (cell === "paywall") {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Lock className="size-4" aria-hidden />
        {label ?? "Plano pago"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground/60">
      <X className="size-4" aria-hidden />
      Não tem
    </span>
  );
}

export function ComparativoLinktree() {
  return (
    <section className="border-t border-border/60 py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            O que Source Authority tem que Linktree{" "}
            <span className="text-muted-foreground">não tem.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground">
            Comparativo direto de features. Sem letras miúdas.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border bg-secondary/30 px-6 py-4 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-3 sm:gap-x-6 sm:px-8">
            <span>Feature</span>
            <span className="text-right sm:text-left">Linktree</span>
            <span className="text-right sm:text-left">Source Authority</span>
          </div>

          <ul>
            {rows.map((row, idx) => (
              <li
                key={row.feature}
                className={
                  "grid grid-cols-[1fr_auto_auto] gap-x-4 px-6 py-4 sm:grid-cols-3 sm:gap-x-6 sm:px-8" +
                  (idx < rows.length - 1 ? " border-b border-border/60" : "")
                }
              >
                <span className="text-sm font-medium">{row.feature}</span>
                <span className="text-right sm:text-left">
                  <CellIcon cell={row.linktree} label={row.linktreeLabel} />
                </span>
                <span className="text-right sm:text-left">
                  <CellIcon
                    cell={row.sourceAuthority}
                    label={row.sourceAuthorityLabel}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
