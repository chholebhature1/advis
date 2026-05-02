import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildOtpEmailHtml,
  generateOtp,
  getOtpExpiresAt,
  hashOtp,
  normalizeEmail,
  OTP_SEND_LIMIT,
  OTP_SEND_WINDOW_MS,
} from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail((body.email ?? "").toString());

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const windowStart = new Date(Date.now() - OTP_SEND_WINDOW_MS).toISOString();
    const { data: rows, error: selErr } = await admin
      .from("auth_otps")
      .select("id")
      .eq("email", email)
      .gte("created_at", windowStart);

    if (selErr) {
      console.error("OTP send lookup error", selErr);
      return NextResponse.json({ error: "Unable to evaluate OTP rate limits." }, { status: 500 });
    }

    const sendsCount = Array.isArray(rows) ? rows.length : 0;
    if (sendsCount >= OTP_SEND_LIMIT) {
      return NextResponse.json({ error: "Too many OTP requests. Try again later." }, { status: 429 });
    }

    const otp = generateOtp();
    const hashed = await hashOtp(otp);
    const expiresAt = getOtpExpiresAt().toISOString();

    const { error: insertErr } = await admin.from("auth_otps").insert({
      email,
      hashed_otp: hashed,
      expires_at: expiresAt,
      attempts: 0,
      sent_count: 1,
    });

    if (insertErr) {
      console.error("insertErr", insertErr);
      return NextResponse.json({ error: "Failed to persist OTP." }, { status: 500 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.BOOKING_EMAIL_FROM?.trim() || process.env.ALERTS_EMAIL_FROM?.trim() || "no-reply@pravix.ai";

    if (!resendApiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: resendFrom,
        to: [email],
        subject: "Your Pravix verification code",
        html: buildOtpEmailHtml(otp),
      });
    } catch (err) {
      console.error("Resend error", err);
      return NextResponse.json({ error: "Failed to deliver OTP email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
