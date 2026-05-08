import { z } from "zod";

/**
 * Política de senha — alinhada ao NIST SP 800-63B (atualização 2024):
 * mínimo 8 caracteres, requer pelo menos 1 letra e 1 número.
 * Sem exigência de caractere especial — fricção alta sem ganho real.
 */
const passwordPolicy = z
  .string()
  .min(8, "Senha precisa ter pelo menos 8 caracteres.")
  .regex(/[A-Za-z]/, "Senha precisa ter pelo menos 1 letra.")
  .regex(/[0-9]/, "Senha precisa ter pelo menos 1 número.");

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  // Login não valida força — só não vazio. Compat retroativa com qualquer senha existente.
  password: z.string().min(1, "Senha é obrigatória."),
});

export const signupSchema = z
  .object({
    display_name: z
      .string()
      .min(2, "Nome precisa ter pelo menos 2 caracteres.")
      .max(50, "Nome muito longo (máximo 50 caracteres)."),
    email: z.string().email("E-mail inválido."),
    password: passwordPolicy,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não conferem.",
    path: ["confirm_password"],
  });

export const resendConfirmationSchema = z.object({
  email: z.string().email("E-mail inválido."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido."),
});

export const resetPasswordSchema = z
  .object({
    password: passwordPolicy,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não conferem.",
    path: ["confirm_password"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
