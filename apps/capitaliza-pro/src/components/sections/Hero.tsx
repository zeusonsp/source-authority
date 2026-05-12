import Link from "next/link";
import { Shield, Zap, Bot } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

/**
 * Hero massivo estilo Resenha. Verde escuro de fundo, prêmios em
 * amarelo gigante (3 EM 1), foto de pessoas felizes representativa
 * via avatares SVG (placeholder até cliente entregar fotos reais).
 *
 * Layout 2 colunas no desktop, stack no mobile (mobile-first).
 */

type Premio = { valor: string; data: string; destaque?: boolean };
const PREMIOS: ReadonlyArray<Premio> = [
  { valor: "R$ 100 MIL", data: "06 de junho", destaque: true },
  { valor: "R$ 50 MIL", data: "23 de maio" },
  { valor: "R$ 10 MIL", data: "16 de maio" },
];

const SELOS = [
  { icon: Shield, text: "Auditado em blockchain" },
  { icon: Zap, text: "PIX em 5min" },
  { icon: Bot, text: "Atendimento 24/7 IA" },
] as const;

/**
 * Avatar placeholder vetorial. Cliente entrega fotos reais depois.
 * Representatividade: 3 pessoas felizes, diversidade brasileira.
 */
function AvatarTrio() {
  const people = [
    { bg: "#F59E0B", initial: "M", label: "Maria" },
    { bg: "#5C2D9C", initial: "J", label: "João" },
    { bg: "#16A34A", initial: "A", label: "Ana" },
  ];
  return (
    <div className="relative mx-auto flex w-full max-w-md items-end justify-center gap-3 sm:gap-4">
      {people.map((p, i) => (
        <div
          key={p.label}
          className="relative flex flex-col items-center"
          style={{ zIndex: i === 1 ? 2 : 1 }}
        >
          <div
            aria-label={`Avatar de ${p.label}`}
            className="flex aspect-square w-24 items-center justify-center rounded-full border-4 border-[#FFD700] text-3xl font-extrabold text-white shadow-2xl sm:w-32 sm:text-4xl lg:w-40 lg:text-5xl"
            style={{
              backgroundColor: p.bg,
              transform: i === 1 ? "translateY(-12px) scale(1.1)" : undefined,
            }}
          >
            {p.initial}
          </div>
          <div className="mt-2 text-xs font-bold text-white/80 sm:text-sm">
            {p.label}*
          </div>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[#054C2D] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #FFD700 0 2px, transparent 2px 16px)",
        }}
      />

      <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Esquerda — copy + prêmios + CTAs */}
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex animate-gold-pulse items-center gap-2 rounded-full bg-[#FFD700] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#054C2D] sm:text-sm">
              <span className="size-2 rounded-full bg-[#054C2D]" />
              União de prêmios
            </div>

            <h1 className="mb-3 text-balance text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Super Combo
              <br />
              <span className="text-[#FFD700]">Especial</span>
            </h1>
            <p className="mb-7 text-2xl font-extrabold text-[#FFD700] sm:text-4xl lg:text-5xl">
              3 EM 1
            </p>

            <ul className="mb-8 space-y-3 lg:space-y-4">
              {PREMIOS.map((p) => (
                <li
                  key={p.valor}
                  className={
                    p.destaque
                      ? "relative flex items-center justify-between gap-4 rounded-2xl border-4 border-[#FFD700] bg-[#FFD700] px-5 py-4 text-[#054C2D] shadow-xl sm:px-7 sm:py-5"
                      : "flex items-center justify-between gap-4 rounded-2xl border-2 border-[#FFD700]/40 bg-white/[0.06] px-5 py-3.5 backdrop-blur-sm sm:px-7 sm:py-4"
                  }
                >
                  <span
                    className={
                      p.destaque
                        ? "text-2xl font-extrabold sm:text-4xl lg:text-5xl"
                        : "text-xl font-extrabold text-[#FFD700] sm:text-3xl lg:text-4xl"
                    }
                  >
                    {p.valor}
                  </span>
                  <span
                    className={
                      p.destaque
                        ? "text-right text-xs font-bold uppercase sm:text-sm"
                        : "text-right text-xs font-bold uppercase text-white/85 sm:text-sm"
                    }
                  >
                    Sorteio
                    <br />
                    {p.data}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mb-7 text-lg font-medium text-white/85 sm:text-xl">
              3 chances de mudar de vida
            </p>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link
                href="#planos"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5C2D9C] to-[#7C3AED] px-7 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(92,45,156,0.7)] transition-all animate-shine hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(92,45,156,0.9)] sm:h-16 sm:px-9 sm:text-lg"
              >
                Comprar agora
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(37,211,102,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#1ebd5a] sm:h-16 sm:px-9 sm:text-lg"
              >
                <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.149-.669.15-.198.297-.768.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Quero por WhatsApp
              </a>
            </div>
          </div>

          {/* Direita — avatares + selos */}
          <div className="relative">
            <div className="relative mx-auto max-w-md">
              <AvatarTrio />

              <div className="absolute -right-2 -top-4 z-10 rotate-[-8deg] rounded-2xl border-4 border-white bg-[#FFD700] px-4 py-2 text-center shadow-2xl sm:-right-4 sm:-top-6 sm:px-5 sm:py-3">
                <div className="text-2xl font-extrabold leading-none text-[#054C2D] sm:text-3xl">
                  +400
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#054C2D] sm:text-xs">
                  Ganhadores
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {SELOS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.text}
                    className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-white/[0.08] px-3 py-2 text-xs font-bold backdrop-blur-sm sm:text-sm"
                  >
                    <Icon className="size-4 text-[#FFD700]" />
                    <span>{s.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
