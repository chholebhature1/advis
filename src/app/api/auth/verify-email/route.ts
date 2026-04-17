import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

async function confirmSupabaseUserByEmail(
  supabase: SupabaseClient,
  normalizedEmail: string
): Promise<void> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const matchedUser = users.find((user) => user.email?.toLowerCase() === normalizedEmail);

    if (matchedUser) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(matchedUser.id, {
        email_confirm: true,
      });

      if (confirmError) {
        throw confirmError;
      }

      return;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  throw new Error("Unable to find user by email for confirmation.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;
    const normalizedEmail = String(email ?? "").toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find and verify the token
    const { data, error: selectError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (selectError || !data) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    if (data.verified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("email_verification_tokens")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
    }

    // Confirm the related user in Supabase Auth.
    try {
      await confirmSupabaseUserByEmail(supabase, normalizedEmail);
    } catch (confirmError) {
      console.error("Confirm error:", confirmError);
      // Don't fail here - token is verified in database even if auth update fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verification error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.startsWith("Missing environment variable:")) {
      return NextResponse.json(
        {
          error: `${message}. Please set it in .env.local and restart the server.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}
