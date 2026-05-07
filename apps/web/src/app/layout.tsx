import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { env } from "@/lib/env";
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
    default: "Source Authority",
    template: "%s · Source Authority",
  },
  description:
    "Plataforma SaaS B2B brasileira de proteção de marca e atribuição de tracking para empresas premium.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn(manrope.variable, "dark")}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
