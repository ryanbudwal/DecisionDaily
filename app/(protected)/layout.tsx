import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AuthGate>
    <main className="site-shell">
      <AppHeader />
      {children}
      <AppFooter />
    </main>
  </AuthGate>;
}
