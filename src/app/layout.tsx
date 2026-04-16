import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import { absoluteUrl, defaultOgImage, defaultSeoKeywords, siteDescription, siteName, siteShortName, siteUrl } from "@/lib/seo";
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
    default: "Pravix Wealth Management | Goal-Based Investing",
    template: "%s | Pravix Wealth Management",
  },
  description: siteDescription,
  keywords: defaultSeoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: absoluteUrl("/"),
    siteName,
    title: "Pravix Wealth Management | Goal-Based Investing",
    description: siteDescription,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Pravix Wealth Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pravix Wealth Management | Goal-Based Investing",
    description: siteDescription,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="en">
      <body
        className={`${jakartaSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased bg-finance-bg text-finance-text min-h-screen flex flex-col font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: siteName,
              alternateName: siteShortName,
              url: absoluteUrl("/"),
              description: siteDescription,
              inLanguage: "en-IN",
              potentialAction: {
                "@type": "SearchAction",
                target: `${absoluteUrl("/")}?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <main className="flex-grow flex flex-col">{children}</main>
        <GlobalFloatingPravixChat />
        <Footer />
      </body>
    </html>
  );
}
