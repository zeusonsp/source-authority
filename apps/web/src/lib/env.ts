import { z } from "zod";

/**
 * Schema de variáveis de ambiente validado em runtime.
 *
 * NESTE CHUNK as vars do Supabase ficam OPCIONAIS porque a integração
 * Supabase ainda não aconteceu — o dev server precisa bootar mesmo sem
 * .env.local. No próximo chunk (Supabase clients), elas viram required
 * e o build falha cedo se faltarem.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar variáveis de ambiente.");
}

export const env = parsed.data;
