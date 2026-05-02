import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isOtpExpired, normalizeEmail, OTP_VERIFY_LIMIT, verifyOtpHash } from "@/lib/auth/otp";

type OtpRow = {
  id: number;
  hashed_otp: string;
  expires_at: string;
  attempts: number;
};

async function createSupabaseSession() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clientKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !clientKey) {
    throw new Error("Missing Supabase client environment variables.");
  }

  const authClient = createClient(supabaseUrl, clientKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return authClient;
}

async function getOrCreateUserAndSession(admin: SupabaseClient, email: string) {
  const randomPassword = crypto.randomBytes(16).toString("hex");

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (usersError) {
    throw usersError;
  }

  const existingUser = usersData.users.find((user) => user.email?.toLowerCase() === email) ?? null;

  if (existingUser) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: randomPassword,
      email_confirm: true,
    });

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
    });

    if (createError) {
      throw createError;
    }
  }

  const client = await createSupabaseSession();
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password: randomPassword,
  });

  if (signInError || !signInData.session) {
    throw signInError ?? new Error("Unable to create authenticated session.");
  }

  const session = signInData.session as Session;
  return session;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail((body.email ?? "").toString());
    const token = (body.token ?? "").toString().trim();

    if (!email || !email.includes("@") || token.length !== 6) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: rows, error: selErr } = await admin
      .from("auth_otps")
      .select("id,hashed_otp,expires_at,attempts")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) {
      console.error(selErr);
      return NextResponse.json({ error: "Unable to verify" }, { status: 500 });
    }

    const row = Array.isArray(rows) && rows.length > 0 ? (rows[0] as OtpRow) : null;
    if (!row) {
      return NextResponse.json({ error: "No OTP found for this email" }, { status: 400 });
    }

    if (row.attempts >= OTP_VERIFY_LIMIT) {
      return NextResponse.json({ error: "Too many verification attempts" }, { status: 429 });
    }

    if (isOtpExpired(row.expires_at)) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const matched = await verifyOtpHash(token, row.hashed_otp);

    if (!matched) {
      await admin
        .from("auth_otps")
        .update({ attempts: (row.attempts || 0) + 1 })
        .eq("id", row.id);
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await admin.from("auth_otps").delete().eq("id", row.id);

    const session = await getOrCreateUserAndSession(admin, email);

    return NextResponse.json(
      {
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          token_type: session.token_type,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
