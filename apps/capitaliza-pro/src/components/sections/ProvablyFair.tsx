"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Demo interativo provably fair. Quando clica, 100 números embaralham
 * por ~3s (interval ~50ms), param em 1, mostra hash SHA-256 mock +
 * link pra polygonscan mock. Em produção, esse hash é registrado em
 * blockchain ANTES do sorteio começar.
 */

type Status = "idle" | "spinning" | "done";

// Hash mock fixo. Em produção, é o hash real do bloco.
const MOCK_HASH = "0x8f3a9c2b7e1d4f6a5c8b9e2d1a7f3c6b8e9d2a4c5f1b7e3d9a6c2f4b8e1d7a3c";
const MOCK_POLYGONSCAN =
  "https://polygonscan.com/tx/0x8f3a9c2b7e1d4f6a5c8b9e2d1a7f3c6b8e9d2a4c5f1b7e3d9a6c2f4b8e1d7a3c";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function ProvablyFair() {
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState(48);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup ao desmontar — evita leak do interval/timeout
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function start() {
    if (status === "spinning") return;
    setStatus("spinning");

    intervalRef.current = setInterval(() => {
      setCurrent(Math.floor(Math.random() * 100) + 1);
    }, 50);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Para em 1 — número simbólico do "número da sorte"
      setCurrent(1);
      setStatus("done");
    }, 3000);
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    setCurrent(48);
    setStatus("idle");
  }

  return (
    <section
      id="provably-fair"
      className="relative overflow-hidden bg-[#054C2D] py-14 text-white sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, #FFD700 0 2px, transparent 2px 16px)",
        }}
      />
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#FFD700]">
            Provably Fair
          </p>
          <h2 className="text-balance text-3xl font-extrabold uppercase sm:text-5xl">
            O sorteio é <span className="text-[#FFD700]">AUDITÁVEL</span>
            <br />
            veja como funciona
          </h2>
          <p className="mt-4 text-base text-white/85 sm:text-lg">
            Clique no botão e veja a aleatoriedade ao vivo.
          </p>
        </div>

        {/* Demo card */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-3xl border-2 border-[#FFD700] bg-white/[0.06] p-6 backdrop-blur-sm sm:p-10">
            {/* Display do número */}
            <div className="mb-7 flex flex-col items-center">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#FFD700]">
                {status === "done"
                  ? "Número sorteado"
                  : status === "spinning"
                    ? "Sorteando..."
                    : "Aguardando sorteio"}
              </div>
              <div
                className={cn(
                  "flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-[#FFD700] bg-[#054C2D] text-6xl font-extrabold tabular-nums text-[#FFD700] shadow-2xl sm:h-44 sm:w-44 sm:text-7xl",
                  status === "spinning" && "animate-pulse",
                )}
                aria-live="polite"
              >
                {pad(current)}
              </div>
            </div>

            {/* Botão */}
            {status !== "done" ? (
              <button
                type="button"
                onClick={start}
                disabled={status === "spinning"}
                className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5C2D9C] to-[#7C3AED] px-6 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(92,45,156,0.7)] transition-all animate-shine hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:h-16 sm:text-lg"
              >
                <Play className="size-5 fill-current" />
                {status === "spinning" ? "Sorteando..." : "Simular sorteio agora"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-[#FFD700]/60 bg-black/30 p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#FFD700]">
                    <CheckCircle2 className="size-4" />
                    Hash SHA-256 do sorteio
                  </div>
                  <code className="block break-all rounded-md bg-black/40 px-3 py-2 font-mono text-[11px] text-[#FFD700] sm:text-sm">
                    {MOCK_HASH}
                  </code>
                  <a
                    href={MOCK_POLYGONSCAN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFD700] underline-offset-4 hover:underline sm:text-sm"
                  >
                    Ver na Polygonscan
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="mx-auto flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-full border-2 border-[#FFD700] bg-transparent px-6 text-sm font-extrabold uppercase tracking-wide text-[#FFD700] transition-all hover:bg-[#FFD700] hover:text-[#054C2D]"
                >
                  <RefreshCw className="size-4" />
                  Simular de novo
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-white/80 sm:text-base">
            Em produção, esse hash é registrado em blockchain{" "}
            <strong className="text-[#FFD700]">ANTES</strong> do sorteio começar.
            Impossível manipular o resultado.
          </p>
        </div>
      </div>
    </section>
  );
}
