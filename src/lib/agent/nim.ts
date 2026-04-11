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

function buildFallbackStructuredAdviceFromText(raw: string): AgentStructuredAdvice {
  const compact = raw.replace(/\s+/g, " ").trim();
  const sentences = compact.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const recommendation =
    sentences[0] ?? "Start with a diversified monthly SIP aligned to your risk profile and investment horizon.";
  const reason =
    sentences[1] ??
    "This suggestion is based on your stored profile, risk context, and available goal and tax inputs.";

  return {
    recommendation,
    reason,
    riskWarning:
      "Markets are volatile and returns are not guaranteed. Validate liquidity needs and risk tolerance before acting.",
    nextAction: "Implement one SIP this week, then review allocation and goal progress at month-end.",
  };
}

function toStructuredAdvice(raw: string): AgentStructuredAdvice {
  return (
    parseStructuredAdviceFromJson(raw) ??
    parseStructuredAdviceFromSections(raw) ??
    buildFallbackStructuredAdviceFromText(raw)
  );
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

function isNimCapacityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("nvidia nim api error (429)") ||
    message.includes("nvidia nim api error (401)") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("missing nvidia_nim_api_key") ||
    message.includes("missing nim_api_key")
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
    null,
    2,
  );
}

async function callNim(
  messages: NimMessage[],
  generationConfig: { temperature: number; maxOutputTokens: number },
): Promise<string> {
  const apiKey = getNimApiKey();
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`NVIDIA NIM API error (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as NimChatCompletionsResponse;
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

  try {
    const raw = await callNim(messages, {
      temperature: 0.35,
      maxOutputTokens: 900,
    });

    const structured = ensurePersonalizedAdvice(toStructuredAdvice(raw), input.context);
    return {
      reply: formatStructuredAdvice(structured),
      structured,
    };
  } catch (error) {
    if (isNimCapacityError(error)) {
      const reason = error instanceof Error ? error.message : "NVIDIA NIM unavailable";
      const structured = ensurePersonalizedAdvice(
        buildFallbackChatStructuredAdvice({
          message: input.message,
          context: input.context,
          reason,
        }),
        input.context,
      );

      return {
        reply: formatStructuredAdvice(structured),
        structured,
      };
    }

    throw error;
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

  try {
    return await callNim(messages, {
      temperature: 0.2,
      maxOutputTokens: 450,
    });
  } catch (error) {
    if (isNimCapacityError(error)) {
      const reason = error instanceof Error ? error.message : "NVIDIA NIM unavailable";
      return buildFallbackDashboardActionPlan(context, reason);
    }

    throw error;
  }
}