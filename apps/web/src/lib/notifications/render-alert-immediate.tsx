import "server-only";

import {
  ALERT_SEVERITY_LABEL,
  ALERT_TYPE_LABEL,
  getCtLogMatchData,
  getDomainSquatData,
  getMentionData,
  type AlertRow,
} from "@/lib/alerts/types";

type CompanyForEmail = {
  id: string;
  name: string;
};

type RecipientContext = {
  /** Role do destinatário pra texto no rodapé ("owner" / "admin"). */
  role?: string;
  /** Base URL do app, default https://app.sourceauthority.com.br. */
  appUrl?: string;
};

const DEFAULT_APP_URL = "https://app.sourceauthority.com.br";

/**
 * Escape HTML básico pra evitar quebra de layout em strings vindas do
 * `data` jsonb (domain, snippet, source_url, etc). Não tenta proteger
 * contra XSS porque Resend não renderiza JS — é só por correção visual
 * em chars que quebram tag (< > &).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Linha de campo (label/value) usada no corpo do email.
 */
function row(label: string, value: string | null | undefined): string {
  return `<tr>
    <td style="padding:8px 0;color:#A1A1A1;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#FAFAFA;font-size:14px;word-break:break-word;">${value ? escapeHtml(value) : "&mdash;"}</td>
  </tr>`;
}

/**
 * Renderiza bloco type-specific do payload. Type-narrow via os helpers
 * `getXxxData` definidos em `@/lib/alerts/types`.
 */
function renderTypeBody(alert: AlertRow): string {
  switch (alert.type) {
    case "ct_log_match": {
      const d = getCtLogMatchData(alert.data);
      if (!d) return defaultBody();
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Domínio", d.domain)}
        ${row("Emissor", d.issuer)}
        ${row("Válido desde", d.valid_from)}
      </table>`;
    }
    case "domain_squat": {
      const d = getDomainSquatData(alert.data);
      if (!d) return defaultBody();
      const sim =
        typeof d.similarity === "number" ? `${d.similarity.toFixed(2)}` : null;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Domínio", d.domain)}
        ${row("Similaridade", sim)}
        ${row("Registrar", d.registrar)}
      </table>`;
    }
    case "mention": {
      const d = getMentionData(alert.data);
      if (!d) return defaultBody();
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("URL", d.source_url)}
        ${row("Trecho", d.snippet)}
      </table>`;
    }
    case "dns_anomaly":
    default:
      return defaultBody();
  }
}

function defaultBody(): string {
  return `<p style="margin:0;color:#A1A1A1;font-size:14px;">Detalhes em <a href="${DEFAULT_APP_URL}/alertas" style="color:#C9A94B;text-decoration:none;">/alertas</a>.</p>`;
}

/**
 * Renderiza HTML do email de alerta imediato (severity='high').
 * Inline styles + table layout pra max compatibilidade (Outlook, Apple
 * Mail, Gmail). Tema dark/dourado Source Authority.
 */
export function renderAlertImmediateEmail(
  alert: AlertRow,
  company: CompanyForEmail,
  ctx: RecipientContext = {},
): string {
  const appUrl = ctx.appUrl ?? DEFAULT_APP_URL;
  const role = ctx.role ?? "membro";
  const typeLabel = ALERT_TYPE_LABEL[alert.type];
  const severityLabel = ALERT_SEVERITY_LABEL[alert.severity];
  const investigateUrl = `${appUrl}/alertas#${alert.id}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(typeLabel)} &mdash; Source Authority</title>
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
              <p style="margin:0;color:#A1A1A1;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(typeLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 4px;color:#C9A94B;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Severidade ${escapeHtml(severityLabel)}</p>
              <h2 style="margin:0 0 16px;color:#FAFAFA;font-size:24px;font-weight:700;letter-spacing:-0.01em;">
                ${escapeHtml(typeLabel)}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;">
              ${renderTypeBody(alert)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#C9A94B;border-radius:8px;">
                    <a href="${investigateUrl}" style="display:inline-block;padding:12px 20px;color:#0A0A0A;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
                      Investigar em /alertas
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #242424;">
              <p style="margin:0;color:#A1A1A1;font-size:12px;line-height:1.5;">
                Você está recebendo porque é ${escapeHtml(role)} de ${escapeHtml(company.name)}.
                Configure preferências em
                <a href="${appUrl}/configuracoes" style="color:#C9A94B;text-decoration:none;">/configuracoes</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
