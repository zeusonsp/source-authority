"use server";

import { headers } from "next/headers";
import {
  demoLeadSchema,
  type DemoLeadInput,
} from "@/lib/demo/schemas";
import { env } from "@/lib/env-server";
import {
  renderLeadEmail,
  sendResendEmail,
} from "@/lib/notifications/resend";
import { checkDemoLeadRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type SubmitDemoLeadResult =
  | { success: true }
  | { success: false; code: "validation"; fieldErrors: Record<string, string[] | undefined> }
  | { success: false; code: "rate_limited"; message: string }
  | { success: false; code: "honeypot"; message: string }
  | { success: false; code: "unknown"; message: string };

/**
 * Payload completo do form + atribuição capturada client-side.
 * Sub-set tipado pra não passar `unknown` adentro.
 */
export type SubmitDemoLeadPayload = DemoLeadInput & {
  /** Honeypot — humanos não preenchem; bots sim. Vazio = OK. */
  website?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
};

/**
 * Server action de submit do form /demo. Orquestra:
 * 1. Honeypot check (rejeita bots silenciosamente).
 * 2. Zod re-validação (defesa em profundidade).
 * 3. Rate limit Upstash (10 / IP / 10 min).
 * 4. INSERT em demo_leads via service_role (bypassa RLS).
 * 5. notifyLead() — Resend e-mail no momento; canais adicionais
 *    (Telegram etc.) plugam aqui sem refactor.
 *
 * Retorna Result tipado pro client renderizar erro específico.
 */
export async function submitDemoLead(
  payload: SubmitDemoLeadPayload,
): Promise<SubmitDemoLeadResult> {
  // ── 1. Honeypot ────────────────────────────────────────────────────────
  // Campo `website` é renderizado invisível no form. Bot scraper preenche
  // todo input visível (ou reconhece "website"); humano não vê. Resposta
  // genérica de sucesso impede que o bot saiba que detectamos.
  if (payload.website && payload.website.trim().length > 0) {
    return {
      success: false,
      code: "honeypot",
      message: "Submissão inválida.",
    };
  }

  // ── 2. Zod re-validate ─────────────────────────────────────────────────
  const parsed = demoLeadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // ── 3. Rate limit ──────────────────────────────────────────────────────
  // IP via header padrão do Vercel/Cloudflare/proxy. x-forwarded-for vem
  // como "client, proxy1, proxy2" — o primeiro é o real do cliente.
  const headerStore = headers();
  const xff = headerStore.get("x-forwarded-for") ?? "";
  const ip =
    xff.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "0.0.0.0";

  const userAgent = headerStore.get("user-agent") ?? null;

  const rl = await checkDemoLeadRateLimit(ip);
  if (!rl.success) {
    return {
      success: false,
      code: "rate_limited",
      message:
        "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    };
  }

  // ── 4. INSERT em demo_leads ────────────────────────────────────────────
  const insertPayload = {
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company ?? null,
    phone: parsed.data.phone ?? null,
    employees: parsed.data.employees,
    use_case: parsed.data.use_case ?? null,
    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_content: payload.utm_content ?? null,
    utm_term: payload.utm_term ?? null,
    referrer: payload.referrer ?? null,
    ip_address: ip,
    user_agent: userAgent,
  };

  const { error: insertError } = await supabaseAdmin
    .from("demo_leads")
    .insert(insertPayload);

  if (insertError) {
    console.error("[submitDemoLead] insert error:", insertError);
    return {
      success: false,
      code: "unknown",
      message:
        "Não foi possível registrar o pedido. Tente novamente em alguns instantes.",
    };
  }

  // ── 5. Notificações ────────────────────────────────────────────────────
  await notifyLead(insertPayload);

  return { success: true };
}

/**
 * Disparo de notificações pós-insert. Hoje só Resend; Telegram foi
 * pulado no B2 (decisão 2026-05-07, ver CLAUDE.md tech debt).
 *
 * Quando voltarem múltiplos canais, troca o `try/catch` simples por
 * `Promise.allSettled([resend, telegram, ...])` — DB insert é a fonte
 * de verdade; falha de notificação NUNCA deve quebrar o fluxo do
 * usuário (lead já está salvo).
 */
async function notifyLead(payload: {
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  employees: string;
  use_case: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  ip_address: string;
  user_agent: string | null;
}): Promise<void> {
  const subject = `🔔 Lead novo: ${payload.name}${
    payload.company ? ` (${payload.company})` : ""
  }`;

  const html = renderLeadEmail(payload);

  const result = await sendResendEmail({
    from: "Source Authority <noreply@sourceauthority.com.br>",
    to: env.LEADS_NOTIFICATION_EMAIL,
    subject,
    html,
  });

  if (!result.ok) {
    // Log + segue. DB insert já foi feito; lead não se perde.
    console.warn("[notifyLead] resend failed:", result.error);
  }
}
