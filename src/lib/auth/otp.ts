import crypto from "crypto";
import * as bcrypt from "bcryptjs";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
export const OTP_SEND_LIMIT = 3;
export const OTP_VERIFY_LIMIT = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function getOtpExpiresAt(now = Date.now()): Date {
  return new Date(now + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt: string | Date, now = new Date()): boolean {
  const expiresAtDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiresAtDate.getTime() <= now.getTime();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function buildOtpEmailHtml(otp: string): string {
  return `
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
          ${otp}
        </p>
      </div>
      <p style="color: #5a6b63; font-size: 14px;">
        This code expires in 5 minutes.
      </p>
      <p style="color: #8a9b93; font-size: 12px; margin-top: 20px;">
        If you didn't attempt to sign up, you can safely ignore this email.
      </p>
    </div>
  `;
}
