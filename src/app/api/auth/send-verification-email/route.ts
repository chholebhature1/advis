import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

function generateToken(): string {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clean up expired tokens for this email
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("email", email.toLowerCase())
      .lt("expires_at", new Date().toISOString());

    // Insert new token
    const { error: insertError } = await supabase.from("email_verification_tokens").insert({
      email: email.toLowerCase(),
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json({ error: "Failed to generate verification token" }, { status: 500 });
    }

    // Send email via Resend (unlimited emails, no rate limit)
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resend = new Resend(resendApiKey);
    const from = process.env.ALERTS_EMAIL_FROM || "onboarding@pravix.ai";

    const { error: emailError } = await resend.emails.send({
      from,
      to: [email],
      subject: "Verify your Pravix account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2a24;">Verify your email</h2>
          <p style="color: #5a6b63; line-height: 1.6;">
            Your Pravix verification code is:
          </p>
          <div style="
            background: #f5f5f5;
            border: 2px solid #2b5cff;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin: 20px 0;
          ">
            <p style="
              font-size: 32px;
              font-weight: bold;
              color: #2b5cff;
              margin: 0;
              letter-spacing: 4px;
            ">
              ${token}
            </p>
          </div>
          <p style="color: #5a6b63; font-size: 14px;">
            This code expires in 15 minutes.
          </p>
          <p style="color: #8a9b93; font-size: 12px; margin-top: 20px;">
            If you didn't attempt to sign up, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent to your email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verification email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
