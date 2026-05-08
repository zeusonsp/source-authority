/**
 * Constantes client-safe sobre planos. SEM `server-only` — pode ser
 * importado tanto por Server quanto Client Components.
 *
 * Pra acessar a SDK do Stripe (singleton + Price IDs do env), use
 * `@/lib/billing/stripe` (server-only).
 */

export type PlanSlug = "starter" | "growth" | "pro" | "business";

/**
 * Labels de UI. Title Case porque é nome de marca.
 */
export const PLAN_LABELS: Record<PlanSlug, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  business: "Business",
};

/**
 * Valor mensal em centavos (BRL). Source of truth da UI; o valor real cobrado
 * é o do Price ID no Stripe — manter sincronizado com o Dashboard.
 */
export const PLAN_AMOUNTS_BRL: Record<PlanSlug, number> = {
  starter: 9700, // R$ 97,00
  growth: 29700, // R$ 297,00
  pro: 69700, // R$ 697,00
  business: 149700, // R$ 1.497,00
};

/**
 * Lista ordenada (cheap-to-premium) pra iteração nos cards.
 */
export const PLAN_ORDER: PlanSlug[] = ["starter", "growth", "pro", "business"];

/**
 * Type guard. Útil pra validar input de form/route param.
 */
export function isPlanSlug(value: string | null | undefined): value is PlanSlug {
  return (
    value === "starter" ||
    value === "growth" ||
    value === "pro" ||
    value === "business"
  );
}
