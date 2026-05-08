"use client";

import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackerUrl } from "@/lib/tracker";
import { createReseller, deleteReseller } from "./actions";

export type ResellerRow = {
  id: string;
  code: string;
  name: string;
  notes: string | null;
  created_at: string;
  /** Cliques nos últimos 30 dias (computado server-side). */
  clicks_30d: number;
};

type Props = {
  rows: ResellerRow[];
  companySlug: string;
  canEdit: boolean;
};

export function RevendedoresClient({ rows, companySlug, canEdit }: Props) {
  const [creating, startCreate] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startCreate(async () => {
      const result = await createReseller({ code, name, notes });
      if (result.ok) {
        setCode("");
        setName("");
        setNotes("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="space-y-6">
      {/* Form de criação */}
      {canEdit ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Novo código
          </h2>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert className="border-accent/40 bg-accent/10 text-accent">
              <CheckCircle2 className="size-4" />
              <AlertDescription>Código criado.</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={onCreate} className="space-y-3" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase())}
                  placeholder="ana, joao_2026, instagram"
                  pattern="[a-z0-9._\-]+"
                  maxLength={64}
                  required
                  disabled={creating}
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  letras (a-z), dígitos, hífen, underscore, ponto. Sem espaços.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome amigável</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana Paula — afiliada"
                  maxLength={100}
                  required
                  disabled={creating}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="comissão 10%, campanha jan/2026..."
                maxLength={500}
                disabled={creating}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={creating} size="sm">
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Criar código
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Lista */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Códigos cadastrados ({rows.length})
          </h2>
        </div>

        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum código ainda. Crie um acima para começar a atribuir cliques
            por revendedor.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <ResellerCard
                key={r.id}
                row={r}
                companySlug={companySlug}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResellerCard({
  row,
  companySlug,
  canEdit,
}: {
  row: ResellerRow;
  companySlug: string;
  canEdit: boolean;
}) {
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const linkWithRef = `${trackerUrl(companySlug)}?ref=${encodeURIComponent(row.code)}`;

  function onDelete() {
    if (deleting) return;
    if (!confirm(`Excluir código "${row.code}"?`)) return;
    setError(null);
    startDelete(async () => {
      const result = await deleteReseller({ id: row.id });
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent">
              {row.code}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm text-foreground">{row.name}</span>
          </div>
          {row.notes ? (
            <p className="text-xs text-muted-foreground">{row.notes}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium">
            {row.clicks_30d.toLocaleString("pt-BR")}{" "}
            {row.clicks_30d === 1 ? "click" : "clicks"} 30d
          </span>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={deleting}
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
              aria-label={`Excluir ${row.code}`}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-border bg-background px-3 py-2">
        <span className="flex-1 break-all font-mono text-xs text-muted-foreground">
          {linkWithRef}
        </span>
        <CopyLinkButton value={linkWithRef} label="Copiar link" />
      </div>
      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
