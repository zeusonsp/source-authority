import type { ReactNode } from "react";

/**
 * Layout das páginas legais (/termos, /privacidade, /lgpd).
 *
 * Container estreito, prose styling pra texto longo. Compartilha
 * Header/Footer do RootLayout via Next 14 nested layouts.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container mx-auto px-6 py-16 md:py-24">
      <div className="prose-legal mx-auto max-w-3xl">{children}</div>
    </main>
  );
}
