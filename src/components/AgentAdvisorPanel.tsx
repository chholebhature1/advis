"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";
import {
  AIInsightChips,
  DashboardSectionCard,
  EmptyState,
} from "@/components/dashboard/DashboardPrimitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AgentStructuredAnswer = {
  recommendation: string;
  reason: string;
  riskWarning: string;
  nextAction: string;
};

export type AiInsightUserProfile = {
  age: number | null;
  goals: string[];
  risk: string;
  preferences: string[];
};

type AgentChatMessage = {
  role: "user" | "assistant";
  content: string;
  structured?: AgentStructuredAnswer | null;
  sentAt: string;
};

type AgentConversationStep = "collecting_goal" | "collecting_profile";

type AiInsightResponse = {
  insight?: unknown;
  fallbackUsed?: boolean;
};

type AgentAdvisorPanelProps = {
  refreshKey: number;
  userProfile: AiInsightUserProfile;
};

const FALLBACK_STRUCTURED: AgentStructuredAnswer = {
  recommendation: "Unable to generate advice right now",
  reason: "Temporary issue",
  riskWarning: "Please consult a financial advisor",
  nextAction: "Try again later",
};

const PERSONALIZATION_QUESTIONS = [
  "What is your monthly take-home salary and your average monthly expenses?",
  "How much do you already have saved or invested that can be used for this goal?",
  "What are your current EMIs or debts, and how much can you realistically invest every month?",
];

function buildPersonalizationPrompt(goal: string): string {
  return [
    `Great goal: ${goal}`,
    "",
    "To give you a more personalized and useful plan, please share 3 quick details:",
    ...PERSONALIZATION_QUESTIONS.map((question, index) => `${index + 1}. ${question}`),
    "",
    "Reply in one message using 1, 2, 3 format.",
  ].join("\n");
}

function toStructuredField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStructuredAnswer(value: unknown): AgentStructuredAnswer | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const maybe = value as Record<string, unknown>;
  const recommendation = toStructuredField(maybe.recommendation);
  const reason = toStructuredField(maybe.reason);
  const riskWarning = toStructuredField(maybe.risk_warning ?? maybe.riskWarning);
  const nextAction = toStructuredField(maybe.next_action ?? maybe.nextAction);

  if (!recommendation || !reason || !riskWarning || !nextAction) {
    return null;
  }

  return {
    recommendation,
    reason,
    riskWarning,
    nextAction,
  };
}

export default function AgentAdvisorPanel({ refreshKey, userProfile }: AgentAdvisorPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationStep, setConversationStep] = useState<AgentConversationStep>("collecting_goal");
  const [pendingGoal, setPendingGoal] = useState<string | null>(null);

  const starterPrompts = conversationStep === "collecting_profile"
    ? [
        "Salary: INR 1,20,000; Expenses: INR 65,000",
        "Savings/assets for this goal: INR 4,50,000",
        "EMIs: INR 18,000; Monthly investable: INR 25,000",
      ]
    : [
        "I want to buy a 20 lakh car in 3 years. How should I plan?",
        "I want to create a 1 crore retirement corpus. What should I do monthly?",
        "I want a house down payment in 4 years. How should I invest?",
      ];

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: authSessionError } = await supabase.auth.getSession();

    if (authSessionError) {
      throw authSessionError;
    }

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Authentication session expired. Please sign in again.");
    }

    return token;
  }, []);

  const callAgentEndpoint = useCallback(async <TResponse,>(path: string, init?: RequestInit): Promise<TResponse> => {
    const token = await getAccessToken();
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string } & TResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? `Request failed for ${path}.`);
    }

    return payload;
  }, [getAccessToken]);

  const formatTime = useCallback((isoValue: string) => {
    return new Date(isoValue).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  useEffect(() => {
    setError(null);
    setMessages([]);
    setInput("");
    setConversationStep("collecting_goal");
    setPendingGoal(null);
  }, [refreshKey]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isSending) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextUserMessage: AgentChatMessage = { role: "user", content: message, sentAt: nowIso };

    setMessages((previous) => [...previous, nextUserMessage]);
    setInput("");
    setError(null);

    if (conversationStep === "collecting_goal") {
      setPendingGoal(message);
      setConversationStep("collecting_profile");
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: buildPersonalizationPrompt(message),
          sentAt: new Date().toISOString(),
        },
      ]);

      return;
    }

    const goalContext = pendingGoal ?? "User wants practical financial planning guidance";
    const normalizedProfileAnswer = message.replace(/\s+/g, " ").trim();
    const enrichedQuestion = [
      `Primary user goal: ${goalContext}`,
      `Personal details shared by user: ${message}`,
      "Use these details to give more personalized guidance.",
    ].join("\n");

    const enrichedProfile: AiInsightUserProfile = {
      ...userProfile,
      goals: [goalContext, ...userProfile.goals].slice(0, 8),
      preferences: [
        ...userProfile.preferences,
        `User financial details: ${normalizedProfileAnswer.slice(0, 220)}`,
      ].slice(0, 8),
    };

    setIsSending(true);

    try {
      const payload = await callAgentEndpoint<AiInsightResponse>("/api/ai/insight", {
        method: "POST",
        body: JSON.stringify({
          question: enrichedQuestion,
          userProfile: enrichedProfile,
        }),
      });

      const structured = normalizeStructuredAnswer(payload.insight) ?? FALLBACK_STRUCTURED;
      const summaryText = [
        `Recommendation: ${structured.recommendation}`,
        `Reason: ${structured.reason}`,
        `Risk warning: ${structured.riskWarning}`,
        `Next action: ${structured.nextAction}`,
      ].join("\n\n");

      if (payload.fallbackUsed) {
        setError("Pravix AI is connected but currently in fallback mode. Please re-try shortly.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: summaryText,
          structured,
          sentAt: new Date().toISOString(),
        },
      ]);

      setConversationStep("collecting_goal");
      setPendingGoal(null);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Could not send message to AI advisor.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <DashboardSectionCard
      eyebrow="AI Wealth Advisor"
      title="Pravix Copilot"
      description="Ask a goal-based question and get structured financial guidance."
    >
      {conversationStep === "collecting_profile" && (
        <div className="mt-4 rounded-xl border border-finance-accent/20 bg-finance-accent/10 px-3 py-2 text-xs text-finance-text sm:mt-5">
          Personalization step active: share salary, existing assets, and monthly investable capacity for a better answer.
        </div>
      )}

      {starterPrompts.length > 0 && (
        <div className="mt-4 sm:mt-5">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-finance-muted">Quick prompts</p>
          <AIInsightChips items={starterPrompts} onClick={(prompt) => void sendMessage(prompt)} disabled={isSending} />
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-finance-surface/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(10,25,48,0.06)] sm:mt-5 sm:p-5">
        <div className="max-h-72 space-y-3 overflow-y-auto pr-0.5 sm:space-y-3.5 sm:pr-1">
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Ask a question to start a personalized strategy conversation based on your profile and portfolio context."
            />
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg p-3 text-sm ${
                  message.role === "assistant"
                    ? "bg-white/95 text-finance-text shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_14px_rgba(10,25,48,0.08)]"
                    : "bg-finance-accent text-white shadow-[0_4px_14px_rgba(43,92,255,0.24)]"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-[0.1em] ${message.role === "assistant" ? "text-finance-muted" : "text-white/80"}`}>
                  {message.role === "assistant" ? "advisor" : "you"} · {formatTime(message.sentAt)}
                </p>
                {message.role === "assistant" && message.structured ? (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-finance-border bg-finance-surface/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-muted">Recommendation</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.recommendation}</p>
                    </div>
                    <div className="rounded-lg border border-finance-border bg-finance-surface/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-muted">Reason</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.reason}</p>
                    </div>
                    <div className="rounded-lg border border-finance-red/20 bg-finance-red/10 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-red">Risk Warning</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-red">{message.structured.riskWarning}</p>
                    </div>
                    <div className="rounded-lg border border-finance-accent/20 bg-finance-accent/10 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-accent">Next Action</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.nextAction}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2.5 sm:mt-5">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isSending}
            placeholder={
              conversationStep === "collecting_profile"
                ? "Reply with salary, existing assets, and EMIs/monthly investable amount"
                : "Ask: I want to buy 20 lakh car in 3 years. How should I plan?"
            }
            className="h-11 flex-1 rounded-xl border border-transparent bg-white px-3.5 text-sm text-finance-text shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_8px_rgba(10,25,48,0.05)] transition-colors focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-finance-accent px-4 text-sm font-semibold text-white transition-all duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red sm:p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-finance-muted">
        Educational guidance only. Validate suitability before investing.
      </p>
    </DashboardSectionCard>
  );
}

