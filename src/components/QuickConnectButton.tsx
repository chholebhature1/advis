"use client";

import { useState } from "react";
import { PhoneCall, CalendarDays, X, Sparkles } from "lucide-react";

const CONTACT_PHONE_NUMBER = "+91 87962 15599";
const CONTACT_PHONE_URI = "+918796215599";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Pravix, I want to connect regarding wealth planning, the AI dashboard, and a discovery call."
);
const WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_URI.replace(/^\+/, "")}?text=${WHATSAPP_MESSAGE}`;

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M12 2.2a9.8 9.8 0 0 0-8.46 14.77L2.3 22l5.15-1.21A9.8 9.8 0 1 0 12 2.2Zm0 17.78c-1.17 0-2.3-.23-3.34-.68l-.24-.1-3.06.72.74-2.98-.12-.25A7.63 7.63 0 1 1 12 19.98Zm4.42-5.8c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.36-1.9-1.14-.7-.63-1.17-1.4-1.31-1.64-.14-.24-.02-.38.1-.5.1-.1.24-.26.36-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.34.98 2.5c.12.16 1.7 2.58 4.12 3.62.58.25 1.03.4 1.38.52.58.18 1.1.15 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}

interface QuickConnectButtonProps {
  variant?: "dark" | "accent";
  className?: string;
}

export default function QuickConnectButton({ variant = "dark", className = "" }: QuickConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseButtonClasses =
    "group inline-flex h-12 items-center justify-center gap-0 rounded-full border px-0 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(10,25,48,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(10,25,48,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a1930]/40 sm:justify-between sm:gap-2 sm:px-4";

  const variantClasses =
    variant === "dark"
      ? "w-12 sm:w-[12.5rem] border-[#1f3b35] bg-[#0a1930]"
      : "w-auto sm:w-auto border-[#1e44cd] bg-[#2b5cff] px-4 sm:px-6";

  return (
    <div className={`relative inline-block ${className}`}>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute bottom-full left-0 mb-2 w-[18.5rem] rounded-2xl border border-[#d8e7ff] bg-white p-3 shadow-[0_16px_34px_rgba(31,42,36,0.16)] z-50">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold tracking-wide text-[#0a1930]">Quick Connect</p>
                <p className="text-xs text-[#5f7396]">Call, WhatsApp, or book a call</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d8e7ff] text-[#5f7396] transition-colors hover:bg-[#f5f8ff] hover:text-[#0a1930]"
                aria-label="Close quick connect menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <a
                href={`tel:${CONTACT_PHONE_URI}`}
                className="flex items-center gap-3 rounded-2xl border border-[#d8e7ff] bg-[#f8fbff] px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-[#c1d4fb] hover:bg-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2b5cff] text-white shadow-[0_8px_18px_rgba(43,92,255,0.22)]">
                  <PhoneCall className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-[#0a1930]">Call Pravix</span>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-[#d8e7ff] bg-[#f8fbff] px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-[#c1d4fb] hover:bg-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_8px_18px_rgba(37,211,102,0.22)]">
                  <WhatsappIcon />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-[#0a1930]">WhatsApp Chat</span>
              </a>

              <a
                href="/#book-discovery-call"
                className="flex items-center gap-3 rounded-2xl border border-[#d8e7ff] bg-[#f8fbff] px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-[#c1d4fb] hover:bg-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f3b35] text-white shadow-[0_8px_18px_rgba(31,59,53,0.18)]">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-[#0a1930]">Book a Discovery Call</span>
              </a>
            </div>
          </aside>
        </>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`${baseButtonClasses} ${variantClasses}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Contact Pravix"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <PhoneCall className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Contact Pravix</span>
        <Sparkles className="hidden h-4 w-4 text-white/85 transition-transform duration-200 group-hover:scale-110 sm:block" />
      </button>
    </div>
  );
}
