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

class OpenRouterApiError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(status: number, bodyPreview: string, retryAfterMs: number | null) {
    super(`OpenRouter API error (${status}): ${bodyPreview}`);
    this.name = "OpenRouterApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

class ProviderQualityError extends Error {
  provider: "OpenRouter";

type AllocationPlan = {
  equityPct: number;
  debtPct: number;
  goldPct: number;
  liquidPct: number;
  note: string;
};

type AdvisorChatReply = {
  reply: string;
  raw: string;
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

type ProviderName = "openrouter";
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

const CHAT_PRIMARY_TIMEOUT_MS = 25000;
const CHAT_PRIMARY_MAX_RETRIES = 2;
const DASHBOARD_PRIMARY_TIMEOUT_MS = 15000;
const DASHBOARD_PRIMARY_MAX_RETRIES = 1;
const DASHBOARD_REQUEST_DEADLINE_MS = 30000;

let providerSuccessCount = {
  openrouter: 0,
  nvidia: 0,
};

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5";
}

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY;
}

function recordProviderSuccess(provider: "openrouter" | "nvidia") {
  providerSuccessCount[provider]++;
}

function inferProviderFromErrorReason(reason: string): string {
  if (reason.toLowerCase().includes("nvidia") || reason.toLowerCase().includes("nim")) return "NVIDIA NIM";
  if (reason.toLowerCase().includes("openrouter")) return "OpenRouter";
  return "AI Provider";
}

function isNimCapacityError(error: unknown): boolean {
  if (error instanceof OpenRouterApiError) {
    return error.status === 429 || error.status === 503 || error.status === 504 || error.status >= 500;
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    msg.includes("deadline") ||
    msg.includes("capacity")
  );
}

function getAllocationPlan(riskBucket: string): AllocationPlan {
  if (riskBucket.includes("aggressive") || riskBucket.includes("high")) {
    return {
      equityPct: 75,
      debtPct: 15,
      goldPct: 10,
      liquidPct: 0,
      note: "Higher equity mix can be volatile; keep a long horizon and avoid panic exits.",
    };
  }

  if (riskBucket.includes("conservative") || riskBucket.includes("low")) {
    return {
      equityPct: 30,
      debtPct: 55,
      goldPct: 10,
      liquidPct: 5,
      note: "Conservative allocation prioritizes stability and smoother drawdowns over max growth.",
    };
  }

  return {
    equityPct: 55,
    debtPct: 30,
    goldPct: 10,
    liquidPct: 5,
    note: "Balanced allocation targets growth with risk control through debt and gold diversification.",
  };
}

function formatAllocationLine(monthlyAmount: number, plan: AllocationPlan): string {
  const equity = Math.round((monthlyAmount * plan.equityPct) / 100);
  const debt = Math.round((monthlyAmount * plan.debtPct) / 100);
  const gold = Math.round((monthlyAmount * plan.goldPct) / 100);
  const liquid = Math.round((monthlyAmount * plan.liquidPct) / 100);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pravix.in",
        "X-Title": "Pravix Advisor",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
      }),
    });

  if (plan.liquidPct > 0) {
    parts.push(`${plan.liquidPct}% liquid reserve (${formatInr(liquid)})`);
  }
}

async function callNvidia(
  messages: NimMessage[],
  options: { temperature: number; maxOutputTokens: number },
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NVIDIA NIM API error (${response.status}): ${summarizeNimErrorBody(body)}`);
    }

    const data = (await response.json()) as NimChatCompletionsResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from NVIDIA NIM");
    }

    if (Array.isArray(content)) {
      return content.find((c) => c.type === "text")?.text || "";
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callProviderWithRetry(params: {
  provider: "openrouter" | "nvidia";
  attempt: (timeoutMs: number) => Promise<string>;
  preferredTimeoutMs: number;
  maxRetries: number;
  deadlineAt: number;
}): Promise<string> {
  let lastError: unknown;

  for (let i = 0; i < params.maxRetries; i++) {
    const timeLeft = params.deadlineAt - Date.now();
    if (timeLeft <= 1000) break;

    const currentTimeout = Math.min(params.preferredTimeoutMs + i * 5000, timeLeft);

    try {
      return await params.attempt(currentTimeout);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(`[callProviderWithRetry] ${params.provider} timeout on attempt ${i + 1}`);
        continue;
      }
      if (error instanceof OpenRouterApiError && error.status === 429) {
        const wait = error.retryAfterMs || 2000;
        console.warn(`[callProviderWithRetry] ${params.provider} rate limit. Waiting ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error(`Failed ${params.provider} after ${params.maxRetries} attempts`);
}

function parseStructuredAdviceFromJson(raw: string): AgentStructuredAdvice | null {
  try {
    const cleaned = raw.replace(/```json\n?|```\n?/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      return parsed as AgentStructuredAdvice;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeAdviceField(text: string | undefined): string | null {
  if (!text) return null;
  return text.replace(/[*_#~]/g, "").trim();
}

function parseStructuredAdviceFromSections(raw: string): AgentStructuredAdvice | null {
  const recommendationMatch = raw.match(/RECOMMENDATION:?\s*([\s\S]+?)(?=REASON:?|RISK:?|ACTION:?|$)/i);
  const reasonMatch = raw.match(/REASON:?\s*([\s\S]+?)(?=RISK:?|ACTION:?|$)/i);
  const riskMatch = raw.match(/(?:RISK|WARNING):?\s*([\s\S]+?)(?=ACTION:?|NEXT:?|$)/i);
  const actionMatch = raw.match(/(?:ACTION|NEXT):?\s*([\s\S]+?)$/i);

  if (!recommendationMatch) return null;

  const recommendation = normalizeAdviceField(recommendationMatch[1]);
  const reason = normalizeAdviceField(reasonMatch?.[1]);
  const riskWarning = normalizeAdviceField(riskMatch?.[1]);
  const nextAction = normalizeAdviceField(actionMatch?.[1]);

  if (!recommendation) return null;

  return {
    recommendation,
    reason: reason || "Based on your financial profile and goals.",
    riskWarning: riskWarning || "Returns are market-linked and not guaranteed.",
    nextAction: nextAction || "Start a monthly SIP and review quarterly.",
  };
}

function parseStructuredAdviceStrict(raw: string): AgentStructuredAdvice | null {
  return parseStructuredAdviceFromJson(raw) ?? parseStructuredAdviceFromSections(raw);
}

function buildRawTextStructuredAdvice(rawText: string, userMessage: string): AgentStructuredAdvice {
  const cleaned = rawText.replace(/```json\n?|```\n?/gi, "").trim();
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);

  let recommendation = "";
  let currentSection = "";
  const sections: Record<string, string[]> = {};

  for (const line of lines) {
    if (!recommendation) {
      recommendation = line;
      continue;
    }
    // Detect CAPS section titles
    if (
      /^[A-Z][A-Z\s]{4,}$/.test(line) &&
      !line.startsWith("–") &&
      !line.startsWith("-") &&
      !line.startsWith("📌")
    ) {
      currentSection = line;
      sections[currentSection] = [];
      continue;
    }
    if (currentSection) {
      sections[currentSection] = sections[currentSection] ?? [];
      (sections[currentSection] as string[]).push(line);
    }
  }

  const takeawayKey = Object.keys(sections).find(
    (k) => k.includes("TAKEAWAY") || k.includes("KEY")
  );
  const takeaway = takeawayKey
    ? (sections[takeawayKey] ?? []).join(" ")
    : "";

  const actionKey = Object.keys(sections).find((k) => k.includes("ACTION"));
  const actionLines = actionKey ? (sections[actionKey] ?? []) : [];
  const actionPlanRows = actionLines
    .filter((l) => l.startsWith("–") || l.startsWith("-"))
    .map((l) => {
      const clean = l.replace(/^[–\-]\s*/, "");
      const arrowParts = clean.split("→");
      const colonMatch = clean.match(/^([^:]+):(.*)$/);
      const colonParts = colonMatch ? [colonMatch[1], colonMatch[2]] : [clean];
      if (arrowParts.length >= 2) {
        return {
          category: arrowParts[0]?.trim() ?? clean,
          amount: "—",
          whereToInvest: arrowParts[1]?.trim() ?? "—",
        };
      }
      if (colonParts.length >= 2) {
        return {
          category: colonParts[0]?.trim() ?? clean,
          amount: "—",
          whereToInvest: colonParts[1]?.trim() ?? "—",
        };
      }
      return { category: clean, amount: "—", whereToInvest: "—" };
    })
    .filter((r) => r.category.length > 0)
    .slice(0, 6);

  const allocKey = Object.keys(sections).find(
    (k) => k.includes("ALLOCAT") || k.includes("SIP")
  );
  const allocLines = allocKey ? (sections[allocKey] ?? []) : [];
  const portfolioBuckets: NonNullable<AgentStructuredAdvice["portfolioBuckets"]> = [];
  let currentBucket: { heading: string; lines: string[] } | null = null;

  for (const line of allocLines) {
    if (/^\d+\./.test(line)) {
      if (currentBucket) {
        portfolioBuckets.push({
          heading: currentBucket.heading,
          expectedReturn:
            currentBucket.lines.find(
              (l) => l.toLowerCase().includes("return") || l.includes("%")
            ) ?? "10–12% p.a.",
          instruments: currentBucket.lines
            .filter((l) => l.toLowerCase().includes("invest in"))
            .map((l) => l.replace(/^.*invest in:\s*/i, "").trim()),
          allocationHint:
            currentBucket.lines.find(
              (l) =>
                !l.toLowerCase().includes("return") &&
                !l.toLowerCase().includes("invest")
            ) ?? "",
        });
      }
      currentBucket = {
        heading: line.replace(/^\d+\.\s*/, ""),
        lines: [],
      };
    } else if (currentBucket) {
      currentBucket.lines.push(line.replace(/^[-–]\s*/, ""));
    }
  }
  if (currentBucket) {
    portfolioBuckets.push({
      heading: currentBucket.heading,
      expectedReturn:
        currentBucket.lines.find(
          (l) => l.toLowerCase().includes("return") || l.includes("%")
        ) ?? "10–12% p.a.",
      instruments: currentBucket.lines
        .filter((l) => l.toLowerCase().includes("invest in"))
        .map((l) => l.replace(/^.*invest in:\s*/i, "").trim()),
      allocationHint:
        currentBucket.lines.find(
          (l) =>
            !l.toLowerCase().includes("return") &&
            !l.toLowerCase().includes("invest")
        ) ?? "",
    });
  }

  const howMuchKey = Object.keys(sections).find(
    (k) => k.includes("HOW MUCH") || k.includes("INVEST")
  );
  const howMuchLines = howMuchKey ? (sections[howMuchKey] ?? []) : [];
  const sipRangeLine = howMuchLines.find(
    (l) => l.toLowerCase().includes("range") || l.includes("to ₹")
  );

  return {
    recommendation: recommendation || "I'm ready to help with your wealth goals.",
    reason: takeaway && takeaway.trim() !== recommendation.trim() ? takeaway : "",
    riskWarning:
      "Returns are market-linked and not guaranteed. Verify before investing.",
    nextAction:
      actionLines
        .find((l) => l.startsWith("–") || l.startsWith("-"))
        ?.replace(/^[–\-]\s*/, "") ??
      "Start a monthly SIP and review your allocation every quarter.",
    intro: "",
    step1Title: "HOW MUCH TO INVEST",
    assumptionBullets: howMuchLines
      .filter((l) => l.startsWith("–") || l.startsWith("-"))
      .map((l) => l.replace(/^[–\-]\s*/, ""))
      .slice(0, 4),
    ...(sipRangeLine ? { monthlySipRange: sipRangeLine } : {}),
    step2Title: "HOW TO ALLOCATE YOUR SIP",
    ...(portfolioBuckets.length > 0 ? { portfolioBuckets } : {}),
    step3Title: "YOUR ACTION PLAN",
    ...(actionPlanRows.length > 0 ? { actionPlanRows } : {}),
  };
}

function formatInr(value: number | null | undefined): string {
  if (value == null) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function resolveMonthlySurplus(context: AgentContext): number | null {
  const income = context.profile?.monthly_income_inr || 0;
  const expenses = context.profile?.monthly_expenses_inr || 0;
  const surplus = income - expenses;
  return surplus > 0 ? surplus : null;
}

function resolveRiskBucket(context: AgentContext): "Aggressive" | "Moderate" | "Conservative" {
  const tolerance = (context.profile?.risk_appetite || "moderate").toLowerCase();
  if (tolerance.includes("high") || tolerance.includes("aggressive")) return "Aggressive";
  if (tolerance.includes("low") || tolerance.includes("conservative")) return "Conservative";
  return "Moderate";
}

type AllocationPlan = {
  equityPct: number;
  debtPct: number;
  goldPct: number;
  liquidPct: number;
  note: string;
};

function getAllocationPlan(bucket: "Aggressive" | "Moderate" | "Conservative"): AllocationPlan {
  if (bucket === "Aggressive") {
    return {
      equityPct: 75,
      debtPct: 15,
      goldPct: 5,
      liquidPct: 5,
      note: "High equity exposure for long-term wealth creation.",
    };
  }
  if (bucket === "Conservative") {
    return {
      equityPct: 30,
      debtPct: 55,
      goldPct: 5,
      liquidPct: 10,
      note: "Higher debt allocation to protect capital and reduce volatility.",
    };
  }
  return {
    equityPct: 55,
    debtPct: 30,
    goldPct: 10,
    liquidPct: 5,
    note: "Balanced approach for steady growth and risk management.",
  };
}

function formatAllocationLine(surplus: number, plan: AllocationPlan): string {
  const parts: string[] = [];
  if (plan.equityPct > 0) parts.push(`${plan.equityPct}% Equity (${formatInr((surplus * plan.equityPct) / 100)})`);
  if (plan.debtPct > 0) parts.push(`${plan.debtPct}% Debt (${formatInr((surplus * plan.debtPct) / 100)})`);
  if (plan.goldPct > 0) parts.push(`${plan.goldPct}% Gold (${formatInr((surplus * plan.goldPct) / 100)})`);
  return parts.join(", ");
}

function isSimpleQuestion(message: string): boolean {
  const msg = message.toLowerCase().trim();
  const exactGreetings = [
    "hi", "hi!", "hello", "hello!", "hey", "hey!",
    "thanks", "thank you", "ok", "okay", "bye",
    "good morning", "good night", "good evening"
  ];
  const isExactGreeting = exactGreetings.includes(msg);
  const wordCount = msg.split(/\s+/).length;
  const isVeryShort = wordCount <= 2 && msg.length < 10;
  const hasFinanceKeyword = /invest|sip|mutual|fund|stock|goal|tax|retire|emi|loan|wealth|portfolio|elss|nifty|equity|debt|gold|₹|inr|car|house|home|crore|lakh|return|saving|budget|income|expense|insurance|fd|ppf|nps/.test(msg);
  return (isExactGreeting || isVeryShort) && !hasFinanceKeyword;
}

async function fetchMarketIndicators(): Promise<{ nifty: number; bankNifty: number; sensex: number; trend: string } | null> {
  try {
    const response = await fetch("http://localhost:3000/api/market/indices", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.indices || data.indices.length < 3) return null;
    return {
      nifty: data.indices.find((i: { id: string }) => i.id === "NIFTY50")?.value ?? 0,
      bankNifty: data.indices.find((i: { id: string }) => i.id === "BANKNIFTY")?.value ?? 0,
      sensex: data.indices.find((i: { id: string }) => i.id === "SENSEX")?.value ?? 0,
      trend: data.indices.find((i: { id: string }) => i.id === "NIFTY50")?.trend ?? "flat",
    };
  } catch {
    return null;
  }
}

function buildContextBlock(context: AgentContext): string {
  const p = context.profile;
  const r = context.latestRiskAssessment;
  
  // Calculate key metrics
  const income = p?.monthly_income_inr || 0;
  const expenses = p?.monthly_expenses_inr || 0;
  const emi = p?.monthly_emi_inr || 0;
  const storedSurplus = p?.monthly_investable_surplus_inr || 0;
  const calculatedSurplus = income - expenses - emi;
  const effectiveSurplus = storedSurplus > 0 ? storedSurplus : Math.max(0, calculatedSurplus);
  const savings = p?.current_savings_inr || 0;
  
  // Portfolio analysis
  const totalHoldingsValue = context.holdings.reduce((sum, h) => 
    sum + (h.quantity * h.current_price_inr), 0);
  const holdingsByAsset = context.holdings.reduce((acc, h) => {
    acc[h.asset_class] = (acc[h.asset_class] || 0) + (h.quantity * h.current_price_inr);
    return acc;
  }, {} as Record<string, number>);
  
  // Goal analysis
  const totalGoalsValue = context.goals.reduce((sum, g) => sum + g.target_amount_inr, 0);
  const earliestGoal = context.goals.length > 0 
    ? context.goals.reduce((min, g) => {
        const d = g.target_date ? new Date(g.target_date).getTime() : Infinity;
        return d < min.date ? { date: d, goal: g } : min;
      }, { date: Infinity, goal: context.goals[0] }).goal
    : null;
  
  const lines = [
    "=== COMPLETE FINANCIAL PROFILE ===",
    "",
    "-- INCOME & EXPENSES --",
    `Monthly Income: ${formatInr(income)}/month`,
    `Monthly Expenses: ${formatInr(expenses)}/month`,
    `Monthly EMIs: ${formatInr(emi)}/month`,
    `Net Available for Investment: ${formatInr(effectiveSurplus)}/month`,
    `Current Savings: ${formatInr(savings)}`,
    `Total Invested Holdings: ${formatInr(totalHoldingsValue)}`,
    `Net Worth (Liquid + Invested): ${formatInr(savings + totalHoldingsValue)}`,
    "",
    "-- RISK PROFILE --",
    `Risk Appetite: ${p?.risk_appetite || "Not assessed"}`,
    `Risk Bucket: ${r?.risk_bucket || p?.risk_appetite || "Moderate"}`,
    `Risk Score: ${r?.risk_score ?? "N/A"}/100`,
    `Drawdown Tolerance: ${r?.drawdown_tolerance_pct ?? p?.loss_tolerance_pct ?? "N/A"}%`,
    `Investment Time Horizon: ${r?.time_horizon_years ?? p?.target_horizon_years ?? "N/A"} years`,
    `Emergency Fund: ${p?.emergency_fund_months || 0} months of expenses`,
    "",
    "-- GOALS ANALYSIS --",
    `Total Goals: ${context.goals.length}`,
    `Total Target Amount: ${formatInr(totalGoalsValue)}`,
    context.goals.length > 1 
      ? `Goal Conflict Check: Multiple goals requiring prioritization`
      : "Primary Goal Only",
    earliestGoal ? `Most Urgent Goal: ${earliestGoal.title} by ${earliestGoal.target_date}` : "No timeline set",
    ...context.goals.map((g, i) => 
      `  ${i + 1}. ${g.title} (${g.category}) - ${formatInr(g.target_amount_inr)} by ${g.target_date || "unspecified"} [Priority: ${g.priority}]`
    ),
    "",
    "-- EXISTING INVESTMENTS --",
    `Has Prior Investments: ${p?.has_existing_investments ? "Yes" : "No"}`,
    p?.existing_investment_types?.length 
      ? `Existing Types: ${p.existing_investment_types.join(", ")}` 
      : "",
    `Current Holdings: ${context.holdings.length} instruments`,
    ...Object.entries(holdingsByAsset).map(([asset, value]) => 
      `  - ${asset}: ${formatInr(value)}`
    ),
    totalHoldingsValue > 0 ? `  Total Holdings Value: ${formatInr(totalHoldingsValue)}` : "",
    "",
    "-- TAX & KYC STATUS --",
    `Tax Regime: ${p?.tax_regime || "Not specified"}`,
    `KYC Status: ${p?.kyc_status || "Not verified"}`,
    `Onboarding: ${p?.onboarding_completed_at ? "Completed" : "Incomplete"}`,
    "",
    "-- DEMOGRAPHICS --",
    `Occupation: ${p?.occupation_title || "Not specified"} (${p?.employment_type || "Unknown type"})`,
    `Location: ${p?.city || "Unknown"}, ${p?.state || "Unknown"}`,
    `Age Context: ${p?.date_of_birth ? `Born ${p.date_of_birth}` : "Not provided"}`,
    "",
    "=== END PROFILE ===",
  ];
  
  return lines.filter(Boolean).join("\n");
}

function buildSystemInstruction(mode: "chat" | "dashboard"): string {
  const base = [
    "You are Pravix AI, a high-quality financial advisor focused on real-world decision making.",
    "Your goal: Give clear, detailed, and context-aware financial advice that feels like a human expert, not a template or generic blog.",
    "",
    "CRITICAL BEHAVIOR RULES:",
    "",
    "1. ALWAYS use the user's full financial context:",
    "- Income, Expenses, Monthly surplus, Risk level, All active goals",
    "",
    "2. NEVER treat questions in isolation.",
    "If multiple goals exist, you MUST:",
    "- Compare them, Identify conflicts, Explain trade-offs, Suggest prioritization",
    "",
    "3. ALWAYS check feasibility:",
    "- If a goal is unrealistic → clearly say it",
    "- Quantify the gap",
    "- Suggest 2–3 realistic alternatives: increase income, extend timeline, reduce goal",
    "",
    "4. NEVER recommend amounts beyond user capacity.",
    "If required investment > user's surplus:",
    "- Explicitly highlight the mismatch",
    "- Provide a practical path instead",
    "",
    "5. RESPONSE STYLE:",
    "- Start with a direct answer (1–2 lines)",
    "- Then explain reasoning clearly",
    "- Then give a structured action plan",
    "- Then highlight trade-offs",
    "",
    "6. AVOID:",
    "- Repetition, Generic advice, Empty phrases like 'invest wisely'",
    "- Overuse of disclaimers",
    "",
    "7. STOCK RULE:",
    "If user asks for specific stocks:",
    "- Do NOT give direct stock picks",
    "- Redirect to diversified strategy (index funds)",
    "",
    "8. TIME HORIZON LOGIC:",
    "- <5 years → avoid aggressive equity-heavy advice",
    "- 5–10 years → balanced approach",
    "- 10+ years → equity-heavy allowed",
    "",
    "9. OUTPUT FORMAT:",
    "- Write in clean paragraphs and bullet points",
    "- Do NOT force rigid templates or repeated structure",
    "- Do NOT repeat the same sentence",
    "- NEVER USE MARKDOWN. No **, ##, __, tables, or dividers",
    "- Use '–' for bullet points",
    "",
    "10. TONE:",
    "Confident, practical, slightly sharp.",
    "Like a smart financial advisor who tells the truth, not what the user wants to hear.",
    "",
    "CURRENCY: Always use ₹ symbol. Format as ₹1L, ₹10L, ₹1Cr.",
    "LANGUAGE: Simple English. No jargon without immediate explanation.",
    "SILENT PERSONALIZATION: Use user profile data naturally without exposing field names.",
    "",
    "GUARDRAILS:",
    "- NEVER pick specific stocks. Pivot to Index Funds.",
    "- NEVER promise returns > 18%. Stop projections if asked.",
    "- If providing numeric projections, include: 'Note: Projections assume market benchmarks. Actual returns may vary.'",
  ];

  if (mode === "chat") {
    base.push("");
    base.push("CHAT MODE: Respond to follow-up questions about investments, goals, and tax planning.");
    base.push("LENGTH RULE: Be comprehensive and detailed. Use ALL available context.");
    base.push("Simple greetings: 2-3 sentences. All financial questions: 300-600 words minimum.");
    base.push("Multi-goal questions: 500-800 words with full analysis.");
    base.push("ALWAYS show calculations, not just conclusions.");
    base.push("Output plain text only.");
  } else {
    base.push("");
    base.push("DASHBOARD MODE: Provide a high-level actionable wealth review.");
    base.push("Output plain text only.");
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
        Math.round((feasibility.monthlySurplusInr * plan.liquidPct) / 100),
      );
    }
  }

  return values;
}

function ensurePersonalizedAdvice(advice: AgentStructuredAdvice, context: AgentContext): AgentStructuredAdvice {
  const income = context.profile?.monthly_income_inr || 0;
  const expenses = context.profile?.monthly_expenses_inr || 0;
  const surplus = income - expenses;

  if (surplus > 0 && !advice.recommendation?.includes("₹")) {
    advice.recommendation = `${advice.recommendation} Given your monthly surplus of ${formatInr(surplus)}, you can comfortably start this strategy today.`;
  }

  return advice;
}

function enforceAdviceGuardrails(input: {
  advice: AgentStructuredAdvice;
  context: AgentContext;
  userMessage: string;
}): AgentStructuredAdvice {
  const normalized = { ...input.advice };
  const msg = input.userMessage.toLowerCase();

  // Stock picking guardrail
  if (msg.includes("which stock") || msg.includes("stock to buy") || msg.includes("best stock")) {
    normalized.recommendation = "Picking individual stocks is high risk. The SAFER APPROACH is to use low-cost Index Funds for long-term wealth.";
    normalized.reason = "Individual stocks require deep research and timing. Index funds give you instant diversification across India's top companies.";
    normalized.nextAction = "Start with a Nifty 50 Index Fund for large-cap stability.";
  }

  // Guaranteed returns guardrail
  if (msg.includes("guaranteed") || msg.includes("fix return") || msg.includes("safe 20%")) {
    normalized.recommendation = "No market investment can guarantee high double-digit returns.";
    normalized.reason = "Returns are market-linked. While equity can give 12-15% over long periods, claiming a guarantee is inaccurate and risky.";
    normalized.riskWarning = "Returns are market-linked and not guaranteed. Verify before investing.";
  }

  return normalized;
}

function formatStructuredAdvice(advice: AgentStructuredAdvice, isSimple = false): string {
  if (isSimple) {
    const seen = new Set();
    const parts: string[] = [];
    for (const field of [advice.recommendation, advice.reason]) {
      const val = field?.trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        parts.push(val);
      }
    }
    return parts.join("\n\n") || advice.recommendation || "";
  }

  const hasRichRecommendation =
    advice.recommendation && (advice.recommendation.includes("\n") || advice.recommendation.length > 200);
  const hasRichReason = advice.reason && (advice.reason.includes("\n") || advice.reason.length > 200);

  const portfolioBuckets = advice.portfolioBuckets ?? [];
  const actionPlanRows = advice.actionPlanRows ?? [];
  const hasSipStructure = portfolioBuckets.length > 0 || actionPlanRows.length > 0;

  if (!hasSipStructure && (hasRichRecommendation || hasRichReason)) {
    const seen = new Set();
    const lines: string[] = [];
    for (const field of [advice.recommendation, advice.intro, advice.reason]) {
      const val = field?.trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        lines.push(val, "");
      }
    }

    if (advice.recommendation?.includes("₹") || advice.recommendation?.includes("%")) {
      lines.push("Note: Projections assume market benchmarks. Actual returns may vary.");
    }
    return lines.join("\n").trim();
  }

  const step1Title = advice.step1Title ?? "HOW MUCH TO INVEST";
  const step2Title = advice.step2Title ?? "HOW TO ALLOCATE YOUR SIP";
  const step3Title = advice.step3Title ?? "YOUR ACTION PLAN";

  const lines: string[] = [];
  const opening = advice.intro && advice.intro.trim() !== advice.recommendation?.trim()
    ? advice.intro
    : advice.recommendation;
  if (opening) lines.push(opening.trim(), "");

  lines.push(step1Title, "");
  if ((advice.assumptionBullets ?? []).length > 0) {
    lines.push("Assuming realistic returns:", "");
    for (const bullet of advice.assumptionBullets!) lines.push(`- ${bullet}`);
    lines.push("");
  }

  if (advice.bestAssumption) lines.push(`Best assumption: ${advice.bestAssumption}`, "");
  if (advice.monthlySipRange) lines.push(`Recommended SIP range: ${advice.monthlySipRange}`, "");

  if ((advice.monthlySipBreakdown ?? []).length > 0) {
    for (const entry of advice.monthlySipBreakdown!) lines.push(`- ${entry}`);
    lines.push("");
  }

  lines.push(step2Title, "");
  if (portfolioBuckets.length > 0) {
    for (const [idx, b] of portfolioBuckets.entries()) {
      lines.push(`${idx + 1}. ${b.heading}`);
      lines.push(`   - Expected return: ${b.expectedReturn}`);
      lines.push(`   - Invest in: ${b.instruments.join(", ")}`);
      lines.push(`   - ${b.allocationHint}`, "");
    }
  } else if (advice.reason) {
    lines.push(advice.reason, "");
  }

  lines.push(step3Title, "");
  if (actionPlanRows.length > 0) {
    for (const row of actionPlanRows) {
      lines.push(`– ${row.category}: ${row.amount} → ${row.whereToInvest}`);
    }
  } else if (advice.nextAction) {
    lines.push(`– ${advice.nextAction}`);
  }

  lines.push("");
  if (advice.riskWarning) lines.push(`Note: ${advice.riskWarning}`);

  return lines.join("\n").trim();
}

export async function generateAdvisorChatReply(input: {
  message: string;
  history: AgentChatHistoryItem[];
  context: AgentContext;
}): Promise<{
  reply: string;
  structured: AgentStructuredAdvice;
  isSimpleAnswer: boolean;
}> {
  // Fetch market indicators for context
  const marketData = await fetchMarketIndicators();
  
  const contextBlock = buildContextBlock(input.context);
  const marketContext = marketData 
    ? `\n\n-- CURRENT MARKET CONDITIONS --\nNIFTY 50: ${marketData.nifty.toLocaleString()} (${marketData.trend})\nBANK NIFTY: ${marketData.bankNifty.toLocaleString()}\nSENSEX: ${marketData.sensex.toLocaleString()}\n`
    : "";
  
  const messages: NimMessage[] = [
    { role: "system", content: buildSystemInstruction("chat") },
    ...input.history.map((h) => ({
      role: (h.role === "user" ? "user" : "assistant") as NimRole,
      content: h.content,
    })),
    {
      role: "user",
      content: [
        `User Message: ${input.message}`,
        "Context:",
        contextBlock + marketContext,
      ].join("\n\n"),
    },
  ];

  console.log("[PRAVIX DEBUG] Model being used:", getOpenRouterModel());
  console.log("[PRAVIX DEBUG] API key present:", !!getOpenRouterApiKey());

  const deadlineAt = Date.now() + CHAT_PRIMARY_TIMEOUT_MS;
  try {
    const raw = await callProviderWithRetry({
      provider: "openrouter",
      attempt: (timeoutMs) => callOpenRouter(messages, { temperature: 0.72, maxOutputTokens: 4000 }, timeoutMs),
      preferredTimeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
      maxRetries: CHAT_PRIMARY_MAX_RETRIES,
      deadlineAt,
    });

    recordProviderSuccess("openrouter");

    // GPT-4o-mini returns plain text — parse directly, no JSON needed
    const rawStructured = buildRawTextStructuredAdvice(raw, input.message);
    const structured = enforceAdviceGuardrails({
      advice: ensurePersonalizedAdvice(rawStructured, input.context),
      context: input.context,
      userMessage: input.message,
    });
    const isSimple = isSimpleQuestion(input.message);
    return {
      reply: formatStructuredAdvice(structured, isSimple),
      structured,
      isSimpleAnswer: isSimple,
    };
  } catch (error) {
    console.error("[PRAVIX DEBUG] Fallback triggered. Reason:", normalizeErrorMessage(error));
    if (isNimCapacityError(error)) {
      try {
        const raw = await callProviderWithRetry({
          provider: "nvidia",
          attempt: (timeoutMs) => callNvidia(messages, { temperature: 0.72, maxOutputTokens: 4000 }, timeoutMs),
          preferredTimeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
          maxRetries: CHAT_PRIMARY_MAX_RETRIES,
          deadlineAt: Date.now() + 20000,
        });
        recordProviderSuccess("nvidia");
        const nimStructured = buildRawTextStructuredAdvice(raw, input.message);
        const structured = enforceAdviceGuardrails({
          advice: ensurePersonalizedAdvice(nimStructured, input.context),
          context: input.context,
          userMessage: input.message,
        });
        const isSimple = isSimpleQuestion(input.message);
        return { reply: formatStructuredAdvice(structured, isSimple), structured, isSimpleAnswer: isSimple };
      } catch (nimError) {
        console.error("[generateAdvisorChatReply] NIM fallback failed", nimError);
      }
    }
    const fallback = buildFallbackChatStructuredAdvice({ message: input.message, context: input.context, reason: normalizeErrorMessage(error) });
    return { reply: formatStructuredAdvice(fallback, false), structured: fallback, isSimpleAnswer: false };
  }
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
  const providerLabel = inferProviderFromErrorReason(input.reason);

  const recommendation =
    monthlySurplus && monthlySurplus > 0
      ? `Invest ${formatInr(monthlySurplus)} each month using this split: ${formatAllocationLine(monthlySurplus, plan)}.`
      : "Start with a manageable SIP amount and use a baseline split of 55% equity, 30% debt, 10% gold, and 5% liquid reserve.";

  const rationaleParts = [
    `This aligns with your ${riskBucket} risk context and prioritizes diversified allocation instead of single-bet exposure.`,
    "It keeps execution simple with a repeatable monthly process.",
  ];

  const riskWarning = [
    `Live AI response is temporarily unavailable due to ${providerLabel} limits/availability${retryIn ? ` (retry after ~${retryIn})` : ""}.`,
    `Fallback guidance is rules-based. ${plan.note}`,
  ].join(" ");

  return {
    recommendation,
    reason: rationaleParts.join(" "),
    riskWarning,
    nextAction: "Create one SIP mandate today and set a month-end review to rebalance and step up contributions.",
    intro: recommendation,
    step1Title: "HOW MUCH TO INVEST",
    assumptionBullets: ["Assuming moderate long-term market returns and disciplined monthly SIP."],
    bestAssumption: `Use your current monthly capacity: ${monthlySurplus ? formatInr(monthlySurplus) : "INR not provided"}.`,
    monthlySipRange: monthlySurplus ? `${formatInr(monthlySurplus * 0.9)} to ${formatInr(monthlySurplus * 1.1)}` : "₹5,000 to ₹10,000",
    monthlySipBreakdown: [
      `Equity: ${plan.equityPct}%`,
      `Debt: ${plan.debtPct}%`,
      `Gold: ${plan.goldPct}%`,
    ],
    step2Title: "HOW TO ALLOCATE YOUR SIP",
    portfolioBuckets: [
      { heading: "Equity Index Funds", expectedReturn: "10% to 12% p.a.", instruments: ["Nifty 50 Index Fund"], allocationHint: "Growth" },
      { heading: "Debt Funds", expectedReturn: "6% to 7.5% p.a.", instruments: ["Short duration debt fund"], allocationHint: "Stability" },
    ],
    step3Title: "YOUR ACTION PLAN",
    actionPlanRows: [
      { category: "Emergency reserve", amount: "6 months expenses", whereToInvest: "Liquid fund" },
      { category: "Monthly SIP", amount: monthlySurplus ? formatInr(monthlySurplus) : "As per budget", whereToInvest: "Index/Debt Funds" },
    ],
  };
}

export async function generateDashboardActionPlan(context: AgentContext): Promise<string> {
  const messages: NimMessage[] = [
    { role: "system", content: buildSystemInstruction("dashboard") },
    { role: "user", content: `Generate a short actionable wealth review.\n\nContext:\n${buildContextBlock(context)}` },
  ];

  try {
    return await callProviderWithRetry({
      provider: "openrouter",
      attempt: (timeoutMs) => callOpenRouter(messages, { temperature: 0.2, maxOutputTokens: 280 }, timeoutMs),
      preferredTimeoutMs: DASHBOARD_PRIMARY_TIMEOUT_MS,
      maxRetries: DASHBOARD_PRIMARY_MAX_RETRIES,
      deadlineAt: Date.now() + DASHBOARD_REQUEST_DEADLINE_MS,
    });
  } catch (error) {
    if (isNimCapacityError(error)) return buildFallbackDashboardActionPlan(context, normalizeErrorMessage(error));
    throw error;
  }
}

function buildFallbackDashboardActionPlan(context: AgentContext, reason: string): string {
  const monthlySurplus = resolveMonthlySurplus(context);
  const riskBucket = resolveRiskBucket(context);
  const plan = getAllocationPlan(riskBucket);
  const retryIn = extractRetrySeconds(reason);

  const actions = [
    "1) Maintain your emergency corpus at 6 months of expenses in a liquid bucket.",
    monthlySurplus && monthlySurplus > 0
      ? `2) Deploy monthly surplus of ${formatInr(monthlySurplus)} using: ${formatAllocationLine(monthlySurplus, plan)}.`
      : "2) Start with a fixed monthly SIP using a balanced 55/30/10/5 split.",
    "3) Review tax optimization for Section 80C/80D utilization quarterly.",
  ];

  const deadlineAt = Date.now() + CHAT_REQUEST_DEADLINE_MS;

  try {
    const raw = await callProviderWithRetry({
      provider: "openrouter",
      attempt: (timeoutMs) =>
        callOpenRouter(
          messages,
          {
            temperature: 0.15,
            maxOutputTokens: 2000,
          },
          timeoutMs,
        ),
      preferredTimeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
      maxRetries: CHAT_PRIMARY_MAX_RETRIES,
      deadlineAt,
    });

    const parsed = parseExplanationOutput(raw);

    const snapshotValidation = validateNumbersAgainstSnapshot(raw, snapshotBlock);

    if (parsed.valid && parsed.data && snapshotValidation.valid) {
      // Ensure the AI explanation references the deterministic decision reasoning
      const referenced = hasReasoningOverlap(snapshot.decision?.reasoning ?? "", parsed.data.reason || "");
      if (!referenced) {
        console.warn("[PRAVIX] AI explanation does not reference deterministic reasoning; rejecting output.");
      } else {
        return parsed.data;
      }
    }

    if (!snapshotValidation.valid) {
      console.warn("[PRAVIX] AI dashboard summary contained unexpected numbers:", snapshotValidation.reason);
    }

    return generateFallbackExplanation(snapshot, input.message);

  } catch (error) {
    console.warn("[PRAVIX] AI explanation failed, using fallback:", error);
    return generateFallbackExplanation(snapshot, input.message);
  }
}

export async function generateAdvisorChatReplyV2(input: {
  message: string;
  history: AgentChatHistoryItem[];
  snapshot: FinancialSnapshot;
}): Promise<AdvisorChatReply> {
  const explanation = await generateAdvisorExplanation({ 
    message: input.message, 
    history: input.history, 
    snapshot: input.snapshot 
  });

  const snapshot = input.snapshot;
  const recommendedStrategy = snapshot.strategyOptions.find((s) => s.isRecommended);

  const totalAlloc = snapshot.sipOriginal || 1;
  const eqPct = Math.round((snapshot.allocation.equity / totalAlloc) * 100);
  const dbPct = Math.round((snapshot.allocation.debt / totalAlloc) * 100);

  const structured: AgentStructuredAdvice = {
    recommendation: explanation.answer,
    reason: explanation.reason,
    riskWarning: "Returns are market-linked and not guaranteed. Past performance does not predict future results.",
    nextAction: explanation.action,
    intro: explanation.answer.substring(0, 200),
    step1Title: "Your Financial Reality",
    assumptionBullets: [
      `Required monthly investment: ₹${snapshot.feasibility.requiredSip.toLocaleString()}`,
      `Your current capacity: ₹${snapshot.feasibility.currentSip.toLocaleString()}`,
      `Gap to bridge: ₹${snapshot.feasibility.gapAmount.toLocaleString()}`,
    ],
    bestAssumption: recommendedStrategy?.label || "Maintain current SIP",
    monthlySipRange: `₹${snapshot.feasibility.currentSip.toLocaleString()} - ₹${snapshot.feasibility.requiredSip.toLocaleString()}`,
    monthlySipBreakdown: snapshot.strategyOptions.slice(0, 3).map((s) => s.label),
    step2Title: "Recommended Strategy",
    portfolioBuckets: [
      {
        heading: `${eqPct}% Equity Allocation`,
        expectedReturn: "Growth engine for long-term wealth creation",
        instruments: ["Index funds", "Diversified equity funds"],
        allocationHint: snapshot.allocation.rationale,
      },
      {
        heading: `${dbPct}% Debt Stability`,
        expectedReturn: "Capital preservation and steady returns",
        instruments: ["Debt mutual funds", "PPF", "FDs"],
        allocationHint: `Based on ${snapshot.userProfile.riskProfile} risk profile`,
      },
    ],
    step3Title: "Action Items",
    actionPlanRows: [
      {
        category: "Immediate",
        amount: explanation.action.substring(0, 50),
        whereToInvest: recommendedStrategy?.tradeOffs[0] || "Start SIP today",
      },
    ],
  };

  return {
    reply: explanation.answer,
    raw: JSON.stringify(explanation),
    structured,
  };
}

// V2: Dashboard action plan using FinancialSnapshot (snapshot-first architecture)
export async function generateDashboardActionPlanV2(input: {
  snapshot: FinancialSnapshot;
}): Promise<DashboardAISummary> {
  const { snapshot } = input;
  const s = snapshot;
  const f = snapshot.feasibility;

  // Build snapshot block for AI context — includes decision + constraints so the
  // narrator sees exactly what the deterministic engine concluded.
  const d = s.decision;
  const c = s.constraints;
  const ao = s.actualOutcome;
    const eqPctS = Math.round((s.allocation.equity / (s.sipOriginal || 1)) * 100);
    const dbPctS = Math.round((s.allocation.debt / (s.sipOriginal || 1)) * 100);
    const gdPctS = Math.round((s.allocation.gold / (s.sipOriginal || 1)) * 100);
    const lqPctS = Math.round((s.allocation.liquid / (s.sipOriginal || 1)) * 100);
    const snapshotBlock = [
    "=== FINANCIAL SNAPSHOT (READ ONLY - DO NOT CALCULATE) ===",
    `Goal: ${s.goal.title}`,
    `Target Amount: ₹${s.goal.targetAmount.toLocaleString()}`,
    `Time Horizon: ${Math.round(s.goal.timeHorizonMonths / 12)} years`,
    `Required SIP: ₹${f.requiredSip.toLocaleString()}/month`,
    `Current SIP: ₹${f.currentSip.toLocaleString()}/month`,
    `Gap: ₹${f.gapAmount.toLocaleString()}/month (${f.gapPercentage.toFixed(0)}%)`,
    `Expected Corpus (current SIP): ₹${ao.withCurrentSip.toLocaleString()} = ${ao.percentageOfGoal}% of goal`,
    `Achievement Probability: ${f.achievementProbability}%`,
    `Feasibility: ${d.feasibility}`,
    `Allocation: ${eqPctS}% equity / ${dbPctS}% debt / ${gdPctS}% gold / ${lqPctS}% liquid`,
    `Risk Profile: ${s.userProfile.riskProfile}`,
    `Hard Constraint Verdict: ${c?.feasibilityVerdict ?? "none"}`,
    c?.reasons?.length ? `Constraint Reasons: ${c.reasons.join(" | ")}` : "",
    `Action Category: ${d.primaryActionType}`,
    `Deterministic Action: ${d.primaryAction}`,
    "",
    "=== END SNAPSHOT ===",
  ].filter(Boolean).join("\n");

  const systemContent = [
    "You are a financial explanation engine. You are a NARRATOR, not a calculator.",
    "",
    "STRICT RULES:",
    "- You MUST NOT calculate, estimate, approximate, or invent any number.",
    "- You MUST use ONLY the numbers provided in the snapshot, verbatim.",
    "- You MUST NOT invent a new action. Paraphrase 'Deterministic Action' from the snapshot.",
    "- If a field is missing or zero, do not fabricate one.",
    "",
    "Output exactly 3 lines as JSON:",
    "  intro    — Reality: goal vs projected corpus.",
    "  why      — Why: gap and the binding constraint.",
    "  nextStep — Action: paraphrase Deterministic Action.",
    "             - increase_sip   → tell user to raise the monthly SIP.",
    "             - extend_timeline→ tell user to extend the goal horizon.",
    "             - reduce_goal    → tell user to lower the target or grow income.",
    "             - optimize       → tell user to add a step-up or rebalance.",
    "             - noop           → repeat the Deterministic Action verbatim.",
    "",
    "Return JSON ONLY:",
    '{ "intro": "...", "why": "...", "nextStep": "..." }',
  ].join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    {
      role: "user",
      content: [
        snapshotBlock,
        "",
        "Based on the snapshot above, provide a concise summary.",
      ].join("\n"),
    },
  ];

  return ["ACTIONS", ...actions, "", ...cautionLines].join("\n");
}

function summarizeNimErrorBody(raw: string): string {
  const compact = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return compact.length > 320 ? `${compact.slice(0, 317)}...` : compact || "No response body";
}

function parseRetryAfterMs(value: string | null): number | null {
  const s = Number.parseFloat(value || "");
  return Number.isFinite(s) && s >= 0 ? Math.round(s * 1000) : null;
}

function extractRetrySeconds(message: string): string | null {
  const match = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  return match?.[1] ? `${Math.ceil(Number.parseFloat(match[1]))}s` : null;
}