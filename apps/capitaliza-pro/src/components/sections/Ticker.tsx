/**
 * Ticker horizontal no topo. Anuncia prêmios, ganhadores e
 * próximo sorteio. Estilo "popular brasileira" (Resenha).
 *
 * Server Component — sem state. A animação é puro CSS (keyframes ticker).
 */

const ITEMS: ReadonlyArray<{ label: string; value?: string }> = [
  { label: "EM PRÊMIOS", value: "R$ 230.000,00" },
  { label: "ESSA QUARTA JÁ TEM GANHADOR" },
  { label: "NOVO SORTEIO QUINTA 21H" },
  { label: "GANHADORES EM 2026", value: "+400" },
  { label: "PIX em 5 minutos" },
  { label: "Auditado em blockchain Polygon" },
];

function TickerRow() {
  return (
    <div className="flex shrink-0 items-center gap-10 px-5">
      {ITEMS.map((item, i) => (
        <span
          key={i}
          className="flex items-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide text-white sm:text-base"
        >
          {item.value && (
            <span className="text-[#FFD700]">{item.value}</span>
          )}
          <span>{item.label}</span>
          <span aria-hidden className="text-[#FFD700]">
            |
          </span>
        </span>
      ))}
    </div>
  );
}

export function Ticker() {
  return (
    <div
      role="marquee"
      aria-label="Avisos rápidos: prêmios e próximos sorteios"
      className="relative overflow-hidden bg-[#054C2D] py-2.5"
    >
      <div className="flex animate-ticker">
        {/* Duplicado pra loop contínuo */}
        <TickerRow />
        <TickerRow />
      </div>
    </div>
  );
}
