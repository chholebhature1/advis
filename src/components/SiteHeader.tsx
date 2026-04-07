"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, UserRound } from "lucide-react";

export default function SiteHeader() {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAppShell = pathname.startsWith("/dashboard") || pathname.startsWith("/learn");
  const isDashboard = pathname.startsWith("/dashboard");

  if (isOnboarding) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-finance-border/40 bg-finance-bg/95 backdrop-blur-sm">
        <div className="mx-auto h-16 max-w-6xl px-6 flex items-center justify-between">
          <Link href="/" className="text-finance-text font-semibold tracking-tight">Pravix</Link>
          <div className="hidden md:flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-finance-muted">
            <span>Application Progress</span>
            <div className="flex gap-2">
              <span className="h-[2px] w-12 rounded-full bg-finance-accent" />
              <span className="h-[2px] w-12 rounded-full bg-finance-border" />
            </div>
          </div>
          <Link href="/" className="text-xs text-finance-muted hover:text-finance-text">Save &amp; Exit</Link>
        </div>
      </header>
    );
  }

  const navItems = isDashboard
    ? [
        { label: "How It Works", href: "/#how-it-works" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Insights", href: "/#insights" },
        { label: "Why Pravix", href: "/#why-goals" },
        { label: "contact", href: "/#contact" },
      ]
    : isAppShell
      ? [
          { label: "Products", href: "/" },
          { label: "Learn", href: "/learn" },
          { label: "Dashboard", href: "/dashboard" },
        ]
      : [
        { label: "How It Works", href: "#how-it-works" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Insights", href: "#insights" },
        { label: "Why Pravix", href: "#why-goals" },
        { label: "contact", href: "#contact" },
        ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-finance-border/40 bg-finance-bg/95 backdrop-blur-sm">
      <div className="mx-auto h-16 max-w-7xl px-6 md:px-10 grid grid-cols-[auto_1fr_auto] items-center gap-6">
        <Link href="/" className="text-finance-text font-semibold text-2xl tracking-tight">
          Pravix
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-7 text-sm font-medium text-finance-dim">
          {navItems.map((item) => {
            const isActive = item.href.startsWith("/") ? pathname === item.href : false;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative pb-1 hover:text-finance-text ${isActive ? "text-finance-text" : ""}`}
              >
                {item.label}
                {isActive && <span className="absolute left-0 -bottom-[6px] h-[2px] w-full rounded-full bg-finance-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
          <Link
            href="/onboarding"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-[#878BFF]/45 bg-[linear-gradient(180deg,#9EA0FF,#7E82F8)] px-4 py-2 text-xs font-medium text-[#090c19] shadow-[0_8px_25px_rgba(126,130,248,0.35)] hover:brightness-105"
          >
            Get Guidance
            <ArrowRight className="w-4 h-4" />
          </Link>
          {isAppShell && (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted">
              <UserRound className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
