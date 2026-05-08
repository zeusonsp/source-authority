"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Tables } from "@source-authority/shared/database.types";
import { createPortalSession } from "@/app/actions/billing";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMPANY_SIZES,
  type CompanySize,
} from "@/lib/onboarding/schemas";
import { trackerUrl } from "@/lib/tracker";
import { cn } from "@/lib/utils";
import { updateCompanyAction } from "./actions";

type Company = Tables<"companies">;

type BillingProps = {
  billing_status: string;
  trial_ends_at: string | null;
  plan_renewed_at: string | null;
  stripe_customer_id: string | null;
  billing_exempt: boolean;
};

type Props = {
  company: Company;
  billing: BillingProps;
  canEdit: boolean;
};

function initialSize(value: string | null): CompanySize {
  return COMPANY_SIZES.includes(value as CompanySize)
    ? (value as CompanySize)
    : "11-50";
}

/**
 * "Trial expira em" — diff em dias se ≥ 24h, senão em horas.
 * Edge: se já passou (trial_ends_at no passado), mostra "encerrado".
 */
function formatTrialRemaining(trialEndsAt: string): string {
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  const ms = end - now;
  if (ms <= 0) return "encerrado";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return `${hours}h`;
}

/**
 * "Renova em DD/MM/YYYY". plan_renewed_at é o ÚLTIMO pagamento bem-sucedido,
 * então a próxima cobrança é +30 dias (período mensal). Aproximação simples
 * sem timezone fancy — formato brasileiro.
 */
function formatNextRenewal(planRenewedAt: string): string {
  const renewed = new Date(planRenewedAt);
  // +30 dias. Stripe cobra exatamente no anniversary, mas 30d é uma
  // aproximação visualmente honesta (variação de 1 dia em meses curtos).
  const next = new Date(renewed.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dd = String(next.getDate()).padStart(2, "0");
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const yyyy = next.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function ConfiguracoesForm({ company, billing, canEdit }: Props) {
  const linkUrl = trackerUrl(company.slug);

  const [name, setName] = useState(company.name);
  const [segment, setSegment] = useState(company.segment ?? "");
  const [size, setSize] = useState<CompanySize>(initialSize(company.size));
  const [redirectUrl, setRedirectUrl] = useState(
    company.default_redirect_url ?? "",
  );

  const [submitting, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  const [portalPending, startPortalTransition] = useTransition();

  /**
   * Abre Customer Portal Stripe (gerenciar pagamento, cancelar, baixar invoice).
   * Disabled quando a empresa não tem stripe_customer_id (nunca passou pelo
   * checkout) ou é billing_exempt.
   */
  function onPortalClick() {
    if (portalPending) return;
    startPortalTransition(async () => {
      const result = await createPortalSession({ company_id: company.id });
      if ("url" in result) {
        window.location.href = result.url;
        return;
      }
      alert(
        result.error === "no_customer"
          ? "Sua empresa ainda não tem cliente Stripe. Escolha um plano primeiro."
          : "Não foi possível abrir o portal de pagamento. Tente novamente.",
      );
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    startTransition(async () => {
      const result = await updateCompanyAction({
        company_id: company.id,
        name,
        segment,
        size,
        default_redirect_url: redirectUrl,
      });

      if (result.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
        return;
      }
      if (result.code === "validation") {
        setFieldErrors(result.fieldErrors);
        return;
      }
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="border-accent/40 bg-accent/10 text-accent">
          <CheckCircle2 className="size-4" />
          <AlertDescription>Salvo com sucesso.</AlertDescription>
        </Alert>
      ) : null}

      {/* ─── Card: Empresa ─────────────────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Empresa
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit || submitting}
            minLength={2}
            maxLength={100}
            required
          />
          {fieldErrors.name?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            type="text"
            value={company.slug}
            disabled
            readOnly
            className="font-mono"
            aria-describedby="slug-hint"
          />
          <p id="slug-hint" className="text-xs text-muted-foreground">
            Slug é permanente após criação. Pra alterar, fala com a Source
            Authority pelo WhatsApp.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="segment">Segmento</Label>
          <Input
            id="segment"
            type="text"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            disabled={!canEdit || submitting}
            minLength={2}
            maxLength={80}
            required
          />
          {fieldErrors.segment?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.segment[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">Tamanho</Label>
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value as CompanySize)}
            disabled={!canEdit || submitting}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {COMPANY_SIZES.map((option) => (
              <option key={option} value={option}>
                {option} colaboradores
              </option>
            ))}
          </select>
          {fieldErrors.size?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.size[0]}</p>
          ) : null}
        </div>
      </section>

      {/* ─── Card: Link mestre ─────────────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Link mestre
        </h2>

        <div className="space-y-2">
          <Label htmlFor="default_redirect_url">URL de destino</Label>
          <Input
            id="default_redirect_url"
            type="url"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            disabled={!canEdit || submitting}
            placeholder="https://seusite.com"
            maxLength={500}
            inputMode="url"
            autoComplete="url"
          />
          {fieldErrors.default_redirect_url?.[0] ? (
            <p className="text-xs text-destructive">
              {fieldErrors.default_redirect_url[0]}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Deve começar com https://. Vazio = link mestre desativado (404
              amigável até reconfigurar).
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-border bg-background/40 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Preview do link público
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 break-all font-mono text-sm text-accent">
              {linkUrl}
            </span>
            <CopyLinkButton value={linkUrl} label="Copiar link público" />
          </div>
          <p
            className={cn(
              "text-xs",
              redirectUrl.trim() ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {redirectUrl.trim() ? (
              <>
                Redireciona pra{" "}
                <span className="font-mono text-foreground">
                  {redirectUrl.trim()}
                </span>
              </>
            ) : (
              "Sem destino configurado — link público retorna 404."
            )}
          </p>
        </div>
      </section>

      {/* ─── Card: Plano ───────────────────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Plano
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
              company.plan === "starter"
                ? "border border-border bg-secondary text-muted-foreground"
                : "border border-accent/30 bg-accent/10 text-accent",
            )}
          >
            {company.plan}
          </span>
          {/* Status pill — só aparece em estados não-óbvios. 'active' não pinta
              porque é o esperado e poluiria UI. */}
          {billing.billing_status === "trialing" ? (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
              Trial
            </span>
          ) : null}
          {billing.billing_status === "past_due" ? (
            <span className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-destructive">
              Pagamento pendente
            </span>
          ) : null}
          {billing.billing_status === "canceled" ? (
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cancelado
            </span>
          ) : null}
          {billing.billing_exempt ? (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
              Cortesia
            </span>
          ) : null}
        </div>

        {/* Sub-info textual: data de renovação OU dias restantes do trial. */}
        {billing.billing_status === "trialing" && billing.trial_ends_at ? (
          <p className="text-xs text-muted-foreground">
            Trial expira em{" "}
            <span className="font-mono text-foreground">
              {formatTrialRemaining(billing.trial_ends_at)}
            </span>
            .
          </p>
        ) : null}
        {billing.billing_status === "active" && billing.plan_renewed_at ? (
          <p className="text-xs text-muted-foreground">
            Renova em{" "}
            <span className="font-mono text-foreground">
              {formatNextRenewal(billing.plan_renewed_at)}
            </span>
            .
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <Link href="/configuracoes/plano">Mudar plano</Link>
          </Button>
          {/* Portal só faz sentido se tem customer registrado. Se não, esconde
              o botão pra não dar 'no_customer'. Empresas exempt também não
              têm portal — gestão é manual. */}
          {billing.stripe_customer_id && !billing.billing_exempt ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onPortalClick}
              disabled={portalPending}
            >
              {portalPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Gerenciar pagamento
            </Button>
          ) : null}
        </div>
      </section>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
