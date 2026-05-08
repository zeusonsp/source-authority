import { ImageResponse } from "next/og";

/**
 * Render compartilhado entre `app/opengraph-image.tsx` e
 * `app/twitter-image.tsx`. Mesmo asset visual (1200x630 dark/dourado).
 *
 * Cada arquivo metadata precisa ter SEU próprio `runtime = "edge"`
 * + `alt`, `size`, `contentType` exports — Next 14 lê esses por arquivo
 * e re-export entre eles confunde o build (TypeError: Invalid URL no
 * @vercel/og fileURLToPath durante prerender Node).
 */
export const ogImageSize = { width: 1200, height: 630 } as const;
export const ogImageAlt =
  "Source Authority — Saiba quem te encontra. Proteja sua marca.";
export const ogImageContentType = "image/png";

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at center top, #1a1612 0%, #0A0A0A 60%)",
          color: "#FAFAFA",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        {/* Badge sutil no topo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 18px",
            border: "1px solid rgba(201, 169, 75, 0.3)",
            background: "rgba(201, 169, 75, 0.05)",
            borderRadius: "9999px",
            color: "#C9A94B",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#C9A94B",
            }}
          />
          Beta privado
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 90,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            marginBottom: 30,
          }}
        >
          <span>Source</span>
          <span style={{ color: "#C9A94B" }}>.</span>
          <span>Authority</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex" }}>Saiba quem te encontra.</div>
          <div style={{ display: "flex", color: "#C9A94B", marginTop: 8 }}>
            Proteja sua marca.
          </div>
        </div>

        {/* Footer hint */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            display: "flex",
            color: "#666",
            fontSize: 22,
            letterSpacing: "0.05em",
          }}
        >
          sourceauthority.com.br
        </div>
      </div>
    ),
    {
      ...ogImageSize,
    },
  );
}
