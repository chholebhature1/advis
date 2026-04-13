import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
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
  title: "Pravix Wealth Management | Goal-Based Investing",
  description: "wealth planning for every indian",
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
        <main className="flex-grow flex flex-col">{children}</main>
        <GlobalFloatingPravixChat />
        <Footer />
      </body>
    </html>
  );
}
