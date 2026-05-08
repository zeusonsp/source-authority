"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createResellerSchema,
  deleteResellerSchema,
  updateResellerSchema,
  type CreateResellerInput,
  type UpdateResellerInput,
} from "@/lib/revendedores/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions pra CRUD de reseller_codes (Pillar 3 v1).
 *
 * Auth: RLS no DB já filtra por membership; aqui validamos role
 * (owner/admin) explicitamente pra fail-fast com mensagem amigável
 * em vez de "violation of policy".
 */

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | {
      ok: false;
      code: "validation" | "forbidden" | "duplicate" | "unknown";
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

async function authorizeAdmin(): Promise<
  { user_id: string; company_id: string } | null
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const m = memberships?.[0];
  if (!m) return null;
  if (m.role !== "owner" && m.role !== "admin") return null;

  return { user_id: user.id, company_id: m.company_id };
}

function flattenZod(err: z.ZodError) {
  return err.flatten().fieldErrors;
}

export async function createReseller(
  input: CreateResellerInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createResellerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Dados inválidos.",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) {
    return { ok: false, code: "forbidden", message: "Sem permissão." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reseller_codes")
    .insert({
      company_id: ctx.company_id,
      code: parsed.data.code,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
      created_by: ctx.user_id,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique violation (code já existe pra esta empresa).
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: `Código "${parsed.data.code}" já existe.`,
      };
    }
    console.error("[revendedores] createReseller error", error);
    return { ok: false, code: "unknown", message: "Erro ao criar." };
  }

  revalidatePath("/revendedores");
  return { ok: true, data: { id: data.id } };
}

export async function updateReseller(
  input: UpdateResellerInput,
): Promise<ActionResult> {
  const parsed = updateResellerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Dados inválidos.",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) {
    return { ok: false, code: "forbidden", message: "Sem permissão." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("reseller_codes")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company_id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: `Código "${parsed.data.code}" já existe.`,
      };
    }
    console.error("[revendedores] updateReseller error", error);
    return { ok: false, code: "unknown", message: "Erro ao atualizar." };
  }

  revalidatePath("/revendedores");
  return { ok: true };
}

export async function deleteReseller(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteResellerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "ID inválido.",
    };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) {
    return { ok: false, code: "forbidden", message: "Sem permissão." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("reseller_codes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company_id);

  if (error) {
    console.error("[revendedores] deleteReseller error", error);
    return { ok: false, code: "unknown", message: "Erro ao excluir." };
  }

  revalidatePath("/revendedores");
  return { ok: true };
}
