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
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente server-side inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar env server.");
}

export const env = { ...clientEnv, ...parsed.data };
