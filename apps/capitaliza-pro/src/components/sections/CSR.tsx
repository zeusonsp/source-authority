import { Heart } from "lucide-react";

/**
 * Seção CSR — responsabilidade social. Reforça emocionalmente que
 * comprar bilhete = ajudar criança. Placeholder ONG "Criança Cidadã".
 */
export function CSR() {
  return (
    <section
      id="csr"
      className="relative bg-white py-14 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Imagem placeholder */}
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-3xl border-4 border-[#FFD700] bg-gradient-to-br from-[#F59E0B] via-[#FFD700] to-[#16A34A] shadow-2xl">
              {/* Sun + ground "ilustração" */}
              <div className="absolute right-8 top-8 size-20 rounded-full bg-[#FFD700] shadow-lg sm:size-28" />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[#16A34A]" />
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 sm:gap-5">
                {/* Crianças stilizadas */}
                {["#5C2D9C", "#DC2626", "#0EA5E9"].map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1"
                    aria-hidden
                  >
                    <div
                      className="size-8 rounded-full sm:size-10"
                      style={{ backgroundColor: c }}
                    />
                    <div
                      className="h-8 w-6 rounded-md sm:h-10 sm:w-7"
                      style={{ backgroundColor: c }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#054C2D] shadow sm:text-xs">
                Ilustração
              </div>
            </div>
          </div>

          {/* Texto */}
          <div className="order-1 lg:order-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#16A34A]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#16A34A] sm:text-sm">
              <Heart className="size-4 fill-current" />
              Responsabilidade social
            </div>
            <h2 className="text-balance text-3xl font-extrabold uppercase text-[#054C2D] sm:text-5xl">
              Sua sorte ajuda{" "}
              <span className="text-[#5C2D9C]">crianças no Brasil</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Parte da renda dos sorteios é destinada à ONG{" "}
              <strong className="text-[#054C2D]">Criança Cidadã*</strong>, que
              apoia educação e alimentação de crianças em vulnerabilidade.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl border-2 border-[#FFD700] bg-[#FFF9DC] p-5 text-center">
                <div className="text-3xl font-extrabold text-[#054C2D] sm:text-4xl">
                  +R$ 200 mil
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
                  doados em 2026*
                </div>
              </div>
              <div className="rounded-2xl border-2 border-[#FFD700] bg-[#FFF9DC] p-5 text-center">
                <div className="text-3xl font-extrabold text-[#054C2D] sm:text-4xl">
                  +1.500
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
                  crianças impactadas*
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              * Valores e ONG parceira são placeholder. Substituídos após
              parceria oficial confirmada.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
