import type { MetadataRoute } from "next";

/**
 * Sitemap dinâmico (Next 14 — `app/sitemap.ts` gera /sitemap.xml).
 *
 * Páginas estáticas com lastModified = build time (Date.now). As páginas
 * de Legal (/termos, /privacidade, /lgpd) entram só no Lote C; até lá
 * ficam fora do sitemap pra não retornar 404 pra crawlers.
 */
const BASE = "https://sourceauthority.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
