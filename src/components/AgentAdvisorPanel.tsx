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

type AgentChatMessage = {
  role: "user" | "assistant";
  content: string;
  structured?: AgentStructuredAnswer | null;
  sentAt: string;
};

type AgentBootstrapResponse = {
  greeting: string;
  starterPrompts: string[];
};

type AgentDashboardResponse = {
  aiSummary: string;
};

type AgentChatResponse = {
  reply: string;
  structured?: unknown;
};

type AgentAdvisorPanelProps = {
  refreshKey: number;
};

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

  const maybe = value as Partial<Record<keyof AgentStructuredAnswer, unknown>>;
  const recommendation = toStructuredField(maybe.recommendation);
  const reason = toStructuredField(maybe.reason);
  const riskWarning = toStructuredField(maybe.riskWarning);
  const nextAction = toStructuredField(maybe.nextAction);

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

export default function AgentAdvisorPanel({ refreshKey }: AgentAdvisorPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>("Hi, I am your Pravix AI advisor.");
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");

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
    let cancelled = false;

    async function loadAgent() {
      setIsLoading(true);
      setError(null);

      try {
        const [bootstrap, dashboard] = await Promise.all([
          callAgentEndpoint<AgentBootstrapResponse>("/api/agent/bootstrap", { method: "GET" }),
          callAgentEndpoint<AgentDashboardResponse>("/api/agent/dashboard", { method: "GET" }),
        ]);

        if (cancelled) {
          return;
        }

        setGreeting(bootstrap.greeting);
        setStarterPrompts(bootstrap.starterPrompts ?? []);
        setDashboardSummary(dashboard.aiSummary ?? null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load AI advisor context.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAgent();

    return () => {
      cancelled = true;
    };
  }, [callAgentEndpoint, refreshKey]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextUserMessage: AgentChatMessage = { role: "user", content: message, sentAt: nowIso };
    const historyForRequest = [...messages, nextUserMessage].slice(-8);

    setMessages((previous) => [...previous, nextUserMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const payload = await callAgentEndpoint<AgentChatResponse>("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          history: historyForRequest,
        }),
      });

      const structured = normalizeStructuredAnswer(payload.structured);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: payload.reply,
          structured,
          sentAt: new Date().toISOString(),
        },
      ]);
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
      description={greeting}
    >

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-finance-muted sm:mt-5">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading personalized AI context...
        </div>
      )}

      {!isLoading && dashboardSummary && (
        <div className="mt-4 rounded-2xl border border-finance-accent/20 bg-finance-accent/10 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">AI Action Plan</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-finance-text leading-relaxed">{dashboardSummary}</p>
        </div>
      )}

      {!isLoading && starterPrompts.length > 0 && (
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
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-muted">Recommendation</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.recommendation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-muted">Reason</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.reason}</p>
                    </div>
                    <div className="rounded-lg border border-finance-red/20 bg-finance-red/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-red">Risk Warning</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-red">{message.structured.riskWarning}</p>
                    </div>
                    <div className="rounded-lg border border-finance-accent/20 bg-finance-accent/10 p-3">
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
            placeholder="Ask: Where should I invest 15000 INR per month?"
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

