"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  isReservedSlug,
  isValidSlugFormat,
  normalizeSlug,
} from "@source-authority/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMPANY_SIZES,
  type CompanySize,
} from "@/lib/onboarding/schemas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { createCompanyAction } from "./actions";

type SlugStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid_format"
  | "reserved";

const SLUG_DEBOUNCE_MS = 300;

export function OnboardingForm() {
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [segment, setSegment] = useState("");
  const [size, setSize] = useState<CompanySize>("11-50");

  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [submitting, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  const normalizedSlug = normalizeSlug(slug);

  // Real-time slug check com debounce. Cliente faz pré-checks (formato +
  // reservado) antes de bater na RPC pra economizar round-trip e prompt UX.
  useEffect(() => {
    if (normalizedSlug.length === 0) {
      setSlugStatus("idle");
      return;
    }
    if (!isValidSlugFormat(normalizedSlug)) {
      setSlugStatus("invalid_format");
      return;
    }
    if (isReservedSlug(normalizedSlug)) {
      setSlugStatus("reserved");
      return;
    }

    setSlugStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_slug_available", {
        _slug: normalizedSlug,
      });
      if (cancelled) return;
      if (error) {
        // Erro na RPC = volta pra idle (não bloqueia submit; server action revalida).
        setSlugStatus("idle");
        return;
      }
      setSlugStatus(data ? "available" : "taken");
    }, SLUG_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedSlug, supabase]);

  const submitDisabled =
    submitting ||
    name.trim().length < 2 ||
    segment.trim().length < 2 ||
    slugStatus !== "available";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createCompanyAction({
        name,
        slug,
        segment,
        size,
      });

      // Sucesso = redirect (não retorna). Tudo aqui é caminho de erro.
      if (!result) return;

      if (result.code === "validation") {
        setFieldErrors(result.fieldErrors);
        return;
      }
      if (result.code === "slug_taken") {
        setSlugStatus("taken");
        setFormError(result.message);
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

      <div className="space-y-2">
        <Label htmlFor="name">Nome da empresa</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zeus Tecnologia"
          required
          minLength={2}
          maxLength={100}
        />
        {fieldErrors.name?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug do link mestre</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            oficial.sourceauthority.com.br/
          </span>
          <Input
            id="slug"
            name="slug"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="zeus"
            required
            minLength={2}
            maxLength={32}
            className="flex-1"
          />
          <SlugStatusIndicator status={slugStatus} />
        </div>
        <SlugStatusMessage status={slugStatus} normalizedSlug={normalizedSlug} />
        {fieldErrors.slug?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.slug[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="segment">Segmento</Label>
        <Input
          id="segment"
          name="segment"
          type="text"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          placeholder="AV/Automação Premium"
          required
          minLength={2}
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">
          Texto livre por enquanto. Vai virar lista canônica em fase futura.
        </p>
        {fieldErrors.segment?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.segment[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="size">Tamanho da empresa</Label>
        <select
          id="size"
          name="size"
          value={size}
          onChange={(e) => setSize(e.target.value as CompanySize)}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <Button type="submit" disabled={submitDisabled} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Criando empresa...
          </>
        ) : (
          "Criar empresa"
        )}
      </Button>
    </form>
  );
}

function SlugStatusIndicator({ status }: { status: SlugStatus }) {
  if (status === "checking") {
    return (
      <Loader2
        className="size-4 animate-spin text-muted-foreground"
        aria-label="Verificando"
      />
    );
  }
  if (status === "available") {
    return (
      <CheckCircle2 className="size-4 text-accent" aria-label="Disponível" />
    );
  }
  if (
    status === "taken" ||
    status === "invalid_format" ||
    status === "reserved"
  ) {
    return (
      <AlertCircle
        className="size-4 text-destructive"
        aria-label="Indisponível"
      />
    );
  }
  return null;
}

function SlugStatusMessage({
  status,
  normalizedSlug,
}: {
  status: SlugStatus;
  normalizedSlug: string;
}) {
  if (status === "idle" || normalizedSlug.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        2-32 caracteres, minúsculo, números e hífens internos.
      </p>
    );
  }
  const className = cn(
    "text-xs",
    status === "available" ? "text-accent" : "text-destructive",
  );
  if (status === "checking") {
    return <p className="text-xs text-muted-foreground">Verificando...</p>;
  }
  if (status === "available") {
    return <p className={className}>Disponível ✓</p>;
  }
  if (status === "taken") {
    return <p className={className}>Já está em uso. Escolha outro.</p>;
  }
  if (status === "invalid_format") {
    return (
      <p className={className}>
        Formato inválido. Use minúsculo + números + hífens internos (ex: zeus,
        marca-x).
      </p>
    );
  }
  if (status === "reserved") {
    return <p className={className}>Esse slug é reservado. Escolha outro.</p>;
  }
  return null;
}
