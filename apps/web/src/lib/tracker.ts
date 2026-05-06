/**
 * Tracker (Cloudflare Worker) — base URL e helper de link mestre.
 *
 * TODO: vira env var (NEXT_PUBLIC_TRACKER_BASE_URL) quando tivermos
 * staging/prod separados ou quando custom domain
 * (oficial.sourceauthority.com.br) substituir o subdomínio .workers.dev
 * (Fase 4+). Por agora hardcoded — Zeus dogfood = um worker, uma URL.
 */
export const TRACKER_BASE_URL =
  "https://source-authority-tracker.zeusonsp.workers.dev";

export function trackerUrl(slug: string): string {
  return `${TRACKER_BASE_URL}/${slug}`;
}
