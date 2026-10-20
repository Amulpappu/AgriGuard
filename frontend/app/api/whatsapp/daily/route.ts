import { NextRequest, NextResponse } from "next/server";
import { buildDailyMessage, normalisePhone } from "@/lib/whatsappMessage";
import { deliver, latestReading, whatsappConfigured } from "@/lib/twilioWhatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!whatsappConfigured()) return NextResponse.json({ detail: "WhatsApp not configured" }, { status: 503 });

  const numbers = (process.env.WHATSAPP_DAILY_TO || "")
    .split(",")
    .map((n) => normalisePhone(n))
    .filter((n): n is string => Boolean(n));
  if (!numbers.length) return NextResponse.json({ detail: "No WHATSAPP_DAILY_TO numbers" }, { status: 503 });

  const reading = await latestReading();
  if (!reading) return NextResponse.json({ detail: "No sensor reading yet" }, { status: 404 });

  const text = buildDailyMessage(reading, process.env.WHATSAPP_DAILY_LANG === "ta" ? "ta" : "en");
  const results = await Promise.all(numbers.map((n) => deliver(n, text)));
  return NextResponse.json({ sent: results.filter((r) => r.ok).length, total: numbers.length });
}
