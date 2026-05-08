import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { RevendedoresClient, type ResellerRow } from "./revendedores-client";

export const metadata = {
  title: "Revendedores",
};

export default async function RevendedoresPage() {
  await requireAuth();
  const supabase = createClient();

  // Onboarding gate.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id, role")
    .limit(1);
  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }
  const membership = memberships[0]!;
  const canEdit =
    membership.role === "owner" || membership.role === "admin";

  // Slug pra montar links com ?ref na UI.
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", membership.company_id)
    .single();
  if (!company) redirect("/onboarding");

  // Reseller codes da empresa.
  const { data: codes, error: codesErr } = await supabase
    .from("reseller_codes")
    .select("id, code, name, notes, created_at")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });

  // Eventos com referrer_code dos últimos 30d (pra agregação de cliques).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("referrer_code")
    .eq("company_id", membership.company_id)
    .gte("created_at", since)
    .not("referrer_code", "is", null);

  // Conversions atribuídas nos últimos 30d (Pillar 3 v2).
  const { data: conversions } = await supabase
    .from("conversions")
    .select("reseller_code, amount_cents")
    .eq("company_id", membership.company_id)
    .gte("occurred_at", since)
    .not("reseller_code", "is", null);

  // Agrega em memória.
  const clicks = new Map<string, number>();
  for (const e of events ?? []) {
    if (!e.referrer_code) continue;
    clicks.set(e.referrer_code, (clicks.get(e.referrer_code) ?? 0) + 1);
  }
  const sales = new Map<string, { count: number; revenue: number }>();
  for (const c of conversions ?? []) {
    if (!c.reseller_code) continue;
    const acc = sales.get(c.reseller_code) ?? { count: 0, revenue: 0 };
    acc.count += 1;
    acc.revenue += Number(c.amount_cents);
    sales.set(c.reseller_code, acc);
  }

  const rows: ResellerRow[] =
    codes?.map((c) => {
      const s = sales.get(c.code);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        notes: c.notes,
        created_at: c.created_at,
        clicks_30d: clicks.get(c.code) ?? 0,
        sales_30d: s?.count ?? 0,
        revenue_30d_cents: s?.revenue ?? 0,
      };
    }) ?? [];

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Revendedores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Códigos de atribuição. Cada código gera um link com{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              ?ref=código
            </code>{" "}
            — cliques nesse link contam pro revendedor em /relatórios.
          </p>
        </div>

        {!canEdit ? (
          <Alert>
            <AlertDescription>
              Seu papel é <strong>{membership.role}</strong> — apenas{" "}
              <strong>owner/admin</strong> podem criar/excluir códigos.
            </AlertDescription>
          </Alert>
        ) : null}

        {codesErr ? (
          <Alert variant="destructive">
            <AlertDescription>
              Erro ao carregar códigos: {codesErr.message}. Migration 0010
              pode estar pendente — fala com a Source Authority pelo WhatsApp.
            </AlertDescription>
          </Alert>
        ) : (
          <RevendedoresClient
            rows={rows}
            companySlug={company.slug}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}
