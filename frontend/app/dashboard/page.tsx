"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboardSummary, getSensorLatest, resolveImageUrl, DashboardSummary, SensorLatestOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useCachedQuery } from "@/lib/useCachedQuery";
import {
  Camera, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, ChevronRight,
  GitCompareArrows, Droplets, Thermometer, Wind, Wifi, ArrowUpRight, LogOut, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CROP_COLORS: Record<string, string> = {
  tomato: "#C7852A",
  potato: "#8A5300",
  pepper: "#9CC58F",
  cucumber: "#2E7D32",
  rice: "#E9A23B",
  cotton: "#4F5E51",
};
const FALLBACK_COLORS = ["#1D4F20", "#F0BE6E", "#6B7A6C", "#5FA357", "#3A483C"];

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: any; color: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 flex items-center gap-4 border-l-4 ${color} transition-all hover:bg-white/[0.04]`}>
      <div className="p-3 rounded-xl bg-surface flex-shrink-0">
        <Icon size={22} className="text-ink" />
      </div>
      <div>
        <p className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { fullName, userId, logout } = useAuth();
  const router = useRouter();

  // Cache keys scoped by userId prevent cross-user data leaks
  const summaryKey = userId ? `${userId}:dashboard:summary` : "default:dashboard:summary";
  const sensorKey = userId ? `${userId}:sensor:latest` : "sensor:latest";

  const summary = useCachedQuery<DashboardSummary>(summaryKey, getDashboardSummary, { refreshInterval: 60_000 });
  const sensorQ = useCachedQuery<SensorLatestOut>(sensorKey, getSensorLatest, { refreshInterval: 30_000 });
  const data = summary.data;
  const sensor = sensorQ.data;
  const loading = summary.isLoading;
  const error = summary.error
    ? data
      ? "Showing your last synced data — live refresh is temporarily unavailable."
      : "Could not reach the database. Check your connection and retry."
    : "";

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
  const chartCrops = Array.from(new Set((data?.chart_data ?? []).map((r) => r.crop_slug))).slice(0, 6);

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
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink tracking-tight leading-[1.05]">{t("dashboard.title")}</h1>
            {fullName && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-leaf text-primary-strong border border-primary/40 font-medium">
                🌱 {fullName}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">{t("app.tagline")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/compare"
            className="hidden sm:flex items-center gap-1.5 glass text-xs font-semibold px-4 py-2.5 rounded-xl text-ink hover:text-ink hover:bg-ink/5 transition-all"
          >
            <GitCompareArrows size={15} />
            {t("nav.compare")}
          </Link>
          <Link
            href="/scan"
            id="quick-scan-btn"
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-strong text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Camera size={16} />
            {t("nav.scan")}
          </Link>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="flex items-center gap-1.5 glass text-xs font-semibold px-3 py-2.5 rounded-xl text-danger hover:text-danger hover:bg-danger-soft border border-danger/40 transition-all"
            title="Log out to switch account"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">{t("nav.logout")}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl p-3 text-sm flex items-center justify-between gap-3 border ${
          data ? "bg-accent-soft border-accent/60 text-accent-ink" : "bg-danger-soft border-danger/40 text-danger"
        }`}>
          <span>{error}</span>
          <button
            onClick={() => summary.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface hover:bg-ink/5 transition"
          >
            <RefreshCw size={13} className={summary.isValidating ? "animate-spin" : ""} /> Retry
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t("dashboard.total_scans")} value={data?.total_scans ?? 0} icon={TrendingUp} color="border-primary" />
        <StatCard label={t("dashboard.healthy")} value={data?.healthy_count ?? 0} icon={CheckCircle2} color="border-primary" />
        <StatCard label={t("dashboard.affected")} value={data?.affected_count ?? 0} icon={AlertTriangle} color="border-accent/60" />
        <StatCard label={t("dashboard.uncertain")} value={data?.uncertain_count ?? 0} icon={HelpCircle} color="border-line" />
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
                  <h2 className="font-display text-xl font-semibold text-ink">{t("dashboard.chart_title")}</h2>
                  <p className="text-xs text-muted mt-0.5">Average visible leaf damage by crop & plant</p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-primary-strong bg-leaf px-2.5 py-1 rounded-full border border-primary/40">
                  <span className={`w-1.5 h-1.5 rounded-full bg-primary ${summary.isValidating ? "animate-pulse" : ""}`} />
                  Live Trend
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5DCCF" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4F5E51" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#4F5E51" }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: "#FFFFFF", border: "1px solid #D5DCCF", color: "#1C2A1E", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#4F5E51" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {chartCrops.map((crop, i) => (
                    <Line
                      key={crop}
                      type="monotone"
                      dataKey={crop}
                      name={t(`crop.${crop}`)}
                      stroke={CROP_COLORS[crop] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
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
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">{t("dashboard.recent_scans")}</h2>
              <Link href="/history" className="text-xs font-semibold text-primary-strong hover:text-primary-strong flex items-center gap-1">
                {t("common.view_details")} <ChevronRight size={14} />
              </Link>
            </div>
            {!data?.recent_scans?.length ? (
              <p className="text-center text-muted text-sm py-12">{t("dashboard.no_scans")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recent_scans.map((scan) => (
                  <li key={scan.id}>
                    <Link
                      href={`/scan/${scan.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface flex-shrink-0 border border-line">
                        {scan.thumb_url || scan.image_url ? (
                          <img
                            src={resolveImageUrl(scan.thumb_url || scan.image_url)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/agriguard_logo_4k.png"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {scan.crop.icon_emoji}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {scan.crop.icon_emoji} {t(scan.crop.name_key)}
                          </span>
                          {scan.disease && scan.status !== "uncertain" && (
                            <span className="text-xs text-muted hidden sm:inline">
                              • {t(scan.disease.name_key)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
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
                      <ChevronRight size={16} className="text-muted" />
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
          <div className="glass rounded-2xl p-5 border border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi size={16} className="text-primary-strong" />
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Field Microclimate</h3>
              </div>
              <Link href="/field" className="text-xs text-primary-strong hover:underline flex items-center gap-0.5">
                Live Sensor <ArrowUpRight size={12} />
              </Link>
            </div>

            {sensor?.latest ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface rounded-xl p-2.5 text-center">
                    <Droplets size={16} className="text-primary-strong mx-auto mb-1" />
                    <p className="text-base font-bold text-ink">{sensor.latest.soil_moisture ?? "--"}%</p>
                    <p className="text-[10px] text-muted">Soil Moisture</p>
                  </div>
                  <div className="bg-surface rounded-xl p-2.5 text-center">
                    <Thermometer size={16} className="text-accent-ink mx-auto mb-1" />
                    <p className="text-base font-bold text-ink">{sensor.latest.temp_c ?? "--"}°C</p>
                    <p className="text-[10px] text-muted">Temperature</p>
                  </div>
                  <div className="bg-surface rounded-xl p-2.5 text-center">
                    <Wind size={16} className="text-primary-strong mx-auto mb-1" />
                    <p className="text-base font-bold text-ink">{sensor.latest.humidity ?? "--"}%</p>
                    <p className="text-[10px] text-muted">Humidity</p>
                  </div>
                </div>

                {sensor.context_hint && (
                  <div className="p-3 bg-accent-soft border border-accent/60 rounded-xl text-xs text-accent-ink leading-relaxed">
                    💡 <strong>Environmental Context:</strong> {sensor.context_hint}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted">Agricultural Microclimate Station</p>
                <p className="text-[10px] text-primary-strong mt-1">Connect ESP32 field node or view Bio-Shield 360° radar.</p>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink mb-2">Quick Navigation</h3>
            <Link
              href="/scan"
              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-ink/5 transition-all text-sm font-medium text-ink"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-leaf text-primary-strong">
                  <Camera size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">New Disease Scan</p>
                  <p className="text-[10px] text-muted">Upload leaf photo for AI analysis</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </Link>

            <Link
              href="/compare"
              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-ink/5 transition-all text-sm font-medium text-ink"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-leaf text-primary-strong">
                  <GitCompareArrows size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Compare Progression</p>
                  <p className="text-[10px] text-muted">Track treatment change over time</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          </div>
        </div>
      </div>

      {/* Support contact */}
      <p className="text-center text-xs text-muted pt-2 pb-4">
        {t("support.issue")}{" "}
        <a href="mailto:lohithgamer12@gmail.com?subject=AgriGuard%20website%20issue" className="text-primary-strong hover:text-primary-strong underline">lohithgamer12@gmail.com</a>
      </p>
    </div>
  );
}
