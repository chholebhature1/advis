import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string): string | null {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedEmail = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");

    // Preferred path: admin signup without Supabase email sender (for custom Resend verification flows)
    if (serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data, error } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("already") || errorMessage.includes("exists") || errorMessage.includes("registered")) {
          return NextResponse.json(
            {
              success: true,
              alreadyExists: true,
              verificationMode: "custom-otp",
              message: "Account already exists. Continue with verification.",
            },
            { status: 200 }
          );
        }

        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        {
          success: true,
          verificationMode: "custom-otp",
          userId: data.user?.id ?? null,
        },
        { status: 200 }
      );
    }

    // Fallback path: no service role key available, use standard Supabase signup.
    const clientKey = optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!clientKey) {
      return NextResponse.json(
        {
          error:
            "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Also missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, clientKey);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("already") || errorMessage.includes("exists") || errorMessage.includes("registered")) {
        return NextResponse.json(
          {
            success: true,
            alreadyExists: true,
            verificationMode: "supabase-email",
            message: "Account already exists. Please sign in or verify with Supabase email.",
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        verificationMode: "supabase-email",
        userId: data.user?.id ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Register error:", error);
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
