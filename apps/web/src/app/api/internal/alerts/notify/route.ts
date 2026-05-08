import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { isInternalRequestAuthorized } from "@/app/api/internal/_auth";
import { env } from "@/lib/env-server";
import type { AlertRow } from "@/lib/alerts/types";
import { notifyAlertImmediate } from "@/lib/notifications/notify-alert";

/**
 * POST /api/internal/alerts/notify
 *
 * Endpoint interno chamado pelo workers/brand-monitor quando insere um
 * alert com severity='high'. Dispara email imediato pra owners+admins.
 *
 * Bearer auth via INTERNAL_NOTIFICATIONS_SECRET. Worker faz fire-and-forget
 * via ctx.waitUntil — nunca espera resposta. Em caso de falha aqui, o
 * digest diário pega o alert (high entra como catch-up).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  alert_id: z.string().uuid(),
});

export async function POST(req: Request) {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Lookup do alert via service_role (bypassa RLS). `alerts` ainda não está
  // em database.types — cast manual.
  const { data: row, error } = await supabase
    .from("alerts" as never)
    .select("*")
    .eq("id", parsed.alert_id)
    .maybeSingle();

  if (error) {
    console.error("[internal/alerts/notify] alert lookup failed", error);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "alert not found" }, { status: 404 });
  }

  const alert = row as unknown as AlertRow;

  // Defesa em profundidade — só envia se severity='high'. Worker já faz
  // esse filtro mas confirma aqui.
  if (alert.severity !== "high") {
    return NextResponse.json({ skipped: "severity not high" }, { status: 200 });
  }

  const result = await notifyAlertImmediate(alert, supabase);
  return NextResponse.json(result, { status: 200 });
}
