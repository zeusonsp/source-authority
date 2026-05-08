/**
 * Tipos compartilhados entre Server Component (page.tsx) e Client
 * Component (relatorios-client.tsx) da página /relatorios.
 *
 * Server agrega tudo em memória (~hundreds-to-thousands events em
 * dogfood escala) e passa apenas datasets compactos pro client. Tech
 * debt: trocar por RPC server-side quando >10k events/empresa virar
 * gargalo medido (mesmo padrão do dashboard).
 */

export type DateRange = {
  /** ISO 8601 timestamp inclusivo. */
  from: string;
  /** ISO 8601 timestamp inclusivo. */
  to: string;
  /** Preset selecionado, ou 'custom' se range customizado. */
  preset: ReportPreset;
};

export type ReportPreset = "24h" | "7d" | "30d" | "90d" | "custom";

export const PRESET_LABEL: Record<ReportPreset, string> = {
  "24h": "Últimas 24h",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  custom: "Personalizado",
};

export type Bucket = {
  /** ISO 8601 timestamp do início do bucket (hora ou dia). */
  bucket: string;
  clicks: number;
};

export type CountryCount = {
  /** ISO 3166-1 alpha-2. */
  country: string;
  clicks: number;
};

export type DeviceCount = {
  device: "mobile" | "desktop" | "tablet" | "unknown";
  clicks: number;
};

export type LabeledCount = {
  label: string;
  clicks: number;
};

export type ReportDataset = {
  range: DateRange;
  kpis: {
    total: number;
    last24h: number;
    countries: number;
    activeDays: number;
  };
  /** 24 buckets (uma por hora) das últimas 24h. Zero-fill incluído. */
  hourly: Bucket[];
  /** N buckets (um por dia) cobrindo todo o range. Zero-fill incluído. */
  daily: Bucket[];
  /** Top 50 países por cliques, decrescente. */
  topCountries: CountryCount[];
  byDevice: DeviceCount[];
  /** Top 10 idiomas. */
  byLang: LabeledCount[];
  /** Top 10 origens (domínio extraído do referrer; 'direto' se null). */
  byReferrer: LabeledCount[];
  /**
   * Pillar 3 v1 — Top revendedores por cliques.
   * Cada item junta o `referrer_code` (raw da URL ?ref=) com o `name`
   * cadastrado em /revendedores (se existir). Codes não-cadastrados
   * aparecem com label `<código>` mesmo. Ordenado desc por cliques,
   * top 10.
   */
  topReferrers: ReferrerCount[];
};

export type ReferrerCount = {
  /** Code raw como veio na URL (ex: 'ana', 'instagram'). */
  code: string;
  /** Nome amigável (do reseller_codes.name). null = não cadastrado. */
  name: string | null;
  clicks: number;
  /** Percentual sobre total de events com referrer_code (0-100). */
  pct: number;
};

/** Subset das colunas de events que precisamos pra agregar. */
export type EventForAggregation = {
  created_at: string;
  ip_country: string | null;
  device: string | null;
  lang: string | null;
  referrer: string | null;
  /** Pillar 3 v1 — código de revendedor capturado pelo tracker. */
  referrer_code: string | null;
};
