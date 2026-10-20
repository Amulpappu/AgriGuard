import { NextRequest, NextResponse } from "next/server";
import { buildDailyMessage, normalisePhone } from "@/lib/whatsappMessage";
import { deliver, latestReading, whatsappConfigured } from "@/lib/twilioWhatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The caller only supplies a phone number. The text is always built here from the
// latest stored reading, so this endpoint cannot be used to send arbitrary messages.
const lastSent = new Map<string, number>();

export async function POST(req: NextRequest) {
  if (!whatsappConfigured()) {
    return NextResponse.json({ detail: "WhatsApp sending is not set up yet" }, { status: 503 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
  const to = normalisePhone(String(body?.to || ""));
  if (!to) return NextResponse.json({ detail: "Enter a valid WhatsApp number" }, { status: 422 });

  const now = Date.now();
  if (now - (lastSent.get(to) || 0) < 30_000) {
    return NextResponse.json({ detail: "Please wait 30 seconds before sending again" }, { status: 429 });
  }

  const reading = await latestReading();
  if (!reading) return NextResponse.json({ detail: "No sensor reading yet" }, { status: 404 });

  const r = await deliver(to, buildDailyMessage(reading, body?.lang === "ta" ? "ta" : "en"));
  if (!r.ok) {
    return NextResponse.json(
      { detail: r.message || "WhatsApp send failed", hint: "Join the Twilio sandbox from this number first" },
      { status: 502 },
    );
  }
  lastSent.set(to, now);
  return NextResponse.json({ ok: true });
}
