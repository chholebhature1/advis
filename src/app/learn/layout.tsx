import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Learn",
  description: "Personal finance, tax, and investing articles from Pravix experts for Indian households.",
  alternates: {
    canonical: "/learn",
  },
  openGraph: {
    title: "Pravix Learn | Personal Wealth Notes",
    description: "Personal finance, tax, and investing articles from Pravix experts for Indian households.",
    url: "/learn",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pravix Learn | Personal Wealth Notes",
    description: "Personal finance, tax, and investing articles from Pravix experts for Indian households.",
    images: [defaultOgImage],
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
