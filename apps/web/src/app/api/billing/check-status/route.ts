import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CompanyBillingRow = {
  billing_status: string;
  stripe_subscription_id: string | null;
};

/**
 * GET /api/billing/check-status?session_id=cs_xxx
 *
 * Endpoint de polling pra success page pós-checkout. Lê billing_status +
 * stripe_subscription_id da company do user logado. Não consulta o Stripe
 * diretamente — confiamos no webhook handler pra atualizar o DB.
 *
 * Auth: usa o supabase client com cookie de sessão. Sem session = 401.
 *
 * `session_id` é aceito no query string mas não é usado pra lookup — é só pra
 * o componente client conseguir correlacionar (e pra um futuro cache busting).
 * Validamos que está presente como hint anti-link-quebrado.
 *
 * Retorna { status: 'none'|'trialing'|'active'|..., has_subscription: bool }.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json(
      { error: "missing or invalid session_id" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pega 1 membership (mesmo padrão do dashboard/configuracoes).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json(
      { error: "no membership" },
      { status: 404 },
    );
  }
  const membership = memberships[0]!;

  const { data: companyRaw } = await supabase
    .from("companies")
    .select("billing_status, stripe_subscription_id")
    .eq("id", membership.company_id)
    .single();

  if (!companyRaw) {
    return NextResponse.json({ error: "no company" }, { status: 404 });
  }
  // TODO(ssr-0.5.2): cast por causa do type propagation do @supabase/ssr.
  const company = companyRaw as unknown as CompanyBillingRow;

  return NextResponse.json({
    status: company.billing_status,
    has_subscription: !!company.stripe_subscription_id,
  });
}
