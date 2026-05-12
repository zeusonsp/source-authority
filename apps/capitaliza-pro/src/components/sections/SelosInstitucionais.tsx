/**
 * Faixa branca abaixo do hero com selos institucionais.
 * Inclui SUSEP, Via Cap (placeholder), reCAPTCHA Google,
 * Polygon Auditado e Claude AI como diferenciais tech.
 */

type Selo = { label: string; subtitle: string; novo?: boolean };
const SELOS: ReadonlyArray<Selo> = [
  { label: "SUSEP", subtitle: "Autorizado" },
  { label: "Via Cap", subtitle: "Sociedade Emissora" },
  { label: "reCAPTCHA", subtitle: "Google Protected" },
  { label: "Polygon", subtitle: "Auditado on-chain", novo: true },
  { label: "Claude AI", subtitle: "Atendimento 24/7", novo: true },
];

export function SelosInstitucionais() {
  return (
    <section
      aria-label="Selos e parceiros institucionais"
      className="border-y border-[#F4F4F4] bg-[#F4F4F4] py-6 sm:py-8"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {SELOS.map((selo) => (
            <div
              key={selo.label}
              className="relative flex flex-col items-center justify-center text-center"
            >
              {selo.novo && (
                <span className="absolute -top-2 right-1/2 translate-x-[60%] rounded-full bg-[#FFD700] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#054C2D] shadow-sm">
                  Novo
                </span>
              )}
              <div className="text-base font-extrabold uppercase tracking-tight text-[#054C2D] sm:text-lg">
                {selo.label}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                {selo.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
