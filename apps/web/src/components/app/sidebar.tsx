"use client";

import {
  Bell,
  Copy,
  FileBarChart,
  LayoutDashboard,
  Link2,
  Settings,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Texto do badge à direita do label. null = sem badge (rota implementada). */
  badge: string | null;
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: "/link",
    label: "Link Mestre",
    icon: Link2,
    badge: "Fase 3",
  },
  {
    href: "/alertas",
    label: "Alertas",
    icon: Bell,
    badge: null,
  },
  {
    href: "/meu-conteudo",
    label: "Meu Conteúdo",
    icon: Copy,
    badge: null,
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: FileBarChart,
    badge: null,
  },
  {
    href: "/revendedores",
    label: "Revendedores",
    icon: Users,
    badge: null,
  },
  {
    href: "/diagnostico",
    label: "Diagnóstico",
    icon: Stethoscope,
    badge: null,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    badge: null,
  },
];

type SidebarProps = {
  drawerOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ drawerOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop mobile — clica fora pra fechar drawer */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden",
          drawerOpen ? "block" : "hidden",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link
            href="/dashboard"
            className="font-sans text-lg font-bold tracking-tight"
            onClick={onClose}
          >
            Source<span className="text-accent">.</span>Authority
          </Link>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Fase 2 · Onboarding
        </div>
      </aside>
    </>
  );
}
