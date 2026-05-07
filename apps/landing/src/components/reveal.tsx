"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

// useLayoutEffect log warnings em SSR. Em server retorna no-op
// (useEffect); no client retorna o real (síncrono pré-paint).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealProps = {
  children: ReactNode;
  /** Delay em segundos antes do animation. Default 0. */
  delay?: number;
  className?: string;
  /** Distância em px do slide-up inicial. Default 24. */
  y?: number;
};

/**
 * Reveal SSR-friendly com progressive enhancement via Web Animations API.
 *
 * Estratégia em 3 fases:
 *
 * 1. SSR / no-JS: <div> sem styles inline. Conteúdo SEMPRE acessível
 *    pra crawlers, prévias de WhatsApp/LinkedIn, screenshot tools e
 *    usuários com JS desabilitado.
 *
 * 2. Hydration + useLayoutEffect (síncrono, pré-paint):
 *    - prefers-reduced-motion: reduce → no-op, conteúdo segue visível.
 *    - Já dentro da viewport inicial → no-op (não anima o que usuário
 *      não veria animar).
 *    - Abaixo da dobra → seta inline `opacity:0` + `transform` antes
 *      do primeiro paint pra não flickar.
 *
 * 3. IntersectionObserver dispara quando elemento entra no viewport
 *    (margem de -80px pra antecipar) → Web Animations API anima de
 *    hidden → visible. `fill: forwards` mantém o estado final.
 *
 * Vantagens vs framer-motion:
 * - SSR HTML 100% limpo (zero inline opacity:0 no curl).
 * - Bundle ~50 KB menor sem a dependência.
 * - prefers-reduced-motion respeitado nativamente.
 * - Zero React re-renders pra animar (Web Animations API é
 *   imperativo, browser-native).
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;
    // Síncrono pré-paint: nenhum frame visível com conteúdo "pulando".
    el.style.opacity = "0";
    el.style.transform = `translateY(${y}px)`;
  }, [y]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Pular setup do observer se layoutEffect não escondeu o elemento
    // (caso "já visível na viewport inicial"). Sem trabalho a fazer.
    if (el.style.opacity !== "0") return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.animate(
            [
              { opacity: 0, transform: `translateY(${y}px)` },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 600,
              delay: delay * 1000,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "forwards",
            },
          );
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
