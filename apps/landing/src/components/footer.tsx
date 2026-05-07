import Link from "next/link";

const LEGAL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/lgpd", label: "LGPD" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-background py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="text-base font-bold tracking-tight">
              Source<span className="text-accent">.</span>Authority
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Plataforma SaaS B2B brasileira de proteção de marca e atribuição
              de tracking pra empresas premium.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Legal
            </h3>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  {/*
                    Páginas de Termos/Privacidade/LGPD entram no Lote C.
                    Por enquanto links 404 (placeholder explícito).
                  */}
                  <Link
                    href={link.href as never}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contato
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:contato@sourceauthority.com.br"
                  className="transition-colors hover:text-foreground"
                >
                  contato@sourceauthority.com.br
                </a>
              </li>
              <li>Alphaville · São Paulo, Brasil</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {year} Zeus Tecnologia · Source Authority é marca registrada.
          </span>
          <span>Feito no Brasil 🇧🇷</span>
        </div>
      </div>
    </footer>
  );
}
