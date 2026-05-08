"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  forgotPasswordSchema,
  loginSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
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

/**
 * Dispara link de redefinição de senha via Supabase Auth.
 * Email vai pelo SMTP custom (Resend, configurado no Supabase Dashboard).
 *
 * Privacy: ignoramos o resultado real (mesmo padrão de signup —
 * não vaza enumeration de e-mails cadastrados).
 *
 * Link redireciona pra /auth/callback?next=/reset-password — handler
 * existente troca o code por session, depois redirect pra reset-password
 * onde usuário define a senha nova.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
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

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return {
    success: true,
    email: parsed.data.email,
    message: `Se ${parsed.data.email} estiver cadastrado, enviamos um link de redefinição. Confira sua caixa de entrada e o spam.`,
  };
}

/**
 * Atualiza senha do usuário autenticado. Usado em /reset-password
 * (após callback que estabeleceu sessão a partir do link de recovery).
 *
 * Se sessão expirou (link velho ou já consumido), retorna erro pra UI
 * sugerir solicitar novo link.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errors: {
        _form: [
          "Sessão expirada. Solicite um novo link em /forgot-password.",
        ],
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      errors: {
        _form: ["Não foi possível redefinir a senha. Tente novamente."],
      },
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
