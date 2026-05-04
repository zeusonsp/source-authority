"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { signUpWithPassword, type AuthState } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";

const INITIAL_STATE: AuthState = {};

export function SignupForm() {
  const [state, formAction] = useFormState(signUpWithPassword, INITIAL_STATE);

  if (state.success) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <AlertTitle>Confira seu e-mail</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          Já confirmou?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Nome</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={Boolean(state.errors?.display_name)}
        />
        {state.errors?.display_name?.[0] ? (
          <p className="text-xs text-destructive">
            {state.errors.display_name[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.errors?.email)}
        />
        {state.errors?.email?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.errors?.password)}
        />
        {state.errors?.password?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.password[0]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres, com 1 letra e 1 número.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirmar senha</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.errors?.confirm_password)}
        />
        {state.errors?.confirm_password?.[0] ? (
          <p className="text-xs text-destructive">
            {state.errors.confirm_password[0]}
          </p>
        ) : null}
      </div>

      <FormError errors={state.errors?._form} />

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Criando conta..." : "Criar conta"}
    </Button>
  );
}
