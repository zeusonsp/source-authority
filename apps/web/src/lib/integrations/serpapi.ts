import "server-only";

import { env } from "@/lib/env-server";

/**
 * SerpAPI Google Reverse Image client — Pillar 2 V2.2 (proactive scan).
 *
 * Endpoint: https://serpapi.com/search?engine=google_reverse_image&image_url=...
 *
 * Recebe URL de imagem pública, retorna lista de páginas onde Google
 * indexou imagem visualmente similar. Cobre web inteira (sites, blogs,
 * IG, TikTok, YouTube se Google indexou).
 *
 * Quotas:
 *   - Free trial: 250 searches/mês
 *   - Developer: $50/mês = 5,000 searches
 *   - Production: $250/mês = 30,000 searches
 *
 * Pra MVP, cron 12h × 1 conteúdo = 60 searches/mês por conteúdo.
 * Cap em 30 conteúdos/empresa pra ficar dentro de 1,800 searches/empresa
 * (suficiente pra plano Developer com folga).
 */

export interface SerpApiImageResult {
  position?: number;
  title?: string;
  link: string;
  source?: string;
  snippet?: string;
  thumbnail?: string;
}

export interface SerpApiResponse {
  search_metadata?: { id?: string; status?: string };
  search_parameters?: { image_url?: string };
  image_results?: SerpApiImageResult[];
  inline_images?: SerpApiImageResult[];
  pages_with_matching_images?: SerpApiImageResult[];
  error?: string;
}

export function isSerpApiConfigured(): boolean {
  return Boolean(env.SERPAPI_KEY);
}

/**
 * Google Reverse Image Search.
 *
 * SerpAPI normaliza Google's reverse image em 3 listas potenciais:
 *   - image_results (default top results)
 *   - inline_images (inline carousel)
 *   - pages_with_matching_images (matching images section)
 *
 * Concatenamos as 3 e dedupemos por URL pra cobrir tudo.
 */
export async function reverseImageSearch(
  imageUrl: string,
): Promise<SerpApiImageResult[]> {
  if (!env.SERPAPI_KEY) throw new Error("SERPAPI_KEY missing");

  const params = new URLSearchParams({
    engine: "google_reverse_image",
    image_url: imageUrl,
    api_key: env.SERPAPI_KEY,
    no_cache: "false", // SerpAPI cache de 1h é OK pra reduzir custos
  });

  const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `serpapi reverse_image failed ${res.status}: ${await res.text()}`,
    );
  }

  const json = (await res.json()) as SerpApiResponse;
  if (json.error) {
    throw new Error(`serpapi error: ${json.error}`);
  }

  const all: SerpApiImageResult[] = [
    ...(json.image_results ?? []),
    ...(json.inline_images ?? []),
    ...(json.pages_with_matching_images ?? []),
  ];

  // Dedupe por link
  const seen = new Set<string>();
  return all.filter((r) => {
    if (!r.link || seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}
