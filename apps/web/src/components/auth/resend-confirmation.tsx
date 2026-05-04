"use client";

import { useFormState, useFormStatus } from "react-dom";
import { resendConfirmation, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: AuthState = {};

export function ResendConfirmation({ email }: { email: string }) {
  const [state, formAction] = useFormState(resendConfirmation, INITIAL_STATE);

  if (state.success) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="text-center">
      <input type="hidden" name="email" value={email} />
      <ResendButton />
    </form>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="link"
      size="sm"
      disabled={pending}
      className="text-xs"
    >
      {pending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
    </Button>
  );
}
