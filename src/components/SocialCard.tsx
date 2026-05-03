"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";

interface SocialCardProps {
  platform: string;
  url: string;
  icon: React.ElementType;
  bio: string;
  ctaText: string;
  color: string;
}

export function SocialCard({
  platform,
  url,
  icon: Icon,
  bio,
  ctaText,
  color,
}: SocialCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-[#e2ebff] bg-white p-6 shadow-[0_8px_28px_rgba(43,92,255,0.06)]"
    >
      {/* Top gradient accent bar on hover */}
      <div
        className="absolute inset-x-0 top-0 h-0 bg-gradient-to-r transition-all duration-300 group-hover:h-1.5"
        style={{
          backgroundImage: `linear-gradient(90deg, ${color}, ${color}88)`,
        }}
      />

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-[40px] transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: `${color}18` }}
      />

      <div className="flex items-start justify-between">
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:rotate-6"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>

      <div className="mt-5 flex-grow">
        <h3 className="text-lg font-bold text-[#0a1930]">{platform}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#586987]">{bio}</p>
      </div>

      <div className="mt-6">
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative overflow-hidden group/btn flex items-center justify-center w-full gap-2 rounded-xl bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#0a1930] border border-[#d8e7ff] shadow-sm transition-all hover:border-transparent"
        >
          <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }} />
          <span className="relative z-10 flex items-center gap-2 group-hover/btn:text-white transition-colors">
            {ctaText}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </span>
        </Link>
      </div>
    </motion.article>
  );
}
