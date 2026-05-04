import { z } from "zod";

/**
 * Schema de variáveis de ambiente CLIENT-SAFE.
 *
 * Apenas vars com prefixo NEXT_PUBLIC_ + NODE_ENV. Importável em qualquer
 * runtime (RSC, client, edge/middleware). Para vars secretas (service_role),
 * use `@/lib/env-server`.
 *
 * Importante: passamos as vars EXPLICITAMENTE para o `safeParse` (em vez de
 * `process.env` cru). Isso garante que o substituidor estático do Next.js
 * inline as vars NEXT_PUBLIC_* no bundle do client em build time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente client-side inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar env client.");
}

export const env = parsed.data;
