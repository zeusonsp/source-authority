"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 3000;
const MAX_TRIES = 6;

type Status = "polling" | "ready" | "timeout";

type CheckStatusResponse = {
  status: string;
  has_subscription: boolean;
};

/**
 * Polling client — bate em /api/billing/check-status a cada 3s. Se webhook
 * processar dentro da janela (até 18s), refresh server component pra mostrar
 * estado final. Senão exibe "estamos confirmando, email cobre".
 *
 * Sem libs novas — usa setTimeout + AbortController padrão. Cleanup explícito
 * em useEffect pra evitar fetch órfão se o user navegar fora.
 */
export function PollingSucesso({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("polling");
  const [tries, setTries] = useState(0);
  // Refs pra evitar stale closures dentro do timeout.
  const triesRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const controller = new AbortController();

    async function pollOnce() {
      if (cancelledRef.current) return;
      try {
        const url = `/api/billing/check-status?session_id=${encodeURIComponent(sessionId)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          // Cache off — queremos estado fresco do DB a cada call.
          cache: "no-store",
        });
        if (!res.ok) {
          // 401/500 — para o polling, mostra timeout state.
          if (!cancelledRef.current) setStatus("timeout");
          return;
        }
        const data = (await res.json()) as CheckStatusResponse;
        if (cancelledRef.current) return;
        if (data.has_subscription) {
          setStatus("ready");
          // Server component re-fetch — mostra a página final de boas-vindas.
          router.refresh();
          return;
        }
        triesRef.current += 1;
        setTries(triesRef.current);
        if (triesRef.current >= MAX_TRIES) {
          setStatus("timeout");
          return;
        }
        // Próximo ciclo.
        window.setTimeout(pollOnce, POLL_INTERVAL_MS);
      } catch (err) {
        // AbortError = component desmontou, sem problema.
        if (err instanceof Error && err.name === "AbortError") return;
        if (!cancelledRef.current) setStatus("timeout");
      }
    }

    // Primeiro poll imediato — webhook pode já ter processado entre o redirect
    // do Stripe e o mount deste componente.
    pollOnce();

    return () => {
      cancelledRef.current = true;
      controller.abort();
    };
  }, [sessionId, router]);

  if (status === "ready") {
    // Transitório — router.refresh() vai trocar pra success state da page.tsx.
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Confirmado. Carregando...</p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Estamos confirmando seu pagamento
        </h1>
        <Alert>
          <AlertDescription>
            O Stripe ainda está processando. Você receberá um email em alguns
            minutos confirmando a assinatura. Não precisa fazer nada — pode
            voltar pro dashboard.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">Ir pro dashboard</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/configuracoes">Ver configurações</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Polling em andamento.
  return (
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto size-8 animate-spin text-accent" />
      <h1 className="text-2xl font-semibold tracking-tight">
        Confirmando pagamento...
      </h1>
      <p className="text-sm text-muted-foreground">
        Aguarde alguns segundos — estamos validando com o Stripe.
        {tries > 0 ? ` (tentativa ${tries}/${MAX_TRIES})` : ""}
      </p>
    </div>
  );
}
