import Link from "next/link";

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
          Em breve. Por enquanto, entre em contato com o suporte para resetar
          sua senha.
        </p>
      </div>

      <p className="text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          ← Voltar para o login
        </Link>
      </p>
    </div>
  );
}
