"use client";

import Link from "next/link";
import { Menu, X, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, WHATSAPP_URL } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#premiados", label: "Premiados" },
  { href: "#regulamento", label: "Regulamento" },
  { href: "#contato", label: "Contato" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#FFD700] bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:h-20">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight sm:text-xl lg:text-2xl"
          onClick={() => setOpen(false)}
          aria-label="Capitaliza Pro — Início"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[#FFD700] text-[#054C2D] shadow-sm lg:size-10">
            <Crown className="size-5 lg:size-6" strokeWidth={2.5} />
          </span>
          <span className="text-[#054C2D]">
            CAPITALIZA<span className="text-[#FFD700] [text-shadow:_-1px_-1px_0_#054C2D,_1px_-1px_0_#054C2D,_-1px_1px_0_#054C2D,_1px_1px_0_#054C2D]">PRO</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold uppercase tracking-wide text-[#054C2D] transition-colors hover:text-[#5C2D9C]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTAs direita */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1ebd5a] hover:-translate-y-0.5 sm:inline-flex lg:h-11 lg:px-5"
            aria-label="Falar no WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.149-.669.15-.198.297-.768.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <Link
            href="#planos"
            className="hidden h-10 items-center rounded-full border-2 border-[#054C2D] px-4 text-sm font-bold text-[#054C2D] transition-all hover:bg-[#054C2D] hover:text-white sm:inline-flex lg:h-11 lg:px-5"
          >
            Entrar
          </Link>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-[#054C2D] hover:bg-[#F4F4F4] lg:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          "border-t border-[#F4F4F4] bg-white lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-4 py-4 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-bold uppercase text-[#054C2D] transition-colors hover:bg-[#F4F4F4]"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-bold text-white shadow-sm sm:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.149-.669.15-.198.297-.768.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar no WhatsApp
          </a>
        </nav>
      </div>
    </header>
  );
}
