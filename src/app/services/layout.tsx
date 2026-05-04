import type { Metadata } from "next";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Services — HNI, Mutual Funds, Corporate Bonds & Alternatives",
  description:
    "Explore Pravix wealth management services: HNI portfolios, mutual fund advisory, corporate bond strategies, and alternative investments for Indian families.",
  keywords: [
    "Pravix services",
    "HNI wealth management India",
    "mutual fund advisory India",
    "corporate bonds India",
    "alternative investments India",
    "wealth management services",
  ],
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Pravix Services — Comprehensive Wealth Management",
    description:
      "From HNI portfolios to mutual fund advisory — explore how Pravix helps Indian families build and protect wealth.",
    url: absoluteUrl("/services"),
    type: "website",
    images: [{ url: defaultOgImage, alt: "Pravix Wealth Management Services" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pravix Services — Comprehensive Wealth Management",
    description:
      "From HNI portfolios to mutual fund advisory — explore how Pravix helps Indian families build and protect wealth.",
    images: [defaultOgImage],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
