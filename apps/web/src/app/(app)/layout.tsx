import { requireAuth } from "@/lib/auth/server";

/**
 * Layout do grupo (app) — toda página dentro dele exige autenticação.
 *
 * Defesa em profundidade junto com o middleware: se uma rota nova for
 * adicionada e o middleware não pegar (ex: bug no matcher de PUBLIC_PATHS),
 * esse `requireAuth` corrige no layer da layout.
 *
 * Sidebar + topbar virão no Chunk B.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}
