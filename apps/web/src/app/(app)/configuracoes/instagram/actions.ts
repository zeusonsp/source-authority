"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string };

const addHashtagSchema = z.object({
  hashtag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .toLowerCase()
    .regex(/^[a-z0-9_]+$/, "Apenas letras, dígitos e underscores. Sem # ou espaço."),
});

const removeHashtagSchema = z.object({
  id: z.string().uuid(),
});

async function authorizeAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .limit(1);
  const ms = m?.[0];
  if (!ms || (ms.role !== "owner" && ms.role !== "admin")) return null;
  return { user_id: user.id, company_id: ms.company_id };
}

export async function addHashtag(input: {
  hashtag: string;
}): Promise<ActionResult> {
  const parsed = addHashtagSchema.safeParse({
    hashtag: input.hashtag.replace(/^#/, ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "Hashtag inválida.",
    };
  }
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, message: "Sem permissão." };

  const supabase = createClient();

  // Check limit (Instagram Graph API: 30 hashtags per business).
  const { count } = await supabase
    .from("hashtag_watches")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.company_id);
  if ((count ?? 0) >= 30) {
    return {
      ok: false,
      message: "Limite Instagram Graph API: 30 hashtags por empresa.",
    };
  }

  const { error } = await supabase.from("hashtag_watches").insert({
    company_id: ctx.company_id,
    hashtag: parsed.data.hashtag,
    created_by: ctx.user_id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Essa hashtag já está cadastrada." };
    }
    console.error("[instagram/addHashtag] error", error);
    return { ok: false, message: "Erro ao adicionar." };
  }

  revalidatePath("/configuracoes/instagram");
  return { ok: true };
}

export async function removeHashtag(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = removeHashtagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "ID inválido." };

  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, message: "Sem permissão." };

  const supabase = createClient();
  const { error } = await supabase
    .from("hashtag_watches")
    .delete()
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company_id);

  if (error) {
    console.error("[instagram/removeHashtag] error", error);
    return { ok: false, message: "Erro ao remover." };
  }

  revalidatePath("/configuracoes/instagram");
  return { ok: true };
}

export async function disconnectInstagram(): Promise<ActionResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, message: "Sem permissão." };

  const supabase = createClient();
  const { error } = await supabase
    .from("instagram_connections")
    .delete()
    .eq("company_id", ctx.company_id);

  if (error) {
    console.error("[instagram/disconnect] error", error);
    return { ok: false, message: "Erro ao desconectar." };
  }

  revalidatePath("/configuracoes/instagram");
  return { ok: true };
}
