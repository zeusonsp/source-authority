import "server-only";

import { env } from "@/lib/env-server";

/**
 * Instagram Graph API — OAuth flow + helpers.
 *
 * Fluxo:
 *  1. User click "Conectar Instagram" em /configuracoes/instagram
 *  2. Redirecionamos pra Facebook OAuth com escopos pra Instagram Business
 *  3. Facebook redireciona pra /api/integrations/instagram/callback?code=X
 *  4. Server troca `code` por short-lived access_token (1h)
 *  5. Troca short-lived por long-lived (60 dias)
 *  6. Lista pages, encontra Instagram Business Account ligada
 *  7. INSERT instagram_connections
 *
 * Endpoints Graph API: usamos v22.0 (latest stable em 2026).
 */

export const META_OAUTH_BASE = "https://www.facebook.com/v22.0/dialog/oauth";
export const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";

// Scopes mínimos pra Instagram Business + Pages connection.
export const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
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
    scope: REQUIRED_SCOPES.join(","),
    state,
  });
  return `${META_OAUTH_BASE}?${params.toString()}`;
}

/** Step 4: trade authorization code → short-lived access_token (1h). */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
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
    const text = await res.text();
    throw new Error(`exchange code failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Step 5: short-lived → long-lived (60 days). */
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
    const text = await res.text();
    throw new Error(`long-lived exchange failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Step 6a: lista pages do user logado. */
export async function listUserPages(accessToken: string): Promise<
  Array<{ id: string; name: string; access_token: string }>
> {
  const res = await fetch(
    `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`listUserPages ${res.status}`);
  const data = (await res.json()) as {
    data: Array<{ id: string; name: string; access_token: string }>;
  };
  return data.data ?? [];
}

/** Step 6b: pra cada page, busca Instagram Business Account ligada. */
export async function getInstagramAccountForPage(
  pageId: string,
  pageAccessToken: string,
): Promise<{ ig_user_id: string; username: string } | null> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageAccessToken}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    instagram_business_account?: { id: string; username: string };
  };
  if (!data.instagram_business_account) return null;
  return {
    ig_user_id: data.instagram_business_account.id,
    username: data.instagram_business_account.username,
  };
}

/** Resolve hashtag string → IG hashtag_id (cacheable). */
export async function resolveHashtagId(
  hashtag: string,
  igUserId: string,
  accessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    user_id: igUserId,
    q: hashtag.replace(/^#/, ""),
    access_token: accessToken,
  });
  const res = await fetch(
    `${META_GRAPH_BASE}/ig_hashtag_search?${params.toString()}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return data.data?.[0]?.id ?? null;
}

/** Top media for hashtag — usado pelo worker scanner. */
export async function getTopMediaForHashtag(
  hashtagId: string,
  igUserId: string,
  accessToken: string,
  limit = 50,
): Promise<Array<{
  id: string;
  caption?: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
  username?: string;
}>> {
  const params = new URLSearchParams({
    user_id: igUserId,
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username",
    limit: String(limit),
    access_token: accessToken,
  });
  const res = await fetch(
    `${META_GRAPH_BASE}/${hashtagId}/top_media?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`getTopMedia ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { data: Array<Record<string, unknown>> };
  return (data.data ?? []) as Array<{
    id: string;
    caption?: string;
    media_url?: string;
    permalink: string;
    timestamp: string;
    username?: string;
  }>;
}
