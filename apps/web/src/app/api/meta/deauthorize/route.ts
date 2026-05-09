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
 * POST /api/meta/deauthorize — Meta App Review prereq.
 *
 * Recebido quando o user revoga o app no Meta Business Suite (settings →
 * apps → remove). Body é form-encoded com 1 campo `signed_request` que
 * contém HMAC-SHA256 do payload com nosso META_APP_SECRET.
 *
 * Comportamento:
 *   1. Valida signed_request (HMAC + algorithm + user_id presente)
 *   2. Lookup instagram_connections WHERE ig_user_id = user_id
 *   3. Se achou: registra audit_log na empresa, deleta a connection
 *   4. Retorna {url, confirmation_code} JSON (formato exigido pela Meta)
 *
 * O `url` aponta pra mesma página de status do data-deletion — Meta usa
 * essa página tanto pra deauthorize quanto pra deletion.
 *
 * Idempotência: deauthorize é deterministicamente identificado pelo
 * user_id Meta. Duas requests pro mesmo user → 1ª deleta, 2ª acha 0 rows
 * e retorna 200 mesmo assim (Meta espera 2xx pra não retentar).
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

  // signed_request vem em body application/x-www-form-urlencoded.
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
      // Fallback — alguns clientes Meta enviam sem content-type explicito.
      const text = await req.text();
      const params = new URLSearchParams(text);
      signedRequest = params.get("signed_request");
    }
  } catch (err) {
    console.error("[meta/deauthorize] body parse error", err);
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

  // Lookup connection(s) — em tese 1 só (UNIQUE company_id), mas pode haver
  // múltiplas se o mesmo user IG apareceu em empresas diferentes (improvável
  // mas possível). Tratamos N rows pra ser robusto.
  const { data: connections, error: selectErr } = await supabase
    .from("instagram_connections")
    .select("id, company_id, ig_username")
    .eq("ig_user_id", userId);

  if (selectErr) {
    console.error("[meta/deauthorize] select error", selectErr);
    // Mesmo em erro de DB, retornar 200 com code seria perigoso (Meta
    // assumiria sucesso). Retorna 500 — Meta retenta.
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  if (connections && connections.length > 0) {
    // Audit log primeiro (precisa de company_id que vai sumir após delete).
    for (const conn of connections) {
      const { error: auditErr } = await supabase.rpc("log_audit_event", {
        _company_id: conn.company_id,
        _action: "meta.deauthorize",
        _payload: {
          ig_user_id: userId,
          ig_username: conn.ig_username,
          confirmation_code: code,
          source: "meta_callback",
        },
      });
      if (auditErr) {
        // log_audit_event valida is_company_member(auth.uid()) — service role
        // não tem auth.uid(), por design retorna forbidden. Insert direto na
        // audit_log como fallback (service role bypassa RLS de tabela).
        const { error: directInsertErr } = await supabase
          .from("audit_log")
          .insert({
            company_id: conn.company_id,
            actor_id: null,
            action: "meta.deauthorize",
            payload: {
              ig_user_id: userId,
              ig_username: conn.ig_username,
              confirmation_code: code,
              source: "meta_callback",
            },
          });
        if (directInsertErr) {
          console.error(
            "[meta/deauthorize] audit insert fallback failed",
            directInsertErr,
          );
        }
      }
    }

    const { error: deleteErr } = await supabase
      .from("instagram_connections")
      .delete()
      .eq("ig_user_id", userId);

    if (deleteErr) {
      console.error("[meta/deauthorize] delete error", deleteErr);
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  }

  // URL pública de status (mesma usada pelo data-deletion). Meta exibe esse
  // link pro user; precisa renderizar HTML público.
  const statusUrl = `${env.NEXT_PUBLIC_APP_URL}/data-deletion-status/${code}`;

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: code,
  });
}
