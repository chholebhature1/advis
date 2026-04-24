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

  return null;
}
