import { NextResponse } from "next/server";
import { createAuthedSupabaseClient, getBearerToken, resolveAuthedUser } from "@/lib/agent/server";
import { loadAgentContext } from "@/lib/agent/context";
import { generateAdvisorChatReply } from "@/lib/agent/nim";
import type { AgentChatHistoryItem } from "@/lib/agent/types";

type ChatBody = {
  message?: unknown;
  history?: unknown;
};

function isHistoryItem(value: unknown): value is AgentChatHistoryItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const maybe = value as Partial<AgentChatHistoryItem>;
  const roleOk = maybe.role === "user" || maybe.role === "assistant";
  return roleOk && typeof maybe.content === "string";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const body = (await request.json()) as ChatBody;
    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    const history: AgentChatHistoryItem[] = Array.isArray(body.history)
      ? body.history.filter(isHistoryItem).map((item) => ({ role: item.role, content: item.content.trim() }))
      : [];

    const supabase = createAuthedSupabaseClient(accessToken);
    const user = await resolveAuthedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const context = await loadAgentContext(supabase, user.id);
    const advisorReply = await generateAdvisorChatReply({
      message: body.message.trim(),
      history,
      context,
    });

    return NextResponse.json(
      {
        ok: true,
        reply: advisorReply.reply,
        structured: advisorReply.structured,
        isSimpleAnswer: advisorReply.isSimpleAnswer,
        disclaimer:
          "Educational guidance only. This is not guaranteed return advice. Validate suitability before investing.",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected chat error.";
    console.error("[agent/chat] Error:", message, "Stack:", error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
