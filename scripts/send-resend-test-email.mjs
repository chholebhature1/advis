import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Resend } from "resend";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadLocalEnv();

  const to = process.argv[2] || "info@pravix.in";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in environment.");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: "Pravix Resend Test",
    html: "<p>Hello from Pravix. Resend integration is active.</p>",
  });

  if (result.error) {
    throw new Error(JSON.stringify(result.error));
  }

  // Print only delivery metadata, never secrets.
  console.log(`EMAIL_SENT to=${to} id=${result.data?.id ?? "unknown"}`);
}

main().catch((error) => {
  console.error(`EMAIL_SEND_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
