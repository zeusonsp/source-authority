import "server-only";

import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { stripe, PLAN_PRICE_IDS, type PlanSlug } from "@/lib/billing/stripe";
import { env } from "@/lib/env-server";

/**
 * Stripe webhook handler — Phase 7 (B7.4).
 *
 * Recebe eventos de billing do Stripe, valida assinatura, normaliza
 * payload e chama RPC `apply_subscription_event` (idempotente via
 * UNIQUE provider+event_id na tabela `subscription_events`).
 *
 * Eventos handled:
 *   - checkout.session.completed       → grava customer/sub/status=trialing
 *   - customer.subscription.updated    → status + trial_ends_at + plan
 *   - customer.subscription.deleted    → status=canceled, plan=starter
 *   - invoice.payment_succeeded        → status=active, plan_renewed_at=now
 *   - invoice.payment_failed           → status=past_due
 *
 * Eventos não-listados também passam — registramos no audit (event_ignored)
 * mas sem alterar companies. Isso vale pra customer.created, invoice.created,
 * payment_intent.*, etc — Stripe envia muitos eventos auxiliares que não
 * precisam mudar nosso modelo.
 *
 * Decisão: sempre retorna 200 após signature verify, EXCETO se a RPC
 * falhar com erro inesperado. Stripe retenta por 3 dias em non-2xx;
 * webhooks em batch processam mais rápido se confirmamos rápido.
 */

// Stripe.webhooks.constructEvent precisa do raw body (não JSON parseado).
// runtime: nodejs garante Buffer/string nativo. Edge runtime não suporta
// crypto sync usado pelo verify.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminClient = ReturnType<typeof createAdminClient>;

function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Reverse-lookup: Stripe price id → nosso PlanSlug. */
function planFromPriceId(priceId: string | null | undefined): PlanSlug | null {
  if (!priceId) return null;
  for (const [slug, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return slug as PlanSlug;
  }
  return null;
}

/** Mapeia status do Stripe pro nosso enum billing_status. */
function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" | null {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return null;
    default:
      return null;
  }
}

function unixToIso(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

/** Resolve company_id por stripe_customer_id (sub/invoice events). */
async function findCompanyByCustomer(
  supabase: AdminClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[stripe-webhook] findCompanyByCustomer error", error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

type RpcParams = {
  company_id: string | null;
  new_plan: PlanSlug | null;
  new_status: "trialing" | "active" | "past_due" | "canceled" | null;
  customer_id: string | null;
  subscription_id: string | null;
  trial_ends_at: string | null;
  renewed_at: string | null;
};

/** Mapeia evento → params da RPC. */
async function buildRpcParams(
  event: Stripe.Event,
  supabase: AdminClient,
): Promise<RpcParams> {
  const empty: RpcParams = {
    company_id: null,
    new_plan: null,
    new_status: null,
    customer_id: null,
    subscription_id: null,
    trial_ends_at: null,
    renewed_at: null,
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Subscription mode only — one-off ignorado.
      if (session.mode !== "subscription") return empty;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null);
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null);

      // client_reference_id setado por createCheckoutSession = company_id.
      const companyId = session.client_reference_id ?? null;

      // Buscar plano via subscription line_item (precisa retrieve, session
      // não traz price expandido por padrão).
      let plan: PlanSlug | null = null;
      let trialEnd: string | null = null;
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          plan = planFromPriceId(sub.items.data[0]?.price.id);
          trialEnd = unixToIso(sub.trial_end);
        } catch (err) {
          console.warn("[stripe-webhook] retrieve sub failed", {
            subscriptionId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return {
        company_id: companyId,
        new_plan: plan,
        new_status: trialEnd ? "trialing" : "active",
        customer_id: customerId,
        subscription_id: subscriptionId,
        trial_ends_at: trialEnd,
        renewed_at: null,
      };
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const companyId = await findCompanyByCustomer(supabase, customerId);
      return {
        company_id: companyId,
        new_plan: planFromPriceId(sub.items.data[0]?.price.id),
        new_status: mapStripeStatus(sub.status),
        customer_id: customerId,
        subscription_id: sub.id,
        trial_ends_at: unixToIso(sub.trial_end),
        renewed_at: null,
      };
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const companyId = await findCompanyByCustomer(supabase, customerId);
      return {
        company_id: companyId,
        // Cancel retorna ao starter (free) — usuário continua tendo acesso
        // ao link mestre, mas sem features pagas.
        new_plan: "starter",
        new_status: "canceled",
        customer_id: customerId,
        subscription_id: sub.id,
        trial_ends_at: null,
        renewed_at: null,
      };
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Apenas invoices de subscription. one-off (invoice.subscription = null) ignorado.
      if (!invoice.subscription) return empty;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer?.id ?? null);
      if (!customerId) return empty;

      const companyId = await findCompanyByCustomer(supabase, customerId);
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription.id;

      return {
        company_id: companyId,
        new_plan: null, // payment_succeeded não muda plano
        new_status: "active",
        customer_id: customerId,
        subscription_id: subscriptionId,
        trial_ends_at: null,
        renewed_at: new Date().toISOString(),
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) return empty;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer?.id ?? null);
      if (!customerId) return empty;

      const companyId = await findCompanyByCustomer(supabase, customerId);
      return {
        company_id: companyId,
        new_plan: null,
        new_status: "past_due",
        customer_id: customerId,
        subscription_id:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id,
        trial_ends_at: null,
        renewed_at: null,
      };
    }

    default:
      // Eventos não-listados gravam só em subscription_events (auditoria),
      // sem alterar companies. RPC apply_subscription_event lida com isso
      // quando company_id=null + status=null.
      return empty;
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // Raw body é OBRIGATÓRIO pra Stripe.webhooks.constructEvent. App Router
  // não pré-parseia em route handlers; req.text() retorna o raw.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn("[stripe-webhook] signature verify failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const params = await buildRpcParams(event, supabase);

  // Types gerados (Supabase) marcam _company_id como required string e
  // _payload como Json estrito. Em runtime a RPC aceita null em _company_id
  // (short-circuit no SQL pra "evento órfão"), e o payload é qualquer objeto
  // serializável. Cast via unknown pra reconciliar.
  const rpcArgs = {
    _company_id: params.company_id,
    _provider: "stripe",
    _provider_event_id: event.id,
    _event_type: event.type,
    _payload: event.data.object,
    _new_plan: params.new_plan ?? undefined,
    _new_status: params.new_status ?? undefined,
    _stripe_customer_id: params.customer_id ?? undefined,
    _stripe_sub_id: params.subscription_id ?? undefined,
    _trial_ends_at: params.trial_ends_at ?? undefined,
    _renewed_at: params.renewed_at ?? undefined,
  };
  const { error } = await supabase.rpc(
    "apply_subscription_event",
    rpcArgs as unknown as Parameters<
      typeof supabase.rpc<"apply_subscription_event">
    >[1],
  );

  if (error) {
    // Stripe retenta em non-2xx por 3 dias. Retornamos 500 só pra erros
    // inesperados (RPC down, schema mismatch). Erros de payload "esquisito"
    // já são short-circuited em buildRpcParams (returna empty).
    console.error("[stripe-webhook] apply_subscription_event failed", {
      event_id: event.id,
      event_type: event.type,
      err: error,
    });
    return NextResponse.json({ error: "rpc failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
