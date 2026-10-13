"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/archive", label: "Archive" },
  { href: "/profile", label: "Profile" },
  { href: "/scoring", label: "How scoring works" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, profileName, isGuest, canManageChallenges, signOut } = useAuth();
  const visibleLinks = canManageChallenges
    ? [...links, { href: "/studio", label: "Challenge studio" }]
    : links;

  async function handleSignOut() {
    if (isGuest && !window.confirm("Exit guest mode? Your guest progress cannot be recovered after you sign out.")) return;
    await signOut();
  }

  return <header className="app-header">
    <Link className="brand" href="/dashboard"><span>DD</span> Decision Daily</Link>
    <nav aria-label="Primary navigation">
      {visibleLinks.map((link) => <Link
        key={link.href}
        href={link.href}
        className={pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/challenge/")) ? "active" : ""}
      >{link.label}</Link>)}
    </nav>
    <button className="auth-signout" onClick={() => void handleSignOut()} title={profileName || user.email || "Signed in"}>Sign out</button>
  </header>;
}
