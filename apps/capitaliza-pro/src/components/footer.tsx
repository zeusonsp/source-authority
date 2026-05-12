import Link from "next/link";
import { Instagram, Youtube } from "lucide-react";

const FOOTER_LINKS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    title: "Produto",
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Provably Fair", href: "#provably-fair" },
      { label: "Planos", href: "#planos" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Regulamento", href: "#" },
      { label: "Sorteios passados", href: "#" },
      { label: "SUSEP", href: "https://www.gov.br/susep" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de uso", href: "#" },
      { label: "Privacidade", href: "#" },
      { label: "LGPD", href: "#" },
    ],
  },
];

// Custom TikTok icon (lucide doesn't ship one)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.84 4.84 0 0 1-1.84-.09z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06] bg-background">
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand block */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-extrabold tracking-tight"
            >
              <span className="inline-block size-2 rounded-full bg-accent" />
              CAPITALIZA<span className="text-accent">.</span>PRO
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              O primeiro título de capitalização auditado por blockchain do
              Brasil. Sorteios provably fair, pagamento via PIX, prêmios via
              WhatsApp.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/10 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/10 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <TikTokIcon className="size-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/10 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Youtube className="size-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-foreground/[0.06] pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} Capitaliza Pro. Todos os direitos reservados.</p>
            <p>CNPJ XX.XXX.XXX/0001-XX · Produto regulado pela SUSEP, Resolução nº XXX/XXXX.</p>
          </div>
          <p className="text-muted-foreground/70">
            Dados ilustrativos · versão demonstrativa
          </p>
        </div>
      </div>
    </footer>
  );
}
