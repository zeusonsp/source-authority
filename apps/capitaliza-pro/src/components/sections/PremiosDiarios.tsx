import Link from "next/link";
import { Gift } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

/**
 * Banner verde menor entre Premiados e CSR. Anuncia sorteios diários
 * de R$ 5.000. CTA amarelo bem chamativo.
 */
export function PremiosDiarios() {
  return (
    <section
      aria-label="Prêmios diários"
      className="relative overflow-hidden bg-[#054C2D] py-10 sm:py-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #FFD700 0 2px, transparent 2px 14px)",
        }}
      />
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFD700] text-[#054C2D] shadow-lg sm:size-16">
              <Gift className="size-7 sm:size-8" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#FFD700] sm:text-sm">
                Prêmios diários
              </p>
              <h3 className="text-2xl font-extrabold uppercase text-white sm:text-3xl lg:text-4xl">
                Concorra <span className="text-[#FFD700]">todos os dias</span> a R$ 5.000
              </h3>
            </div>
          </div>
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#FFD700] px-8 text-base font-extrabold uppercase tracking-wide text-[#054C2D] shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#FFCC00] hover:shadow-xl sm:h-16 sm:px-10 sm:text-lg"
          >
            Quero participar
          </Link>
        </div>
      </div>
    </section>
  );
}
