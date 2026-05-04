import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handler do callback de e-mail confirmation (e futuramente OAuth).
 *
 * Supabase envia o usuário pra esta rota com `?code=<pkce_code>` após
 * confirmar e-mail. Trocamos o code pela session (cookies) e redirecionamos.
 *
 * Validamos `next` como caminho relativo pra evitar open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  // Open redirect prevention: aceita só caminhos relativos sem `//` (protocol-relative).
  const next =
    typeof nextParam === "string" &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`,
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=callback_failed`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
