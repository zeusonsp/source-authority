"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { submitDemoLead } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  demoLeadSchema,
  EMPLOYEE_RANGES,
  maskPhoneBR,
  type DemoLeadInput,
  type UtmContext,
} from "@/lib/demo/schemas";

type Props = {
  utm: UtmContext;
};

/**
 * Honeypot field name. Renderizado invisível pra humano (off-screen +
 * aria-hidden + tabindex=-1) mas presente no DOM pra bot scraper que
 * preenche todo input. Server action rejeita se vier não-vazio.
 */
const HONEYPOT_FIELD = "website";

export function DemoForm({ utm }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referrer, setReferrer] = useState<string | undefined>();
  const [honeypot, setHoneypot] = useState("");

  // document.referrer só está disponível no client. Captura no mount
  // pra incluir no payload (lead atribution).
  useEffect(() => {
    if (typeof document !== "undefined" && document.referrer) {
      setReferrer(document.referrer);
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DemoLeadInput>({
    resolver: zodResolver(demoLeadSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      employees: "11-50",
      use_case: "",
    },
  });

  const phone = watch("phone");

  // Aplica mask BR a cada keystroke. Reescreve o valor (não preserva
  // posição do cursor — aceitável pra MVP, pode evoluir com lib de
  // mask quando virar fricção).
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("phone", maskPhoneBR(e.target.value), {
      shouldValidate: true,
    });
  }

  async function onSubmit(data: DemoLeadInput) {
    setSubmitError(null);
    const result = await submitDemoLead({
      ...data,
      ...utm,
      referrer,
      website: honeypot,
    });

    if (result.success) {
      setSubmitted(true);
      return;
    }

    // Honeypot: resposta genérica idêntica ao sucesso (não dá pista
    // pro bot que detectamos). Marca submitted mesmo assim pra encerrar.
    if (result.code === "honeypot") {
      setSubmitted(true);
      return;
    }

    if (result.code === "validation") {
      // RHF já valida client-side; chegar aqui significa que client
      // bypassou o resolver. Reporta primeira mensagem disponível.
      const firstError =
        Object.values(result.fieldErrors).find(
          (errs): errs is string[] => Array.isArray(errs) && errs.length > 0,
        )?.[0] ?? "Dados inválidos. Verifique os campos.";
      setSubmitError(firstError);
      return;
    }

    if (result.code === "rate_limited") {
      setSubmitError(result.message);
      return;
    }

    setSubmitError(result.message);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-accent" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          Recebido.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Entraremos em contato em até 24h com um link de acesso ao beta
          privado. Enquanto isso, fica de olho na caixa de entrada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/*
        Honeypot — invisível pra humano (off-screen + aria-hidden +
        tabindex=-1 + autoComplete=off pra evitar password manager
        preencher). Bot scraper típico preenche; humano não. Server
        action rejeita silenciosamente se vier preenchido.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor={HONEYPOT_FIELD}>Website (não preencha)</label>
        <input
          id={HONEYPOT_FIELD}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <Field
        id="name"
        label="Nome completo"
        required
        error={errors.name?.message}
      >
        <Input
          id="name"
          autoComplete="name"
          placeholder="Maria Silva"
          {...register("name")}
        />
      </Field>

      <Field
        id="email"
        label="E-mail corporativo"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="maria@empresa.com.br"
          {...register("email")}
        />
      </Field>

      <Field id="company" label="Empresa" error={errors.company?.message}>
        <Input
          id="company"
          autoComplete="organization"
          placeholder="Nome da empresa (opcional)"
          {...register("company")}
        />
      </Field>

      <Field
        id="phone"
        label="Telefone"
        error={errors.phone?.message}
        hint="Opcional. Pra contato via WhatsApp se preferir."
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={phone ?? ""}
          onChange={handlePhoneChange}
        />
      </Field>

      <Field
        id="employees"
        label="Tamanho da empresa"
        required
        error={errors.employees?.message}
      >
        <Select id="employees" {...register("employees")}>
          {EMPLOYEE_RANGES.map((range) => (
            <option key={range} value={range}>
              {range === "200+" ? "200+ funcionários" : `${range} funcionários`}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="use_case"
        label="Como pretende usar Source Authority?"
        error={errors.use_case?.message}
        hint="Opcional. Conta o problema que você quer resolver."
      >
        <Textarea
          id="use_case"
          rows={4}
          placeholder="Ex: tenho 200k seguidores no Instagram e quero saber qual conteúdo gera vendas..."
          {...register("use_case")}
        />
      </Field>

      {submitError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{submitError}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Solicitar acesso ao beta"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Ao enviar, você concorda com nossos{" "}
        <a href="/termos" className="underline hover:text-foreground">
          Termos
        </a>{" "}
        e{" "}
        <a href="/privacidade" className="underline hover:text-foreground">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required ? (
          <span className="ml-1 text-accent" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
