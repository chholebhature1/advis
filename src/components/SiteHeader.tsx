"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Menu, UserRound, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type HeaderMarketIndicatorId = "NIFTY50" | "BANKNIFTY" | "SENSEX";

type HeaderMarketIndicator = {
  id: HeaderMarketIndicatorId;
  displayName: string;
  value: number;
  changeAbs: number;
  changePct: number;
  trend: "up" | "down" | "flat";
};

type HeaderMarketIndicatorsResponse = {
  indices?: HeaderMarketIndicator[];
};

const TICKER_ORDER: HeaderMarketIndicatorId[] = ["NIFTY50", "SENSEX", "BANKNIFTY"];

const HOME_SCROLL_SECTIONS = [
  { id: "how-it-works", hash: "#how-it-works" },
  { id: "insights", hash: "#insights" },
  { id: "about-us", hash: "#about-us" },
  { id: "blog", hash: "#blog" },
  { id: "contact", hash: "#book-discovery-call" },
  { id: "book-discovery-call", hash: "#book-discovery-call" },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");

  const [scrolled, setScrolled] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [marketTicker, setMarketTicker] = useState<HeaderMarketIndicator[]>([]);
  const [isTickerLoading, setIsTickerLoading] = useState(true);
  const marketTickerRefreshMs = 15000;

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash || "");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, activeHash]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: number | undefined;

    const fetchTicker = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch(`/api/market/indices?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Market ticker failed: ${response.status}`);
        }

        const payload = (await response.json()) as HeaderMarketIndicatorsResponse;
        const indices = Array.isArray(payload.indices) ? payload.indices : [];

        if (mounted && indices.length > 0) {
          setMarketTicker(indices);
        }
      } catch {
        // Keep current values on transient failures.
      } finally {
        if (mounted) {
          setIsTickerLoading(false);
        }
      }
    };

    void fetchTicker();
    refreshTimer = window.setInterval(fetchTicker, marketTickerRefreshMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchTicker();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      if (refreshTimer) {
        window.clearInterval(refreshTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const supabase = (() => {
      try {
        return getSupabaseBrowserClient();
      } catch {
        return null;
      }
    })();

    if (!supabase) {
      if (mounted) {
        setIsAuthenticated(false);
        setSignedInEmail(null);
        setIsAuthResolved(true);
      }
      return;
    }

    const supabaseClient = supabase;

    async function syncCurrentUser() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = session?.user ?? null;

        if (mounted) {
          setIsAuthenticated(Boolean(user));
          setSignedInEmail(user?.email ?? null);
        }
      } catch {
        // Avoid surfacing transient Supabase auth lock contention as a runtime crash.
        if (mounted) {
          setIsAuthenticated(false);
          setSignedInEmail(null);
        }
      } finally {
        if (mounted) {
          setIsAuthResolved(true);
        }
      }
    }

    void syncCurrentUser();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      setIsAuthenticated(Boolean(session?.user));
      setSignedInEmail(session?.user?.email ?? null);
      setIsAuthResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
  const baseNavItems = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Marketplace", href: "/#insights" },
    { label: "Blog", href: "/#blog" },
    { label: "Team Pravix", href: "/#about-us" },
    { label: "Contact", href: "/#book-discovery-call" },
  ];
  const navItems = baseNavItems;

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const syncActiveSection = () => {
      const markerY = window.scrollY + 140;
      const sections: Array<{ hash: string; offsetTop: number }> = [];

      for (const section of HOME_SCROLL_SECTIONS) {
        const element = document.getElementById(section.id);

        if (!element) {
          continue;
        }

        sections.push({
          hash: section.hash,
          offsetTop: element.offsetTop,
        });
      }

      if (sections.length === 0) {
        return;
      }

      let nextHash = "";

      for (const section of sections) {
        if (markerY >= section.offsetTop) {
          nextHash = section.hash;
          continue;
        }

        break;
      }

      setActiveHash((currentHash) => (currentHash === nextHash ? currentHash : nextHash));
    };

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);

    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, [pathname]);

  function isNavItemActive(href: string): boolean {
    if (!href.startsWith("/")) {
      return false;
    }

    const [rawPath, rawHash] = href.split("#");
    const itemPath = rawPath || "/";

    if (!rawHash) {
      return pathname === itemPath;
    }

    if (itemPath === "/") {
      return pathname === "/" && activeHash === `#${rawHash}`;
    }

    return pathname === itemPath;
  }

  /* ─── Main header ─── */
  const marketFormat = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const orderedTicker = TICKER_ORDER.map((id) => marketTicker.find((item) => item.id === id)).filter(
    (item): item is HeaderMarketIndicator => Boolean(item)
  );

  const mobilePanelTop = isMobileViewport ? "122px" : scrolled ? "98px" : "112px";

  const navWidth = isMobileViewport ? "100%" : scrolled ? "min(880px, calc(100% - 32px))" : "100%";
  const navMaxWidth = isMobileViewport ? "100%" : scrolled ? "880px" : "100%";
  const navBorderRadius = isMobileViewport ? "0" : scrolled ? "9999px" : "0";
  const navPadding = isMobileViewport ? "0 16px" : scrolled ? "0 8px" : "0 24px";
  const navHeight = isMobileViewport ? "64px" : scrolled ? "52px" : "64px";
  const navTopPadding = "0";

  return (
    <header
      className="site-header-root fixed top-0 left-0 right-0 z-50 flex w-full flex-col items-center"
      style={{
        padding: navTopPadding,
        transition: "padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div className="w-full border-b border-[#1f3157] bg-[#08142c]/80 backdrop-blur-md">
        <div className="h-9 w-full overflow-hidden px-0 text-[12px] md:text-[13px]">
          {orderedTicker.length > 0 ? (
            <>
              <div className="hidden h-full items-center justify-center md:flex">
                <div className="flex min-w-max items-center gap-6 px-4 md:gap-8 md:px-8 lg:px-10">
                  {orderedTicker.map((item, index) => {
                    const isPositive = item.changePct > 0;
                    const isNegative = item.changePct < 0;
                    const changeColorClass = isPositive ? "text-[#26d790]" : isNegative ? "text-[#ff6b6b]" : "text-[#9db4df]";
                    const signedChangeAbs = `${item.changeAbs >= 0 ? "+" : ""}${item.changeAbs.toFixed(2)}`;
                    const signedChangePct = `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`;
                    const label = item.id === "NIFTY50" ? "Nifty" : item.id === "SENSEX" ? "Sensex" : "Bank Nifty";

                    return (
                      <div key={`${item.id}-${index}`} className="flex min-w-[24rem] items-center justify-center gap-2 text-[#dbe6ff] leading-none">
                        <span className="w-24 text-right font-semibold text-[#c9d9ff]">{label}</span>
                        <span className="w-32 text-right font-semibold text-white tabular-nums">{marketFormat.format(item.value)}</span>
                        <span className={`w-36 text-left font-semibold tabular-nums ${changeColorClass}`}>
                          {signedChangeAbs} ({signedChangePct})
                        </span>
                        {index < orderedTicker.length - 1 ? <span className="pl-2 text-[#5f7396]">|</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid h-full grid-cols-3 items-center gap-1.5 px-2 md:hidden">
                {orderedTicker.map((item) => {
                  const isPositive = item.changePct > 0;
                  const isNegative = item.changePct < 0;
                  const changeColorClass = isPositive ? "text-[#26d790]" : isNegative ? "text-[#ff6b6b]" : "text-[#9db4df]";
                  const signedChangeAbs = `${item.changeAbs >= 0 ? "+" : ""}${item.changeAbs.toFixed(2)}`;
                  const signedChangePct = `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`;
                  const label = item.id === "NIFTY50" ? "Nifty" : item.id === "SENSEX" ? "Sensex" : "Bank Nifty";

                  return (
                    <div key={`mobile-${item.id}`} className="flex h-7 flex-col items-center justify-center rounded-full border border-white/10 bg-white/5 px-1 text-center leading-none text-[#dbe6ff]">
                      <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#c9d9ff]">{label}</span>
                      <span className="mt-0.5 text-[9px] font-semibold text-white tabular-nums">{marketFormat.format(item.value)}</span>
                      <span className={`text-[8px] font-semibold tabular-nums ${changeColorClass}`}>
                        {signedChangeAbs} ({signedChangePct})
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center px-4 md:px-8 lg:px-10">
              <span className="text-[#b7c9ee]">{isTickerLoading ? "Loading market data..." : "Market data unavailable right now."}</span>
            </div>
          )}
        </div>
      </div>

      <nav
        className="site-header-nav"
        style={{
          /* Dimensions & shape */
          width: navWidth,
          maxWidth: navMaxWidth,
          borderRadius: navBorderRadius,

          /* Background & blur */
          background: scrolled
            ? "rgba(255, 255, 255, 0.72)"
            : "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",

          /* Border & shadow */
          border: scrolled
            ? "1px solid rgba(43, 92, 255, 0.14)"
            : "1px solid rgba(0, 0, 0, 0.04)",
          borderTop: scrolled ? undefined : "none",
          boxShadow: scrolled
            ? "0 8px 28px rgba(43, 92, 255, 0.12), 0 1px 3px rgba(0,0,0,0.04)"
            : "0 1px 0 rgba(0, 0, 0, 0.04)",

          /* Layout */
          padding: navPadding,
          height: navHeight,
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
            padding: isMobileViewport ? "0 16px" : scrolled ? "0 12px" : "0 16px",
            transition: "max-width 0.45s cubic-bezier(0.22, 1, 0.36, 1), padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 font-bold tracking-tight text-[#142a4a] transition-colors duration-300 hover:text-[#2b5cff]"
            style={{
              fontSize: scrolled ? "18px" : "22px",
              transition: "font-size 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.3s ease",
            }}
            aria-label="Pravix home"
          >
            <span className="relative inline-flex h-9 w-9 flex-none items-center justify-center overflow-visible mr-7">
              <Image
                src="/image/pravix-visualmark.png"
                alt="Pravix visual mark"
                width={36}
                height={36}
                className="h-9 w-9 scale-[3] object-contain transition-transform duration-300 group-hover:-translate-y-0.5"
                priority
              />
            </span>
            <span className="leading-none">Pravix</span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center" style={{ gap: scrolled ? "20px" : "28px", transition: "gap 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="navlink-hover relative"
                  style={{
                    fontSize: scrolled ? "13px" : "14px",
                    fontWeight: 500,
                    color: isActive ? "#2b5cff" : "#5f7396",
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
          <div className="flex items-center gap-2.5">
            <Link
              href="/onboarding"
              className="inline-flex md:hidden h-9 items-center justify-center rounded-full bg-[#2b5cff] px-3.5 text-[11px] font-semibold text-white shadow-[0_6px_14px_rgba(43,92,255,0.28)]"
            >
              Goal Onboarding
            </Link>

            <button
              type="button"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-panel"
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted hover:text-finance-text"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {!isAuthResolved ? (
              <span className="hidden md:inline-flex h-8 w-8 animate-pulse items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted">
                <UserRound className="h-3.5 w-3.5" />
              </span>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/onboarding"
                  className="hidden sm:flex items-center gap-2 text-white font-semibold rounded-full overflow-hidden relative group"
                  style={{
                    background: "#2b5cff",
                    padding: isMobileViewport ? "9px 22px" : scrolled ? "7px 18px" : "9px 22px",
                    fontSize: isMobileViewport ? "13px" : scrolled ? "12px" : "13px",
                    boxShadow: "0 4px 14px rgba(43, 92, 255, 0.28)",
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
                <Link
                  href="/profile"
                  aria-label={signedInEmail ? `Open profile for ${signedInEmail}` : "Open profile"}
                  title={signedInEmail ?? "Profile"}
                  className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted hover:text-finance-text"
                >
                  <UserRound className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center rounded-full border border-finance-border bg-white/80 text-finance-text font-semibold hover:bg-white"
                  style={{
                    fontSize: isMobileViewport ? "13px" : scrolled ? "12px" : "13px",
                    padding: isMobileViewport ? "8px 14px" : scrolled ? "6px 12px" : "8px 14px",
                    transition: "font-size 0.45s cubic-bezier(0.22, 1, 0.36, 1), padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  Login
                </Link>

                <Link
                  href="/onboarding"
                  className="hidden sm:flex items-center gap-2 text-white font-semibold rounded-full overflow-hidden relative group"
                  style={{
                    background: "#2b5cff",
                    padding: isMobileViewport ? "9px 22px" : scrolled ? "7px 18px" : "9px 22px",
                    fontSize: isMobileViewport ? "13px" : scrolled ? "12px" : "13px",
                    boxShadow: "0 4px 14px rgba(43, 92, 255, 0.28)",
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

                <Link
                  href="/login"
                  aria-label="Open login"
                  className="hidden sm:hidden h-8 w-8 items-center justify-center rounded-full border border-finance-border bg-finance-surface text-finance-muted hover:text-finance-text"
                >
                  <UserRound className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div
        id="mobile-nav-panel"
        className={`md:hidden fixed left-4 right-4 overflow-hidden rounded-2xl border border-[#cbdaf5]/90 bg-white/95 shadow-[0_16px_36px_rgba(20,42,74,0.18)] backdrop-blur-xl transition-all duration-300 ${isMobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}
        style={{ top: mobilePanelTop }}
      >
        <div className="p-2.5">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item.href);

            return (
              <Link
                key={`mobile-${item.label}`}
                href={item.href}
                className={`block rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${isActive ? "bg-[#edf4ff] text-[#2b5cff]" : "text-[#4d6389] hover:bg-[#f5f8ff] hover:text-[#1d3561]"}`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-2 grid gap-2 p-1">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-[#d6e3fa] bg-white px-4 py-2.5 text-sm font-semibold text-[#274a86]"
                >
                  Profile
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2b5cff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.35)]"
                >
                  Get Guidance
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-[#d6e3fa] bg-white px-4 py-2.5 text-sm font-semibold text-[#274a86]"
                >
                  Login
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2b5cff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.35)]"
                >
                  Get Guidance
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

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
        @media (max-width: 640px) {
          .site-header-root {
            padding: 0 !important;
          }

          .site-header-nav {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            padding: 0 14px !important;
            height: 64px !important;
          }

          .site-header-nav > div {
            padding: 0 14px !important;
          }
        }
      `}</style>
    </header>
  );
}
