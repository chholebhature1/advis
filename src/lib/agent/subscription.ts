import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionPlan = "free" | "starter" | "pro";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";
export type BillingCycle = "monthly" | "yearly";

type UserSubscriptionRow = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  whatsapp_alerts_override: boolean | null;
};

export type SubscriptionAccess = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  isPaidPlan: boolean;
  canUseWhatsappChannel: boolean;
  upgradeMessage: string | null;
};

const SELECT_COLUMNS = "plan,status,billing_cycle,whatsapp_alerts_override";

function normalizePlan(value: unknown): SubscriptionPlan {
  if (value === "starter" || value === "pro") {
    return value;
  }

  return "free";
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  if (value === "trialing" || value === "past_due" || value === "canceled" || value === "paused") {
    return value;
  }

  return "active";
}

function normalizeBillingCycle(value: unknown): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

function toUserSubscriptionRow(value: unknown): UserSubscriptionRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      plan: "free",
      status: "active",
      billing_cycle: "monthly",
      whatsapp_alerts_override: null,
    };
  }

  const record = value as Record<string, unknown>;

  return {
    plan: normalizePlan(record.plan),
    status: normalizeStatus(record.status),
    billing_cycle: normalizeBillingCycle(record.billing_cycle),
    whatsapp_alerts_override: typeof record.whatsapp_alerts_override === "boolean" ? record.whatsapp_alerts_override : null,
  };
}

function isEntitledStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

function defaultEntitlements(plan: SubscriptionPlan): { isPaidPlan: boolean; whatsappAlerts: boolean } {
  if (plan === "starter" || plan === "pro") {
    return {
      isPaidPlan: true,
      whatsappAlerts: true,
    };
  }

  return {
    isPaidPlan: false,
    whatsappAlerts: false,
  };
}

function toSubscriptionAccess(row: UserSubscriptionRow): SubscriptionAccess {
  const defaults = defaultEntitlements(row.plan);
  const entitled = isEntitledStatus(row.status);
  const canUseWhatsappChannel = entitled && (row.whatsapp_alerts_override ?? defaults.whatsappAlerts);

  return {
    plan: row.plan,
    status: row.status,
    billingCycle: row.billing_cycle,
    isPaidPlan: defaults.isPaidPlan && entitled,
    canUseWhatsappChannel,
    upgradeMessage: canUseWhatsappChannel ? null : "Upgrade to Starter or Pro to unlock WhatsApp delivery.",
  };
}

async function selectUserSubscription(supabase: SupabaseClient, userId: string): Promise<UserSubscriptionRow | null> {
  const result = await supabase
    .from("user_subscriptions")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data ? toUserSubscriptionRow(result.data) : null;
}

async function insertDefaultSubscription(supabase: SupabaseClient, userId: string): Promise<UserSubscriptionRow | null> {
  const result = await supabase
    .from("user_subscriptions")
    .insert({ user_id: userId })
    .select(SELECT_COLUMNS)
    .single();

  if (result.error) {
    if (result.error.code === "23505") {
      return null;
    }

    throw result.error;
  }

  return toUserSubscriptionRow(result.data);
}

export async function getOrCreateSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionAccess> {
  const existing = await selectUserSubscription(supabase, userId);
  if (existing) {
    return toSubscriptionAccess(existing);
  }

  const inserted = await insertDefaultSubscription(supabase, userId);
  if (inserted) {
    return toSubscriptionAccess(inserted);
  }

  const afterRace = await selectUserSubscription(supabase, userId);
  if (afterRace) {
    return toSubscriptionAccess(afterRace);
  }

  return toSubscriptionAccess({
    plan: "free",
    status: "active",
    billing_cycle: "monthly",
    whatsapp_alerts_override: null,
  });
}
