import { z } from "zod";

export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "200+"] as const;
export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

/**
 * Schema do form de captura de leads em /demo.
 *
 * Validação client-side via Zod + react-hook-form. Server-side de
 * verdade vai entrar no sub-bloco B2 (insert na tabela demo_leads
 * via Supabase + notificação Telegram/Resend).
 *
 * - name: trim, min 2 (igual policy do display_name no apps/web).
 * - email: trim + lowercase + valida.
 * - company: opcional, max 100.
 * - phone: opcional, max 20 (mask aplicada client-side, não validada
 *   por regex pra não rejeitar formatos válidos como "+55 11 ...").
 * - employees: enum fechado.
 * - use_case: opcional, max 1000.
 *
 * UtmContext é capturado da URL (searchParams) + document.referrer,
 * passado como hidden no submit pra compor com os campos do form.
 */
export const demoLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome precisa ter pelo menos 2 caracteres.")
    .max(100, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  company: z.string().trim().max(100, "Nome de empresa muito longo.").optional(),
  phone: z.string().trim().max(20, "Telefone muito longo.").optional(),
  employees: z.enum(EMPLOYEE_RANGES, {
    errorMap: () => ({ message: "Selecione o tamanho da empresa." }),
  }),
  use_case: z
    .string()
    .trim()
    .max(1000, "Descrição muito longa (máx. 1000 caracteres).")
    .optional(),
});

export type DemoLeadInput = z.infer<typeof demoLeadSchema>;

export type UtmContext = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

/**
 * Mask BR pra telefone: aceita string com qualquer formato e devolve
 * (XX) XXXXX-XXXX (celular 11 dígitos) ou (XX) XXXX-XXXX (fixo 10).
 * Trunca em 11 dígitos de DDD+número (sem +55).
 */
export function maskPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
