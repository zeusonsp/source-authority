import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isPlanSlug, PLAN_LABELS } from "@/lib/billing/stripe";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PollingSucesso } from "./polling-sucesso";

export const metadata = {
  title: "Pagamento confirmado",
};

type CompanyWithBilling = {
  id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: string;
};

type PageProps = {
  searchParams?: { session_id?: string };
};

/**
 * Página de retorno do Stripe Checkout.
 *
 * Race condition: Stripe redirects rapidamente após pagamento, mas o webhook
 * que grava stripe_subscription_id pode levar 1-2s pra processar. Estratégia:
 *  1. Server fetch da company. Se já tem subscription_id → success state.
 *  2. Senão, render <PollingSucesso /> client component que hammer o endpoint
 *     /api/billing/check-status a cada 3s, até 6 tentativas (= 18s window).
 *  3. Após 6 tries: "estamos confirmando", email confirmará — caso edge
 *     onde webhook está MUITO atrasado (raro, mas possível em incidente Stripe).
 */
export default async function PlanoSucessoPage({ searchParams }: PageProps) {
  await requireAuth();

  // session_id aparece como cs_xxx (live) ou cs_test_xxx (test). Não validamos
  // o formato a fundo — se está faltando, rebound pra /configuracoes/plano.
  const sessionId = searchParams?.session_id;
  if (!sessionId || !sessionId.startsWith("cs_")) {
    redirect("/configuracoes/plano");
  }

  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }
  const membership = memberships[0]!;

  const { data: companyRaw } = await supabase
    .from("companies")
    .select(
      "id, plan, stripe_customer_id, stripe_subscription_id, billing_status",
    )
    .eq("id", membership.company_id)
    .single();

  if (!companyRaw) {
    redirect("/onboarding");
  }
  // TODO(ssr-0.5.2): cast por causa do type propagation do @supabase/ssr.
  const company = companyRaw as unknown as CompanyWithBilling;

  // Webhook já processou — exibe success final.
  if (company.stripe_subscription_id) {
    const planLabel = isPlanSlug(company.plan)
      ? PLAN_LABELS[company.plan]
      : company.plan;

    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="text-6xl" aria-hidden>
            🎉
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Bem-vindo ao plano {planLabel}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pagamento confirmado. Sua assinatura está ativa e seu trial de 14
              dias começou.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/dashboard">Ir pro dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/configuracoes">Ver configurações</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Webhook ainda não processou — entrega componente client de polling.
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-md">
        <PollingSucesso sessionId={sessionId} />
      </div>
    </div>
  );
}
