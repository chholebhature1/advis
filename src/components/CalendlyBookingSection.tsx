"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Loader2, Mail, Phone, X } from "lucide-react";

type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  timeLabel: string;
};

type AvailabilityDate = {
  dateKey: string;
  weekdayLabel: string;
  monthLabel: string;
  dayNumber: number;
  isAvailable: boolean;
  slots: AvailabilitySlot[];
};

type AvailabilityAdvisor = {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  meetingDurationMins: number;
  bufferBeforeMins: number;
  bufferAfterMins: number;
};

type AvailabilityPayload = {
  advisor: AvailabilityAdvisor | null;
  generatedAt: string;
  dates: AvailabilityDate[];
};

type AvailabilityApiResponse = {
  ok?: boolean;
  availability?: AvailabilityPayload;
  error?: string;
};

type BookingApiResponse = {
  ok?: boolean;
  booking?: Record<string, unknown>;
  error?: string;
};

const BOOKING_TEMPORARY_UNAVAILABLE_MESSAGE =
  "Discovery call booking is temporarily unavailable right now. Please use the email form and we will get back within 4 business hours.";

function pickDefaultDateKey(dates: AvailabilityDate[], previous: string | null): string | null {
  if (previous) {
    const previousDate = dates.find((item) => item.dateKey === previous && item.isAvailable);
    if (previousDate) {
      return previousDate.dateKey;
    }
  }

  const firstAvailable = dates.find((item) => item.isAvailable);
  if (firstAvailable) {
    return firstAvailable.dateKey;
  }

  return dates[0]?.dateKey ?? null;
}

function formatSlotDateTime(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function normalizeBookingErrorMessage(message: string | null | undefined, fallback: string): string {
  if (!message || message.trim().length === 0) {
    return fallback;
  }

  const normalized = message.trim();

  if (normalized.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return BOOKING_TEMPORARY_UNAVAILABLE_MESSAGE;
  }

  return normalized;
}

export default function CalendlyBookingSection() {
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
  });

  const advisor = availability?.advisor ?? null;
  const advisorTimezone = advisor?.timezone ?? "Asia/Kolkata";
  const contactEmail = advisor?.email ?? "info@pravix.in";
  const dateItems = useMemo(() => availability?.dates ?? [], [availability]);

  const selectedDate = useMemo(
    () => dateItems.find((item) => item.dateKey === selectedDateKey) ?? null,
    [dateItems, selectedDateKey],


  );

  const loadAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    setAvailabilityError(null);

    try {
      const response = await fetch("/api/booking/availability/?days=14", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as AvailabilityApiResponse;

      if (!response.ok || !payload.availability) {
        throw new Error(payload.error ?? "Could not load booking availability.");
      }

      setAvailability(payload.availability);
      setSelectedDateKey((previous) => pickDefaultDateKey(payload.availability?.dates ?? [], previous));
      setSelectedSlot(null);
      setShowBookingForm(false);
      setSubmitError(null);
    } catch (error) {
      setAvailability(null);
      setSelectedDateKey(null);
      setSelectedSlot(null);
      setShowBookingForm(false);
      const message = error instanceof Error ? error.message : "Could not load booking availability.";
      setAvailabilityError(normalizeBookingErrorMessage(message, "Could not load booking availability."));
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const handleDateSelect = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
    setShowBookingForm(false);
    setSubmitError(null);
    setIsSubmitted(false);
  };

  const handleTimeSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setShowBookingForm(true);
    setSubmitError(null);
    setIsSubmitted(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!advisor || !selectedSlot) {
      setSubmitError("Please choose an available time slot.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/booking/meetings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          advisorId: advisor.id,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          leadName: formData.name,
          leadEmail: formData.email,
          leadPhoneE164: formData.phone,
          notes: formData.message,
          timezone: advisorTimezone,
          source: "website",
          metadata: {
            page: typeof window !== "undefined" ? window.location.pathname : "unknown",
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const payload = (await response.json()) as BookingApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not confirm booking.");
      }

      setIsSubmitted(true);
      setConfirmedSlotLabel(formatSlotDateTime(selectedSlot.startsAt, advisorTimezone));

      await loadAvailability();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not confirm booking.";
      setSubmitError(normalizeBookingErrorMessage(message, "Could not confirm booking."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      setSubmitError("Please fill in your name, email and a short message.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const FORMSPREE_ENDPOINT =
        process.env.NEXT_PUBLIC_FORMSPREE_FORM_ENDPOINT ??
        (process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID
          ? `https://formspree.io/f/${process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID}`
          : "");

      if (!FORMSPREE_ENDPOINT) {
        throw new Error("Formspree not configured. Set NEXT_PUBLIC_FORMSPREE_FORM_ID or NEXT_PUBLIC_FORMSPREE_FORM_ENDPOINT.");
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        page: typeof window !== "undefined" ? window.location.pathname : "unknown",
      };

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setIsSubmitted(true);
        setFormData({ name: "", email: "", phone: "", subject: "General Inquiry", message: "" });
      } else {
        throw new Error(json.error || json.message || "Submission failed. Try again later.");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact-us" className="w-full py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a8a] mb-3">Get in touch</h2>
          <p className="text-lg text-[#5f7396] max-w-2xl mx-auto">
            Pravix helps you simplify personal finance: goal-based planning, tax-efficient investing,
            and clear, actionable advice. Tell us about your needs and we&apos;ll get back to you within
            4 business hours.
          </p>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(30,58,138,0.08)] border border-[#e2e8f0] p-6 sm:p-8">
          {!isSubmitted ? (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              {submitError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  type="text"
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Email</label>
                <input
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  type="tel"
                  placeholder="Phone (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] bg-white"
                >
                  <option>General Inquiry</option>
                  <option>Book Discovery Call</option>
                  <option>Partnership</option>
                  <option>Press</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Message</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  placeholder="Tell us briefly how we can help"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] resize-none"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-xl disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-[#1e3a8a] mb-2">Message sent</h4>
              <p className="text-[#5f7396] mb-2">Thanks — we received your message and will reply within 4 business hours.</p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                }}
                className="text-[#1e3a8a] font-semibold hover:underline"
              >
                Send another message
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#e2e8f0] text-sm text-[#5f7396]">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-4 w-4" />
              <span>
                Email: <a href={`mailto:${contactEmail}`} className="text-[#1e3a8a] font-medium hover:underline">{contactEmail}</a>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4" />
              <span>We reply within 4 business hours</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
