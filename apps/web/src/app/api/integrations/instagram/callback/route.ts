import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramAccountForPage,
  isInstagramConfigured,
  listUserPages,
} from "@/lib/integrations/instagram";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * GET /api/integrations/instagram/callback?code=X&state=Y
 *
 * Recebe redirect do Facebook OAuth. Faz:
 *   1. Verifica CSRF state
 *   2. Troca code → short-lived token (1h)
 *   3. Troca short → long-lived (60d)
 *   4. Lista pages do user
 *   5. Pra cada page, busca Instagram Business Account ligada
 *   6. Se encontrar, INSERT/UPSERT instagram_connections
 *   7. Redireciona pra /configuracoes/instagram com flash message
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      { error: "Instagram integration not configured" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_reason");

  // User cancelou no FB ou erro upstream.
  if (error) {
    const target = new URL("/configuracoes/instagram", env.NEXT_PUBLIC_APP_URL);
    target.searchParams.set("ig_error", errorReason ?? error);
    return NextResponse.redirect(target);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "missing code or state" },
      { status: 400 },
    );
  }

  // CSRF check.
  const cookieStore = cookies();
  const expectedState = cookieStore.get("ig_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  cookieStore.delete("ig_oauth_state");

  // Auth: precisa estar logado.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL));
  }

  // Resolve company.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .limit(1);
  const m = memberships?.[0];
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    return NextResponse.redirect(
      new URL(
        "/configuracoes/instagram?ig_error=forbidden",
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`;

  try {
    // Step 4: code → short-lived
    const shortLived = await exchangeCodeForToken(code, redirectUri);
    // Step 5: short → long-lived
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    // Step 6: descobre IG Business Account via pages
    const pages = await listUserPages(longLived.access_token);
    let igConn: {
      ig_user_id: string;
      ig_username: string;
      fb_page_id: string;
      fb_page_name: string;
    } | null = null;

    for (const page of pages) {
      const ig = await getInstagramAccountForPage(page.id, page.access_token);
      if (ig) {
        igConn = {
          ig_user_id: ig.ig_user_id,
          ig_username: ig.username,
          fb_page_id: page.id,
          fb_page_name: page.name,
        };
        break;
      }
    }

    if (!igConn) {
      return NextResponse.redirect(
        new URL(
          "/configuracoes/instagram?ig_error=no_business_account",
          env.NEXT_PUBLIC_APP_URL,
        ),
      );
    }

    // Step 7: UPSERT (1 conexão por empresa).
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
    const { error: insertErr } = await supabase
      .from("instagram_connections")
      .upsert(
        {
          company_id: m.company_id,
          ig_user_id: igConn.ig_user_id,
          ig_username: igConn.ig_username,
          fb_page_id: igConn.fb_page_id,
          fb_page_name: igConn.fb_page_name,
          access_token: longLived.access_token,
          token_expires_at: expiresAt.toISOString(),
          status: "active",
          connected_by: user.id,
        },
        { onConflict: "company_id" },
      );

    if (insertErr) {
      console.error("[ig/callback] upsert error", insertErr);
      return NextResponse.redirect(
        new URL(
          "/configuracoes/instagram?ig_error=db_error",
          env.NEXT_PUBLIC_APP_URL,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        "/configuracoes/instagram?ig_success=1",
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  } catch (err) {
    console.error("[ig/callback] flow error", err);
    return NextResponse.redirect(
      new URL(
        `/configuracoes/instagram?ig_error=exchange_failed`,
        env.NEXT_PUBLIC_APP_URL,
      ),
    );
  }
}
