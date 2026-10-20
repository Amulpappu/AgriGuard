import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";

// ESP32 -> cloud. The board POSTs JSON over HTTPS with an X-Device-Key header.
// The key is checked against devices.key_hash (sha256) and the reading is stored
// in sensor_readings, which the My Field page already reads.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://todwosflbwzuizvedouy.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ detail: "IoT service unavailable" }, { status: 503 });

  const deviceKey = req.headers.get("x-device-key") || "";
  if (!deviceKey) return NextResponse.json({ detail: "Missing device key" }, { status: 401 });
  const keyHash = createHash("sha256").update(deviceKey).digest("hex");

  const { data: device } = await admin
    .from("devices")
    .select("id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();
  if (!device) return NextResponse.json({ detail: "Invalid device key" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const soil = num(body.soil_moisture, 0, 100);
  const temp = num(body.temp_c, -40, 80);
  const hum = num(body.humidity, 0, 100);
  if (soil === null || temp === null || hum === null) {
    return NextResponse.json({ detail: "Reading out of range" }, { status: 422 });
  }

  const { error } = await admin.from("sensor_readings").insert({
    id: randomUUID(),
    device_id: device.id,
    soil_moisture: soil,
    temp_c: temp,
    humidity: hum,
  });
  if (error) return NextResponse.json({ detail: "Could not save reading" }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
