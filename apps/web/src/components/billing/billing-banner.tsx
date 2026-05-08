"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { createPortalSession } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

type Props = {
  company_id: string;
  billing_status: string;
};

/**
 * Banner global mostrado em todo (app) quando billing_status === 'past_due'.
 * Render só no caso problema — nada quando active/trialing/none.
 *
 * Fica posicionado no topo da página (componente é fluido, container layout
 * decide onde encaixa). Botão "Atualizar pagamento" abre o Customer Portal
 * onde user troca cartão; webhook invoice.payment_succeeded vai limpar o
 * past_due automaticamente.
 *
 * Cor: borda/fundo destructive da paleta (vermelho-acinzentado, mesmo padrão
 * de Alert variant="destructive"). Não usei amarelo porque não temos token
 * de warning na paleta — destructive é o mais próximo de "atenção urgente".
 */
export function BillingBanner({ company_id, billing_status }: Props) {
  const [pending, startTransition] = useTransition();

  if (billing_status !== "past_due") return null;

  function onClick() {
    if (pending) return;
    startTransition(async () => {
      const result = await createPortalSession({ company_id });
      if ("url" in result) {
        window.location.href = result.url;
        return;
      }
      console.error("[billing-banner] portal error", result.error);
      alert(
        result.error === "no_customer"
          ? "Sua empresa ainda não tem cliente Stripe — assine um plano primeiro."
          : "Não foi possível abrir o portal de pagamento. Tente novamente.",
      );
    });
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <p className="flex-1 leading-relaxed">
        <strong className="font-semibold">Pagamento pendente.</strong>{" "}
        Atualize seu cartão pra não perder acesso à plataforma.
      </p>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={onClick}
        disabled={pending}
        className="shrink-0"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Atualizar pagamento
      </Button>
    </div>
  );
}
