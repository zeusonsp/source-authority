"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

type AppShellProps = {
  email: string;
  displayName: string | null;
  children: React.ReactNode;
};

export function AppShell({ email, displayName, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[240px_1fr]">
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-h-screen flex-col">
        <Topbar
          email={email}
          displayName={displayName}
          onToggleDrawer={() => setDrawerOpen((open) => !open)}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
