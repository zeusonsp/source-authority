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
  "content_repost",
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
  content_repost: "Repost detectado",
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

/**
 * Extrai payload type-safe de alertas `content_repost`.
 *
 * Inserido por dois caminhos hoje:
 *   1. `/api/internal/content/reverse-search` (SerpAPI Google Reverse Image)
 *   2. `/api/internal/instagram/scan-hashtag` (IG Graph hashtag scanner)
 *
 * Schema documentado em CLAUDE.md / migration 0017. Os dois caminhos compartilham
 * `matched_content_id`, `hamming_distance`, `similarity_score`. Reverse search
 * tem `suspect_url`/`suspect_host`/`suspect_thumbnail`; hashtag scan usa
 * `ig_post_url`/`ig_post_username`/`thumbnail_url`. Normalizamos pra forma única
 * pra UI não precisar saber a origem (apesar de `discovery_engine` indicar).
 */
export function getContentRepostData(data: Record<string, unknown>): {
  suspect_url: string;
  suspect_host: string | null;
  suspect_title: string | null;
  suspect_thumbnail: string | null;
  suspect_snippet: string | null;
  matched_content_id: string;
  matched_content_title: string | null;
  matched_content_url: string | null;
  hamming_distance: number;
  similarity_score: number;
  discovery_engine: string | null;
  hashtag: string | null;
} | null {
  // Aceita ambos schemas: SerpAPI (suspect_*) e IG hashtag scan (ig_post_*).
  const suspect_url =
    typeof data.suspect_url === "string"
      ? data.suspect_url
      : typeof data.ig_post_url === "string"
        ? data.ig_post_url
        : null;
  const matched_content_id =
    typeof data.matched_content_id === "string"
      ? data.matched_content_id
      : null;
  const hamming_distance =
    typeof data.hamming_distance === "number" ? data.hamming_distance : null;
  const similarity_score =
    typeof data.similarity_score === "number" ? data.similarity_score : null;

  if (
    !suspect_url ||
    !matched_content_id ||
    hamming_distance === null ||
    similarity_score === null
  ) {
    return null;
  }

  // Host: prefere campo explícito, senão tenta derivar via URL parse.
  let suspect_host: string | null =
    typeof data.suspect_host === "string" ? data.suspect_host : null;
  if (!suspect_host) {
    try {
      suspect_host = new URL(suspect_url).hostname;
    } catch {
      suspect_host = null;
    }
  }

  const suspect_thumbnail =
    typeof data.suspect_thumbnail === "string"
      ? data.suspect_thumbnail
      : typeof data.thumbnail_url === "string"
        ? data.thumbnail_url
        : null;

  return {
    suspect_url,
    suspect_host,
    suspect_title:
      typeof data.suspect_title === "string" ? data.suspect_title : null,
    suspect_thumbnail,
    suspect_snippet:
      typeof data.suspect_snippet === "string"
        ? data.suspect_snippet
        : typeof data.ig_post_caption === "string"
          ? data.ig_post_caption
          : null,
    matched_content_id,
    matched_content_title:
      typeof data.matched_content_title === "string"
        ? data.matched_content_title
        : null,
    matched_content_url:
      typeof data.matched_content_url === "string"
        ? data.matched_content_url
        : null,
    hamming_distance,
    similarity_score,
    discovery_engine:
      typeof data.discovery_engine === "string"
        ? data.discovery_engine
        : null,
    hashtag: typeof data.hashtag === "string" ? data.hashtag : null,
  };
}

/**
 * Map técnico → humano pra `discovery_engine`. Fallback retorna o slug original.
 */
export const DISCOVERY_ENGINE_LABEL: Record<string, string> = {
  serpapi_google_reverse_image: "Google Reverse Image",
  instagram_hashtag: "Instagram Hashtag",
  instagram_graph: "Instagram Graph",
};
