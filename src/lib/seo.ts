// ────────────────────────────────────────────────────────────────
// Core identifiers
// ────────────────────────────────────────────────────────────────

export const siteName = "Pravix Wealth Management";
export const siteShortName = "Pravix";
export const siteDescription =
  "Pravix helps Indian families plan, track, and optimize long-term wealth goals using disciplined systems, real market context, and expert-backed guidance.";
export const siteTagline = "Goal-Based Wealth Planning for Indian Families";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteUrl = configuredSiteUrl && configuredSiteUrl.length > 0
  ? configuredSiteUrl.replace(/\/+$/, "")
  : "https://pravix.in";

export const defaultOgImage = "/image/hero-banner-3.png";

export const defaultSeoKeywords = [
  "Pravix",
  "Pravix Wealth",
  "Pravix Wealth Management",
  "financial planning India",
  "wealth management India",
  "goal-based investing",
  "SIP calculator India",
  "investment planning tool",
  "SIP planning tool India",
  "best financial planner India",
  "wealth planning platform India",
  "tax optimization India",
  "portfolio insights",
  "smart investment planning",
];

// ────────────────────────────────────────────────────────────────
// Social profiles (single source of truth)
// ────────────────────────────────────────────────────────────────

export const socialProfiles = {
  instagram: "https://www.instagram.com/pravixwealth/",
  linkedin: "https://www.linkedin.com/company/pravix-wealth-management/",
  youtube: "https://www.youtube.com/@PRAVIXwealth",
  facebook: "https://www.facebook.com/people/Pravix-Wealth-Management/61588755566789/",
} as const;

export const socialProfileUrls = Object.values(socialProfiles);

// ────────────────────────────────────────────────────────────────
// URL helpers
// ────────────────────────────────────────────────────────────────

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

// ────────────────────────────────────────────────────────────────
// JSON-LD Structured Data generators (SSR-safe, no runtime logic)
// ────────────────────────────────────────────────────────────────

/** Organization schema — brand identity for Google Knowledge Panel */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: siteName,
    alternateName: siteShortName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/image/pravix-visualmark.png"),
    description: siteDescription,
    foundingDate: "2025",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    sameAs: socialProfileUrls,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

/** WebSite schema — brand identity in SERPs */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: siteShortName,
    url: absoluteUrl("/"),
    description: siteDescription,
    inLanguage: "en-IN",
  };
}

/** SoftwareApplication schema — for the platform itself */
export function productJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pravix — Financial Planning Tool",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description:
      "AI-powered goal-based financial planning tool for Indian families. Smart SIP planning, portfolio analysis, and wealth projections.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };
}

/** FAQ schema — pass an array of {question, answer} pairs */
export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** BreadcrumbList schema — for navigation breadcrumbs */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
