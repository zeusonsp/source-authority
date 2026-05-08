import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramUser,
  isInstagramConfigured,
} from "@/lib/integrations/instagram";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * GET /api/integrations/instagram/callback?code=X&state=Y
 *
 * Recebe redirect do Instagram Direct OAuth. Faz:
 *   1. Verifica CSRF state (cookie httpOnly)
 *   2. Troca code → short-lived token (1h)
 *   3. Troca short → long-lived (60d)
 *   4. Pega user info via /me (id, username, account_type)
 *   5. UPSERT instagram_connections
 *   6. Redireciona pra /configuracoes/instagram com flash
 *
 * Diferente do flow Facebook Login → não há listagem de Pages.
 * Conta IG Business autoriza diretamente, simplificando o callback.
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

  // User cancelou no Instagram ou erro upstream.
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
    const shortLived = await exchangeCodeForToken(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const igUser = await getInstagramUser(longLived.access_token);

    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
    const { error: insertErr } = await supabase
      .from("instagram_connections")
      .upsert(
        {
          company_id: m.company_id,
          ig_user_id: igUser.id,
          ig_username: igUser.username,
          // fb_page_id/fb_page_name ficam null no Instagram Direct flow
          // (não há Page intermediária).
          fb_page_id: null,
          fb_page_name: null,
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
