import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recuperar senha
        </h2>
        <p className="text-sm text-muted-foreground">
          Digite seu e-mail e enviaremos um link pra você redefinir a senha.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
