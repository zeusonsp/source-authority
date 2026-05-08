import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import {
  ALERT_SEVERITY_LABEL,
  ALERT_TYPE_LABEL,
  type AlertRow,
  type AlertSeverity,
} from "@/lib/alerts/types";
import { renderAlertDigestEmail } from "./render-alert-digest";
import { renderAlertImmediateEmail } from "./render-alert-immediate";
import { sendResendEmail } from "./resend";

/**
 * Cliente Supabase com `service_role` (BYPASSRLS). Esperado ser
 * construído pelo caller (geralmente o worker/cron) com a chave
 * `SUPABASE_SERVICE_ROLE_KEY`. Tipado contra `Database` pra ter
 * autocomplete em tabelas/colunas.
 */
type SupabaseAdmin = SupabaseClient<Database>;

const FROM_ADDRESS = "Source Authority <noreply@sourceauthority.com.br>";
const NOTIFY_ROLES: ReadonlyArray<string> = ["owner", "admin"];

/** Resultado agregado de um disparo (immediate ou digest). */
export type NotifyResult = {
  sent: number;
  failed: number;
  errors: string[];
};

type CompanyRow = {
  id: string;
  name: string;
};

type Recipient = {
  user_id: string;
  email: string;
  role: string;
};

/**
 * Busca empresa + lista de destinatários (owners + admins) com email
 * via `auth.admin.getUserById` (profiles não armazena email — fica em
 * auth.users).
 *
 * Retorna `null` na empresa se ela sumiu (FK quebrada, race com delete).
 */
async function fetchCompanyAndRecipients(
  supabaseAdmin: SupabaseAdmin,
  companyId: string,
): Promise<{ company: CompanyRow | null; recipients: Recipient[] }> {
  const companyRes = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  const company = (companyRes.data as CompanyRow | null) ?? null;
  if (!company) {
    return { company: null, recipients: [] };
  }

  const membershipsRes = await supabaseAdmin
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", companyId)
    .in("role", NOTIFY_ROLES as string[]);

  const memberships =
    (membershipsRes.data as Array<{ user_id: string; role: string }> | null) ??
    [];

  // Resolve email via auth admin API. `profiles` não tem email, então
  // batemos no Supabase Auth direto. N requests sequenciais é OK pro
  // tamanho típico (< 10 admins por empresa).
  const recipients: Recipient[] = [];
  for (const m of memberships) {
    const userRes = await supabaseAdmin.auth.admin.getUserById(m.user_id);
    const email = userRes.data.user?.email;
    if (!email) continue;
    recipients.push({ user_id: m.user_id, email, role: m.role });
  }

  return { company, recipients };
}

/**
 * Envia email imediato pra alertas de severidade alta.
 *
 * Caller típico: worker `brand-monitor` quando insere um alerta com
 * `severity='high'` (ou rota /api/internal/notify-alert se decidirmos
 * fazer push do worker pro web). Idempotência fica a cargo do caller —
 * essa função só dispara.
 */
export async function notifyAlertImmediate(
  alert: AlertRow,
  supabaseAdmin: SupabaseAdmin,
): Promise<NotifyResult> {
  const result: NotifyResult = { sent: 0, failed: 0, errors: [] };

  const { company, recipients } = await fetchCompanyAndRecipients(
    supabaseAdmin,
    alert.company_id,
  );
  if (!company) {
    result.errors.push(`company ${alert.company_id} not found`);
    return result;
  }
  if (recipients.length === 0) {
    result.errors.push(
      `company ${alert.company_id} has no owners/admins with email`,
    );
    return result;
  }

  const subject = `🔔 [${ALERT_SEVERITY_LABEL[alert.severity]}] ${ALERT_TYPE_LABEL[alert.type]} — ${company.name}`;

  // Promise.allSettled pra falha de um destinatário não impedir os outros.
  const settled = await Promise.allSettled(
    recipients.map(async (r) => {
      const html = renderAlertImmediateEmail(alert, company, { role: r.role });
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

/**
 * Envia digest diário (09:00 BRT) com alertas medium/low criados nas
 * últimas 24h. High geralmente já saiu via immediate, mas inclui aqui
 * caso vaze (worker offline na hora, retry, etc).
 *
 * Sem alertas → não dispara email (`{ sent: 0 }` silencioso).
 */
export async function notifyAlertDigest(
  companyId: string,
  supabaseAdmin: SupabaseAdmin,
): Promise<NotifyResult> {
  const result: NotifyResult = { sent: 0, failed: 0, errors: [] };

  // 24h cutoff. Cron roda às 09:00 BRT, então pega tudo desde 09:00 do
  // dia anterior. Não filtra status — `new` ainda é o estado dominante,
  // e mostrar `triaged` no digest também tem valor (auditoria).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const alertsRes = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("company_id", companyId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const rows = (alertsRes.data as AlertRow[] | null) ?? [];
  // Severidades elegíveis pro digest. Vide comment acima — high entra
  // só em casos de catch-up.
  const eligible: AlertSeverity[] = ["high", "medium", "low"];
  const alerts = rows.filter((a) => eligible.includes(a.severity));

  if (alerts.length === 0) {
    return result;
  }

  const { company, recipients } = await fetchCompanyAndRecipients(
    supabaseAdmin,
    companyId,
  );
  if (!company) {
    result.errors.push(`company ${companyId} not found`);
    return result;
  }
  if (recipients.length === 0) {
    result.errors.push(`company ${companyId} has no owners/admins with email`);
    return result;
  }

  const subject = `📋 Resumo diário — ${alerts.length} ${alerts.length === 1 ? "alerta" : "alertas"} — ${company.name}`;

  const settled = await Promise.allSettled(
    recipients.map(async (r) => {
      const html = renderAlertDigestEmail(alerts, company, { role: r.role });
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
