import "server-only";

import { z } from "zod";
import { env as clientEnv } from "./env";

/**
 * Schema de vars SERVER-ONLY pro apps/landing.
 *
 * `import "server-only"` faz build falhar se algum arquivo client puxar
 * isso transitivamente — garante que api keys nunca vazem pro bundle
 * do browser.
 *
 * Telegram foi pulado no B2 (decisão 2026-05-07) — quando re-introduzir,
 * adicionar TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID aqui e plugar em
 * notifyLead() na server action sem refactor pesado.
 */
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  LEADS_NOTIFICATION_EMAIL: z.string().email(),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

const parsed = serverEnvSchema.safeParse({
  // Compat com pattern do apps/web (NEXT_PUBLIC_SUPABASE_URL serve client
  // e server). Mas apps/landing prefere SUPABASE_URL puro pra deixar
  // claro que esse env só faz sentido server-side. Cai no fallback do
  // NEXT_PUBLIC se SUPABASE_URL não estiver setado.
  SUPABASE_URL:
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  LEADS_NOTIFICATION_EMAIL: process.env.LEADS_NOTIFICATION_EMAIL,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente server-side inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar env server (apps/landing).");
}

export const env = { ...clientEnv, ...parsed.data };
