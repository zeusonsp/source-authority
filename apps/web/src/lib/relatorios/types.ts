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
    /** Pillar 3 v2 — número de conversões (vendas) no período. */
    conversions: number;
    /** Pillar 3 v2 — soma de amount_cents das conversões (BRL). */
    revenueCents: number;
    /** Conversion rate em pct (sales/clicks * 100). 0 se total=0. */
    conversionRate: number;
    /** Avg order value em centavos. 0 se conversions=0. */
    aovCents: number;
    /** % de conversões com reseller_code atribuído. */
    attributedPct: number;
  };
  /** 24 buckets (uma por hora) das últimas 24h. Zero-fill incluído. */
  hourly: Bucket[];
  /** N buckets (um por dia) cobrindo todo o range. Zero-fill incluído. */
  daily: Bucket[];
  /** Pillar 3 v2 — receita por dia (centavos). Mesma escala de bucket que daily. */
  dailyRevenue: RevenueBucket[];
  /** Top 50 países por cliques, decrescente. */
  topCountries: CountryCount[];
  byDevice: DeviceCount[];
  /** Top 10 idiomas. */
  byLang: LabeledCount[];
  /** Top 10 origens (domínio extraído do referrer; 'direto' se null). */
  byReferrer: LabeledCount[];
  /**
   * Pillar 3 v1+v2 — Top revendedores por receita > cliques.
   * Cada item junta o `referrer_code` com o `name` cadastrado em
   * /revendedores. Inclui sales + revenue + conversionRate.
   * Ordem: receita desc → clicks desc. Top 10.
   */
  topReferrers: ReferrerCount[];
  /**
   * Tier 2 — KPIs do período anterior (mesma duração, imediatamente
   * antes de range.from). NULL se não há dados ou período não cobrível
   * (ex: range customizado super antigo). UI computa deltas no client.
   */
  kpisPrevious: ReportDataset["kpis"] | null;
};

export type RevenueBucket = {
  /** YYYY-MM-DD UTC. */
  bucket: string;
  /** Centavos. */
  revenueCents: number;
  /** Vendas no dia. */
  sales: number;
};

export type ReferrerCount = {
  /** Code raw como veio na URL (ex: 'ana', 'instagram'). */
  code: string;
  /** Nome amigável (do reseller_codes.name). null = não cadastrado. */
  name: string | null;
  clicks: number;
  /** Percentual de clicks sobre total de events com referrer_code (0-100). */
  pct: number;
  /** Pillar 3 v2 — vendas atribuídas. */
  sales: number;
  /** Pillar 3 v2 — receita total em centavos (BRL). */
  revenueCents: number;
  /** Pillar 3 v2 — conversion rate em pct (sales/clicks * 100). */
  conversionRate: number;
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

/** Subset das colunas de conversions que precisamos pra agregar. */
export type ConversionForAggregation = {
  occurred_at: string;
  amount_cents: number;
  reseller_code: string | null;
};
