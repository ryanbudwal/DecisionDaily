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
    ? [...links, { href: "/studio", label: "Challenge studio", shortLabel: "Studio", icon: "05" }]
    : links;

  async function handleSignOut() {
    if (isGuest && !window.confirm("Exit guest mode? Your guest progress cannot be recovered after you sign out.")) return;
    await signOut();
  }

  return <header className="app-header">
    <Link className="brand" href="/dashboard"><span>DL</span> DecisionLab</Link>
    <nav aria-label="Primary navigation">
      {links.map((link) => <Link
        key={link.href}
        href={link.href}
        className={pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/challenge/")) ? "active" : ""}
      >{link.label}</Link>)}
    </nav>
    <button className="auth-signout" onClick={() => void signOut()} title={profileName || user.email || "Signed in"}>
      <span>{(profileName?.[0] ?? user.email?.[0] ?? "D").toUpperCase()}</span> Sign out
    </button>
  </header>;
}
