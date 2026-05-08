import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PLAN_AMOUNTS_BRL,
  PLAN_LABELS,
  PLAN_ORDER,
  type PlanSlug,
} from "@/lib/billing/stripe";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PlanCardForm } from "./plan-card-form";

export const metadata = {
  title: "Plano",
};

/**
 * Tipo da company com colunas billing — não está em database.types.ts ainda
 * (migration 20260508100000_billing.sql pendente). Cast inline.
 */
type CompanyWithBilling = {
  id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: string;
  trial_ends_at: string | null;
  plan_renewed_at: string | null;
  billing_exempt: boolean;
};

const PLAN_TAGLINES: Record<PlanSlug, string> = {
  starter: "Pra quem está começando a profissionalizar a presença digital.",
  growth: "Pra marca em crescimento que precisa entender canais.",
  pro: "Pra empresa premium com rede de revenda.",
  business: "Pra grupo, holding ou multi-empresa.",
};

const PLAN_FEATURES: Record<PlanSlug, string[]> = {
  starter: [
    "1 link mestre",
    "Tracking básico (clicks + país)",
    "5.000 cliques/mês",
    "Suporte por e-mail",
  ],
  growth: [
    "5 links",
    "Tracking completo (UTM + device + referrer)",
    "50.000 cliques/mês",
    "Relatórios exportáveis (CSV)",
    "Suporte prioritário",
  ],
  pro: [
    "25 links",
    "Alertas de proteção de marca",
    "250.000 cliques/mês",
    "Multi-tenant pra agências",
    "Webhook + integrações",
  ],
  business: [
    "Links ilimitados",
    "White-label completo",
    "Cliques ilimitados",
    "SLA contratual",
    "Account manager dedicado",
  ],
};

const HIGHLIGHT_PLAN: PlanSlug = "growth";

/**
 * Formata centavos em BRL pra exibição. Ex: 9700 → "97".
 * Se >999 mostra com separador de milhar (1.497).
 */
function formatBRL(cents: number): string {
  const reais = Math.floor(cents / 100);
  return reais.toLocaleString("pt-BR");
}

export default async function PlanoPage() {
  await requireAuth();
  const supabase = createClient();

  // Mesmo gate do /configuracoes — sem membership = onboarding.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, company_id")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const membership = memberships[0]!;

  // Busca campos básicos + billing. Cast porque types ainda não regenerados.
  const { data: companyRaw } = await supabase
    .from("companies")
    .select(
      "id, plan, stripe_customer_id, stripe_subscription_id, billing_status, trial_ends_at, plan_renewed_at, billing_exempt",
    )
    .eq("id", membership.company_id)
    .single();

  if (!companyRaw) {
    redirect("/onboarding");
  }
  // TODO(ssr-0.5.2): cast por causa do type propagation do @supabase/ssr.
  const company = companyRaw as unknown as CompanyWithBilling;

  const canEdit = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Plano</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o plano ideal pra sua empresa. Trial de 14 dias em qualquer
            plano pago.
          </p>
        </div>

        {!canEdit ? (
          <Alert>
            <AlertDescription>
              Apenas <strong>owner</strong> ou <strong>admin</strong> podem
              alterar o plano. Peça pra alguém da equipe com permissão.
            </AlertDescription>
          </Alert>
        ) : null}

        {company.billing_exempt ? (
          <Alert className="border-accent/40 bg-accent/10 text-accent">
            <AlertDescription>
              <strong>Plano cortesia ativo.</strong> Esta empresa não é cobrada
              — assinatura gerenciada manualmente. Pra ajustes, fala com a
              Source Authority.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((slug) => {
            const isCurrent = company.plan === slug;
            const isHighlight = slug === HIGHLIGHT_PLAN;
            // Disabled quando: sem permissão, plano cortesia, ou já é o atual
            // E há subscription ativa (downgrade/upgrade entre planos pagos OK).
            const disabled =
              !canEdit ||
              company.billing_exempt ||
              (isCurrent && !!company.stripe_subscription_id);

            return (
              <article
                key={slug}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-card/40 p-7 transition-colors",
                  isHighlight
                    ? "border-accent/60 bg-card/70 shadow-[0_0_0_1px_hsl(var(--accent)/0.4),0_20px_60px_-15px_hsl(var(--accent)/0.25)]"
                    : "border-border hover:border-border/80",
                )}
              >
                {isHighlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                    Mais escolhido
                  </span>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    {PLAN_LABELS[slug]}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="text-4xl font-bold tracking-tight">
                      {formatBRL(PLAN_AMOUNTS_BRL[slug])}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {PLAN_TAGLINES[slug]}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border/60 pt-6">
                  {PLAN_FEATURES[slug].map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-accent"
                        aria-hidden
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <PlanCardForm
                    company_id={company.id}
                    plan={slug}
                    isCurrent={isCurrent}
                    isHighlight={isHighlight}
                    disabled={disabled}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Todos os planos pagos incluem 14 dias grátis. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
