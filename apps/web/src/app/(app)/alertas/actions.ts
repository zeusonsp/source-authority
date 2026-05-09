"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ALERT_STATUSES, type AlertStatus } from "@/lib/alerts/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions de triagem de alertas (Pillar 2).
 *
 * Owners/admins podem mudar status de um alert (`new` → `triaged` |
 * `dismissed` | `resolved`). RLS no DB também filtra; aqui validamos
 * cedo pra mensagem amigável.
 */

export type TriageResult =
  | { ok: true }
  | { ok: false; code: "validation" | "forbidden" | "unknown"; message: string };

const triageSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ALERT_STATUSES as unknown as [AlertStatus, ...AlertStatus[]]),
});

async function authorizeAdmin(): Promise<{
  user_id: string;
  company_id: string;
} | null> {
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

export async function triageAlert(input: {
  id: string;
  status: AlertStatus;
}): Promise<TriageResult> {
  const parsed = triageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: "Input inválido." };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) {
    return {
      ok: false,
      code: "forbidden",
      message: "Sem permissão. Apenas owner/admin podem triar alertas.",
    };
  }

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("alerts" as never) as any)
    .update({
      status: parsed.data.status,
      triaged_at: new Date().toISOString(),
      triaged_by: ctx.user_id,
    })
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company_id);

  if (error) {
    console.error("[/alertas] triage update error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "Não foi possível atualizar o alerta.",
    };
  }

  revalidatePath("/alertas");
  return { ok: true };
}
