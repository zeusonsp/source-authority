import "server-only";

import { z } from "zod";
import { env as clientEnv } from "./env";

/**
 * Schema de variáveis SERVER-ONLY.
 *
 * `import "server-only"` faz o build falhar se este módulo for puxado para
 * dentro de um arquivo client (qualquer arquivo com "use client" ou cadeia
 * de imports até um). Garante que SUPABASE_SERVICE_ROLE_KEY nunca vaze
 * para o bundle do browser.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Resend API key (re_xxx). Usado por src/lib/notifications/resend.ts pra
  // enviar emails de alertas (immediate + daily digest). Sem SDK — fetch direto.
  // Mesma chave já em uso pelo apps/landing (mesma conta Resend, domínio
  // sourceauthority.com.br já verificado com DKIM+SPF).
  RESEND_API_KEY: z.string().min(1),
  // Shared secret pra autenticar requests do workers/brand-monitor pros
  // endpoints internos /api/internal/alerts/notify e /digest. Bearer header.
  // Gere com `openssl rand -hex 32` (32 bytes = 64 hex chars). Mesmo valor
  // precisa estar setado no worker (wrangler secret put).
  INTERNAL_NOTIFICATIONS_SECRET: z.string().min(32),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  INTERNAL_NOTIFICATIONS_SECRET: process.env.INTERNAL_NOTIFICATIONS_SECRET,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente server-side inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar env server.");
}

export const env = { ...clientEnv, ...parsed.data };
