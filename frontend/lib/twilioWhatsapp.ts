import { createClient } from "@supabase/supabase-js";

export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export async function sendWhatsApp(toE164: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Twilio sandbox number
  // Newer Twilio accounts require a Content Template (ContentSid). Template variables
  // cannot hold line breaks, so the reading is joined on one line in that mode.
  const contentSid = process.env.TWILIO_CONTENT_SID;
  const params = new URLSearchParams({ From: from, To: `whatsapp:${toE164}` });
  if (contentSid) {
    params.set("ContentSid", contentSid);
    params.set("ContentVariables", JSON.stringify({ "1": body.replace(/\s*\n+\s*/g, " | ") }));
  } else {
    params.set("Body", body);
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
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

/** Free CallMeBot route: only reaches the number that activated the key. */
export function callmebotConfigured() {
  return Boolean(process.env.CALLMEBOT_APIKEY && process.env.CALLMEBOT_PHONE);
}

export async function sendCallMeBot(body: string) {
  const url =
    "https://api.callmebot.com/whatsapp.php?" +
    new URLSearchParams({
      phone: process.env.CALLMEBOT_PHONE as string,
      text: body,
      apikey: process.env.CALLMEBOT_APIKEY as string,
    }).toString();
  const res = await fetch(url);
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, message: res.ok ? undefined : text.slice(0, 200) };
}

export function whatsappConfigured() {
  return callmebotConfigured() || twilioConfigured();
}

/** CallMeBot first (free, no template), Twilio as the fallback. */
export async function deliver(toE164: string, body: string) {
  return callmebotConfigured() ? sendCallMeBot(body) : sendWhatsApp(toE164, body);
}
