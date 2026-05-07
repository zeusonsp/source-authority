import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@source-authority/shared/database.types";
import { env } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client para Server Components, Route Handlers e Server Actions.
 *
 * Usa cookies da request para manter sessão. Atua como o usuário autenticado
 * (sujeito a RLS). Para operações que precisam ignorar RLS (jobs, admin),
 * crie um client separado com SUPABASE_SERVICE_ROLE_KEY (ainda não exposto
 * aqui — adicionar quando necessário em outro arquivo server-only).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem setar cookies. O middleware
            // (apps/web/src/middleware.ts) faz o refresh em cada request,
            // então essa exceção é segura ignorar aqui.
          }
        },
      },
    },
  );
}
