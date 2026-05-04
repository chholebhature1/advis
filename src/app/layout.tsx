import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import {
  absoluteUrl,
  defaultOgImage,
  defaultSeoKeywords,
  organizationJsonLd,
  productJsonLd,
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const GlobalFloatingPravixChat = dynamic(() => import("@/components/GlobalFloatingPravixChat"), {
  loading: () => null,
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | ${siteTagline}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: defaultSeoKeywords,
  authors: [{ name: "Pravix Wealth Management", url: absoluteUrl("/") }],
  creator: "Pravix Wealth Management",
  publisher: "Pravix Wealth Management",
  category: "Finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: absoluteUrl("/"),
    siteName,
    title: `${siteName} | ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${siteName} — ${siteTagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | ${siteTagline}`,
    description: siteDescription,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b5cff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${jakartaSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased bg-finance-bg text-finance-text min-h-screen flex flex-col font-sans`}
      >
        <GoogleAnalytics />
        {/* Organization schema — Google Knowledge Panel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {/* WebSite schema — sitelinks search box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        {/* SoftwareApplication schema — product rich result */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd()) }}
        />
        <main className="flex-grow flex flex-col">{children}</main>
        <GlobalFloatingPravixChat />
        <Footer />
      </body>
    </html>
  );
}
