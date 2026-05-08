import "server-only";

/**
 * Templates HTML de emails transacionais billing (Phase 7 / B7.6).
 *
 * Disparados pelo webhook handler em /api/billing/stripe/webhook após RPC
 * `apply_subscription_event` aplicar mudança de estado.
 *
 * Pattern: server-side só (server-only). Outlook-safe (table layout, inline
 * styles). Cores Source Authority (preto profundo + dourado).
 *
 * 3 templates:
 *   - welcome-trial      → checkout.session.completed (status=trialing)
 *   - payment-failed     → invoice.payment_failed
 *   - subscription-canceled → customer.subscription.deleted
 */

const APP_URL = "https://app.sourceauthority.com.br";

type CompanyForEmail = {
  name: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBRL(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Shell HTML compartilhado: header com logo dourado, conteúdo, rodapé.
 */
function shell(opts: {
  preheader: string;
  headlineColor: string;
  headline: string;
  body: string;
}): string {
  const { preheader, headlineColor, headline, body } = opts;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#FAFAFA;">
  <span style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0A0A0A;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:24px 28px;border:1px solid #2A2A2A;border-radius:12px;background:#111111;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;border-bottom:1px solid #2A2A2A;">
                    <span style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#C9A94B;font-weight:700;">Source Authority</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 0 12px;">
                    <h1 style="margin:0;font-size:20px;font-weight:600;line-height:1.3;color:${headlineColor};">${escapeHtml(headline)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;color:#D1D1D1;font-size:14px;line-height:1.6;">
                    ${body}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;border-top:1px solid #2A2A2A;color:#666;font-size:11px;line-height:1.5;">
                    Source Authority — sourceauthority.com.br<br>
                    Você está recebendo isso porque é owner ou admin de uma empresa cliente.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
      <td style="background:#C9A94B;border-radius:8px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome Trial — pós checkout completo, status=trialing
// ─────────────────────────────────────────────────────────────────────────────

export type WelcomeTrialContext = {
  trialEndsAt: string | null;
  planLabel: string;
  amountCents: number;
};

export function renderWelcomeTrialEmail(
  company: CompanyForEmail,
  ctx: WelcomeTrialContext,
): { subject: string; html: string } {
  const subject = `🎉 Bem-vindo ao ${ctx.planLabel} — 14 dias grátis`;
  const trialEndStr = formatDateBR(ctx.trialEndsAt);
  const amountStr = formatBRL(ctx.amountCents);

  const body = `
    <p style="margin:0 0 16px;">
      Olá! Seu plano <strong style="color:#FAFAFA;">${escapeHtml(ctx.planLabel)}</strong>
      foi ativado pra <strong style="color:#FAFAFA;">${escapeHtml(company.name)}</strong>.
    </p>
    <p style="margin:0 0 16px;">
      Você tem <strong style="color:#C9A94B;">14 dias grátis</strong> pra testar.
      Cancele a qualquer momento sem cobrança.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#0A0A0A;border:1px solid #2A2A2A;border-radius:8px;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:#A1A1A1;">Trial termina em</td>
        <td style="padding:14px 18px;font-size:13px;color:#FAFAFA;text-align:right;font-weight:600;">${escapeHtml(trialEndStr)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:#A1A1A1;border-top:1px solid #2A2A2A;">Valor após trial</td>
        <td style="padding:14px 18px;font-size:13px;color:#FAFAFA;text-align:right;font-weight:600;border-top:1px solid #2A2A2A;">${escapeHtml(amountStr)}/mês</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;color:#A1A1A1;font-size:13px;">
      Pra cancelar antes do fim do trial, abra Configurações → Gerenciar pagamento.
    </p>
    ${ctaButton(`${APP_URL}/dashboard`, "Ir pro dashboard")}
  `;

  const html = shell({
    preheader: `Trial ativo até ${trialEndStr}. Acesse o dashboard.`,
    headlineColor: "#C9A94B",
    headline: "Bem-vindo ao Source Authority",
    body,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Failed — invoice.payment_failed
// ─────────────────────────────────────────────────────────────────────────────

export function renderPaymentFailedEmail(
  company: CompanyForEmail,
): { subject: string; html: string } {
  const subject = `⚠️ Falha na cobrança — atualize seu cartão`;

  const body = `
    <p style="margin:0 0 16px;">
      Tentamos cobrar a renovação do seu plano em
      <strong style="color:#FAFAFA;">${escapeHtml(company.name)}</strong>
      mas a transação falhou.
    </p>
    <p style="margin:0 0 16px;">
      Possíveis causas: cartão expirado, limite insuficiente, ou bloqueio
      preventivo do banco emissor.
    </p>
    <p style="margin:0 0 16px;color:#FF8888;">
      <strong>Atualize o método de pagamento nas próximas horas</strong> pra
      manter acesso à plataforma. Vamos retentar a cobrança automaticamente
      após você atualizar.
    </p>
    ${ctaButton(`${APP_URL}/configuracoes`, "Atualizar pagamento")}
    <p style="margin:20px 0 0;color:#A1A1A1;font-size:12px;">
      Se você não fizer nada, o Stripe tentará a cobrança mais 2x nos
      próximos 7 dias antes da assinatura ser cancelada automaticamente.
    </p>
  `;

  const html = shell({
    preheader: "Atualize seu cartão pra não perder acesso.",
    headlineColor: "#FF8888",
    headline: "Falha na cobrança",
    body,
  });
  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Canceled — customer.subscription.deleted
// ─────────────────────────────────────────────────────────────────────────────

export function renderSubscriptionCanceledEmail(
  company: CompanyForEmail,
): { subject: string; html: string } {
  const subject = `Assinatura cancelada — ${company.name}`;

  const body = `
    <p style="margin:0 0 16px;">
      Confirmamos o cancelamento da assinatura de
      <strong style="color:#FAFAFA;">${escapeHtml(company.name)}</strong>.
    </p>
    <p style="margin:0 0 16px;">
      Sua empresa volta ao plano <strong style="color:#FAFAFA;">Starter</strong>
      (link mestre + dashboard básico, gratuito). Os dados ficam preservados.
    </p>
    <p style="margin:0 0 16px;">
      Pra reativar um plano pago, basta voltar em Configurações → Mudar plano
      a qualquer momento.
    </p>
    ${ctaButton(`${APP_URL}/configuracoes/plano`, "Ver planos")}
    <p style="margin:20px 0 0;color:#A1A1A1;font-size:12px;">
      Se o cancelamento foi um engano (cartão recusado, etc), você pode
      voltar em "Mudar plano" e reativar imediatamente.
    </p>
  `;

  const html = shell({
    preheader: "Cancelamento confirmado. Empresa volta pro Starter.",
    headlineColor: "#FAFAFA",
    headline: "Assinatura cancelada",
    body,
  });
  return { subject, html };
}
