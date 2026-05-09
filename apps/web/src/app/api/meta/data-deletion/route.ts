import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared";

import { env } from "@/lib/env-server";
import {
  metaConfirmationCode,
  verifyMetaSignedRequest,
} from "@/lib/meta/signed-request";

/**
 * POST /api/meta/data-deletion — Meta App Review prereq (LGPD-compatível).
 *
 * Recebido quando o user solicita deleção total dos dados Meta dele
 * (Settings → Apps and Websites → Remove → "Send Data Deletion Request").
 *
 * Diferente do /deauthorize, esta request exige deleção de TUDO que
 * coletamos sobre o user — pode incluir audit logs, eventos, alertas.
 * Janela aceita pela Meta: ≤30 dias. LGPD permite o mesmo prazo
 * operacional, então enfileiramos pra worker dedicado processar.
 *
 * Comportamento:
 *   1. Valida signed_request (HMAC-SHA256 com META_APP_SECRET)
 *   2. INSERT em meta_data_deletion_requests com status='queued'
 *      (idempotente via UNIQUE user_id)
 *   3. Audit log em cada empresa que tinha esse user_id IG conectado
 *   4. Retorna {url, confirmation_code} JSON (formato exigido pela Meta)
 *
 * Note: NÃO deleta nada agora — só enfileira. Worker `data-deletion` (a ser
 * criado em sub-bloco futuro) consome 'queued' rows, deleta dados, marca
 * 'completed'. Página /data-deletion-status/<code> mostra status atual.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  if (!env.META_APP_SECRET) {
    return NextResponse.json(
      { error: "Meta integration not configured" },
      { status: 503 },
    );
  }

  let signedRequest: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const value = form.get("signed_request");
      signedRequest = typeof value === "string" ? value : null;
    } else if (contentType.includes("application/json")) {
      const body = (await req.json()) as { signed_request?: unknown };
      signedRequest =
        typeof body?.signed_request === "string" ? body.signed_request : null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      signedRequest = params.get("signed_request");
    }
  } catch (err) {
    console.error("[meta/data-deletion] body parse error", err);
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!signedRequest) {
    return NextResponse.json(
      { error: "missing signed_request" },
      { status: 400 },
    );
  }

  const verified = verifyMetaSignedRequest(signedRequest, env.META_APP_SECRET);
  if (!verified) {
    return NextResponse.json(
      { error: "invalid signed_request" },
      { status: 400 },
    );
  }

  const userId = verified.user_id;
  const code = metaConfirmationCode(userId);
  const supabase = adminClient();

  // Idempotente: se já existe linha pro user_id, ON CONFLICT DO NOTHING
  // (UNIQUE constraint em user_id) e retorna o code mesmo. Meta pode
  // reenviar a mesma request — não queremos enfileirar 2x.
  const { error: insertErr } = await supabase
    .from("meta_data_deletion_requests")
    .upsert(
      {
        user_id: userId,
        confirmation_code: code,
        status: "queued",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  if (insertErr) {
    console.error("[meta/data-deletion] insert error", insertErr);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  // Audit log nas empresas que tinham conexão IG desse user (pra trilha
  // de compliance LGPD por tenant). Service role insere direto na tabela
  // (bypassa RLS) — log_audit_event RPC checa is_company_member que falha
  // sem auth.uid().
  const { data: connections } = await supabase
    .from("instagram_connections")
    .select("company_id, ig_username")
    .eq("ig_user_id", userId);

  if (connections && connections.length > 0) {
    const auditRows = connections.map((c) => ({
      company_id: c.company_id,
      actor_id: null,
      action: "meta.data_deletion_requested",
      payload: {
        ig_user_id: userId,
        ig_username: c.ig_username,
        confirmation_code: code,
        source: "meta_callback",
      },
    }));
    const { error: auditErr } = await supabase
      .from("audit_log")
      .insert(auditRows);
    if (auditErr) {
      // Audit não-crítico pra response; loga e segue.
      console.error("[meta/data-deletion] audit insert error", auditErr);
    }
  }

  const statusUrl = `${env.NEXT_PUBLIC_APP_URL}/data-deletion-status/${code}`;

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: code,
  });
}
