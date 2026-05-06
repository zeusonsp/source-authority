import { z } from "zod";
import { COMPANY_SIZES } from "@/lib/onboarding/schemas";

/**
 * Schema do form de Configurações.
 *
 * Espelha a validação da RPC `update_company` (migration 0005) — RPC é a
 * fonte da verdade, este schema é UX (mensagens amigáveis antes do round-trip).
 *
 * - name:    trim, 2-100 chars (mesma policy do display_name).
 * - segment: trim, 2-80 chars (mesma do onboarding).
 * - size:    enum COMPANY_SIZES.
 * - default_redirect_url: vazio→null; quando preenchido, HTTPS only +
 *   max 500 chars. Regex IDÊNTICA à do CHECK no DB e à do RPC.
 *
 * slug NÃO está aqui — semântica "permanente após criação"; UI mostra
 * read-only com tooltip.
 */
const HTTPS_URL_REGEX = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/;

export const updateCompanySchema = z.object({
  company_id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, "Nome precisa ter pelo menos 2 caracteres.")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  segment: z
    .string()
    .trim()
    .min(2, "Informe um segmento.")
    .max(80, "Segmento muito longo."),
  size: z.enum(COMPANY_SIZES, {
    errorMap: () => ({ message: "Selecione um tamanho de empresa." }),
  }),
  default_redirect_url: z
    .string()
    .trim()
    .max(500, "URL muito longa (máximo 500 caracteres).")
    .refine(
      (v) => v === "" || HTTPS_URL_REGEX.test(v),
      "URL deve começar com https:// e ter domínio válido (ex: https://exemplo.com).",
    )
    .transform((v) => (v === "" ? null : v)),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
