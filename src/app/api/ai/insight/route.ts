import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";

export const runtime = "nodejs";

type InsightRequestBody = {
  question?: unknown;
  userProfile?: unknown;
};

type OpenRouterChoice = {
  message?: {
    content?: string | Array<{ text?: string }>;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

type InsightUserProfile = {
  age: number | null;
  goals: string[];
  risk: string;
  preferences: string[];
};

type InsightPayload = {
  recommendation: string;
  reason: string;
  risk_warning: string;
  next_action: string;
  follow_up_questions: string[];
};

type InsightAttemptResult = {
  insight: InsightPayload | null;
  providerOk: boolean;
};

const SYSTEM_PROMPT = `You are Pravix AI, a goal-based financial guidance assistant.

Rules:

* Give simple, realistic, and practical financial guidance
* Do NOT guarantee returns
* Do NOT predict exact market outcomes
* Base all suggestions on user profile and goals
* Avoid hype and complex jargon

Always return structured output in JSON format with:

* recommendation
* reason
* risk_warning
* next_action
* follow_up_questions (array of exactly 3 short, personalized next questions)

Tone:
Clear, professional, and easy to understand.

This is educational guidance, not financial advice.`;

const DEFAULT_FOLLOW_UP_QUESTIONS = [
  "What monthly SIP amount can I commit without missing this goal?",
  "Should this goal be split between equity and debt for better balance?",
  "Which one action should I automate this month to stay on track?",
];

const FALLBACK_INSIGHT: InsightPayload = {
  recommendation: "Unable to generate advice right now",
  reason: "Temporary issue",
  risk_warning: "Please consult a financial advisor",
  next_action: "Try again later",
  follow_up_questions: DEFAULT_FOLLOW_UP_QUESTIONS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toText(item))
    .filter((item): item is string => Boolean(item));
}

function toAge(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0 || value > 120) {
    return null;
  }

  return Math.round(value);
}

function parseUserProfile(value: unknown): InsightUserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const risk = toText(value.risk) ?? "moderate";

  return {
    age: toAge(value.age),
    goals: toTextArray(value.goals).slice(0, 8),
    risk,
    preferences: toTextArray(value.preferences).slice(0, 8),
  };
}

function extractModelContent(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => toText(item.text) ?? "")
      .join("\n")
      .trim();
  }

  return "";
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function normalizeInsight(value: unknown): InsightPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const recommendation = toText(value.recommendation);
  const reason = toText(value.reason);
  const riskWarning = toText(value.risk_warning);
  const nextAction = toText(value.next_action);
  const followUpQuestions = toTextArray(value.follow_up_questions).slice(0, 3);

  if (!recommendation || !reason || !riskWarning || !nextAction) {
    return null;
  }

  return {
    recommendation,
    reason,
    risk_warning: riskWarning,
    next_action: nextAction,
    follow_up_questions: followUpQuestions.length > 0 ? followUpQuestions : DEFAULT_FOLLOW_UP_QUESTIONS,
  };
}

function parseInsightFromText(rawContent: string): InsightPayload | null {
  const cleaned = stripCodeFence(rawContent);
  const candidates = [cleaned];

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const insight = normalizeInsight(parsed);
      if (insight) {
        return insight;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function hasUnrealisticYearlyReturn(text: string): boolean {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*%\s*(?:per\s*year|yearly|annual(?:ly)?|p\.?\s*a\.?|per\s*annum)/gi,
    /(?:per\s*year|yearly|annual(?:ly)?|p\.?\s*a\.?|per\s*annum)[^\d%]{0,20}(\d+(?:\.\d+)?)\s*%/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = Number.parseFloat(match[1] ?? "0");
      if (Number.isFinite(value) && value > 20) {
        return true;
      }
    }
  }

  return false;
}

function violatesGuardrails(insight: InsightPayload): boolean {
  const combined = [
    insight.recommendation,
    insight.reason,
    insight.risk_warning,
    insight.next_action,
  ].join(" ");
  const lower = combined.toLowerCase();

  if (lower.includes("guaranteed returns")) {
    return true;
  }

  return hasUnrealisticYearlyReturn(lower);
}

async function requestInsightFromOpenRouter(params: {
  question: string;
  userProfile: InsightUserProfile;
  openRouterApiKey: string;
  model: string;
  strictJson: boolean;
}): Promise<InsightAttemptResult> {
  const { question, userProfile, openRouterApiKey, model, strictJson } = params;

  const strictInstruction = strictJson
    ? "Return only valid JSON with exactly these keys: recommendation, reason, risk_warning, next_action, follow_up_questions. follow_up_questions must contain exactly 3 concise personalized questions. No markdown, no extra text."
    : "";

  const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            `User Profile: ${JSON.stringify(userProfile)}`,
            `Question: ${question}`,
            strictInstruction,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!openRouterResponse.ok) {
    const responsePreview = await openRouterResponse.text();
    console.error("OpenRouter request failed", {
      status: openRouterResponse.status,
      body: responsePreview.slice(0, 300),
      strictJson,
    });

    return {
      insight: null,
      providerOk: false,
    };
  }

  const payload = (await openRouterResponse.json()) as OpenRouterResponse;
  const modelContent = extractModelContent(payload);

  return {
    insight: parseInsightFromText(modelContent),
    providerOk: true,
  };
}

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (accessToken) {
      const supabase = createAuthedSupabaseClient(accessToken);
      const user = await resolveAuthedUser(supabase);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
      }
    }

    const body = (await request.json()) as InsightRequestBody;
    const question = toText(body.question);
    const userProfile = parseUserProfile(body.userProfile);

    if (!question) {
      return NextResponse.json({ error: "question is required." }, { status: 400 });
    }

    if (!userProfile) {
      return NextResponse.json({ error: "userProfile is required." }, { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        {
          ok: true,
          insight: FALLBACK_INSIGHT,
          followUpQuestions: DEFAULT_FOLLOW_UP_QUESTIONS,
          fallbackUsed: true,
        },
        { status: 200 },
      );
    }

    const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat";

    let providerReachable = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptResult = await requestInsightFromOpenRouter({
        question,
        userProfile,
        openRouterApiKey,
        model,
        strictJson: attempt === 1,
      });

      providerReachable = providerReachable || attemptResult.providerOk;

      if (!attemptResult.insight) {
        continue;
      }

      if (violatesGuardrails(attemptResult.insight)) {
        return NextResponse.json(
          {
            ok: true,
            insight: FALLBACK_INSIGHT,
            followUpQuestions: DEFAULT_FOLLOW_UP_QUESTIONS,
            fallbackUsed: true,
            guardrailRejected: true,
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          insight: attemptResult.insight,
          followUpQuestions: attemptResult.insight.follow_up_questions,
          fallbackUsed: false,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        insight: FALLBACK_INSIGHT,
        followUpQuestions: DEFAULT_FOLLOW_UP_QUESTIONS,
        fallbackUsed: true,
        providerReachable,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("AI insight route failed", error);

    return NextResponse.json(
      {
        ok: true,
        insight: FALLBACK_INSIGHT,
        followUpQuestions: DEFAULT_FOLLOW_UP_QUESTIONS,
        fallbackUsed: true,
      },
      { status: 200 },
    );
  }
}
