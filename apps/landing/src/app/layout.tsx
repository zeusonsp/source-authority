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

export const metadata: Metadata = {
  title: {
    default: "Source Authority — Saiba quem te encontra. Proteja sua marca.",
    template: "%s · Source Authority",
  },
  description:
    "Link-in-bio premium com tracking de origem e alertas de proteção de marca em tempo real. Plataforma SaaS B2B brasileira para empresas premium.",
  metadataBase: new URL("https://sourceauthority.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://sourceauthority.com.br",
    siteName: "Source Authority",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn(manrope.variable, "dark")}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
