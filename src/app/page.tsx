"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Target, ShieldCheck, Compass, BarChart3 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import HeroPhoneMockup from "@/components/HeroPhoneMockup";

export default function Home() {
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [activeHeroBanner, setActiveHeroBanner] = useState(0);

  const heroBanners = [
    "/image/banner1%20(1).webp",
    "/image/banner2%20(1).webp",
    "/image/banner3%20(1).webp",
  ];

  useEffect(() => {
    // Shorter fallback since no video is loaded
    const fallbackTimer = window.setTimeout(() => {
      setIsHeroReady(true);
    }, 500);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const bannerTimer = window.setInterval(() => {
      setActiveHeroBanner((prev) => (prev + 1) % heroBanners.length);
    }, 4500);

    return () => {
      window.clearInterval(bannerTimer);
    };
  }, [heroBanners.length]);

  return (
    <>
      {!isHeroReady && (
        <div className="fixed inset-0 z-[120] bg-white flex items-center justify-center">
          <div className="text-center px-6">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-gray-400">Loading Pravix Experience</p>
          </div>
        </div>
      )}

      <SiteHeader />
      <div className={`flex flex-col min-h-screen transition-opacity duration-700 ${isHeroReady ? "opacity-100" : "opacity-0"}`}>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden min-h-screen pt-24 pb-12 md:pt-28">
          <div className="absolute inset-0">
            {heroBanners.map((banner, index) => (
              <div
                key={banner}
                className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1600ms] ${
                  activeHeroBanner === index ? "opacity-100" : "opacity-0"
                }`}
                style={{ backgroundImage: `url('${banner}')` }}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,16,37,0.68),rgba(5,16,37,0.5)_38%,rgba(255,255,255,0.12)_100%)]" />
          </div>

          <div className="relative z-20 mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14 flex flex-col lg:flex-row items-center lg:items-center gap-12 lg:gap-6 min-h-[calc(100vh-7rem)]">
            
            {/* Left: Hero Content */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-[38rem] relative z-20 w-full">

              <div className="mb-8 flex w-full justify-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-blue-50 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e0ff] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e0ff]"></span>
                  </span>
                  Wealth planning for every Indian
                </div>
              </div>

              {/* Glassmorphism brand box — guaranteed fully centered content */}
              <div className="relative mb-10 w-full rounded-[2rem] border border-white/20 bg-gradient-to-b from-white/15 to-white/5 p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden group">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1),transparent_70%)]" />
                <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-[#00e0ff]/15 rounded-full blur-[80px]" />
                
                <div className="relative z-10 flex flex-col items-center justify-center w-full">
                  <h1 className="flex flex-col items-center justify-center w-full text-center m-0">
                    <span
                      className="block text-[clamp(3.8rem,9vw,6.5rem)] leading-[0.85] tracking-[-0.04em] text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] font-extrabold w-full text-center"
                      style={{ fontFamily: 'var(--font-brand)' }}
                    >
                      Pravix
                    </span>
                    <span className="mt-4 block text-[clamp(0.75rem,1.8vw,1.1rem)] font-bold uppercase tracking-[0.45em] text-[#00e0ff] drop-shadow-[0_2px_8px_rgba(0,224,255,0.3)] w-full text-center pl-1">
                      Wealth Management
                    </span>
                  </h1>
                  
                  <div className="mt-8 h-px w-2/3 max-w-[240px] bg-gradient-to-r from-transparent via-[#00e0ff]/60 to-transparent" />
                  
                  <p className="mt-6 text-xs md:text-[13px] font-medium tracking-[0.05em] text-blue-50/90 max-w-sm text-center uppercase leading-relaxed">
                    India&apos;s first goal-based AI wealth platform
                  </p>
                </div>
              </div>

              {/* Tagline Container centered to align with the Pravix headline box */}
              <div className="w-full flex flex-col items-center text-center">
                <h2 className="text-2xl md:text-[2rem] font-bold text-white mb-5 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] leading-tight">
                  Powered by{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f8aff] to-[#00e0ff]">
                    Smart AI Insights
                  </span>
                </h2>

                <p className="text-blue-100/90 font-medium text-base md:text-lg max-w-lg mb-10 leading-[1.7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                  Share your goals and preferences, and Pravix will create a clear path to grow your wealth — simple, transparent, and built entirely for you.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                  <Link
                    href="/onboarding"
                    className="group flex w-full sm:w-auto items-center justify-center gap-3 bg-gradient-to-r from-[#2b5cff] to-[#1e4bff] text-white hover:from-[#1e4bff] hover:to-[#0f3bf0] px-9 py-4.5 rounded-full text-base font-semibold transition-all shadow-[0_8px_25px_rgba(43,92,255,0.4)] hover:shadow-[0_12px_35px_rgba(43,92,255,0.6)] hover:-translate-y-0.5 border border-[#4f8aff]/30"
                  >
                    Get Personalized AI Insight
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                  <Link
                    href="/onboarding"
                    className="group flex w-full sm:w-auto items-center justify-center gap-3 border-2 border-white/60 bg-transparent text-white hover:bg-white/10 px-9 py-4 rounded-full text-base font-semibold transition-all hover:-translate-y-0.5"
                  >
                    Talk to Expert
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Animated Phone Mockup */}
            <div className="flex-1 flex justify-center lg:justify-end w-full max-w-md lg:max-w-lg">
              <HeroPhoneMockup />
            </div>

          </div>
        </section>

        {/* SECTION 1: SOLID BLUE PLATFORM PREVIEW */}
        <section id="insights" className="relative w-full z-30 bg-[#2b5cff] min-h-screen overflow-hidden text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,224,255,0.15),transparent_40%)]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20 md:px-10 lg:px-14">
            <div className="w-full max-w-2xl lg:ml-auto">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#00e0ff]">Your Pravix AI Insights Are Based On</p>
              <h3 className="mt-3 text-3xl font-bold leading-tight text-white md:text-5xl">Your Goals &amp; Financial Priorities</h3>
              <p className="mt-4 text-base leading-relaxed text-blue-100 md:text-lg">
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
                  <div key={i} className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-4">
                    <div className="flex items-start gap-4">
                      <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#00e0ff] text-xs font-bold text-[#2b5cff]">
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="text-lg font-bold text-white">{item.title}</h4>
                        <p className="mt-1 text-sm leading-relaxed text-blue-50 md:text-base">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Video showcase – left side */}
            <div className="hidden lg:block absolute left-10 top-1/2 -translate-y-1/2 w-[500px] h-[600px]">
                <div className="w-full h-full rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
                  {/* Frosted glass border glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 z-10" />
                  <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#00e0ff]/20 blur-[40px] z-0" />

                  {/* Video */}
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                  >
                    <source src="/video/pravix-sec2.mp4" type="video/mp4" />
                  </video>

                  {/* Bottom gradient overlay to blend with section */}
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#2b5cff]/60 to-transparent z-10 rounded-b-3xl" />
                </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: LIGHT BACKGROUND WHY GOAL BASED INVESTING */}
        <section id="why-goals" className="py-24 bg-[#f8fbff] border-y border-blue-100">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0a1930]">Why Goal-Based Investing?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto font-medium">Investing without a goal is like driving without a destination. We align your money with the life you want to build.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Target, title: "Clear Objectives", desc: "Whether it's a home, retirement, or travel, assigning a purpose to your money helps you stay disciplined." },
                { icon: ShieldCheck, title: "Risk Alignment", desc: "Short-term goals mean lower risk. Long-term goals allow for higher growth potential. We balance it out." },
                { icon: Compass, title: "Peace of Mind", desc: "Stop stressing over daily market swings. Focus on the long-term trajectory of your custom wealth plan." }
              ].map((item, i) => (
                 <div key={i} className="bg-white border border-blue-100 shadow-[0_12px_40px_rgba(43,92,255,0.06)] rounded-2xl p-8 hover:border-[#2b5cff]/30 transition-colors">
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 border border-blue-100">
                    <item.icon className="w-7 h-7 text-[#2b5cff]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#0a1930]">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-medium">{item.desc}</p>
                 </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: SOLID BLUE HOW IT WORKS */}
        <section id="how-it-works" className="py-32 bg-[#2b5cff] text-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="md:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">A human-centric approach to wealth.</h2>
                <div className="space-y-8 mt-12">
                  {[
                    { step: "01", title: "Tell us about yourself", desc: "A simple 2-minute profile to understand your current standing." },
                    { step: "02", title: "Set your milestones", desc: "Define what matters most. A house in 5 years? Retirement in 20?" },
                    { step: "03", title: "Get a custom roadmap", desc: "We'll suggest the right mix of Equity, Debt, and alternatives." },
                    { step: "04", title: "Consult an expert", desc: "Review your plan with a certified advisor to fine-tune it." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white font-bold">{item.step}</div>
                      <div>
                        <h4 className="text-xl font-bold mb-1 text-white">{item.title}</h4>
                        <p className="text-blue-100 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="md:w-1/2 w-full p-8 bg-white text-[#0a1930] shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#00e0ff]/10 blur-[60px]" />
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-[#2b5cff]" />
                      <span className="font-bold text-lg">Sample Allocation</span>
                    </div>
                    <span className="text-xs font-bold text-[#00e0ff] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Goal: Retirement</span>
                  </div>
                  {[
                    { label: "Domestic Equity", val: "65%", color: "bg-[#2b5cff]" },
                    { label: "Debt & Bonds", val: "25%", color: "bg-[#00e0ff]" },
                    { label: "Gold / Commodities", val: "10%", color: "bg-blue-200" }
                  ].map((row, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between text-sm font-semibold">
                         <span className="text-gray-600">{row.label}</span>
                         <span className="text-[#0a1930]">{row.val}</span>
                       </div>
                       <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div className={`h-full ${row.color} rounded-full`} style={{ width: row.val }} />
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: LIGHT BACKGROUND BLOGS */}
        <section id="blogs" className="py-24 border-b border-gray-100 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2b5cff]">Insights Library</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-[#0a1930]">Latest from Pravix Blogs</h2>
                <p className="mt-3 text-gray-600 max-w-2xl font-medium">
                  Practical market explainers, goal-planning playbooks, and expert perspectives to help you make better investment decisions.
                </p>
              </div>
              <Link
                href="#"
                className="inline-flex items-center gap-2 text-[#2b5cff] font-bold hover:text-blue-800 transition-colors"
              >
                View all blogs
                <ArrowRight className="w-5 h-5" />
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
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-6 hover:shadow-[0_12px_40px_rgba(43,92,255,0.08)] hover:-translate-y-1 transition-all"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00e0ff]">{post.category}</p>
                  <h3 className="mt-3 text-xl font-bold text-[#0a1930] leading-snug">{post.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 font-medium">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">{post.meta}</span>
                    <Link href="#" className="inline-flex items-center gap-1 text-sm font-bold text-[#2b5cff] group-hover:text-blue-800 transition-colors">
                      Read article
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA: DARK BACKGROUND */}
        <section className="py-24 bg-[#0a1220]">
          <div className="container mx-auto px-6 max-w-5xl text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
              Start Building Your Wealth Plan Today
            </h2>
            <p className="text-lg md:text-xl font-medium text-gray-400 mb-10">
              Get your personalized insights in minutes.
            </p>
            <div className="flex justify-center">
              <Link
                href="/onboarding"
                className="group inline-flex items-center justify-center gap-2 bg-[#2b5cff] text-white hover:bg-blue-600 px-10 py-5 rounded-full text-base font-bold transition-all shadow-[0_8px_25px_rgba(43,92,255,0.4)]"
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
