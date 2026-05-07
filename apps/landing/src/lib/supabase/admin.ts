import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@source-authority/shared/database.types";
import { env } from "@/lib/env-server";

/**
 * Supabase admin client com SERVICE_ROLE — bypassa RLS.
 *
 * Uso exclusivo em server actions / route handlers do apps/landing
 * que precisam escrever em tabelas append-only (demo_leads). Lead
 * é anônimo (não há sessão de usuário pra propagar via SSR cookies),
 * por isso não usamos `@supabase/ssr` aqui.
 *
 * Singleton intencional — múltiplas server actions reutilizam o
 * mesmo client em dev/prod (Next 14 mantém server modules quentes).
 */
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
