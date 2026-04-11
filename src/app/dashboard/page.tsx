"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CircleUserRound, Loader2, LogOut } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import AuthPanel from "@/components/AuthPanel";
import AgentAdvisorPanel from "@/components/AgentAdvisorPanel";
import HoldingsAnalyzerPanel from "@/components/HoldingsAnalyzerPanel";
import SmartAlertsPanel from "@/components/SmartAlertsPanel";
import TaxOptimizationPanel from "@/components/TaxOptimizationPanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RiskAppetite = "conservative" | "moderate" | "aggressive";

type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  monthly_income_inr: number;
  current_savings_inr: number;
  risk_appetite: RiskAppetite;
  target_amount_inr: number;
  target_horizon_years: number;
  notes: string;
  consent_to_contact: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

function formatRisk(value: RiskAppetite): string {
  if (value === "conservative") {
    return "Conservative";
  }

  if (value === "aggressive") {
    return "Aggressive";
  }

  return "Moderate";
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setRefreshTick((current) => current + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setProfile(null);
      setSignedInEmail(null);
      setRefreshTick((current) => current + 1);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out right now.");
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (!cancelled) {
            setSignedInEmail(null);
            setProfile(null);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id,user_id,full_name,email,monthly_income_inr,current_savings_inr,risk_appetite,target_amount_inr,target_horizon_years,notes,consent_to_contact,source,created_at,updated_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (profileError) {
          throw profileError;
        }

        if (!cancelled) {
          setSignedInEmail(user.email ?? null);
          setProfile((data?.[0] as ProfileRow | undefined) ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your dashboard profile.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const latestCreatedAt = useMemo(() => {
    if (!profile) {
      return null;
    }

    return new Date(profile.created_at).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [profile]);

  const latestUpdatedAt = useMemo(() => {
    if (!profile) {
      return null;
    }

    return new Date(profile.updated_at).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [profile]);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pt-24 pb-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8 shadow-[0_20px_45px_rgba(43,92,255,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-finance-muted">Client Dashboard</p>
                <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight text-finance-text">
                  Your Latest Profile &amp; Plan Inputs
                </h1>
                <p className="mt-3 text-finance-muted max-w-3xl">
                  This view pulls your most recent profile row from Supabase based on your authenticated account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRefreshTick((current) => current + 1)}
                className="inline-flex items-center rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface transition-colors"
              >
                Refresh
              </button>

              {signedInEmail && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-2 rounded-full border border-finance-border px-4 py-2 text-sm font-semibold text-finance-text hover:bg-finance-surface transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Sign Out
                </button>
              )}
            </div>
          </section>

          {isLoading && (
            <section className="mt-6 rounded-2xl border border-finance-border bg-finance-panel p-8 flex items-center gap-3 text-finance-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Loading your profile snapshot...</p>
            </section>
          )}

          {!isLoading && error && (
            <section className="mt-6 rounded-2xl border border-finance-red/25 bg-finance-red/10 p-6 text-finance-red">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to load dashboard data</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            </section>
          )}

          {!isLoading && !error && !signedInEmail && (
            <section className="mt-6 rounded-2xl border border-finance-border bg-finance-panel p-6">
              <div className="flex items-start gap-3">
                <CircleUserRound className="h-5 w-5 mt-0.5 text-finance-muted" />
                <div>
                  <p className="font-semibold text-finance-text">You are not signed in</p>
                  <p className="mt-1 text-sm text-finance-muted">
                    Sign in to reliably view your own profile and plan inputs on this dashboard.
                  </p>
                  <AuthPanel onSignedIn={() => setRefreshTick((current) => current + 1)} />
                </div>
              </div>
            </section>
          )}

          {!isLoading && !error && signedInEmail && !profile && (
            <section className="mt-6 rounded-2xl border border-finance-border bg-finance-panel p-6">
              <p className="font-semibold text-finance-text">No profile found for {signedInEmail}</p>
              <p className="mt-1 text-sm text-finance-muted">
                Complete onboarding while signed in, then refresh this dashboard to view your latest plan inputs.
              </p>
              <Link
                href="/onboarding"
                className="mt-3 inline-flex rounded-full bg-finance-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Complete Onboarding
              </Link>
            </section>
          )}

          {!isLoading && !error && profile && (
            <div className="mt-6 space-y-6">
              <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Profile Owner</p>
                    <h2 className="mt-1 text-2xl font-semibold text-finance-text">{profile.full_name}</h2>
                    <p className="text-sm text-finance-muted">{profile.email}</p>
                  </div>
                  <div className="text-sm text-finance-muted">
                    <p>Captured: {latestCreatedAt}</p>
                    <p>Updated: {latestUpdatedAt}</p>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Monthly Income</p>
                  <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(profile.monthly_income_inr)}</p>
                </article>

                <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Current Savings</p>
                  <p className="mt-2 text-xl font-semibold text-finance-text">{formatCurrency(profile.current_savings_inr)}</p>
                </article>

                <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Risk Appetite</p>
                  <p className="mt-2 text-xl font-semibold text-finance-text">{formatRisk(profile.risk_appetite)}</p>
                </article>

                <article className="rounded-xl border border-finance-border bg-finance-panel p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Horizon</p>
                  <p className="mt-2 text-xl font-semibold text-finance-text">{profile.target_horizon_years} years</p>
                </article>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border border-finance-border bg-finance-panel p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Target Corpus</p>
                  <p className="mt-2 text-2xl font-semibold text-finance-accent">{formatCurrency(profile.target_amount_inr)}</p>
                  <p className="mt-2 text-sm text-finance-muted">
                    Source: {profile.source} · Consent to contact: {profile.consent_to_contact ? "Yes" : "No"}
                  </p>
                </article>

                <article className="rounded-xl border border-finance-border bg-finance-panel p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">Planner Notes</p>
                  <p className="mt-2 text-sm text-finance-text leading-relaxed">
                    {profile.notes.trim() ? profile.notes : "No additional notes provided in latest submission."}
                  </p>
                </article>
              </section>
            </div>
          )}

          {!isLoading && !error && signedInEmail && (
            <div className="mt-6 space-y-6">
              <SmartAlertsPanel refreshKey={refreshTick} />
              <HoldingsAnalyzerPanel
                refreshKey={refreshTick}
                onHoldingsChanged={() => setRefreshTick((current) => current + 1)}
              />
              <TaxOptimizationPanel refreshKey={refreshTick} />
              <AgentAdvisorPanel refreshKey={refreshTick} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
