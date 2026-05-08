/**
 * Tipos do domínio Alerts (Fase 5 — Pilar 2: detecção de marca).
 *
 * Definidos manualmente até a migration 0008_alerts ser aplicada e
 * `database.types.ts` ser regenerado. Quando isso acontecer, esses
 * tipos viram alias de `Tables<"alerts">` (mesma forma) — esse arquivo
 * pode ser removido sem mudar consumidores.
 *
 * Match com SQL CHECK constraints em 0008_alerts.sql.
 */

export const ALERT_TYPES = [
  "domain_squat",
  "ct_log_match",
  "dns_anomaly",
  "mention",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["low", "medium", "high"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = [
  "new",
  "triaged",
  "dismissed",
  "resolved",
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export type AlertRow = {
  id: string;
  company_id: string;
  created_at: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  /** Type-specific payload — schema varia por `type`. */
  data: Record<string, unknown>;
  triaged_at: string | null;
  triaged_by: string | null;
};

/**
 * Labels PT-BR pra exibição. Mapeamento centralizado pra evitar
 * espalhar strings na UI.
 */
export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  domain_squat: "Domínio sound-alike",
  ct_log_match: "Certificado SSL suspeito",
  dns_anomaly: "Anomalia DNS",
  mention: "Menção na web",
};

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  new: "Novo",
  triaged: "Triado",
  dismissed: "Descartado",
  resolved: "Resolvido",
};

/**
 * Type guards pra extrair campos do `data` JSONB com segurança.
 * Workers que inserem alerts devem populá-los conforme o schema do tipo;
 * tratamos como `unknown` no client e validamos antes de exibir.
 */
export function getDomainSquatData(data: Record<string, unknown>): {
  domain: string;
  similarity?: number;
  registrar?: string;
} | null {
  const domain = typeof data.domain === "string" ? data.domain : null;
  if (!domain) return null;
  return {
    domain,
    similarity:
      typeof data.similarity === "number" ? data.similarity : undefined,
    registrar:
      typeof data.registrar === "string" ? data.registrar : undefined,
  };
}

export function getCtLogMatchData(data: Record<string, unknown>): {
  domain: string;
  issuer?: string;
  valid_from?: string;
} | null {
  const domain = typeof data.domain === "string" ? data.domain : null;
  if (!domain) return null;
  return {
    domain,
    issuer: typeof data.issuer === "string" ? data.issuer : undefined,
    valid_from:
      typeof data.valid_from === "string" ? data.valid_from : undefined,
  };
}

export function getMentionData(data: Record<string, unknown>): {
  source_url: string;
  snippet?: string;
} | null {
  const source_url =
    typeof data.source_url === "string" ? data.source_url : null;
  if (!source_url) return null;
  return {
    source_url,
    snippet: typeof data.snippet === "string" ? data.snippet : undefined,
  };
}
