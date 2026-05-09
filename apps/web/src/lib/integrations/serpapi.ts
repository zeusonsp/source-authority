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

export type ReverseSearchEngine = "google" | "bing" | "yandex";

/**
 * Multi-engine reverse image search.
 *
 * Engines suportados:
 *   - **Google** (`google_reverse_image`): cobre web inteira, mas Instagram
 *     mal indexado.
 *   - **Bing** (`bing_visual_search`): tradicionalmente melhor cobertura de
 *     redes sociais que o Google.
 *   - **Yandex** (`yandex_images`): excepcional pra encontrar visuals
 *     similares mesmo com cropping/edição (algoritmo deep learning forte).
 *
 * Pra MVP de detecção de plágio, fazer scan em todos 3 e mergir resultados
 * dá cobertura máxima sem aumentar muito o consumo (3 searches por scan).
 */
export async function reverseImageSearch(
  imageUrl: string,
  engine: ReverseSearchEngine = "google",
): Promise<SerpApiImageResult[]> {
  if (!env.SERPAPI_KEY) throw new Error("SERPAPI_KEY missing");

  const engineConfig = {
    google: { engine: "google_reverse_image", urlParam: "image_url" },
    bing: { engine: "bing_visual_search", urlParam: "image_url" },
    yandex: { engine: "yandex_images", urlParam: "url" },
  }[engine];

  const params = new URLSearchParams({
    engine: engineConfig.engine,
    [engineConfig.urlParam]: imageUrl,
    api_key: env.SERPAPI_KEY,
    no_cache: "false",
  });

  const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `serpapi ${engine}_reverse_image failed ${res.status}: ${await res.text()}`,
    );
  }

  const json = (await res.json()) as SerpApiResponse;
  if (json.error) {
    // "No results" é um caso normal pra alguns engines — não fatal.
    if (
      json.error.toLowerCase().includes("hasn't returned any results") ||
      json.error.toLowerCase().includes("no results found")
    ) {
      return [];
    }
    throw new Error(`serpapi ${engine} error: ${json.error}`);
  }

  // Diferentes engines retornam em diferentes campos.
  const all: SerpApiImageResult[] = [
    ...(json.image_results ?? []),
    ...(json.inline_images ?? []),
    ...(json.pages_with_matching_images ?? []),
    // Bing/Yandex podem retornar em outros campos — incluir defensivamente
    ...((json as Record<string, unknown>).visual_matches as
      | SerpApiImageResult[]
      | undefined ?? []),
    ...((json as Record<string, unknown>).related_searches as
      | SerpApiImageResult[]
      | undefined ?? []),
  ];

  const seen = new Set<string>();
  return all.filter((r) => {
    if (!r.link || seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}

/**
 * Multi-engine fan-out: chama Google + Bing + Yandex em paralelo e
 * combina os resultados deduplicados.
 *
 * Útil pra "buscar reposts em qualquer lugar da internet" — cobertura
 * máxima trocando 3 SerpAPI searches por 1 chamada.
 */
export async function reverseImageSearchAllEngines(
  imageUrl: string,
): Promise<{
  results: SerpApiImageResult[];
  per_engine: Record<ReverseSearchEngine, number>;
  errors: Record<ReverseSearchEngine, string | null>;
}> {
  const engines: ReverseSearchEngine[] = ["google", "bing", "yandex"];

  const settled = await Promise.allSettled(
    engines.map((e) => reverseImageSearch(imageUrl, e)),
  );

  const all: SerpApiImageResult[] = [];
  const perEngine: Record<ReverseSearchEngine, number> = {
    google: 0,
    bing: 0,
    yandex: 0,
  };
  const errors: Record<ReverseSearchEngine, string | null> = {
    google: null,
    bing: null,
    yandex: null,
  };

  settled.forEach((result, idx) => {
    const engine = engines[idx]!;
    if (result.status === "fulfilled") {
      perEngine[engine] = result.value.length;
      all.push(...result.value);
    } else {
      errors[engine] =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
    }
  });

  // Dedupe global por link
  const seen = new Set<string>();
  const dedup = all.filter((r) => {
    if (!r.link || seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });

  return { results: dedup, per_engine: perEngine, errors };
}
