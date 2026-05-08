import "server-only";

import {
  ALERT_SEVERITY_LABEL,
  ALERT_TYPE_LABEL,
  getCtLogMatchData,
  getDomainSquatData,
  getMentionData,
  type AlertRow,
  type AlertSeverity,
} from "@/lib/alerts/types";

type CompanyForEmail = {
  id: string;
  name: string;
};

type RecipientContext = {
  role?: string;
  appUrl?: string;
};

const DEFAULT_APP_URL = "https://app.sourceauthority.com.br";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resumo curto type-specific (até 80 chars) — ex: "domain.com · GoDaddy"
 * pra mostrar na linha do digest sem abrir o alerta.
 */
function shortBody(alert: AlertRow): string {
  const truncate = (s: string) =>
    s.length > 80 ? `${s.slice(0, 77)}...` : s;

  switch (alert.type) {
    case "ct_log_match": {
      const d = getCtLogMatchData(alert.data);
      if (!d) return "—";
      const parts = [d.domain, d.issuer].filter(Boolean) as string[];
      return truncate(parts.join(" · "));
    }
    case "domain_squat": {
      const d = getDomainSquatData(alert.data);
      if (!d) return "—";
      const parts = [d.domain, d.registrar].filter(Boolean) as string[];
      return truncate(parts.join(" · "));
    }
    case "mention": {
      const d = getMentionData(alert.data);
      if (!d) return "—";
      const parts = [d.source_url, d.snippet].filter(Boolean) as string[];
      return truncate(parts.join(" · "));
    }
    case "dns_anomaly":
    default:
      return "—";
  }
}

/**
 * Indicador visual de severidade. Bolinhas preenchidas vs vazias
 * (alta=●●●, média=●●○, baixa=●○○). Char unicode renderiza em todo
 * cliente de email moderno; fallback é só "alta/média/baixa" em texto.
 */
function severityIcon(severity: AlertSeverity): string {
  switch (severity) {
    case "high":
      return "&#9679;&#9679;&#9679;";
    case "medium":
      return "&#9679;&#9679;&#9675;";
    case "low":
      return "&#9679;&#9675;&#9675;";
  }
}

function formatDateBR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return iso;
  }
}

function renderRow(alert: AlertRow, appUrl: string): string {
  const link = `${appUrl}/alertas#${alert.id}`;
  return `<tr>
    <td style="padding:12px 8px;border-bottom:1px solid #1F1F1F;color:#C9A94B;font-size:14px;font-family:monospace;white-space:nowrap;vertical-align:top;">
      ${severityIcon(alert.severity)}
    </td>
    <td style="padding:12px 8px;border-bottom:1px solid #1F1F1F;vertical-align:top;">
      <p style="margin:0 0 4px;color:#FAFAFA;font-size:14px;font-weight:600;">${escapeHtml(ALERT_TYPE_LABEL[alert.type])}</p>
      <p style="margin:0;color:#A1A1A1;font-size:12px;word-break:break-word;">${escapeHtml(shortBody(alert))}</p>
    </td>
    <td style="padding:12px 8px;border-bottom:1px solid #1F1F1F;color:#A1A1A1;font-size:12px;white-space:nowrap;vertical-align:top;">
      ${escapeHtml(formatDateBR(alert.created_at))}
    </td>
    <td style="padding:12px 8px;border-bottom:1px solid #1F1F1F;vertical-align:top;text-align:right;">
      <a href="${link}" style="color:#C9A94B;font-size:13px;text-decoration:none;">Abrir &rarr;</a>
    </td>
  </tr>`;
}

function renderGroup(
  title: string,
  alerts: AlertRow[],
  appUrl: string,
): string {
  if (alerts.length === 0) return "";
  return `<tr>
    <td colspan="4" style="padding:20px 8px 8px;">
      <p style="margin:0;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${escapeHtml(title)} (${alerts.length})</p>
    </td>
  </tr>
  ${alerts.map((a) => renderRow(a, appUrl)).join("")}`;
}

/**
 * Renderiza HTML do digest diário (09:00 BRT) de alertas.
 * Agrupa por severidade (high → medium → low) — alertas high só aparecem
 * aqui se vazaram do envio imediato (ex: digest catch-up após outage).
 */
export function renderAlertDigestEmail(
  alerts: AlertRow[],
  company: CompanyForEmail,
  ctx: RecipientContext = {},
): string {
  const appUrl = ctx.appUrl ?? DEFAULT_APP_URL;
  const role = ctx.role ?? "membro";

  const high = alerts.filter((a) => a.severity === "high");
  const medium = alerts.filter((a) => a.severity === "medium");
  const low = alerts.filter((a) => a.severity === "low");

  const total = alerts.length;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Resumo diário &mdash; Source Authority</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#111111;border:1px solid #242424;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #242424;">
              <h1 style="margin:0 0 4px;color:#FAFAFA;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                Source<span style="color:#C9A94B;">.</span>Authority &mdash; Resumo diário
              </h1>
              <p style="margin:0;color:#A1A1A1;font-size:13px;">
                ${total} ${total === 1 ? "alerta" : "alertas"} em ${escapeHtml(company.name)} nas últimas 24h.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding:8px;text-align:left;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;width:60px;">Sev.</th>
                    <th style="padding:8px;text-align:left;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Alerta</th>
                    <th style="padding:8px;text-align:left;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;width:90px;">Quando</th>
                    <th style="padding:8px;text-align:right;color:#A1A1A1;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;width:70px;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderGroup(`${ALERT_SEVERITY_LABEL.high} severidade`, high, appUrl)}
                  ${renderGroup(`${ALERT_SEVERITY_LABEL.medium} severidade`, medium, appUrl)}
                  ${renderGroup(`${ALERT_SEVERITY_LABEL.low} severidade`, low, appUrl)}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 16px;border-top:1px solid #242424;" align="left">
              <a href="${appUrl}/alertas" style="color:#C9A94B;font-size:14px;font-weight:600;text-decoration:none;">Ver todos em /alertas &rarr;</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
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
