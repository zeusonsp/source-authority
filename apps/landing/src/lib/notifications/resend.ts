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
 * `from` no Lote B usa onboarding@resend.dev (domínio do próprio Resend,
 * sandbox-friendly, sem precisar de SPF/DKIM no nosso domain). Lote B3
 * troca pra noreply@sourceauthority.com.br após DNS configurado em
 * Cloudflare.
 *
 * Retorna Result tipado pra Promise.allSettled no caller. Resend API
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

/**
 * Renderiza HTML do email de notificação de lead. Tema dark/dourado
 * Source Authority (mesmas variáveis hex do tailwind preset).
 *
 * Inline styles porque clientes de email (Outlook, Apple Mail) não
 * processam classes CSS nem media queries direito. Layout simples
 * pra max compatibilidade.
 */
export function renderLeadEmail(payload: {
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  employees: string;
  use_case: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  ip_address: string | null;
  user_agent: string | null;
}): string {
  const row = (label: string, value: string | null) =>
    `<tr>
      <td style="padding:8px 0;color:#A1A1A1;font-size:13px;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#FAFAFA;font-size:14px;">${value ?? "—"}</td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lead novo — Source Authority</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111111;border:1px solid #242424;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:1px solid #242424;">
              <h1 style="margin:0 0 4px;color:#FAFAFA;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                Source<span style="color:#C9A94B;">.</span>Authority
              </h1>
              <p style="margin:0;color:#A1A1A1;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Lead novo</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <h2 style="margin:0 0 16px;color:#FAFAFA;font-size:18px;font-weight:600;">
                ${payload.name}${payload.company ? ` · <span style="color:#C9A94B;">${payload.company}</span>` : ""}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("E-mail", payload.email)}
                ${row("Telefone", payload.phone)}
                ${row("Tamanho", payload.employees)}
                ${row("Use case", payload.use_case)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;">
              <hr style="margin:0 0 16px;border:0;border-top:1px solid #242424;">
              <p style="margin:0 0 8px;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Atribuição</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("UTM source", payload.utm_source)}
                ${row("UTM medium", payload.utm_medium)}
                ${row("UTM campaign", payload.utm_campaign)}
                ${row("Referrer", payload.referrer)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #242424;">
              <p style="margin:0 0 8px;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Forensics</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("IP", payload.ip_address)}
                ${row("User-Agent", payload.user_agent)}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
