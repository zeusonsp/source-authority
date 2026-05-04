import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@source-authority/shared/database.types";
import { env } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Helper de middleware que refresca a sessão Supabase a cada request.
 *
 * Pattern oficial de @supabase/ssr — sem este passo, tokens de acesso
 * expiram silenciosamente em Server Components e o usuário aparece como
 * deslogado mesmo tendo cookies válidos.
 *
 * Roda no Edge Runtime.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRÍTICO: chamar getUser imediatamente após createServerClient. Inserir
  // qualquer lógica entre os dois pode invalidar a sessão silenciosamente.
  // Ver: https://supabase.com/docs/guides/auth/server-side/nextjs
  await supabase.auth.getUser();

  return supabaseResponse;
}
