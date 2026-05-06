"use server";

import type { Tables } from "@source-authority/shared/database.types";
import { createClient } from "@/lib/supabase/server";

const MAX_EXPORT_ROWS = 50_000;

export type ExportEventsCSVResult =
  | {
      ok: true;
      filename: string;
      content: string;
      contentType: "text/csv";
    }
  | { ok: false; code: "no_company"; message: string }
  | { ok: false; code: "too_large"; message: string }
  | { ok: false; code: "unknown"; message: string };

type EventRow = Pick<
  Tables<"events">,
  | "created_at"
  | "device"
  | "ip_country"
  | "ip_city"
  | "lang"
  | "referrer"
  | "user_agent"
>;

/**
 * Exporta eventos em CSV pro range solicitado. Limitado a 50k linhas
 * pra não travar o navegador no parse + download.
 *
 * RLS de events só retorna rows da empresa do user — sem `.eq()` na
 * query daria igual, mas mantemos por clareza + defesa em profundidade.
 */
export async function exportEventsCSV(
  fromIso: string,
  toIso: string,
): Promise<ExportEventsCSVResult> {
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .limit(1);
  if (!memberships || memberships.length === 0) {
    return {
      ok: false,
      code: "no_company",
      message: "Sem empresa associada à sua conta.",
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", memberships[0]!.company_id)
    .single();
  if (!company) {
    return {
      ok: false,
      code: "no_company",
      message: "Empresa não encontrada.",
    };
  }

  const { data: eventsData } = await supabase
    .from("events")
    .select("created_at, device, ip_country, ip_city, lang, referrer, user_agent")
    .eq("company_id", company.id)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS + 1);

  const events = eventsData ?? [];

  if (events.length > MAX_EXPORT_ROWS) {
    return {
      ok: false,
      code: "too_large",
      message: `Range muito amplo (>${MAX_EXPORT_ROWS.toLocaleString("pt-BR")} eventos). Reduza o período.`,
    };
  }

  const csv = toCsv(events);
  const filename = `eventos-${company.slug}-${fromIso.slice(0, 10)}-${toIso.slice(0, 10)}.csv`;
  return {
    ok: true,
    filename,
    content: csv,
    contentType: "text/csv",
  };
}

function toCsv(rows: EventRow[]): string {
  const headers = [
    "created_at",
    "device",
    "ip_country",
    "ip_city",
    "lang",
    "referrer",
    "user_agent",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.device,
        r.ip_country,
        r.ip_city,
        r.lang,
        r.referrer,
        r.user_agent,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

function csvEscape(value: string | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Escapa se contém comma, quote, newline, ou começa com whitespace.
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
