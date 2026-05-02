"use client";

import { FormEvent, useCallback, useEffect, useState, useRef } from "react";
import { AlertCircle, Loader2, Send, Sparkles, ShieldCheck, Target, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  optionalAction?: string;
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
  const optionalAction = toStructuredField(maybe.optionalAction);

  if (!recommendation || !reason || !riskWarning || !nextAction) {
    return null;
  }

  return {
    recommendation,
    reason,
    riskWarning,
    nextAction,
    ...(optionalAction ? { optionalAction } : {}),
  };
}

export default function AgentAdvisorPanel({ refreshKey }: AgentAdvisorPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>("Hi, I am your Pravix AI advisor.");
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
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
        const bootstrap = await callAgentEndpoint<AgentBootstrapResponse>("/api/agent/bootstrap", { method: "GET" });

        if (cancelled) {
          return;
        }

        setGreeting(bootstrap.greeting);
        setStarterPrompts(bootstrap.starterPrompts ?? []);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative overflow-hidden rounded-3xl border border-finance-border bg-white shadow-[0_4px_24px_rgba(10,25,48,0.04)]"
    >
      <div className="flex flex-col lg:flex-row min-h-[650px]">
        
        {/* ── Left Control Bar (Sidebar) ── */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-finance-border bg-finance-surface/30 p-6 sm:p-8 flex flex-col">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-finance-accent/10 border border-finance-accent/20">
              <Sparkles className="h-3.5 w-3.5 text-finance-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-finance-accent text-nowrap">Intelligence Core</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-finance-text tracking-tight">AI Wealth Advisor</h2>
            <p className="mt-2 text-sm leading-relaxed text-finance-muted font-medium">
              {greeting}
            </p>
          </div>

          <div className="flex-1 space-y-8">
            {starterPrompts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-finance-muted mb-4">Inquiry Frameworks</p>
                <div className="grid gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      disabled={isSending}
                      className="w-full text-left rounded-xl border border-finance-border bg-white p-3.5 text-xs font-semibold text-finance-text transition-all hover:border-finance-accent/40 hover:bg-white hover:shadow-sm active:scale-[0.98] disabled:opacity-40"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-finance-border">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-finance-accent/5 border border-finance-accent/10">
                <ShieldCheck className="h-5 w-5 text-finance-accent" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-finance-text">Encrypted Protocol</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Analytical Feed ── */}
        <div className="flex-1 flex flex-col bg-white">
          <header className="px-6 py-5 border-b border-finance-border flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-finance-surface border border-finance-border flex items-center justify-center">
                <Cpu className="h-4 w-4 text-finance-accent" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-finance-muted">Active Stream</p>
                <p className="text-xs font-bold text-finance-text">Strategy Dialogue</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-finance-green/10 border border-finance-green/20">
              <div className="h-1.5 w-1.5 rounded-full bg-finance-green animate-pulse" />
              <span className="text-[10px] font-bold text-finance-green uppercase tracking-wider">Live</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="h-20 w-20 rounded-3xl bg-finance-surface border border-finance-border flex items-center justify-center mb-6">
                  <Target className="h-10 w-10 text-finance-accent opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-finance-text">Awaiting Inquiry</h3>
                <p className="mt-2 text-sm text-finance-muted max-w-xs leading-relaxed">
                  Select a framework from the sidebar or type a custom question to generate analytical insights.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center border ${
                        message.role === "assistant" ? "bg-finance-accent/10 border-finance-accent/20" : "bg-finance-surface border-finance-border"
                      }`}>
                        {message.role === "assistant" ? <Cpu className="h-3 w-3 text-finance-accent" /> : <div className="h-1 w-1 rounded-full bg-finance-text" />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-finance-muted">
                        {message.role === "assistant" ? "Analytical Output" : "User Input"} • {formatTime(message.sentAt)}
                      </p>
                    </div>

                    <div className={`rounded-2xl border ${
                      message.role === "assistant" 
                        ? "bg-finance-surface/40 border-finance-border p-6" 
                        : "bg-white border-finance-accent/30 p-5 shadow-sm"
                    }`}>
                      {message.role === "assistant" && message.structured ? (
                        <div className="grid gap-4">
                          <div className="p-6 rounded-xl bg-finance-accent text-white shadow-lg shadow-finance-accent/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Primary Action</p>
                            <p className="mt-3 text-lg font-extrabold leading-tight">{message.structured.recommendation}</p>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white border border-finance-border shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-finance-muted mb-2">Supporting Rationale</p>
                              <p className="text-sm font-medium text-finance-text leading-relaxed">{message.structured.reason}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-finance-red/[0.03] border border-finance-red/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-finance-red mb-2">Risk Vectors</p>
                              <p className="text-sm font-medium text-finance-red leading-relaxed">{message.structured.riskWarning}</p>
                            </div>
                          </div>

                          {message.structured.optionalAction ? (
                            <p className="mt-1 text-sm text-finance-muted">Optional: {message.structured.optionalAction}</p>
                          ) : null}

                          <div className="mt-2 p-4 rounded-lg bg-white border border-finance-border flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-finance-muted">Next Action</p>
                              <p className="mt-1 text-sm font-bold tracking-tight">{message.structured.nextAction}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-finance-accent/10 flex items-center justify-center">
                              <Send className="h-4 w-4 text-finance-accent" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-finance-text leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </AnimatePresence>
            )}

            {isSending && (
              <div className="flex items-center gap-3 text-finance-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing Data Models...</span>
              </div>
            )}
          </div>

          {/* ── Analytical Input ── */}
          <footer className="p-6 border-t border-finance-border bg-finance-surface/10">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Send className="h-4 w-4 text-finance-muted group-focus-within:text-finance-accent transition-colors" />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isSending}
                  placeholder="Execute custom strategy inquiry..."
                  className="w-full h-14 pl-12 pr-6 rounded-2xl border border-finance-border bg-white text-sm font-semibold text-finance-text outline-none focus:border-finance-accent transition-all placeholder:text-finance-muted/60"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || input.trim().length === 0}
                className="h-14 px-8 rounded-2xl bg-finance-accent text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-finance-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
              >
                Inquire
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-finance-muted uppercase tracking-widest">
                Verification Required Prior to Execution
              </p>
              {error && (
                <div className="flex items-center gap-2 text-finance-red text-[10px] font-black uppercase tracking-widest">
                  <AlertCircle className="h-3 w-3" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </motion.section>
  );
}

