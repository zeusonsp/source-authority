import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Redefinir senha",
};

/**
 * Página acessada via link de recovery do email. Fluxo:
 *   1. Usuário clica no link → /auth/callback?code=PKCE_CODE&next=/reset-password
 *   2. Callback troca code por session (cookies setados)
 *   3. Usuário cai aqui logado temporariamente — força definir senha nova
 *
 * Sem sessão = link expirou ou foi consumido. Redireciona pra /forgot-password.
 */
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?expired=1");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Redefinir senha
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina uma nova senha pra sua conta. Mínimo 8 caracteres com letra
          e número.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
