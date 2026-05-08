import "server-only";

import { env } from "@/lib/env-server";

export type ResendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

/**
 * Envia email via Resend REST API. Sem SDK — fetch direto.
 *
 * Portado de `apps/landing/src/lib/notifications/resend.ts` (mesma conta
 * Resend, domínio `sourceauthority.com.br` já verificado). Lá no landing
 * é usado pra leads; aqui no web é pra alertas (immediate + daily digest).
 *
 * Retorna Result tipado pra `Promise.allSettled` no caller. Resend API
 * retorna `id` no sucesso (UUID do email no painel deles).
 */
export async function sendResendEmail(
  input: SendEmailInput,
): Promise<ResendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      return {
        ok: false,
        error: `resend api ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "<no id>" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `resend fetch failed: ${msg}` };
  }
}
