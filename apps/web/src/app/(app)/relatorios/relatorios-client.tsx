"use client";

import { Download, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  countryDisplayName,
  flagEmoji,
} from "@/lib/relatorios/countries";
import {
  PRESET_LABEL,
  type ReportDataset,
  type ReportPreset,
} from "@/lib/relatorios/types";
import { cn } from "@/lib/utils";
import { exportEventsCSV } from "./actions";

// Map é a parte mais pesada (react-simple-maps + d3-geo + topojson fetch).
// Lazy load com ssr:false reduz o bundle do server-rendered HTML inicial.
const WorldMap = dynamic(
  () => import("./world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Carregando mapa...
      </div>
    ),
  },
);

const ACCENT = "#C9A94B";
const PIE_COLORS = ["#C9A94B", "#9c8336", "#735f23", "#4d4014"];

const PRESETS: ReportPreset[] = ["24h", "7d", "30d", "90d", "custom"];

type Props = {
  data: ReportDataset;
};

export function RelatoriosClient({ data }: Props) {
  const isEmpty = data.kpis.total === 0;

  return (
    <div className="space-y-6">
      <DateRangeBar range={data.range} />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <KpiGrid kpis={data.kpis} />
          <HourlyChart data={data.hourly} />
          <DailyChart data={data.daily} />
          <MapSection topCountries={data.topCountries} total={data.kpis.total} />
          <BreakdownsRow
            byDevice={data.byDevice}
            byLang={data.byLang}
            byReferrer={data.byReferrer}
            total={data.kpis.total}
          />
          <ExportRow range={data.range} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date range bar
// ─────────────────────────────────────────────────────────────────────────────

function DateRangeBar({ range }: { range: ReportDataset["range"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(range.from.slice(0, 10));
  const [customTo, setCustomTo] = useState(range.to.slice(0, 10));
  const [showCustom, setShowCustom] = useState(range.preset === "custom");

  function applyPreset(preset: ReportPreset) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("from");
    params.delete("to");
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    params.set("preset", preset);
    router.push(`/relatorios?${params.toString()}`);
  }

  function applyCustom() {
    const params = new URLSearchParams();
    params.set("from", new Date(customFrom).toISOString());
    // Inclui o dia inteiro do "to": 23:59:59.999
    const toDate = new Date(customTo);
    toDate.setUTCHours(23, 59, 59, 999);
    params.set("to", toDate.toISOString());
    router.push(`/relatorios?${params.toString()}`);
  }

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={range.preset === preset ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            {PRESET_LABEL[preset]}
          </Button>
        ))}
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="from">
              De
            </label>
            <input
              id="from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="to">
              Até
            </label>
            <input
              id="to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button type="button" size="sm" onClick={applyCustom}>
            Aplicar
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Período: {fmt.format(new Date(range.from))} —{" "}
        {fmt.format(new Date(range.to))}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI grid + empty
// ─────────────────────────────────────────────────────────────────────────────

function KpiGrid({ kpis }: { kpis: ReportDataset["kpis"] }) {
  const cards = [
    { label: "Total no período", value: kpis.total },
    { label: "Últimas 24h", value: kpis.last24h },
    { label: "Países", value: kpis.countries },
    { label: "Dias com cliques", value: kpis.activeDays },
  ];
  return (
    <section
      aria-label="KPIs do período"
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
        </div>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section
      aria-label="Sem dados"
      className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center"
    >
      <h3 className="text-lg font-semibold">Sem dados nesse período</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Tente um range mais amplo ou aguarde os primeiros cliques no link
        mestre. Pra acompanhar em tempo real, deixe a página aberta — novos
        cliques aparecem após refresh.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Charts
// ─────────────────────────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: ReportDataset["hourly"] }) {
  const allZero = data.every((b) => b.clicks === 0);
  const formatted = data.map((b) => ({
    ...b,
    label: new Date(b.bucket).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
  }));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cliques por hora — últimas 24h
      </h2>
      {allZero ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem cliques nas últimas 24h. Aparecerão aqui em tempo real.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={formatted}>
            <CartesianGrid stroke="#222" strokeDasharray="2 4" />
            <XAxis
              dataKey="label"
              stroke="#666"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#666"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0F0F0F",
                border: "1px solid #2A2A2A",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#FAFAFA" }}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke={ACCENT}
              strokeWidth={2}
              dot={{ fill: ACCENT, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function DailyChart({ data }: { data: ReportDataset["daily"] }) {
  const allZero = data.every((b) => b.clicks === 0);
  const formatted = data.map((b) => ({
    ...b,
    label: new Date(b.bucket + "T00:00:00.000Z").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cliques por dia — período selecionado
      </h2>
      {allZero ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem cliques no período. Tente um range diferente.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formatted}>
            <CartesianGrid stroke="#222" strokeDasharray="2 4" />
            <XAxis
              dataKey="label"
              stroke="#666"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#666"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0F0F0F",
                border: "1px solid #2A2A2A",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#FAFAFA" }}
              cursor={{ fill: "rgba(201, 169, 75, 0.1)" }}
            />
            <Bar dataKey="clicks" fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map + top countries
// ─────────────────────────────────────────────────────────────────────────────

function MapSection({
  topCountries,
  total,
}: {
  topCountries: ReportDataset["topCountries"];
  total: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Distribuição geográfica
      </h2>
      <WorldMap topCountries={topCountries} />
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
          Top 10 países
        </h3>
        {topCountries.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Sem dados geográficos no período.
          </p>
        ) : (
          <ul className="space-y-2">
            {topCountries.slice(0, 10).map((c) => {
              const pct = total > 0 ? (c.clicks / total) * 100 : 0;
              return (
                <li
                  key={c.country}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="text-base">
                      {flagEmoji(c.country)}
                    </span>
                    <span>{countryDisplayName(c.country)}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.clicks}{" "}
                    <span className="text-xs">({pct.toFixed(1)}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakdowns: devices + langs + referrers
// ─────────────────────────────────────────────────────────────────────────────

function BreakdownsRow({
  byDevice,
  byLang,
  byReferrer,
  total,
}: {
  byDevice: ReportDataset["byDevice"];
  byLang: ReportDataset["byLang"];
  byReferrer: ReportDataset["byReferrer"];
  total: number;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <DeviceCard data={byDevice} total={total} />
      <LabeledCard
        title="Idiomas"
        items={byLang}
        total={total}
        emptyText="Sem dados de idioma."
      />
      <LabeledCard
        title="Origens"
        items={byReferrer}
        total={total}
        emptyText="Sem dados de origem."
      />
    </section>
  );
}

function DeviceCard({
  data,
  total,
}: {
  data: ReportDataset["byDevice"];
  total: number;
}) {
  const isEmpty = data.length === 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
        Devices
      </h3>
      {isEmpty ? (
        <p className="py-4 text-sm text-muted-foreground">
          Sem dados de device.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="clicks"
                nameKey="device"
                innerRadius={36}
                outerRadius={64}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0F0F0F",
                  border: "1px solid #2A2A2A",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(v: string) => (
                  <span className="text-xs capitalize text-muted-foreground">
                    {v}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {data.map((d) => {
              const pct = total > 0 ? (d.clicks / total) * 100 : 0;
              return (
                <li key={d.device} className="flex justify-between">
                  <span className="capitalize">{d.device}</span>
                  <span className="tabular-nums">
                    {d.clicks} ({pct.toFixed(0)}%)
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function LabeledCard({
  title,
  items,
  total,
  emptyText,
}: {
  title: string;
  items: ReportDataset["byLang"];
  total: number;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((it) => {
            const pct = total > 0 ? (it.clicks / total) * 100 : 0;
            return (
              <li key={it.label} className="flex items-center justify-between">
                <span className="truncate font-mono text-xs">{it.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {it.clicks}{" "}
                  <span className="text-xs">({pct.toFixed(0)}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export row
// ─────────────────────────────────────────────────────────────────────────────

function ExportRow({ range }: { range: ReportDataset["range"] }) {
  const [exporting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onExportCsv() {
    setError(null);
    startTransition(async () => {
      const result = await exportEventsCSV(range.from, range.to);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const blob = new Blob([result.content], { type: result.contentType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
        Exportar
      </h3>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onExportCsv}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Gerando CSV...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Exportar CSV
            </>
          )}
        </Button>
        <Button type="button" variant="outline" disabled title="Em breve">
          <Download className="size-4" />
          Exportar PDF
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase">
            Em breve
          </span>
        </Button>
      </div>
      {error ? (
        <p className={cn("mt-3 text-sm text-destructive")}>{error}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          CSV inclui todos os eventos do período (até 50.000 linhas). PDF
          virá em fase futura.
        </p>
      )}
    </section>
  );
}
