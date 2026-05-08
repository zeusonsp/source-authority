"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword } from "@/app/actions/auth";
import type { AuthState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";

const INITIAL_STATE: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePassword, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
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
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirmar nova senha</Label>
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
      {pending ? "Salvando..." : "Redefinir senha"}
    </Button>
  );
}
