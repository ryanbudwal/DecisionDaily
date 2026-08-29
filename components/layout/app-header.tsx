"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";

const links = [
  { href: "/dashboard", label: "Today", shortLabel: "Today", icon: "01" },
  { href: "/archive", label: "Archive", shortLabel: "Archive", icon: "02" },
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: "03" },
  { href: "/scoring", label: "How scoring works", shortLabel: "Scoring", icon: "04" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, profileName, isGuest, canManageChallenges, signOut } = useAuth();
  const visibleLinks = canManageChallenges
    ? [...links, { href: "/studio", label: "Challenge studio", shortLabel: "Studio", icon: "05" }]
    : links;

  async function handleSignOut() {
    if (isGuest && !window.confirm("Exit guest mode? Your guest progress cannot be recovered after you sign out.")) return;
    await signOut();
  }

  return <header className="app-header">
    <Link className="brand" href="/dashboard" aria-label="Decision Daily home"><span>DD</span> Decision Daily</Link>
    <nav className={canManageChallenges ? "owner-nav" : ""} aria-label="Primary navigation">
      {visibleLinks.map((link) => {
        const active = pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/challenge/"));
        return <Link key={link.href} href={link.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
          <span className="nav-index" aria-hidden="true">{link.icon}</span>
          <span className="nav-label">{link.label}</span>
          <span className="nav-short-label">{link.shortLabel}</span>
        </Link>;
      })}
    </nav>
    <button className="auth-signout" onClick={() => void handleSignOut()} title={isGuest ? "Exit guest mode" : profileName || user.email || "Signed in"}>
      <span>{isGuest ? "G" : (profileName?.[0] ?? user.email?.[0] ?? "D").toUpperCase()}</span><b>{isGuest ? "Exit guest" : "Sign out"}</b>
    </button>
  </header>;
}
