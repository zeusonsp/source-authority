"use client";

import { useState } from "react";
import { BillingBanner } from "@/components/billing/billing-banner";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

type AppShellProps = {
  email: string;
  displayName: string | null;
  /**
   * Billing context da empresa do usuário. Quando `billing_status='past_due'`
   * o BillingBanner renderiza acima do Topbar. Undefined = user sem
   * empresa ainda (pré-onboarding) → sem banner.
   */
  billing?: { company_id: string; billing_status: string } | null;
  children: React.ReactNode;
};

export function AppShell({ email, displayName, billing, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[240px_1fr]">
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-h-screen flex-col">
        {billing ? (
          <BillingBanner
            company_id={billing.company_id}
            billing_status={billing.billing_status}
          />
        ) : null}
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
