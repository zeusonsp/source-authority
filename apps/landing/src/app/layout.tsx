import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "700", "800"],
});

const SITE_URL = "https://sourceauthority.com.br";
const SITE_NAME = "Source Authority";
const SITE_TITLE_DEFAULT =
  "Source Authority — Saiba quem te encontra. Proteja sua marca.";
const SITE_DESCRIPTION =
  "Link-in-bio premium com tracking de origem e alertas de proteção de marca em tempo real. Plataforma SaaS B2B brasileira para empresas premium.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: "%s · Source Authority",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Zeus Tecnologia" }],
  generator: "Next.js",
  keywords: [
    "link-in-bio",
    "tracking",
    "atribuição",
    "proteção de marca",
    "domain monitoring",
    "SaaS B2B",
    "Brasil",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    // Next 14 colocated `opengraph-image.tsx` provides og:image
    // automaticamente. Não precisa setar `images:` aqui — duplicaria.
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    // Same — `twitter-image.tsx` colocado é detectado pelo Next.
  },
};

/**
 * Schema.org structured data — Organization + SoftwareApplication.
 * Renderizado como JSON-LD dentro do <head> via injeção em <script>.
 *
 * Ajuda crawlers (Google, Bing) a entender natureza do produto e
 * indexar com rich-results / knowledge panel.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description:
        "Plataforma SaaS B2B brasileira de proteção de marca e atribuição de tracking pra empresas premium.",
      foundingDate: "2026",
      areaServed: "BR",
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: "97.00",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn(manrope.variable, "dark")}>
      <head>
        <script
          type="application/ld+json"
          // structured data is non-user input, JSON.stringify already
          // escapes safely — dangerouslySetInnerHTML é o pattern Next
          // pra JSON-LD em RSC.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(STRUCTURED_DATA),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
