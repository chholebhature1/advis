import { NextResponse } from "next/server";
import { generateFollowUpAnswer } from "@/lib/agent/explanation-layer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { question, snapshot, explanation } = await request.json();

    if (!question || !snapshot || !explanation) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (question, snapshot, or explanation).",
        },
        { status: 400 },
      );
    }

    const answer = await generateFollowUpAnswer(
      question,
      snapshot,
      explanation,
    );

    if (!answer) {
      return NextResponse.json(
        { error: "Failed to generate an answer." },
        { status: 500 },
      );
    }

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error("FOLLOW-UP ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
