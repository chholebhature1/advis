"use client";

import dynamic from "next/dynamic";

const HomepageClient = dynamic(() => import("@/components/HomepageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center px-6">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-gray-200 border-t-[#2b5cff] animate-spin" />
        <p className="mt-4 text-sm uppercase tracking-[0.18em] text-gray-400">
          Loading Pravix
        </p>
      </div>
    </div>
  ),
});

export default function HomepageWrapper() {
  return <HomepageClient />;
}
