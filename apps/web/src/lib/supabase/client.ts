import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@source-authority/shared/database.types";
import { env } from "@/lib/env";

/**
 * Supabase client para uso em Client Components ("use client").
 * Atua como o usuário autenticado (sujeito às RLS policies).
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
