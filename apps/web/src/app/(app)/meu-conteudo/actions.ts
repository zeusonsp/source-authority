"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categorizeMatch, computeDHash, hammingDistance } from "@/lib/content/hash";
import { fetchSource } from "@/lib/content/fetch-source";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions para Pillar 2.5 V1 — Content Registry.
 *
 * - registerContent({source_url, title?, notes?})
 *     fetcha thumbnail, computa dHash, INSERT contents.
 * - checkSuspect({suspect_url})
 *     fetcha thumbnail do post suspeito, dHash, compara contra TODOS os
 *     contents da empresa, retorna best match + score.
 * - deleteContent({id})
 *
 * Auth: validação owner/admin via memberships antes de cada action (RLS no
 * DB também filtra mas dá mensagem amigável aqui).
 */

export type ActionFailureCode =
  | "validation"
  | "forbidden"
  | "duplicate"
  | "fetch_failed"
  | "private_post"
  | "no_thumbnail"
  | "invalid_url"
  | "platform_unsupported"
  | "unknown";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | {
      ok: false;
      code: ActionFailureCode;
      message: string;
    };

const registerSchema = z.object({
  source_url: z.string().url().max(2000),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const checkSchema = z.object({
  suspect_url: z.string().url().max(2000),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
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

export async function registerContent(input: {
  source_url: string;
  title?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string; thumbnail_url: string | null }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "URL inválida.",
    };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, code: "forbidden", message: "Sem permissão." };

  const supabase = createClient();

  // Fetch source: thumbnail + metadata.
  const source = await fetchSource(parsed.data.source_url);
  if (!source.ok) {
    return {
      ok: false,
      code: source.reason as ActionFailureCode,
      message: messageForReason(source.reason, source.detail),
    };
  }

  // Compute dHash da thumbnail.
  let dhash: string;
  try {
    dhash = await computeDHash(source.thumbnail);
  } catch (err) {
    console.error("[content/register] hash failed", err);
    return {
      ok: false,
      code: "unknown",
      message: "Falha ao processar imagem.",
    };
  }

  const { data, error } = await supabase
    .from("contents")
    .insert({
      company_id: ctx.company_id,
      source_platform: source.metadata.platform,
      source_url: parsed.data.source_url,
      external_id: source.metadata.external_id,
      thumbnail_url: source.metadata.thumbnail_url,
      thumbnail_dhash: dhash,
      title: parsed.data.title || source.metadata.title || null,
      notes: parsed.data.notes || null,
      duration_seconds: source.metadata.duration_seconds,
      status: "ready",
      registered_by: ctx.user_id,
    })
    .select("id, thumbnail_url")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "Esse conteúdo já está cadastrado.",
      };
    }
    console.error("[content/register] insert error", error);
    return {
      ok: false,
      code: "unknown",
      message: "Erro ao salvar.",
    };
  }

  revalidatePath("/meu-conteudo");
  return { ok: true, data: { id: data.id, thumbnail_url: data.thumbnail_url } };
}

export type SuspectMatchResult = {
  ok: true;
  suspect: {
    url: string;
    platform: string;
    thumbnail_url: string | null;
    title: string | null;
  };
  best_match: {
    content_id: string;
    title: string | null;
    source_url: string;
    thumbnail_url: string | null;
    distance: number;
    similarity_pct: number;
    category: "exact" | "very_likely" | "possible" | "different";
  } | null;
  candidates: Array<{
    content_id: string;
    title: string | null;
    source_url: string;
    distance: number;
    similarity_pct: number;
  }>;
};

export async function checkSuspect(input: {
  suspect_url: string;
}): Promise<ActionResult<SuspectMatchResult> | SuspectMatchResult> {
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "URL inválida.",
    };
  }

  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, code: "forbidden", message: "Sem permissão." };

  const supabase = createClient();

  // Fetch suspect.
  const source = await fetchSource(parsed.data.suspect_url);
  if (!source.ok) {
    return {
      ok: false,
      code: source.reason as ActionFailureCode,
      message: messageForReason(source.reason, source.detail),
    };
  }

  let suspectHash: string;
  try {
    suspectHash = await computeDHash(source.thumbnail);
  } catch {
    return { ok: false, code: "unknown", message: "Falha ao processar imagem suspeita." };
  }

  // Pull todos contents ready da empresa pra comparar in-memory.
  // V1 simples; quando registry passar de ~10k, vira RPC com índice trigram.
  const { data: contents } = await supabase
    .from("contents")
    .select("id, title, source_url, thumbnail_url, thumbnail_dhash")
    .eq("company_id", ctx.company_id)
    .eq("status", "ready")
    .not("thumbnail_dhash", "is", null);

  const candidates = (contents ?? [])
    .map((c) => {
      if (!c.thumbnail_dhash) return null;
      const distance = hammingDistance(c.thumbnail_dhash, suspectHash);
      return {
        content_id: c.id,
        title: c.title,
        source_url: c.source_url,
        thumbnail_url: c.thumbnail_url,
        distance,
        similarity_pct: Math.round((1 - distance / 64) * 100),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.distance - b.distance);

  const top = candidates[0];
  const result: SuspectMatchResult = {
    ok: true,
    suspect: {
      url: parsed.data.suspect_url,
      platform: source.metadata.platform,
      thumbnail_url: source.metadata.thumbnail_url,
      title: source.metadata.title,
    },
    best_match:
      top && top.distance <= 25
        ? {
            content_id: top.content_id,
            title: top.title,
            source_url: top.source_url,
            thumbnail_url: top.thumbnail_url,
            distance: top.distance,
            similarity_pct: top.similarity_pct,
            category: categorizeMatch(top.distance),
          }
        : null,
    candidates: candidates.slice(0, 5).map((c) => ({
      content_id: c.content_id,
      title: c.title,
      source_url: c.source_url,
      distance: c.distance,
      similarity_pct: c.similarity_pct,
    })),
  };
  return result;
}

export async function deleteContent(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: "ID inválido." };
  }
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, code: "forbidden", message: "Sem permissão." };

  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .delete()
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company_id);

  if (error) {
    console.error("[content/delete] error", error);
    return { ok: false, code: "unknown", message: "Erro ao excluir." };
  }

  revalidatePath("/meu-conteudo");
  return { ok: true };
}

function messageForReason(reason: string, detail?: string): string {
  switch (reason) {
    case "invalid_url":
      return "URL inválida. Verifica se é um link público completo.";
    case "platform_unsupported":
      return "Plataforma não suportada nessa versão.";
    case "fetch_failed":
      return `Não consegui acessar a URL. ${detail ?? ""}`.trim();
    case "no_thumbnail":
      return "Não encontrei imagem de preview no post. Pode ser conteúdo apenas-texto ou link quebrado.";
    case "private_post":
      return "Este post parece ser privado — só consigo cadastrar conteúdo público.";
    default:
      return "Erro inesperado.";
  }
}
