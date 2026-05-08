/* eslint-disable */
// One-shot: cria 4 Products + 4 Prices BRL recurring monthly + 1 Webhook endpoint.
// Idempotente via metadata.plan — re-rodar não duplica.
//
// Uso: STRIPE_KEY="sk_test_..." node scripts/stripe-setup.cjs
//
// Output: JSON com {prices: {starter, growth, pro, business}, webhook_secret}.
const Stripe = require("../apps/web/node_modules/stripe");

const stripe = new Stripe(process.env.STRIPE_KEY, { apiVersion: "2025-02-24.acacia" });

const PLANS = [
  { slug: "starter",  name: "Source Authority — Starter",  amount: 9700,   description: "Plano Starter — link mestre + dashboard básico." },
  { slug: "growth",   name: "Source Authority — Growth",   amount: 29700,  description: "Plano Growth — Pillar 1 + Pillar 2 (detecção)." },
  { slug: "pro",      name: "Source Authority — Pro",      amount: 69700,  description: "Plano Pro — todos os pilares + alertas immediate." },
  { slug: "business", name: "Source Authority — Business", amount: 149700, description: "Plano Business — multi-tenant + suporte prioritário." },
];

const WEBHOOK_URL = "https://app.sourceauthority.com.br/api/billing/stripe/webhook";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

async function findOrCreateProduct(plan) {
  // Lista busca por metadata.plan (Stripe API não suporta filter direto, listamos active).
  const list = await stripe.products.list({ active: true, limit: 100 });
  const existing = list.data.find((p) => p.metadata?.plan === plan.slug);
  if (existing) return existing;
  return await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { plan: plan.slug, app: "source-authority" },
  });
}

async function findOrCreatePrice(product, plan) {
  // Lista prices ativos do produto.
  const list = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = list.data.find(
    (p) =>
      p.unit_amount === plan.amount &&
      p.currency === "brl" &&
      p.recurring?.interval === "month",
  );
  if (existing) return existing;
  return await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: "brl",
    recurring: { interval: "month" },
    metadata: { plan: plan.slug },
  });
}

async function findOrCreateWebhook() {
  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = list.data.find((w) => w.url === WEBHOOK_URL);
  if (existing) {
    // Re-usa o existente. Mas o secret só é retornado no create — não dá pra
    // recuperar depois. Se já existe e não temos o secret guardado, deletamos
    // e recriamos.
    if (process.env.REUSE_WEBHOOK === "1") {
      return { id: existing.id, secret: null, reused: true };
    }
    await stripe.webhookEndpoints.del(existing.id);
  }
  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "source-authority-web — Phase 7 billing webhook",
  });
  return { id: created.id, secret: created.secret, reused: false };
}

async function main() {
  const result = { prices: {}, webhook: null, products: {} };

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(plan);
    const price = await findOrCreatePrice(product, plan);
    result.products[plan.slug] = product.id;
    result.prices[plan.slug] = price.id;
  }

  result.webhook = await findOrCreateWebhook();

  // Output JSON em stdout pra capture pelo bash.
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("SETUP_ERR:", err.message);
  console.error(err.stack);
  process.exit(1);
});
