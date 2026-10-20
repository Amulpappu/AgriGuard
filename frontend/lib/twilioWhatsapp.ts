import { createClient } from "@supabase/supabase-js";

export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export async function sendWhatsApp(toE164: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Twilio sandbox number
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${toE164}`, Body: body }),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, message: json?.message as string | undefined };
}

/** Latest stored reading, read with the server-side service key. */
export async function latestReading() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://todwosflbwzuizvedouy.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await admin
    .from("sensor_readings")
    .select("soil_moisture,temp_c,humidity,recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
