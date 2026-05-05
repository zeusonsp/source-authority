"use client";

import { LogOut, Menu } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  email: string;
  displayName: string | null;
  onToggleDrawer: () => void;
};

export function Topbar({ email, displayName, onToggleDrawer }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onToggleDrawer}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium leading-tight">
            {displayName ?? email}
          </div>
          {displayName ? (
            <div className="text-xs leading-tight text-muted-foreground">
              {email}
            </div>
          ) : null}
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
