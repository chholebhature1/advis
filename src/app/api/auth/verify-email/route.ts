import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !email.includes("@")) {
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
      .eq("email", email.toLowerCase())
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

    // Confirm the user in Supabase Auth
    const { error: confirmError } = await supabase.auth.admin.updateUserById(data.id, {
      email_confirmed_at: new Date().toISOString(),
    });

    if (confirmError) {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
