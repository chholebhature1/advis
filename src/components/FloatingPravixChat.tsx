"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AgentStructuredAdvice } from "@/lib/agent/types";

type FloatingPravixChatProps = {
  signedIn: boolean;
  refreshKey: number;
};

type BootstrapPayload = {
  greeting?: string;
  starterPrompts?: string[];
  error?: string;
};

type ChatPayload = {
  reply?: string;
  structured?: AgentStructuredAdvice;
  error?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sentAt: string;
  structured?: AgentStructuredAdvice;
};

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FloatingPravixChat({ signedIn, refreshKey }: FloatingPravixChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Hi, I am Pravix AI. Ask me anything about your plan.");
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setIsOpen(false);
      setError(null);
      setMessages([]);
      setStarterPrompts([]);
      setHasBootstrapped(false);
    }
  }, [signedIn]);

  useEffect(() => {
    setError(null);
  }, [refreshKey]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isOpen]);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.getSession();

    if (authError) {
      throw authError;
    }

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Authentication session expired. Please sign in again.");
    }

    return token;
  }, []);

  const bootstrap = useCallback(async () => {
    if (!signedIn || hasBootstrapped || isBootstrapping) {
      return;
    }

    setIsBootstrapping(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent/bootstrap", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as BootstrapPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load Pravix AI context.");
      }

      setGreeting(payload.greeting ?? "Hi, I am Pravix AI. Ask me anything about your plan.");
      setStarterPrompts((payload.starterPrompts ?? []).slice(0, 3));
      setHasBootstrapped(true);
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : "Could not initialize Pravix AI.");
    } finally {
      setIsBootstrapping(false);
    }
  }, [getAccessToken, hasBootstrapped, isBootstrapping, signedIn]);

  const quickSuggestions = useMemo(() => {
    if (starterPrompts.length > 0) {
      return starterPrompts;
    }

    return [
      "What should I prioritize this month?",
      "How do I reduce risk in my portfolio?",
      "How can I improve tax efficiency right now?",
    ];
  }, [starterPrompts]);

  async function openPanel() {
    if (!signedIn) {
      setIsOpen(false);
      if (pathname !== "/create-account") {
        router.push("/create-account");
      }
      return;
    }

    setIsOpen(true);
    if (signedIn) {
      await bootstrap();
    }
  }

  async function sendMessage(message: string) {
    const next = message.trim();
    if (!next || isSending) {
      return;
    }

    if (!signedIn) {
      setError("Sign in to chat with Pravix AI.");
      return;
    }

    setIsSending(true);
    setError(null);

    const userMessage: ChatMessage = {
      role: "user",
      content: next,
      sentAt: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");

    try {
      const token = await getAccessToken();
      const history = messages
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content }))
        .concat({ role: "user" as const, content: next });

      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: next,
          history,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ChatPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not get a response from Pravix AI.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: payload.reply ?? "I could not generate a response right now.",
          sentAt: new Date().toISOString(),
          structured: payload.structured,
        },
      ]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Could not send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-[#142a4a]/18 backdrop-blur-[1px] sm:bg-transparent" onClick={() => setIsOpen(false)} />
      ) : null}

      {isOpen ? (
        <aside className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl border border-finance-border bg-white/98 shadow-[0_16px_34px_rgba(31,42,36,0.14)] sm:left-auto sm:right-6 sm:w-[24rem]">
          <header className="flex items-center justify-between rounded-t-2xl border-b border-finance-border bg-[#1f3b35] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold tracking-wide">Pravix AI</p>
              <p className="text-xs text-white/80">Wealth Copilot</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white/90 transition-colors hover:bg-white/10"
              aria-label="Close Pravix AI chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="px-4 pb-4 pt-3">
            {!signedIn ? (
              <p className="rounded-xl border border-finance-border bg-finance-surface/70 px-3 py-2.5 text-sm text-finance-muted">
                Sign in to open your personalized Pravix AI chat.
              </p>
            ) : (
              <>
                <p className="rounded-xl border border-finance-accent/20 bg-finance-accent/10 px-3 py-2.5 text-sm text-finance-text">
                  {greeting}
                </p>

                <div ref={messageContainerRef} className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-finance-muted">Start with a quick prompt below.</p>
                  ) : (
                    messages.map((message, index) => (
                      <article
                        key={`${message.role}-${index}-${message.sentAt}`}
                        className={`rounded-xl px-3 py-2.5 text-sm ${
                          message.role === "assistant"
                            ? "bg-finance-surface/70 text-finance-text"
                            : "ml-auto max-w-[85%] bg-finance-accent text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {message.role === "assistant" && message.structured ? (
                          <div className="mt-2 rounded-lg border border-finance-border bg-white px-2.5 py-2 text-xs text-finance-text">
                            <p><span className="font-semibold">Next:</span> {message.structured.nextAction}</p>
                          </div>
                        ) : null}
                        <p className={`mt-1 text-[10px] ${message.role === "assistant" ? "text-finance-muted" : "text-white/80"}`}>
                          {formatTime(message.sentAt)}
                        </p>
                      </article>
                    ))
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {quickSuggestions.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isSending || isBootstrapping}
                      onClick={() => void sendMessage(prompt)}
                      className="inline-flex min-h-8 items-center rounded-full border border-finance-border bg-white px-3 text-xs font-semibold text-finance-text transition-colors hover:bg-finance-surface disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {error ? <p className="mt-2 text-xs text-finance-red">{error}</p> : null}

                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage(input);
                  }}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={isSending || isBootstrapping}
                    placeholder="Ask Pravix AI..."
                    className="h-10 flex-1 rounded-xl border border-finance-border bg-white px-3 text-sm text-finance-text focus:outline-none focus:ring-2 focus:ring-finance-accent/30 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  <button
                    type="submit"
                    disabled={isSending || isBootstrapping || input.trim().length === 0}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-finance-accent text-white transition-all duration-150 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label="Send message to Pravix AI"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </aside>
      ) : null}

      <div className="fixed bottom-6 right-4 z-50 sm:right-6">
        <button
          type="button"
          onClick={() => void openPanel()}
          className="group inline-flex h-12 items-center gap-2 rounded-full border border-[#1e44cd] bg-finance-accent px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(43,92,255,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(43,92,255,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance-accent/40"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            {isBootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          </span>
          <span>Pravix AI</span>
          <Sparkles className="h-4 w-4 text-white/85 transition-transform duration-200 group-hover:scale-110" />
        </button>
      </div>
    </>
  );
}

