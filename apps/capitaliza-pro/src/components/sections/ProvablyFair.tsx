"use client";

import { CheckCircle2, ExternalLink, Loader2, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoState = "idle" | "rolling" | "settled";

// Pseudo SHA-256 deterministic-looking string. Em produção, viria
// do hash real publicado on-chain — aqui é só visual.
function fakeHash(seed: number): string {
  const chars = "0123456789abcdef";
  let out = "0x";
  let x = seed;
  for (let i = 0; i < 64; i++) {
    x = (x * 9301 + 49297) % 233280;
    out += chars[Math.floor((x / 233280) * 16)];
  }
  return out;
}

export function ProvablyFair() {
  const [state, setState] = useState<DemoState>("idle");
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [hash, setHash] = useState<string>("");
  const [rollingNumber, setRollingNumber] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up timers on unmount pra evitar setState após unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function runDemo() {
    if (state === "rolling") return;

    setState("rolling");
    setWinningNumber(null);
    setHash("");

    if (intervalRef.current) clearInterval(intervalRef.current);

    // "Tumble" effect — number flips rapidly for visual flair
    intervalRef.current = setInterval(() => {
      setRollingNumber(Math.floor(Math.random() * 100));
    }, 50);

    // Settle after ~2.6s
    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const final = Math.floor(Math.random() * 100);
      setRollingNumber(final);
      setWinningNumber(final);
      setHash(fakeHash(Date.now()));
      setState("settled");
    }, 2600);
  }

  function reset() {
    setState("idle");
    setWinningNumber(null);
    setHash("");
  }

  return (
    <section
      id="provably-fair"
      className="relative border-t border-foreground/[0.04] py-24 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-40"
      />

      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-light/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Demonstração interativa
          </span>
          <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight md:text-5xl">
            Veja o sorteio <span className="text-accent">provably fair</span> em ação.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground md:text-lg">
            Em produção, o hash do resultado é publicado on-chain ANTES do
            sorteio começar. Impossível manipular. Verificável por qualquer um.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-foreground/[0.08] bg-card shadow-[0_8px_32px_-12px_rgb(0_0_0_/_0.12)]">
            {/* Top label */}
            <div className="flex items-center justify-between border-b border-foreground/[0.06] px-6 py-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "relative flex size-2 rounded-full",
                    state === "rolling"
                      ? "bg-accent animate-pulse"
                      : state === "settled"
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {state === "idle" && "Aguardando início"}
                  {state === "rolling" && "Sorteando..."}
                  {state === "settled" && "Sorteio concluído"}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Sorteio #128 · simulação
              </span>
            </div>

            {/* Number display */}
            <div className="flex flex-col items-center px-6 py-16">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Número sorteado
              </p>
              <div
                className={cn(
                  "relative font-extrabold tabular-nums tracking-tight transition-all duration-500",
                  state === "settled" ? "text-accent" : "text-foreground",
                  "text-[8rem] leading-none md:text-[12rem]",
                )}
                aria-live="polite"
                aria-atomic="true"
              >
                {state === "idle"
                  ? "—"
                  : String(
                      state === "settled" ? winningNumber ?? 0 : rollingNumber,
                    ).padStart(2, "0")}
              </div>

              {/* Hash reveal */}
              <div
                className={cn(
                  "mt-12 w-full max-w-xl transition-all duration-500",
                  state === "settled"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none",
                )}
              >
                <div className="rounded-xl border border-foreground/[0.06] bg-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Hash SHA-256
                      </span>
                    </div>
                    <a
                      href="https://polygonscan.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-foreground"
                    >
                      Verificar on-chain
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <p className="mt-3 break-all font-mono text-[11px] leading-relaxed text-foreground/70">
                    {hash}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={runDemo}
                  disabled={state === "rolling"}
                  className={buttonClasses({
                    variant: "primary",
                    size: "lg",
                  })}
                >
                  {state === "rolling" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sorteando...
                    </>
                  ) : state === "settled" ? (
                    <>
                      <RefreshCw className="size-4" />
                      Sortear novamente
                    </>
                  ) : (
                    <>
                      <Play className="size-4 fill-current" />
                      Simular sorteio agora
                    </>
                  )}
                </button>

                {state === "settled" && (
                  <button
                    type="button"
                    onClick={reset}
                    className={buttonClasses({
                      variant: "ghost",
                      size: "lg",
                    })}
                  >
                    Resetar
                  </button>
                )}
              </div>
            </div>

            {/* Bottom explainer */}
            <div className="border-t border-foreground/[0.06] bg-secondary/40 px-6 py-5 text-center">
              <p className="mx-auto max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Esse mesmo processo, em produção, é registrado em{" "}
                <strong className="text-foreground">blockchain Polygon</strong>{" "}
                ANTES do sorteio começar — impossível manipular. Cada
                participante recebe link de verificação no WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
