import Link from "next/link";

/**
 * Galeria de premiados (edições anteriores). Estilo Resenha:
 * cards com foto placeholder (avatar SVG colorido), nome + cidade,
 * etiqueta amarela com valor recebido.
 *
 * Todos os dados marcados com * = fictícios placeholder até
 * cliente entregar fotos reais e autorizações de uso.
 */

type Premiado = {
  initial: string;
  nome: string;
  cidade: string;
  valor: string;
  cor: string;
};

const PREMIADOS: ReadonlyArray<Premiado> = [
  { initial: "M", nome: "Maria S.*", cidade: "São Paulo / SP", valor: "R$ 80.000", cor: "#F59E0B" },
  { initial: "J", nome: "João P.*", cidade: "Rio de Janeiro / RJ", valor: "R$ 50.000", cor: "#5C2D9C" },
  { initial: "A", nome: "Ana C.*", cidade: "Salvador / BA", valor: "R$ 30.000", cor: "#16A34A" },
  { initial: "R", nome: "Roberto L.*", cidade: "Curitiba / PR", valor: "R$ 100.000", cor: "#DC2626" },
  { initial: "F", nome: "Fátima B.*", cidade: "Fortaleza / CE", valor: "R$ 20.000", cor: "#0EA5E9" },
  { initial: "C", nome: "Carlos M.*", cidade: "Recife / PE", valor: "R$ 25.000", cor: "#7C3AED" },
  { initial: "P", nome: "Patrícia O.*", cidade: "Belo Horizonte / MG", valor: "R$ 45.000", cor: "#EAB308" },
  { initial: "L", nome: "Lucas T.*", cidade: "Porto Alegre / RS", valor: "R$ 15.000", cor: "#14B8A6" },
];

export function Premiados() {
  return (
    <section
      id="premiados"
      className="relative bg-[#F4F4F4] py-14 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#5C2D9C]">
            Entrega de prêmios
          </p>
          <h2 className="text-balance text-3xl font-extrabold uppercase text-[#054C2D] sm:text-5xl">
            Edições <span className="text-[#5C2D9C]">anteriores</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Pessoas reais que mudaram de vida com o Capitaliza Pro.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {PREMIADOS.map((p) => (
            <article
              key={p.nome}
              className="group overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="relative flex aspect-square items-center justify-center"
                style={{ backgroundColor: p.cor }}
                aria-label={`Foto de ${p.nome}`}
              >
                <span className="text-7xl font-extrabold text-white drop-shadow-md sm:text-8xl">
                  {p.initial}
                </span>
                <div className="absolute bottom-3 left-3 right-3 rounded-full bg-[#FFD700] px-3 py-1.5 text-center text-xs font-extrabold uppercase tracking-wider text-[#054C2D] shadow-md sm:text-sm">
                  Premiado {p.valor}
                </div>
              </div>
              <div className="p-3 text-center sm:p-4">
                <div className="text-sm font-extrabold text-[#054C2D] sm:text-base">
                  {p.nome}
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">
                  {p.cidade}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href="#planos"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5C2D9C] to-[#7C3AED] px-8 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(92,45,156,0.7)] animate-shine sm:h-16 sm:px-10 sm:text-lg"
          >
            Ver todos os ganhadores →
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          * Nomes ilustrativos. Fotos e dados reais publicados após autorização dos ganhadores.
        </p>
      </div>
    </section>
  );
}
