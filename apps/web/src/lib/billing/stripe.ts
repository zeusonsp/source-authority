import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env-server";
import type { PlanSlug } from "@/lib/billing/plans";

// Re-export helpers client-safe pra ergonomia (cara que importa stripe.ts
// no server tem tudo num arquivo só, mesmo se quisesse).
export {
  PLAN_LABELS,
  PLAN_AMOUNTS_BRL,
  PLAN_ORDER,
  isPlanSlug,
  type PlanSlug,
} from "@/lib/billing/plans";

/**
 * Stripe client singleton (server-only).
 *
 * `import "server-only"` falha o build se este módulo for puxado pra um
 * Client Component. Garante que STRIPE_SECRET_KEY nunca vaza no bundle do
 * browser.
 *
 * apiVersion fixada — sem isso a SDK usa a versão padrão da conta do
 * Dashboard, que pode mudar silenciosamente. "2025-02-24.acacia" é a
 * versão estável atual da SDK 17.x; subir junto com bumps da lib.
 *
 * `appInfo` aparece nos logs do Stripe — facilita correlacionar requests
 * em produção.
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
  appInfo: {
    name: "source-authority-web",
    url: "https://app.sourceauthority.com.br",
  },
});

/**
 * Mapeia plano → Stripe Price ID. Resolvido em build/boot via env.
 *
 * Decisão: usar Price IDs literais em vez de Lookup Keys. Lookup adiciona
 * round-trip a cada checkout pra resolver ID e é ponto de falha extra.
 *
 * Server-only: o env-server resolve as vars e este record nunca é serializado
 * pro client (que não precisa dos IDs — só usa o redirect URL retornado).
 */
export const PLAN_PRICE_IDS: Record<PlanSlug, string> = {
  starter: env.STRIPE_PRICE_STARTER,
  growth: env.STRIPE_PRICE_GROWTH,
  pro: env.STRIPE_PRICE_PRO,
  business: env.STRIPE_PRICE_BUSINESS,
};
