import { redirect } from "next/navigation";
import type { Tables } from "@source-authority/shared/database.types";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// TODO(ssr-0.5.2): remove cast quando subir @supabase/ssr
//                   pra ^0.10.2 (Fase 2.5)
// Sintoma: from().select() retorna `never[]` em vez de Row[] tipado.
type Membership = Tables<"memberships">;
type Company = Tables<"companies">;

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
  // RLS de memberships só retorna rows do próprio user, então essa query
  // efetivamente conta "minhas empresas".
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

  // Defesa: se o membership existe mas a company sumiu (improvável dado
  // ON DELETE CASCADE), reonboarda — não quebra o dashboard.
  if (!company) {
    redirect("/onboarding");
  }

  const showWelcome = searchParams?.welcome === "1";

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl space-y-8">
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
            Painel de controle da Source Authority — Fase 2 (Onboarding).
          </p>
        </div>

        <section
          aria-label="Sua empresa"
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Sua empresa
              </p>
              <h2 className="text-xl font-semibold">{company.name}</h2>
              <p className="text-sm text-muted-foreground">
                Slug:{" "}
                <span className="font-mono text-foreground">
                  oficial.sourceauthority.com.br/{company.slug}
                </span>
              </p>
            </div>
            <PlanBadge plan={company.plan} />
          </div>
        </section>

        <section
          aria-label="Próximos passos"
          className="rounded-lg border border-dashed border-border bg-card/40 p-6"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Próximos passos
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Seu link mestre em{" "}
            <span className="font-mono text-foreground">
              oficial.sourceauthority.com.br/{company.slug}
            </span>{" "}
            estará disponível na <span className="text-accent">Fase 3</span>{" "}
            (Cloudflare Worker + tracking edge). Por enquanto seu dashboard te
            lembra de configurar o redirecionamento padrão em{" "}
            <a
              href="/configuracoes"
              className="text-accent underline-offset-4 hover:underline"
            >
              Configurações
            </a>
            . Quando o tracking estiver ligado, KPIs reais (cliques, origens,
            geolocalização) vão aparecer aqui automaticamente.
          </p>
        </section>
      </div>
    </div>
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
