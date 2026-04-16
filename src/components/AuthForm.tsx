"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";
type FormStep = "credentials" | "verification";

type AuthFormProps = {
  mode: AuthMode;
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

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupRetrySeconds, setSignupRetrySeconds] = useState(0);
  const [verifyRetrySeconds, setVerifyRetrySeconds] = useState(0);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isSignUp = mode === "signup";

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

    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  }

  async function verifyEmailCode() {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsSubmitting(true);
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

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      setError(errorMsg);
      setVerifyRetrySeconds(60);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        // Move to verification step and send verification email via Resend
        setStep("verification");
        setPassword("");
        setConfirmPassword("");
        await sendVerificationEmail();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (authError) {
      const rawMessage = authError instanceof Error ? authError.message : "Authentication failed.";
      if (isSignUp && isRateLimitError(rawMessage)) {
        setSignupRetrySeconds((current) => (current > 0 ? current : 60));
      }
      setError(toFriendlyAuthError(rawMessage, isSignUp));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "verification") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verifyEmailCode();
        }}
        className="w-full max-w-md rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8 shadow-[0_18px_36px_rgba(31,42,36,0.08)]"
      >
        <div className="flex items-center gap-2 mb-4">
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
            <ArrowLeft className="h-5 w-5 text-finance-accent" />
          </button>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">
            Verify Email
          </p>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-finance-text">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-finance-muted">
          We sent a 6-digit verification code to <span className="font-semibold">{normalizedEmail}</span>
        </p>

        <div className="mt-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-finance-text">Verification Code</span>
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
              className="h-11 rounded-lg border border-finance-border px-3 text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25 text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        {message && <p className="mt-4 text-sm text-finance-muted">{message}</p>}

        <button
          type="submit"
          disabled={isSubmitting || verifyRetrySeconds > 0 || verificationCode.length !== 6}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-finance-accent px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {verifyRetrySeconds > 0 ? `Try again in ${verifyRetrySeconds}s` : "Verify Email"}
        </button>

        <p className="mt-4 text-center text-sm text-finance-muted">
          Didn't receive code?{" "}
          <button
            type="button"
            onClick={sendVerificationEmail}
            disabled={isSubmitting}
            className="font-semibold text-finance-accent hover:underline disabled:opacity-50"
          >
            Resend
          </button>
        </p>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8 shadow-[0_18px_36px_rgba(31,42,36,0.08)]"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">
        {isSignUp ? "Create Account" : "Sign In"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-finance-text">
        {isSignUp ? "Start your Pravix account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-finance-muted">
        {isSignUp
          ? "Create your account to save profiles and access your dashboard anytime."
          : "Sign in to access your latest profile and planning inputs."}
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-finance-text">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-lg border border-finance-border px-3 text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-finance-text">Password</span>
          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-lg border border-finance-border px-3 text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
            placeholder="Minimum 6 characters"
          />
        </label>

        {isSignUp && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-finance-text">Confirm Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 rounded-lg border border-finance-border px-3 text-finance-text bg-white focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
              placeholder="Re-enter password"
            />
          </label>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-finance-muted">{message}</p>}

      <button
        type="submit"
        disabled={isSubmitting || (isSignUp && signupRetrySeconds > 0)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-finance-accent px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSignUp
          ? signupRetrySeconds > 0
            ? `Try again in ${signupRetrySeconds}s`
            : "Create Account"
          : "Sign In"}
      </button>

      <p className="mt-4 text-center text-sm text-finance-muted">
        {isSignUp ? "Already have an account? " : "Need an account? "}
        <Link href={isSignUp ? "/sign-in" : "/create-account"} className="font-semibold text-finance-accent hover:underline">
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}