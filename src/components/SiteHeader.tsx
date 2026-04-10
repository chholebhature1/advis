"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, UserRound } from "lucide-react";

export default function SiteHeader() {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAppShell = pathname.startsWith("/dashboard") || pathname.startsWith("/learn");
  const isDashboard = pathname.startsWith("/dashboard");

  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* ─── Onboarding Header ─── */
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

  /* ─── Nav Items ─── */
  const navItems = isDashboard
    ? [
        { label: "How It Works", href: "/#how-it-works" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Insights", href: "/#insights" },
        { label: "Why Pravix", href: "/#why-goals" },
        { label: "Contact", href: "/#contact" },
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
          { label: "Contact", href: "#contact" },
        ];

  /* ─── Main header ─── */
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center"
      style={{
        padding: scrolled ? "10px 16px 0" : "0",
        transition: "padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <nav
        style={{
          /* Dimensions & shape */
          width: scrolled ? "min(880px, calc(100% - 32px))" : "100%",
          maxWidth: scrolled ? "880px" : "100%",
          borderRadius: scrolled ? "9999px" : "0",

          /* Background & blur */
          background: scrolled
            ? "rgba(255, 255, 255, 0.72)"
            : "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",

          /* Border & shadow */
          border: scrolled
            ? "1px solid rgba(43, 92, 255, 0.10)"
            : "1px solid rgba(0, 0, 0, 0.04)",
          borderTop: scrolled ? undefined : "none",
          boxShadow: scrolled
            ? "0 8px 32px rgba(43, 92, 255, 0.08), 0 1px 3px rgba(0,0,0,0.04)"
            : "0 1px 0 rgba(0, 0, 0, 0.04)",

          /* Layout */
          padding: scrolled ? "0 8px" : "0 24px",
          height: scrolled ? "52px" : "64px",
          display: "flex",
          alignItems: "center",

          /* Animation */
          transition: [
            "width 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            "max-width 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            "border-radius 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            "background 0.35s ease",
            "border 0.35s ease",
            "box-shadow 0.35s ease",
            "padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            "height 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          ].join(", "),
        }}
      >
        <div
          className="w-full flex items-center justify-between"
          style={{
            maxWidth: scrolled ? "100%" : "1280px",
            margin: "0 auto",
            padding: scrolled ? "0 12px" : "0 16px",
            transition: "max-width 0.45s cubic-bezier(0.22, 1, 0.36, 1), padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="font-bold tracking-tight text-[#0a1930] hover:text-[#2b5cff] transition-colors duration-300"
            style={{
              fontSize: scrolled ? "18px" : "22px",
              transition: "font-size 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.3s ease",
            }}
          >
            Pravix
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center" style={{ gap: scrolled ? "20px" : "28px", transition: "gap 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {navItems.map((item) => {
              const isActive = item.href.startsWith("/") ? pathname === item.href : false;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="navlink-hover relative"
                  style={{
                    fontSize: scrolled ? "13px" : "14px",
                    fontWeight: 500,
                    color: isActive ? "#2b5cff" : "#5a6b8a",
                    letterSpacing: "0.01em",
                    transition: "font-size 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.25s ease",
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#2b5cff]"
                      style={{
                        bottom: "-6px",
                        height: "2px",
                        width: "16px",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side: CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="hidden sm:flex items-center gap-2 text-white font-semibold rounded-full overflow-hidden relative group"
              style={{
                background: "linear-gradient(135deg, #4066ff 0%, #2b5cff 50%, #1a4bef 100%)",
                padding: scrolled ? "7px 18px" : "9px 22px",
                fontSize: scrolled ? "12px" : "13px",
                boxShadow: "0 4px 16px rgba(43, 92, 255, 0.30)",
                transition: [
                  "padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                  "font-size 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                  "box-shadow 0.3s ease",
                  "transform 0.25s ease",
                ].join(", "),
              }}
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center gap-1.5">
                Get Guidance
                <ArrowRight
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                  style={{ width: scrolled ? "14px" : "16px", height: scrolled ? "14px" : "16px" }}
                />
              </span>
            </Link>
            {isAppShell && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted">
                <UserRound className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* inject nav link hover styles */}
      <style jsx global>{`
        .navlink-hover:hover {
          color: #0a1930 !important;
        }
        .navlink-hover::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 16px;
          height: 2px;
          border-radius: 9999px;
          background: #2b5cff;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .navlink-hover:hover::after {
          transform: translateX(-50%) scaleX(1);
        }
      `}</style>
    </header>
  );
}
