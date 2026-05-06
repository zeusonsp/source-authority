import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesForm } from "./configuracoes-form";

export const metadata = {
  title: "Configurações",
};

export default async function ConfiguracoesPage() {
  await requireAuth();
  const supabase = createClient();

  // Mesma estratégia do dashboard: lê 1 membership do user e a company
  // associada. RLS garante que só rows acessíveis voltam.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const membership = memberships[0]!;
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", membership.company_id)
    .single();

  if (!company) {
    redirect("/onboarding");
  }

  // Permissão de edição = só owner/admin. Member/viewer veem o form em
  // read-only com aviso. Mesma decisão da policy `companies_update_admins`.
  const canEdit =
    membership.role === "owner" || membership.role === "admin";

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados da empresa, link mestre e plano.
          </p>
        </div>

        {!canEdit ? (
          <Alert>
            <AlertDescription>
              Seu papel é <strong>{membership.role}</strong> — apenas{" "}
              <strong>owner</strong> ou <strong>admin</strong> podem editar.
              Pra alterações, peça pra alguém da equipe com permissão.
            </AlertDescription>
          </Alert>
        ) : null}

        <ConfiguracoesForm company={company} canEdit={canEdit} />
      </div>
    </div>
  );
}
