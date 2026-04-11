"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";
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

type DebugStatus = {
  tokenPresent: boolean;
  bootstrapLoaded: boolean;
  chatReady: boolean;
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
  const [debugStatus, setDebugStatus] = useState<DebugStatus>({
    tokenPresent: false,
    bootstrapLoaded: false,
    chatReady: false,
  });

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: authSessionError } = await supabase.auth.getSession();

    if (authSessionError) {
      throw authSessionError;
    }

    const token = data.session?.access_token;
    if (!token) {
      setDebugStatus((previous) => ({ ...previous, tokenPresent: false }));
      throw new Error("Authentication session expired. Please sign in again.");
    }

    setDebugStatus((previous) => ({ ...previous, tokenPresent: true }));

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

  useEffect(() => {
    let cancelled = false;

    async function loadAgent() {
      setIsLoading(true);
      setError(null);
      setDebugStatus((previous) => ({ ...previous, bootstrapLoaded: false, chatReady: false }));

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
        setDebugStatus((previous) => ({ ...previous, bootstrapLoaded: true, chatReady: true }));
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load AI advisor context.");
        setDebugStatus((previous) => ({ ...previous, bootstrapLoaded: false, chatReady: false }));
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

    const nextUserMessage: AgentChatMessage = { role: "user", content: message };
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
      setMessages((previous) => [...previous, { role: "assistant", content: payload.reply, structured }]);
      setDebugStatus((previous) => ({ ...previous, chatReady: true }));
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Could not send message to AI advisor.");
      setDebugStatus((previous) => ({ ...previous, chatReady: false }));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <section className="rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">AI Wealth Advisor</p>
          <h2 className="mt-1 text-2xl font-semibold text-finance-text">Pravix Copilot</h2>
          <p className="mt-1 text-sm text-finance-muted">{greeting}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase ${
              debugStatus.tokenPresent
                ? "border border-finance-green/35 bg-finance-green/10 text-finance-green"
                : "border border-finance-red/35 bg-finance-red/10 text-finance-red"
            }`}
          >
            token {debugStatus.tokenPresent ? "present" : "missing"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase ${
              debugStatus.bootstrapLoaded
                ? "border border-finance-green/35 bg-finance-green/10 text-finance-green"
                : "border border-finance-red/35 bg-finance-red/10 text-finance-red"
            }`}
          >
            bootstrap {debugStatus.bootstrapLoaded ? "loaded" : "pending"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase ${
              debugStatus.chatReady
                ? "border border-finance-green/35 bg-finance-green/10 text-finance-green"
                : "border border-finance-red/35 bg-finance-red/10 text-finance-red"
            }`}
          >
            chat {debugStatus.chatReady ? "ready" : "blocked"}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-finance-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading personalized AI context...
        </div>
      )}

      {!isLoading && dashboardSummary && (
        <div className="mt-4 rounded-xl border border-finance-accent/20 bg-finance-accent/10 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-finance-muted">AI Action Plan</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-finance-text leading-relaxed">{dashboardSummary}</p>
        </div>
      )}

      {!isLoading && starterPrompts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              disabled={isSending}
              className="rounded-full border border-finance-border px-3 py-1.5 text-xs font-semibold text-finance-text hover:bg-finance-surface disabled:cursor-not-allowed disabled:opacity-70"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-finance-border bg-finance-surface/70 p-4">
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-finance-muted">Ask a question to start your personalized wealth planning chat.</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg p-3 text-sm ${
                  message.role === "assistant"
                    ? "bg-white border border-finance-border text-finance-text"
                    : "bg-finance-accent text-white"
                }`}
              >
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
                    <div className="rounded-md border border-finance-red/25 bg-finance-red/10 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-red">Risk Warning</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-red">{message.structured.riskWarning}</p>
                    </div>
                    <div className="rounded-md border border-finance-accent/20 bg-finance-accent/10 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-finance-accent">Next Action</p>
                      <p className="mt-1 text-sm leading-relaxed text-finance-text">{message.structured.nextAction}</p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isSending}
            placeholder="Ask: Where should I invest 15000 INR per month?"
            className="h-11 flex-1 rounded-lg border border-finance-border bg-white px-3 text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/25"
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-finance-accent px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-finance-red/25 bg-finance-red/10 p-3 text-sm text-finance-red">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-finance-muted">
        Educational guidance only. Validate suitability before investing.
      </p>
    </section>
  );
}
