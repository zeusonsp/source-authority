"use client";

import { ExternalLink, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { cn } from "@/lib/utils";

type EventRow = Record<string, unknown> | null;

type Props = {
  totalEvents: number;
  masterLink: string;
  latestEvent: EventRow;
};

/**
 * Bloco de campo: rótulo + valor formatado + flag "preenchido / vazio".
 */
type FieldGroup = {
  title: string;
  description?: string;
  fields: { label: string; key: string; format?: (v: unknown) => string }[];
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Localização (geoIP)",
    description:
      "Derivado do IP via Cloudflare (tracker) ou Vercel Edge (pixel JS). Precisão ~cidade.",
    fields: [
      { label: "País", key: "ip_country" },
      { label: "Estado/UF", key: "ip_region" },
      { label: "Cidade", key: "ip_city" },
      { label: "CEP", key: "ip_postal_code" },
      { label: "Continente", key: "ip_continent" },
      { label: "Timezone", key: "ip_timezone" },
      { label: "Latitude", key: "ip_latitude" },
      { label: "Longitude", key: "ip_longitude" },
      { label: "ASN (operadora)", key: "ip_asn" },
      { label: "Operadora/ISP", key: "ip_organization" },
    ],
  },
  {
    title: "Dispositivo & Browser",
    description:
      "Parte vem do User-Agent parseado (server) e parte de APIs JS no pixel.js do site cliente.",
    fields: [
      { label: "Tipo de device", key: "device" },
      { label: "Browser", key: "_browser" },
      { label: "Sistema operacional", key: "_os" },
      { label: "Fabricante", key: "device_vendor" },
      { label: "Modelo", key: "device_model" },
      { label: "Idioma preferido", key: "lang" },
      { label: "Resolução tela", key: "_screen" },
      { label: "Viewport", key: "_viewport" },
      { label: "Profundidade de cor", key: "color_depth" },
      { label: "Pixel ratio", key: "device_pixel_ratio" },
      { label: "Tipo de rede", key: "network_type" },
      { label: "User-Agent (bruto)", key: "user_agent" },
    ],
  },
  {
    title: "Origem & contexto",
    description: "De onde veio o clique e em qual URL/campanha.",
    fields: [
      { label: "Path da URL", key: "url_path" },
      { label: "Site de origem (referrer)", key: "referrer" },
      { label: "?ref= (revendedor)", key: "referrer_code" },
      { label: "utm_source", key: "utm_source" },
      { label: "utm_medium", key: "utm_medium" },
      { label: "utm_campaign", key: "utm_campaign" },
      { label: "utm_term", key: "utm_term" },
      { label: "utm_content", key: "utm_content" },
      { label: "Session ID (anônimo)", key: "session_id" },
    ],
  },
  {
    title: "Metadata interna",
    fields: [
      { label: "Quando aconteceu", key: "created_at" },
      { label: "Event ID", key: "id" },
      { label: "Empresa", key: "company_id" },
    ],
  },
];

function formatValue(key: string, value: unknown, raw: EventRow): string {
  // Computed fields: combina campos pra display amigável.
  if (key === "_screen") {
    const w = raw?.screen_width;
    const h = raw?.screen_height;
    if (typeof w === "number" && typeof h === "number") return `${w} × ${h}px`;
    return "—";
  }
  if (key === "_viewport") {
    const w = raw?.viewport_width;
    const h = raw?.viewport_height;
    if (typeof w === "number" && typeof h === "number") return `${w} × ${h}px`;
    return "—";
  }
  if (key === "_browser") {
    const n = raw?.browser_name;
    const v = raw?.browser_version;
    if (typeof n === "string" && n) {
      return typeof v === "string" && v ? `${n} ${v}` : n;
    }
    return "—";
  }
  if (key === "_os") {
    const n = raw?.os_name;
    const v = raw?.os_version;
    if (typeof n === "string" && n) {
      return typeof v === "string" && v ? `${n} ${v}` : n;
    }
    return "—";
  }
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    if (key === "created_at") {
      try {
        return new Date(value).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

export function DiagnosticoClient({
  totalEvents,
  masterLink,
  latestEvent,
}: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [showRaw, setShowRaw] = useState(false);

  function onRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function onTest() {
    // Abre o link mestre numa nova aba — visitante que clica simula
    // cliente real. Após volta, manualmente clicar em "Atualizar" pra
    // re-fetch do último evento.
    window.open(masterLink, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      {/* ─── Action panel ───────────────────────────────────────── */}
      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Testar agora
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Total de eventos da empresa:{" "}
              <span className="font-mono text-foreground">
                {totalEvents.toLocaleString("pt-BR")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  refreshing ? "animate-spin" : undefined,
                )}
              />
              Atualizar
            </Button>
            <Button type="button" size="sm" onClick={onTest}>
              <ExternalLink className="size-4" />
              Testar tracking
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Link mestre testado:</span>
          <span className="flex-1 break-all font-mono text-accent">
            {masterLink}
          </span>
          <CopyLinkButton value={masterLink} label="Copiar" />
        </div>
      </section>

      {/* ─── Latest event capture ───────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Último evento capturado
          </h2>
          {latestEvent ? (
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {showRaw ? "ver formatado" : "ver JSON cru"}
            </button>
          ) : null}
        </div>

        {!latestEvent ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem eventos ainda. Click em &ldquo;Testar tracking&rdquo; pra
            gerar o primeiro.
          </p>
        ) : showRaw ? (
          <pre className="overflow-x-auto rounded border border-border bg-background/40 p-3 text-[11px] leading-relaxed">
            {JSON.stringify(latestEvent, null, 2)}
          </pre>
        ) : (
          <div className="space-y-5">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {group.title}
                </h3>
                {group.description ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {group.description}
                  </p>
                ) : null}
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {group.fields.map((f) => {
                    const raw = latestEvent;
                    const value = formatValue(
                      f.key,
                      f.key.startsWith("_") ? null : raw?.[f.key],
                      raw,
                    );
                    const empty = value === "—";
                    return (
                      <div
                        key={f.key}
                        className="flex items-start justify-between gap-3 border-b border-border/40 py-1.5"
                      >
                        <dt className="text-xs text-muted-foreground">
                          {f.label}
                        </dt>
                        <dd
                          className={cn(
                            "max-w-[55%] truncate text-right font-mono text-xs",
                            empty
                              ? "text-muted-foreground/50"
                              : "text-foreground",
                          )}
                          title={value}
                        >
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── LGPD compliance card ─────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">
              O que CAPTURAMOS
            </h3>
          </div>
          <ul className="space-y-1.5 text-[12px] leading-relaxed text-foreground/90">
            <li>
              ✓ <strong>País / estado / cidade aproximados</strong> (derivado
              do IP, precisão ~cidade)
            </li>
            <li>
              ✓ <strong>Dispositivo</strong> (mobile/desktop/tablet)
            </li>
            <li>
              ✓ <strong>Browser e versão</strong> (do header User-Agent)
            </li>
            <li>
              ✓ <strong>Idioma preferido</strong> (do header Accept-Language)
            </li>
            <li>
              ✓ <strong>Site de origem</strong> (HTTP referrer — Google,
              Instagram, etc)
            </li>
            <li>
              ✓ <strong>Resolução de tela e viewport</strong> (via JS pixel)
            </li>
            <li>
              ✓ <strong>UTM params</strong> da URL (utm_source, _medium, etc)
            </li>
            <li>
              ✓ <strong>Code de revendedor</strong> (?ref= proprietário)
            </li>
            <li>
              ✓ <strong>Session ID anônimo</strong> (UUID em localStorage)
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-rose-400/30 bg-rose-400/5 p-5">
          <div className="mb-2 flex items-center gap-2">
            <ShieldOff className="size-4 text-rose-400/80" />
            <h3 className="text-sm font-semibold text-rose-400/80">
              O que NÃO capturamos
            </h3>
          </div>
          <ul className="space-y-1.5 text-[12px] leading-relaxed text-foreground/90">
            <li>
              ✗ <strong>IP do visitante</strong> (usamos só pra derivar geo,
              não armazenamos o IP)
            </li>
            <li>
              ✗ <strong>Nome, email, telefone</strong> (nada PII identificável
              direto)
            </li>
            <li>
              ✗ <strong>Histórico de navegação</strong> (não vemos outros
              sites visitados)
            </li>
            <li>
              ✗ <strong>Conteúdo de formulários</strong> (não capturamos input
              de texto/senha)
            </li>
            <li>
              ✗ <strong>Cookies de terceiros</strong> (não fazemos
              cross-site tracking)
            </li>
            <li>
              ✗ <strong>Browser fingerprinting</strong> (canvas/WebGL — não
              fazemos)
            </li>
            <li>
              ✗ <strong>Câmera / microfone / GPS preciso</strong> (nada que
              exija consent extra)
            </li>
            <li>
              ✗ <strong>Mouse-tracking / heatmap de scroll</strong> (não
              gravamos a página)
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">LGPD (Lei 13.709/2018):</strong>{" "}
            Source Authority opera sob &ldquo;legítimo interesse&rdquo; (Art. 7º, IX) pra
            analytics agregados. Dados capturados são anônimos por design —
            sem IP armazenado, sem fingerprinting, sem cross-site tracking.
            Cliente final pode solicitar exclusão a qualquer momento via{" "}
            <a
              href="/configuracoes"
              className="text-accent hover:underline"
            >
              Configurações
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
