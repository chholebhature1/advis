This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Insights Data Stack

For a compliant, free/low-cost market data strategy for the Insights experience, see:

- [docs/insight-data-stack-playbook.md](docs/insight-data-stack-playbook.md)

## Supabase Connection

This project is configured to use Supabase with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Environment values are loaded from `.env.local`.

Use the shared browser client helper in `src/lib/supabase/client.ts`:

```ts
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();
```

## Phase 1 AI Agent APIs

Phase 1 introduces authenticated agent routes backed by Supabase context and NVIDIA NIM:

- `GET /api/agent/bootstrap`
- `POST /api/agent/chat`
- `GET /api/agent/dashboard`
- `GET /api/agent/holdings`
- `POST /api/agent/holdings`
- `GET /api/agent/alerts`
- `GET /api/agent/alerts/daily`
- `POST /api/agent/alerts/daily`
- `GET /api/agent/tax`

`GET /api/agent/tax` returns deterministic tax optimization outputs from your latest onboarding/profile data, including:

- Remaining Section 80C room
- Old-vs-new regime hinting with approximate tax estimates
- A "Do this month" tax checklist

### Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENROUTER_API_KEY`
- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_MODEL` (optional, defaults to `meta/llama-3.1-8b-instruct`)

### MVP AI Insight Route

Dashboard chat now supports a lightweight OpenRouter-backed insight endpoint:

- `POST /api/ai/insight`

Request body:

```json
{
	"question": "How should I plan my monthly investing?",
	"userProfile": {
		"age": 31,
		"goals": ["Retirement in 25 years"],
		"risk": "moderate",
		"preferences": ["tax_regime:new", "contact:allowed"]
	}
}
```

The route returns structured output:

- `recommendation`
- `reason`
- `risk_warning`
- `next_action`

When model output is malformed or blocked by guardrails, it returns a safe fallback response.

Optional for cron-style multi-user daily automation:

- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose client-side) required for privileged automation routes (for example daily alerts and reminder runners). Public Discovery Call booking routes use dedicated RPC wrappers and do not require this key.
- `ALERTS_CRON_SECRET` (shared secret expected by `x-pravix-cron-secret` header)
- `CRON_SECRET` (optional Vercel Cron bearer secret; route accepts either `ALERTS_CRON_SECRET` or `CRON_SECRET`)

Optional for real alert delivery providers:

- Email (Resend):
	- `RESEND_API_KEY`
	- `ALERTS_EMAIL_FROM`
- WhatsApp/SMS (Twilio):
	- `TWILIO_ACCOUNT_SID`
	- `TWILIO_AUTH_TOKEN`
	- `TWILIO_WHATSAPP_FROM` (example: `whatsapp:+14155238886`)
	- `TWILIO_SMS_FROM` (example: `+15551234567`)
- Push (OneSignal):
	- `ONESIGNAL_APP_ID`
	- `ONESIGNAL_API_KEY`

Resend SDK example:

```ts
import { Resend } from "resend";

const resend = new Resend("re_xxxxxxxxx");

await resend.emails.send({
	from: "onboarding@resend.dev",
	to: "usefullother6@gmail.com",
	subject: "Hello World",
	html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
});
```

Replace `re_xxxxxxxxx` with your real API key.

### Authentication

All agent routes require a Supabase user access token in the `Authorization` header:

`Authorization: Bearer <supabase_access_token>`

For daily automation route:

- `POST /api/agent/alerts/daily` with a bearer token runs daily alert routing for the current user.
- `GET` or `POST /api/agent/alerts/daily` with `x-pravix-cron-secret: <ALERTS_CRON_SECRET>` runs automation for all candidate users (requires service role key).
- `GET` or `POST /api/agent/alerts/daily` with `Authorization: Bearer <CRON_SECRET>` is also accepted for scheduler integrations like Vercel Cron.

### Daily Schedule

The repository includes [vercel.json](vercel.json) with a daily cron schedule for `/api/agent/alerts/daily` at `0 3 * * *` (03:00 UTC).
Keep `CRON_SECRET` and/or `ALERTS_CRON_SECRET` configured in deployment environment variables so scheduled runs authenticate successfully.

Smart alert delivery logs are persisted in `public.alert_delivery_logs` (migration `202604110005_add_alert_delivery_logs.sql`).
The dispatcher deduplicates sends per `user_id + alert_type + channel + alert_date` for rows with `queued/sent` status.

Subscription gating for distribution is managed in `public.user_subscriptions` (migration `202604110007_add_user_subscriptions_and_whatsapp_gating.sql`):

- `free` plan keeps email/push/sms routes available but locks WhatsApp delivery by default.
- `starter` and `pro` plans unlock WhatsApp routing for alert distribution.
- Smart alerts responses now include a `subscription` snapshot so the dashboard can show plan status and upgrade prompts.

### Example: Chat

```json
POST /api/agent/chat
{
	"message": "Where should I invest 15000 INR per month?",
	"history": [
		{ "role": "user", "content": "I am risk moderate" },
		{ "role": "assistant", "content": "Noted. What is your horizon?" }
	]
}
```

Successful response:

```json
{
	"ok": true,
	"reply": "...",
	"disclaimer": "Educational guidance only. This is not guaranteed return advice. Validate suitability before investing."
}
```

### Lower Memory Development Modes

If your machine gets close to RAM limits while running `next dev`, use one of these:

- `npm run dev:lowmem`
	- Runs Next.js with a 1 GB V8 old-space cap and webpack mode to reduce memory pressure.
- `npm run dev:webpack`
	- Runs development mode with webpack instead of Turbopack.
- `npm run dev:turbo`
	- Explicit Turbopack mode (fastest, usually highest RAM usage on larger apps).

PowerShell one-off equivalent:

`$env:NODE_OPTIONS='--max-old-space-size=1024'; npm run dev`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
