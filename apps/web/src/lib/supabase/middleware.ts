import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@source-authority/shared/database.types";
import { env } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Caminhos públicos exatos. Tudo que não casa aqui (e não cai num prefixo
 * público) é considerado protegido — exige usuário autenticado.
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
]);

const PUBLIC_PREFIXES = [
  "/auth/",
  "/_next/",
  "/favicon",
  // Webhook do Stripe — chamado pelo Stripe sem cookies; auth via signature
  // verify dentro do route handler (constructEvent).
  "/api/billing/stripe/webhook",
  // Endpoints internal — chamados pelos workers (CF) com Bearer secret;
  // auth via INTERNAL_NOTIFICATIONS_SECRET dentro do route handler.
  "/api/internal/",
];

/**
 * Caminhos onde um usuário JÁ logado deve ser empurrado pra /dashboard
 * (ou pro `next` original) — não faz sentido ele ver login/signup.
 */
const REDIRECT_AWAY_FROM_IF_LOGGED = new Set<string>(["/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Helper de middleware que (1) refresca a sessão Supabase e (2) aplica
 * regras de redirect baseadas no estado de auth.
 *
 * Rodando no Edge Runtime.
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

  // CRÍTICO: getUser logo após createServerClient. Não inserir lógica entre
  // os dois — pode invalidar a sessão silenciosamente.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Logado em /login ou /signup → /dashboard
  if (user && REDIRECT_AWAY_FROM_IF_LOGGED.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Não-logado em rota protegida → /login?next=<rota_original>
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
