import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  MeuConteudoClient,
  type ContentRow,
} from "./meu-conteudo-client";

export const metadata = {
  title: "Meu Conteúdo",
};

export const dynamic = "force-dynamic";

export default async function MeuConteudoPage() {
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
  const canEdit =
    membership.role === "owner" || membership.role === "admin";

  const { data: contents } = await supabase
    .from("contents")
    .select(
      "id, source_platform, source_url, thumbnail_url, thumbnail_dhash, title, notes, status, registered_at",
    )
    .eq("company_id", membership.company_id)
    .order("registered_at", { ascending: false });

  const rows: ContentRow[] =
    contents?.map((c) => ({
      id: c.id,
      source_platform: c.source_platform,
      source_url: c.source_url,
      thumbnail_url: c.thumbnail_url,
      thumbnail_dhash: c.thumbnail_dhash,
      title: c.title,
      notes: c.notes,
      status: c.status,
      registered_at: c.registered_at,
    })) ?? [];

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Meu Conteúdo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre seus posts originais (Instagram, TikTok, YouTube) e
            verifique se alguém está reusando seu conteúdo. Comparação por
            perceptual hash da thumbnail (V1).
          </p>
        </div>

        {!canEdit ? (
          <Alert>
            <AlertDescription>
              Seu papel é <strong>{membership.role}</strong> — apenas{" "}
              <strong>owner/admin</strong> podem cadastrar/excluir conteúdos.
              Você pode visualizar e usar &ldquo;Verificar repost&rdquo;.
            </AlertDescription>
          </Alert>
        ) : null}

        <MeuConteudoClient rows={rows} canEdit={canEdit} />
      </div>
    </div>
  );
}
