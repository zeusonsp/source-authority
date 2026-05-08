"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordReset } from "@/app/actions/auth";
import type { AuthState } from "@/lib/auth/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";

const INITIAL_STATE: AuthState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(
    requestPasswordReset,
    INITIAL_STATE,
  );

  if (state.success) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <AlertTitle>Confira seu e-mail</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">
            ← Voltar para o login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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

      <FormError errors={state.errors?._form} />

      <SubmitButton />

      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          ← Voltar para o login
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar link de redefinição"}
    </Button>
  );
}
