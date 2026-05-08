import "server-only";

/**
 * Instagram Graph API client — Pillar 2 V2.1 (hashtag scanning).
 *
 * Operações suportadas:
 *   - resolveHashtagId: hashtag string → numeric ig_hashtag_id (cacheado).
 *   - fetchHashtagRecentMedia: top recent posts numa hashtag.
 *
 * IG Graph API spec:
 *   - hashtag search:  /ig_hashtag_search?user_id={igUser}&q={hashtag}
 *   - recent media:    /{hashtagId}/recent_media?user_id={igUser}&fields=...
 *
 * Rate limits: 30 hashtags monitored / company / 7 days. Worker respeita
 * isso no schema (max 30 watches per company).
 */

// Hashtag Search SÓ funciona em graph.facebook.com (Facebook Graph API
// for Instagram), NÃO em graph.instagram.com (Instagram Direct API).
// Usamos page_access_token obtido via Facebook Login flow.
const IG_GRAPH_BASE = "https://graph.facebook.com/v22.0";

export interface InstagramHashtagSearchResponse {
  data: { id: string }[];
}

export interface InstagramHashtagMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username?: string;
}

export interface InstagramHashtagMediaResponse {
  data: InstagramHashtagMediaItem[];
  paging?: { cursors?: { before?: string; after?: string } };
}

/**
 * Resolve hashtag string → ig_hashtag_id. Cacheado em DB depois (cursor pattern).
 *
 * @param hashtag SEM o "#" prefix. Ex: "zeus", "leds"
 */
export async function resolveHashtagId(
  hashtag: string,
  igUserId: string,
  accessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    user_id: igUserId,
    q: hashtag,
    access_token: accessToken,
  });
  const url = `${IG_GRAPH_BASE}/ig_hashtag_search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ig_hashtag_search ${res.status}: ${body}`);
  }
  const json = (await res.json()) as InstagramHashtagSearchResponse;
  return json.data[0]?.id ?? null;
}

/**
 * Pega os recent posts numa hashtag.
 * Default fields incluem media_url+thumbnail pra dHash.
 */
export async function fetchHashtagRecentMedia(
  hashtagId: string,
  igUserId: string,
  accessToken: string,
  limit = 50,
): Promise<InstagramHashtagMediaResponse> {
  const params = new URLSearchParams({
    user_id: igUserId,
    fields:
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username",
    limit: String(limit),
    access_token: accessToken,
  });
  const url = `${IG_GRAPH_BASE}/${hashtagId}/recent_media?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`recent_media ${res.status}: ${body}`);
  }
  return (await res.json()) as InstagramHashtagMediaResponse;
}

/**
 * Download de mídia (imagem ou thumbnail de vídeo) com cap de 8MB.
 * Instagram CDN exige Referer pra evitar 403 em alguns hosts.
 */
const MAX_FETCH_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

export async function downloadMediaBuffer(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Referer: "https://www.instagram.com/",
        "User-Agent":
          "Mozilla/5.0 (compatible; SourceAuthorityBot/1.0; +https://sourceauthority.com.br)",
      },
    });
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FETCH_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pega thumbnail apropriada por media_type.
 * Reels/Vídeos têm thumbnail_url; imagens têm media_url direto.
 */
export function pickThumbnailUrl(
  item: InstagramHashtagMediaItem,
): string | null {
  if (item.media_type === "VIDEO") return item.thumbnail_url ?? null;
  // IMAGE | CAROUSEL_ALBUM → media_url (carousel pega a primeira)
  return item.media_url ?? item.thumbnail_url ?? null;
}
