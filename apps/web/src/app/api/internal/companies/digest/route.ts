import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { isInternalRequestAuthorized } from "@/app/api/internal/_auth";
import { env } from "@/lib/env-server";
import { notifyAlertDigest } from "@/lib/notifications/notify-alert";

/**
 * POST /api/internal/companies/digest
 *
 * Endpoint interno chamado pelo cron diário do workers/brand-monitor
 * (09:00 BRT). Pra cada company com alerts nas últimas 24h, dispara
 * email digest pra owners+admins.
 *
 * Sem alerts → noop silencioso (notifyAlertDigest retorna sent=0).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  company_id: z.string().uuid(),
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

  const result = await notifyAlertDigest(parsed.company_id, supabase);
  return NextResponse.json(result, { status: 200 });
}
