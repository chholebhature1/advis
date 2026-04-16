export const siteName = "Pravix Wealth Management";
export const siteShortName = "Pravix";
export const siteDescription =
  "Pravix helps Indian families plan, track, and optimize long-term wealth goals using disciplined systems, real market context, and expert-backed guidance.";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteUrl = configuredSiteUrl && configuredSiteUrl.length > 0
  ? configuredSiteUrl.replace(/\/+$/, "")
  : "https://pravix.in";

export const defaultOgImage = "/image/hero-banner-3.png";

export const defaultSeoKeywords = [
  "wealth management India",
  "goal-based investing",
  "financial planning",
  "SIP planning",
  "tax optimization India",
  "portfolio insights",
  "Pravix",
];

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}
