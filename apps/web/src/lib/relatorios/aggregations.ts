import type {
  Bucket,
  CountryCount,
  DateRange,
  DeviceCount,
  EventForAggregation,
  LabeledCount,
  ReferrerCount,
  ReportDataset,
  ReportPreset,
} from "./types";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const PRESET_DAYS: Record<Exclude<ReportPreset, "custom">, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Resolve range de datas a partir de search params da URL.
 *
 * Prioridade:
 *   1. Se from + to ambos presentes e parsáveis, usa custom.
 *   2. Se preset='24h'|'7d'|'30d'|'90d', calcula range relativo a now.
 *   3. Default: 30 dias.
 *
 * Retorna sempre ISO 8601 strings inclusivos.
 */
export function resolveRange(
  searchParams?: { from?: string; to?: string; preset?: string },
): DateRange {
  const now = new Date();
  const fromParam = searchParams?.from;
  const toParam = searchParams?.to;
  const presetParam = searchParams?.preset as ReportPreset | undefined;

  // Custom range: ambos from+to presentes e válidos.
  if (fromParam && toParam) {
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      return {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        preset: "custom",
      };
    }
  }

  // Preset range.
  const preset: ReportPreset =
    presetParam && presetParam in PRESET_DAYS ? presetParam : "30d";
  const days = preset === "custom" ? 30 : PRESET_DAYS[preset];
  const to = now.toISOString();
  const from = new Date(now.getTime() - days * MS_DAY).toISOString();
  return { from, to, preset };
}

/**
 * Agrega events em todos os datasets do relatório.
 *
 * Single-pass O(n) sobre events + sorting/limiting nos top-Ks.
 * Dimensionado pra ~10k events; acima disso vira RPC server-side.
 */
export function aggregate(
  range: DateRange,
  events: EventForAggregation[],
  /**
   * Map opcional de reseller_codes cadastrados (`code -> name`). Usado
   * pra hidratar `topReferrers[].name`. Codes que aparecem em events
   * mas não estão neste map ficam com `name: null` (raw).
   */
  resellerNamesByCode: Map<string, string> = new Map(),
): ReportDataset {
  const now = Date.now();
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();

  // Acumuladores
  let total = 0;
  let last24h = 0;
  const countriesSet = new Set<string>();
  const dayKeys = new Set<string>();
  const hourMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const langMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const referrerCodeMap = new Map<string, number>();
  let referrerCodeTotal = 0;

  for (const e of events) {
    total++;
    const ts = new Date(e.created_at).getTime();
    if (now - ts <= MS_DAY) last24h++;
    if (e.ip_country) countriesSet.add(e.ip_country);

    const dayKey = isoDayKey(ts);
    dayKeys.add(dayKey);
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);

    // Bucket hora só pra eventos das últimas 24h.
    if (now - ts <= MS_DAY) {
      const hourKey = isoHourKey(ts);
      hourMap.set(hourKey, (hourMap.get(hourKey) ?? 0) + 1);
    }

    if (e.ip_country) {
      countryMap.set(e.ip_country, (countryMap.get(e.ip_country) ?? 0) + 1);
    }
    const device = e.device ?? "unknown";
    deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
    if (e.lang) langMap.set(e.lang, (langMap.get(e.lang) ?? 0) + 1);
    const referrerLabel = extractReferrerLabel(e.referrer);
    referrerMap.set(
      referrerLabel,
      (referrerMap.get(referrerLabel) ?? 0) + 1,
    );
    if (e.referrer_code) {
      referrerCodeMap.set(
        e.referrer_code,
        (referrerCodeMap.get(e.referrer_code) ?? 0) + 1,
      );
      referrerCodeTotal++;
    }
  }

  return {
    range,
    kpis: {
      total,
      last24h,
      countries: countriesSet.size,
      activeDays: dayKeys.size,
    },
    hourly: zeroFillHourly(now, hourMap),
    daily: zeroFillDaily(fromMs, toMs, dayMap),
    topCountries: toSortedCountries(countryMap),
    byDevice: toSortedDevices(deviceMap),
    byLang: toSortedLabeled(langMap, 10),
    byReferrer: toSortedLabeled(referrerMap, 10),
    topReferrers: toSortedReferrers(
      referrerCodeMap,
      referrerCodeTotal,
      resellerNamesByCode,
    ),
  };
}

function toSortedReferrers(
  map: Map<string, number>,
  total: number,
  names: Map<string, string>,
): ReferrerCount[] {
  if (total === 0) return [];
  return Array.from(map.entries())
    .map(([code, clicks]) => ({
      code,
      name: names.get(code) ?? null,
      clicks,
      pct: Math.round((clicks / total) * 100),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoDayKey(ts: number): string {
  // YYYY-MM-DD em UTC. Suficiente pra agrupar; UI converte pra TZ local
  // só pra display.
  return new Date(ts).toISOString().slice(0, 10);
}

function isoHourKey(ts: number): string {
  // YYYY-MM-DDTHH:00:00.000Z
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function zeroFillHourly(nowMs: number, hourMap: Map<string, number>): Bucket[] {
  // 24 buckets terminando na hora cheia atual.
  const buckets: Bucket[] = [];
  const cursor = new Date(nowMs);
  cursor.setUTCMinutes(0, 0, 0);
  cursor.setUTCHours(cursor.getUTCHours() - 23);
  for (let i = 0; i < 24; i++) {
    const key = cursor.toISOString();
    buckets.push({ bucket: key, clicks: hourMap.get(key) ?? 0 });
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return buckets;
}

function zeroFillDaily(
  fromMs: number,
  toMs: number,
  dayMap: Map<string, number>,
): Bucket[] {
  const buckets: Bucket[] = [];
  const cursor = new Date(fromMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(toMs);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({ bucket: key, clicks: dayMap.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function toSortedCountries(map: Map<string, number>): CountryCount[] {
  return Array.from(map.entries())
    .map(([country, clicks]) => ({ country, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);
}

const DEVICE_ORDER: DeviceCount["device"][] = [
  "mobile",
  "desktop",
  "tablet",
  "unknown",
];

function toSortedDevices(map: Map<string, number>): DeviceCount[] {
  // Ordem fixa pra estabilidade visual. Devices ausentes ganham 0.
  return DEVICE_ORDER.map((device) => ({
    device,
    clicks: map.get(device) ?? 0,
  })).filter((d) => d.clicks > 0);
}

function toSortedLabeled(
  map: Map<string, number>,
  limit: number,
): LabeledCount[] {
  return Array.from(map.entries())
    .map(([label, clicks]) => ({ label, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Extrai domínio do referrer pra agrupar (instagram.com agrega
 * /reel/123, /p/abc, etc.). Inválido ou null vira 'direto'.
 */
function extractReferrerLabel(referrer: string | null): string {
  if (!referrer || referrer.trim() === "") return "direto";
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "direto";
  }
}
