"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, LogIn, UserPlus } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthPanelProps = {
  defaultEmail?: string | null;
  onSignedIn?: () => void;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit exceeded")
  );
}

function toFriendlyAuthError(message: string, isSignUp: boolean): string {
  if (isSignUp && isRateLimitError(message)) {
    return "Too many signup attempts from this email right now. Please wait a minute, then try again, or sign in if you already created the account.";
  }

  return message;
}

export default function AuthPanel({ defaultEmail, onSignedIn }: AuthPanelProps) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"signin" | "signup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupRetrySeconds, setSignupRetrySeconds] = useState(0);

  const isBusy = isSubmitting !== null;

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  useEffect(() => {
    if (signupRetrySeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSignupRetrySeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [signupRetrySeconds]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail || !normalizedEmail.includes("@") || !password) {
      setError("Please enter a valid email and password.");
      return;
    }

    setIsSubmitting("signin");
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Signed in successfully.");
      setPassword("");
      onSignedIn?.();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to sign in right now.");
    } finally {
      setIsSubmitting(null);
    }
  }

  async function handleCreateAccount() {
    if (!normalizedEmail || !normalizedEmail.includes("@") || password.length < 6) {
      setError("Use a valid email and a password with at least 6 characters.");
      return;
    }

    setIsSubmitting("signup");
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        setMessage("Account created and signed in.");
        onSignedIn?.();
      } else {
        setMessage("Account created. Check your email to verify, then sign in.");
      }

      setPassword("");
    } catch (authError) {
      const rawMessage = authError instanceof Error ? authError.message : "Unable to create account right now.";
      if (isRateLimitError(rawMessage)) {
        setSignupRetrySeconds((current) => (current > 0 ? current : 60));
      }
      setError(toFriendlyAuthError(rawMessage, true));
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <form onSubmit={handleSignIn} className="mt-4 rounded-xl border border-finance-border bg-finance-surface p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Account Access</p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-finance-text">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 rounded-lg border border-finance-border px-3 text-sm text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-finance-text">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 rounded-lg border border-finance-border px-3 text-sm text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            placeholder="Minimum 6 characters"
          />
        </label>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-2.5 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-finance-muted">{message}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting === "signin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign In
        </button>

        <button
          type="button"
          onClick={handleCreateAccount}
          disabled={isBusy || signupRetrySeconds > 0}
          className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {signupRetrySeconds > 0 ? `Try again in ${signupRetrySeconds}s` : "Create Account"}
        </button>
      </div>
    </form>
  );
}