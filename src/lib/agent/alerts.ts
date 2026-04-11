import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  getOrCreateSubscriptionAccess,
  type SubscriptionAccess,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/agent/subscription";

const SECTION_80C_LIMIT_INR = 150000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SmartAlertType = "market_crash" | "rebalance" | "sip_due" | "tax_deadline";
export type AlertFrequency = "realtime" | "daily" | "weekly" | "monthly";
export type DeliveryChannel = "whatsapp" | "email" | "sms" | "push";
export type AlertSeverity = "low" | "medium" | "high";
export type AlertRouteStatus = "ready" | "deferred" | "blocked" | "suppressed";

type ProfileRow = {
  risk_appetite: string | null;
  monthly_investable_surplus_inr: number | string | null;
};

type HoldingRow = {
  instrument_symbol: string;
  asset_class: string;
  quantity: number | string;
  average_buy_price_inr: number | string;
  current_price_inr: number | string;
};

type SipTransactionRow = {
  transaction_date: string;
};

type TaxProfileRow = {
  financial_year: string;
  annual_taxable_income_inr: number | string;
  section_80c_used_inr: number | string;
};

type CommunicationPreferenceRow = {
  preferred_channel: DeliveryChannel | null;
  phone_e164: string | null;
  email: string | null;
  whatsapp_opt_in: boolean;
  email_opt_in: boolean;
  push_opt_in: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

type AlertPreferenceRow = {
  alert_type: string;
  enabled: boolean;
  threshold_pct: number | string | null;
  frequency: AlertFrequency;
  delivery_channel: DeliveryChannel;
};

type RuleInput = {
  userId: string;
  profile: ProfileRow | null;
  holdings: HoldingRow[];
  lastSipTransaction: SipTransactionRow | null;
  latestTaxProfile: TaxProfileRow | null;
  communicationPreference: CommunicationPreferenceRow | null;
  alertPreferences: AlertPreferenceRow[];
  subscriptionAccess: SubscriptionAccess;
  now: Date;
};

type TriggeredSignal = {
  alertType: SmartAlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  metricValue: number | null;
  metricLabel: string | null;
};

type EffectiveAlertPreference = {
  alertType: SmartAlertType;
  enabled: boolean;
  threshold: number | null;
  frequency: AlertFrequency;
  deliveryChannel: DeliveryChannel;
};

export type RoutedSmartAlert = TriggeredSignal & {
  userId: string;
  alertDate: string;
  timezone: string;
  frequency: AlertFrequency;
  channel: DeliveryChannel | null;
  destination: string | null;
  routeStatus: AlertRouteStatus;
  routeReason: string;
};

export type SmartAlertSummary = {
  evaluatedUserCount: number;
  triggeredCount: number;
  readyCount: number;
  deferredCount: number;
  blockedCount: number;
  suppressedCount: number;
};

export type AlertSubscriptionSnapshot = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPaidPlan: boolean;
  canUseWhatsappChannel: boolean;
  upgradeMessage: string | null;
};

export type SmartAlertsEvaluationResult = {
  generatedAt: string;
  alerts: RoutedSmartAlert[];
  summary: SmartAlertSummary;
  subscription: AlertSubscriptionSnapshot;
};

export type DispatchResult = {
  generatedAt: string;
  dispatchedAt: string;
  alerts: Array<
    RoutedSmartAlert & {
      dispatchStatus: "sent" | "failed" | "skipped";
      dispatchProvider: string;
      dispatchMessageId: string | null;
      dispatchError: string | null;
    }
  >;
  summary: SmartAlertSummary;
  subscription: AlertSubscriptionSnapshot;
};

type ChannelAvailability = {
  channels: DeliveryChannel[];
  whatsappLockedByPlan: boolean;
};

function parseNumeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getTimezone(preference: CommunicationPreferenceRow | null): string {
  return preference?.timezone?.trim() || "Asia/Kolkata";
}

function getDateParts(now: Date, timezone: string) {
  const year = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: timezone }).format(now));
  const month = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: timezone }).format(now));
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: timezone }).format(now));
  const weekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: timezone }).format(now)) % 24;
  const minute = Number(new Intl.DateTimeFormat("en-US", { minute: "2-digit", timeZone: timezone }).format(now));

  return {
    year,
    month,
    day,
    weekdayShort,
    hour,
    minute,
  };
}

function formatLocalDate(now: Date, timezone: string): string {
  const parts = getDateParts(now, timezone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function parseTimeToMinutes(timeValue: string | null): number | null {
  if (!timeValue) {
    return null;
  }

  const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function isInQuietHours(now: Date, preference: CommunicationPreferenceRow | null): boolean {
  if (!preference) {
    return false;
  }

  const start = parseTimeToMinutes(preference.quiet_hours_start);
  const end = parseTimeToMinutes(preference.quiet_hours_end);

  if (start === null || end === null || start === end) {
    return false;
  }

  const timezone = getTimezone(preference);
  const parts = getDateParts(now, timezone);
  const current = parts.hour * 60 + parts.minute;

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

function getDefaultAlertPreference(
  alertType: SmartAlertType,
  communicationPreference: CommunicationPreferenceRow | null,
): EffectiveAlertPreference {
  const fallbackChannel = communicationPreference?.preferred_channel ?? "whatsapp";

  if (alertType === "market_crash") {
    return {
      alertType,
      enabled: true,
      threshold: 8,
      frequency: "daily",
      deliveryChannel: fallbackChannel,
    };
  }

  if (alertType === "rebalance") {
    return {
      alertType,
      enabled: true,
      threshold: 10,
      frequency: "daily",
      deliveryChannel: fallbackChannel,
    };
  }

  if (alertType === "sip_due") {
    return {
      alertType,
      enabled: true,
      threshold: 0,
      frequency: "daily",
      deliveryChannel: fallbackChannel,
    };
  }

  return {
    alertType,
    enabled: true,
    threshold: 0,
    frequency: "daily",
    deliveryChannel: fallbackChannel,
  };
}

function getEffectiveAlertPreference(
  alertType: SmartAlertType,
  communicationPreference: CommunicationPreferenceRow | null,
  rows: AlertPreferenceRow[],
): EffectiveAlertPreference {
  const fallback = getDefaultAlertPreference(alertType, communicationPreference);
  const row = rows.find((candidate) => candidate.alert_type === alertType);

  if (!row) {
    return fallback;
  }

  const threshold = row.threshold_pct === null ? fallback.threshold : parseNumeric(row.threshold_pct);

  return {
    alertType,
    enabled: row.enabled,
    threshold,
    frequency: row.frequency,
    deliveryChannel: row.delivery_channel,
  };
}

function isFrequencyDueToday(frequency: AlertFrequency, now: Date, timezone: string): boolean {
  if (frequency === "realtime" || frequency === "daily") {
    return true;
  }

  const parts = getDateParts(now, timezone);

  if (frequency === "weekly") {
    return parts.weekdayShort === "Mon";
  }

  return parts.day === 1;
}

function classifyAssetBucket(assetClass: string): "equity" | "debt" | "gold" | "other" {
  const normalized = assetClass.toLowerCase();

  if (/equity|stock|share|etf/.test(normalized)) {
    return "equity";
  }

  if (/debt|bond|gilt|fixed|fd|liquid/.test(normalized)) {
    return "debt";
  }

  if (/gold|commodity/.test(normalized)) {
    return "gold";
  }

  return "other";
}

function computeHoldingsTotals(holdings: HoldingRow[]) {
  const bucketValues = {
    equity: 0,
    debt: 0,
    gold: 0,
    other: 0,
  };

  let totalMarketValue = 0;
  let totalCostValue = 0;

  for (const row of holdings) {
    const quantity = parseNumeric(row.quantity);
    const current = parseNumeric(row.current_price_inr);
    const average = parseNumeric(row.average_buy_price_inr);

    const marketValue = quantity * current;
    const costValue = quantity * average;

    totalMarketValue += marketValue;
    totalCostValue += costValue;

    const bucket = classifyAssetBucket(row.asset_class);
    bucketValues[bucket] += marketValue;
  }

  const totalMarketValueRounded = round(totalMarketValue, 2);
  const totalCostValueRounded = round(totalCostValue, 2);

  return {
    totalMarketValue: totalMarketValueRounded,
    totalCostValue: totalCostValueRounded,
    portfolioPnlPct:
      totalCostValueRounded > 0 ? round(((totalMarketValueRounded - totalCostValueRounded) / totalCostValueRounded) * 100, 2) : null,
    allocationPct: {
      equity: totalMarketValueRounded > 0 ? round((bucketValues.equity / totalMarketValueRounded) * 100, 2) : 0,
      debt: totalMarketValueRounded > 0 ? round((bucketValues.debt / totalMarketValueRounded) * 100, 2) : 0,
      gold: totalMarketValueRounded > 0 ? round((bucketValues.gold / totalMarketValueRounded) * 100, 2) : 0,
      other: totalMarketValueRounded > 0 ? round((bucketValues.other / totalMarketValueRounded) * 100, 2) : 0,
    },
  };
}

function evaluateMarketCrashAlert(
  holdings: HoldingRow[],
  preference: EffectiveAlertPreference,
): TriggeredSignal | null {
  const totals = computeHoldingsTotals(holdings);
  if (totals.totalCostValue <= 0 || totals.portfolioPnlPct === null) {
    return null;
  }

  const threshold = preference.threshold ?? 8;
  if (totals.portfolioPnlPct > -threshold) {
    return null;
  }

  return {
    alertType: "market_crash",
    title: "Portfolio drawdown threshold breached",
    message: `Portfolio is down ${Math.abs(totals.portfolioPnlPct)}% vs cost basis, crossing your ${threshold}% crash threshold.`,
    severity: totals.portfolioPnlPct <= -15 ? "high" : "medium",
    metricValue: Math.abs(totals.portfolioPnlPct),
    metricLabel: "drawdown_pct",
  };
}

function getTargetAllocation(riskAppetite: string | null) {
  const normalized = (riskAppetite ?? "moderate").toLowerCase();

  if (normalized === "conservative") {
    return { equity: 40, debt: 50, gold: 10 };
  }

  if (normalized === "aggressive") {
    return { equity: 75, debt: 20, gold: 5 };
  }

  return { equity: 60, debt: 30, gold: 10 };
}

function evaluateRebalanceAlert(
  riskAppetite: string | null,
  holdings: HoldingRow[],
  preference: EffectiveAlertPreference,
): TriggeredSignal | null {
  const totals = computeHoldingsTotals(holdings);
  if (totals.totalMarketValue <= 0) {
    return null;
  }

  const target = getTargetAllocation(riskAppetite);
  const drifts = [
    { bucket: "Equity", drift: Math.abs(totals.allocationPct.equity - target.equity), current: totals.allocationPct.equity, target: target.equity },
    { bucket: "Debt", drift: Math.abs(totals.allocationPct.debt - target.debt), current: totals.allocationPct.debt, target: target.debt },
    { bucket: "Gold", drift: Math.abs(totals.allocationPct.gold - target.gold), current: totals.allocationPct.gold, target: target.gold },
  ].sort((a, b) => b.drift - a.drift);

  const maxDrift = drifts[0];
  const threshold = preference.threshold ?? 10;

  if (maxDrift.drift < threshold) {
    return null;
  }

  return {
    alertType: "rebalance",
    title: "Allocation drift suggests rebalancing",
    message: `${maxDrift.bucket} is at ${maxDrift.current}% vs target ${maxDrift.target}% (drift ${round(maxDrift.drift, 2)}%).`,
    severity: maxDrift.drift >= 15 ? "high" : "medium",
    metricValue: round(maxDrift.drift, 2),
    metricLabel: "allocation_drift_pct",
  };
}

function evaluateSipDueAlert(
  profile: ProfileRow | null,
  lastSipTransaction: SipTransactionRow | null,
  now: Date,
  timezone: string,
): TriggeredSignal | null {
  const monthlySurplus = parseNumeric(profile?.monthly_investable_surplus_inr ?? 0);
  if (monthlySurplus <= 0) {
    return null;
  }

  const todayParts = getDateParts(now, timezone);

  if (!lastSipTransaction?.transaction_date) {
    if (todayParts.day >= 10) {
      return {
        alertType: "sip_due",
        title: "SIP contribution due",
        message: "No SIP transaction has been logged this month. Schedule your planned SIP contribution.",
        severity: "medium",
        metricValue: null,
        metricLabel: null,
      };
    }

    return null;
  }

  const lastSipDate = new Date(`${lastSipTransaction.transaction_date}T00:00:00Z`);
  if (Number.isNaN(lastSipDate.getTime())) {
    return null;
  }

  const daysSince = Math.floor((now.getTime() - lastSipDate.getTime()) / MS_PER_DAY);
  const sameMonth = now.getUTCFullYear() === lastSipDate.getUTCFullYear() && now.getUTCMonth() === lastSipDate.getUTCMonth();

  if (!sameMonth && todayParts.day >= 7) {
    return {
      alertType: "sip_due",
      title: "Monthly SIP appears pending",
      message: `Last SIP was ${daysSince} days ago. Consider investing this month’s scheduled amount.`,
      severity: daysSince >= 45 ? "high" : "medium",
      metricValue: daysSince,
      metricLabel: "days_since_last_sip",
    };
  }

  if (daysSince >= 35) {
    return {
      alertType: "sip_due",
      title: "SIP cadence mismatch detected",
      message: `It has been ${daysSince} days since your last SIP transaction.`,
      severity: daysSince >= 45 ? "high" : "medium",
      metricValue: daysSince,
      metricLabel: "days_since_last_sip",
    };
  }

  return null;
}

function evaluateTaxDeadlineAlert(
  taxProfile: TaxProfileRow | null,
  now: Date,
  timezone: string,
): TriggeredSignal | null {
  if (!taxProfile) {
    return null;
  }

  const annualTaxableIncome = parseNumeric(taxProfile.annual_taxable_income_inr);
  if (annualTaxableIncome <= 0) {
    return null;
  }

  const used80c = parseNumeric(taxProfile.section_80c_used_inr);
  const remaining80c = Math.max(0, round(SECTION_80C_LIMIT_INR - used80c, 2));

  const parts = getDateParts(now, timezone);
  const deadlineYear = parts.month > 3 ? parts.year + 1 : parts.year;
  const todayDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const deadlineDate = new Date(Date.UTC(deadlineYear, 2, 31));
  const daysToDeadline = Math.max(0, Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / MS_PER_DAY));

  if (daysToDeadline > 90 || remaining80c <= 0) {
    return null;
  }

  return {
    alertType: "tax_deadline",
    title: "Tax-saving deadline approaching",
    message: `${daysToDeadline} days left until FY deadline. Remaining 80C headroom is INR ${remaining80c.toLocaleString("en-IN")}.`,
    severity: daysToDeadline <= 30 ? "high" : daysToDeadline <= 60 ? "medium" : "low",
    metricValue: daysToDeadline,
    metricLabel: "days_to_tax_deadline",
  };
}

function getAvailableChannels(
  preference: CommunicationPreferenceRow | null,
  subscriptionAccess: SubscriptionAccess,
): ChannelAvailability {
  if (!preference) {
    return {
      channels: [],
      whatsappLockedByPlan: false,
    };
  }

  const channels: DeliveryChannel[] = [];
  let whatsappLockedByPlan = false;

  if (preference.whatsapp_opt_in && !!preference.phone_e164) {
    if (subscriptionAccess.canUseWhatsappChannel) {
      channels.push("whatsapp");
    } else {
      whatsappLockedByPlan = true;
    }
  }

  if (preference.email_opt_in && !!preference.email) {
    channels.push("email");
  }

  if (preference.push_opt_in) {
    channels.push("push");
  }

  if (!!preference.phone_e164) {
    channels.push("sms");
  }

  return {
    channels: Array.from(new Set(channels)),
    whatsappLockedByPlan,
  };
}

function resolveDestination(userId: string, channel: DeliveryChannel, preference: CommunicationPreferenceRow | null): string | null {
  if (channel === "email") {
    return preference?.email ?? null;
  }

  if (channel === "whatsapp" || channel === "sms") {
    return preference?.phone_e164 ?? null;
  }

  return `push:${userId}`;
}

function routeSignal(
  signal: TriggeredSignal,
  userId: string,
  now: Date,
  timezone: string,
  communicationPreference: CommunicationPreferenceRow | null,
  subscriptionAccess: SubscriptionAccess,
  alertPreference: EffectiveAlertPreference,
): RoutedSmartAlert {
  const alertDate = formatLocalDate(now, timezone);

  if (!alertPreference.enabled) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: null,
      destination: null,
      routeStatus: "suppressed",
      routeReason: "Alert type disabled by user preference.",
    };
  }

  if (!isFrequencyDueToday(alertPreference.frequency, now, timezone)) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: null,
      destination: null,
      routeStatus: "suppressed",
      routeReason: "Frequency schedule not due today.",
    };
  }

  const channelAvailability = getAvailableChannels(communicationPreference, subscriptionAccess);
  if (channelAvailability.channels.length === 0) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: null,
      destination: null,
      routeStatus: "blocked",
      routeReason: channelAvailability.whatsappLockedByPlan
        ? "WhatsApp delivery is locked on your current plan. Upgrade to Starter or Pro to enable this channel."
        : "No active communication channels available.",
    };
  }

  const preferenceOrder = [
    alertPreference.deliveryChannel,
    communicationPreference?.preferred_channel,
    "whatsapp",
    "email",
    "push",
    "sms",
  ].filter((value): value is DeliveryChannel => typeof value === "string") as DeliveryChannel[];

  const selectedChannel = preferenceOrder.find((channel) => channelAvailability.channels.includes(channel)) ?? null;

  if (!selectedChannel) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: null,
      destination: null,
      routeStatus: "blocked",
      routeReason: channelAvailability.whatsappLockedByPlan
        ? "Preferred delivery includes WhatsApp, but your current plan does not include that channel and no fallback is eligible."
        : "Preferred channel is unavailable and no fallback channel is eligible.",
    };
  }

  const destination = resolveDestination(userId, selectedChannel, communicationPreference);
  if (!destination) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: selectedChannel,
      destination: null,
      routeStatus: "blocked",
      routeReason: "Destination details for selected channel are missing.",
    };
  }

  if (signal.severity !== "high" && isInQuietHours(now, communicationPreference)) {
    return {
      ...signal,
      userId,
      alertDate,
      timezone,
      frequency: alertPreference.frequency,
      channel: selectedChannel,
      destination,
      routeStatus: "deferred",
      routeReason: "Inside quiet hours window; alert deferred.",
    };
  }

  const routeReason =
    selectedChannel !== "whatsapp" && channelAvailability.whatsappLockedByPlan
      ? `WhatsApp is locked on your current plan. Routed to ${selectedChannel} instead.`
      : "Routed to preferred available channel.";

  return {
    ...signal,
    userId,
    alertDate,
    timezone,
    frequency: alertPreference.frequency,
    channel: selectedChannel,
    destination,
    routeStatus: "ready",
    routeReason,
  };
}

function toSubscriptionSnapshot(subscriptionAccess: SubscriptionAccess): AlertSubscriptionSnapshot {
  return {
    plan: subscriptionAccess.plan,
    status: subscriptionAccess.status,
    isPaidPlan: subscriptionAccess.isPaidPlan,
    canUseWhatsappChannel: subscriptionAccess.canUseWhatsappChannel,
    upgradeMessage: subscriptionAccess.upgradeMessage,
  };
}

async function loadRuleInput(supabase: SupabaseClient, userId: string, now: Date): Promise<RuleInput> {
  const profileQuery = supabase
    .from("profiles")
    .select("risk_appetite,monthly_investable_surplus_inr")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const holdingsQuery = supabase
    .from("portfolio_holdings")
    .select("instrument_symbol,asset_class,quantity,average_buy_price_inr,current_price_inr")
    .eq("user_id", userId)
    .limit(200);

  const sipQuery = supabase
    .from("portfolio_transactions")
    .select("transaction_date")
    .eq("user_id", userId)
    .eq("transaction_type", "sip")
    .order("transaction_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const taxQuery = supabase
    .from("tax_profiles")
    .select("financial_year,annual_taxable_income_inr,section_80c_used_inr")
    .eq("user_id", userId)
    .order("financial_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const communicationQuery = supabase
    .from("communication_preferences")
    .select("preferred_channel,phone_e164,email,whatsapp_opt_in,email_opt_in,push_opt_in,quiet_hours_start,quiet_hours_end,timezone")
    .eq("user_id", userId)
    .maybeSingle();

  const alertPreferencesQuery = supabase
    .from("alert_preferences")
    .select("alert_type,enabled,threshold_pct,frequency,delivery_channel")
    .eq("user_id", userId);

  const subscriptionAccessQuery = getOrCreateSubscriptionAccess(supabase, userId);

  const [
    profileResult,
    holdingsResult,
    sipResult,
    taxResult,
    communicationResult,
    alertPreferencesResult,
    subscriptionAccess,
  ] = await Promise.all([
    profileQuery,
    holdingsQuery,
    sipQuery,
    taxQuery,
    communicationQuery,
    alertPreferencesQuery,
    subscriptionAccessQuery,
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (holdingsResult.error) {
    throw holdingsResult.error;
  }

  if (sipResult.error) {
    throw sipResult.error;
  }

  if (taxResult.error) {
    throw taxResult.error;
  }

  if (communicationResult.error) {
    throw communicationResult.error;
  }

  if (alertPreferencesResult.error) {
    throw alertPreferencesResult.error;
  }

  return {
    userId,
    profile: (profileResult.data ?? null) as ProfileRow | null,
    holdings: (holdingsResult.data ?? []) as HoldingRow[],
    lastSipTransaction: (sipResult.data ?? null) as SipTransactionRow | null,
    latestTaxProfile: (taxResult.data ?? null) as TaxProfileRow | null,
    communicationPreference: (communicationResult.data ?? null) as CommunicationPreferenceRow | null,
    alertPreferences: (alertPreferencesResult.data ?? []) as AlertPreferenceRow[],
    subscriptionAccess,
    now,
  };
}

function computeSummary(alerts: RoutedSmartAlert[], evaluatedUserCount: number): SmartAlertSummary {
  return {
    evaluatedUserCount,
    triggeredCount: alerts.length,
    readyCount: alerts.filter((alert) => alert.routeStatus === "ready").length,
    deferredCount: alerts.filter((alert) => alert.routeStatus === "deferred").length,
    blockedCount: alerts.filter((alert) => alert.routeStatus === "blocked").length,
    suppressedCount: alerts.filter((alert) => alert.routeStatus === "suppressed").length,
  };
}

export async function evaluateSmartAlertsForUser(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<SmartAlertsEvaluationResult> {
  const input = await loadRuleInput(supabase, userId, now);
  const timezone = getTimezone(input.communicationPreference);

  const marketCrashPreference = getEffectiveAlertPreference("market_crash", input.communicationPreference, input.alertPreferences);
  const rebalancePreference = getEffectiveAlertPreference("rebalance", input.communicationPreference, input.alertPreferences);
  const sipDuePreference = getEffectiveAlertPreference("sip_due", input.communicationPreference, input.alertPreferences);
  const taxDeadlinePreference = getEffectiveAlertPreference("tax_deadline", input.communicationPreference, input.alertPreferences);

  const triggeredSignals: TriggeredSignal[] = [];

  const marketCrashSignal = evaluateMarketCrashAlert(input.holdings, marketCrashPreference);
  if (marketCrashSignal) {
    triggeredSignals.push(marketCrashSignal);
  }

  const rebalanceSignal = evaluateRebalanceAlert(input.profile?.risk_appetite ?? null, input.holdings, rebalancePreference);
  if (rebalanceSignal) {
    triggeredSignals.push(rebalanceSignal);
  }

  const sipDueSignal = evaluateSipDueAlert(input.profile, input.lastSipTransaction, input.now, timezone);
  if (sipDueSignal) {
    triggeredSignals.push(sipDueSignal);
  }

  const taxSignal = evaluateTaxDeadlineAlert(input.latestTaxProfile, input.now, timezone);
  if (taxSignal) {
    triggeredSignals.push(taxSignal);
  }

  const alerts = triggeredSignals.map((signal) => {
    const preference =
      signal.alertType === "market_crash"
        ? marketCrashPreference
        : signal.alertType === "rebalance"
          ? rebalancePreference
          : signal.alertType === "sip_due"
            ? sipDuePreference
            : taxDeadlinePreference;

    return routeSignal(
      signal,
      userId,
      input.now,
      timezone,
      input.communicationPreference,
      input.subscriptionAccess,
      preference,
    );
  });

  return {
    generatedAt: input.now.toISOString(),
    alerts,
    summary: computeSummary(alerts, 1),
    subscription: toSubscriptionSnapshot(input.subscriptionAccess),
  };
}

export async function dispatchSmartAlerts(
  supabase: SupabaseClient,
  evaluation: SmartAlertsEvaluationResult,
  dispatchedAt = new Date(),
): Promise<DispatchResult> {
  const alerts: DispatchResult["alerts"] = [];

  for (const alert of evaluation.alerts) {
    if (alert.routeStatus !== "ready" || !alert.channel || !alert.destination) {
      alerts.push({
        ...alert,
        dispatchStatus: "skipped",
        dispatchProvider: "not-dispatched",
        dispatchMessageId: null,
        dispatchError: alert.routeStatus !== "ready" ? alert.routeReason : "Channel or destination unavailable.",
      });
      continue;
    }

    const dispatchableAlert: DispatchableAlert = {
      ...alert,
      channel: alert.channel,
      destination: alert.destination,
    };

    const reservation = await reserveAlertDeliveryLog(supabase, dispatchableAlert);

    if (!reservation.reserved) {
      alerts.push({
        ...alert,
        dispatchStatus: "skipped",
        dispatchProvider: "dedupe",
        dispatchMessageId: null,
        dispatchError: "Already delivered (or queued) for this user/alert/channel today.",
      });
      continue;
    }

    if (!reservation.logId) {
      alerts.push({
        ...alert,
        dispatchStatus: "failed",
        dispatchProvider: "reservation",
        dispatchMessageId: null,
        dispatchError: "Unable to reserve alert log row for dispatch.",
      });
      continue;
    }

    try {
      const provider = await dispatchAlertViaProvider(dispatchableAlert);

      await supabase
        .from("alert_delivery_logs")
        .update({
          dispatch_status: "sent",
          provider: provider.provider,
          provider_message_id: provider.messageId,
          provider_response: provider.response,
          sent_at: dispatchedAt.toISOString(),
        })
        .eq("id", reservation.logId)
        .eq("user_id", alert.userId);

      alerts.push({
        ...alert,
        dispatchStatus: "sent",
        dispatchProvider: provider.provider,
        dispatchMessageId: provider.messageId,
        dispatchError: null,
      });
    } catch (dispatchError) {
      const errorMessage = dispatchError instanceof Error ? dispatchError.message : "Unknown provider dispatch error.";

      await supabase
        .from("alert_delivery_logs")
        .update({
          dispatch_status: "failed",
          provider: providerNameFromChannel(dispatchableAlert.channel),
          provider_response: { error: errorMessage },
        })
        .eq("id", reservation.logId)
        .eq("user_id", alert.userId);

      alerts.push({
        ...alert,
        dispatchStatus: "failed",
        dispatchProvider: providerNameFromChannel(dispatchableAlert.channel),
        dispatchMessageId: null,
        dispatchError: errorMessage,
      });
    }
  }

  return {
    generatedAt: evaluation.generatedAt,
    dispatchedAt: dispatchedAt.toISOString(),
    alerts,
    summary: evaluation.summary,
    subscription: evaluation.subscription,
  };
}

function providerNameFromChannel(channel: DeliveryChannel): string {
  if (channel === "email") {
    return "resend";
  }

  if (channel === "whatsapp" || channel === "sms") {
    return "twilio";
  }

  return "onesignal";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function extractResendMessageId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  if (!("id" in data)) {
    return null;
  }

  const candidate = data.id;
  return typeof candidate === "string" ? candidate : null;
}

async function reserveAlertDeliveryLog(
  supabase: SupabaseClient,
  alert: DispatchableAlert,
): Promise<{ reserved: boolean; logId: string | null }> {
  const insertResult = await supabase
    .from("alert_delivery_logs")
    .insert({
      user_id: alert.userId,
      alert_type: alert.alertType,
      channel: alert.channel,
      alert_date: alert.alertDate,
      frequency: alert.frequency,
      severity: alert.severity,
      route_status: alert.routeStatus,
      dispatch_status: "queued",
      destination: alert.destination,
      title: alert.title,
      message: alert.message,
      metric_label: alert.metricLabel,
      metric_value: alert.metricValue,
      provider: providerNameFromChannel(alert.channel),
      provider_response: {},
    })
    .select("id")
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === "23505") {
      return {
        reserved: false,
        logId: null,
      };
    }

    throw insertResult.error;
  }

  return {
    reserved: true,
    logId: insertResult.data?.id ?? null,
  };
}

type ProviderDispatchResult = {
  provider: string;
  messageId: string | null;
  response: Record<string, unknown>;
};

type DispatchableAlert = RoutedSmartAlert & {
  channel: DeliveryChannel;
  destination: string;
};

async function dispatchAlertViaProvider(alert: DispatchableAlert): Promise<ProviderDispatchResult> {
  if (alert.channel === "email") {
    return sendEmailViaResend(alert);
  }

  if (alert.channel === "whatsapp" || alert.channel === "sms") {
    return sendTwilioMessage(alert);
  }

  return sendPushViaOneSignal(alert);
}

async function sendEmailViaResend(alert: DispatchableAlert): Promise<ProviderDispatchResult> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("ALERTS_EMAIL_FROM");

  const resend = new Resend(apiKey);

  const payload = await resend.emails.send({
    from,
    to: [alert.destination],
    subject: `[Pravix] ${alert.title}`,
    html: `<p>${alert.message}</p>`,
    text: `${alert.title}\n\n${alert.message}`,
  });

  if (payload.error) {
    throw new Error(`Resend delivery failed: ${JSON.stringify(payload.error)}`);
  }

  const responsePayload: Record<string, unknown> = {
    data: payload.data ?? null,
    error: payload.error ?? null,
  };

  return {
    provider: "resend",
    messageId: extractResendMessageId(payload.data),
    response: responsePayload,
  };
}

function formatTwilioAddress(channel: "whatsapp" | "sms", value: string): string {
  if (channel === "sms") {
    return value;
  }

  return value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
}

async function sendTwilioMessage(alert: DispatchableAlert): Promise<ProviderDispatchResult> {
  if (alert.channel !== "whatsapp" && alert.channel !== "sms") {
    throw new Error("Twilio dispatcher only supports WhatsApp and SMS alerts.");
  }

  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const from =
    alert.channel === "whatsapp" ? requireEnv("TWILIO_WHATSAPP_FROM") : requireEnv("TWILIO_SMS_FROM");

  const params = new URLSearchParams({
    To: formatTwilioAddress(alert.channel, alert.destination ?? ""),
    From: formatTwilioAddress(alert.channel, from),
    Body: `${alert.title}\n${alert.message}`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Twilio delivery failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return {
    provider: "twilio",
    messageId: typeof payload.sid === "string" ? payload.sid : null,
    response: payload,
  };
}

async function sendPushViaOneSignal(alert: DispatchableAlert): Promise<ProviderDispatchResult> {
  const appId = requireEnv("ONESIGNAL_APP_ID");
  const apiKey = requireEnv("ONESIGNAL_API_KEY");

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: [alert.userId],
      },
      headings: {
        en: alert.title,
      },
      contents: {
        en: alert.message,
      },
      data: {
        alert_type: alert.alertType,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`OneSignal push failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return {
    provider: "onesignal",
    messageId: typeof payload.id === "string" ? payload.id : null,
    response: payload,
  };
}

export async function listCandidateUsersForDailyAutomation(
  serviceSupabase: SupabaseClient,
  limit = 500,
): Promise<string[]> {
  const [profilesResult, communicationResult, alertsResult] = await Promise.all([
    serviceSupabase.from("profiles").select("user_id").not("user_id", "is", null).limit(limit),
    serviceSupabase.from("communication_preferences").select("user_id").limit(limit),
    serviceSupabase.from("alert_preferences").select("user_id").limit(limit),
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (communicationResult.error) {
    throw communicationResult.error;
  }

  if (alertsResult.error) {
    throw alertsResult.error;
  }

  const ids = new Set<string>();

  for (const row of profilesResult.data ?? []) {
    if (typeof row.user_id === "string" && row.user_id.length > 0) {
      ids.add(row.user_id);
    }
  }

  for (const row of communicationResult.data ?? []) {
    if (typeof row.user_id === "string" && row.user_id.length > 0) {
      ids.add(row.user_id);
    }
  }

  for (const row of alertsResult.data ?? []) {
    if (typeof row.user_id === "string" && row.user_id.length > 0) {
      ids.add(row.user_id);
    }
  }

  return Array.from(ids);
}
