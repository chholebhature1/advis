import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { blogPosts, getBlogPostBySlug } from "../blog-data";
import { absoluteUrl, siteName } from "@/lib/seo";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog Not Found",
      description: "The requested blog article is not available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = absoluteUrl(`/learn/${post.slug}`);

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/learn/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      siteName,
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: [post.author],
      tags: post.tags,
      images: [{ url: post.coverImage, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

function getRelatedPosts(slug: string) {
  const current = getBlogPostBySlug(slug);
  if (!current) {
    return [];
  }

  return blogPosts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const overlap = post.tags.filter((tag) => current.tags.includes(tag)).length;
      return { post, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map(({ post }) => post);
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-finance-bg pb-16 pt-24">
        <div className="mx-auto w-full max-w-4xl px-6">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 text-sm font-medium text-finance-muted transition-colors hover:text-finance-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Learn
          </Link>

          <article className="mt-6 rounded-2xl border border-finance-border/70 bg-finance-panel p-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-finance-muted">
              <span>{new Date(post.publishedAt).toLocaleDateString("en-IN")}</span>
              <span className="text-finance-border">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-finance-border/60 bg-finance-surface/70 p-3.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-finance-accent/10 text-sm font-semibold text-finance-accent">
                {post.author.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold text-finance-text">{post.author}</p>
                <p className="text-xs text-finance-muted">{post.role}</p>
              </div>
            </div>

            <h1 className="mt-3 text-3xl font-semibold leading-tight text-finance-text md:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-finance-muted md:text-lg">{post.excerpt}</p>

            <div className="mt-5 grid gap-3 rounded-xl border border-finance-border/60 bg-finance-surface/55 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-finance-muted">Why I wrote this</p>
                <p className="mt-1 text-sm leading-relaxed text-finance-text">{post.personalNote}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-finance-muted">Who should read this</p>
                <p className="mt-1 text-sm leading-relaxed text-finance-text">{post.whoShouldRead}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-finance-border/60 bg-finance-bg/65 p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-finance-muted">Key takeaways</p>
              <ul className="mt-2 space-y-2">
                {post.keyTakeaways.map((takeaway) => (
                  <li key={takeaway} className="flex items-start gap-2 text-sm leading-relaxed text-finance-text">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-finance-accent" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-finance-border/70 bg-finance-surface px-3 py-1 text-xs text-finance-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-finance-border/60">
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1600}
                height={900}
                className="h-full max-h-[380px] w-full object-cover"
                priority
              />
            </div>

            <div className="prose prose-neutral mt-8 max-w-none text-finance-text prose-headings:text-finance-text prose-p:text-finance-muted">
              {post.sections.map((section) => (
                <section key={section.heading} className="mt-8 first:mt-0">
                  <h2 className="text-2xl font-semibold">{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-finance-muted">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-finance-text">Related articles</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/learn/${related.slug}`}
                  className="rounded-xl border border-finance-border/70 bg-finance-panel p-4 transition-colors hover:bg-finance-surface"
                >
                  <div className="overflow-hidden rounded-md border border-finance-border/60">
                    <Image
                      src={related.coverImage}
                      alt={related.title}
                      width={800}
                      height={450}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium text-finance-text">{related.title}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-finance-accent">
                    Read article
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
