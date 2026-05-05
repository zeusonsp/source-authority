import { z } from "zod";
import {
  isReservedSlug,
  isValidSlugFormat,
  normalizeSlug,
} from "@source-authority/shared";

/**
 * Tamanhos de empresa aceitos no onboarding. Lista canônica — virar enum
 * no DB quando a Fase 7 (Stripe) entrar e precisar gating por tamanho.
 */
export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];

/**
 * Schema do form de onboarding.
 *
 * - name: trim + min 2 (igual policy do display_name).
 * - slug: trim + lowercase + valida formato (paridade com CHECK do DB) +
 *         rejeita reservados. Server action re-valida via RPC create_company.
 * - segment: TODO virar enum quando tivermos lista canônica de segmentos.
 * - size: enum fechado, default 11-50.
 *
 * CNPJ não está aqui — opcional, preenchido depois em /configuracoes.
 */
export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome da empresa precisa ter pelo menos 2 caracteres.")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  slug: z
    .string()
    .transform(normalizeSlug)
    .refine(isValidSlugFormat, {
      message:
        "Slug inválido. Use 2-32 caracteres minúsculos, números e hífens internos (ex: zeus, marca-x).",
    })
    .refine((s) => !isReservedSlug(s), {
      message: "Esse slug é reservado. Escolha outro.",
    }),
  segment: z
    .string()
    .trim()
    .min(2, "Informe um segmento (ex: AV/Automação, Cosméticos, Suplementos).")
    .max(80, "Segmento muito longo."),
  size: z.enum(COMPANY_SIZES, {
    errorMap: () => ({ message: "Selecione um tamanho de empresa." }),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
