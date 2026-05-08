import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root da apps/web (`app.sourceauthority.com.br/`).
 *
 * Não é landing — landing vive em apps/landing (sourceauthority.com.br).
 * Aqui apenas redireciona baseado no estado de auth:
 *   - Logado    → /dashboard
 *   - Anônimo   → /login
 */
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
