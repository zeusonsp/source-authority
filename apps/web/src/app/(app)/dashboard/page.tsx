import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { user, profile } = await requireAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
        Phase 1 · Auth funcionando ✓
      </div>
      <h1 className="font-sans text-4xl font-semibold tracking-tight">
        Bem-vindo, {profile.display_name ?? user.email}
      </h1>
      <p className="text-sm text-muted-foreground">
        Logado como {user.email}
      </p>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Sidebar + topbar + páginas placeholder vêm no próximo chunk (Layout
        autenticado completo).
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </main>
  );
}
