import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://todwosflbwzuizvedouy.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ detail: "Auth service unavailable" }, { status: 503 });
    }

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = body.full_name || email.split("@")[0];

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }

    // 1. Check if user already exists in auth.users
    const { data: listData } = await admin.auth.admin.listUsers();
    const existingAuthUser = (listData?.users || []).find((u) => u.email?.toLowerCase() === email);

    let authUserId = existingAuthUser?.id;

    if (existingAuthUser) {
      // Auto-confirm and update password if needed
      await admin.auth.admin.updateUserById(existingAuthUser.id, {
        email_confirm: true,
        password: password,
        user_metadata: { full_name: fullName },
      });
    } else {
      // Create user with email_confirm: true (bypasses rate limit and confirmation lockouts)
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { role: email === "lohithgamer12@gmail.com" ? "admin" : "user" },
      });

      if (createErr) {
        return NextResponse.json({ detail: createErr.message }, { status: 400 });
      }
      authUserId = newUser.user.id;
    }

    // 2. Ensure public.users table is kept in sync
    if (authUserId) {
      await admin.from("users").upsert({
        id: authUserId,
        email,
        full_name: fullName,
        is_active: true,
      });
    }

    return NextResponse.json({
      success: true,
      user_id: authUserId,
      email,
      full_name: fullName,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Registration failed" }, { status: 500 });
  }
}
