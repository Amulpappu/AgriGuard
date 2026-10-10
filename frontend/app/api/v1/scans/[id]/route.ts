import { NextRequest, NextResponse } from "next/server";
import { supabaseForToken } from "@/lib/supabase";

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() || null : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ detail: "Missing scan ID" }, { status: 400 });
    }

    // Act as the caller so RLS limits reads to their own scans.
    const supabase = supabaseForToken(bearer(req));
    const { data: s, error } = await supabase
      .from("scans")
      .select("*, crop:crops(*), disease:diseases(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase get scan error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    if (!s) {
      return NextResponse.json({ detail: "Scan not found" }, { status: 404 });
    }

    const crop = s.crop || {
      id: s.crop_id || "crop-default",
      slug: "crop",
      name_key: "crop.cucumber",
      icon_emoji: "🥒",
    };

    return NextResponse.json({
      id: s.id,
      crop: {
        id: crop.id,
        slug: crop.slug,
        name_key: crop.name_key,
        icon_emoji: crop.icon_emoji,
      },
      status: s.status || (s.is_healthy ? "healthy" : "potentially_diseased"),
      disease: s.disease
        ? {
            id: s.disease.id,
            slug: s.disease.slug,
            name_key: s.disease.name_key,
            crop_id: s.disease.crop_id,
          }
        : undefined,
      confidence: s.confidence || 0.85,
      low_confidence: Boolean(s.low_confidence),
      top3: s.top3 || [],
      severity: {
        level: s.severity || "none",
        affected_pct: s.severity_pct != null ? s.severity_pct : (s.is_healthy ? 0 : 25),
        is_estimate: true,
      },
      model_version: s.model_version || "MultiCrop-v2.0",
      image_url: s.image_url || "/agriguard_logo_4k.png",
      thumb_url: s.thumb_url,
      created_at: s.created_at || new Date().toISOString(),
      crop_auto_detected: Boolean(s.crop_auto_detected),
      condition_type: s.condition_type,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to fetch scan" }, { status: 500 });
  }
}
