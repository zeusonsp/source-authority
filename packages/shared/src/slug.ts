/**
 * Slug discipline — utilitário compartilhado entre app e workers.
 *
 * Paridade obrigatória com o CHECK do DB (migration 0002):
 *   slug ~ '^[a-z0-9](-?[a-z0-9])+$' AND length(slug) BETWEEN 2 AND 32
 *
 * Caller deve compor: normalizeSlug → isValidSlugFormat → isReservedSlug.
 * Cada função tem responsabilidade única; nada normaliza implicitamente.
 */

/**
 * Regex idêntica ao CHECK do DB. Aceita 2+ chars, lowercase alfanumérico,
 * hífens internos opcionais (não duplos, não na borda).
 *
 * Exemplos válidos:   "ai", "zeus", "marca-x", "ab1c-d2"
 * Exemplos inválidos: "-zeus", "zeus-", "z--us", "Zeus", "ze us"
 */
const SLUG_FORMAT_REGEX = /^[a-z0-9](-?[a-z0-9])+$/;

const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 32;

/**
 * Slugs reservados (paths internos do app + nomes ambíguos). Lista vive em
 * código (não no DB CHECK) pra ser fácil evoluir sem migration.
 *
 * Critério de inclusão: qualquer rota presente ou planejada do app web,
 * mais nomes que poderiam confundir o usuário ou serem squattados.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "api",
  "app",
  "oficial",
  "login",
  "admin",
  "www",
  "dashboard",
  "onboarding",
  "auth",
  "signup",
  "signin",
  "signout",
  "help",
  "support",
  "about",
  "pricing",
  "terms",
  "privacy",
  "status",
  "blog",
  "docs",
  "settings",
  "account",
  "billing",
  "team",
];

/**
 * Normaliza input cru do usuário: remove whitespace nas bordas e força
 * lowercase. Não valida formato — só normaliza.
 */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * True se a string casa com o formato canônico de slug. Espera input já
 * normalizado — passa `normalizeSlug(raw)` antes pra evitar falso negativo
 * por whitespace ou case.
 */
export function isValidSlugFormat(input: string): boolean {
  return (
    input.length >= SLUG_MIN_LENGTH &&
    input.length <= SLUG_MAX_LENGTH &&
    SLUG_FORMAT_REGEX.test(input)
  );
}

/**
 * True se o slug está na lista de reservados. Espera input já normalizado.
 * Comparação case-sensitive (a lista é toda lowercase) — caller que não
 * normalizou pode ter falso negativo.
 */
export function isReservedSlug(input: string): boolean {
  return RESERVED_SLUGS.includes(input);
}
