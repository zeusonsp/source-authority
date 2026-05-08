import { z } from "zod";

/**
 * Schemas Zod para CRUD de reseller_codes (Pillar 3 / migration 0010).
 *
 * Match com CHECK constraints SQL:
 *   - code: 1-64 chars, sem whitespace, lowercase normalizado
 *   - name: 1-100 chars
 *   - notes: até 500 chars opcionais
 */

export const RESELLER_CODE_REGEX = /^[a-z0-9._-]+$/;

export const createResellerSchema = z.object({
  // Empresa não vem do form — vem da auth context.
  code: z
    .string()
    .trim()
    .min(1, "Código não pode ser vazio")
    .max(64, "Máximo 64 caracteres")
    .toLowerCase()
    .regex(
      RESELLER_CODE_REGEX,
      "Apenas letras (a-z), dígitos, hífens, underscores e pontos",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(100, "Máximo 100 caracteres"),
  notes: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export const updateResellerSchema = createResellerSchema.extend({
  id: z.string().uuid("ID inválido"),
});

export const deleteResellerSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export type CreateResellerInput = z.infer<typeof createResellerSchema>;
export type UpdateResellerInput = z.infer<typeof updateResellerSchema>;
