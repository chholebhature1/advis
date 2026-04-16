import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Pravix account or create a new one.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-finance-bg pt-28 pb-16">
        <div className="mx-auto w-full max-w-5xl px-6">
          <section className="rounded-2xl border border-finance-border bg-finance-panel p-8 md:p-10 shadow-[0_18px_36px_rgba(31,42,36,0.08)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Account Access</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-finance-text">Login</h1>
            <p className="mt-3 text-finance-muted max-w-2xl">
              Choose how you want to continue. Sign in if you already have an account, or create one to start saving
              your financial profile.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-finance-border bg-finance-surface p-5">
                <h2 className="text-xl font-semibold text-finance-text">I already have an account</h2>
                <p className="mt-2 text-sm text-finance-muted">Use your existing email and password to continue.</p>
                <Link
                  href="/sign-in"
                  className="mt-4 inline-flex rounded-full bg-finance-accent px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Sign In
                </Link>
              </article>

              <article className="rounded-xl border border-finance-border bg-finance-surface p-5">
                <h2 className="text-xl font-semibold text-finance-text">I am new to Pravix</h2>
                <p className="mt-2 text-sm text-finance-muted">Create an account to unlock personalized guidance.</p>
                <Link
                  href="/create-account"
                  className="mt-4 inline-flex rounded-full border border-finance-border px-5 py-2.5 text-sm font-semibold text-finance-text hover:bg-white"
                >
                  Create Account
                </Link>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}