"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboardSummary, getSensorLatest, DashboardSummary, SensorLatestOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Camera, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, ChevronRight,
  GitCompareArrows, Droplets, Thermometer, Wind, Wifi, ArrowUpRight, LogOut, User as UserIcon
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CROP_COLORS: Record<string, string> = {
  tomato: "#f97316",
  potato: "#a78bfa",
  pepper: "#34d399",
};

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: any; color: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 flex items-center gap-4 border-l-4 ${color} transition-all hover:bg-white/[0.04]`}>
      <div className="p-3 rounded-xl bg-white/5 flex-shrink-0">
        <Icon size={22} className="text-gray-200" />
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { fullName, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("dashboard_summary_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [sensor, setSensor] = useState<SensorLatestOut | null>(null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getDashboardSummary().then((d) => {
        setData(d);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("dashboard_summary_cache", JSON.stringify(d));
          } catch {}
        }
      }),
      getSensorLatest().then(setSensor).catch(() => {}),
    ])
      .catch(() => {
        if (!data) setError("Failed to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Build chart data grouped by date+crop
  const chartData: any[] = [];
  if (data) {
    const byDate: Record<string, any> = {};
    for (const row of data.chart_data) {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date };
      if (byDate[row.date][row.crop_slug] == null) {
        byDate[row.date][row.crop_slug] = row.affected_pct;
      } else {
        byDate[row.date][row.crop_slug] = (byDate[row.date][row.crop_slug] + row.affected_pct) / 2;
      }
    }
    chartData.push(...Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("dashboard.title")}</h1>
            {fullName && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                🌱 {fullName}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">{t("app.tagline")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/compare"
            className="hidden sm:flex items-center gap-1.5 glass text-xs font-semibold px-4 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <GitCompareArrows size={15} />
            {t("nav.compare")}
          </Link>
          <Link
            href="/scan"
            id="quick-scan-btn"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Camera size={16} />
            {t("nav.scan")}
          </Link>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="flex items-center gap-1.5 glass text-xs font-semibold px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
            title="Log out to switch account"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">{t("nav.logout")}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-sm text-red-300">{error}</div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t("dashboard.total_scans")} value={data?.total_scans ?? 0} icon={TrendingUp} color="border-blue-500" />
        <StatCard label={t("dashboard.healthy")} value={data?.healthy_count ?? 0} icon={CheckCircle2} color="border-green-500" />
        <StatCard label={t("dashboard.affected")} value={data?.affected_count ?? 0} icon={AlertTriangle} color="border-orange-500" />
        <StatCard label={t("dashboard.uncertain")} value={data?.uncertain_count ?? 0} icon={HelpCircle} color="border-gray-600" />
      </div>

      {/* Main Grid: Left (Analytics & Scans) + Right (IoT & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progression Chart */}
          {chartData.length > 0 && (
            <div className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-200">{t("dashboard.chart_title")}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Average leaf lesion damage percentage by crop</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                  Live Trend
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {["tomato", "potato", "pepper"].map((crop) => (
                    <Line
                      key={crop}
                      type="monotone"
                      dataKey={crop}
                      name={t(`crop.${crop}`)}
                      stroke={CROP_COLORS[crop]}
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Scans */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-200">{t("dashboard.recent_scans")}</h2>
              <Link href="/history" className="text-xs font-semibold text-green-400 hover:text-green-300 flex items-center gap-1">
                {t("common.view_details")} <ChevronRight size={14} />
              </Link>
            </div>
            {!data?.recent_scans?.length ? (
              <p className="text-center text-gray-500 text-sm py-12">{t("dashboard.no_scans")}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {data.recent_scans.map((scan) => (
                  <li key={scan.id}>
                    <Link
                      href={`/scan/${scan.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border border-white/10">
                        {scan.thumb_url ? (
                          <img
                            src={`${API_BASE}${scan.thumb_url}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {scan.crop.icon_emoji}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-200">
                            {scan.crop.icon_emoji} {t(scan.crop.name_key)}
                          </span>
                          {scan.disease && scan.status !== "uncertain" && (
                            <span className="text-xs text-gray-400 hidden sm:inline">
                              • {t(scan.disease.name_key)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(scan.created_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        scan.status === "healthy" ? "badge-healthy"
                        : scan.status === "potentially_diseased" ? "badge-diseased"
                        : "badge-uncertain"
                      }`}>
                        {t(`scan.status_${scan.status === "potentially_diseased" ? "diseased" : scan.status}`)}
                      </span>
                      <ChevronRight size={16} className="text-gray-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column (1 col wide on desktop): IoT Sensor Tile + Fast Actions */}
        <div className="space-y-6">
          {/* Real-time Field Conditions Tile */}
          <div className="glass rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Field Microclimate</h3>
              </div>
              <Link href="/field" className="text-xs text-emerald-400 hover:underline flex items-center gap-0.5">
                Live Sensor <ArrowUpRight size={12} />
              </Link>
            </div>

            {sensor?.latest ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl p-2.5 text-center">
                    <Droplets size={16} className="text-blue-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-white">{sensor.latest.soil_moisture ?? "--"}%</p>
                    <p className="text-[10px] text-gray-400">Soil Moisture</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2.5 text-center">
                    <Thermometer size={16} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-white">{sensor.latest.temp_c ?? "--"}°C</p>
                    <p className="text-[10px] text-gray-400">Temperature</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2.5 text-center">
                    <Wind size={16} className="text-cyan-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-white">{sensor.latest.humidity ?? "--"}%</p>
                    <p className="text-[10px] text-gray-400">Humidity</p>
                  </div>
                </div>

                {sensor.context_hint && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 leading-relaxed">
                    💡 <strong>Environmental Context:</strong> {sensor.context_hint}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Agricultural Microclimate Station</p>
                <p className="text-[10px] text-emerald-400 mt-1">Connect ESP32 field node or view Bio-Shield 360° radar.</p>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">Quick Navigation</h3>
            <Link
              href="/scan"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  <Camera size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">New Disease Scan</p>
                  <p className="text-[10px] text-gray-400">Upload leaf photo for AI analysis</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </Link>

            <Link
              href="/compare"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <GitCompareArrows size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Compare Progression</p>
                  <p className="text-[10px] text-gray-400">Track treatment change over time</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
