import { redirect } from "next/navigation";
import type { Tables } from "@source-authority/shared/database.types";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { trackerUrl } from "@/lib/tracker";
import { cn } from "@/lib/utils";

// TODO(ssr-0.5.2): remove cast quando subir @supabase/ssr
//                   pra ^0.10.2 (Fase 2.5)
// Sintoma: from().select() retorna `never[]` em vez de Row[] tipado.
type Membership = Tables<"memberships">;
type Company = Tables<"companies">;
type EventRow = Pick<
  Tables<"events">,
  "created_at" | "device" | "ip_country" | "ip_city" | "referrer" | "lang"
>;

const MS_24H = 24 * 60 * 60 * 1000;
const MS_30D = 30 * MS_24H;

export const metadata = {
  title: "Dashboard",
};

type DashboardPageProps = {
  searchParams?: { welcome?: string };
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { profile } = await requireAuth();
  const supabase = createClient();

  // Onboarding gate: sem membership = redireciona pra /onboarding.
  const membershipsResult = await supabase
    .from("memberships")
    .select("*")
    .limit(1);
  const memberships = membershipsResult.data as Membership[] | null;

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const membership = memberships[0]!;
  const companyResult = await supabase
    .from("companies")
    .select("*")
    .eq("id", membership.company_id)
    .single();
  const company = companyResult.data as Company | null;

  if (!company) {
    redirect("/onboarding");
  }

  // Eventos do dashboard: pull único + agrega em JS.
  // RLS garante que só rows da empresa do user voltam, então `.eq` é
  // belt-and-suspenders. Sem `.eq` daria igual por causa da policy
  // events_select_members.
  //
  // Tech debt: pra escala >10k eventos/empresa, trocar por RPC SECURITY
  // INVOKER que faz aggregate server-side. Pra Zeus dogfood (~100s
  // eventos), pull-and-aggregate é mais simples e zero round-trips
  // extras.
  const eventsResult = await supabase
    .from("events")
    .select("created_at, device, ip_country, ip_city, referrer, lang")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });
  const events = (eventsResult.data as EventRow[] | null) ?? [];

  const stats = aggregateEvents(events);
  const recentEvents = events.slice(0, 10);
  const linkUrl = trackerUrl(company.slug);
  const showWelcome = searchParams?.welcome === "1";

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {showWelcome ? (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            Empresa criada com sucesso. Bem-vindo a bordo.
          </div>
        ) : null}

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Bem-vindo, {profile.display_name ?? "operador"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel de controle — Fase 3 ativa (tracking edge ligado).
          </p>
        </div>

        <CompanyCard company={company} linkUrl={linkUrl} />

        {events.length === 0 ? (
          <EmptyState linkUrl={linkUrl} />
        ) : (
          <>
            <KpiGrid stats={stats} />
            <RecentEventsTable rows={recentEvents} />
          </>
        )}

        <NextStepsCard />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregations (in-memory, JS)
// ─────────────────────────────────────────────────────────────────────────────

type Stats = {
  clicks24h: number;
  clicks30d: number;
  clicksTotal: number;
  uniqueCountries: number;
};

function aggregateEvents(events: EventRow[]): Stats {
  const now = Date.now();
  let clicks24h = 0;
  let clicks30d = 0;
  const countries = new Set<string>();

  for (const e of events) {
    const ts = new Date(e.created_at).getTime();
    const age = now - ts;
    if (age <= MS_24H) clicks24h++;
    if (age <= MS_30D) clicks30d++;
    if (e.ip_country) countries.add(e.ip_country);
  }

  return {
    clicks24h,
    clicks30d,
    clicksTotal: events.length,
    uniqueCountries: countries.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function CompanyCard({
  company,
  linkUrl,
}: {
  company: Company;
  linkUrl: string;
}) {
  return (
    <section
      aria-label="Sua empresa"
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Sua empresa
          </p>
          <h2 className="text-xl font-semibold">{company.name}</h2>
          <p className="text-xs text-muted-foreground">
            Slug:{" "}
            <span className="font-mono text-foreground">{company.slug}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PlanBadge plan={company.plan} />
          <a
            href="/configuracoes"
            className="text-xs text-accent underline-offset-4 hover:underline"
          >
            Editar em Configurações →
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
        <span className="text-xs text-muted-foreground">Link mestre:</span>
        <span className="flex-1 truncate font-mono text-sm text-accent">
          {linkUrl}
        </span>
        <CopyLinkButton value={linkUrl} label="Copiar link mestre" />
      </div>
    </section>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const isStarter = plan === "starter";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        isStarter
          ? "border border-border bg-secondary text-muted-foreground"
          : "border border-accent/30 bg-accent/10 text-accent",
      )}
    >
      {plan}
    </span>
  );
}

function EmptyState({ linkUrl }: { linkUrl: string }) {
  return (
    <section
      aria-label="Sem cliques ainda"
      className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center"
    >
      <h3 className="text-base font-semibold">Sem cliques ainda</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Compartilhe seu link mestre acima — assim que alguém acessar, os
        primeiros cliques aparecem aqui em segundos.
      </p>
      <p className="mt-4 break-all font-mono text-xs text-accent">{linkUrl}</p>
    </section>
  );
}

function KpiGrid({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Cliques 24h", value: stats.clicks24h },
    { label: "Cliques 30d", value: stats.clicks30d },
    { label: "Total", value: stats.clicksTotal },
    { label: "Países", value: stats.uniqueCountries },
  ];
  return (
    <section
      aria-label="KPIs"
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

function RecentEventsTable({ rows }: { rows: EventRow[] }) {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  return (
    <section
      aria-label="Últimos cliques"
      className="rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold">Últimos cliques</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {rows.length === 1
            ? "1 evento mais recente"
            : `${rows.length} eventos mais recentes`}
          . Atualiza a cada refresh do dashboard.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Quando</th>
              <th className="px-6 py-3 text-left font-medium">Device</th>
              <th className="px-6 py-3 text-left font-medium">País</th>
              <th className="px-6 py-3 text-left font-medium">Cidade</th>
              <th className="px-6 py-3 text-left font-medium">Idioma</th>
              <th className="px-6 py-3 text-left font-medium">Referrer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={`${r.created_at}-${idx}`}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-6 py-3 text-muted-foreground">
                  {fmt.format(new Date(r.created_at))}
                </td>
                <td className="px-6 py-3 capitalize">{r.device ?? "—"}</td>
                <td className="px-6 py-3">{r.ip_country ?? "—"}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {r.ip_city ?? "—"}
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {r.lang ?? "—"}
                </td>
                <td className="max-w-[200px] truncate px-6 py-3 text-xs text-muted-foreground">
                  {r.referrer ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NextStepsCard() {
  return (
    <section
      aria-label="Próximos passos"
      className="rounded-lg border border-dashed border-border bg-card/40 p-6"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Próximos passos
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Tracking edge ligado pela <span className="text-accent">Fase 3</span> —
        cada clique no link mestre vira evento aqui em &lt;1s. A{" "}
        <span className="text-accent">Fase 4</span> traz dashboard rico
        (gráfico por hora, mapa de cliques por estado, filtros temporais).
        Detecção de uso indevido (Fase 5) e relatórios mensais (Fase 6) entram
        em sequência. Configuração da empresa em{" "}
        <a
          href="/configuracoes"
          className="text-accent underline-offset-4 hover:underline"
        >
          Configurações
        </a>
        .
      </p>
    </section>
  );
}
