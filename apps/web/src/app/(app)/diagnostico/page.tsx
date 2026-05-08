import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { trackerUrl } from "@/lib/tracker";
import { DiagnosticoClient } from "./diagnostico-client";

export const metadata = {
  title: "Diagnóstico de tracking",
};

// Sempre busca dados frescos — não cacheia.
export const dynamic = "force-dynamic";

/**
 * /diagnostico — Página de transparência total do tracking.
 *
 * Mostra:
 *   1. O que SUA visita atual (server-side request) está expondo via headers.
 *   2. O último evento gravado pra empresa, com TODOS os 28+ campos
 *      capturados.
 *   3. Botão "Testar agora" que abre o link mestre da empresa em new tab
 *      → ao voltar a página re-fetcha o evento e mostra o que foi capturado.
 *   4. Bloco LGPD: o que SOURCE AUTHORITY captura, o que NÃO captura, e
 *      por quê.
 */
export default async function DiagnosticoPage() {
  await requireAuth();
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id, role")
    .limit(1);
  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }
  const membership = memberships[0]!;

  const { data: company } = await supabase
    .from("companies")
    .select("id, slug, name")
    .eq("id", membership.company_id)
    .single();
  if (!company) redirect("/onboarding");

  // Último evento (mais recente). Pega TUDO pra exibir no detail card.
  const { data: latestEvent } = await supabase
    .from("events")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Total de eventos da empresa (pra contexto).
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Diagnóstico de tracking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transparência total: veja exatamente o que o Source Authority
            captura quando alguém clica em <strong>{company.name}</strong>.
          </p>
        </div>

        <Alert>
          <AlertDescription className="space-y-2 text-xs leading-relaxed">
            <p>
              <strong>Como testar:</strong> click em "Testar tracking" abaixo
              → uma nova aba abre o link mestre → você é redirecionado pro
              site da empresa → volta nessa aba e click em "Atualizar" pra
              ver os dados capturados na sua visita.
            </p>
          </AlertDescription>
        </Alert>

        <DiagnosticoClient
          companySlug={company.slug}
          totalEvents={count ?? 0}
          masterLink={trackerUrl(company.slug)}
          latestEvent={latestEvent}
        />
      </div>
    </div>
  );
}
