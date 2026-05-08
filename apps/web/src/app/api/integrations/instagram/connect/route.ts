import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  isInstagramConfigured,
} from "@/lib/integrations/instagram";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * GET /api/integrations/instagram/connect
 *
 * Inicia OAuth flow. Gera state aleatório (CSRF token), guarda em cookie
 * httpOnly, redireciona pra Facebook OAuth. Callback verifica state.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      { error: "Instagram integration not configured" },
      { status: 503 },
    );
  }

  // Auth: precisa estar logado.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL));
  }

  // CSRF state token.
  const state = randomBytes(32).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/",
  });

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`;
  const url = buildAuthorizeUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
