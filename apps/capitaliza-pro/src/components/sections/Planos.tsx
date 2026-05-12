"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { cn, WHATSAPP_URL } from "@/lib/utils";

/**
 * 4 tiers de planos estilo Resenha. Card 3 destacado como MAIS VENDIDO.
 * Stepper de quantidade abaixo (1-100, default 48 — número simbólico
 * comum em sorteios populares). Total dinâmico.
 */

type Plano = {
  id: string;
  preco: string;
  precoNum: number;
  numeros: string;
  sorteios: string;
  beneficios: ReadonlyArray<string>;
  // Estilo do card
  variant: "navy" | "yellow" | "purple" | "purpleDark";
  destaque?: string;
};

const PLANOS: ReadonlyArray<Plano> = [
  {
    id: "starter",
    preco: "R$ 9,90",
    precoNum: 9.9,
    numeros: "10 números",
    sorteios: "1 sorteio",
    beneficios: ["10 números da sorte", "1 sorteio incluso", "Suporte 24/7 IA"],
    variant: "navy",
  },
  {
    id: "plus",
    preco: "R$ 14,85",
    precoNum: 14.85,
    numeros: "15 números",
    sorteios: "2 sorteios",
    beneficios: ["15 números da sorte", "2 sorteios inclusos", "Suporte 24/7 IA"],
    variant: "yellow",
  },
  {
    id: "premium",
    preco: "R$ 19,80",
    precoNum: 19.8,
    numeros: "20 números",
    sorteios: "3 sorteios",
    beneficios: [
      "20 números da sorte",
      "3 sorteios inclusos",
      "Bônus: prêmios diários",
      "Suporte 24/7 IA",
    ],
    variant: "purple",
    destaque: "Mais vendido",
  },
  {
    id: "vip",
    preco: "R$ 49,50",
    precoNum: 49.5,
    numeros: "50 números",
    sorteios: "3 sorteios + extra mensal",
    beneficios: [
      "50 números da sorte",
      "3 sorteios + 1 extra mensal",
      "Acesso VIP WhatsApp",
      "Cashback de 5% em PIX",
      "Suporte 24/7 IA",
    ],
    variant: "purpleDark",
  },
];

const CARD_STYLES: Record<Plano["variant"], { bg: string; text: string; bullet: string; btnBg: string; btnText: string }> = {
  navy: {
    bg: "bg-[#0F2A52]",
    text: "text-white",
    bullet: "text-[#FFD700]",
    btnBg: "bg-[#FFD700] hover:bg-[#FFCC00]",
    btnText: "text-[#054C2D]",
  },
  yellow: {
    bg: "bg-[#FFD700]",
    text: "text-[#054C2D]",
    bullet: "text-[#054C2D]",
    btnBg: "bg-[#054C2D] hover:bg-[#033922]",
    btnText: "text-white",
  },
  purple: {
    bg: "bg-gradient-to-br from-[#7C3AED] to-[#5C2D9C]",
    text: "text-white",
    bullet: "text-[#FFD700]",
    btnBg: "bg-[#FFD700] hover:bg-[#FFCC00]",
    btnText: "text-[#054C2D]",
  },
  purpleDark: {
    bg: "bg-[#3B1A6B]",
    text: "text-white",
    bullet: "text-[#FFD700]",
    btnBg: "bg-[#FFD700] hover:bg-[#FFCC00]",
    btnText: "text-[#054C2D]",
  },
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Planos() {
  const [qtd, setQtd] = useState(48);
  const PRECO_UNITARIO = 9.9;
  const total = useMemo(() => qtd * PRECO_UNITARIO, [qtd]);

  function dec() {
    setQtd((v) => Math.max(1, v - 1));
  }
  function inc() {
    setQtd((v) => Math.min(100, v + 1));
  }

  return (
    <section
      id="planos"
      className="relative bg-white py-14 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#5C2D9C]">
            Escolha seu plano
          </p>
          <h2 className="text-balance text-3xl font-extrabold uppercase text-[#054C2D] sm:text-5xl">
            Planos a partir de <span className="text-[#5C2D9C]">R$ 9,90</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Mais números = mais chances. Mais sorteios = mais oportunidades.
          </p>
        </div>

        {/* Grid de 4 cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PLANOS.map((p) => {
            const s = CARD_STYLES[p.variant];
            const isHighlight = !!p.destaque;
            return (
              <article
                key={p.id}
                className={cn(
                  "relative flex flex-col rounded-3xl p-6 shadow-xl transition-transform hover:-translate-y-1 sm:p-7",
                  s.bg,
                  s.text,
                  isHighlight && "lg:scale-[1.04] ring-4 ring-[#FFD700] ring-offset-2 ring-offset-white",
                )}
              >
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD700] px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-[#054C2D] shadow-md">
                    {p.destaque}
                  </div>
                )}

                <div className="mb-1 text-xs font-bold uppercase tracking-wider opacity-80">
                  {p.numeros}
                </div>
                <div className="mb-1 text-4xl font-extrabold leading-none sm:text-5xl">
                  {p.preco}
                </div>
                <div className="mb-5 text-sm font-medium opacity-85">
                  {p.sorteios}
                </div>

                <ul className="mb-7 space-y-2.5 text-sm">
                  {p.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className={cn("mt-0.5 size-4 shrink-0", s.bullet)} strokeWidth={3} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-extrabold uppercase tracking-wide shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg",
                    s.btnBg,
                    s.btnText,
                  )}
                >
                  Comprar
                </Link>
              </article>
            );
          })}
        </div>

        {/* Stepper de quantidade */}
        <div className="mx-auto mt-12 max-w-2xl rounded-3xl border-2 border-[#FFD700] bg-[#FFF9DC] p-6 sm:mt-16 sm:p-8">
          <p className="mb-2 text-center text-sm font-extrabold uppercase tracking-wider text-[#5C2D9C]">
            Monte sua quantidade
          </p>
          <h3 className="mb-6 text-center text-2xl font-extrabold text-[#054C2D] sm:text-3xl">
            Compra livre — escolha quantos números você quer
          </h3>

          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div className="flex items-center gap-3 rounded-full border-2 border-[#054C2D] bg-white p-1.5 shadow-md">
              <button
                type="button"
                onClick={dec}
                disabled={qtd <= 1}
                aria-label="Diminuir quantidade"
                className="flex size-11 items-center justify-center rounded-full bg-[#054C2D] text-white transition-colors hover:bg-[#033922] disabled:opacity-40"
              >
                <Minus className="size-5" strokeWidth={3} />
              </button>
              <span
                aria-live="polite"
                aria-label={`Quantidade selecionada: ${qtd}`}
                className="min-w-[3.5rem] text-center text-3xl font-extrabold text-[#054C2D]"
              >
                {qtd}
              </span>
              <button
                type="button"
                onClick={inc}
                disabled={qtd >= 100}
                aria-label="Aumentar quantidade"
                className="flex size-11 items-center justify-center rounded-full bg-[#054C2D] text-white transition-colors hover:bg-[#033922] disabled:opacity-40"
              >
                <Plus className="size-5" strokeWidth={3} />
              </button>
            </div>

            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="text-3xl font-extrabold text-[#054C2D] sm:text-4xl">
                {formatBRL(total)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5C2D9C] to-[#7C3AED] px-8 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(92,45,156,0.7)] animate-shine sm:h-16 sm:px-12 sm:text-lg"
            >
              Comprar {qtd} {qtd === 1 ? "número" : "números"} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
