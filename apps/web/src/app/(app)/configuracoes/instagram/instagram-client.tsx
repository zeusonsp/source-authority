"use client";

import {
  AlertCircle,
  CheckCircle2,
  Hash,
  Loader2,
  Plus,
  Search,
  Trash2,
  Unplug,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addHashtag,
  disconnectInstagram,
  removeHashtag,
  triggerHashtagScan,
} from "./actions";

type Connection = {
  id: string;
  ig_user_id: string;
  ig_username: string | null;
  fb_page_name: string | null;
  status: string;
  token_expires_at: string | null;
  last_polled_at: string | null;
  connected_at: string;
} | null;

type HashtagWatch = {
  id: string;
  hashtag: string;
  ig_hashtag_id: string | null;
  last_polled_at: string | null;
  active: boolean;
  created_at: string;
};

type Props = {
  configured: boolean;
  canEdit: boolean;
  membershipRole: string;
  connection: Connection;
  hashtags: HashtagWatch[];
};

export function InstagramClient({
  configured,
  canEdit,
  membershipRole,
  connection,
  hashtags,
}: Props) {
  return (
    <div className="space-y-5">
      <ConnectionCard
        configured={configured}
        canEdit={canEdit}
        connection={connection}
      />
      {connection ? (
        <HashtagsCard
          canEdit={canEdit}
          hashtags={hashtags}
        />
      ) : null}
      {!canEdit ? (
        <Alert>
          <AlertDescription>
            Seu papel é <strong>{membershipRole}</strong> — apenas{" "}
            <strong>owner/admin</strong> podem conectar Instagram e gerenciar
            hashtags.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

// ─── Connection ────────────────────────────────────────────────────────────

function ConnectionCard({
  configured,
  canEdit,
  connection,
}: {
  configured: boolean;
  canEdit: boolean;
  connection: Connection;
}) {
  const [pending, startDisconnect] = useTransition();

  function onDisconnect() {
    if (pending) return;
    if (
      !confirm(
        "Desconectar Instagram? Hashtags monitoradas continuam cadastradas mas não receberão novos posts até reconectar.",
      )
    )
      return;
    startDisconnect(async () => {
      await disconnectInstagram();
    });
  }

  if (connection) {
    const expiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;
    const daysLeft = expiresAt
      ? Math.max(
          0,
          Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              ✓ Conectado
            </h2>
            <p className="mt-2 text-base">
              <span className="text-muted-foreground">@</span>
              <span className="font-mono font-semibold text-accent">
                {connection.ig_username ?? "?"}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Página Facebook: {connection.fb_page_name ?? "?"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Token expira em{" "}
              {daysLeft !== null ? (
                <span
                  className={cn(
                    daysLeft < 7 ? "text-rose-400" : "text-foreground",
                  )}
                >
                  {daysLeft} dias
                </span>
              ) : (
                "?"
              )}{" "}
              · conectado em{" "}
              {new Date(connection.connected_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDisconnect}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unplug className="size-4" />
              )}
              Desconectar
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Conectar Instagram Business
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Conecte sua conta Instagram Business pra:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        <li>✓ Monitorar até 30 hashtags automaticamente (cron 4h)</li>
        <li>✓ Detectar reposts dos seus conteúdos cadastrados</li>
        <li>✓ Receber alertas quando alguém usa hashtag relevante</li>
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Pré-requisito: conta Instagram em modo Business + página Facebook
        vinculada. Conversão grátis no app Instagram → Configurações → Conta →
        Mudar pra Conta Profissional.
      </p>
      <div className="mt-4">
        {!configured ? (
          <Button disabled size="sm" variant="outline">
            Aguardando configuração admin
          </Button>
        ) : !canEdit ? (
          <Button disabled size="sm" variant="outline">
            Apenas owner/admin pode conectar
          </Button>
        ) : (
          <a
            href="/api/integrations/instagram/connect"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-yellow-500 via-pink-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Conectar Instagram
          </a>
        )}
      </div>
    </section>
  );
}

// ─── Hashtags ──────────────────────────────────────────────────────────────

function HashtagsCard({
  canEdit,
  hashtags,
}: {
  canEdit: boolean;
  hashtags: HashtagWatch[];
}) {
  const [pending, startAdd] = useTransition();
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startAdd(async () => {
      const r = await addHashtag({ hashtag: tag });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setTag("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Hashtags monitoradas ({hashtags.length}/30)
        </h2>
        <p className="text-[11px] text-muted-foreground">
          worker varre top posts a cada 4h
        </p>
      </div>

      {canEdit && hashtags.length > 0 ? (
        <TriggerScanButton />
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="mt-3 border-accent/40 bg-accent/10 text-accent">
          <CheckCircle2 className="size-4" />
          <AlertDescription>Hashtag adicionada.</AlertDescription>
        </Alert>
      ) : null}

      {canEdit ? (
        <form onSubmit={onAdd} className="mt-3 flex gap-2" noValidate>
          <div className="flex flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-3 focus-within:border-accent">
            <Hash className="size-4 text-muted-foreground" />
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value.toLowerCase())}
              placeholder="zeus, leds, comerciobr..."
              maxLength={64}
              pattern="[a-z0-9_]+"
              required
              disabled={pending || hashtags.length >= 30}
              className="border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={pending || !tag || hashtags.length >= 30}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar
          </Button>
        </form>
      ) : null}

      {hashtags.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma hashtag cadastrada. Adicione hashtags relevantes pro seu
          nicho pra worker buscar reposts automaticamente.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {hashtags.map((h) => (
            <HashtagItem key={h.id} h={h} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HashtagItem({
  h,
  canEdit,
}: {
  h: HashtagWatch;
  canEdit: boolean;
}) {
  const [pending, startRemove] = useTransition();
  function onRemove() {
    if (pending) return;
    startRemove(async () => {
      await removeHashtag({ id: h.id });
    });
  }
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
      <span className="font-mono text-sm">
        <Hash className="mr-1 inline size-3 text-muted-foreground" />
        <span className="text-foreground">{h.hashtag}</span>
      </span>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {h.last_polled_at ? (
          <span>
            varrida{" "}
            {new Date(h.last_polled_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ) : (
          <span className="text-amber-400">aguardando 1ª varredura</span>
        )}
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            disabled={pending}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function TriggerScanButton() {
  const [pending, startScan] = useTransition();
  const [result, setResult] = useState<
    | null
    | {
        ok: true;
        watches: number;
        watchesFailed: number;
        posts: number;
        alerts: number;
        errors: Array<{ hashtag: string; detail: string }>;
      }
    | { ok: false; message: string }
  >(null);

  function onClick() {
    if (pending) return;
    setResult(null);
    startScan(async () => {
      const r = await triggerHashtagScan();
      if (r.ok) {
        setResult({
          ok: true,
          watches: r.summary.watches,
          watchesFailed: r.summary.watches_failed,
          posts: r.summary.posts_seen,
          alerts: r.summary.alerts_created,
          errors: r.summary.errors,
        });
      } else {
        setResult({ ok: false, message: r.message });
      }
      setTimeout(() => setResult(null), 30000);
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={pending}
        className="self-start"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
        Disparar varredura agora
      </Button>
      {result?.ok ? (
        <Alert
          className={
            result.watchesFailed > 0
              ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
              : "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
          }
        >
          {result.watchesFailed > 0 ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <AlertDescription>
            <div>
              Varredura: {result.watches} ok, {result.watchesFailed}{" "}
              falharam · {result.posts} posts · {result.alerts} alerta(s).
            </div>
            {result.errors.length > 0 ? (
              <ul className="mt-2 space-y-1 font-mono text-[11px]">
                {result.errors.map((e, idx) => (
                  <li key={idx} className="break-all">
                    <strong>#{e.hashtag}</strong>: {e.detail}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
