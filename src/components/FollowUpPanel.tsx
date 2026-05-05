"use client";

import React, { useState } from "react";
import { FinancialSnapshot, AgentExplanationOutput } from "@/lib/agent/types";
import QuickConnectButton from "./QuickConnectButton";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Loader2, Info, Sparkles, PlusCircle, Lock } from "lucide-react";

const MAX_FREE_QUESTIONS = 3;

interface FollowUpPanelProps {
  snapshot: FinancialSnapshot;
  explanation: AgentExplanationOutput;
}

export const FollowUpPanel: React.FC<FollowUpPanelProps> = ({
  snapshot,
  explanation,
}) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  const isLocked = questionCount >= MAX_FREE_QUESTIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/agent/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, snapshot, explanation }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnswer(data.answer);
        setQuestion("");
        setQuestionCount((prev) => prev + 1);
      } else {
        setError(data.error || "Failed to get an answer.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative mt-10 overflow-hidden rounded-[2.5rem] border border-blue-100 bg-white p-8 shadow-[0_20px_70px_-10px_rgba(43,92,255,0.08)] transition-all hover:shadow-[0_30px_80px_-15px_rgba(43,92,255,0.12)]">
      {/* Soft Background Accents */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50 blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-50/50 blur-[80px]" />

      <div className="relative flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_8px_20px_-5px_rgba(43,92,255,0.4)]">
            <MessageSquare size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-[#0a1930] sm:text-2xl">
              Ask AI Copilot
            </h3>
            <p className="text-sm font-semibold text-[#4a628b] opacity-70">
              Personalized intelligence for your wealth journey
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 sm:flex">
          <Sparkles size={14} className="text-blue-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-800">Intelligence Active</span>
        </div>
      </div>

      {isLocked ? (
        <div className="relative mb-8 rounded-[2rem] border border-[#e1ebff] bg-gradient-to-br from-[#f8faff] to-[#f0f5ff] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b5cff]/10">
            <Lock size={24} className="text-[#2b5cff]" />
          </div>
          <h4 className="mt-4 text-lg font-bold text-[#0a1930]">You&apos;ve used your free questions</h4>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#5f7396]">
            Connect with our wealth experts for detailed, personalized guidance on your financial plan.
          </p>
          <div className="mt-5 flex justify-center">
            <QuickConnectButton variant="accent" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative mb-8">
          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-[#f0f4ff] bg-[#f8faff] transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about your plan?"
              className="w-full bg-transparent py-5 pl-7 pr-20 text-base font-bold text-[#0a1930] placeholder-[#94a3b8] outline-none transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="absolute right-3 top-2.5 flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#2b5cff] text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1e49d3] active:scale-95 disabled:bg-blue-100"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={18} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </form>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-5 text-sm text-red-900"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Info size={14} />
            </div>
            <p className="font-bold leading-relaxed">{error}</p>
          </motion.div>
        )}

        {answer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative mb-8 rounded-[2rem] border border-blue-50 bg-[#f0f7ff] p-7 shadow-[inset_0_2px_10px_rgba(43,92,255,0.03)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#2b5cff]">
                Wealth Intelligence Report
              </span>
            </div>
            <p className="text-base leading-relaxed text-[#0a1930] font-bold">
              {answer}
            </p>
            <div className="mt-6 flex items-center justify-end">
              <button 
                onClick={() => setAnswer(null)}
                className="group flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#94a3b8] hover:text-[#2b5cff] transition-all"
              >
                <PlusCircle size={14} className="transition-transform group-hover:rotate-45" />
                Ask Another Question
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLocked && !answer && !isLoading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            "Why is timeline the issue?",
            "What if I increase SIP?",
            "Is this plan safe?",
            "Explain trade-offs",
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
              className="flex items-center justify-between rounded-2xl border border-[#f0f4ff] bg-[#f8faff] p-5 text-left text-[13px] font-black tracking-tight text-[#0a1930] transition-all hover:border-blue-200 hover:bg-white hover:shadow-[0_10px_30px_-10px_rgba(43,92,255,0.1)] active:scale-[0.98]"
            >
              {suggestion}
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ArrowUpRight size={14} strokeWidth={3} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ArrowUpRight = ({ size, strokeWidth = 2, className }: { size: number; strokeWidth?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);
