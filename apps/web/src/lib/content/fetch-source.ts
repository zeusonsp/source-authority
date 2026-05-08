import "server-only";

/**
 * Source URL resolver: dado uma URL de post (Instagram/TikTok/YouTube/etc),
 * retorna metadata + thumbnail buffer.
 *
 * Strategies por platform:
 *   - **TikTok**: oEmbed público (https://www.tiktok.com/oembed?url=X) → JSON
 *     com thumbnail_url. Sem auth, rate-limited mas suficiente.
 *   - **Instagram**: scrape `<meta property="og:image">` da página pública.
 *     Requer User-Agent realista. Posts privados retornam página de login.
 *   - **YouTube**: noembed.com ou img.youtube.com/vi/{ID}/maxresdefault.jpg —
 *     mais robusto que oEmbed (que pode estar deprecated).
 *   - **Web genérico**: og:image scrape.
 *
 * Cap de 8MB no download da thumbnail pra prevenir abuse.
 */

const MAX_FETCH_BYTES = 8 * 1024 * 1024; // 8MB
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; SourceAuthorityBot/1.0; +https://sourceauthority.com.br)";

export type SourceMetadata = {
  platform:
    | "instagram"
    | "tiktok"
    | "youtube"
    | "reels"
    | "shorts"
    | "web"
    | "upload";
  external_id: string | null;
  thumbnail_url: string | null;
  title: string | null;
  duration_seconds: number | null;
};

export type SourceFetchResult =
  | {
      ok: true;
      metadata: SourceMetadata;
      thumbnail: Buffer;
    }
  | {
      ok: false;
      reason: "invalid_url" | "platform_unsupported" | "fetch_failed" | "no_thumbnail" | "private_post";
      detail?: string;
    };

export function detectPlatform(url: string): SourceMetadata["platform"] {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      if (u.pathname.includes("/reel/")) return "reels";
      return "instagram";
    }
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      return "tiktok";
    }
    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
      if (u.pathname.includes("/shorts/")) return "shorts";
      return "youtube";
    }
    return "web";
  } catch {
    return "web";
  }
}

export function parseExternalId(
  platform: SourceMetadata["platform"],
  url: string,
): string | null {
  try {
    const u = new URL(url);
    if (platform === "instagram" || platform === "reels") {
      // /p/ABC123/ or /reel/ABC123/
      const m = u.pathname.match(/\/(?:p|reel|tv)\/([^/?]+)/);
      return m?.[1] ?? null;
    }
    if (platform === "tiktok") {
      // /@user/video/12345 — id é o número final
      const m = u.pathname.match(/\/video\/(\d+)/);
      return m?.[1] ?? null;
    }
    if (platform === "youtube" || platform === "shorts") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const path = u.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/);
      if (path) return path[1] ?? null;
      // youtu.be/VIDEOID
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadCapped(url: string): Promise<Buffer> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`download ${res.status}: ${res.statusText}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no response body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_FETCH_BYTES) {
        reader.cancel();
        throw new Error(`download exceeded ${MAX_FETCH_BYTES} bytes`);
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

/** Scrape og:image / og:title / og:description de HTML público. */
async function fetchOpenGraph(url: string): Promise<{
  title: string | null;
  thumbnail_url: string | null;
}> {
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`og fetch ${res.status}`);
  }
  // Cap HTML size pra evitar abuse.
  const text = (await res.text()).slice(0, 500_000);

  const ogImage = text.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
  );
  const ogTitle = text.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
  );

  return {
    title: ogTitle?.[1] ?? null,
    thumbnail_url: ogImage?.[1] ?? null,
  };
}

/** TikTok oEmbed. */
async function fetchTikTokOEmbed(url: string): Promise<{
  title: string | null;
  thumbnail_url: string | null;
}> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(oembedUrl, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`tiktok oembed ${res.status}`);
  const json = (await res.json()) as {
    title?: string;
    thumbnail_url?: string;
  };
  return {
    title: json.title ?? null,
    thumbnail_url: json.thumbnail_url ?? null,
  };
}

/** YouTube — usa img.youtube.com (mais confiável que oEmbed). */
function youtubeThumbnail(videoId: string): string {
  // maxresdefault às vezes 404 pra videos antigos; hqdefault sempre existe.
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchSource(url: string): Promise<SourceFetchResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return { ok: false, reason: "invalid_url" };
  }

  const platform = detectPlatform(url);
  const external_id = parseExternalId(platform, url);

  let title: string | null = null;
  let thumbnail_url: string | null = null;

  try {
    if (platform === "tiktok") {
      const r = await fetchTikTokOEmbed(url);
      title = r.title;
      thumbnail_url = r.thumbnail_url;
    } else if (platform === "youtube" || platform === "shorts") {
      if (external_id) {
        thumbnail_url = youtubeThumbnail(external_id);
        // Title best-effort via og scrape (oembed pode ser bloqueado).
        try {
          const og = await fetchOpenGraph(url);
          title = og.title;
        } catch {
          /* ignore */
        }
      }
    } else {
      // Instagram, reels, web genérico — og:image scrape.
      const og = await fetchOpenGraph(url);
      title = og.title;
      thumbnail_url = og.thumbnail_url;

      // Instagram retorna página "Login required" pra posts privados.
      if (
        (platform === "instagram" || platform === "reels") &&
        title?.toLowerCase().includes("login")
      ) {
        return { ok: false, reason: "private_post" };
      }
    }
  } catch (err) {
    return {
      ok: false,
      reason: "fetch_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!thumbnail_url) {
    return { ok: false, reason: "no_thumbnail" };
  }

  let thumbnail: Buffer;
  try {
    thumbnail = await downloadCapped(thumbnail_url);
  } catch (err) {
    return {
      ok: false,
      reason: "fetch_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    ok: true,
    metadata: {
      platform,
      external_id,
      thumbnail_url,
      title: title ? title.slice(0, 200) : null,
      duration_seconds: null,
    },
    thumbnail,
  };
}
