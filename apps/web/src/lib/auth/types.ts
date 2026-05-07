/**
 * Type compartilhado entre os auth server actions e os forms client.
 *
 * Vive aqui (não em `app/actions/auth.ts`) porque arquivos com `"use server"`
 * só podem exportar async functions. Tipos são apagados em compile, mas
 * mantê-los fora evita confusão e regressões em versões futuras do Next.js.
 */
export type AuthState = {
  errors?: {
    email?: string[];
    password?: string[];
    display_name?: string[];
    confirm_password?: string[];
    _form?: string[];
  };
  success?: boolean;
  message?: string;
  /** Sinaliza pra UI mostrar link "Reenviar confirmação". */
  emailNotConfirmed?: boolean;
  /** Echo do e-mail pra reenvio sem o user reescrever. */
  email?: string;
};
