import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { PLAN_AMOUNTS_BRL, PLAN_LABELS, type PlanSlug } from "@/lib/billing/plans";
import {
  renderPaymentFailedEmail,
  renderSubscriptionCanceledEmail,
  renderWelcomeTrialEmail,
} from "./render-billing-emails";
import { sendResendEmail } from "./resend";

/**
 * Dispatcher de emails transacionais billing (Phase 7 / B7.6).
 *
 * Caller: webhook handler em /api/billing/stripe/webhook após RPC
 * apply_subscription_event aplicar o evento.
 *
 * Pattern: fan-out via Promise.allSettled pra owners+admins. Falha de um
 * destinatário não bloqueia outros. Falha do dispatcher inteiro é silenciosa
 * pro Stripe (retornamos 200 — webhook não retenta por falha de email).
 */

type SupabaseAdmin = SupabaseClient<Database>;

const FROM_ADDRESS = "Source Authority <noreply@sourceauthority.com.br>";
const NOTIFY_ROLES: ReadonlyArray<string> = ["owner", "admin"];

type CompanyRow = { id: string; name: string };
type Recipient = { user_id: string; email: string; role: string };

export type BillingEvent =
  | { kind: "welcome_trial"; trial_ends_at: string | null; plan: PlanSlug }
  | { kind: "payment_failed" }
  | { kind: "subscription_canceled" };

export type BillingNotifyResult = {
  sent: number;
  failed: number;
  errors: string[];
};

async function fetchCompanyAndRecipients(
  admin: SupabaseAdmin,
  companyId: string,
): Promise<{ company: CompanyRow | null; recipients: Recipient[] }> {
  const companyRes = await admin
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  const company = (companyRes.data as CompanyRow | null) ?? null;
  if (!company) return { company: null, recipients: [] };

  const membershipsRes = await admin
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", companyId)
    .in("role", NOTIFY_ROLES as string[]);

  const memberships =
    (membershipsRes.data as Array<{ user_id: string; role: string }> | null) ??
    [];

  const recipients: Recipient[] = [];
  for (const m of memberships) {
    const userRes = await admin.auth.admin.getUserById(m.user_id);
    const email = userRes.data.user?.email;
    if (!email) continue;
    recipients.push({ user_id: m.user_id, email, role: m.role });
  }

  return { company, recipients };
}

/** Renderiza subject + html pro evento + envia pra todos os recipients. */
export async function notifyBillingEvent(
  admin: SupabaseAdmin,
  companyId: string,
  ev: BillingEvent,
): Promise<BillingNotifyResult> {
  const result: BillingNotifyResult = { sent: 0, failed: 0, errors: [] };

  const { company, recipients } = await fetchCompanyAndRecipients(admin, companyId);
  if (!company) {
    result.errors.push(`company ${companyId} not found`);
    return result;
  }
  if (recipients.length === 0) {
    result.errors.push(
      `company ${companyId} has no owners/admins with email`,
    );
    return result;
  }

  // Render por evento (subject + html iguais pra todos os recipients).
  let subject: string;
  let html: string;
  switch (ev.kind) {
    case "welcome_trial": {
      const r = renderWelcomeTrialEmail(company, {
        trialEndsAt: ev.trial_ends_at,
        planLabel: PLAN_LABELS[ev.plan],
        amountCents: PLAN_AMOUNTS_BRL[ev.plan],
      });
      subject = r.subject;
      html = r.html;
      break;
    }
    case "payment_failed": {
      const r = renderPaymentFailedEmail(company);
      subject = r.subject;
      html = r.html;
      break;
    }
    case "subscription_canceled": {
      const r = renderSubscriptionCanceledEmail(company);
      subject = r.subject;
      html = r.html;
      break;
    }
  }

  // Fan-out — falha de 1 não bloqueia outros.
  const settled = await Promise.allSettled(
    recipients.map(async (r) => {
      const sent = await sendResendEmail({
        from: FROM_ADDRESS,
        to: r.email,
        subject,
        html,
      });
      return { recipient: r, sent };
    }),
  );

  for (const s of settled) {
    if (s.status === "rejected") {
      result.failed += 1;
      result.errors.push(`unexpected: ${String(s.reason)}`);
      continue;
    }
    if (s.value.sent.ok) {
      result.sent += 1;
    } else {
      result.failed += 1;
      result.errors.push(
        `${s.value.recipient.email}: ${s.value.sent.error}`,
      );
    }
  }

  return result;
}
