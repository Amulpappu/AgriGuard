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

    if (!email) {
      return NextResponse.json({ detail: "Email is required" }, { status: 400 });
    }

    const { data: listData } = await admin.auth.admin.listUsers();
    const existing = (listData?.users || []).find((u) => u.email?.toLowerCase() === email);

    if (existing) {
      const updatePayload: any = { email_confirm: true };
      if (password) updatePayload.password = password;
      await admin.auth.admin.updateUserById(existing.id, updatePayload);
      return NextResponse.json({ success: true, user_id: existing.id });
    }

    // If user doesn't exist in auth.users, check if they exist in public.users
    const { data: dbUser } = await admin.from("users").select("*").ilike("email", email).maybeSingle();
    if (dbUser && password) {
      const { data: created, error } = await admin.auth.admin.createUser({
        id: dbUser.id,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: dbUser.full_name },
        app_metadata: { role: email === "lohithgamer12@gmail.com" ? "admin" : "user" },
      });
      if (!error && created) {
        return NextResponse.json({ success: true, user_id: created.user.id });
      }
    }

    return NextResponse.json({ detail: "User not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Confirmation failed" }, { status: 500 });
  }
}
