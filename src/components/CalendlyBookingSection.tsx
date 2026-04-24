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
    <section id="contact-us" className="relative w-full py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#f8fafc] to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-50 to-indigo-50/30 blur-[100px] pointer-events-none" />
      <div className="absolute top-40 -left-60 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-50 to-amber-50/30 blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: Premium Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/80 border border-blue-100 text-blue-700 text-sm font-bold tracking-wide uppercase w-fit mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Priority Wealth Advisory
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0f172a] leading-[1.1] mb-6 tracking-tight">
              Command your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">financial future</span>.
            </h2>
            
            <p className="text-lg sm:text-xl text-[#475569] mb-12 leading-relaxed max-w-lg">
              At Pravix, we don't just manage money—we engineer financial peace of mind. Connect with our certified wealth architects to build a resilient, goal-driven portfolio tailored exclusively for you.
            </p>
            
            <div className="space-y-8 mb-12">
              <div className="flex items-start gap-5">
                <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1e293b] mb-1">Personalized Strategy</h4>
                  <p className="text-[#64748b] leading-relaxed">Tailored asset allocation engineered specifically for your risk profile and life goals.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#1e293b] mb-1">Zero Conflict of Interest</h4>
                  <p className="text-[#64748b] leading-relaxed">Transparent, direct mutual fund recommendations with absolutely zero hidden commissions.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-3xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-lg">
              <div className="w-12 h-12 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center text-[#475569] shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[#64748b] font-medium text-sm mb-1">Reach out directly</p>
                <a href={`mailto:${contactEmail}`} className="text-xl font-bold text-[#0f172a] hover:text-blue-600 transition-colors">{contactEmail}</a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Premium Form */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative"
          >
            {/* Form Container with Glassmorphism */}
            <div className="relative rounded-[2.5rem] bg-white border border-[#e2e8f0] shadow-[0_20px_80px_-15px_rgba(15,23,42,0.08)] p-8 sm:p-10 lg:p-12 overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-blue-50 to-transparent rounded-full opacity-50 pointer-events-none translate-x-1/3 -translate-y-1/3" />
              
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-8">Send an inquiry</h3>
                
                {!isSubmitted ? (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    {submitError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm font-medium flex items-start gap-3">
                        <X className="w-5 h-5 flex-shrink-0 mt-0.5" /> 
                        <span>{submitError}</span>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#334155] ml-1">Full Name</label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          type="text"
                          placeholder="John Doe"
                          className="w-full px-5 py-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#334155] ml-1">Email Address</label>
                        <input
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          type="email"
                          placeholder="john@example.com"
                          className="w-full px-5 py-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#334155] ml-1">Phone Number</label>
                        <input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="w-full px-5 py-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#334155] ml-1">Inquiry Type</label>
                        <div className="relative">
                          <select
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                          >
                            <option>Wealth Advisory</option>
                            <option>Portfolio Review</option>
                            <option>Tax Planning</option>
                            <option>General Inquiry</option>
                          </select>
                          <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#334155] ml-1">How can we help?</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={4}
                        placeholder="Tell us a bit about your financial goals..."
                        className="w-full px-5 py-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative w-full flex justify-center items-center gap-2 py-4 px-8 bg-[#0f172a] text-white font-bold text-lg rounded-2xl overflow-hidden transition-all hover:shadow-[0_8px_25px_-5px_rgba(15,23,42,0.3)] disabled:opacity-70"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center gap-2">
                          {isSubmitting ? (
                            <><Loader2 className="h-6 w-6 animate-spin" /> Processing...</>
                          ) : (
                            <>Submit Inquiry <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                          )}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-4">
                    <div className="relative w-24 h-24 mx-auto mb-8">
                      <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75 duration-1000"></div>
                      <div className="relative bg-gradient-to-tr from-green-400 to-green-500 rounded-full w-full h-full flex items-center justify-center shadow-[0_0_40px_-10px_rgba(34,197,94,0.5)]">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <h4 className="text-3xl font-black text-[#0f172a] mb-4 tracking-tight">Inquiry Received</h4>
                    <p className="text-lg text-[#475569] mb-10 max-w-sm mx-auto leading-relaxed">
                      Thank you for reaching out. A Pravix wealth architect will contact you within 4 business hours to discuss your goals.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] font-bold hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:shadow-sm transition-all"
                    >
                      Send another message
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
