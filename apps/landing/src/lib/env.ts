import { z } from "zod";

/**
 * Schema de variáveis CLIENT-SAFE. Apenas vars com prefixo
 * NEXT_PUBLIC_ + NODE_ENV. Importável em qualquer runtime.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente client-side inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao carregar env client.");
}

export const env = parsed.data;
