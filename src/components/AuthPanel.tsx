"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthPanelProps = {
  defaultEmail?: string | null;
  onSignedIn?: () => void;
};

type AuthStep = "credentials" | "verification";

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
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"signin" | "signup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupRetrySeconds, setSignupRetrySeconds] = useState(0);
  const [verifyRetrySeconds, setVerifyRetrySeconds] = useState(0);

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

  useEffect(() => {
    if (verifyRetrySeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setVerifyRetrySeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [verifyRetrySeconds]);

  async function sendVerificationEmail() {
    if (!normalizedEmail) return;

    setIsSubmitting("signup");
    setError(null);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }

      setMessage("Verification code sent! Check your email.");
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification email");
    } finally {
      setIsSubmitting(null);
    }
  }

  async function verifyEmailCode() {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsSubmitting("signup");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          token: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Email verified! Now sign in
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Account created and signed in successfully.");
      setPassword("");
      setStep("credentials");
      onSignedIn?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      setError(errorMsg);
      setVerifyRetrySeconds(60);
    } finally {
      setIsSubmitting(null);
    }
  }

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
        // Move to verification step and send verification email via Resend
        setStep("verification");
        await sendVerificationEmail();
      }
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

  if (step === "verification") {
    return (
      <div className="mt-4 rounded-xl border border-finance-border bg-finance-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setVerificationCode("");
              setError(null);
              setMessage(null);
            }}
            className="p-1 hover:bg-finance-accent/10 rounded-lg transition"
          >
            <ArrowLeft className="h-4 w-4 text-finance-accent" />
          </button>
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">
            Verify Email
          </p>
        </div>

        <p className="text-sm font-semibold text-finance-text">Check your email</p>
        <p className="text-xs text-finance-muted mt-1">
          We sent a 6-digit code to <span className="font-semibold">{normalizedEmail}</span>
        </p>

        <div className="mt-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-finance-text">Code</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={verificationCode}
              onChange={(event) => {
                const val = event.target.value.replace(/\D/g, "");
                setVerificationCode(val);
              }}
              className="h-10 rounded-lg border border-finance-border px-3 text-sm text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25 text-center tracking-widest font-mono"
              placeholder="000000"
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
            type="button"
            onClick={verifyEmailCode}
            disabled={isBusy || verifyRetrySeconds > 0 || verificationCode.length !== 6}
            className="inline-flex items-center gap-2 rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {verifyRetrySeconds > 0 ? `Try again in ${verifyRetrySeconds}s` : "Verify Email"}
          </button>

          <button
            type="button"
            onClick={sendVerificationEmail}
            disabled={isBusy}
            className="text-sm font-semibold text-finance-accent hover:underline disabled:opacity-50"
          >
            Resend Code
          </button>
        </div>
      </div>
    );
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