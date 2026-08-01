"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User;
  profileName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthGate.");
  return value;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncUser(nextUser: User | null) {
      if (!active) return;
      setUser(nextUser);
      if (!nextUser) {
        setProfileName("");
        setReady(true);
        router.replace("/");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", nextUser.id)
        .maybeSingle();
      if (!active) return;
      setProfileName(data?.username ?? "");
      setReady(true);
    }

    void supabase.auth.getUser().then(({ data }) => syncUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  const value = useMemo<AuthContextValue | null>(() => user ? {
    user,
    profileName,
    signOut: async () => {
      await supabase.auth.signOut();
      router.replace("/");
    },
  } : null, [profileName, router, user]);

  if (!ready || !value) {
    return <div className="auth-loading"><span>DL</span><p>Preparing your DecisionLab workspace…</p></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
