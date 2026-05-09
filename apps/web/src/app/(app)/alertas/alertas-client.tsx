"use client";

import {
  AlertTriangle,
  Check,
  ExternalLink,
  Globe2,
  ImageOff,
  ImagePlus,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ALERT_SEVERITY_LABEL,
  ALERT_STATUSES,
  ALERT_STATUS_LABEL,
  ALERT_TYPE_LABEL,
  ALERT_TYPES,
  DISCOVERY_ENGINE_LABEL,
  getContentRepostData,
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
import { triageAlert } from "./actions";

type Props = {
  alerts: AlertRow[];
  counts: { total: number; new: number; high: number };
  tableMissing: boolean;
  currentStatus: AlertStatus | "all";
  currentType: AlertType | "all";
  canEdit: boolean;
};

export function AlertasClient({
  alerts,
  counts,
  tableMissing,
  currentStatus,
  currentType,
  canEdit,
}: Props) {
  if (tableMissing) {
    return <ComingSoon />;
  }

  if (
    alerts.length === 0 &&
    currentStatus === "all" &&
    currentType === "all"
  ) {
    return <NoAlertsYet />;
  }

  return (
    <div className="space-y-6">
      <KpiGrid counts={counts} />
      <Filters currentStatus={currentStatus} currentType={currentType} />
      {alerts.length === 0 ? (
        <EmptyForFilter status={currentStatus} type={currentType} />
      ) : (
        <AlertsList alerts={alerts} canEdit={canEdit} />
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

function Filters({
  currentStatus,
  currentType,
}: {
  currentStatus: AlertStatus | "all";
  currentType: AlertType | "all";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: "status" | "type", value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(`/alertas${qs ? `?${qs}` : ""}`);
  }

  const statusItems: ReadonlyArray<{
    key: AlertStatus | "all";
    label: string;
  }> = [
    { key: "all", label: "Todos" },
    ...ALERT_STATUSES.map((s) => ({ key: s, label: ALERT_STATUS_LABEL[s] })),
  ];

  const typeItems: ReadonlyArray<{ key: AlertType | "all"; label: string }> = [
    { key: "all", label: "Qualquer tipo" },
    ...ALERT_TYPES.map((t) => ({ key: t, label: ALERT_TYPE_LABEL[t] })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        <span className="self-center text-[10px] uppercase tracking-wide text-muted-foreground">
          Status:
        </span>
        {statusItems.map((it) => (
          <Button
            key={it.key}
            type="button"
            variant={currentStatus === it.key ? "default" : "outline"}
            size="sm"
            onClick={() => setParam("status", it.key)}
          >
            {it.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        <span className="self-center text-[10px] uppercase tracking-wide text-muted-foreground">
          Tipo:
        </span>
        {typeItems.map((it) => (
          <Button
            key={it.key}
            type="button"
            variant={currentType === it.key ? "default" : "outline"}
            size="sm"
            onClick={() => setParam("type", it.key)}
          >
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function EmptyForFilter({
  status,
  type,
}: {
  status: AlertStatus | "all";
  type: AlertType | "all";
}) {
  const statusLabel =
    status === "all" ? "qualquer status" : ALERT_STATUS_LABEL[status];
  const typeLabel =
    type === "all" ? "qualquer tipo" : ALERT_TYPE_LABEL[type];
  return (
    <section className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Nenhum alerta com {statusLabel} / {typeLabel}.
      </p>
    </section>
  );
}

function AlertsList({
  alerts,
  canEdit,
}: {
  alerts: AlertRow[];
  canEdit: boolean;
}) {
  return (
    <section className="space-y-3">
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} canEdit={canEdit} />
      ))}
    </section>
  );
}

const TYPE_ICONS: Record<AlertType, typeof AlertTriangle> = {
  domain_squat: Globe2,
  ct_log_match: Lock,
  dns_anomaly: Radar,
  mention: Sparkles,
  content_repost: ImagePlus,
};

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  high: "border-destructive/40 bg-destructive/5 text-destructive",
  medium: "border-accent/40 bg-accent/5 text-accent",
  low: "border-border bg-card/40 text-muted-foreground",
};

function AlertCard({
  alert,
  canEdit,
}: {
  alert: AlertRow;
  canEdit: boolean;
}) {
  const Icon = TYPE_ICONS[alert.type];
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <article
      id={`alert-${alert.id}`}
      className="flex gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80"
    >
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

        {canEdit && alert.status === "new" ? (
          <TriageActions alertId={alert.id} />
        ) : null}
      </div>
    </article>
  );
}

function TriageActions({ alertId }: { alertId: string }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: AlertStatus) {
    if (pending) return;
    startTransition(async () => {
      const r = await triageAlert({ id: alertId, status });
      if (!r.ok) {
        // Erro silencioso pra não quebrar UX; logado em server.
        console.warn("[/alertas] triage failed:", r.message);
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setStatus("resolved")}
        disabled={pending}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <Check className="mr-1 size-3.5" />
        Confirmar violação
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setStatus("dismissed")}
        disabled={pending}
      >
        <X className="mr-1 size-3.5" />
        Marcar falso positivo
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setStatus("triaged")}
        disabled={pending}
        className="text-muted-foreground"
      >
        Marcar como visto
      </Button>
    </div>
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
  if (alert.type === "content_repost") {
    return <ContentRepostBody alert={alert} />;
  }
  return (
    <span className="text-xs">
      Anomalia detectada por <code>{alert.source}</code>.
    </span>
  );
}

function ContentRepostBody({ alert }: { alert: AlertRow }) {
  const d = getContentRepostData(alert.data);
  if (!d) {
    return (
      <span className="text-xs">
        Repost detectado, mas payload incompleto. Fonte:{" "}
        <code>{alert.source}</code>.
      </span>
    );
  }

  const similarityPct = `${Math.round(d.similarity_score * 100)}%`;
  const engineLabel =
    (d.discovery_engine && DISCOVERY_ENGINE_LABEL[d.discovery_engine]) ||
    d.discovery_engine ||
    alert.source;

  return (
    <div className="space-y-3">
      {/* Linha 1: similarity + hamming distance */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-foreground">
          {similarityPct} similar
        </span>
        <span className="text-muted-foreground">
          (Hamming distance: {d.hamming_distance}/64)
        </span>
      </div>

      {/* Linha 2: hashtag + discovery engine */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {d.hashtag ? (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
            #{d.hashtag}
          </span>
        ) : null}
        <span>
          Detectado via{" "}
          <span className="text-foreground/80">{engineLabel}</span>
        </span>
      </div>

      {/* Linha 3: side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <ComparisonCard
          label="Seu original"
          host={null}
          title={d.matched_content_title}
          thumbnail={null}
          variant="own"
        />
        <ComparisonCard
          label="Post suspeito"
          host={d.suspect_host}
          title={d.suspect_title}
          thumbnail={d.suspect_thumbnail}
          variant="suspect"
        />
      </div>

      {/* Linha 4: snippet do suspeito (se houver) */}
      {d.suspect_snippet ? (
        <p className="rounded-md border border-border bg-background/40 p-3 text-xs italic text-muted-foreground">
          &ldquo;
          {d.suspect_snippet.length > 200
            ? `${d.suspect_snippet.slice(0, 200)}…`
            : d.suspect_snippet}
          &rdquo;
        </p>
      ) : null}

      {/* Linha 5: links de ação */}
      <div className="flex flex-wrap gap-3 text-xs">
        <a
          href={d.suspect_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Ver post suspeito
        </a>
        <Link
          href={`/meu-conteudo#content-${d.matched_content_id}`}
          className="inline-flex items-center gap-1.5 text-foreground/80 underline-offset-4 hover:underline"
        >
          Ver meu original
        </Link>
        {d.matched_content_url ? (
          <a
            href={d.matched_content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Abrir original
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  host,
  title,
  thumbnail,
  variant,
}: {
  label: string;
  host: string | null;
  title: string | null;
  thumbnail: string | null;
  variant: "own" | "suspect";
}) {
  const borderClass =
    variant === "suspect"
      ? "border-destructive/30"
      : "border-accent/30";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background/40",
        borderClass,
      )}
    >
      <div className="aspect-square w-full bg-secondary/30">
        {thumbnail ? (
          // Thumbnails vêm de hosts variados (instagram cdn, tiktok, serpapi),
          // não dá pra alistar todos no next/image — `<img>` puro é o caminho.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={title ?? label}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageOff className="size-5" />
            <span className="text-[10px] uppercase tracking-wide">
              Sem thumbnail
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-2">
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            variant === "suspect" ? "text-destructive" : "text-accent",
          )}
        >
          {label}
        </p>
        {host ? (
          <p className="font-mono text-xs text-foreground">{host}</p>
        ) : null}
        {title ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{title}</p>
        ) : null}
      </div>
    </div>
  );
}
