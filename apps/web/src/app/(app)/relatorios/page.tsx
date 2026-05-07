import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { aggregate, resolveRange } from "@/lib/relatorios/aggregations";
import { createClient } from "@/lib/supabase/server";
import { RelatoriosClient } from "./relatorios-client";

export const metadata = {
  title: "Relatórios",
};

type PageProps = {
  searchParams?: { from?: string; to?: string; preset?: string };
};

export default async function RelatoriosPage({ searchParams }: PageProps) {
  await requireAuth();
  const supabase = createClient();

  // Onboarding gate (mesmo padrão do dashboard).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .limit(1);
  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }
  const membership = memberships[0]!;

  const range = resolveRange(searchParams);

  // Pull único de events no range; agregação em memória (Server Component).
  // Padrão do dashboard. Tech debt: trocar por RPC quando >10k eventos
  // virar gargalo medido.
  const { data: events } = await supabase
    .from("events")
    .select("created_at, ip_country, device, lang, referrer")
    .eq("company_id", membership.company_id)
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .order("created_at", { ascending: false });

  const data = aggregate(range, events ?? []);

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliques no link mestre — KPIs, gráficos temporais e distribuição
            geográfica do período selecionado.
          </p>
        </div>

        <RelatoriosClient data={data} />
      </div>
    </div>
  );
}
