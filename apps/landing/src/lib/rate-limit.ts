import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env-server";

/**
 * Rate limiter pro form /demo. 10 submissions / IP / 10 min — generoso
 * pra usuário real (não vai submeter mais que 1-2 vezes), apertado
 * suficiente pra estancar bot que passar do honeypot.
 *
 * Sliding window via Upstash Redis (REST API, edge-friendly). Quando
 * exceder, server action retorna 429 sem inserir nem notificar.
 *
 * Singleton intencional — Ratelimit + Redis client são leves, podem
 * ser instanciados uma vez por processo.
 */
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const demoLeadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  // Prefix isolado pra esse limiter — futuros limiters (pra outras
  // rotas) coexistem no mesmo Redis sem colisão.
  prefix: "rl:demo_lead",
  // Telemetry analytics no console do Upstash, opcional.
  analytics: true,
});

/**
 * Verifica se IP pode submeter. Retorna helpers do Upstash já consumidos
 * pelo caller (success bool + meta opcional pra header de retry).
 */
export async function checkDemoLeadRateLimit(identifier: string) {
  const result = await demoLeadRateLimit.limit(identifier);
  return result;
}
