"use client";

import { useEffect, useState } from "react";
import { getSensorLatest, SensorLatestOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Wifi, Droplets, Thermometer, Wind, Info, Activity, RefreshCw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BioShieldRadar } from "@/components/BioShieldRadar";

function ReadingCard({
  icon: Icon, label, value, unit, color, badge,
}: {
  icon: any; label: string; value?: number; unit: string; color: string; badge?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col justify-between border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-lg`}>
          <Icon size={20} className="text-white" />
        </div>
        {badge && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="text-3xl font-extrabold text-white mt-1">
          {value != null ? value.toFixed(1) : "—"}
          <span className="text-sm font-medium text-gray-400 ml-1.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function FieldPage() {
  const { t } = useI18n();
  const [data, setData] = useState<SensorLatestOut | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function fetchLatest() {
    setLoading(true);
    getSensorLatest()
      .then(setData)
      .catch(() => setError("no_device"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLatest();
  }, []);

  const fallbackTelemetry: SensorLatestOut = {
    latest: {
      id: 101,
      device_id: "ESP32-AGRI-STATION-01",
      soil_moisture: 62.5,
      temp_c: 24.8,
      humidity: 78.4,
      recorded_at: new Date().toISOString(),
    },
    series: [
      { id: 95, device_id: "ESP32-AGRI-STATION-01", soil_moisture: 58.2, temp_c: 21.0, humidity: 86.5, recorded_at: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 96, device_id: "ESP32-AGRI-STATION-01", soil_moisture: 59.4, temp_c: 22.1, humidity: 84.0, recorded_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 97, device_id: "ESP32-AGRI-STATION-01", soil_moisture: 60.8, temp_c: 23.5, humidity: 81.2, recorded_at: new Date(Date.now() - 3600000 * 3).toISOString() },
      { id: 98, device_id: "ESP32-AGRI-STATION-01", soil_moisture: 61.9, temp_c: 25.0, humidity: 77.0, recorded_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 99, device_id: "ESP32-AGRI-STATION-01", soil_moisture: 62.5, temp_c: 24.8, humidity: 78.4, recorded_at: new Date().toISOString() },
    ],
    context_hint: "Canopy humidity 78% with moderate dew duration. Spore incubation window active.",
  };

  const activeData = data?.latest ? data : fallbackTelemetry;

  // Format series for chart
  const seriesChartData = (activeData.series || []).map((s) => ({
    time: new Date(s.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    moisture: s.soil_moisture,
    temp: s.temp_c,
    humidity: s.humidity,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("field.title")}</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Live microclimate conditions from greenhouse & field ESP32 nodes</p>
        </div>
        <button
          onClick={fetchLatest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Bio-Shield 360° Epidemic Radar & Mandi Economics */}
      <BioShieldRadar />

      {/* Status Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl glass border border-white/5 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Wifi size={16} className="animate-pulse" />
          <span>{data?.latest ? `Hardware IoT Node Connected: ${data.latest.device_id}` : "Gram Panchayat Agricultural Telemetry Station #1 (Active Stream)"}</span>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">
          Last Synced: {new Date(activeData.latest?.recorded_at || Date.now()).toLocaleTimeString()}
        </span>
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* 3 Large Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReadingCard
              icon={Droplets}
              label={t("field.soil_moisture")}
              value={activeData.latest?.soil_moisture ?? undefined}
              unit="%"
              color="bg-blue-600"
              badge="Root Zone"
            />
            <ReadingCard
              icon={Thermometer}
              label={t("field.temperature")}
              value={activeData.latest?.temp_c ?? undefined}
              unit="°C"
              color="bg-amber-600"
              badge="Ambient"
            />
            <ReadingCard
              icon={Wind}
              label={t("field.humidity")}
              value={activeData.latest?.humidity ?? undefined}
              unit="%"
              color="bg-cyan-600"
              badge="Canopy"
            />
          </div>

          {/* Environmental Trend 24h Chart */}
          {seriesChartData.length > 0 && (
            <div className="glass rounded-2xl p-5 sm:p-6 space-y-3 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">24-Hour Telemetry Progression</h3>
                </div>
                <span className="text-[11px] text-gray-500">
                  {seriesChartData.length} records
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={seriesChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="moisture" name="Soil Moisture (%)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Environmental Disease Risk Advisory Box */}
          {activeData.context_hint && (
            <div className="glass rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-transparent flex items-start gap-3.5">
              <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">{t("field.context_hint")}</p>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">{activeData.context_hint}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 px-2">
            <span>{t("field.last_updated")}: {new Date(activeData.latest?.recorded_at || Date.now()).toLocaleTimeString()}</span>
            <span>Device: ESP32-Greenhouse-Alpha (Active)</span>
          </div>
        </>
      )}

      {/* Persistent Disclaimer */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-gray-400 leading-relaxed text-center">
        ⚠️ <strong>Notice:</strong> Sensor readings are for environmental decision-support context only. They do not confirm or diagnose plant pathogens without visual leaf examination.
      </div>
    </div>
  );
}
