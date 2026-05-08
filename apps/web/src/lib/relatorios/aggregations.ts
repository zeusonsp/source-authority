import type {
  Bucket,
  ConversionForAggregation,
  CountryCount,
  DateRange,
  DeviceCount,
  EventForAggregation,
  LabeledCount,
  ReferrerCount,
  ReportDataset,
  ReportPreset,
  RevenueBucket,
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
  /**
   * Pillar 3 v2 — conversões no mesmo range. Atribuição já resolvida
   * em conversions.reseller_code (denormalizada na hora do INSERT).
   */
  conversions: ConversionForAggregation[] = [],
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

  // Tier 2 — heatmap 7×24 (dow × hour) em BRT (UTC-3, sem DST desde 2019).
  // Inicializa zerado pra zero-fill ao retornar.
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  let heatmapPeak = 0;

  for (const e of events) {
    total++;
    const ts = new Date(e.created_at).getTime();
    // Heatmap: shift UTC → BRT subtraindo 3h, depois getUTC* dá componentes BRT.
    const brt = new Date(ts - 3 * 60 * 60 * 1000);
    const dow = brt.getUTCDay(); // 0=Dom..6=Sáb
    const hour = brt.getUTCHours(); // 0..23
    const cell = (heatmap[dow]![hour] ?? 0) + 1;
    heatmap[dow]![hour] = cell;
    if (cell > heatmapPeak) heatmapPeak = cell;
    // (continua o loop original)
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

  // ─── Pillar 3 v2: conversions aggregation ─────────────────────────────────
  let totalConversions = 0;
  let totalRevenueCents = 0;
  let attributedConversions = 0;
  const dailyRevenueMap = new Map<string, { revenue: number; sales: number }>();
  const salesByCode = new Map<string, { sales: number; revenue: number }>();

  for (const c of conversions) {
    totalConversions += 1;
    totalRevenueCents += Number(c.amount_cents);
    if (c.reseller_code) {
      attributedConversions += 1;
      const acc = salesByCode.get(c.reseller_code) ?? {
        sales: 0,
        revenue: 0,
      };
      acc.sales += 1;
      acc.revenue += Number(c.amount_cents);
      salesByCode.set(c.reseller_code, acc);
    }
    const dayKey = isoDayKey(new Date(c.occurred_at).getTime());
    const dr = dailyRevenueMap.get(dayKey) ?? { revenue: 0, sales: 0 };
    dr.revenue += Number(c.amount_cents);
    dr.sales += 1;
    dailyRevenueMap.set(dayKey, dr);
  }

  const conversionRate =
    total > 0 ? Math.round((totalConversions / total) * 1000) / 10 : 0;
  const aovCents =
    totalConversions > 0
      ? Math.round(totalRevenueCents / totalConversions)
      : 0;
  const attributedPct =
    totalConversions > 0
      ? Math.round((attributedConversions / totalConversions) * 100)
      : 0;

  return {
    range,
    kpis: {
      total,
      last24h,
      countries: countriesSet.size,
      activeDays: dayKeys.size,
      conversions: totalConversions,
      revenueCents: totalRevenueCents,
      conversionRate,
      aovCents,
      attributedPct,
    },
    hourly: zeroFillHourly(now, hourMap),
    daily: zeroFillDaily(fromMs, toMs, dayMap),
    dailyRevenue: zeroFillDailyRevenue(fromMs, toMs, dailyRevenueMap),
    topCountries: toSortedCountries(countryMap),
    byDevice: toSortedDevices(deviceMap),
    byLang: toSortedLabeled(langMap, 10),
    byReferrer: toSortedLabeled(referrerMap, 10),
    topReferrers: toSortedReferrers(
      referrerCodeMap,
      referrerCodeTotal,
      resellerNamesByCode,
      salesByCode,
    ),
    kpisPrevious: null,
    heatmap,
    heatmapPeak,
  };
}

/**
 * Tier 2 — calcula range do período anterior (mesma duração, imediatamente
 * antes do range atual). Usado pra comparação de KPIs.
 */
export function previousRange(current: DateRange): DateRange {
  const fromMs = new Date(current.from).getTime();
  const toMs = new Date(current.to).getTime();
  const durationMs = toMs - fromMs;
  return {
    from: new Date(fromMs - durationMs).toISOString(),
    to: new Date(fromMs).toISOString(),
    preset: "custom",
  };
}

function zeroFillDailyRevenue(
  fromMs: number,
  toMs: number,
  map: Map<string, { revenue: number; sales: number }>,
): RevenueBucket[] {
  const buckets: RevenueBucket[] = [];
  const cursor = new Date(fromMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(toMs);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    const v = map.get(key);
    buckets.push({
      bucket: key,
      revenueCents: v?.revenue ?? 0,
      sales: v?.sales ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function toSortedReferrers(
  map: Map<string, number>,
  total: number,
  names: Map<string, string>,
  salesByCode: Map<string, { sales: number; revenue: number }>,
): ReferrerCount[] {
  // Universe: união de codes que apareceram em events OU em sales
  // (revendedor pode aparecer só em sales se vendas vierem antes do
  // primeiro click no período).
  const allCodes = new Set<string>([
    ...map.keys(),
    ...salesByCode.keys(),
  ]);
  if (allCodes.size === 0) return [];

  return Array.from(allCodes)
    .map((code) => {
      const clicks = map.get(code) ?? 0;
      const s = salesByCode.get(code);
      const sales = s?.sales ?? 0;
      const revenueCents = s?.revenue ?? 0;
      const conversionRate =
        clicks > 0 ? Math.round((sales / clicks) * 1000) / 10 : 0;
      return {
        code,
        name: names.get(code) ?? null,
        clicks,
        pct: total > 0 ? Math.round((clicks / total) * 100) : 0,
        sales,
        revenueCents,
        conversionRate,
      };
    })
    .sort((a, b) => {
      // Primary: revenue desc; tiebreak: clicks desc.
      if (a.revenueCents !== b.revenueCents) {
        return b.revenueCents - a.revenueCents;
      }
      return b.clicks - a.clicks;
    })
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
