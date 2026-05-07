"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Distância inicial em px no eixo Y. Default 24. */
  y?: number;
};

const VARIANTS: Variants = {
  hidden: ({ y }: { y: number }) => ({ opacity: 0, y }),
  visible: { opacity: 1, y: 0 },
};

/**
 * Wrapper Apple-like de fade+slide-up ao entrar no viewport.
 *
 * Usa Intersection Observer interno do framer-motion (whileInView)
 * com `once: true` pra evitar animar repetidamente em scroll up/down.
 * Margin negativo no viewport antecipa o trigger antes de 100% no
 * frame, dando sensação de "já está aparecendo enquanto scroll".
 *
 * Curva de easing [0.22, 1, 0.36, 1] = "easeOutQuart"-ish, similar
 * à curva default de transições no Sketch/Figma — natural sem
 * exagero (anti-padrão Awwwards).
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      custom={{ y }}
      variants={VARIANTS}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
