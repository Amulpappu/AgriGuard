const { createClient } = require("@supabase/supabase-js");

const url = "https://todwosflbwzuizvedouy.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHdvc2ZsYnd6dWl6dmVkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjYxNjUsImV4cCI6MjEwNjcwMjE2NX0.fDqNi4bHJo9DCByVmZyX_GbKtyvJzQdD_bttu057UKY";
const supabase = createClient(url, anonKey);

const ADMIN_EMAIL = "lohithgamer12@gmail.com";
const DEMO_USER_ID = "11264654-2ade-4424-8cb7-6ca9dc397c77";
const SCAN_LIST_SELECT = "*, crop:crops(id, slug, name_key, icon_emoji), disease:diseases(id, slug, name_key)";

function mapScanRow(s) {
  const crop = s.crop || {
    id: s.crop_id || "crop-default",
    slug: s.crop_slug || "crop",
    name_key: `crop.${s.crop_slug || "tomato"}`,
  };
  return {
    id: s.id,
    crop: {
      id: crop.id,
      slug: crop.slug,
      name_key: crop.name_key,
      icon_emoji: crop.icon_emoji,
    },
    status: s.status || (s.is_healthy ? "healthy" : (s.low_confidence ? "uncertain" : "potentially_diseased")),
    disease: s.disease ? {
      id: s.disease.id,
      slug: s.disease.slug,
      name_key: s.disease.name_key,
    } : undefined,
    confidence: s.confidence || 0.85,
    severity: {
      level: s.severity || s.severity_level || (s.is_healthy ? "none" : "moderate"),
      affected_pct: s.severity_pct ?? s.affected_pct ?? (s.is_healthy ? 0 : 25),
      is_estimate: true,
    },
    created_at: s.created_at || new Date().toISOString(),
    image_url: s.image_url || "/agriguard_logo_4k.png",
    thumb_url: s.thumb_url,
  };
}

async function testAdminDashboard() {
  console.log("Simulating Admin getDashboardSummary...");
  const isAdmin = true;
  const userId = "dd23f951-ec3d-4bf3-a511-b30ef11d2c7d";

  const countWhere = (col, val) => {
    let q = supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .neq("user_id", DEMO_USER_ID)
      .not("image_url", "ilike", "%/demo%")
      .eq(col, val);
    if (!isAdmin && userId) q = q.eq("user_id", userId);
    return q;
  };

  let totalQuery = supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .neq("user_id", DEMO_USER_ID)
    .not("image_url", "ilike", "%/demo%");
  if (!isAdmin && userId) totalQuery = totalQuery.eq("user_id", userId);

  let recentQuery = supabase
    .from("scans")
    .select(SCAN_LIST_SELECT)
    .neq("user_id", DEMO_USER_ID)
    .not("image_url", "ilike", "%/demo%")
    .order("created_at", { ascending: false })
    .limit(30);
  if (!isAdmin && userId) recentQuery = recentQuery.eq("user_id", userId);

  try {
    const [totalRes, healthyRes, uncertainRes, recentRes] = await Promise.all([
      totalQuery,
      countWhere("is_healthy", true),
      countWhere("status", "uncertain"),
      recentQuery,
    ]);

    console.log("totalRes error:", totalRes.error);
    console.log("healthyRes error:", healthyRes.error);
    console.log("uncertainRes error:", uncertainRes.error);
    console.log("recentRes error:", recentRes.error);

    if (totalRes.error) throw new Error(totalRes.error.message || "Failed to count total scans.");
    if (healthyRes.error) throw new Error(healthyRes.error.message || "Failed to count healthy scans.");
    if (uncertainRes.error) throw new Error(uncertainRes.error.message || "Failed to count uncertain scans.");
    if (recentRes.error) throw new Error(recentRes.error.message || "Failed to load recent scans.");

    const rows = (recentRes.data || []).map(mapScanRow);
    const total = totalRes.count ?? rows.length;
    const healthy = healthyRes.count ?? rows.filter((r) => r.status === "healthy").length;
    const uncertain = uncertainRes.count ?? rows.filter((r) => r.status === "uncertain").length;

    const res = {
      total_scans: total,
      healthy_count: healthy,
      affected_count: Math.max(0, total - healthy - uncertain),
      uncertain_count: uncertain,
      recent_scans: rows.slice(0, 5),
      chart_data: rows
        .filter((r) => r.status !== "uncertain")
        .slice()
        .reverse()
        .map((r) => ({
          date: r.created_at.slice(5, 10),
          crop_slug: r.crop.slug,
          affected_pct: r.severity.affected_pct ?? 0,
          status: r.status === "healthy" ? "healthy" : "affected",
        })),
    };

    console.log("SUCCESS! Summary computed:", res);
  } catch (err) {
    console.error("DASHBOARD FAILED:", err);
  }
}

testAdminDashboard();
