import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth/server";

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

  return (
    <AppShell email={user.email} displayName={profile.display_name}>
      {children}
    </AppShell>
  );
}
