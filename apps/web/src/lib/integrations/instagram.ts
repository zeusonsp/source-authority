import "server-only";

import { env } from "@/lib/env-server";

/**
 * Instagram Direct OAuth — Innovation #2 (Plano B).
 *
 * Trocamos Facebook Login for Business (que tinha problemas crônicos de
 * domain whitelist) pelo Instagram Direct OAuth via api.instagram.com.
 *
 * Benefícios:
 *   - Não exige app_domains complicado nem Valid OAuth Redirect URIs
 *     no produto Facebook Login (que nem está instalado neste app).
 *   - App ID separado (INSTAGRAM_APP_ID) com seu próprio Secret.
 *   - Usuário autoriza diretamente conta IG Business — sem Facebook Page
 *     intermediária na descoberta inicial.
 *
 * Trade-off: Hashtag Search API ainda precisa do flow FB→Page→IG
 * eventualmente. Pra V2.1 (worker scanner de hashtags) talvez precisemos
 * combinar os 2 flows. Por ora, conexão básica + descoberta funcionam.
 *
 * Endpoints (Instagram Graph API com Instagram Login):
 *   - Auth dialog:  https://www.instagram.com/oauth/authorize
 *   - Token short:  https://api.instagram.com/oauth/access_token
 *   - Token long:   https://graph.instagram.com/access_token
 *   - API base:     https://graph.instagram.com/v22.0
 */

export const IG_AUTH_URL = "https://www.instagram.com/oauth/authorize";
export const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
export const IG_LONG_LIVED_URL =
  "https://graph.instagram.com/access_token";
export const IG_GRAPH_BASE = "https://graph.instagram.com/v22.0";

// Permissões via Instagram OAuth direto (formato diferente do Facebook).
export const IG_REQUIRED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
] as const;

export function isInstagramConfigured(): boolean {
  return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET);
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  if (!env.INSTAGRAM_APP_ID)
    throw new Error("INSTAGRAM_APP_ID não configurado");
  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: env.INSTAGRAM_APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: IG_REQUIRED_SCOPES.join(","),
    state,
  });
  return `${IG_AUTH_URL}?${params.toString()}`;
}

/** Step 1: code → short-lived token (1 hora). */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; user_id: number; permissions?: string }> {
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET)
    throw new Error("Instagram credentials missing");
  const body = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID,
    client_secret: env.INSTAGRAM_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(IG_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exchangeCode failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Step 2: short-lived → long-lived (60 days). */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  if (!env.INSTAGRAM_APP_SECRET)
    throw new Error("INSTAGRAM_APP_SECRET missing");
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: env.INSTAGRAM_APP_SECRET,
    access_token: shortLivedToken,
  });
  const res = await fetch(`${IG_LONG_LIVED_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`long-lived exchange failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Get user info: username + business account info. */
export async function getInstagramUser(
  accessToken: string,
): Promise<{
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
}> {
  const params = new URLSearchParams({
    fields: "id,username,account_type,media_count",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_BASE}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`getInstagramUser ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
