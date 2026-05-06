"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Tables } from "@source-authority/shared/database.types";
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

type Props = {
  company: Company;
  canEdit: boolean;
};

const WHATSAPP_NATHAN = "+55 11 94100-2149";

function initialSize(value: string | null): CompanySize {
  return COMPANY_SIZES.includes(value as CompanySize)
    ? (value as CompanySize)
    : "11-50";
}

export function ConfiguracoesForm({ company, canEdit }: Props) {
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
      <section className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Plano
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Pra alterar plano, fala com a Source Authority pelo WhatsApp{" "}
          <span className="font-mono text-foreground">{WHATSAPP_NATHAN}</span>.
          Migração de plano + cobrança recorrente entram na Fase 7.
        </p>
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
