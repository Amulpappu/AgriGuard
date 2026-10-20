export type ReadingLike = { soil_moisture: number; temp_c: number; humidity: number; recorded_at?: string | null };
export type MsgLang = "en" | "ta";

/** One plain-text daily reading for WhatsApp. Shared by the server route and the share button. */
export function buildDailyMessage(r: ReadingLike, lang: MsgLang = "en"): string {
  const soil = Math.round(r.soil_moisture);
  const temp = Math.round(r.temp_c * 10) / 10;
  const hum = Math.round(r.humidity);

  const fungalRisk = r.humidity >= 85 && r.temp_c >= 20 && r.temp_c <= 30;
  const advice =
    lang === "ta"
      ? r.soil_moisture < 30
        ? "மண் வறண்டுள்ளது - இன்று நீர் பாய்ச்சவும்."
        : r.soil_moisture > 80
        ? "மண் அதிக ஈரம் - நீர் பாய்ச்சுவதை நிறுத்தவும்."
        : "மண் ஈரம் சரியாக உள்ளது."
      : r.soil_moisture < 30
      ? "Soil is dry - water the field today."
      : r.soil_moisture > 80
      ? "Soil is very wet - hold irrigation."
      : "Soil moisture is fine.";
  const risk =
    lang === "ta"
      ? fungalRisk
        ? "பூஞ்சை நோய் அபாயம் அதிகம் - இலைகளை சோதிக்கவும்."
        : "நோய் அபாயம் குறைவு."
      : fungalRisk
      ? "High fungal disease risk - check leaves today."
      : "Disease risk is low.";

  const head = lang === "ta" ? "AgriGuard தினசரி வயல் அறிக்கை" : "AgriGuard daily field reading";
  const labels =
    lang === "ta"
      ? { s: "மண் ஈரம்", t: "வெப்பநிலை", h: "ஈரப்பதம்" }
      : { s: "Soil moisture", t: "Temperature", h: "Humidity" };

  // Flag a reading older than 30 minutes so an offline sensor is never passed off as live.
  let stale = "";
  const ts = r.recorded_at ? new Date(r.recorded_at).getTime() : NaN;
  if (Number.isFinite(ts) && Date.now() - ts > 30 * 60 * 1000) {
    const hrs = Math.max(1, Math.round((Date.now() - ts) / 3_600_000));
    stale =
      lang === "ta"
        ? `எச்சரிக்கை: கடைசி சென்சார் தரவு ${hrs} மணி நேரத்திற்கு முன்னது. சென்சார் offline ஆக இருக்கலாம்.`
        : `Note: last sensor reading was about ${hrs} h ago. The sensor may be offline.`;
  }

  return [
    `*${head}*`,
    ...(stale ? [stale] : []),
    `${labels.s}: ${soil}%`,
    `${labels.t}: ${temp} C`,
    `${labels.h}: ${hum}%`,
    advice,
    risk,
  ].join("\n");
}

/** Accepts 10-digit Indian numbers or full international numbers. Returns +<digits> or null. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}
