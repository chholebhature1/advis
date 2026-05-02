import { describe, expect, it } from "vitest";
import { buildOtpEmailHtml, generateOtp, getOtpExpiresAt, isOtpExpired, normalizeEmail } from "./otp";

describe("otp helpers", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  User@Example.com  ")).toBe("user@example.com");
  });

  it("generates a six-digit OTP", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("sets expiry five minutes in the future", () => {
    const now = Date.now();
    const expiresAt = getOtpExpiresAt(now);
    expect(expiresAt.getTime() - now).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });

  it("detects expired codes", () => {
    expect(isOtpExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isOtpExpired(new Date(Date.now() + 60_000))).toBe(false);
  });

  it("renders the OTP in the email body", () => {
    const html = buildOtpEmailHtml("123456");
    expect(html).toContain("123456");
  });
});
