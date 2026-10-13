import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/v1/scans is intentionally not handled here.
// Scans run either on the Python backend (via the rewrite in next.config.js) or in the
// browser with the AgriGuard leaf model (lib/leafModel.ts). The old handler returned a
// fixed "diseased 94%" result for every photo and has been removed.
export async function POST() {
  return NextResponse.json({ detail: "Scan is processed by the backend or in the browser." }, { status: 404 });
}

export async function GET() {
  try {
    const { data: scans } = await supabase
      .from("scans")
      .select("*, crop:crops(*), disease:diseases(*)")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json(scans || []);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to fetch scans" }, { status: 500 });
  }
}
