"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  loginSchema,
  resendConfirmationSchema,
  signupSchema,
} from "@/lib/auth/schemas";
import type { AuthState } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        errors: {
          _form: ["Confirme seu e-mail antes de logar."],
        },
        emailNotConfirmed: true,
        email: parsed.data.email,
      };
    }
    return {
      errors: { _form: ["E-mail ou senha inválidos."] },
    };
  }

  revalidatePath("/", "layout");

  // Honra ?next= se for caminho relativo válido; senão default /dashboard.
  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  redirect(target);
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createClient();
  const headerList = headers();
  const origin =
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  // Privacy: ignoramos o resultado real para não vazar enumeration de e-mails.
  // Ver memory: feedback_collaboration_style.md (privacidade no signup).
  await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  return {
    success: true,
    email: parsed.data.email,
    message: `Enviamos um link de confirmação para ${parsed.data.email}. Verifique sua caixa de entrada e a pasta de spam.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resendConfirmationSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
  });

  return {
    success: true,
    message: "Reenviamos o link. Verifique seu e-mail.",
  };
}
