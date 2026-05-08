import type { MetadataRoute } from "next";

/**
 * Sitemap dinâmico (Next 14 — `app/sitemap.ts` gera /sitemap.xml).
 *
 * Páginas estáticas com lastModified = build time (Date.now).
 * Inclui as 3 páginas de Legal (Lote C) — texto raramente muda,
 * priority baixa.
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
    {
      url: `${BASE}/termos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE}/lgpd`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
