"use client";

import {
  AlertTriangle,
  Globe2,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ALERT_SEVERITY_LABEL,
  ALERT_STATUSES,
  ALERT_STATUS_LABEL,
  ALERT_TYPE_LABEL,
  getCtLogMatchData,
  getDomainSquatData,
  getMentionData,
  type AlertRow,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
} from "@/lib/alerts/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  alerts: AlertRow[];
  counts: { total: number; new: number; high: number };
  tableMissing: boolean;
  currentStatus: AlertStatus | "all";
};

export function AlertasClient({
  alerts,
  counts,
  tableMissing,
  currentStatus,
}: Props) {
  if (tableMissing) {
    return <ComingSoon />;
  }

  if (alerts.length === 0 && currentStatus === "all") {
    return <NoAlertsYet />;
  }

  return (
    <div className="space-y-6">
      <KpiGrid counts={counts} />
      <StatusFilter currentStatus={currentStatus} />
      {alerts.length === 0 ? (
        <EmptyForFilter status={currentStatus} />
      ) : (
        <AlertsList alerts={alerts} />
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
        <Radar className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">
        Detecção de marca em preparação
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Esta página vai mostrar alertas de domínios sound-alike, certificados
        SSL suspeitos com sua marca, e menções na web. Os workers de
        monitoramento entram em produção quando o lote da Fase 5 for aplicado
        no banco.
      </p>
      <p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground/70">
        Status: tabela <code>alerts</code> ainda não criada. Configure os
        termos da marca em{" "}
        <Link
          href="/configuracoes"
          className="text-accent underline-offset-4 hover:underline"
        >
          Configurações
        </Link>
        {" "}quando o monitoramento iniciar.
      </p>
    </section>
  );
}

function NoAlertsYet() {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
        <ShieldCheck className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">
        Sem alertas no momento
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Nada suspeito sobre sua marca foi detectado pelos nossos monitores.
        Quando alguém registrar um domínio sound-alike, emitir um certificado
        SSL com sua marca, ou ela for mencionada em pattern incomum,
        aparecerá aqui em até 1 hora.
      </p>
    </section>
  );
}

function KpiGrid({
  counts,
}: {
  counts: { total: number; new: number; high: number };
}) {
  const cards = [
    { label: "Total no período", value: counts.total },
    { label: "Novos não triados", value: counts.new },
    { label: "Severidade alta", value: counts.high },
  ];
  return (
    <section
      aria-label="KPIs de alertas"
      className="grid grid-cols-3 gap-3"
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

function StatusFilter({ currentStatus }: { currentStatus: AlertStatus | "all" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(status: AlertStatus | "all") {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    const qs = params.toString();
    router.push(`/alertas${qs ? `?${qs}` : ""}`);
  }

  const items: ReadonlyArray<{ key: AlertStatus | "all"; label: string }> = [
    { key: "all", label: "Todos" },
    ...ALERT_STATUSES.map((s) => ({ key: s, label: ALERT_STATUS_LABEL[s] })),
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
      {items.map((it) => (
        <Button
          key={it.key}
          type="button"
          variant={currentStatus === it.key ? "default" : "outline"}
          size="sm"
          onClick={() => setStatus(it.key)}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}

function EmptyForFilter({ status }: { status: AlertStatus | "all" }) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Nenhum alerta com status &ldquo;
        {status === "all" ? "qualquer" : ALERT_STATUS_LABEL[status]}&rdquo;.
      </p>
    </section>
  );
}

function AlertsList({ alerts }: { alerts: AlertRow[] }) {
  return (
    <section className="space-y-3">
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} />
      ))}
    </section>
  );
}

const TYPE_ICONS: Record<AlertType, typeof AlertTriangle> = {
  domain_squat: Globe2,
  ct_log_match: Lock,
  dns_anomaly: Radar,
  mention: Sparkles,
};

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  high: "border-destructive/40 bg-destructive/5 text-destructive",
  medium: "border-accent/40 bg-accent/5 text-accent",
  low: "border-border bg-card/40 text-muted-foreground",
};

function AlertCard({ alert }: { alert: AlertRow }) {
  const Icon = TYPE_ICONS[alert.type];
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <article className="flex gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
          SEVERITY_STYLES[alert.severity],
        )}
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-semibold tracking-tight">
            {ALERT_TYPE_LABEL[alert.type]}
          </h3>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              SEVERITY_STYLES[alert.severity],
            )}
          >
            {ALERT_SEVERITY_LABEL[alert.severity]}
          </span>
          <span className="text-xs text-muted-foreground">
            {fmt.format(new Date(alert.created_at))}
          </span>
          {alert.status !== "new" ? (
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {ALERT_STATUS_LABEL[alert.status]}
            </span>
          ) : null}
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          <AlertBody alert={alert} />
        </div>
      </div>
    </article>
  );
}

function AlertBody({ alert }: { alert: AlertRow }) {
  if (alert.type === "domain_squat") {
    const d = getDomainSquatData(alert.data);
    if (!d) return <span className="text-xs">Dados indisponíveis.</span>;
    return (
      <span>
        Domínio <span className="font-mono text-foreground">{d.domain}</span>
        {d.registrar ? ` registrado via ${d.registrar}` : ""}
        {d.similarity !== undefined
          ? ` — similaridade ${(d.similarity * 100).toFixed(0)}%`
          : ""}
        .
      </span>
    );
  }
  if (alert.type === "ct_log_match") {
    const d = getCtLogMatchData(alert.data);
    if (!d) return <span className="text-xs">Dados indisponíveis.</span>;
    return (
      <span>
        Certificado SSL emitido pra{" "}
        <span className="font-mono text-foreground">{d.domain}</span>
        {d.issuer ? ` por ${d.issuer}` : ""}
        {d.valid_from ? ` em ${d.valid_from.slice(0, 10)}` : ""}.
      </span>
    );
  }
  if (alert.type === "mention") {
    const d = getMentionData(alert.data);
    if (!d) return <span className="text-xs">Dados indisponíveis.</span>;
    return (
      <span>
        Menção em{" "}
        <a
          href={d.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-4 hover:underline"
        >
          {new URL(d.source_url).hostname}
        </a>
        {d.snippet ? `: "${d.snippet.slice(0, 120)}${d.snippet.length > 120 ? "…" : ""}"` : ""}
      </span>
    );
  }
  return (
    <span className="text-xs">
      Anomalia detectada por <code>{alert.source}</code>.
    </span>
  );
}
