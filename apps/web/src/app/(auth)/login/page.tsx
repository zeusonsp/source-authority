import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta Source Authority
        </p>
      </div>

      {/* Suspense isola useSearchParams() do form pra não bailar o
          prerender estático da página inteira (Next 14 App Router). */}
      <Suspense fallback={<div className="h-48" />}>
        <LoginForm />
      </Suspense>

      <div className="space-y-2 text-center text-sm">
        <p>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground"
          >
            Esqueci minha senha
          </Link>
        </p>
        <p className="text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
