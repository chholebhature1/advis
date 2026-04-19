/**
 * Homepage entry point.
 *
 * HomepageClient contains all the interactive state (market polling, AI chat,
 * framer-motion animations). We keep this wrapper file thin so that Next.js
 * can tree-shake everything that doesn't belong on the homepage route.
 */
"use client";

export { default } from "@/components/HomepageClient";
