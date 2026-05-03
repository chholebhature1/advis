import type {
  AgentExplanationOutput,
  AgentProfileSnapshot,
  FinancialSnapshot,
  ExplanationReasoning,
  AdvisoryRecommendation,
  AgentExplanationTone,
} from "./types";
import {
  emphasizeUncertainty,
  getReturnAssumptionText,
  getTimelineContext,
} from "../projection-context";

// Local formatter to avoid cross-module resolution issues during tests
function formatCurrencyLocal(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "₹0";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

type ExplanationTone = AgentExplanationTone;

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

function humanizeMissingField(field: string): string {
  switch (field) {
    case "income_input_type":
    case "income_range_min_inr":
    case "income_range_max_inr":
      return "income is estimated";
    default:
      return "based on approximate inputs";
  }
}

function getDataQualityLabel(missingFields: string[]): string {
  const uniqueLabels = Array.from(
    new Set(missingFields.map(humanizeMissingField)),
  );
  if (uniqueLabels.length === 0) {
    return "based on approximate inputs";
  }
  return uniqueLabels.join(" and ");
}

function buildDataQualityNote(
  snapshot: FinancialSnapshot,
  debug = false,
): { note: string; debugInfo?: string } {
  const dataQualityLabel = getDataQualityLabel(snapshot.dataQuality.missingFields);

  // When confidence is high and exact numeric inputs are present, prefer explicit phrasing.
  const income = snapshot.userProfile?.income ?? null;
  const capacity = snapshot.userProfile?.investmentCapacity ?? null;

  let note: string;
  if (snapshot.dataQuality.confidence === "high" && typeof income === "number" && Number.isFinite(income)) {
    if (typeof capacity === "number" && Number.isFinite(capacity)) {
      note = `This plan is based on your monthly income of ${formatCurrencyLocal(income)} and monthly investment capacity of ${formatCurrencyLocal(capacity)}.`;
    } else {
      note = `This plan is based on your monthly income of ${formatCurrencyLocal(income)}.`;
    }
  } else if (snapshot.dataQuality.confidence === "medium") {
    note = `This plan is based on ${dataQualityLabel}, so actual results may vary. Providing exact details will improve accuracy.`;
  } else {
    note = `This plan is based on ${dataQualityLabel}, so actual results may vary and the plan should be reviewed once profile data is updated. Providing exact details will improve accuracy.`;
  }

  return {
    note,
    debugInfo: debug
      ? `Raw data quality fields: ${snapshot.dataQuality.missingFields.join(", ") || "none"}. Confidence: ${snapshot.dataQuality.confidence}.`
      : undefined,
  };
}

type ExplanationContract = {
  sipOriginal: number;
  requiredSip: number;
  gapAmount: number;
  feasibilityLevel: "comfortable" | "tight" | "stretched" | "not_viable";
  utilization: FinancialSnapshot["utilization"];
  goalType: string;
  stepUpMode?: "optional" | "recommended";
  primaryAction?: string;
  secondaryAction?: string;
  optionalAction?: string;
  reasoning?: string;
  flags: {
    maxAllowedSip: number | null;
    isOverLimit: boolean;
    overLimitAmount: number | null;
  };
};

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-5.3-chat";

function buildAdvisorPersonality(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
): string {
  // Build personality traits based on feasibility and utilization stress
  const isStressed =
    snapshot.utilizationInsight?.level === "risky" ||
    snapshot.utilizationInsight?.level === "unsustainable";
  const isFeasible = snapshot.decision.feasibility === "comfortable";

  if (snapshot.decision.feasibility === "not_viable" || snapshot.decision.feasibility === "stretched") {
    // Not viable or stretched: be assertive and direct about hard truths
    return "Personality: You are a brutal realist advisor. Your job is to tell the user exactly where their plan fails. Use zero softening language. Do not apologize for the news. If the math doesn't work, say it doesn't work.";
  }

  if (isFeasible && !isStressed) {
    if (snapshot.dataQuality.confidence === "low") {
      return "Personality: You are a cautious advisor. Emphasize that the plan uses estimated inputs and actual results may vary. Avoid overly optimistic language.";
    }

    if (snapshot.dataQuality.confidence === "medium") {
      return "Personality: You are a balanced advisor. Note that some values were estimated and keep language grounded in uncertainty.";
    }

    // Comfortable: be confident and encouraging, but still direct
    return "Personality: You are a confident advisor. Affirm the plan. Be encouraging but concise. Avoid over-explaining.";
  }

  if (snapshot.dataQuality.confidence === "low") {
    return "Personality: You are a cautious advisor. Emphasize uncertainty from estimated inputs and avoid strong assurances.";
  }

  // Tight: be balanced, neither overly optimistic nor pessimistic
  return "Personality: You are a balanced advisor. Acknowledge trade-offs. Be honest but solution-focused. Avoid false reassurance.";
}

function buildBehavioralToneAdjustment(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
): string {
  // Personalize tone based on risk profile and feasibility
  const riskProfile = snapshot.userProfile.riskProfile ?? "moderate";
  const feasibility = snapshot.decision.feasibility;
  const utilizationLevel = snapshot.utilizationInsight?.level ?? "healthy";

  const adjustments: string[] = [];

  if (riskProfile === "conservative" && utilizationLevel === "aggressive") {
    adjustments.push(
      "Note: The user is conservative-profile. Acknowledge the utilization tension.",
    );
  }

  if (riskProfile === "aggressive" && feasibility === "not_viable") {
    adjustments.push(
      "Note: The user has aggressive risk appetite. Acknowledge what is necessary to bridge the gap.",
    );
  }

  if (utilizationLevel === "unsustainable" || utilizationLevel === "risky") {
    adjustments.push(
      "Note: Income utilization is high-stress. Suggest realistic trade-offs without judgment.",
    );
  }

  return adjustments.length > 0
    ? "Behavioral adjustments: " + adjustments.join(" ")
    : "";
}

function resolveTone(snapshot: FinancialSnapshot): ExplanationTone {
  // Map deterministic feasibility to strict tone mapping
  // comfortable → positive
  // tight       → neutral
  // stretched   → caution
  // not_viable   → direct
  if (snapshot.decision.feasibility === "comfortable") return "positive";
  if (snapshot.decision.feasibility === "tight") return "neutral";
  if (snapshot.decision.feasibility === "stretched") return "caution";

  // Fallback to constraints-based verdict for not_viable/extreme cases
  if (
    snapshot.constraints.feasibilityVerdict === "not_viable" ||
    snapshot.constraints.feasibilityVerdict === "extreme_mismatch"
  ) {
    return "direct";
  }

  // Default to direct for unhandled cases to ensure clarity
  return "direct";
}

function buildContract(snapshot: FinancialSnapshot): ExplanationContract {
  const feasibilityLevel: ExplanationContract["feasibilityLevel"] =
    snapshot.constraints.feasibilityVerdict === "not_viable" ||
    snapshot.constraints.feasibilityVerdict === "extreme_mismatch"
      ? "not_viable"
      : snapshot.decision.feasibility === "comfortable"
        ? "comfortable"
        : snapshot.decision.feasibility === "tight"
          ? "tight"
          : "stretched";

  return {
    sipOriginal: snapshot.sipOriginal,
    requiredSip: snapshot.requiredSip,
    gapAmount: snapshot.gapAmount,
    feasibilityLevel,
    utilization: snapshot.utilization,
    goalType: snapshot.goalIntent.kind,
    stepUpMode: snapshot.decision.stepUpMode,
    primaryAction: snapshot.decision.primaryAction,
    secondaryAction: snapshot.decision.secondaryAction,
    optionalAction: snapshot.decision.optionalAction,
    reasoning: snapshot.decision.reasoning,
    flags: {
      maxAllowedSip: snapshot.maxAllowedSip,
      isOverLimit: snapshot.isOverLimit,
      overLimitAmount: snapshot.constraints.flags.overLimitAmount,
    },
  };
}

function buildAllowedNumbers(snapshot: FinancialSnapshot): Set<string> {
  const values = [
    snapshot.sipOriginal,
    snapshot.requiredSip,
    snapshot.gapAmount,
    snapshot.goalDeltaPercent,
    snapshot.decision.sipBufferPercent,
    snapshot.utilization.type === "exact"
      ? snapshot.utilization.exactPercent
      : snapshot.utilization.minPercent,
    snapshot.utilization.type === "range"
      ? snapshot.utilization.maxPercent
      : snapshot.utilization.exactPercent,
    snapshot.timeHorizon.resolvedYears,
    snapshot.decision.safetyMargin,
    snapshot.actualOutcome.percentageOfGoal,
    snapshot.projectedCorpus,
    snapshot.goal.targetAmount,
    snapshot.maxAllowedSip,
    snapshot.constraints.flags.overLimitAmount,
  ];

  return new Set(
    values
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      )
      .map((value) => Number(value).toString()),
  );
}

function stripCommas(text: string): string {
  return text.replace(/(?<=\d),(?=\d{3})/g, "");
}

function extractNumbers(text: string): string[] {
  return stripCommas(text).match(/-?\d+(?:\.\d+)?/g) ?? [];
}

function containsForbiddenAdvice(text: string): boolean {
  return /\breduce sip\b|\blower (the )?sip\b|\bcut (the )?(sip|investment)\b/i.test(
    text,
  );
}

function validateReasoningStructure(output: AgentExplanationOutput): boolean {
  // STEP 1: Check that reasoning is present and has all three components
  if (!output.reasoning) {
    return false;
  }

  const { constraint, cause, implication } = output.reasoning;

  // Each component must be non-empty and substantive
  if (!constraint || !cause || !implication) {
    return false;
  }

  // Constraint must be recognizable (timeline, income, shortfall, etc.)
  const constraintKeywords =
    /timeline|income|shortfall|capacity|feasibility|horizon|utilization|return|rate/i;
  if (!constraintKeywords.test(constraint)) {
    return false;
  }

  // Cause must explain causality (contains "because", "due to", "since", etc.)
  const causalKeywords =
    /because|due to|since|caused by|result of|leads to|results in/i;
  if (!causalKeywords.test(cause)) {
    return false;
  }

  // Implication must be present (contains "means", "implies", "therefore", etc.)
  const implicationKeywords =
    /means|implies|therefore|so|thus|this leads to|consequence|result/i;
  if (!implicationKeywords.test(implication)) {
    return false;
  }

  return true;
}

function extractMainConstraint(snapshot: FinancialSnapshot): string {
  // 1. timelineConstraint (highest priority)
  if (
    snapshot.goal?.timeHorizonMonths < 60 ||
    (snapshot.timeHorizon?.resolvedYears &&
      snapshot.timeHorizon.resolvedYears < 5)
  ) {
    return "timeline";
  }

  // 2. affordability / income constraint
  if (
    snapshot.constraints?.flags?.isOverLimit ||
    snapshot.utilizationInsight?.level === "aggressive" ||
    snapshot.utilizationInsight?.level === "risky" ||
    snapshot.utilizationInsight?.level === "unsustainable" ||
    (snapshot.utilizationInsight?.ratio &&
      snapshot.utilizationInsight.ratio > 0.6)
  ) {
    return "income";
  }

  // 3. sip gap
  if (snapshot.gapAmount && snapshot.gapAmount > 0) {
    return "sip gap";
  }

  // 4. allocation (lowest priority)
  if (snapshot.allocation?.rebalancingNeeded) {
    return "allocation";
  }

  return "none";
}

function isSemanticallyAllowed(
  output: AgentExplanationOutput,
  snapshot: FinancialSnapshot,
): boolean {
  const rawText = `${output.summary}\n${output.insight}\n${output.suggestion.primary}\n${output.suggestion.optional ?? ""}`;

  if (
    containsForbiddenAdvice(rawText) &&
    snapshot.sipOriginal > snapshot.requiredSip
  ) {
    return false;
  }

  if (
    snapshot.decision.feasibility === "comfortable" &&
    output.tone !== "positive"
  ) {
    return false;
  }

  if (
    (snapshot.decision.feasibility === "tight" ||
      snapshot.decision.feasibility === "stretched" ||
      snapshot.decision.feasibility === "not_viable") &&
    output.tone === "positive"
  ) {
    return false;
  }

  if (
    snapshot.decision.stepUpMode === "optional" &&
    /needed to reach goal|must step up|increase to stay on track/i.test(rawText)
  ) {
    return false;
  }

  if (
    snapshot.decision.stepUpMode === "recommended" &&
    /can accelerate/i.test(rawText) &&
    !/needed to reach goal/i.test(rawText)
  ) {
    return false;
  }

  // Require the AI to reference deterministic reasoning (may paraphrase).
  const reasoning = snapshot.decision?.reasoning ?? "";
  const insight = output.insight ?? "";
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const reasoningTokens = normalize(reasoning).filter((w) => w.length > 4);
  const insightTokens = new Set(normalize(insight));
  let overlap = 0;
  for (const t of reasoningTokens) {
    if (insightTokens.has(t)) overlap++;
    if (overlap >= 2) break;
  }
  if (reasoningTokens.length > 0 && overlap < 2) {
    return false;
  }

  // If utilization is range-aware, ensure the insight mentions the range or contains min/max percentages
  if (snapshot.utilization.type === "range") {
    const min = snapshot.utilization.minPercent?.toString() ?? "";
    const max = snapshot.utilization.maxPercent?.toString() ?? "";
    if (
      !(
        insight.includes(min) ||
        insight.includes(max) ||
        /range|best|worst|min|max|low|high/i.test(insight)
      )
    ) {
      return false;
    }
  }

  return true;
}

function numbersMatchSnapshot(
  output: AgentExplanationOutput,
  snapshot: FinancialSnapshot,
): boolean {
  const allowed = buildAllowedNumbers(snapshot);
  const tokens = extractNumbers(
    `${output.summary}\n${output.insight}\n${output.suggestion.primary}\n${output.suggestion.optional ?? ""}`,
  );

  return tokens.every((token) => allowed.has(Number(token).toString()));
}

function parseExplanationJson(
  raw: string,
  snapshot: FinancialSnapshot,
): AgentExplanationOutput | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] ?? trimmed;

  try {
    const parsed = JSON.parse(candidate) as Partial<AgentExplanationOutput>;
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.insight !== "string" ||
      typeof parsed.suggestion !== "object" ||
      parsed.suggestion === null ||
      typeof parsed.suggestion.primary !== "string" ||
      !["positive", "neutral", "caution", "direct"].includes(parsed.tone ?? "")
    ) {
      return null;
    }

    // Enforce structure limits
    const summaryLines = parsed.summary.trim().split(/\r?\n/).filter(Boolean);
    const insightLines = parsed.insight.trim().split(/\r?\n/).filter(Boolean);
    const suggestionLines = parsed.suggestion.primary
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    if (summaryLines.length > 3) return null;
    if (insightLines.length > 2) return null;
    if (suggestionLines.length !== 1) return null;
    if (parsed.suggestion.primary.trim().length > 240) return null;

    // STEP 1: Validate reasoning structure if present
    let reasoning: ExplanationReasoning | undefined;
    if (parsed.reasoning) {
      if (
        typeof parsed.reasoning.constraint === "string" &&
        typeof parsed.reasoning.cause === "string" &&
        typeof parsed.reasoning.implication === "string"
      ) {
        reasoning = {
          constraint: parsed.reasoning.constraint.trim(),
          cause: parsed.reasoning.cause.trim(),
          implication: parsed.reasoning.implication.trim(),
        };
      } else {
        return null; // Reasoning structure invalid
      }
    }

    // STEP 4: Parse flexible suggestions if present
    let recommendation: AdvisoryRecommendation | undefined;
    if (parsed.recommendation) {
      if (typeof parsed.recommendation.primary !== "string") {
        return null;
      }
      recommendation = {
        primary: parsed.recommendation.primary.trim(),
        optional:
          typeof parsed.recommendation.optional === "string"
            ? parsed.recommendation.optional.trim()
            : undefined,
        tradeoffs: Array.isArray(parsed.recommendation.tradeoffs)
          ? parsed.recommendation.tradeoffs.filter(
              (t): t is string => typeof t === "string",
            )
          : undefined,
      };
    }

    return {
      summary: parsed.summary.trim(),
      insight: parsed.insight.trim(),
      suggestion: {
        primary: parsed.suggestion.primary.trim(),
        optional:
          typeof parsed.suggestion.optional === "string"
            ? parsed.suggestion.optional.trim()
            : undefined,
      },
      reason: buildMicroJustification(snapshot),
      reasoning,
      recommendation,
      tone: parsed.tone as AgentExplanationTone,
      isCritical: !!parsed.isCritical,
    };
  } catch {
    return null;
  }
}

function buildFallbackExplanation(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
  explanationDepth: "short" | "detailed" = "short",
  debug = false,
): AgentExplanationOutput {
  const utilization =
    snapshot.utilization.type === "range"
      ? `~${snapshot.utilization.minPercent?.toFixed(1)}%–${snapshot.utilization.maxPercent?.toFixed(1)}%`
      : `${snapshot.utilization.exactPercent?.toFixed(1)}%`;
  const simple = userProfile?.experienceLevel === "beginner";
  const stepUpText =
    snapshot.decision.stepUpMode === "optional"
      ? "can accelerate growth"
      : "is needed to reach the goal";

  const extraDetail =
    explanationDepth === "detailed"
      ? " Review the timeline and consider small step-ups if comfortable."
      : "";
  const accuracyImprovementNote =
    "Providing exact income and goal details will improve SIP recommendations and make the plan more reliable.";
  const { note: qualityNote, debugInfo: dataQualityDebug } = buildDataQualityNote(
    snapshot,
    debug,
  );
  const debugInfo = `Fallback version: ${snapshot.version}${dataQualityDebug ? ` | ${dataQualityDebug}` : ""}`;
  const mainConstraint = extractMainConstraint(snapshot);
  const viabilityNote = snapshot.decision.feasibility === "not_viable" ? "A major adjustment is needed." : "";
  const addDataQualityNote = (text: string) =>
    qualityNote ? `${text} ${qualityNote}` : text;

  // STEP 1: Build reasoning structure with return assumption context
  const returnAssumption = getReturnAssumptionText(snapshot);
  const timelineImpact = getTimelineContext(snapshot.timeHorizon?.resolvedYears ?? 0);
  const reasoning: ExplanationReasoning = {
    constraint: mainConstraint,
    cause:
      snapshot.decision.reasoning ||
      `Plan requirements based on assumed ${returnAssumption}. ${timelineImpact}`,
    implication:
      snapshot.decision.feasibility === "comfortable"
        ? "Your plan is secure under this scenario. Stay consistent with your current SIP and monitor returns."
        : "This plan may not reach your goal under all market conditions. You should consider adjusting timeline, reducing goal, or increasing income.",
  };

  // STEP 4: Build flexible suggestion structure
  const tradeoffsForDetailed =
    explanationDepth === "detailed"
      ? [
          snapshot.decision.feasibility === "comfortable"
            ? "Consistency → peace of mind"
            : "Higher SIP → shorter timeline",
          snapshot.decision.stepUpMode === "optional"
            ? "Step-up (optional) → faster growth but higher risk"
            : "Extended timeline → lower monthly commitment",
        ]
      : undefined;

  const recommendation: AdvisoryRecommendation = {
    primary: snapshot.decision.primaryAction || "Keep the current plan steady.",
    optional: snapshot.decision.optionalAction,
    tradeoffs: tradeoffsForDetailed,
  };

  if (snapshot.sipOriginal > snapshot.requiredSip) {
    const sipAboveTone = resolveTone(snapshot);
    const insightText = addDataQualityNote(
      snapshot.decision.reasoning || "Your SIP is above the required amount.",
    );
    return {
      summary:
        snapshot.decision.primaryAction || "Keep the current plan steady.",
      insight: emphasizeUncertainty(insightText),
      suggestion: {
        primary: snapshot.decision.secondaryAction ?? "Keep the buffer intact.",
        optional: snapshot.decision.optionalAction ?? undefined,
      },
      reason: buildMicroJustification(snapshot),
      reasoning,
      recommendation,
      tone: sipAboveTone,
      debugInfo,
    };
  }

  if (snapshot.decision.feasibility === "comfortable") {
    const insightText = addDataQualityNote(
      snapshot.decision.reasoning ||
        "Your plan has a good chance of reaching your goal with your current SIP.",
    );
    return {
      summary:
        snapshot.decision.primaryAction || "Keep the current plan steady.",
      insight: emphasizeUncertainty(insightText),
      suggestion: {
        primary:
          `${snapshot.decision.secondaryAction ?? "Stay consistent."} ${extraDetail}`.trim(),
        optional: snapshot.decision.optionalAction ?? undefined,
      },
      reason: buildMicroJustification(snapshot),
      reasoning,
      recommendation,
      tone: "positive",
      debugInfo,
    };
  }

  if (
    snapshot.decision.feasibility === "not_viable" ||
    snapshot.decision.feasibility === "stretched"
  ) {
    let primaryRecovery = "";
    let secondaryRecovery = "";

    if (mainConstraint === "timeline") {
      primaryRecovery = "Extend your timeline to make this goal achievable.";
      secondaryRecovery =
        "Or reduce your target amount to fit the current window.";
    } else if (mainConstraint === "income") {
      primaryRecovery =
        "Increase your investable income through secondary sources.";
      secondaryRecovery = "Or reduce your goal target to a manageable level.";
    } else {
      primaryRecovery =
        "Increase your monthly investment to meet the requirement.";
      secondaryRecovery =
        "Or extend your timeline to lower the monthly burden.";
    }

    return {
      summary:
        "This plan cannot reach your goal under current conditions. The current setup is not viable.",
      insight: addDataQualityNote(
        "Plan requirements exceed available resources. A major adjustment is required.",
      ),
      suggestion: {
        primary: primaryRecovery,
        optional: secondaryRecovery,
      },
      reason: buildMicroJustification(snapshot),
      reasoning,
      recommendation: {
        primary: primaryRecovery,
      },
      tone: "caution",
      isCritical: true,
      debugInfo,
    };
  }

  const finalExplanation = {
    summary: snapshot.decision.primaryAction || "Adjust your plan to reach the goal.",
    insight: addDataQualityNote(
      snapshot.decision.reasoning || "Your current SIP is below the amount needed.",
    ),
    suggestion: {
      primary: `${
        snapshot.decision.stepUpMode === "recommended"
          ? (snapshot.decision.secondaryAction ?? "Increase your SIP to close the gap.")
          : (snapshot.decision.secondaryAction ?? "Increase your SIP to close the gap.")
      } ${extraDetail}`.trim(),
      optional: snapshot.decision.optionalAction ?? undefined,
    },
    reason: buildMicroJustification(snapshot),
    reasoning,
    recommendation,
    tone: resolveTone(snapshot),
    debugInfo,
  };

  return finalExplanation;
}

function buildSystemPrompt(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
  explanationDepth: "short" | "detailed" = "short",
): string {
  const personality = buildAdvisorPersonality(snapshot, userProfile);
  const behavioralTone = buildBehavioralToneAdjustment(snapshot, userProfile);
  const mainConstraint = extractMainConstraint(snapshot);

  const dataQualityNote =
    snapshot.dataQuality.confidence === "high"
      ? "Data quality note: inputs are high confidence."
      : snapshot.dataQuality.confidence === "medium"
        ? `Data quality note: this plan is based on estimated inputs and approximate values. Mention that results may vary and that providing exact income and goal details will improve SIP recommendations.`
        : `Data quality note: this plan is based on approximate inputs. Clearly state that actual results may vary, the plan should be reviewed once profile data is updated, and that providing exact income and goal details will improve SIP recommendations.`;

  const depthGuide =
    explanationDepth === "detailed"
      ? "For DETAILED mode: include reasoning (constraint, cause, implication) and list trade-offs if applicable. Show why each path matters."
      : "For SHORT mode: only key insight + immediate action. Omit reasoning details.";

  return [
    "You are an intelligent financial advisor explaining pre-calculated results.",
    personality,
    behavioralTone,
    dataQualityNote,
    "You are an intelligent financial advisor explaining pre-calculated results.",
    personality,
    behavioralTone,
    "",
    "CORE RULES:",
    "- Lead with ACTION first, not description",
    "- DO NOT generate new numbers; use only snapshot values",
    "- DO NOT repeat information already visible in the UI (buffer %, SIP amount, utilization)",
    "- DO NOT invent logic; explain the deterministic reasoning",
    "- Focus on clarity and actionability",
    "- Avoid over-politeness; prioritize truth over comfort",
    "",
    "STEP 1 — PRIMARY ACTION (required):",
    "Lead with the single most important action user should take. This is the headline. One sentence max.",
    "CRITICAL: If the setup is NOT viable (not_viable/stretched), you MUST start with: 'The current plan is not viable.' or 'The numbers do not match your goal.' followed immediately by the primary corrective action. DO NOT use softening phrases like 'given your current setup' or 'difficult to achieve'.",
    "Otherwise, if the plan is feasible but tight, address the primary constraint directly:",
    "  - IF constraint is 'timeline' → action must be 'Extend timeline'",
    "  - IF constraint is 'income' → action must be 'Increase investable income' or 'Lower goal target'",
    "  - IF constraint is 'sip gap' → action must be 'Increase SIP'",
    "",
    "STEP 2 — RECOVERY PATHS (If not viable):",
    "If the setup is NOT viable, you MUST provide 1-2 clear recovery actions.",
    "- First action: Addresses the primary constraint.",
    "- Second action: Secondary lever (e.g., if timeline is main issue, suggest reducing target).",
    "- Use ASSERTIVE language: 'You need to', 'This is required', 'This is the most effective change'.",
    "- AVOID weak language: 'if needed', 'optional', 'you can consider'.",
    "",
    "STEP 3 — REASONING VALIDATION (required):",
    `Main constraint for this plan: ${mainConstraint}`,
    "In your response, clearly identify:",
    "  - The CONSTRAINT (e.g., income capacity, timeline, shortfall)",
    "  - The CAUSE (why this constraint exists)",
    "  - The IMPLICATION (what it means for the plan)",
    "",
    "STEP 4 — DEPTH CONTROL:",
    depthGuide,
    "",
    "STEP 5 — FLEXIBLE SUGGESTIONS:",
    "Provide optional secondary action ONLY if there's a meaningful alternative or lever.",
    "If confidence is not high, explain why accuracy matters. Use user-friendly language only.",
    "",
    "OUTPUT FORMAT (JSON):",
    "{",
    '  "summary": "primary message or headline (max 1-2 lines)",',
    '  "insight": "short reason why (max 1-2 lines). Include data quality note if needed.",',
    '  "suggestion": { ',
    '    "primary": "Primary recovery action (if unviable) or secondary step (if viable)", ',
    '    "optional": "Secondary recovery action or alternative lever"',
    "  },",
    '  "reasoning": {',
    '    "constraint": "identified main constraint",',
    '    "cause": "why it exists",',
    '    "implication": "what it means"',
    "  },",
    '  "recommendation": { "primary": "main action", "optional": "if needed", "tradeoffs": [...] } (only in detailed mode),',
    '  "tone": "positive | neutral | caution | direct",',
    '  "isCritical": true/false (true if setup is unviable)',
    "}",
    "",
    "Be direct. Name hard truths. Lead with action.",
  ].join("\n");
}

async function callOpenRouterExplanation(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
  explanationDepth: "short" | "detailed" = "short",
): Promise<{ explanation: AgentExplanationOutput | null; hadContentWithNumbers: boolean }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { explanation: null, hadContentWithNumbers: false };
  }

  const contract = buildContract(snapshot);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 8_000);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.2,
          max_tokens: 300, // increased for reasoning + trade-offs
          top_p: 0.9,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(
                snapshot,
                userProfile,
                explanationDepth,
              ),
            },
            { role: "user", content: JSON.stringify(contract) },
          ],
        }),
        signal: abortController.signal,
      },
    );

    const rawBody = await response.text();
    if (!response.ok) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    const data = JSON.parse(rawBody) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ text?: string }>;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;
    const text =
      typeof content === "string"
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((part) => part.text ?? "")
              .join("\n")
              .trim()
          : "";

    if (!text) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    const parsed = parseExplanationJson(text, snapshot);
    if (!parsed) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    // STEP 1: Validate reasoning structure if present
    if (parsed.reasoning && !validateReasoningStructure(parsed)) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    // Enforce tone mapping must match deterministic mapping
    const requiredTone = resolveTone(snapshot);
    if (parsed.tone !== requiredTone) return { explanation: null, hadContentWithNumbers: false };

    if (!numbersMatchSnapshot(parsed, snapshot)) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    if (!isSemanticallyAllowed(parsed, snapshot)) {
      return { explanation: null, hadContentWithNumbers: false };
    }

    return { explanation: parsed, hadContentWithNumbers: false };
  } catch {
    return { explanation: null, hadContentWithNumbers: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isSnapshotRelatedQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return [
    "invest",
    "investment",
    "portfolio",
    "allocation",
    "equity",
    "debt",
    "gold",
    "cash",
    "liquid",
    "goal",
    "retire",
    "retirement",
    "corpus",
    "track",
    "on track",
    "feasible",
    "feasibility",
    "return",
    "projection",
    "market",
    "plan",
    "what if",
    "increase sip",
    "reduce goal",
    "timeline",
    "income",
    "expense",
    "emi",
  ].some((keyword) => normalized.includes(keyword));
}

function buildFollowUpSnapshotContext(snapshot: FinancialSnapshot, explanation: AgentExplanationOutput): string {
  return JSON.stringify(
    {
      userProfile: snapshot.userProfile,
      goal: snapshot.goal,
      feasibility: snapshot.feasibility,
      requiredSip: snapshot.requiredSip,
      allocation: snapshot.allocation,
      decision: snapshot.decision,
      explanation: {
        summary: explanation.summary,
        insight: explanation.insight,
        reason: explanation.reason,
        suggestion: explanation.suggestion,
        tone: explanation.tone,
        isCritical: explanation.isCritical,
      },
    },
    null,
    2,
  );
}

function buildMicroJustification(snapshot: FinancialSnapshot): string {
  if (snapshot.sipOriginal > snapshot.requiredSip) {
    return "You are already comfortably above the required level";
  }

  if (
    snapshot.decision.feasibility === "not_viable" ||
    snapshot.decision.feasibility === "stretched"
  ) {
    if (snapshot.constraints?.flags?.isOverLimit) {
      return "Your target exceeds your safe monthly investment capacity";
    }
    if (snapshot.goal?.timeHorizonMonths < 60) {
      return "Your timeline is limiting compounding potential";
    }
    return "Your setup may fall short without adjustment";
  }

  if (snapshot.decision.feasibility === "tight") {
    return "Your current plan is just enough to meet the goal";
  }

  return "Your plan is on track to meet your targets";
}

export async function generateFollowUpAnswer(
  question: string,
  snapshot: FinancialSnapshot,
  explanation: AgentExplanationOutput,
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return "AI services are currently unavailable. Please try again later.";
  }
  
  // Determine if question is related to the financial snapshot
  const snapshotKeywords = /sip|goal|income|timeline|corpus|allocation|return|investment|feasible|plan|buffer|utilization|capacity|horizon/i;
  const isSnapshotRelated = snapshotKeywords.test(question);
  
  const snapshotContext = isSnapshotRelated
    ? buildFollowUpSnapshotContext(snapshot, explanation)
    : null;

  const systemPrompt = isSnapshotRelated
    ? [
        "You are Pravix AI Assistant powered by OpenRouter GPT-5.3 Chat.",
        "",
        "You are answering a question about the user's financial plan.",
        "Use the snapshot context provided by the app as the source of truth.",
        "Do not recalculate numbers or invent any new values.",
        "If the user asks a plan-related question, answer directly from the snapshot and explain the implication in plain language.",
        "If the user asks a general finance question, answer briefly and then connect it back to the snapshot when useful.",
        "Do not refuse the question just because it is broad.",
        "",
        "RESPONSE RULES:",
        "- Be concise and direct.",
        "- Keep the answer grounded in the dashboard snapshot.",
        "- Do not mention hidden chain-of-thought or internal rules.",
        "- If the user asks 'what if' or 'how much', explain direction using the provided plan data only.",
      ].join("\n")
    : [
        "You are Pravix AI Assistant powered by OpenRouter GPT-5.3 Chat.",
        "",
        "You are answering a general question for the user.",
        "Answer helpfully and directly.",
        "Do not force the answer back to the financial dashboard unless the question actually asks about the plan.",
        "If the question is finance-related but not tied to the dashboard, give a brief general answer.",
        "",
        "RESPONSE RULES:",
        "- Be concise and direct.",
        "- No need to mention snapshot data when the question is unrelated to the plan.",
        "- Keep the tone calm, clear, and useful.",
      ].join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(snapshotContext
      ? [
          {
            role: "user" as const,
            content: [
              "=== DASHBOARD SNAPSHOT (READ ONLY) ===",
              snapshotContext,
              "",
              "=== USER QUESTION ===",
              question,
            ].join("\n"),
          },
        ]
      : [
          {
            role: "user" as const,
            content: question,
          },
        ]),
  ];

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10_000);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          temperature: 0.1,
          max_tokens: 300,
          messages,
        }),
        signal: abortController.signal,
      },
    );

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("FAILED TO PARSE OPENROUTER RESPONSE:", text);
      return "The AI service returned an invalid response. Please try again.";
    }

    const answer = data.choices?.[0]?.message?.content?.trim();

    // Debug logging: followup queries can be logged here if needed

    return answer || "I'm sorry, I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("FOLLOW-UP ERROR:", error);
    return "Connection error. Please try again.";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateExplanation(
  snapshot: FinancialSnapshot,
  userProfile: AgentProfileSnapshot | null,
  explanationDepth: "short" | "detailed" = "short",
  debug = false,
): Promise<AgentExplanationOutput> {
  const reason = buildMicroJustification(snapshot);

  // Forced system-test override: when set, return a deterministic visible marker.
  if (process.env.SYSTEM_TEST_ACTIVE === "1") {
    return {
      summary: "SYSTEM TEST ACTIVE",
      insight: "SYSTEM TEST ACTIVE",
      suggestion: {
        primary: "SYSTEM TEST ACTIVE",
      },
      reason,
      reasoning: {
        constraint: extractMainConstraint(snapshot),
        cause: "system test",
        implication: "system test",
      },
      recommendation: {
        primary: "SYSTEM TEST ACTIVE",
      },
      tone: resolveTone(snapshot),
    };
  }

  const { explanation: modelExplanation, hadContentWithNumbers } = await callOpenRouterExplanation(
    snapshot,
    userProfile,
    explanationDepth,
  );
  if (modelExplanation) {
    const finalEx = { ...modelExplanation, reason };
    return debug
      ? {
          ...finalEx,
          debugInfo: buildDataQualityNote(snapshot, debug).debugInfo,
        }
      : finalEx;
  }

  const fallback = buildFallbackExplanation(
    snapshot,
    userProfile,
    explanationDepth,
    debug,
  );
  // If the AI produced a response that included numbers but was rejected,
  // redact numeric values from fallback to avoid echoing AI-injected numbers.
  const attemptedAI = !!process.env.OPENROUTER_API_KEY;
  if (hadContentWithNumbers || attemptedAI) {
    const redact = (s: string) => s.replace(/[\d₹,]+/g, "").replace(/\s{2,}/g, " ").trim();
    const redacted = {
      ...fallback,
      summary: redact(fallback.summary),
      insight: redact(fallback.insight),
      suggestion: {
        primary: redact(fallback.suggestion.primary),
        optional: fallback.suggestion.optional ? redact(fallback.suggestion.optional) : undefined,
      },
    };
    return { ...redacted, reason };
  }

  return { ...fallback, reason };
}
