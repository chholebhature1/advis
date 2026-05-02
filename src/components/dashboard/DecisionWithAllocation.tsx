"use client";

import { motion } from "framer-motion";
import { Coins, Shield, TrendingUp, Wallet } from "lucide-react";
import { formatCurrencyINR } from "@/lib/format";

export type AllocationBucketType = "equity" | "debt" | "gold" | "liquid";

export interface AllocationItem {
  type: AllocationBucketType;
  pct: number;
  amount: number;
}

export interface DecisionWithAllocationProps {
  totalSip: number;
  allocations: AllocationItem[];
  prefix?: string;
}

const BUCKET_META: Record<
  AllocationBucketType,
  { label: string; bar: string; cardBg: string; icon: string; tooltip: string; Icon: typeof TrendingUp }
> = {
  equity: {
    label: "Equity",
    bar: "bg-blue-500",
    cardBg: "bg-blue-50",
    icon: "text-blue-600",
    tooltip: "Growth engine",
    Icon: TrendingUp,
  },
  debt: {
    label: "Debt",
    bar: "bg-violet-500",
    cardBg: "bg-violet-50",
    icon: "text-violet-600",
    tooltip: "Stability cushion",
    Icon: Shield,
  },
  gold: {
    label: "Gold",
    bar: "bg-amber-400",
    cardBg: "bg-amber-50",
    icon: "text-amber-600",
    tooltip: "Inflation hedge",
    Icon: Coins,
  },
  liquid: {
    label: "Liquid",
    bar: "bg-gray-400",
    cardBg: "bg-gray-50",
    icon: "text-gray-600",
    tooltip: "Emergency buffer",
    Icon: Wallet,
  },
};

const ORDER: AllocationBucketType[] = ["equity", "debt", "gold", "liquid"];

export function DecisionWithAllocation({
  totalSip,
  allocations,
  prefix = "Invest",
}: DecisionWithAllocationProps) {
  if (!totalSip || !allocations?.length) return null;

  // Sort to a stable order so bar + cards always align
  const ordered = ORDER.map((type) => allocations.find((a) => a.type === type)).filter(
    (a): a is AllocationItem => Boolean(a)
  );

  const top = [...ordered].sort((a, b) => b.pct - a.pct)[0];
  const showGrowthHint = top?.type === "equity";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-5">
        {/* LEFT: Decision text */}
        <div className="md:col-span-3">
          <p className="text-lg md:text-xl text-[#0a1930] leading-relaxed">
            {prefix}{" "}
            <span className="font-semibold">{formatCurrencyINR(totalSip)}/month</span> using
            this split:
          </p>
          <p className="mt-2 text-sm md:text-base text-slate-700 leading-relaxed">
            {ordered.map((a, i) => (
              <span key={a.type}>
                <span className="font-semibold">{a.pct}%</span> {BUCKET_META[a.type].label}{" "}
                (<span className="font-semibold">{formatCurrencyINR(a.amount)}</span>)
                {i < ordered.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
          {showGrowthHint && (
            <p className="mt-3 text-xs text-slate-500">Equity drives most of your growth.</p>
          )}
        </div>

        {/* RIGHT: Infographic */}
        <div className="md:col-span-2">
          {/* Stacked bar */}
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label="Allocation breakdown"
          >
            {ordered.map((a, i) => (
              <motion.div
                key={a.type}
                className={BUCKET_META[a.type].bar}
                initial={{ width: 0 }}
                animate={{ width: `${a.pct}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                title={`${BUCKET_META[a.type].label}: ${a.pct}%`}
              />
            ))}
          </div>

          {/* 2x2 mini cards */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ordered.map((a, i) => {
              const meta = BUCKET_META[a.type];
              const Icon = meta.Icon;
              return (
                <motion.div
                  key={a.type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  className={`rounded-lg border border-slate-200 ${meta.cardBg} p-2.5`}
                  title={meta.tooltip}
                  aria-label={`${meta.label} ${a.pct}% ${formatCurrencyINR(a.amount)} — ${meta.tooltip}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${meta.icon}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-bold text-[#0a1930]">{a.pct}%</span>
                    <span className="text-xs font-medium text-slate-600">
                      {formatCurrencyINR(a.amount)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionWithAllocation;
