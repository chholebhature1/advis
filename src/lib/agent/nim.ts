import type { AgentChatHistoryItem, AgentContext, AgentStructuredAdvice } from "@/lib/agent/types";

type NimRole = "system" | "user" | "assistant";

type NimMessage = {
  role: NimRole;
  content: string;
};

type NimChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

type DeepSeekChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

class NimApiError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(status: number, bodyPreview: string, retryAfterMs: number | null) {
    super(`NVIDIA NIM API error (${status}): ${bodyPreview}`);
    this.name = "NimApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

class DeepSeekApiError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(status: number, bodyPreview: string, retryAfterMs: number | null) {
    super(`DeepSeek API error (${status}): ${bodyPreview}`);
    this.name = "DeepSeekApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

class ProviderQualityError extends Error {
  provider: "NIM" | "DeepSeek";

  constructor(provider: "NIM" | "DeepSeek", reason: string) {
    super(`${provider} quality gate failed: ${reason}`);
    this.name = "ProviderQualityError";
    this.provider = provider;
  }
}

type AllocationPlan = {
  equityPct: number;
  debtPct: number;
  goldPct: number;
  cashPct: number;
  note: string;
};

type AdvisorChatReply = {
  reply: string;
  structured: AgentStructuredAdvice;
};

const CHAT_PRIMARY_TIMEOUT_MS = 12_000;
const CHAT_SECONDARY_TIMEOUT_MS = 9_000;
const CHAT_PRIMARY_MAX_RETRIES = 1;
const CHAT_SECONDARY_MAX_RETRIES = 1;
const CHAT_REQUEST_DEADLINE_MS = 18_000;

const DASHBOARD_PRIMARY_TIMEOUT_MS = 6_000;
const DASHBOARD_SECONDARY_TIMEOUT_MS = 4_500;
const DASHBOARD_PRIMARY_MAX_RETRIES = 0;
const DASHBOARD_SECONDARY_MAX_RETRIES = 0;
const DASHBOARD_REQUEST_DEADLINE_MS = 8_000;

const RETRY_BASE_DELAY_MS = 300;
const RETRY_JITTER_MS = 150;
const RETRY_AFTER_MAX_MS = 2_000;

const CIRCUIT_OPEN_MS = 90_000;
const CIRCUIT_SAMPLE_SIZE = 20;
const CIRCUIT_RATE_LIMIT_THRESHOLD = 0.3;
const CIRCUIT_CONSECUTIVE_FAILURES = 5;
const CIRCUIT_HALF_OPEN_PROBE_TARGET = 2;

type ProviderName = "nim" | "deepseek";
type CircuitMode = "closed" | "open" | "half-open";

type ProviderCircuit = {
  mode: CircuitMode;
  openUntil: number;
  consecutiveRetryableFailures: number;
  recentStatuses: number[];
  halfOpenProbeAttempts: number;
  halfOpenProbeSuccesses: number;
};

class ProviderCircuitOpenError extends Error {
  provider: ProviderName;

  constructor(provider: ProviderName, retryAfterMs: number) {
    super(`Provider circuit open for ${provider}. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "ProviderCircuitOpenError";
    this.provider = provider;
  }
}

function createProviderCircuit(): ProviderCircuit {
  return {
    mode: "closed",
    openUntil: 0,
    consecutiveRetryableFailures: 0,
    recentStatuses: [],
    halfOpenProbeAttempts: 0,
    halfOpenProbeSuccesses: 0,
  };
}

const providerCircuits: Record<ProviderName, ProviderCircuit> = {
  nim: createProviderCircuit(),
  deepseek: createProviderCircuit(),
};

function getNimApiKey() {
  const key = process.env.NVIDIA_NIM_API_KEY ?? process.env.NIM_API_KEY;
  if (!key) {
    throw new Error("Missing NVIDIA_NIM_API_KEY environment variable.");
  }

  return key;
}

function getNimModel() {
  return process.env.NVIDIA_NIM_MODEL ?? "meta/llama-3.1-8b-instruct";
}

function getDeepSeekApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  return key;
}

function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

function getNimTimeoutMs() {
  const raw = process.env.NVIDIA_NIM_TIMEOUT_MS ?? process.env.NIM_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 15_000;
  }

  return Math.min(Math.max(parsed, 3_000), 60_000);
}

function toNimRole(role: AgentChatHistoryItem["role"]): NimRole {
  return role === "assistant" ? "assistant" : "user";
}

function trimHistory(history: AgentChatHistoryItem[]): AgentChatHistoryItem[] {
  return history.slice(-8);
}

function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "not provided";
  }

  return `INR ${Math.round(value).toLocaleString("en-IN")}`;
}

function resolveRiskBucket(context: AgentContext): string {
  const risk = context.latestRiskAssessment?.risk_bucket ?? context.profile?.risk_appetite ?? "moderate";
  return risk.toLowerCase();
}

function resolveMonthlySurplus(context: AgentContext): number | null {
  const direct = context.profile?.monthly_investable_surplus_inr;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const income = context.profile?.monthly_income_inr;
  const expenses = context.profile?.monthly_expenses_inr;
  if (
    typeof income === "number" &&
    Number.isFinite(income) &&
    typeof expenses === "number" &&
    Number.isFinite(expenses)
  ) {
    const computed = income - expenses;
    return computed > 0 ? computed : null;
  }

  return null;
}

function getAllocationPlan(riskBucket: string): AllocationPlan {
  if (riskBucket.includes("aggressive") || riskBucket.includes("high")) {
    return {
      equityPct: 75,
      debtPct: 15,
      goldPct: 10,
      cashPct: 0,
      note: "Higher equity mix can be volatile; keep a long horizon and avoid panic exits.",
    };
  }

  if (riskBucket.includes("conservative") || riskBucket.includes("low")) {
    return {
      equityPct: 30,
      debtPct: 55,
      goldPct: 10,
      cashPct: 5,
      note: "Conservative allocation prioritizes stability and smoother drawdowns over max growth.",
    };
  }

  return {
    equityPct: 55,
    debtPct: 30,
    goldPct: 10,
    cashPct: 5,
    note: "Balanced allocation targets growth with risk control through debt and gold diversification.",
  };
}

function formatAllocationLine(monthlyAmount: number, plan: AllocationPlan): string {
  const equity = Math.round((monthlyAmount * plan.equityPct) / 100);
  const debt = Math.round((monthlyAmount * plan.debtPct) / 100);
  const gold = Math.round((monthlyAmount * plan.goldPct) / 100);
  const cash = Math.round((monthlyAmount * plan.cashPct) / 100);

  const parts = [
    `${plan.equityPct}% equity index funds (${formatInr(equity)})`,
    `${plan.debtPct}% short/medium debt funds (${formatInr(debt)})`,
    `${plan.goldPct}% gold ETF/fund (${formatInr(gold)})`,
  ];

  if (plan.cashPct > 0) {
    parts.push(`${plan.cashPct}% liquid reserve (${formatInr(cash)})`);
  }

  return parts.join(", ");
}

function normalizeAdviceField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseStructuredAdviceRecord(value: unknown): AgentStructuredAdvice | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const recommendation = normalizeAdviceField(record.recommendation ?? record.advice);
  const reason = normalizeAdviceField(record.reason ?? record.rationale);
  const riskWarning = normalizeAdviceField(record.riskWarning ?? record.risk_warning ?? record.risk);
  const nextAction = normalizeAdviceField(record.nextAction ?? record.next_action ?? record.action);

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

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseStructuredAdviceFromJson(raw: string): AgentStructuredAdvice | null {
  const normalized = stripCodeFence(raw);
  const candidates = [normalized];
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(normalized.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const structured = parseStructuredAdviceRecord(parsed);
      if (structured) {
        return structured;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseStructuredAdviceFromSections(raw: string): AgentStructuredAdvice | null {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(
    /recommendation\s*:?\s*([\s\S]*?)\n+\s*reason\s*:?\s*([\s\S]*?)\n+\s*risk(?:\s*warning)?\s*:?\s*([\s\S]*?)\n+\s*next\s*action\s*:?\s*([\s\S]*)$/i,
  );

  if (!match) {
    return null;
  }

  const recommendation = normalizeAdviceField(match[1]);
  const reason = normalizeAdviceField(match[2]);
  const riskWarning = normalizeAdviceField(match[3]);
  const nextAction = normalizeAdviceField(match[4]);

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

function parseStructuredAdviceStrict(raw: string): AgentStructuredAdvice | null {
  return parseStructuredAdviceFromJson(raw) ?? parseStructuredAdviceFromSections(raw);
}

type GoalFeasibilitySnapshot = {
  goalTitle: string;
  targetAmountInr: number;
  monthsToGoal: number;
  annualReturnPct: number;
  requiredSipInr: number;
  monthlySurplusInr: number | null;
  projectedCorpusAtSurplusInr: number;
  feasibleAtCurrentSurplus: boolean;
};

type MessageGoalIntent = {
  goalTitle: string;
  targetAmountInr: number;
  monthsToGoal: number;
};

function priorityRank(priority: string | null | undefined): number {
  const normalized = (priority ?? "medium").toLowerCase();
  if (normalized === "high") {
    return 0;
  }

  if (normalized === "low") {
    return 2;
  }

  return 1;
}

function selectPrimaryGoal(context: AgentContext): AgentContext["goals"][number] | null {
  if (context.goals.length === 0) {
    return null;
  }

  return context.goals
    .slice()
    .sort((left, right) => {
      const rankDiff = priorityRank(left.priority) - priorityRank(right.priority);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      const leftDate = left.target_date ? Date.parse(left.target_date) : Number.POSITIVE_INFINITY;
      const rightDate = right.target_date ? Date.parse(right.target_date) : Number.POSITIVE_INFINITY;
      return leftDate - rightDate;
    })[0] ?? null;
}

function resolveGoalMonths(goal: AgentContext["goals"][number], context: AgentContext): number | null {
  if (goal.target_date) {
    const targetDate = new Date(goal.target_date);
    if (!Number.isNaN(targetDate.getTime())) {
      const diffMs = targetDate.getTime() - Date.now();
      if (diffMs > 0) {
        return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
      }
    }
  }

  const profileYears = context.profile?.target_horizon_years;
  if (typeof profileYears === "number" && Number.isFinite(profileYears) && profileYears > 0) {
    return Math.max(1, Math.round(profileYears * 12));
  }

  const riskYears = context.latestRiskAssessment?.time_horizon_years;
  if (typeof riskYears === "number" && Number.isFinite(riskYears) && riskYears > 0) {
    return Math.max(1, Math.round(riskYears * 12));
  }

  return null;
}

function expectedAnnualReturnPctForFeasibility(riskBucket: string): number {
  if (riskBucket.includes("aggressive") || riskBucket.includes("high")) {
    return 12;
  }

  if (riskBucket.includes("conservative") || riskBucket.includes("low")) {
    return 8;
  }

  return 10;
}

function normalizeAmountTokenToInr(amountToken: string, unitToken: string | null): number | null {
  const raw = Number.parseFloat(amountToken.replace(/,/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  const unit = (unitToken ?? "").toLowerCase();
  if (["lakh", "lakhs", "lac", "lacs"].includes(unit)) {
    return raw * 100_000;
  }

  if (["crore", "crores", "cr"].includes(unit)) {
    return raw * 10_000_000;
  }

  if (["k", "thousand"].includes(unit)) {
    return raw * 1_000;
  }

  if (["m", "million"].includes(unit)) {
    return raw * 1_000_000;
  }

  return raw;
}

function extractUserGoalIntent(message: string): MessageGoalIntent | null {
  const normalized = message.toLowerCase();
  const horizonMatch = normalized.match(
    /(?:in|within|next)\s+([0-9]+(?:\.[0-9]+)?)\s*(year|years|yr|yrs|month|months|mo|mos)\b/i,
  );

  if (!horizonMatch?.[1] || !horizonMatch?.[2]) {
    return null;
  }

  const horizonValue = Number.parseFloat(horizonMatch[1]);
  if (!Number.isFinite(horizonValue) || horizonValue <= 0) {
    return null;
  }

  const horizonUnit = horizonMatch[2].toLowerCase();
  const monthsToGoal = horizonUnit.startsWith("year") || horizonUnit.startsWith("yr")
    ? Math.max(1, Math.round(horizonValue * 12))
    : Math.max(1, Math.round(horizonValue));

  const amountMatches = Array.from(
    normalized.matchAll(/(?:₹|inr\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(lakh|lakhs|lac|lacs|crore|crores|cr|k|thousand|m|million)?/gi),
  );

  const amountCandidates = amountMatches
    .map((match) => normalizeAmountTokenToInr(match[1] ?? "", match[2] ?? null))
    .filter((value): value is number => value !== null)
    .filter((value) => value >= 50_000);

  if (amountCandidates.length === 0) {
    return null;
  }

  const targetAmountInr = Math.max(...amountCandidates);
  const goalTitle =
    normalized.includes("car")
      ? "car goal"
      : normalized.includes("house") || normalized.includes("home")
        ? "home goal"
        : normalized.includes("retire")
          ? "retirement goal"
          : "stated goal";

  return {
    goalTitle,
    targetAmountInr,
    monthsToGoal,
  };
}

function futureValueFromSip(monthlySip: number, monthlyRate: number, months: number): number {
  if (months <= 0 || monthlySip <= 0) {
    return 0;
  }

  if (monthlyRate <= 0) {
    return monthlySip * months;
  }

  return monthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function computeFeasibilitySnapshot(input: {
  goalTitle: string;
  targetAmountInr: number;
  monthsToGoal: number;
  context: AgentContext;
}): GoalFeasibilitySnapshot | null {
  if (!Number.isFinite(input.targetAmountInr) || input.targetAmountInr <= 0 || input.monthsToGoal <= 0) {
    return null;
  }

  const riskBucket = resolveRiskBucket(input.context);
  const annualReturnPct = expectedAnnualReturnPctForFeasibility(riskBucket);
  const monthlyRate = annualReturnPct / 1200;

  const currentSavingsRaw = input.context.profile?.current_savings_inr;
  const currentSavingsInr =
    typeof currentSavingsRaw === "number" && Number.isFinite(currentSavingsRaw) && currentSavingsRaw > 0
      ? currentSavingsRaw
      : 0;

  const futureSavings = monthlyRate <= 0 ? currentSavingsInr : currentSavingsInr * Math.pow(1 + monthlyRate, input.monthsToGoal);
  const sipGrowthFactor =
    monthlyRate <= 0 ? input.monthsToGoal : (Math.pow(1 + monthlyRate, input.monthsToGoal) - 1) / monthlyRate;

  const requiredSipRaw =
    sipGrowthFactor > 0
      ? (input.targetAmountInr - futureSavings) / sipGrowthFactor
      : input.targetAmountInr / input.monthsToGoal;
  const requiredSipInr = Math.max(0, Math.ceil(requiredSipRaw));

  const monthlySurplusInr = resolveMonthlySurplus(input.context);
  const projectedCorpusAtSurplusInr =
    monthlySurplusInr && monthlySurplusInr > 0
      ? futureSavings + futureValueFromSip(monthlySurplusInr, monthlyRate, input.monthsToGoal)
      : futureSavings;

  return {
    goalTitle: input.goalTitle,
    targetAmountInr: input.targetAmountInr,
    monthsToGoal: input.monthsToGoal,
    annualReturnPct,
    requiredSipInr,
    monthlySurplusInr,
    projectedCorpusAtSurplusInr,
    feasibleAtCurrentSurplus: monthlySurplusInr !== null && monthlySurplusInr >= requiredSipInr,
  };
}

function computeGoalFeasibility(context: AgentContext): GoalFeasibilitySnapshot | null {
  const goal = selectPrimaryGoal(context);
  if (!goal || !Number.isFinite(goal.target_amount_inr) || goal.target_amount_inr <= 0) {
    return null;
  }

  const monthsToGoal = resolveGoalMonths(goal, context);
  if (!monthsToGoal) {
    return null;
  }

  return computeFeasibilitySnapshot({
    goalTitle: goal.title,
    targetAmountInr: goal.target_amount_inr,
    monthsToGoal,
    context,
  });
}

function estimateMonthsToTarget(input: {
  targetAmountInr: number;
  annualReturnPct: number;
  monthlyContributionInr: number;
  currentSavingsInr: number;
}): number | null {
  if (input.monthlyContributionInr <= 0 || input.targetAmountInr <= 0) {
    return null;
  }

  const monthlyRate = input.annualReturnPct / 1200;
  for (let months = 1; months <= 600; months += 1) {
    const futureSavings = monthlyRate <= 0
      ? input.currentSavingsInr
      : input.currentSavingsInr * Math.pow(1 + monthlyRate, months);

    const corpus = futureSavings + futureValueFromSip(input.monthlyContributionInr, monthlyRate, months);
    if (corpus >= input.targetAmountInr) {
      return months;
    }
  }

  return null;
}

function dedupeSentences(value: string): string {
  const parts = value
    .match(/[^.!?]+[.!?]?/g)
    ?.map((item) => item.trim())
    .filter(Boolean) ?? [value.trim()];

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(part);
  }

  return deduped.join(" ").trim();
}

function normalizeNextAction(value: string): string {
  const stripped = value.replace(/^(next(\s*action)?\s*:?\s*)+/i, "").trim();
  return stripped.length > 0 ? stripped : value.trim();
}

function normalizeAdviceShape(advice: AgentStructuredAdvice): AgentStructuredAdvice {
  return {
    recommendation: dedupeSentences(advice.recommendation),
    reason: dedupeSentences(advice.reason),
    riskWarning: dedupeSentences(advice.riskWarning),
    nextAction: dedupeSentences(normalizeNextAction(advice.nextAction)),
  };
}

function extractCurrencyValues(text: string): number[] {
  const matches = Array.from(text.matchAll(/(?:₹|INR)\s*([0-9][0-9,]*(?:\.\d+)?)/gi));
  return matches
    .map((match) => Number.parseFloat((match[1] ?? "").replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function extractMonthlyInvestmentHintInr(text: string): number | null {
  const monthlyPattern = /(?:₹|INR)\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:per\s*month|\/\s*month|monthly)/i;
  const match = text.match(monthlyPattern);
  if (!match?.[1]) {
    return null;
  }

  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isCloseToKnownValue(candidate: number, knownValues: number[]): boolean {
  return knownValues.some((known) => {
    const tolerance = Math.max(500, known * 0.05);
    return Math.abs(candidate - known) <= tolerance;
  });
}

function collectKnownCurrencyValues(context: AgentContext, feasibility: GoalFeasibilitySnapshot | null): number[] {
  const values: number[] = [];

  const profileNumbers = [
    context.profile?.monthly_income_inr,
    context.profile?.monthly_expenses_inr,
    context.profile?.monthly_emi_inr,
    context.profile?.monthly_investable_surplus_inr,
    context.profile?.current_savings_inr,
  ];

  for (const value of profileNumbers) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      values.push(value);
    }
  }

  for (const goal of context.goals) {
    if (Number.isFinite(goal.target_amount_inr) && goal.target_amount_inr > 0) {
      values.push(goal.target_amount_inr);
    }
  }

  if (feasibility) {
    values.push(feasibility.targetAmountInr, feasibility.requiredSipInr, feasibility.projectedCorpusAtSurplusInr);
    if (feasibility.monthlySurplusInr) {
      values.push(feasibility.monthlySurplusInr);

      const plan = getAllocationPlan(resolveRiskBucket(context));
      values.push(
        Math.round((feasibility.monthlySurplusInr * plan.equityPct) / 100),
        Math.round((feasibility.monthlySurplusInr * plan.debtPct) / 100),
        Math.round((feasibility.monthlySurplusInr * plan.goldPct) / 100),
        Math.round((feasibility.monthlySurplusInr * plan.cashPct) / 100),
      );
    }
  }

  return values;
}

function hasSuspiciousCurrencyClaims(advice: AgentStructuredAdvice, context: AgentContext, feasibility: GoalFeasibilitySnapshot | null): boolean {
  const claims = extractCurrencyValues(
    [advice.recommendation, advice.reason, advice.riskWarning, advice.nextAction].join(" "),
  );

  if (claims.length === 0) {
    return false;
  }

  const knownValues = collectKnownCurrencyValues(context, feasibility);
  if (knownValues.length === 0) {
    return false;
  }

  const suspicious = claims.filter((claim) => !isCloseToKnownValue(claim, knownValues));
  return suspicious.length >= 1;
}

function hasSuspiciousProfileClaims(advice: AgentStructuredAdvice, context: AgentContext): boolean {
  const text = [advice.recommendation, advice.reason, advice.riskWarning, advice.nextAction].join(" ");

  const riskClaim = text.match(/risk\s*score\s*[:(]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (riskClaim?.[1]) {
    const claimed = Number.parseFloat(riskClaim[1]);
    const known = context.latestRiskAssessment?.risk_score;

    if (!Number.isFinite(claimed) || typeof known !== "number" || Math.abs(claimed - known) > 2) {
      return true;
    }
  }

  const savingsClaim = text.match(/current\s*savings\s*(?:is|of|:)?\s*(?:₹|INR)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (savingsClaim?.[1]) {
    const claimed = Number.parseFloat(savingsClaim[1].replace(/,/g, ""));
    const known = context.profile?.current_savings_inr;

    if (!Number.isFinite(claimed) || typeof known !== "number" || !isCloseToKnownValue(claimed, [known])) {
      return true;
    }
  }

  return false;
}

function enforceAdviceGuardrails(input: {
  advice: AgentStructuredAdvice;
  context: AgentContext;
  userMessage: string;
}): AgentStructuredAdvice {
  const normalized = normalizeAdviceShape(input.advice);
  const messageGoal = extractUserGoalIntent(input.userMessage);
  const feasibility = messageGoal
    ? computeFeasibilitySnapshot({
        goalTitle: messageGoal.goalTitle,
        targetAmountInr: messageGoal.targetAmountInr,
        monthsToGoal: messageGoal.monthsToGoal,
        context: input.context,
      })
    : computeGoalFeasibility(input.context);
  const goalIntent = /\b(goal|target|retire|retirement|car|house|home|education|wedding|year|years|month|months)\b/i.test(
    input.userMessage,
  ) || messageGoal !== null;

  const monthlyHint = extractMonthlyInvestmentHintInr(`${normalized.recommendation} ${normalized.nextAction}`);
  const understatedContribution =
    feasibility !== null &&
    goalIntent &&
    monthlyHint !== null &&
    feasibility.requiredSipInr > 0 &&
    monthlyHint < feasibility.requiredSipInr * 0.85;

  const infeasibleWithCurrentCapacity =
    feasibility !== null &&
    goalIntent &&
    feasibility.requiredSipInr > 0 &&
    feasibility.monthlySurplusInr !== null &&
    feasibility.requiredSipInr > feasibility.monthlySurplusInr * 1.05;

  const targetFundingRatio =
    feasibility !== null && feasibility.targetAmountInr > 0
      ? feasibility.projectedCorpusAtSurplusInr / feasibility.targetAmountInr
      : null;

  const materiallyUnderfunded =
    feasibility !== null &&
    goalIntent &&
    targetFundingRatio !== null &&
    targetFundingRatio < 0.8;

  const suspiciousClaims =
    hasSuspiciousCurrencyClaims(normalized, input.context, feasibility) || hasSuspiciousProfileClaims(normalized, input.context);

  if (feasibility && (understatedContribution || infeasibleWithCurrentCapacity || materiallyUnderfunded)) {
    const years = (feasibility.monthsToGoal / 12).toFixed(feasibility.monthsToGoal % 12 === 0 ? 0 : 1);
    const surplusLabel = feasibility.monthlySurplusInr ? formatInr(feasibility.monthlySurplusInr) : "not provided";
    const projectedLabel = formatInr(Math.round(feasibility.projectedCorpusAtSurplusInr));
    const currentSavings =
      typeof input.context.profile?.current_savings_inr === "number" && Number.isFinite(input.context.profile.current_savings_inr)
        ? input.context.profile.current_savings_inr
        : 0;
    const monthsNeededAtSurplus =
      feasibility.monthlySurplusInr && feasibility.monthlySurplusInr > 0
        ? estimateMonthsToTarget({
            targetAmountInr: feasibility.targetAmountInr,
            annualReturnPct: feasibility.annualReturnPct,
            monthlyContributionInr: feasibility.monthlySurplusInr,
            currentSavingsInr: currentSavings,
          })
        : null;
    const yearsNeededAtSurplus = monthsNeededAtSurplus ? (monthsNeededAtSurplus / 12).toFixed(1) : null;

    const feasibilityMessage = infeasibleWithCurrentCapacity || materiallyUnderfunded
      ? `At current inputs, ${feasibility.goalTitle} (${formatInr(feasibility.targetAmountInr)} in about ${years} years) is not feasible with current monthly capacity. It needs roughly ${formatInr(feasibility.requiredSipInr)} per month at about ${feasibility.annualReturnPct}% expected annual return.`
      : `To target ${formatInr(feasibility.targetAmountInr)} for ${feasibility.goalTitle} in about ${years} years, plan around ${formatInr(feasibility.requiredSipInr)} monthly at about ${feasibility.annualReturnPct}% expected annual return.`;

    const timelineHint = yearsNeededAtSurplus
      ? ` At current surplus (${surplusLabel}), expected timeline is closer to about ${yearsNeededAtSurplus} years.`
      : "";

    return {
      recommendation: `${feasibilityMessage}${timelineHint}`,
      reason: `Your available monthly surplus is ${surplusLabel}. At that contribution level, projected corpus is about ${projectedLabel} for this timeline, so assumptions must stay realistic and math-consistent.`,
      riskWarning:
        "Avoid relying on outsized return assumptions to close a funding gap. Use realistic return ranges, maintain emergency liquidity, and rebalance based on your risk profile.",
      nextAction:
        "Choose one now: increase monthly contribution, extend timeline, or reduce target amount. Then re-run the plan with your exact target amount and date before investing.",
    };
  }

  if (suspiciousClaims) {
    return {
      ...normalized,
      reason:
        "Some numeric claims could not be verified against your stored profile/goal inputs and were removed. Use only explicit profile values and feasibility math before acting.",
    };
  }

  return normalized;
}

function formatStructuredAdvice(advice: AgentStructuredAdvice): string {
  return [
    "Recommendation:",
    advice.recommendation,
    "",
    "Reason:",
    advice.reason,
    "",
    "Risk warning:",
    advice.riskWarning,
    "",
    "Next action:",
    advice.nextAction,
  ].join("\n");
}

function extractRetrySeconds(message: string): string | null {
  const match = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match?.[1]) {
    return null;
  }

  const retry = Number.parseFloat(match[1]);
  if (!Number.isFinite(retry) || retry <= 0) {
    return null;
  }

  return `${Math.ceil(retry)}s`;
}

function summarizeNimErrorBody(raw: string): string {
  const withoutTags = raw.replace(/<[^>]+>/g, " ");
  const compact = withoutTags.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "No response body";
  }

  return compact.length > 320 ? `${compact.slice(0, 317)}...` : compact;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    const delay = asDate - Date.now();
    return delay > 0 ? delay : 0;
  }

  return null;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof NimApiError || error instanceof DeepSeekApiError) {
    return isRetryableStatus(error.status);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket") ||
    message.includes("econn")
  );
}

function getRetryAfterFromError(error: unknown): number | null {
  if (error instanceof NimApiError || error instanceof DeepSeekApiError) {
    return error.retryAfterMs;
  }

  return null;
}

function resolveRetryDelayMs(error: unknown, deadlineAt: number): number | null {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) {
    return null;
  }

  const retryAfterMs = getRetryAfterFromError(error);
  if (retryAfterMs !== null) {
    if (retryAfterMs > RETRY_AFTER_MAX_MS) {
      return null;
    }

    return Math.min(retryAfterMs, remaining);
  }

  const jitter = Math.floor(Math.random() * (RETRY_JITTER_MS + 1));
  const delay = RETRY_BASE_DELAY_MS + jitter;
  return delay <= remaining ? delay : null;
}

function resolveAttemptTimeoutMs(preferredTimeoutMs: number, deadlineAt: number): number {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) {
    return 0;
  }

  return Math.min(preferredTimeoutMs, remaining);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown provider error.";
}

function pushProviderStatus(circuit: ProviderCircuit, status: number) {
  circuit.recentStatuses.push(status);
  if (circuit.recentStatuses.length > CIRCUIT_SAMPLE_SIZE) {
    circuit.recentStatuses.shift();
  }
}

function closeCircuit(circuit: ProviderCircuit) {
  circuit.mode = "closed";
  circuit.openUntil = 0;
  circuit.consecutiveRetryableFailures = 0;
  circuit.halfOpenProbeAttempts = 0;
  circuit.halfOpenProbeSuccesses = 0;
}

function openCircuit(circuit: ProviderCircuit, now: number) {
  circuit.mode = "open";
  circuit.openUntil = now + CIRCUIT_OPEN_MS;
  circuit.consecutiveRetryableFailures = 0;
  circuit.halfOpenProbeAttempts = 0;
  circuit.halfOpenProbeSuccesses = 0;
}

function getProviderErrorStatus(error: unknown): number | null {
  if (error instanceof NimApiError || error instanceof DeepSeekApiError) {
    return error.status;
  }

  return null;
}

function shouldTripCircuit(circuit: ProviderCircuit): boolean {
  if (circuit.consecutiveRetryableFailures >= CIRCUIT_CONSECUTIVE_FAILURES) {
    return true;
  }

  if (circuit.recentStatuses.length < CIRCUIT_SAMPLE_SIZE) {
    return false;
  }

  const rateLimitedCount = circuit.recentStatuses.filter((status) => status === 429).length;
  const rateLimitedRatio = rateLimitedCount / circuit.recentStatuses.length;
  return rateLimitedRatio >= CIRCUIT_RATE_LIMIT_THRESHOLD;
}

function prepareProviderCall(provider: ProviderName) {
  const circuit = providerCircuits[provider];
  const now = Date.now();

  if (circuit.mode === "open") {
    if (now < circuit.openUntil) {
      throw new ProviderCircuitOpenError(provider, circuit.openUntil - now);
    }

    circuit.mode = "half-open";
    circuit.halfOpenProbeAttempts = 0;
    circuit.halfOpenProbeSuccesses = 0;
  }

  if (circuit.mode === "half-open") {
    if (circuit.halfOpenProbeAttempts >= CIRCUIT_HALF_OPEN_PROBE_TARGET) {
      if (circuit.halfOpenProbeSuccesses >= CIRCUIT_HALF_OPEN_PROBE_TARGET) {
        closeCircuit(circuit);
      } else {
        openCircuit(circuit, now);
        throw new ProviderCircuitOpenError(provider, CIRCUIT_OPEN_MS);
      }
    }

    if (circuit.mode === "half-open") {
      circuit.halfOpenProbeAttempts += 1;
    }
  }
}

function recordProviderSuccess(provider: ProviderName) {
  const circuit = providerCircuits[provider];
  pushProviderStatus(circuit, 200);

  if (circuit.mode === "half-open") {
    circuit.halfOpenProbeSuccesses += 1;
    if (circuit.halfOpenProbeSuccesses >= CIRCUIT_HALF_OPEN_PROBE_TARGET) {
      closeCircuit(circuit);
    }
    return;
  }

  circuit.consecutiveRetryableFailures = 0;
}

function recordProviderFailure(provider: ProviderName, error: unknown, retryable: boolean) {
  const circuit = providerCircuits[provider];
  const now = Date.now();
  const status = getProviderErrorStatus(error);

  if (status !== null) {
    pushProviderStatus(circuit, status);
  }

  if (circuit.mode === "half-open") {
    openCircuit(circuit, now);
    return;
  }

  if (retryable) {
    circuit.consecutiveRetryableFailures += 1;
  } else {
    circuit.consecutiveRetryableFailures = 0;
  }

  if (shouldTripCircuit(circuit)) {
    openCircuit(circuit, now);
  }
}

function isNimCapacityError(error: unknown): boolean {
  if (error instanceof ProviderCircuitOpenError) {
    return true;
  }

  if (error instanceof ProviderQualityError) {
    return true;
  }

  if (error instanceof NimApiError || error instanceof DeepSeekApiError) {
    return isRetryableStatus(error.status) || error.status === 401;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("nvidia nim api error (429)") ||
    message.includes("nvidia nim api error (401)") ||
    message.includes("nvidia nim api error (5") ||
    message.includes("bad gateway") ||
    message.includes("gateway timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("upstream") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("missing nvidia_nim_api_key") ||
    message.includes("missing nim_api_key") ||
    message.includes("missing deepseek_api_key") ||
    message.includes("quality gate failed")
  );
}

function buildFallbackDashboardActionPlan(context: AgentContext, reason: string): string {
  const monthlySurplus = resolveMonthlySurplus(context);
  const emergencyMonths = context.profile?.emergency_fund_months;
  const riskBucket = resolveRiskBucket(context);
  const plan = getAllocationPlan(riskBucket);
  const eightyC = context.latestTaxProfile?.section_80c_used_inr;
  const retryIn = extractRetrySeconds(reason);

  const actions: string[] = [];

  if (typeof emergencyMonths === "number" && emergencyMonths < 6) {
    actions.push(
      `1) Increase emergency fund from ${emergencyMonths.toFixed(1)} months toward 6 months before raising equity exposure.`,
    );
  } else {
    actions.push("1) Maintain your emergency corpus at 6 months of expenses in a liquid, low-risk bucket.");
  }

  if (monthlySurplus && monthlySurplus > 0) {
    actions.push(
      `2) Deploy monthly surplus of ${formatInr(monthlySurplus)} using: ${formatAllocationLine(monthlySurplus, plan)}.`,
    );
  } else {
    actions.push(
      "2) Start with a fixed monthly SIP amount and use a balanced split: 55% equity, 30% debt, 10% gold, 5% liquid reserve.",
    );
  }

  if (typeof eightyC === "number" && eightyC < 150000) {
    const remaining = Math.max(150000 - eightyC, 0);
    actions.push(`3) Use remaining Section 80C room of ${formatInr(remaining)} with tax-efficient instruments this year.`);
  } else {
    actions.push("3) Review tax optimization for Section 80C/80D utilization and rebalance once per quarter.");
  }

  const cautionLines = [
    `CAUTION: AI model is temporarily unavailable due to NVIDIA NIM limits/availability${retryIn ? ` (retry after ~${retryIn})` : ""}.`,
    "This is a rules-based fallback summary; verify suitability before execution.",
    `Risk note: ${plan.note}`,
  ];

  return ["ACTIONS", ...actions, "", ...cautionLines].join("\n");
}

function buildFallbackChatStructuredAdvice(input: {
  message: string;
  context: AgentContext;
  reason: string;
}): AgentStructuredAdvice {
  const monthlySurplus = resolveMonthlySurplus(input.context);
  const riskBucket = resolveRiskBucket(input.context);
  const plan = getAllocationPlan(riskBucket);
  const retryIn = extractRetrySeconds(input.reason);
  const normalizedMessage = input.message.toLowerCase();

  const recommendation =
    monthlySurplus && monthlySurplus > 0
      ? `Invest ${formatInr(monthlySurplus)} each month using this split: ${formatAllocationLine(monthlySurplus, plan)}.`
      : "Start with a manageable SIP amount and use a baseline split of 55% equity, 30% debt, 10% gold, and 5% liquid reserve.";

  const rationaleParts = [
    `This aligns with your ${riskBucket} risk context and prioritizes diversified allocation instead of single-bet exposure.`,
    "It keeps execution simple with a repeatable monthly process.",
  ];

  if (normalizedMessage.includes("tax") || normalizedMessage.includes("80c") || normalizedMessage.includes("80d")) {
    rationaleParts.push("Tax-aware investing can improve net outcomes when Section 80C and 80D limits are utilized first.");
  }

  const riskWarning = [
    `Live AI response is temporarily unavailable due to NVIDIA NIM limits/availability${retryIn ? ` (retry after ~${retryIn})` : ""}.`,
    `Fallback guidance is rules-based. ${plan.note}`,
    "Educational guidance only. Validate suitability before investing.",
  ].join(" ");

  let nextAction = "Create one SIP mandate today and set a month-end review to rebalance and step up contributions by 5-10% after income increases.";

  if (normalizedMessage.includes("tax") || normalizedMessage.includes("80c") || normalizedMessage.includes("80d")) {
    nextAction =
      "Before your next SIP date, check remaining 80C/80D room and route eligible investments to tax-efficient instruments first.";
  }

  if (normalizedMessage.includes("goal") || normalizedMessage.includes("house") || normalizedMessage.includes("education")) {
    nextAction =
      "Map each goal to a target year today, then reduce equity allocation for goals that are less than 3 years away.";
  }

  return {
    recommendation,
    reason: rationaleParts.join(" "),
    riskWarning,
    nextAction,
  };
}

function truncateText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function computeAgeYears(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth || typeof dateOfBirth !== "string") {
    return null;
  }

  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }

  return age >= 0 && age < 120 ? age : null;
}

function summarizeHoldings(context: AgentContext) {
  const holdingsWithValue = context.holdings.map((holding) => {
    const marketValueInr = Math.round(holding.quantity * holding.current_price_inr);
    const costValueInr = Math.round(holding.quantity * holding.average_buy_price_inr);
    const pnlPct = costValueInr > 0 ? Math.round(((marketValueInr - costValueInr) / costValueInr) * 10000) / 100 : null;

    return {
      symbol: holding.instrument_symbol,
      name: holding.instrument_name,
      assetClass: holding.asset_class,
      sector: holding.sector,
      marketValueInr,
      pnlPct,
    };
  });

  const totalValueInr = holdingsWithValue.reduce((sum, holding) => sum + holding.marketValueInr, 0);
  const assetAllocation = holdingsWithValue.reduce<Record<string, number>>((accumulator, holding) => {
    const key = holding.assetClass.toLowerCase();
    accumulator[key] = (accumulator[key] ?? 0) + holding.marketValueInr;
    return accumulator;
  }, {});

  const allocationPct = Object.entries(assetAllocation)
    .map(([assetClass, valueInr]) => ({
      assetClass,
      pct: totalValueInr > 0 ? Math.round((valueInr / totalValueInr) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return {
    totalHoldings: holdingsWithValue.length,
    totalMarketValueInr: totalValueInr,
    topHoldings: holdingsWithValue
      .slice()
      .sort((a, b) => b.marketValueInr - a.marketValueInr)
      .slice(0, 6),
    allocationPct,
  };
}

function summarizeGoals(context: AgentContext) {
  const prioritized = context.goals
    .slice()
    .sort((a, b) => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      const left = priorityRank[(a.priority?.toLowerCase() as keyof typeof priorityRank) ?? "medium"] ?? 1;
      const right = priorityRank[(b.priority?.toLowerCase() as keyof typeof priorityRank) ?? "medium"] ?? 1;

      if (left !== right) {
        return left - right;
      }

      const leftDate = a.target_date ? Date.parse(a.target_date) : Number.POSITIVE_INFINITY;
      const rightDate = b.target_date ? Date.parse(b.target_date) : Number.POSITIVE_INFINITY;
      return leftDate - rightDate;
    })
    .slice(0, 4)
    .map((goal) => ({
      title: goal.title,
      category: goal.category,
      priority: goal.priority,
      targetAmountInr: goal.target_amount_inr,
      targetDate: goal.target_date,
    }));

  return {
    totalGoals: context.goals.length,
    priorityGoals: prioritized,
  };
}

function buildPersonalizationAnchor(context: AgentContext): string {
  const riskBucket = resolveRiskBucket(context);
  const surplus = resolveMonthlySurplus(context);
  const surplusBand =
    surplus === null ? "unknown" : surplus < 10000 ? "low_surplus" : surplus < 50000 ? "mid_surplus" : "high_surplus";
  const topGoal = context.goals[0]?.category ?? "goal_unspecified";
  const taxRegime = context.latestTaxProfile?.tax_regime ?? context.profile?.tax_regime ?? "tax_unknown";
  const holdingsBand =
    context.holdings.length === 0 ? "no_holdings" : context.holdings.length < 5 ? "focused_holdings" : "diversified_holdings";

  return [riskBucket, surplusBand, topGoal, taxRegime, holdingsBand].join("|");
}

function contextKeywordsForValidation(context: AgentContext): string[] {
  const keywords = new Set<string>();

  const riskBucket = resolveRiskBucket(context).toLowerCase();
  if (riskBucket) {
    keywords.add(riskBucket);
  }

  const taxRegime = (context.latestTaxProfile?.tax_regime ?? context.profile?.tax_regime ?? "").toLowerCase();
  if (taxRegime) {
    keywords.add(taxRegime);
  }

  const employmentType = (context.profile?.employment_type ?? "").toLowerCase();
  if (employmentType) {
    keywords.add(employmentType.replace("_", " "));
  }

  const topGoalTitle = context.goals[0]?.title?.toLowerCase() ?? "";
  if (topGoalTitle) {
    for (const token of topGoalTitle.split(/\s+/)) {
      if (token.length >= 4) {
        keywords.add(token);
      }
    }
  }

  return Array.from(keywords);
}

function buildPersonalizationSnippet(context: AgentContext): string | null {
  const parts: string[] = [];
  const firstName = context.profile?.full_name?.trim().split(/\s+/)[0] ?? null;
  const riskBucket = resolveRiskBucket(context);
  const surplus = resolveMonthlySurplus(context);
  const topGoal = context.goals[0]?.title ?? null;
  const taxRegime = context.latestTaxProfile?.tax_regime ?? context.profile?.tax_regime ?? null;

  if (firstName) {
    parts.push(`${firstName}, this aligns with your current profile.`);
  }

  if (typeof surplus === "number" && Number.isFinite(surplus) && surplus > 0) {
    parts.push(`Your monthly investable surplus is around ${formatInr(surplus)}.`);
  }

  if (riskBucket) {
    parts.push(`Your risk posture is ${riskBucket}.`);
  }

  if (topGoal) {
    parts.push(`Your top stated goal is ${topGoal}.`);
  }

  if (taxRegime) {
    parts.push(`Current tax regime recorded is ${taxRegime}.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function ensurePersonalizedAdvice(advice: AgentStructuredAdvice, context: AgentContext): AgentStructuredAdvice {
  const combined = `${advice.recommendation} ${advice.reason} ${advice.nextAction}`.toLowerCase();
  const keywords = contextKeywordsForValidation(context);
  const hasContextSignals = keywords.some((keyword) => combined.includes(keyword));

  if (hasContextSignals) {
    return advice;
  }

  const snippet = buildPersonalizationSnippet(context);
  if (!snippet) {
    return advice;
  }

  return {
    ...advice,
    reason: `${advice.reason} ${snippet}`.trim(),
  };
}

function buildSystemInstruction(mode: "chat" | "dashboard"): string {
  const common = [
    "You are Pravix AI Wealth Advisor for Indian families.",
    "Give educational guidance, not guaranteed returns or personalized legal/tax certification.",
    "Never promise profit, never suggest illegal tax evasion, and clearly call out uncertainty.",
    "Prefer concise, actionable recommendations with INR examples when useful.",
    "If key inputs are missing, ask a short follow-up question instead of guessing.",
  ];

  if (mode === "dashboard") {
    return [
      ...common,
      "Generate exactly 3 action items and 1 caution note.",
      "Output plain text with headings: ACTIONS and CAUTION.",
    ].join(" ");
  }

  return [
    ...common,
    "Sound warm, human, and engaging. Use natural conversation style and avoid robotic phrasing.",
    "Open with one short empathetic sentence and maintain a confident but friendly tone.",
    "Personalize every answer by referencing at least two concrete user facts from the provided context.",
    "Never invent numbers. Mention currency values only if present in context or clearly derived from context math.",
    "Run feasibility math before giving SIP suggestions. If required monthly SIP exceeds user surplus or implies unrealistic growth, explicitly say the goal is not feasible under current assumptions.",
    "Respond in valid JSON only with exactly these string keys: recommendation, reason, riskWarning, nextAction.",
    "Keep each field specific, concise, and practical in 1-2 sentences.",
    "Include allocation logic, time horizon fit, and risk suitability in recommendation and reason.",
  ].join(" ");
}

export function buildContextBlock(context: AgentContext): string {
  const profile = context.profile;
  const risk = context.latestRiskAssessment;
  const tax = context.latestTaxProfile;
  const holdingsSummary = summarizeHoldings(context);
  const goalsSummary = summarizeGoals(context);
  const personalizationAnchor = buildPersonalizationAnchor(context);

  const onboardingProfile = profile
    ? {
        ...profile,
        age_years: computeAgeYears(profile.date_of_birth),
        liquidity_needs_notes: truncateText(profile.liquidity_needs_notes, 220),
      }
    : null;

  return JSON.stringify(
    {
      personalizationAnchor,
      onboardingProfile,
      risk,
      goals: context.goals,
      goalsSummary,
      tax,
      communicationPreferences: context.communicationPreferences,
      holdingsSummary,
      enabledAlertsCount: context.enabledAlertsCount,
    },
  );
}

async function callNim(
  messages: NimMessage[],
  generationConfig: { temperature: number; maxOutputTokens: number },
  timeoutMs: number,
): Promise<string> {
  const apiKey = getNimApiKey();
  const effectiveTimeoutMs = timeoutMs > 0 ? timeoutMs : getNimTimeoutMs();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), effectiveTimeoutMs);

  let response: Response;

  try {
    response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getNimModel(),
        messages,
        temperature: generationConfig.temperature,
        max_tokens: generationConfig.maxOutputTokens,
        top_p: 0.9,
      }),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`NVIDIA NIM API timeout after ${effectiveTimeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    throw new NimApiError(response.status, summarizeNimErrorBody(rawBody), retryAfterMs);
  }

  let data: NimChatCompletionsResponse;

  try {
    data = JSON.parse(rawBody) as NimChatCompletionsResponse;
  } catch {
    throw new Error("NVIDIA NIM returned a malformed JSON payload.");
  }

  const content = data.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content.map((part) => part.text ?? "").join("\n").trim()
        : "";

  if (!text) {
    throw new Error("NVIDIA NIM returned an empty response.");
  }

  return text;
}

async function callDeepSeek(
  messages: NimMessage[],
  generationConfig: { temperature: number; maxOutputTokens: number },
  timeoutMs: number,
): Promise<string> {
  const apiKey = getDeepSeekApiKey();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getDeepSeekModel(),
        messages,
        temperature: generationConfig.temperature,
        max_tokens: generationConfig.maxOutputTokens,
        top_p: 0.9,
      }),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`DeepSeek API timeout after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    throw new DeepSeekApiError(response.status, summarizeNimErrorBody(rawBody), retryAfterMs);
  }

  let data: DeepSeekChatCompletionsResponse;

  try {
    data = JSON.parse(rawBody) as DeepSeekChatCompletionsResponse;
  } catch {
    throw new Error("DeepSeek returned a malformed JSON payload.");
  }

  const content = data.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content.map((part) => part.text ?? "").join("\n").trim()
        : "";

  if (!text) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return text;
}

async function callProviderWithRetry(input: {
  provider: ProviderName;
  attempt: (timeoutMs: number) => Promise<string>;
  preferredTimeoutMs: number;
  maxRetries: number;
  deadlineAt: number;
}): Promise<string> {
  prepareProviderCall(input.provider);

  let retriesUsed = 0;

  while (true) {
    const timeoutMs = resolveAttemptTimeoutMs(input.preferredTimeoutMs, input.deadlineAt);
    if (timeoutMs <= 0) {
      throw new Error("Provider routing deadline exceeded.");
    }

    try {
      const responseText = await input.attempt(timeoutMs);
      recordProviderSuccess(input.provider);
      return responseText;
    } catch (error) {
      const retryableError = isRetryableProviderError(error);
      const canRetry = retriesUsed < input.maxRetries && retryableError;
      if (!canRetry) {
        recordProviderFailure(input.provider, error, retryableError);
        throw error;
      }

      const retryDelayMs = resolveRetryDelayMs(error, input.deadlineAt);
      if (retryDelayMs === null) {
        recordProviderFailure(input.provider, error, true);
        throw error;
      }

      retriesUsed += 1;
      await sleep(retryDelayMs);
    }
  }
}

export async function generateAdvisorChatReply(input: {
  message: string;
  history: AgentChatHistoryItem[];
  context: AgentContext;
}): Promise<AdvisorChatReply> {
  const history = trimHistory(input.history);

  const messages: NimMessage[] = [
    { role: "system", content: buildSystemInstruction("chat") },
    ...history.map((item) => ({
      role: toNimRole(item.role),
      content: item.content,
    })),
    {
      role: "user",
      content: [
        "User financial context:",
        buildContextBlock(input.context),
        "User question:",
        input.message,
        "Use personalizationAnchor and onboardingProfile to tailor the response for this exact user.",
        "Reference at least two concrete data points from context (numbers or specific goals/risks).",
        "Provide a clear, engaging response with 2-4 practical next steps.",
      ].join("\n\n"),
    },
  ];

  const deadlineAt = Date.now() + CHAT_REQUEST_DEADLINE_MS;
  let primaryError: unknown = null;

  try {
    const raw = await callProviderWithRetry({
      provider: "nim",
      attempt: (timeoutMs) =>
        callNim(
          messages,
          {
            temperature: 0.35,
            maxOutputTokens: 420,
          },
          timeoutMs,
        ),
      preferredTimeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
      maxRetries: CHAT_PRIMARY_MAX_RETRIES,
      deadlineAt,
    });

    const strictStructured = parseStructuredAdviceStrict(raw);
    if (!strictStructured) {
      throw new ProviderQualityError("NIM", "Response missing required structured fields.");
    }

    const structured = enforceAdviceGuardrails({
      advice: ensurePersonalizedAdvice(strictStructured, input.context),
      context: input.context,
      userMessage: input.message,
    });
    return {
      reply: formatStructuredAdvice(structured),
      structured,
    };
  } catch (error) {
    primaryError = error;
  }

  try {
    const raw = await callProviderWithRetry({
      provider: "deepseek",
      attempt: (timeoutMs) =>
        callDeepSeek(
          messages,
          {
            temperature: 0.3,
            maxOutputTokens: 420,
          },
          timeoutMs,
        ),
      preferredTimeoutMs: CHAT_SECONDARY_TIMEOUT_MS,
      maxRetries: CHAT_SECONDARY_MAX_RETRIES,
      deadlineAt,
    });

    const strictStructured = parseStructuredAdviceStrict(raw);
    if (!strictStructured) {
      throw new ProviderQualityError("DeepSeek", "Response missing required structured fields.");
    }

    const structured = enforceAdviceGuardrails({
      advice: ensurePersonalizedAdvice(strictStructured, input.context),
      context: input.context,
      userMessage: input.message,
    });
    return {
      reply: formatStructuredAdvice(structured),
      structured,
    };
  } catch (secondaryError) {
    if (isNimCapacityError(primaryError) || isNimCapacityError(secondaryError)) {
      const reason = `${normalizeErrorMessage(primaryError)} | ${normalizeErrorMessage(secondaryError)}`;
      const structured = enforceAdviceGuardrails({
        advice: ensurePersonalizedAdvice(
          buildFallbackChatStructuredAdvice({
            message: input.message,
            context: input.context,
            reason,
          }),
          input.context,
        ),
        context: input.context,
        userMessage: input.message,
      });

      return {
        reply: formatStructuredAdvice(structured),
        structured,
      };
    }

    throw secondaryError;
  }
}

export async function generateDashboardActionPlan(context: AgentContext): Promise<string> {
  const messages: NimMessage[] = [
    { role: "system", content: buildSystemInstruction("dashboard") },
    {
      role: "user",
      content: [
        "Generate a short actionable wealth review for this user.",
        "Context:",
        buildContextBlock(context),
      ].join("\n\n"),
    },
  ];

  const deadlineAt = Date.now() + DASHBOARD_REQUEST_DEADLINE_MS;
  let primaryError: unknown = null;

  try {
    return await callProviderWithRetry({
      provider: "nim",
      attempt: (timeoutMs) =>
        callNim(
          messages,
          {
            temperature: 0.2,
            maxOutputTokens: 280,
          },
          timeoutMs,
        ),
      preferredTimeoutMs: DASHBOARD_PRIMARY_TIMEOUT_MS,
      maxRetries: DASHBOARD_PRIMARY_MAX_RETRIES,
      deadlineAt,
    });
  } catch (error) {
    primaryError = error;
  }

  try {
    return await callProviderWithRetry({
      provider: "deepseek",
      attempt: (timeoutMs) =>
        callDeepSeek(
          messages,
          {
            temperature: 0.2,
            maxOutputTokens: 280,
          },
          timeoutMs,
        ),
      preferredTimeoutMs: DASHBOARD_SECONDARY_TIMEOUT_MS,
      maxRetries: DASHBOARD_SECONDARY_MAX_RETRIES,
      deadlineAt,
    });
  } catch (secondaryError) {
    if (isNimCapacityError(primaryError) || isNimCapacityError(secondaryError)) {
      const reason = `${normalizeErrorMessage(primaryError)} | ${normalizeErrorMessage(secondaryError)}`;
      return buildFallbackDashboardActionPlan(context, reason);
    }

    throw secondaryError;
  }
}