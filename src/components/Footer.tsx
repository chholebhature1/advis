import Link from "next/link";

const FOOTER_LINKS = {
  platform: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Get Guidance", href: "/onboarding" },
  ],
  company: [
    { label: "About Pravix", href: "/about" },
    { label: "Pravix Team", href: "/about#team" },
    { label: "Blog & Insights", href: "/learn" },
    { label: "Contact Us", href: "mailto:support@pravixwealth.com" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Disclosures", href: "/disclosures" },
    { label: "SEBI Disclaimer", href: "/disclosures#sebi" },
  ],
};

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/pravixwealth",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "Twitter / X",
    href: "https://twitter.com/pravixwealth",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com/pravixwealth",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" />
      </svg>
    ),
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-finance-border/40 bg-[#0d1525] text-white mt-auto">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1 max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-white">Pravix</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2b5cff] border border-[#2b5cff]/40 rounded-full px-2 py-0.5">Wealth</span>
            </div>
            <p className="text-sm leading-relaxed text-white/55">
              India&apos;s first goal-based AI wealth platform. Built for Indian families who want calm, confident, and tax-efficient investing.
            </p>

            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35 mb-2">Contact</p>
              <a href="mailto:support@pravixwealth.com" className="text-sm text-white/60 hover:text-white transition-colors">
                support@pravixwealth.com
              </a>
              <p className="mt-1 text-xs text-white/35">Mumbai, Maharashtra, India</p>
            </div>

            {/* Social links */}
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform column */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40 mb-5">Platform</h5>
            <ul className="space-y-3">
              {FOOTER_LINKS.platform.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/55 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40 mb-5">Company</h5>
            <ul className="space-y-3">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/55 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40 mb-5">Legal</h5>
            <ul className="space-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/55 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Compliance bar */}
      <div className="border-t border-white/8">
        <div className="mx-auto max-w-7xl px-5 py-5 pb-[96px] sm:pb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[11px] leading-relaxed text-white/35">
                <strong className="text-white/50">SEBI Disclaimer:</strong>{" "}
                Pravix Wealth Management is not a registered investment advisor under SEBI (Investment Advisers) Regulations, 2013.
                Content on this platform is for educational and informational purposes only and does not constitute personalized
                investment advice. Please consult a SEBI-registered advisor before making investment decisions.
              </p>
              <p className="text-[11px] leading-relaxed text-white/30">
                Investments are subject to market risks. Past performance is not indicative of future returns.
                Mutual fund investments are subject to market risks — read all scheme related documents carefully.
              </p>
              <p className="text-[11px] text-white/25">
                AMFI-registered distributor information: ARN – [Pending registration] &nbsp;|&nbsp; CIN: [Pending incorporation]
              </p>
            </div>
            <p className="shrink-0 text-[11px] text-white/30 md:text-right">
              © {currentYear} Pravix Wealth Management.<br className="hidden md:block" /> All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
