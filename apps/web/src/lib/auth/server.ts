import "server-only";

import { redirect } from "next/navigation";
import type { Tables } from "@source-authority/shared/database.types";
import { createClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;

export type AuthContext = {
  user: { id: string; email: string };
  profile: Profile;
};

/**
 * Retorna o usuário autenticado + profile, ou null se não logado.
 *
 * Usa supabase.auth.getUser() (não getSession) — getUser revalida o token
 * com o servidor Supabase, getSession só lê cookie. Em código server-side
 * crítico (auth checks), sempre getUser.
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    user: { id: user.id, email: user.email },
    profile,
  };
}

/**
 * Redireciona para /login se não autenticado. Use em layouts/pages
 * dentro de (app) — defesa em profundidade junto com o middleware.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  return ctx;
}
