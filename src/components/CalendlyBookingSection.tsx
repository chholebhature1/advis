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

  return (
    <section id="book-discovery-call" className="w-full bg-gradient-to-b from-[#f8fafc] to-[#eef4ff] py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1e3a8a] mb-4 tracking-tight">
            READY TO TALK? BOOK A DISCOVERY CALL
          </h2>
          <p className="text-lg text-[#5f7396] max-w-2xl mx-auto">
            Real-time availability powered by Supabase. No sales pressure, just practical guidance.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(30,58,138,0.08)] border border-[#e2e8f0] p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6 gap-3">
              <h3 className="text-2xl font-bold text-[#1e3a8a]">BOOK A DISCOVERY CALL</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                <Calendar className="h-3.5 w-3.5" />
                Supabase live booking
              </span>
            </div>

            {isLoadingAvailability && (
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 text-[#5f7396] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available slots...
              </div>
            )}

            {!isLoadingAvailability && availabilityError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                <p className="text-sm font-semibold mb-3">{availabilityError}</p>
                <button
                  type="button"
                  onClick={() => {
                    void loadAvailability();
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoadingAvailability && !availabilityError && !advisor && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 text-sm font-semibold">
                No advisor schedule is configured yet. Please set advisor availability first.
              </div>
            )}

            {!isLoadingAvailability && !availabilityError && advisor && (
              <>
                <div className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {dateItems.map((item) => (
                      <button
                        key={item.dateKey}
                        type="button"
                        onClick={() => item.isAvailable && handleDateSelect(item.dateKey)}
                        disabled={!item.isAvailable}
                        className={[
                          "rounded-xl border px-2 py-3 text-center transition-all duration-200",
                          item.isAvailable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-40 bg-[#f1f5f9] border-[#e2e8f0]",
                          selectedDateKey === item.dateKey
                            ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-lg shadow-blue-900/25"
                            : item.isAvailable
                              ? "bg-white border-[#e2e8f0] text-[#1e3a8a] hover:border-[#1e3a8a] hover:bg-blue-50"
                              : "",
                        ].join(" ")}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide">{item.weekdayLabel}</div>
                        <div className="text-lg font-bold leading-tight">{item.dayNumber}</div>
                        <div className="text-[11px] font-medium uppercase tracking-wide">{item.monthLabel}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-[#5f7396]" />
                    <span className="text-sm font-semibold text-[#5f7396]">
                      {selectedDate
                        ? `Select a time on ${selectedDate.weekdayLabel}, ${selectedDate.monthLabel} ${selectedDate.dayNumber}`
                        : "Select a date to view slots"}
                    </span>
                  </div>

                  {selectedDate && selectedDate.slots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedDate.slots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => handleTimeSelect(slot)}
                          className={[
                            "py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 border",
                            selectedSlot?.startsAt === slot.startsAt
                              ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-md"
                              : "bg-[#f8fafc] text-[#5f7396] border-[#e2e8f0] hover:border-[#1e3a8a] hover:text-[#1e3a8a]",
                          ].join(" ")}
                        >
                          {slot.timeLabel}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#5f7396]">
                      {selectedDate ? "No open slots on this day. Try another date." : "No dates available yet."}
                    </div>
                  )}
                </motion.div>

                {showBookingForm && selectedSlot && !isSubmitted && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    onSubmit={handleSubmit}
                    className="space-y-4 mt-4 pt-4 border-t border-[#e2e8f0]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#1e3a8a]">
                        {formatSlotDateTime(selectedSlot.startsAt, advisorTimezone)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBookingForm(false)}
                        className="text-[#5f7396] hover:text-[#1e3a8a]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {submitError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Your Name"
                      required
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (optional)"
                      value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all"
                    />
                    <textarea
                      placeholder="What would you like to discuss? (optional)"
                      rows={3}
                      value={formData.message}
                      onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          Confirm Booking
                          <CheckCircle2 className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-[#1e3a8a] mb-2">Booking Confirmed!</h4>
                    <p className="text-[#5f7396] mb-2">We&apos;ve reserved your slot for {confirmedSlotLabel}.</p>
                    <p className="text-[#5f7396] mb-4">
                      A confirmation email has been sent to {formData.email}, and a reminder email will be sent before
                      your meeting.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setShowBookingForm(false);
                        setSelectedSlot(null);
                        setSubmitError(null);
                        setFormData({ name: "", email: "", phone: "", message: "" });
                      }}
                      className="text-[#1e3a8a] font-semibold hover:underline"
                    >
                      Book another call
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(30,58,138,0.08)] border border-[#e2e8f0] p-6 sm:p-8"
          >
            <h3 className="text-2xl font-bold text-[#1e3a8a] mb-6">PREFER EMAIL?</h3>

            <form className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Message</label>
                <textarea
                  placeholder="Tell us about your financial goals..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] text-[#1e3a8a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200"
              >
                Send Message
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#e2e8f0] space-y-3">
              <div className="flex items-center gap-3 text-[#5f7396]">
                <Mail className="h-4 w-4" />
                <span className="text-sm">
                  Email:{" "}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-[#1e3a8a] font-medium hover:underline"
                  >
                    {contactEmail}
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#5f7396]">
                <Clock className="h-4 w-4" />
                <span className="text-sm">We reply within 4 business hours</span>
              </div>
              <div className="flex items-center gap-3 text-[#5f7396]">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Office hours: Mon-Sat, 10:00 AM-7:00 PM IST</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
