import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { RouteTransition } from "@/components/layout/route-transition";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AuthGate>
    <main className="site-shell">
      <AppHeader />
      <RouteTransition>{children}</RouteTransition>
      <AppFooter />
    </main>
  </AuthGate>;
}
