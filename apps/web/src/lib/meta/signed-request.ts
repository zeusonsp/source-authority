import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica e decodifica `signed_request` do Meta.
 *
 * Formato (por especificação Meta):
 *   <encoded_sig>.<encoded_payload>
 *
 * Ambos em base64url (sem padding `=`). Validação:
 *   1. Split na primeira '.'
 *   2. base64url-decode payload → JSON
 *   3. base64url-decode sig (raw bytes)
 *   4. HMAC-SHA256(payload_string, app_secret) → bytes esperados
 *   5. timingSafeEqual entre sig e bytes esperados
 *   6. payload.algorithm DEVE ser 'HMAC-SHA256'
 *
 * Usado em ambos os callbacks Meta (deauthorize + data-deletion).
 *
 * Retorna null em qualquer falha (assinatura inválida, payload corrompido,
 * algoritmo errado). NUNCA throw — callers tratam null como "request não
 * autenticada, retornar 400".
 */
export function verifyMetaSignedRequest(
  body: string,
  appSecret: string,
): { user_id: string; issued_at: number } | null {
  if (!body || !appSecret) return null;

  const dot = body.indexOf(".");
  if (dot < 0) return null;

  const encodedSig = body.slice(0, dot);
  const encodedPayload = body.slice(dot + 1);
  if (!encodedSig || !encodedPayload) return null;

  let sig: Buffer;
  let payloadJson: string;
  try {
    sig = base64UrlDecode(encodedSig);
    payloadJson = base64UrlDecode(encodedPayload).toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(sig, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.algorithm !== "HMAC-SHA256") return null;

  const userId = parsed.user_id;
  const issuedAt = parsed.issued_at;
  if (typeof userId !== "string" || userId.length === 0) return null;
  if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) return null;

  return { user_id: userId, issued_at: issuedAt };
}

/**
 * Code de confirmação determinístico = primeiros 16 chars do sha256(user_id).
 *
 * Determinístico = idempotente: Meta pode reenviar a mesma request e
 * resolvemos pra mesmo code. Curto o suficiente pra path param amigável,
 * longo o suficiente pra evitar colisão prática (16 chars hex = 64 bits).
 */
export function metaConfirmationCode(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
  return Buffer.from(padded, "base64");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
