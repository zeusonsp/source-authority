import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env-server";

/**
 * Anthropic Claude client — Innovation #1 (AI Plágio Narrativo).
 *
 * Lazy-init: feature só ativa quando ANTHROPIC_API_KEY está setado em env.
 * Quando ausente, getClient() retorna null — caller decide degradação.
 */

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });
  return cachedClient;
}

export function isAIAvailable(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export const AI_MODEL_ID = "claude-sonnet-4-5";
export const AI_MODEL_LABEL = "Claude Sonnet 4.5";

/**
 * Custo aproximado pra precificação interna (USD por 1M tokens).
 * Sonnet 4.5: $3 input / $15 output. Vision input: cobrado como image tokens
 * (~1.5k tokens por imagem 1024px).
 *
 * Pra UI mostrar custo estimado e tracking em ai_analyses.cost_micro_usd.
 */
export const PRICE_INPUT_PER_1M_USD = 3.0;
export const PRICE_OUTPUT_PER_1M_USD = 15.0;

export function estimateCostMicroUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  // micro_usd = USD * 1_000_000. Mas storage column int permite até ~2^31 = 2.1B.
  // Pra evitar overflow em usos grandes, armazenamos USD * 100_000 (precisão
  // 5 decimais — suficiente pra granularidade de centavo).
  const inputUsd = (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M_USD;
  const outputUsd = (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M_USD;
  return Math.round((inputUsd + outputUsd) * 100_000);
}
