"use client";

import { Target, AlertCircle, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface GapDominancePanelProps {
  goalAmount: number;
  likelyCorpus: number;
  gapAmount: number;
  percentageOfGoal: number;
  timeYears: number;
  feasibility: "comfortable" | "tight" | "stretched" | "not_viable";
  primaryLever?: string;
  secondaryLever?: string;
  primaryActionType?: string;
}

export function GapDominancePanel({
  goalAmount,
  likelyCorpus,
  gapAmount,
  percentageOfGoal,
  timeYears,
  feasibility,
  primaryLever,
  secondaryLever,
  primaryActionType,
}: GapDominancePanelProps) {
  const isUnviable = feasibility === "not_viable" || feasibility === "stretched";
  
  const formatCompactInr = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm transition-all ${
        isUnviable 
          ? "border-red-200 bg-gradient-to-br from-red-50/50 to-white" 
          : "border-blue-100 bg-gradient-to-br from-blue-50/30 to-white"
      }`}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isUnviable ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          }`}>
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a1930]">Reality Gap Analysis</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#5f7396] font-black">
              Goal vs. Projected Trajectory
            </p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
          isUnviable ? "bg-red-600 text-white" : "bg-blue-600 text-white"
        }`}>
          {feasibility.replace("_", " ")}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f7396]">Target Goal</p>
          <p className="text-2xl font-bold text-[#0a1930]">{formatCompactInr(goalAmount)}</p>
          <p className="text-[10px] text-[#5f7396]">In {timeYears} years</p>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f7396]">Projected Corpus</p>
          <p className="text-2xl font-bold text-[#0a1930]">{formatCompactInr(likelyCorpus)}</p>
          <p className="text-[10px] text-[#5f7396]">At likely returns</p>
        </div>

        <div className="space-y-1">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isUnviable ? "text-red-500" : "text-blue-500"}`}>Absolute Gap</p>
          <p className={`text-2xl font-bold ${isUnviable ? "text-red-600" : "text-[#0a1930]"}`}>
            {gapAmount > 0 ? formatCompactInr(gapAmount) : "₹0"}
          </p>
          <p className="text-[10px] text-[#5f7396]">Shortfall to bridge</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5f7396]">Path Comparison</span>
            <span className="text-xs font-bold text-[#0a1930]">{percentageOfGoal.toFixed(1)}% achieved</span>
          </div>
          
          <div className="relative h-4 w-full rounded-full bg-slate-100 overflow-hidden">
            {/* Scenario A: Current Trajectory */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentageOfGoal, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`absolute top-0 left-0 h-full rounded-full z-10 ${
                isUnviable ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-blue-600 to-blue-400"
              }`}
            />
            {/* Goal Line */}
            <div className="absolute top-0 right-0 h-full w-px bg-slate-300 z-20" />
          </div>
          
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${isUnviable ? "bg-red-500" : "bg-blue-600"}`} />
              <span className="text-[10px] font-bold text-[#5f7396]">Scenario A: Current Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-[#5f7396]">Scenario B: Corrected Path</span>
            </div>
          </div>
        </div>

        {isUnviable && (primaryLever || secondaryLever) && (
          <div className="grid grid-cols-2 gap-3">
            {primaryLever && (
              <div className="rounded-xl border border-red-100 bg-white p-3 shadow-sm ring-1 ring-red-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-600">Primary Lever</p>
                </div>
                <p className="text-xs font-bold text-slate-900">{primaryLever}</p>
                <div className="mt-1 flex items-center justify-between">
                   <p className="text-[9px] text-slate-500 font-medium">High Impact</p>
                   {primaryActionType && (
                     <span className="text-[8px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                       {primaryActionType.replace('_', ' ')}
                     </span>
                   )}
                </div>
              </div>
            )}
            {secondaryLever && (
              <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Secondary</p>
                <p className="text-xs font-bold text-slate-900">{secondaryLever}</p>
                <p className="text-[9px] text-slate-500 mt-1 font-medium italic">Supportive Lever</p>
              </div>
            )}
          </div>
        )}

        {isUnviable && (
          <div className="rounded-2xl bg-red-50 p-4 border border-red-100 flex gap-4">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-900">Critical Shortfall Detected</p>
              <p className="text-xs text-red-800 leading-relaxed">
                Your projected corpus covers only {percentageOfGoal.toFixed(1)}% of your target. 
                This setup is not viable without a major adjustment in either your monthly investment or timeline.
              </p>
            </div>
          </div>
        )}

        {!isUnviable && (
          <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100 flex gap-4">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-900">Path Secure</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Your current trajectory is well-aligned with your {formatCompactInr(goalAmount)} goal. 
                Maintaining consistency is the key to locking in these results.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
