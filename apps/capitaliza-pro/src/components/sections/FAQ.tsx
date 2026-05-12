"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FAQ accordion. 8 perguntas cobrindo:
 * legalidade, fraude, recebimento, WhatsApp, IR, resgate, sociedade,
 * provably fair. Tom direto, popular brasileiro.
 */

const ITEMS = [
  {
    q: "É legal? Pode mesmo?",
    a: "Sim. O Capitaliza Pro é um título de capitalização emitido pela Via Cap (sociedade emissora autorizada pela SUSEP). Tem CNPJ ativo, regulamento publicado e está sob fiscalização do governo federal.",
  },
  {
    q: "Como sei que não é golpe?",
    a: "Dois caminhos pra você conferir: (1) Auditoria SUSEP — o título tem código SUSEP que você consulta no site oficial; (2) Auditoria blockchain — cada sorteio publica o hash em blockchain Polygon ANTES do sorteio acontecer. Impossível manipular o resultado depois.",
  },
  {
    q: "Como recebo o prêmio se ganhar?",
    a: "Direto no seu PIX, em até 5 minutos depois da confirmação. Sem fila, sem burocracia, sem ter que ir em agência. Você só precisa ter um PIX ativo com CPF.",
  },
  {
    q: "Posso comprar pelo WhatsApp?",
    a: "Sim. Tudo acontece pelo WhatsApp: você escolhe a quantidade de números, paga por PIX (QR code mandado na conversa), recebe os números e fica sabendo o resultado. Sem cadastro chato em site.",
  },
  {
    q: "E se eu ganhar R$ 100 mil? Tem imposto?",
    a: "Prêmios de capitalização têm tributação de Imposto de Renda na fonte (alíquota conforme regulamento vigente, normalmente 30% sobre o valor do prêmio). O valor que cai no seu PIX já vem com o IR retido. Detalhes completos no Regulamento.",
  },
  {
    q: "Posso resgatar o valor da capitalização?",
    a: "Sim. Ao final do ciclo de capitalização (definido no regulamento), você pode resgatar parte do valor investido em títulos. O percentual resgatável e o prazo estão descritos no contrato e variam por plano.",
  },
  {
    q: "Quem é a sociedade emissora?",
    a: "Via Cap (placeholder até parceria final). É uma sociedade de capitalização autorizada pela SUSEP, responsável legal pelos títulos vendidos via Capitaliza Pro. Toda a operação financeira é regulada e fiscalizada.",
  },
  {
    q: "Como funciona o provably fair?",
    a: "Antes de cada sorteio começar, geramos um hash SHA-256 do resultado e publicamos em blockchain Polygon (rede pública, imutável). Depois do sorteio, qualquer pessoa pode verificar se o resultado bate com o hash. Não dá pra trapacear porque o hash foi registrado ANTES.",
  },
] as const;

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${idx}`;
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#F4F4F4] bg-white transition-colors hover:border-[#FFD700]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-button`}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[#FFF9DC] sm:px-7 sm:py-6"
      >
        <span className="text-base font-extrabold text-[#054C2D] sm:text-lg">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-[#5C2D9C] transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        hidden={!open}
        className="px-5 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-7 sm:text-base"
      >
        {a}
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section
      id="regulamento"
      className="relative bg-white py-14 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#5C2D9C]">
            Tira-dúvidas
          </p>
          <h2 className="text-balance text-3xl font-extrabold uppercase text-[#054C2D] sm:text-5xl">
            Perguntas <span className="text-[#5C2D9C]">frequentes</span>
          </h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {ITEMS.map((item, i) => (
            <FAQItem key={item.q} idx={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
