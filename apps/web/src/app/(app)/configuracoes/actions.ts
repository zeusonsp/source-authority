"use server";

import { revalidatePath } from "next/cache";
import { updateCompanySchema } from "@/lib/configuracoes/schemas";
import { createClient } from "@/lib/supabase/server";

export type UpdateCompanyActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "validation";
      fieldErrors: Record<string, string[] | undefined>;
    }
  | { ok: false; code: "forbidden"; message: string }
  | { ok: false; code: "unauthenticated"; message: string }
  | { ok: false; code: "invalid"; message: string }
  | { ok: false; code: "unknown"; message: string };

/**
 * Atualiza dados da empresa via RPC `update_company` (SECURITY DEFINER).
 *
 * Permissão (admin/owner) checada server-side dentro da RPC; não confia
 * em RLS do client. Erros traduzidos pra mensagens amigáveis.
 */
export async function updateCompanyAction(
  raw: unknown,
): Promise<UpdateCompanyActionResult> {
  const parsed = updateCompanySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();

  // TODO(ssr-0.5.2): remove cast quando subir @supabase/ssr
  //                   pra ^0.10.2 (Fase 2.5)
  // Sintoma: rpc() Args inferida como `undefined`. Validation já feita
  // via Zod parse acima — `as never` é só pra calar o type checker.
  const { error } = await supabase.rpc("update_company", {
    _company_id: parsed.data.company_id,
    _name: parsed.data.name,
    _segment: parsed.data.segment,
    _size: parsed.data.size,
    _default_redirect_url: parsed.data.default_redirect_url,
  } as never);

  if (error) {
    // RPC usa 42501 pra unauthenticated E pra forbidden. Distinguir
    // pela mensagem (RPC raise 'unauthenticated' ou 'forbidden: ...').
    if (error.code === "42501") {
      const msg = error.message ?? "";
      if (msg.includes("unauthenticated")) {
        return {
          ok: false,
          code: "unauthenticated",
          message: "Sessão expirada. Faça login novamente.",
        };
      }
      return {
        ok: false,
        code: "forbidden",
        message:
          "Você não tem permissão. Apenas owner/admin podem editar a empresa.",
      };
    }
    // 23514 = check_violation (URL inválida, name muito curto, etc.)
    if (error.code === "23514") {
      return {
        ok: false,
        code: "invalid",
        message:
          error.message ??
          "Dados inválidos. Verifique os campos e tente novamente.",
      };
    }
    return {
      ok: false,
      code: "unknown",
      message: "Não foi possível salvar. Tente novamente em alguns instantes.",
    };
  }

  // Revalida paths que mostram dados da empresa.
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { ok: true };
}
