import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_COOLDOWN_SECONDS = 60;
const EMAIL_DAILY_LIMIT = 20;
const IP_WINDOW_MINUTES = 15;
const IP_WINDOW_LIMIT = 10;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

function generateToken(): string {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return null;
}

async function enforceRateLimits(
   supabase: SupabaseClient<any, any, any, any, any>,
   normalizedEmail: string,
   requestIp: string | null
): Promise<string | null> {
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - EMAIL_COOLDOWN_SECONDS * 1000).toISOString();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const ipWindowStart = new Date(now.getTime() - IP_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count: recentEmailCount, error: recentEmailError } = await supabase
    .from("email_verification_tokens")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizedEmail)
    .gte("created_at", cooldownStart);

  if (recentEmailError) {
    throw recentEmailError;
  }

  if ((recentEmailCount ?? 0) > 0) {
    return `Please wait ${EMAIL_COOLDOWN_SECONDS} seconds before requesting another code.`;
  }

  const { count: dailyEmailCount, error: dailyEmailError } = await supabase
    .from("email_verification_tokens")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizedEmail)
    .gte("created_at", dayStart.toISOString());

  if (dailyEmailError) {
    throw dailyEmailError;
  }

  if ((dailyEmailCount ?? 0) >= EMAIL_DAILY_LIMIT) {
    return "Daily verification code limit reached for this email. Please try again tomorrow.";
  }

  if (requestIp) {
    const { count: ipWindowCount, error: ipWindowError } = await supabase
      .from("email_verification_tokens")
      .select("id", { count: "exact", head: true })
      .eq("request_ip", requestIp)
      .gte("created_at", ipWindowStart);

    if (ipWindowError) {
      throw ipWindowError;
    }

    if ((ipWindowCount ?? 0) >= IP_WINDOW_LIMIT) {
      return `Too many verification requests from this network. Please wait ${IP_WINDOW_MINUTES} minutes.`;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const requestIp = getClientIp(request);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rateLimitMessage = await enforceRateLimits(supabase, normalizedEmail, requestIp);
    if (rateLimitMessage) {
      return NextResponse.json({ error: rateLimitMessage }, { status: 429 });
    }

    // Clean up expired tokens for this email
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("email", normalizedEmail)
      .lt("expires_at", new Date().toISOString());

    // Insert new token
    const { error: insertError } = await supabase.from("email_verification_tokens").insert({
      email: normalizedEmail,
      token,
      expires_at: expiresAt.toISOString(),
      request_ip: requestIp,
    });

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json({ error: "Failed to generate verification token" }, { status: 500 });
    }

    // Send to the actual recipient by default.
    // Set RESEND_TEST_RECIPIENT in development only if you want to redirect OTPs to a test inbox.
    const testRecipient = process.env.RESEND_TEST_RECIPIENT?.trim();
    const recipientEmail = process.env.NODE_ENV === "development" && testRecipient ? testRecipient : normalizedEmail;

    // Send email via Resend (unlimited emails, no rate limit)
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resend = new Resend(resendApiKey);
    const from = process.env.ALERTS_EMAIL_FROM?.trim() || "no-reply@weberaexperts.com";

    const sendResult = await resend.emails.send({
      from,
      to: [recipientEmail],
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

    const emailError = sendResult.error;
    const messageId = typeof sendResult.data?.id === "string" ? sendResult.data.id : null;

    if (emailError) {
      console.error("Resend error details:", {
        error: emailError,
        errorString: JSON.stringify(emailError),
        message: emailError?.message,
        recipientEmail,
        originalEmail: normalizedEmail
      });
      // Still return success since token is saved in DB - Resend rate limits or temporary issues shouldn't block auth
      // In production, the token will still work for verification
      return NextResponse.json(
        {
          success: true,
          message:
            process.env.NODE_ENV === "development"
              ? "Email delivery failed in development. Use the fallback OTP shown in UI."
              : "Verification code generated. Email delivery failed; please retry.",
          delivered: false,
          _debug: process.env.NODE_ENV === "development" ? { token, error: emailError?.message } : undefined
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent to your email",
        delivered: true,
        messageId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verification email error:", error);
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
