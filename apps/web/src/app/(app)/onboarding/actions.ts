"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { onboardingSchema } from "@/lib/onboarding/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Resultado do server action quando NÃO houve redirect — ou seja, erro.
 * Sucesso lança redirect e não retorna.
 */
export type CreateCompanyActionResult =
  | { ok: false; code: "validation"; fieldErrors: Record<string, string[] | undefined> }
  | { ok: false; code: "slug_taken"; message: string }
  | { ok: false; code: "unauthenticated"; message: string }
  | { ok: false; code: "unknown"; message: string };

/**
 * Cria empresa + membership(owner) + audit_log.created via RPC create_company.
 *
 * RPC é SECURITY DEFINER atômica — bypassa RLS pra fazer os 3 INSERTs numa
 * transação. Re-valida slug normalization server-side (defesa em profundidade
 * contra cliente malicioso).
 *
 * Em sucesso, redireciona pra /dashboard?welcome=1 (não retorna).
 * Em erro, retorna estrutura tipada pra o cliente apresentar.
 */
export async function createCompanyAction(
  raw: unknown,
): Promise<CreateCompanyActionResult> {
  const parsed = onboardingSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();

  // CNPJ é null no MVP — preenchido depois em /configuracoes.
  const { error } = await supabase.rpc("create_company", {
    _name: parsed.data.name,
    _slug: parsed.data.slug,
    _segment: parsed.data.segment,
    _size: parsed.data.size,
    _cnpj: undefined,
  });

  if (error) {
    // 42501 = unauthenticated (auth.uid() null check da RPC) ou permission denied
    if (error.code === "42501") {
      return {
        ok: false,
        code: "unauthenticated",
        message: "Sessão expirada. Faça login novamente.",
      };
    }
    // 23505 = unique violation no slug ou CNPJ. Pre-check do RPC pega o slug
    // primeiro (mensagem amigável "slug X já está em uso"); o segundo handler
    // dentro da RPC cobre race condition + CNPJ duplicado.
    if (error.code === "23505") {
      return {
        ok: false,
        code: "slug_taken",
        message: error.message ?? "Esse slug já está em uso. Escolha outro.",
      };
    }
    return {
      ok: false,
      code: "unknown",
      message: "Não foi possível criar a empresa. Tente novamente.",
    };
  }

  // Invalida cache do layout (auth) — o dashboard precisa re-buscar membership.
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}
