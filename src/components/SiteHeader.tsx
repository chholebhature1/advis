"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, ChevronRight, Menu, X } from "lucide-react";
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
const TICKER_POLL_MS = 30_000; // 30s — no need for sub-second ticker on marketing header

const HOME_SCROLL_SECTIONS = [
  { id: "how-it-works", hash: "#how-it-works" },
  { id: "insights", hash: "#insights" },
  { id: "pravix-team", hash: "#pravix-team" },
  { id: "blog", hash: "#blog" },
  { id: "contact", hash: "#book-discovery-call" },
  { id: "book-discovery-call", hash: "#book-discovery-call" },
] as const;

const NAV_ITEMS = [
  { label: "How It Works", href: "/#how-it-works", emoji: "✦" },
  { label: "Dashboard", href: "/dashboard", emoji: "◈" },
  { label: "Marketplace", href: "/#insights", emoji: "◐" },
  { label: "Blog", href: "/#blog", emoji: "◉" },
  { label: "Pravix Team", href: "/#pravix-team", emoji: "◈" },
  { label: "Contact", href: "/#book-discovery-call", emoji: "◎" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");

  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [marketTicker, setMarketTicker] = useState<HeaderMarketIndicator[]>([]);
  const [isTickerLoading, setIsTickerLoading] = useState(true);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, activeHash]);

  /* Lock body scroll when sheet is open */
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isMobileMenuOpen]);

  /* Market ticker — 30s refresh */
  useEffect(() => {
    let mounted = true;
    const fetchTicker = async () => {
      try {
        const response = await fetch(`/api/market/indices?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Ticker error: ${response.status}`);
        const payload = (await response.json()) as HeaderMarketIndicatorsResponse;
        const indices = Array.isArray(payload.indices) ? payload.indices : [];
        if (mounted && indices.length > 0) setMarketTicker(indices);
      } catch {
        // Keep current values on transient failures.
      } finally {
        if (mounted) setIsTickerLoading(false);
      }
    };

    void fetchTicker();
    const refreshTimer = window.setInterval(fetchTicker, TICKER_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  /* Auth state */
  useEffect(() => {
    let mounted = true;
    const supabase = (() => { try { return getSupabaseBrowserClient(); } catch { return null; } })();
    if (!supabase) {
      if (mounted) { setIsAuthenticated(false); setIsAuthResolved(true); }
      return;
    }
    const supabaseClient = supabase;
    async function syncCurrentUser() {
      try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (mounted) { setIsAuthenticated(Boolean(session?.user)); }
      } catch {
        if (mounted) setIsAuthenticated(false);
      } finally {
        if (mounted) setIsAuthResolved(true);
      }
    }
    void syncCurrentUser();
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session?.user));
      setIsAuthResolved(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  /* Active section tracking on scroll */
  useEffect(() => {
    if (pathname !== "/") return;
    const syncActiveSection = () => {
      const markerY = window.scrollY + 140;
      const sections: Array<{ hash: string; offsetTop: number }> = [];
      for (const section of HOME_SCROLL_SECTIONS) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        sections.push({ hash: section.hash, offsetTop: element.offsetTop });
      }
      if (sections.length === 0) return;
      let nextHash = "";
      for (const section of sections) {
        if (markerY >= section.offsetTop) { nextHash = section.hash; continue; }
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
    if (!href.startsWith("/")) return false;
    const [rawPath, rawHash] = href.split("#");
    const itemPath = rawPath || "/";
    if (!rawHash) return pathname === itemPath;
    if (itemPath === "/") return pathname === "/" && activeHash === `#${rawHash}`;
    return pathname === itemPath;
  }

  /* ─── Onboarding Header ─── */
  if (isOnboarding) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-finance-border/40 bg-finance-bg/95 backdrop-blur-sm">
        <div className="mx-auto h-14 max-w-6xl px-4 flex items-center justify-between">
          <Link href="/" className="text-finance-text font-bold tracking-tight text-lg">Pravix</Link>
          <Link href="/" className="text-xs font-medium text-finance-muted hover:text-finance-text px-3 py-2">
            Save & Exit
          </Link>
        </div>
      </header>
    );
  }

  /* ─── Ticker data ─── */
  const marketFormat = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const orderedTicker = TICKER_ORDER.map((id) =>
    marketTicker.find((item) => item.id === id)
  ).filter((item): item is HeaderMarketIndicator => Boolean(item));

  /* ─── Main header ─── */
  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex w-full flex-col items-center"
        style={{
          padding: scrolled ? "10px 16px 0" : "0",
          transition: "padding 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Market ticker bar */}
        <div className="w-full border-b border-[#1f3157] bg-[#08142c]/85 backdrop-blur-md">
          <div className="mx-auto h-8 w-full max-w-[1280px] overflow-hidden">
            {orderedTicker.length > 0 ? (
              <div className="market-ticker-marquee flex h-full items-center">
                <div className="market-ticker-track flex min-w-max items-center gap-4 px-4 md:gap-7 md:px-8">
                  {/* Duplicate for seamless loop */}
                  {[...orderedTicker, ...orderedTicker].map((item, index) => {
                    const isPositive = item.changePct > 0;
                    const isNegative = item.changePct < 0;
                    const color = isPositive ? "text-[#26d790]" : isNegative ? "text-[#ff6b6b]" : "text-[#9db4df]";
                    const signedAbs = `${item.changeAbs >= 0 ? "+" : ""}${item.changeAbs.toFixed(2)}`;
                    const signedPct = `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`;
                    const label = item.id === "NIFTY50" ? "Nifty" : item.id === "SENSEX" ? "Sensex" : "Bank Nifty";
                    return (
                      <div key={`${item.id}-${index}`} className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#dbe6ff] leading-none whitespace-nowrap">
                        <span className="font-semibold text-[#c9d9ff]">{label}</span>
                        <span className="font-bold text-white tabular-nums">{marketFormat.format(item.value)}</span>
                        <span className={`font-semibold tabular-nums ${color}`}>{signedAbs} ({signedPct})</span>
                        <span className="text-[#3d5480] mx-1">|</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center px-4">
                <span className="text-[11px] text-[#b7c9ee]">
                  {isTickerLoading ? "Fetching market data…" : "Market data unavailable."}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main nav pill */}
        <nav
          style={{
            width: scrolled ? "min(860px, calc(100% - 28px))" : "100%",
            maxWidth: scrolled ? "860px" : "100%",
            borderRadius: scrolled ? "9999px" : "0",
            background: scrolled ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px) saturate(1.6)",
            WebkitBackdropFilter: "blur(20px) saturate(1.6)",
            border: scrolled ? "1px solid rgba(43,92,255,0.14)" : "1px solid rgba(0,0,0,0.04)",
            borderTop: scrolled ? undefined : "none",
            boxShadow: scrolled ? "0 8px 28px rgba(43,92,255,0.12), 0 1px 3px rgba(0,0,0,0.04)" : "0 1px 0 rgba(0,0,0,0.04)",
            padding: scrolled ? "0 6px" : "0 16px",
            height: scrolled ? "50px" : "58px",
            display: "flex",
            alignItems: "center",
            transition: [
              "width 0.45s cubic-bezier(0.22,1,0.36,1)",
              "max-width 0.45s cubic-bezier(0.22,1,0.36,1)",
              "border-radius 0.45s cubic-bezier(0.22,1,0.36,1)",
              "background 0.35s ease",
              "border 0.35s ease",
              "box-shadow 0.35s ease",
              "padding 0.45s cubic-bezier(0.22,1,0.36,1)",
              "height 0.45s cubic-bezier(0.22,1,0.36,1)",
            ].join(", "),
          }}
        >
          <div
            className="w-full flex items-center justify-between"
            style={{
              maxWidth: scrolled ? "100%" : "1280px",
              margin: "0 auto",
              padding: scrolled ? "0 10px" : "0 4px",
              transition: "padding 0.45s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* Logo */}
            <Link
              href="/"
              className="font-bold tracking-tight text-[#142a4a] hover:text-[#2b5cff] transition-colors duration-300 flex items-center gap-1.5"
              style={{
                fontSize: scrolled ? "16px" : "19px",
                transition: "font-size 0.45s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              Pravix
            </Link>

            {/* Desktop center nav */}
            <div
              className="hidden md:flex items-center"
              style={{ gap: scrolled ? "18px" : "26px", transition: "gap 0.45s cubic-bezier(0.22,1,0.36,1)" }}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="navlink-hover relative"
                    style={{
                      fontSize: scrolled ? "13px" : "13.5px",
                      fontWeight: 500,
                      color: isActive ? "#2b5cff" : "#5f7396",
                      letterSpacing: "0.01em",
                      transition: "font-size 0.45s cubic-bezier(0.22,1,0.36,1), color 0.25s ease",
                    }}
                  >
                    {item.label}
                    {isActive && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#2b5cff]"
                        style={{ bottom: "-6px", height: "2px", width: "16px" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Mobile hamburger — 44×44 hit target */}
              <button
                type="button"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="md:hidden flex items-center justify-center rounded-full border border-[#cbdaf5] bg-white/90 text-[#4d6389]"
                style={{ width: 38, height: 38 }}
              >
                {isMobileMenuOpen ? <X size={17} strokeWidth={2.2} /> : <Menu size={17} strokeWidth={2.2} />}
              </button>

              {/* Desktop CTA */}
              {isAuthResolved && (
                <Link
                  href="/onboarding"
                  className="hidden sm:flex items-center gap-1.5 text-white font-semibold rounded-full overflow-hidden relative group"
                  style={{
                    background: "#2b5cff",
                    padding: scrolled ? "6px 16px" : "8px 20px",
                    fontSize: scrolled ? "12px" : "13px",
                    boxShadow: "0 4px 14px rgba(43,92,255,0.28)",
                    transition: "padding 0.45s cubic-bezier(0.22,1,0.36,1), font-size 0.45s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-1">
                    {isAuthenticated ? "Get Guidance" : "Get Started"}
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" size={scrolled ? 13 : 14} />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile bottom-sheet overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-sheet-overlay md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile bottom-sheet */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          isMobileMenuOpen ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{
          borderRadius: "24px 24px 0 0",
          background: "#ffffff",
          boxShadow: "0 -12px 48px rgba(20,42,74,0.22)",
          paddingBottom: `max(20px, env(safe-area-inset-bottom, 20px))`,
        }}
        aria-label="Navigation menu"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#d1ddf5]" />
        </div>

        {/* Nav links */}
        <div className="px-4 pt-2 pb-2">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8196b8]">Navigate</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item.href);
              return (
                <Link
                  key={`mobile-${item.label}`}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-colors ${
                    isActive
                      ? "bg-[#edf4ff] text-[#2b5cff]"
                      : "text-[#2d4470] hover:bg-[#f5f8ff]"
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronRight size={16} className={isActive ? "text-[#2b5cff]" : "text-[#8196b8]"} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="px-4 pt-3 border-t border-[#eaf0fb] space-y-2.5">
          {isAuthResolved && !isAuthenticated && (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center rounded-2xl border border-[#cbdaf5] bg-white py-3.5 text-[15px] font-semibold text-[#142a4a]"
            >
              Login
            </Link>
          )}
          <Link
            href="/onboarding"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#2b5cff] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(43,92,255,0.38)]"
          >
            {isAuthenticated ? "Get Guidance" : "Start for Free"}
            <ArrowRight size={16} />
          </Link>
          {/* Trust signal */}
          <p className="text-center text-[11px] text-[#8196b8] py-1">
            🔒 Bank-grade security · No spam · Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
}
