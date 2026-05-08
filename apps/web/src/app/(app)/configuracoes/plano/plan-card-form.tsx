"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { createCheckoutSession } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { PLAN_LABELS, type PlanSlug } from "@/lib/billing/plans";

type Props = {
  company_id: string;
  plan: PlanSlug;
  isCurrent: boolean;
  isHighlight: boolean;
  disabled: boolean;
};

/**
 * Botão por card que dispara createCheckoutSession e faz hard-redirect pro
 * Stripe Checkout. Hard redirect (window.location) é necessário porque o
 * destino é fora do app — `router.push` do Next só funciona pra rotas
 * internas.
 *
 * Estado de erro: inline (texto vermelho), curto. Não usamos toast porque
 * shadcn/ui toast não está montado no projeto ainda.
 */
export function PlanCardForm({
  company_id,
  plan,
  isCurrent,
  isHighlight,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || pending) return;

    startTransition(async () => {
      const result = await createCheckoutSession({ company_id, plan });
      if ("url" in result) {
        // Hard redirect — Stripe Checkout é hospedagem externa.
        window.location.href = result.url;
        return;
      }
      // Erros: pra fase 1, log + alert simples. UX bonito vem depois.
      console.error("[plan-card] checkout error", result.error);
      alert(
        result.error === "forbidden"
          ? "Você não tem permissão pra alterar o plano."
          : "Não foi possível iniciar o checkout. Tente novamente em instantes.",
      );
    });
  }

  const label = isCurrent
    ? "Plano atual"
    : pending
      ? "Redirecionando..."
      : `Migrar para ${PLAN_LABELS[plan]}`;

  return (
    <form onSubmit={onSubmit} className="w-full">
      <Button
        type="submit"
        disabled={disabled}
        variant={isHighlight ? "default" : "secondary"}
        className="w-full"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {label}
      </Button>
    </form>
  );
}
