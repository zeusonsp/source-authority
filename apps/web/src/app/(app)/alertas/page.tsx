import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import {
  ALERT_STATUSES,
  ALERT_TYPES,
  type AlertRow,
  type AlertStatus,
  type AlertType,
} from "@/lib/alerts/types";
import { createClient } from "@/lib/supabase/server";
import { AlertasClient } from "./alertas-client";

export const metadata = {
  title: "Alertas",
};

type PageProps = {
  searchParams?: { status?: string; type?: string };
};

export default async function AlertasPage({ searchParams }: PageProps) {
  await requireAuth();
  const supabase = createClient();

  // Onboarding gate (mesmo padrão do dashboard/relatorios).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .limit(1);
  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }
  const membership = memberships[0]!;
  const canEdit =
    membership.role === "owner" || membership.role === "admin";

  const statusFilter: AlertStatus | "all" = ((): AlertStatus | "all" => {
    const s = searchParams?.status;
    if (s && (ALERT_STATUSES as readonly string[]).includes(s)) {
      return s as AlertStatus;
    }
    return "all";
  })();

  const typeFilter: AlertType | "all" = ((): AlertType | "all" => {
    const t = searchParams?.type;
    if (t && (ALERT_TYPES as readonly string[]).includes(t)) {
      return t as AlertType;
    }
    return "all";
  })();

  // Query alerts via SSR client (RLS member-level select).
  // Quando a migration 0008_alerts ainda não foi aplicada em prod, esta
  // query falha com PGRST205 ("Could not find the table"). Tratamos
  // graceful pra renderizar empty state em vez de crash.
  let alerts: AlertRow[] = [];
  let tableMissing = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = supabase
    .from("alerts" as never)
    .select("*")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") {
    query.eq("status", statusFilter);
  }
  if (typeFilter !== "all") {
    query.eq("type", typeFilter);
  }

  const { data, error } = await query;
  if (error) {
    // Tabela ainda não existe (migration pendente) — tratamos como zero alerts.
    if (error.code === "PGRST205" || error.message?.includes("alerts")) {
      tableMissing = true;
    } else {
      console.error("[/alertas] query error:", error);
    }
  } else if (Array.isArray(data)) {
    alerts = data as AlertRow[];
  }

  // KPIs simples (calculados em memória — volume baixo no MVP).
  const counts = {
    total: alerts.length,
    new: alerts.filter((a) => a.status === "new").length,
    high: alerts.filter((a) => a.severity === "high").length,
  };

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Alertas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detecção de uso indevido da marca: reposts de conteúdo, domínios
            sound-alike, certificados SSL suspeitos e menções na web.
          </p>
        </div>

        <AlertasClient
          alerts={alerts}
          counts={counts}
          tableMissing={tableMissing}
          currentStatus={statusFilter}
          currentType={typeFilter}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
