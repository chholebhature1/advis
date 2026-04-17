import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/image/about-aditya-saini.jpg",
        destination: "/image/aditya-saini-profile-2026.jpg",
        permanent: true,
      },
    ];
  },
  trailingSlash: true,
};

export default nextConfig;
