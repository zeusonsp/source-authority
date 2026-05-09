import "server-only";

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { env } from "@/lib/env-server";

/**
 * GET /data-deletion-status/<code>
 *
 * Página pública de status do request de deleção. Meta exige uma URL
 * pública pra redirecionar o user após o callback de data-deletion —
 * caller envia o `confirmation_code` no path. Sem auth: a page mostra
 * só status agregado (queued / processing / completed) + data prevista
 * (até 30 dias após requested_at), nada que exponha dados pessoais.
 *
 * Server Component (default). Usa service role pra bypassar RLS — a
 * tabela meta_data_deletion_requests não tem policies pra authenticated.
 *
 * Renderiza HTML simples sem depender de design system completo:
 * Meta pode acessar de qualquer browser/device, queremos zero JS extra.
 */

export const metadata: Metadata = {
  title: "Status da solicitação de exclusão de dados",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatusValue = "queued" | "processing" | "completed";

type DeletionRow = {
  status: StatusValue;
  requested_at: string;
  completed_at: string | null;
};

const CODE_REGEX = /^[a-f0-9]{16}$/;

function adminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function lookupRequest(code: string): Promise<DeletionRow | null> {
  if (!CODE_REGEX.test(code)) return null;
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("meta_data_deletion_requests")
    .select("status, requested_at, completed_at")
    .eq("confirmation_code", code)
    .maybeSingle();

  if (error) {
    console.error("[data-deletion-status] lookup error", error);
    return null;
  }
  return (data as DeletionRow | null) ?? null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function statusLabel(status: StatusValue): string {
  switch (status) {
    case "queued":
      return "Na fila";
    case "processing":
      return "Em processamento";
    case "completed":
      return "Concluída";
  }
}

export default async function DataDeletionStatusPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code?.toLowerCase() ?? "";
  const row = await lookupRequest(code);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <article className="space-y-8">
        <header className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Status da solicitação de exclusão de dados
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Source Authority · Conformidade Meta App Review + LGPD
          </p>
        </header>

        {!row ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Solicitação não encontrada</h2>
            <p className="text-muted-foreground">
              O código informado{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                {code || "—"}
              </code>{" "}
              não corresponde a nenhuma solicitação de exclusão de dados ativa.
            </p>
            <p className="text-muted-foreground">
              Se você acabou de solicitar a exclusão pela Meta (Facebook ou
              Instagram), aguarde alguns minutos e atualize a página. Caso o
              problema persista, entre em contato:{" "}
              <a
                className="text-accent hover:underline"
                href="mailto:privacidade@sourceauthority.com.br"
              >
                privacidade@sourceauthority.com.br
              </a>
              .
            </p>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Status atual
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {statusLabel(row.status)}
              </p>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="mt-1 font-mono text-foreground">{code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Solicitada em</dt>
                <dd className="mt-1 text-foreground">
                  {formatDate(row.requested_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Conclusão prevista até
                </dt>
                <dd className="mt-1 text-foreground">
                  {formatDate(addDays(row.requested_at, 30))}
                </dd>
              </div>
              {row.completed_at && (
                <div>
                  <dt className="text-muted-foreground">Concluída em</dt>
                  <dd className="mt-1 text-foreground">
                    {formatDate(row.completed_at)}
                  </dd>
                </div>
              )}
            </dl>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Conforme a Lei Geral de Proteção de Dados (LGPD) e os requisitos
                de revisão da Meta, processamos solicitações de exclusão em até{" "}
                <strong className="text-foreground">30 dias</strong> a partir
                do recebimento.
              </p>
              <p>
                Para acompanhar ou tirar dúvidas, escreva para{" "}
                <a
                  className="text-accent hover:underline"
                  href="mailto:privacidade@sourceauthority.com.br"
                >
                  privacidade@sourceauthority.com.br
                </a>{" "}
                citando este código.
              </p>
            </div>
          </section>
        )}

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Esta página é fornecida em conformidade com as exigências da Meta
            Platforms Inc. (Facebook/Instagram) para apps que processam dados
            de usuários, e com o art. 18 da{" "}
            <a className="text-accent hover:underline" href="/lgpd">
              LGPD
            </a>
            .
          </p>
        </footer>
      </article>
    </main>
  );
}
