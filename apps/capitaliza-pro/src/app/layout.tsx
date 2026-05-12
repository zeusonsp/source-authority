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

const SITE_NAME = "Capitaliza Pro";
const SITE_TITLE =
  "Capitaliza Pro — O primeiro título de capitalização auditado por blockchain do Brasil";
const SITE_DESCRIPTION =
  "Sorteios provably fair, pagamento PIX, prêmios via WhatsApp. Capitalização tecnológica regulada pela SUSEP.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s · Capitaliza Pro",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "capitalização",
    "SUSEP",
    "sorteio",
    "blockchain",
    "PIX",
    "provably fair",
    "Brasil",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn(manrope.variable)}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
