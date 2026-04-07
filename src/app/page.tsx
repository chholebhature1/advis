"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Target, ShieldCheck, Compass, BarChart3 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  const [isHeroReady, setIsHeroReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setIsHeroReady(true);
    }, 6000);

    const video = videoRef.current;

    if (video && video.readyState >= 3) {
      setIsHeroReady(true);
    }

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleHeroReady = () => {
    setIsHeroReady(true);
  };

  return (
    <>
      {!isHeroReady && (
        <div className="fixed inset-0 z-[120] bg-[#04070f] flex items-center justify-center">
          <div className="text-center px-6">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-finance-border border-t-finance-accent animate-spin" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-finance-dim">Loading Pravix Experience</p>
          </div>
        </div>
      )}

      <SiteHeader />
      <div className={`flex flex-col min-h-screen transition-opacity duration-700 ${isHeroReady ? "opacity-100" : "opacity-0"}`}>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 min-h-screen pt-24 pb-12 md:pt-28">
          {/* Background Video */}
          <video
            ref={videoRef}
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            onLoadedData={handleHeroReady}
            onCanPlayThrough={handleHeroReady}
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/video/pravix%20hero%20video.mp4" type="video/mp4" />
          </video>

          {/* Dark Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.48),rgba(0,0,0,0.36)_35%,rgba(0,0,0,0.56))]" />
          
          {/* Content Wrapper */}
          <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-5xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/45 border border-white/20 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-finance-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-finance-green"></span>
              </span>
              wealth planning for every indian
            </div>

            <div className="relative mb-8 w-full max-w-4xl rounded-[1.75rem] border border-white/20 bg-[linear-gradient(135deg,rgba(3,7,18,0.5),rgba(10,18,32,0.18))] px-5 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:px-10">
              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/10" />
              <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-white/75">
                <span className="max-w-[34rem] text-[11px] tracking-[0.03em] text-white/80 md:text-xs">
                  India&apos;s first platform to give live Goal Based AI Insight with expert guidance
                </span>
              </div>
              <h1 className="relative text-white text-center leading-none">
                <span
                  className="block text-[clamp(3.35rem,10vw,7.3rem)] tracking-[-0.035em] text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  Pravix
                </span>
                <span className="mt-3 block text-[clamp(0.86rem,2.1vw,1.2rem)] font-semibold uppercase tracking-[0.38em] text-white/85">
                  Wealth Management
                </span>
              </h1>
              <div className="mx-auto mt-6 h-[2px] w-48 bg-[linear-gradient(90deg,transparent,rgba(209,250,229,0.95),transparent)]" />
            </div>
            
            <h2 className="text-xl md:text-[2rem] font-light text-gray-100 mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-[0.02em]">
              Powered by{' '}
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-300">
                Smart AI Insights
              </span>
            </h2>
            
            <p className="text-gray-100/95 font-medium text-base md:text-xl max-w-3xl text-balance mb-10 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] leading-relaxed">
              Share your goals and preferences, and Pravix will create a clear path to grow your wealth—simple, transparent, and easy to follow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/onboarding"
                className="group flex items-center justify-center gap-2 bg-finance-text text-finance-bg hover:bg-gray-200 px-8 py-4 rounded-full text-base font-medium transition-all shadow-xl"
              >
                Get Personalized AI Insight
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/onboarding"
                className="group flex items-center justify-center gap-2 border border-white/35 bg-black/25 text-white hover:bg-white/10 px-8 py-4 rounded-full text-base font-medium transition-all"
              >
                Talk to Expert
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* PLATFORM PREVIEW IMAGE - FULL WIDTH */}
        <section id="insights" className="relative w-full z-30 bg-finance-bg min-h-screen overflow-hidden">
          <img 
            src="/image/pravix%20img%202.webp" 
            alt="Pravix Wealth Platform Preview" 
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.24)_45%,rgba(0,0,0,0.72)_100%)]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20 md:px-10 lg:px-14">
            <div className="w-full max-w-2xl lg:ml-auto">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300/95">Your Pravix AI Insights Are Based On</p>
              <h3 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">Your Goals &amp; Financial Priorities</h3>
              <p className="mt-4 text-base leading-relaxed text-white/88 md:text-lg">
                Every recommendation is shaped around what matters most to you.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Market Trends & Data Signals",
                    detail: "Insights reflect current market movements and evolving patterns.",
                  },
                  {
                    title: "Expert-Backed Analysis",
                    detail: "Guidance informed by Pravix's investment professionals and research.",
                  },
                  {
                    title: "Global Economic Developments",
                    detail: "Broader events that influence markets and long-term opportunities.",
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-2xl border border-white/18 bg-black/28 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-emerald-300/80 text-[11px] font-semibold text-emerald-200">
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-white/82 md:text-base">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHY GOAL BASED INVESTING */}
        <section id="why-goals" className="py-24 bg-finance-surface/50 border-y border-finance-border/50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Goal-Based Investing?</h2>
              <p className="text-finance-muted max-w-2xl mx-auto">Investing without a goal is like driving without a destination. We align your money with the life you want to build.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Target, title: "Clear Objectives", desc: "Whether it's a home, retirement, or travel, assigning a purpose to your money helps you stay disciplined." },
                { icon: ShieldCheck, title: "Risk Alignment", desc: "Short-term goals mean lower risk. Long-term goals allow for higher growth potential. We balance it out." },
                { icon: Compass, title: "Peace of Mind", desc: "Stop stressing over daily market swings. Focus on the long-term trajectory of your custom wealth plan." }
              ].map((item, i) => (
                <div key={i} className="bg-finance-bg border border-finance-border rounded-2xl p-8 hover:border-finance-green/50 transition-colors">
                  <div className="w-12 h-12 bg-finance-surface rounded-xl flex items-center justify-center mb-6 border border-finance-border">
                    <item.icon className="w-6 h-6 text-finance-green" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-finance-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-32">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="md:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">A human-centric approach to wealth.</h2>
                <div className="space-y-8 mt-12">
                  {[
                    { step: "01", title: "Tell us about yourself", desc: "A simple 2-minute profile to understand your current standing." },
                    { step: "02", title: "Set your milestones", desc: "Define what matters most. A house in 5 years? Retirement in 20?" },
                    { step: "03", title: "Get a custom roadmap", desc: "We'll suggest the right mix of Equity, Debt, and alternatives." },
                    { step: "04", title: "Consult an expert", desc: "Review your plan with a certified advisor to fine-tune it." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full border border-finance-border flex items-center justify-center bg-finance-surface text-finance-muted font-mono">{item.step}</div>
                      <div>
                        <h4 className="text-lg font-semibold mb-1">{item.title}</h4>
                        <p className="text-finance-muted">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="md:w-1/2 w-full p-8 bg-gradient-to-br from-finance-surface to-finance-bg border border-finance-border rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-finance-accent/10 blur-[80px]" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between border-b border-finance-border pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-finance-green" />
                      <span className="font-semibold">Sample Allocation</span>
                    </div>
                    <span className="text-xs text-finance-muted">Goal: Retirement</span>
                  </div>
                  {[
                    { label: "Domestic Equity", val: "65%", color: "bg-finance-green" },
                    { label: "Debt & Bonds", val: "25%", color: "bg-finance-accent" },
                    { label: "Gold / Commodities", val: "10%", color: "bg-indigo-500" }
                  ].map((row, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-finance-muted">{row.label}</span>
                        <span className="font-medium text-finance-text">{row.val}</span>
                      </div>
                      <div className="h-2 w-full bg-finance-bg rounded-full overflow-hidden">
                        <div className={`h-full ${row.color}`} style={{ width: row.val }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOGS SECTION */}
        <section id="blogs" className="py-24 border-t border-finance-border/60 bg-finance-bg">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Insights Library</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-white">Latest from Pravix Blogs</h2>
                <p className="mt-3 text-finance-muted max-w-2xl">
                  Practical market explainers, goal-planning playbooks, and expert perspectives to help you make better investment decisions.
                </p>
              </div>
              <Link
                href="#"
                className="inline-flex items-center gap-2 text-finance-text hover:text-emerald-300 transition-colors font-medium"
              >
                View all blogs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  category: "Goal Planning",
                  title: "How to Build a 10-Year Wealth Plan Around Life Milestones",
                  excerpt: "A simple framework to map your goals, estimate required corpus, and align monthly investing with timelines.",
                  meta: "6 min read",
                },
                {
                  category: "Market Signals",
                  title: "What Market Volatility Means for Long-Term Investors",
                  excerpt: "Understand corrections, cycles, and how data-driven allocation can reduce emotional decision-making.",
                  meta: "5 min read",
                },
                {
                  category: "Expert Guidance",
                  title: "When Should You Rebalance Your Portfolio?",
                  excerpt: "Learn the right triggers for rebalancing and how professionals maintain risk discipline over time.",
                  meta: "7 min read",
                },
              ].map((post, i) => (
                <article
                  key={i}
                  className="group rounded-2xl border border-finance-border bg-finance-surface/40 p-6 hover:border-emerald-300/50 transition-colors"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-emerald-300/90">{post.category}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white leading-snug">{post.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-finance-muted">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-finance-muted">{post.meta}</span>
                    <Link href="#" className="inline-flex items-center gap-1 text-sm text-finance-text group-hover:text-emerald-300 transition-colors">
                      Read article
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 border-t border-finance-border/60 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_42%),linear-gradient(to_bottom,#02050f,#030712)]">
          <div className="container mx-auto px-6 max-w-5xl text-center">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Start Building Your Wealth Plan Today
            </h2>
            <p className="mt-4 text-base md:text-xl text-finance-muted">
              Get your personalized insights in minutes.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/onboarding"
                className="group inline-flex items-center justify-center gap-2 bg-finance-text text-finance-bg hover:bg-gray-200 px-8 py-4 rounded-full text-base font-medium transition-all shadow-xl"
              >
                Get Personalized AI Insights
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
