"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/#solucao", label: "Solução" },
  { href: "/#pricing", label: "Preços" },
  { href: "/demo", label: "Demo" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  // Fecha o drawer mobile ao redimensionar pra desktop pra evitar
  // estado pendurado quando usuário gira tablet ou redimensiona.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          Source<span className="text-accent">.</span>Authority
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/demo"
            className={buttonClasses({ variant: "primary", size: "sm" })}
          >
            Solicitar demo
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer — slide-down panel sob o header */}
      <div
        className={cn(
          "border-t border-border/60 bg-background md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-6 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/demo"
            onClick={() => setOpen(false)}
            className={cn(
              buttonClasses({ variant: "primary", size: "md" }),
              "mt-2 w-full",
            )}
          >
            Solicitar demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
