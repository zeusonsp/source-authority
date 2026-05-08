import "server-only";

import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env-server";

/**
 * Auth helper para endpoints `/api/internal/*` chamados pelo workers/brand-monitor.
 *
 * Padrão Bearer com shared secret em `INTERNAL_NOTIFICATIONS_SECRET`. Comparação
 * via `timingSafeEqual` pra evitar timing attacks no header (bordas teóricas
 * porque o secret tem 64 hex chars = ~256 bits, mas é boa prática).
 *
 * NÃO usar pra rotas de usuário — só worker→app. Usuário usa o middleware
 * Supabase Auth normal.
 */
export function isInternalRequestAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization");
  if (!header) return false;

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const token = header.slice(prefix.length);

  // Buffers precisam de mesmo tamanho. Mismatched length é unauthorized
  // sem chamar timingSafeEqual (que joga erro em diff length).
  const a = Buffer.from(token);
  const b = Buffer.from(env.INTERNAL_NOTIFICATIONS_SECRET);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
