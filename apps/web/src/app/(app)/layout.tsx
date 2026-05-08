import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout do grupo (app) — toda página dentro dele exige autenticação.
 *
 * Defesa em profundidade junto com o middleware: se uma rota nova for
 * adicionada e o middleware não pegar (ex: bug no matcher de PUBLIC_PATHS),
 * esse `requireAuth` corrige no layer da layout.
 *
 * Renderiza o shell autenticado (sidebar 240px + topbar) ao redor das
 * páginas filhas. Onboarding é uma página filha — o redirecionamento de
 * "fresh user → /onboarding" mora em /dashboard, não aqui (porque /onboarding
 * em si precisa do shell pra renderizar).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireAuth();

  // Lookup billing pra renderizar BillingBanner globalmente quando past_due.
  // Cost: 2 queries pequenas por (app) page render. RLS filtra naturalmente
  // pelo membership do user; user sem membership = billing null = sem banner.
  // billing_status ainda não está em database.types (migration 0009 pendente
  // de gen-types). Cast em cima de select("*").
  // TODO(ssr-0.5.2): regen types e remover o cast.
  const supabase = createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1);

  let billing: { company_id: string; billing_status: string } | null = null;
  const membership = memberships?.[0];
  if (membership) {
    const { data: row } = await supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .single();
    const company = row as unknown as
      | { id: string; billing_status?: string | null }
      | null;
    if (company) {
      billing = {
        company_id: company.id,
        billing_status: company.billing_status ?? "none",
      };
    }
  }

  return (
    <AppShell
      email={user.email}
      displayName={profile.display_name}
      billing={billing}
    >
      {children}
    </AppShell>
  );
}
