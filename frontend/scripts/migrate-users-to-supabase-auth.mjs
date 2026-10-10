#!/usr/bin/env node
/**
 * One-off migration: legacy public.users rows -> Supabase Auth users.
 *
 *   node scripts/migrate-users-to-supabase-auth.mjs            # dry run (default)
 *   node scripts/migrate-users-to-supabase-auth.mjs --apply    # create auth users
 *   node scripts/migrate-users-to-supabase-auth.mjs --verify   # check RLS as anon
 *
 * Each auth user keeps the legacy row's id, so scans.user_id still points at
 * its owner. bcrypt hashes are imported as-is (users keep their password).
 * Rows stored as "sha256$<plaintext>" are created WITHOUT a password and must
 * use "forgot password"; the plaintext is never sent anywhere.
 * The admin account gets app_metadata.role = "admin".
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY from the environment or frontend/.env.local.
 * Never prints keys or password material.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "lohithgamer12@gmail.com";

function loadEnv() {
  const env = { ...process.env };
  const file = new URL("../.env.local", import.meta.url);
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  }
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[k]) throw new Error(`${k} is not set`);
  }
  return env;
}

async function listAllAuthEmails(admin) {
  const emails = new Set();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => emails.add((u.email || "").toLowerCase()));
    if (data.users.length < 1000) return emails;
  }
}

async function migrate(env, apply) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await admin.from("users").select("id, email, hashed_password, full_name, is_active");
  if (error) throw error;
  const existing = await listAllAuthEmails(admin);

  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${rows.length} legacy rows, ${existing.size} existing auth users\n`);
  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    const hash = row.hashed_password || "";
    const isBcrypt = /^\$2[aby]\$/.test(hash);
    const isAdmin = email === ADMIN_EMAIL;
    const plan = isBcrypt ? "import bcrypt hash" : hash.startsWith("sha256$") ? "NO password (plaintext legacy) -> needs reset" : "NO password -> needs reset";
    const tag = `${email} [${row.id}]${isAdmin ? " (admin)" : ""}${row.is_active === false ? " (inactive)" : ""}`;

    if (existing.has(email)) {
      console.log(`skip    ${tag}: auth user already exists`);
      continue;
    }
    console.log(`${apply ? "create " : "would  "} ${tag}: ${plan}`);
    if (!apply) continue;

    const { error: createErr } = await admin.auth.admin.createUser({
      id: row.id,
      email,
      email_confirm: true,
      ...(isBcrypt ? { password_hash: hash } : {}),
      user_metadata: { full_name: row.full_name || email.split("@")[0] },
      app_metadata: isAdmin ? { role: "admin" } : {},
      ...(row.is_active === false ? { ban_duration: "876000h" } : {}),
    });
    if (createErr) console.log(`  ! failed: ${createErr.message}`);
  }
  if (!apply) console.log("\nNothing was changed. Re-run with --apply to create these auth users.");
}

async function verify(env) {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  let ok = true;
  for (const table of ["users", "scans", "devices", "sensor_readings"]) {
    const { data, error } = await anon.from(table).select("*").limit(5);
    const leaked = !error && data.length > 0;
    ok &&= !leaked;
    console.log(`${leaked ? "LEAK " : "ok   "} anon select ${table}: ${error ? error.message : `${data.length} rows`}`);
  }
  const { data: crops } = await anon.from("crops").select("id").limit(1);
  console.log(`${crops?.length ? "ok   " : "WARN "} anon select crops (public catalog): ${crops?.length ?? 0} rows`);
  process.exitCode = ok ? 0 : 1;
}

const env = loadEnv();
const args = new Set(process.argv.slice(2));
if (args.has("--verify")) await verify(env);
else await migrate(env, args.has("--apply"));
