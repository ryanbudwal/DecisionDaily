"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router]);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });

    if (result.error) setMessage(result.error.message);
    else if (result.data.session) router.replace("/dashboard");
    else setMessage("Check your email to confirm your DecisionLab account.");
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  async function playAsGuest() {
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (data.session) router.replace("/dashboard");
  }

  return <main className="auth-page">
    <section className="auth-story">
      <a className="brand auth-brand" href="/"><span>DL</span> DecisionLab</a>
      <div>
        <div className="eyebrow"><span>One challenge. Every day.</span></div>
        <h1>Train your financial judgment.</h1>
        <p>Everyone gets the same scenario. Study the evidence, commit your reasoning, and reveal what happened—then come back tomorrow.</p>
        <div className="auth-proof">
          <article><b>01</b><span>Analyze the evidence</span></article>
          <article><b>02</b><span>Lock your decision</span></article>
          <article><b>03</b><span>Improve your process</span></article>
        </div>
      </div>
      <small>Educational practice only · No investment advice</small>
    </section>

    <section className="auth-form-wrap">
      <div className="auth-form-card">
        <span className="auth-kicker">Today&apos;s challenge is waiting</span>
        <h2>{mode === "signin" ? "Welcome back" : "Join DecisionLab"}</h2>
        <p>{mode === "signin" ? "Sign in to protect your streak and private decision journal." : "Create a private account to save every decision."}</p>
        <form onSubmit={submitEmail}>
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          <label htmlFor="auth-password">Password</label>
          <div className="password-field">
            <input id="auth-password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
            <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <div className="auth-divider"><span>or</span></div>
        <button className="google-button" onClick={signInWithGoogle} disabled={busy}><b>G</b> Continue with Google</button>
        <button className="guest-button" onClick={playAsGuest} disabled={busy}>Play as a guest <span>→</span></button>
        <p className="guest-note">No account needed. Guest progress stays in this browser until you sign out or clear its data.</p>
        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "New to DecisionLab? Create an account" : "Already have an account? Sign in"}
        </button>
        <p className="auth-privacy">Your decisions and reasoning are private. We never connect to a brokerage or place trades.</p>
      </div>
    </section>
  </main>;
}
