import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Compass, Mail, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { FaInstagram, FaLinkedin, FaYoutube, FaFacebook } from "react-icons/fa";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Learn", href: "/learn" },
  { label: "Team Pravix", href: "/about" },
  { label: "Book Discovery Call", href: "/#book-discovery-call" },
  { label: "Get Started", href: "/onboarding" },
];

const resourceLinks = [
  { label: "Sign In", href: "/login" },
  { label: "Create Account", href: "/create-account" },
  { label: "Member Profile", href: "/profile" },
  { label: "Smart Insights", href: "/#insights" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Book a Call", href: "/#book-discovery-call" },
];

const supportLinks = [
  { label: "Get Started", href: "/onboarding" },
  { label: "Login", href: "/login" },
  { label: "Create Account", href: "/create-account" },
  { label: "Profile", href: "/profile" },
];

export default function Footer() {
  return (
    <footer id="contact" className="mt-auto border-t border-[#e1e7f2] bg-[#081424] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 lg:px-14">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a8c1ff]">
                <Sparkles className="h-3.5 w-3.5 text-[#8de4ff]" />
                Pravix Wealth Management
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#c5d1e8] md:text-base">
                Goal-based wealth planning for Indian families, with dashboards, market context, and guided onboarding.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/#contact-us"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2b5cff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,92,255,0.32)] transition-transform hover:-translate-y-0.5"
              >
                Book a discovery call
                <CalendarDays className="h-4 w-4" />
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Start onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8aa2ca]">About</h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#c5d1e8]">
                Pravix helps households organize goals, tax planning, and investment decisions into one disciplined system.
              </p>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8aa2ca]">Quick Links</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#c5d1e8]">
                {quickLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                      <Compass className="h-3.5 w-3.5 text-[#7f97bf]" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8aa2ca]">Resources</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#c5d1e8]">
                {resourceLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                      <BookOpen className="h-3.5 w-3.5 text-[#7f97bf]" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8aa2ca]">Account</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#c5d1e8]">
                {supportLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                      <Mail className="h-3.5 w-3.5 text-[#7f97bf]" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pb-2">
            <Link href="https://www.instagram.com/pravixwealth/" target="_blank" className="group flex items-center gap-2.5 text-sm font-medium text-[#8aa2ca] transition-colors hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-[#E1306C] group-hover:shadow-[0_0_12px_rgba(225,48,108,0.5)]">
                <FaInstagram className="h-4 w-4" />
              </span>
              Instagram
            </Link>
            <Link href="https://www.linkedin.com/company/pravix-wealth-management/" target="_blank" className="group flex items-center gap-2.5 text-sm font-medium text-[#8aa2ca] transition-colors hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-[#0A66C2] group-hover:shadow-[0_0_12px_rgba(10,102,194,0.5)]">
                <FaLinkedin className="h-4 w-4" />
              </span>
              LinkedIn
            </Link>
            <Link href="https://www.youtube.com/@PRAVIXwealth" target="_blank" className="group flex items-center gap-2.5 text-sm font-medium text-[#8aa2ca] transition-colors hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-[#FF0000] group-hover:shadow-[0_0_12px_rgba(255,0,0,0.5)]">
                <FaYoutube className="h-4 w-4" />
              </span>
              YouTube
            </Link>
            <Link href="https://www.facebook.com/people/Pravix-Wealth-Management/61588755566789/" target="_blank" className="group flex items-center gap-2.5 text-sm font-medium text-[#8aa2ca] transition-colors hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-[#1877F2] group-hover:shadow-[0_0_12px_rgba(24,119,242,0.5)]">
                <FaFacebook className="h-4 w-4" />
              </span>
              Facebook
            </Link>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl text-xs leading-relaxed text-[#8fa3c8]">
              <p>
                <strong className="text-white">Disclaimer:</strong> Pravix provides educational and informational content. It is not personalized investment advice.
              </p>
              <p className="mt-2">
                Investments are subject to market risk. Review relevant documents carefully and consult a qualified professional before making decisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#a8c1ff]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#8de4ff]" />
                Privacy-aware
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#8de4ff]" />
                Education-first
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#8de4ff]" />
                Market-aware
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-[#7f97bf] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Pravix Wealth Management. All rights reserved.</p>
            <p>India-focused wealth planning for households and professionals.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
