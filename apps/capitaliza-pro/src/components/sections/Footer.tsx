import Link from "next/link";
import { Crown } from "lucide-react";

/**
 * Footer institucional. Logo amarelo + 3 colunas de links + selos
 * regulatórios + CNPJ placeholder + texto de jogo responsável.
 */

const LINKS = {
  empresa: [
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#diferenciais", label: "Diferenciais" },
    { href: "#premiados", label: "Premiados" },
    { href: "#csr", label: "Responsabilidade social" },
  ],
  legal: [
    { href: "#regulamento", label: "Regulamento" },
    { href: "#regulamento", label: "Termos de uso" },
    { href: "#regulamento", label: "Privacidade (LGPD)" },
    { href: "#regulamento", label: "Política de cookies" },
  ],
  contato: [
    { href: "#contato", label: "Fale conosco" },
    { href: "#contato", label: "WhatsApp 24/7" },
    { href: "#contato", label: "SAC Via Cap" },
    { href: "#contato", label: "Imprensa" },
  ],
};

const SELOS = [
  { label: "SUSEP", subtitle: "Autorizado" },
  { label: "Via Cap", subtitle: "Sociedade Emissora*" },
  { label: "Polygon", subtitle: "Auditado on-chain" },
  { label: "reCAPTCHA", subtitle: "Google Protected" },
];

export function Footer() {
  return (
    <footer
      id="contato"
      className="border-t-4 border-[#FFD700] bg-white"
    >
      <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Logo + tagline */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-extrabold tracking-tight"
              aria-label="Capitaliza Pro — Início"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-[#FFD700] text-[#054C2D] shadow-sm">
                <Crown className="size-6" strokeWidth={2.5} />
              </span>
              <span className="text-[#054C2D]">
                CAPITALIZA<span className="text-[#FFD700] [text-shadow:_-1px_-1px_0_#054C2D,_1px_-1px_0_#054C2D,_-1px_1px_0_#054C2D,_1px_1px_0_#054C2D]">PRO</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              O primeiro título de capitalização brasileiro com sorteios
              auditados em blockchain, atendimento 24/7 por IA e pagamento de
              prêmios via PIX em 5 minutos.
            </p>
          </div>

          <FooterCol title="Empresa" items={LINKS.empresa} />
          <FooterCol title="Legal" items={LINKS.legal} />
          <FooterCol title="Contato" items={LINKS.contato} />
        </div>

        {/* Selos */}
        <div className="mt-12 grid grid-cols-2 items-center gap-4 border-t border-[#F4F4F4] pt-8 sm:grid-cols-4">
          {SELOS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div className="text-base font-extrabold uppercase tracking-tight text-[#054C2D]">
                {s.label}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                {s.subtitle}
              </div>
            </div>
          ))}
        </div>

        {/* Texto regulatório */}
        <div className="mt-8 space-y-3 border-t border-[#F4F4F4] pt-8 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-[#054C2D]">Capitaliza Pro</strong> é um
            título de capitalização da modalidade Incentivo, processado pela
            Via Cap S.A.* (sociedade de capitalização autorizada pela SUSEP sob
            o processo nº XX.XXXXXX/XXXX-XX*). Produto regulado pela Lei nº
            X.XXX/XX*. Antes de adquirir, leia o regulamento completo.
          </p>
          <p>
            <strong className="text-[#054C2D]">CNPJ:</strong> XX.XXX.XXX/XXXX-XX*
            · Endereço: Rua Exemplo, 123 — Capital/UF, XXXXX-XXX
          </p>
          <p>
            Jogue com responsabilidade. Proibido para menores de 18 anos.
            +18. Em caso de problemas com jogos, ligue 188 (CVV).
          </p>
          <p className="text-[10px]">
            * Dados marcados são placeholder até parceria final com sociedade
            de capitalização autorizada. Substituídos antes do lançamento
            público.
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 Capitaliza Pro. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#054C2D]">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-[#5C2D9C]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
