"use client";

import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  analyzeWithAI,
  checkAIAvailable,
  checkSuspect,
  deleteContent,
  registerContent,
  scanForRepostsNow,
  type AIAnalyzeServerResult,
  type SuspectMatchResult,
} from "./actions";

export type ContentRow = {
  id: string;
  source_platform: string;
  source_url: string;
  thumbnail_url: string | null;
  thumbnail_dhash: string | null;
  title: string | null;
  notes: string | null;
  status: string;
  registered_at: string;
};

type Props = {
  rows: ContentRow[];
  canEdit: boolean;
};

const CATEGORY_LABEL: Record<
  "exact" | "very_likely" | "possible" | "different",
  { label: string; color: string }
> = {
  exact: {
    label: "Repost confirmado",
    color: "text-rose-400 border-rose-400/40 bg-rose-400/10",
  },
  very_likely: {
    label: "Provavelmente repost",
    color:
      "text-orange-400 border-orange-400/40 bg-orange-400/10",
  },
  possible: {
    label: "Possível repost (verificar manual)",
    color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  },
  different: {
    label: "Provavelmente conteúdo diferente",
    color: "text-muted-foreground border-border bg-card",
  },
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  reels: "Instagram Reels",
  tiktok: "TikTok",
  youtube: "YouTube",
  shorts: "YouTube Shorts",
  web: "Web",
  upload: "Upload",
};

export function MeuConteudoClient({ rows, canEdit }: Props) {
  return (
    <div className="space-y-6">
      <CheckSuspectCard />
      {canEdit ? <RegisterCard /> : null}
      <ContentList rows={rows} canEdit={canEdit} />
    </div>
  );
}

// ─── Verificar suspeita ────────────────────────────────────────────────────

function CheckSuspectCard() {
  const [pending, startCheck] = useTransition();
  const [suspectUrl, setSuspectUrl] = useState("");
  const [result, setResult] = useState<SuspectMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setError(null);
    startCheck(async () => {
      const r = await checkSuspect({ suspect_url: suspectUrl });
      if ("ok" in r && r.ok === false) {
        setError(r.message);
        return;
      }
      setResult(r as SuspectMatchResult);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Verificar repost suspeito
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cola URL de qualquer post (Instagram, TikTok, YouTube) → comparamos
        com seus originais cadastrados.
      </p>

      <form onSubmit={onSubmit} className="mt-3 flex flex-wrap gap-2" noValidate>
        <Input
          type="url"
          required
          placeholder="https://instagram.com/p/abc... ou tiktok.com/@.../video/..."
          value={suspectUrl}
          onChange={(e) => setSuspectUrl(e.target.value)}
          disabled={pending}
          className="min-w-[260px] flex-1 font-mono text-xs"
        />
        <Button type="submit" size="sm" disabled={pending || !suspectUrl}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Verificar
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? <SuspectResultCard result={result} /> : null}
    </section>
  );
}

const AI_VERDICT_LABEL: Record<
  "plagio_direto" | "inspiracao_clara" | "similar_inconclusivo" | "diferente",
  { label: string; color: string; emoji: string }
> = {
  plagio_direto: {
    label: "Plágio direto",
    color: "text-rose-400 border-rose-400/40 bg-rose-400/10",
    emoji: "🚨",
  },
  inspiracao_clara: {
    label: "Inspiração clara",
    color: "text-orange-400 border-orange-400/40 bg-orange-400/10",
    emoji: "⚠️",
  },
  similar_inconclusivo: {
    label: "Similar mas inconclusivo",
    color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
    emoji: "🤔",
  },
  diferente: {
    label: "Conteúdo diferente",
    color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    emoji: "✓",
  },
};

function AIAnalysisPanel({
  contentId,
  suspectUrl,
}: {
  contentId: string;
  suspectUrl: string;
}) {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [result, setResult] = useState<AIAnalyzeServerResult | null>(null);

  useEffect(() => {
    checkAIAvailable().then((r) => setAiAvailable(r.available));
  }, []);

  function onAnalyze() {
    setResult(null);
    startAnalyze(async () => {
      const r = await analyzeWithAI({ content_id: contentId, suspect_url: suspectUrl });
      setResult(r);
    });
  }

  if (aiAvailable === null) {
    return null; // Loading inicial
  }
  if (aiAvailable === false) {
    return (
      <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
        🧠 <strong>Análise IA</strong> ainda não ativada. Configure
        ANTHROPIC_API_KEY em Vercel pra usar Claude Vision na detecção de
        plágio narrativo.
      </div>
    );
  }

  if (result?.ok) {
    const v = AI_VERDICT_LABEL[result.verdict];
    return (
      <div className={cn("mt-3 rounded-md border-2 p-3", v.color)}>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">
            {v.emoji} IA: {v.label}
          </span>
          <span className="font-mono text-[11px]">
            confiança {Math.round(result.confidence * 100)}% · custo $
            {result.cost_usd.toFixed(4)}
          </span>
        </div>
        <p className="text-[12px] leading-relaxed">{result.reasoning}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Análise via {result.model}
        </p>
      </div>
    );
  }

  if (result && !result.ok) {
    return (
      <Alert variant="destructive" className="mt-3">
        <AlertCircle className="size-4" />
        <AlertDescription className="text-xs">{result.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onAnalyze}
      disabled={analyzing}
      className="mt-3 border-accent/40 text-accent hover:bg-accent/10"
    >
      {analyzing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      Analisar com IA (Claude Vision)
    </Button>
  );
}

function SuspectResultCard({ result }: { result: SuspectMatchResult }) {
  const m = result.best_match;
  return (
    <div className="mt-4 space-y-3">
      {m ? (
        <div
          className={cn(
            "rounded-lg border-2 p-4",
            CATEGORY_LABEL[m.category].color,
          )}
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {CATEGORY_LABEL[m.category].label}
            </h3>
            <span className="font-mono text-xs">
              similaridade {m.similarity_pct}% · distância{" "}
              {m.distance}/64
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                Suspeito
              </p>
              {result.suspect.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.suspect.thumbnail_url}
                  alt="Suspeito"
                  className="aspect-square w-full rounded border border-border object-cover"
                  loading="lazy"
                />
              ) : null}
              <p className="break-all text-[11px] text-muted-foreground">
                {result.suspect.url}
              </p>
              {result.suspect.title ? (
                <p className="line-clamp-2 text-[11px]">
                  {result.suspect.title}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                Seu original
              </p>
              {m.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.thumbnail_url}
                  alt="Original"
                  className="aspect-square w-full rounded border border-border object-cover"
                  loading="lazy"
                />
              ) : null}
              <p className="break-all text-[11px] text-muted-foreground">
                {m.source_url}
              </p>
              {m.title ? (
                <p className="line-clamp-2 text-[11px]">{m.title}</p>
              ) : null}
            </div>
          </div>
          <AIAnalysisPanel
            contentId={m.content_id}
            suspectUrl={result.suspect.url}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Sem matches encontrados via dHash. Pode ser conteúdo diferente
          OU plágio com edits agressivos (cores, recorte, regravação) que
          dHash não detecta. Use IA pra confirmar:
          {result.candidates[0] ? (
            <AIAnalysisPanel
              contentId={result.candidates[0].content_id}
              suspectUrl={result.suspect.url}
            />
          ) : (
            <p className="mt-2 text-[11px]">
              Cadastre originais primeiro pra IA poder comparar.
            </p>
          )}
        </div>
      )}

      {result.candidates.length > 1 ? (
        <details className="rounded-lg border border-border bg-card/60 p-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Ver todos {result.candidates.length} matches comparados
          </summary>
          <ul className="mt-2 space-y-1.5">
            {result.candidates.map((c) => (
              <li
                key={c.content_id}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 truncate font-mono text-[11px]">
                  {c.title || c.source_url}
                </span>
                <span className="shrink-0 tabular-nums">
                  {c.similarity_pct}% · {c.distance}/64
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

// ─── Cadastrar novo original ────────────────────────────────────────────────

function RegisterCard() {
  const [pending, startRegister] = useTransition();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startRegister(async () => {
      const r = await registerContent({
        source_url: url,
        title: title || undefined,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setUrl("");
      setTitle("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cadastrar conteúdo original
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cola URL de um post seu (Instagram, TikTok, YouTube) — guardamos a
        thumbnail + fingerprint pra detectar reposts.
      </p>

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="mt-3 border-accent/40 bg-accent/10 text-accent">
          <CheckCircle2 className="size-4" />
          <AlertDescription>Cadastrado com sucesso.</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="content-url">URL do post original</Label>
          <Input
            id="content-url"
            type="url"
            required
            placeholder="https://instagram.com/p/abc..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="content-title">Título / nota (opcional)</Label>
          <Input
            id="content-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Lançamento jan/2026, Reels feed natal..."
            maxLength={200}
            disabled={pending}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !url}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Cadastrar
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Lista de cadastrados ──────────────────────────────────────────────────

function ContentList({
  rows,
  canEdit,
}: {
  rows: ContentRow[];
  canEdit: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Conteúdos cadastrados ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhum conteúdo cadastrado ainda.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <ContentCard key={r.id} row={r} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ContentCard({
  row,
  canEdit,
}: {
  row: ContentRow;
  canEdit: boolean;
}) {
  const [pending, startDelete] = useTransition();
  const [scanning, startScan] = useTransition();
  const [scanResult, setScanResult] = useState<
    | null
    | { ok: true; results: number; matches: number }
    | { ok: false; message: string }
  >(null);

  function onDelete() {
    if (pending) return;
    if (!confirm(`Excluir este conteúdo do registro?`)) return;
    startDelete(async () => {
      await deleteContent({ id: row.id });
    });
  }

  function onScan() {
    if (scanning) return;
    setScanResult(null);
    startScan(async () => {
      const r = await scanForRepostsNow({ content_id: row.id });
      if (r.ok) {
        setScanResult({
          ok: true,
          results: r.results_seen,
          matches: r.matches_found,
        });
      } else {
        setScanResult({ ok: false, message: r.message });
      }
      setTimeout(() => setScanResult(null), 12000);
    });
  }

  return (
    <li
      id={`content-${row.id}`}
      className="overflow-hidden rounded-md border border-border bg-background/40 scroll-mt-20"
    >
      {row.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.thumbnail_url}
          alt={row.title ?? "Thumbnail"}
          className="aspect-square w-full bg-secondary/20 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-secondary/40 text-xs text-muted-foreground">
          {row.status === "failed" ? "Falha no fetch" : "Sem thumbnail"}
        </div>
      )}
      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            {PLATFORM_LABEL[row.source_platform] ?? row.source_platform}
          </span>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={pending}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              aria-label="Excluir"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
            </Button>
          ) : null}
        </div>
        {row.title ? (
          <p className="line-clamp-2 text-xs">{row.title}</p>
        ) : null}
        <a
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-[10px] text-muted-foreground hover:text-accent hover:underline"
        >
          {row.source_url}
        </a>

        {canEdit && row.status === "ready" ? (
          <div className="space-y-1.5 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onScan}
              disabled={scanning}
              className="w-full text-[11px]"
            >
              {scanning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Globe className="size-3" />
              )}
              Buscar reposts no Google
            </Button>

            {scanResult?.ok ? (
              <p
                className={cn(
                  "rounded-md px-2 py-1 text-[10px]",
                  scanResult.matches > 0
                    ? "bg-rose-400/10 text-rose-400"
                    : "bg-emerald-400/10 text-emerald-400",
                )}
              >
                {scanResult.matches > 0 ? "🚨 " : "✓ "}
                {scanResult.results} pági­na(s) varrida(s) ·{" "}
                <strong>{scanResult.matches} repost(s) detectado(s)</strong>
                {scanResult.matches > 0 ? " — abre /alertas" : ""}
              </p>
            ) : null}
            {scanResult && !scanResult.ok ? (
              <p className="rounded-md bg-rose-400/10 px-2 py-1 text-[10px] text-rose-400">
                {scanResult.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
