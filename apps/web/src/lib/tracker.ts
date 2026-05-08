/**
 * Tracker (Cloudflare Worker) — base URL e helper de link mestre.
 *
 * Lê de NEXT_PUBLIC_TRACKER_BASE_URL (público, ok client). Fallback
 * pro subdomínio `.workers.dev` mantém compat com setup atual de
 * dogfood. Quando custom domain `go.sourceauthority.com.br` for
 * configurado (CF Workers route), bastará mudar o env var sem code.
 */
const FALLBACK_TRACKER_URL =
  "https://source-authority-tracker.zeusonsp.workers.dev";

export const TRACKER_BASE_URL =
  (process.env.NEXT_PUBLIC_TRACKER_BASE_URL ?? FALLBACK_TRACKER_URL).replace(
    /\/+$/,
    "",
  );

export function trackerUrl(slug: string): string {
  return `${TRACKER_BASE_URL}/${slug}`;
}
