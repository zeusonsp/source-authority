import "server-only";

import { env } from "@/lib/env-server";

/**
 * Facebook Login → Instagram Business OAuth — Innovation #2 V2 (Plano A retomado).
 *
 * Voltamos do Instagram Direct OAuth (api.instagram.com) pro flow tradicional
 * Facebook Login porque o flow direto NÃO inclui permissão `ig_hashtag_search`,
 * que é o pilar do Pillar 2 V2.1 (varredura de hashtags).
 *
 * Fluxo:
 *  1. Authorize: facebook.com/v{ver}/dialog/oauth?client_id=META_APP_ID&...
 *     scopes: pages_show_list, pages_read_engagement, instagram_basic,
 *             business_management
 *  2. Code → short-lived user token (1h) via graph.facebook.com/oauth/access_token
 *  3. Short-lived → long-lived user token (60d) via fb_exchange_token grant
 *  4. List user's Pages: GET /me/accounts (returns pages + page tokens)
 *  5. Pra cada page: GET /{page-id}?fields=instagram_business_account
 *  6. Quando achar instagram_business_account, persistir:
 *     ig_user_id, ig_username, fb_page_id, fb_page_name, page_access_token
 *
 * Page access token é usado em chamadas Instagram Graph API
 * (graph.facebook.com/{ig-user-id}/...) — incluindo ig_hashtag_search.
 */

const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";
const META_OAUTH_DIALOG = "https://www.facebook.com/v22.0/dialog/oauth";

// Permissões pra IG Business via Facebook Login. As 4 abaixo são a combinação
// padrão pra hashtag search + reading IG content por Page.
export const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "business_management",
] as const;

export function isInstagramConfigured(): boolean {
  return Boolean(env.META_APP_ID && env.META_APP_SECRET);
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  if (!env.META_APP_ID) throw new Error("META_APP_ID não configurado");
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  // Facebook Login for Business: usar config_id em vez de scope= quando
  // disponível (mais robusto, menos prone a "scope_invalid"). Configurações
  // pré-criadas no Meta dashboard com permissões aprovadas.
  if (env.META_LOGIN_CONFIG_ID) {
    params.set("config_id", env.META_LOGIN_CONFIG_ID);
  } else {
    params.set("scope", REQUIRED_SCOPES.join(","));
  }
  return `${META_OAUTH_DIALOG}?${params.toString()}`;
}

/** Step 1: code → short-lived user token (1 hora). */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; token_type?: string; expires_in?: number }> {
  if (!env.META_APP_ID || !env.META_APP_SECRET)
    throw new Error("Meta credentials missing");
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`exchangeCode failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Step 2: short-lived → long-lived user token (~60 days). */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  if (!env.META_APP_ID || !env.META_APP_SECRET)
    throw new Error("Meta credentials missing");
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`long-lived exchange failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface FbPage {
  id: string;
  name: string;
  access_token: string;
}

/** GET /me/accounts — lista Pages do user com page-level access tokens. */
export async function listUserPages(
  userAccessToken: string,
): Promise<FbPage[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token",
    access_token: userAccessToken,
  });
  const res = await fetch(`${META_GRAPH_BASE}/me/accounts?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`me/accounts ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: FbPage[] };
  return json.data ?? [];
}

/**
 * GET /{page-id}?fields=instagram_business_account{id,username}
 * Retorna IG business account ligado à page (ou null se page não tem).
 */
export async function getInstagramAccountForPage(
  pageId: string,
  pageAccessToken: string,
): Promise<{ ig_user_id: string; username: string } | null> {
  const params = new URLSearchParams({
    fields: "instagram_business_account{id,username}",
    access_token: pageAccessToken,
  });
  const res = await fetch(`${META_GRAPH_BASE}/${pageId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`page lookup ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    instagram_business_account?: { id: string; username: string };
  };
  if (!json.instagram_business_account) return null;
  return {
    ig_user_id: json.instagram_business_account.id,
    username: json.instagram_business_account.username,
  };
}
