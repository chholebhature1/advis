"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Search } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { blogPosts } from "./blog-data";

const journeySteps = [
  {
    label: "Step 01",
    title: "Basic Profile",
    body: "Establish your digital wealth identity with encrypted protocols so your plan starts on a secure and trustworthy foundation.",
    points: ["Bank-grade encryption protocols", "Zero-knowledge data storage"],
  },
  {
    label: "Step 02",
    title: "Goals & Preferences",
    body: "Define your timeline, risk tolerance, and financial priorities to shape a strategy that reflects your personal ambitions.",
    points: ["Conservative to growth options", "Goal-led allocation framework"],
  },
  {
    label: "Step 03",
    title: "Personalized Suggestions",
    body: "Pravix analyzes your profile against live market signals and presents a practical, goal-aligned investment blueprint.",
    points: ["Live data signal mapping", "Scenario-backed recommendations"],
  },
  {
    label: "Final Touch",
    title: "Expert Consultation",
    body: "Partner with an investment specialist to validate assumptions, refine allocation, and plan execution with confidence.",
    points: ["1-on-1 strategy call", "Actionable next steps"],
  },
];

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    blogPosts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
    return ["All", ...Array.from(tags)];
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return blogPosts.filter((post) => {
      const matchesTag = selectedTag === "All" || post.tags.includes(selectedTag);
      if (!normalizedQuery) {
        return matchesTag;
      }

      const matchesQuery =
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesTag && matchesQuery;
    });
  }, [searchQuery, selectedTag]);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <section className="text-center max-w-4xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.2em] text-finance-muted">The Pravix Journey</p>
            <h1 className="mt-3 text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-finance-text">
              The Path to <span className="text-finance-green">Financial Clarity</span>
            </h1>
            <p className="mt-5 text-finance-muted text-lg">
              Wealth planning for every Indian. Algorithmic precision, expert oversight, and disciplined execution.
            </p>
          </section>

          <section className="relative mt-16">
            <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-finance-border/70 hidden md:block" />
            <div className="space-y-10">
              {journeySteps.map((step, idx) => (
                <article key={step.title} className="grid md:grid-cols-2 gap-6 items-center">
                  <div className={idx % 2 === 0 ? "md:order-1" : "md:order-2"}>
                    <div className="rounded-2xl border border-finance-border/70 bg-finance-panel p-6">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-finance-green">{step.label}</p>
                      <h2 className="mt-2 text-3xl font-semibold text-finance-text">{step.title}</h2>
                      <p className="mt-3 text-finance-muted leading-relaxed">{step.body}</p>
                      <ul className="mt-5 space-y-2">
                        {step.points.map((point) => (
                          <li key={point} className="flex items-center gap-2 text-sm text-finance-muted">
                            <CheckCircle2 className="w-4 h-4 text-finance-green" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={idx % 2 === 0 ? "md:order-2" : "md:order-1"}>
                    <div className="h-full min-h-48 rounded-2xl border border-finance-border/70 bg-finance-surface/80 p-6 flex items-center justify-center">
                      <div className="w-full rounded-xl border border-finance-border/70 bg-finance-bg/75 p-4">
                        <div className="h-2 w-24 rounded bg-finance-border mb-3" />
                        <div className="h-2 w-40 rounded bg-finance-border mb-3" />
                        <div className="h-2 w-32 rounded bg-finance-border" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="personal-wealth-notes" className="mt-16 scroll-mt-28 rounded-2xl border border-finance-border/70 bg-finance-panel p-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-finance-muted">Knowledge Hub</p>
            <h2 className="mt-2 text-4xl font-semibold text-finance-text">Personal Wealth Notes</h2>
            <p className="mx-auto mt-3 max-w-2xl text-finance-muted">
              Real-world writing from planners and analysts who work with Indian households every day.
              Each post includes practical context, decision frameworks, and clear next steps.
            </p>

            <div className="mx-auto mt-8 grid w-full max-w-3xl gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-finance-muted" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search blogs by title, topic, or tag"
                  className="w-full rounded-lg border border-finance-border/70 bg-finance-bg py-2.5 pl-10 pr-4 text-sm text-finance-text outline-none ring-finance-accent transition focus:ring-2"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? "border-finance-accent bg-finance-accent text-white"
                          : "border-finance-border/70 bg-finance-surface text-finance-muted hover:text-finance-text"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-5 text-left md:grid-cols-2">
              {filteredPosts.map((post) => (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-xl border border-finance-border/70 bg-finance-surface/70"
                >
                  <div className="border-b border-finance-border/60">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={1600}
                      height={900}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-finance-muted">
                      <span>{new Date(post.publishedAt).toLocaleDateString("en-IN")}</span>
                      <span className="text-finance-border">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-finance-muted">
                      By {post.author} · {post.role}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-finance-text">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-finance-muted">{post.excerpt}</p>

                    <div className="mt-3 rounded-lg border border-finance-border/60 bg-finance-bg/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">Personal Note</p>
                      <p className="mt-1 line-clamp-2 text-sm italic leading-relaxed text-finance-text">{post.personalNote}</p>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-finance-muted">What you&apos;ll learn</p>
                      <ul className="mt-1.5 space-y-1 text-sm text-finance-muted">
                        {post.keyTakeaways.slice(0, 2).map((takeaway) => (
                          <li key={takeaway} className="flex items-start gap-2 leading-relaxed">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-finance-accent" />
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-finance-border/70 bg-finance-bg px-2.5 py-1 text-[11px] text-finance-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/learn/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-finance-accent"
                    >
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {filteredPosts.length === 0 ? (
              <p className="mt-6 text-sm text-finance-muted">
                No matching articles found. Try a broader keyword or switch to another category.
              </p>
            ) : null}
          </section>

          <section className="mt-10 rounded-2xl border border-finance-border/70 bg-finance-panel p-8 text-center">
            <h2 className="text-4xl font-semibold text-finance-text">Ready to secure your legacy?</h2>
            <p className="mt-3 text-finance-muted">Join investors moving from uncertainty to disciplined wealth creation.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-lg bg-finance-accent px-6 py-3 text-white font-semibold shadow-[0_8px_20px_rgba(43,92,255,0.22)] hover:brightness-95">
                Get Started Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-finance-border-soft px-6 py-3 text-finance-text hover:bg-finance-surface/80">
                View Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

