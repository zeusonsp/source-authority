import { Instagram } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAuth } from "@/lib/auth/server";
import { isInstagramConfigured } from "@/lib/integrations/instagram";
import { createClient } from "@/lib/supabase/server";
import { InstagramClient } from "./instagram-client";

export const metadata = { title: "Instagram" };
export const dynamic = "force-dynamic";

type SearchParams = { ig_success?: string; ig_error?: string };

export default async function InstagramPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAuth();
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id, role")
    .limit(1);
  if (!memberships || memberships.length === 0) redirect("/onboarding");
  const membership = memberships[0]!;
  const canEdit = membership.role === "owner" || membership.role === "admin";

  // Conexão existente
  const { data: connection } = await supabase
    .from("instagram_connections")
    .select(
      "id, ig_user_id, ig_username, fb_page_name, status, token_expires_at, last_polled_at, connected_at",
    )
    .eq("company_id", membership.company_id)
    .maybeSingle();

  // Hashtags monitoradas
  const { data: hashtags } = await supabase
    .from("hashtag_watches")
    .select("id, hashtag, ig_hashtag_id, last_polled_at, active, created_at")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });

  const configured = isInstagramConfigured();
  const flashSuccess = searchParams?.ig_success === "1";
  const flashError = searchParams?.ig_error;

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 via-pink-500 to-purple-600">
            <Instagram className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instagram
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte sua conta Instagram Business pra monitorar hashtags
              automaticamente e detectar reposts em tempo real.
            </p>
          </div>
        </div>

        {flashSuccess ? (
          <Alert className="border-emerald-400/40 bg-emerald-400/10 text-emerald-400">
            <AlertDescription>
              ✅ Instagram conectado com sucesso!
            </AlertDescription>
          </Alert>
        ) : null}
        {flashError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {flashErrorMessage(flashError)}
            </AlertDescription>
          </Alert>
        ) : null}

        {!configured ? (
          <Alert>
            <AlertDescription>
              Integração Instagram ainda não configurada (admin precisa setar{" "}
              <code className="font-mono">META_APP_ID</code> e{" "}
              <code className="font-mono">META_APP_SECRET</code> em Vercel).
            </AlertDescription>
          </Alert>
        ) : null}

        <InstagramClient
          configured={configured}
          canEdit={canEdit}
          membershipRole={membership.role}
          connection={connection}
          hashtags={hashtags ?? []}
        />
      </div>
    </div>
  );
}

function flashErrorMessage(reason: string): string {
  const map: Record<string, string> = {
    no_business_account:
      "Esta conta Facebook não tem Instagram Business vinculado. Converte sua conta IG pra Business no app Instagram (Configurações → Conta → Mudar pra conta profissional → Empresa) e conecta a uma Página Facebook.",
    forbidden: "Apenas owner/admin pode conectar Instagram.",
    db_error: "Erro ao salvar conexão. Tenta novamente.",
    exchange_failed:
      "Falha ao trocar código OAuth. Verifica se o app Meta está com privacy policy + termos preenchidos e Salvar Alterações foi clicado.",
    user_denied: "Você cancelou a autorização Instagram.",
  };
  return map[reason] ?? `Erro desconhecido: ${reason}`;
}
