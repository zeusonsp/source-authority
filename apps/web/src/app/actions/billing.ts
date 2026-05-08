"use server";

import "server-only";

import { headers } from "next/headers";
import { isPlanSlug, PLAN_PRICE_IDS, type PlanSlug, stripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Companies row tem colunas Stripe que ainda não estão na database.types.ts
// (a migration 20260508100000_billing.sql ainda não foi aplicada). Tipo
// helper local pra acessar essas colunas sem espalhar `as any` na lógica.
type CompanyBillingRow = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: string;
  billing_exempt: boolean;
};

/**
 * Resultado dos server actions de billing. Sempre retornam objeto serializável
 * (nada de redirect server-side — o client decide pra onde mandar).
 *
 * `error: 'forbidden'` cobre tanto "não logado" quanto "sem membership
 * owner/admin". A UI mostra a mesma mensagem nos dois casos (não vaza
 * existência de empresa pra usuário sem permissão).
 */
export type CheckoutSessionResult =
  | { url: string }
  | { error: "forbidden" | "unknown" };

export type PortalSessionResult =
  | { url: string }
  | { error: "forbidden" | "no_customer" | "unknown" };

/**
 * Resolve origin pra success/cancel URLs. Stripe exige absolute URLs.
 * Prioridade: header Origin (request real) → NEXT_PUBLIC_APP_URL (build-time
 * fallback). Header funciona em prod e dev; env é fallback defensivo.
 */
function resolveOrigin(): string {
  const headerList = headers();
  const origin = headerList.get("origin") ?? headerList.get("x-forwarded-host");
  if (origin && origin.startsWith("http")) return origin;
  if (origin) {
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${origin}`;
  }
  return env.NEXT_PUBLIC_APP_URL;
}

/**
 * Verifica que o user logado é owner/admin da company. Usado em ambos os
 * actions pra negar UPGRADE não-autorizado e pra negar abrir portal de
 * pagamento por member/viewer.
 *
 * Retorna { user, company } se autorizado, ou null se forbidden.
 *
 * RLS já filtra companies pelo membership do user, mas confirmamos role
 * explicitamente — owner/admin vs member/viewer importa.
 */
async function authorizeAdmin(company_id: string): Promise<
  | {
      userId: string;
      userEmail: string;
      company: CompanyBillingRow;
    }
  | null
> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || !user.email) return null;

  // Confirma membership owner/admin.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, company_id")
    .eq("company_id", company_id)
    .eq("user_id", user.id)
    .limit(1);

  if (!memberships || memberships.length === 0) return null;
  const membership = memberships[0]!;
  if (membership.role !== "owner" && membership.role !== "admin") return null;

  // Busca company com colunas billing. Cast porque database.types.ts ainda
  // não tem essas colunas (migration pendente).
  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, stripe_customer_id, stripe_subscription_id, billing_status, billing_exempt",
    )
    .eq("id", company_id)
    .single();

  if (!company) return null;

  return {
    userId: user.id,
    userEmail: user.email,
    // TODO(ssr-0.5.2): cast por causa do type propagation do @supabase/ssr.
    // Remover quando migration billing for aplicada e types regenerados.
    company: company as unknown as CompanyBillingRow,
  };
}

/**
 * Cria Stripe Checkout Session pra assinatura. UI redireciona pro `url`
 * retornado, Stripe coleta cartão, dispara webhook checkout.session.completed
 * → handler grava stripe_customer_id + stripe_subscription_id na company.
 *
 * Decisões importantes:
 *  - mode: 'subscription' (recorrente, não one-off).
 *  - trial_period_days: 14 — alinha com promessa de "14 dias grátis" da
 *    landing. Stripe não cobra cartão durante o trial mas EXIGE cartão
 *    no checkout (pra não-fricção pós-trial).
 *  - customer reuse: se a company já tem stripe_customer_id (downgrade,
 *    re-subscribe após cancel), passa `customer` pro Stripe vincular ao
 *    cliente existente. Senão passa `customer_email` e Stripe cria novo.
 *  - client_reference_id: company_id — webhook usa pra resolver target
 *    quando o customer ainda não foi gravado no DB (race condition).
 *  - locale: 'pt-BR' — Checkout em português.
 *  - idempotency_key: company_id + plan + minute. Protege double-click
 *    do botão sem criar 2 sessions. Granularidade 1 min é OK porque um
 *    user racional não troca de plano duas vezes em <1min.
 *
 * TODO: handler webhook em /api/billing/stripe/webhook (B7.4) processa
 * checkout.session.completed e chama RPC apply_subscription_event.
 */
export async function createCheckoutSession({
  company_id,
  plan,
}: {
  company_id: string;
  plan: PlanSlug;
}): Promise<CheckoutSessionResult> {
  // Validação defensiva: client poderia mandar plan inválido.
  if (!isPlanSlug(plan)) return { error: "forbidden" };
  // company_id precisa ser uuid válido — apenas formato (a auth check
  // confirma existência+permissão).
  if (
    typeof company_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company_id)
  ) {
    return { error: "forbidden" };
  }

  const ctx = await authorizeAdmin(company_id);
  if (!ctx) return { error: "forbidden" };

  // Empresa cortesia (Zeus dogfood) não passa por checkout. Defesa em
  // profundidade — UI já desabilita o botão.
  if (ctx.company.billing_exempt) return { error: "forbidden" };

  const origin = resolveOrigin();
  const priceId = PLAN_PRICE_IDS[plan];

  // Idempotency key em granularidade de 1min. Mesmo botão em <60s = mesma
  // session retornada pelo Stripe (sem cobrança duplicada).
  const idempotencyMinute = Math.floor(Date.now() / 60000);
  const idempotencyKey = `co:${company_id}:plan:${plan}:m:${idempotencyMinute}`;

  // Customer reuse: se já temos customer_id, passa `customer` (mode mutually
  // exclusive com customer_email). Senão passa customer_email pra Stripe
  // criar customer no checkout.
  const customerParams: { customer?: string; customer_email?: string } =
    ctx.company.stripe_customer_id
      ? { customer: ctx.company.stripe_customer_id }
      : { customer_email: ctx.userEmail };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        ...customerParams,
        // 14 dias grátis. Stripe aceita trial mesmo em customer reused.
        subscription_data: { trial_period_days: 14 },
        // Webhook handler usa client_reference_id pra resolver company
        // se o customer_id ainda não estiver gravado no DB.
        client_reference_id: company_id,
        success_url: `${origin}/configuracoes/plano/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/configuracoes/plano`,
        locale: "pt-BR",
        // Permite alterar quantidade no checkout? Não — line_items é fixo
        // (1 plano = 1 quantity). allow_promotion_codes ativo pra cupons.
        allow_promotion_codes: true,
      },
      { idempotencyKey },
    );

    if (!session.url) {
      // Stripe sempre retorna url em hosted checkout. Defesa em profundidade.
      console.error("[billing] checkout session sem url", { session_id: session.id });
      return { error: "unknown" };
    }

    return { url: session.url };
  } catch (err) {
    // Não vaza detalhe técnico pro client. Logamos pro Sentry/console.
    console.error("[billing] createCheckoutSession failed", {
      company_id,
      plan,
      err: err instanceof Error ? err.message : String(err),
    });
    return { error: "unknown" };
  }
}

/**
 * Cria Customer Portal session — onde o user atualiza cartão, cancela,
 * baixa invoices, etc. Stripe-hosted, zero código nosso.
 *
 * Requer stripe_customer_id no DB (não tem como abrir portal sem cliente).
 * Se UI chamar isso pra company sem customer (free trial nunca consumida),
 * retorna error: 'no_customer' pra UI mostrar "primeiro assine um plano".
 */
export async function createPortalSession({
  company_id,
}: {
  company_id: string;
}): Promise<PortalSessionResult> {
  if (
    typeof company_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company_id)
  ) {
    return { error: "forbidden" };
  }

  const ctx = await authorizeAdmin(company_id);
  if (!ctx) return { error: "forbidden" };

  if (!ctx.company.stripe_customer_id) {
    return { error: "no_customer" };
  }

  const origin = resolveOrigin();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.company.stripe_customer_id,
      return_url: `${origin}/configuracoes`,
    });

    return { url: session.url };
  } catch (err) {
    console.error("[billing] createPortalSession failed", {
      company_id,
      err: err instanceof Error ? err.message : String(err),
    });
    return { error: "unknown" };
  }
}
