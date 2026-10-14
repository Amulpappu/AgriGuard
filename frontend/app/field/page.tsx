"use client";

import { useState, useRef } from "react";
import { getSensorLatest, getBioRisk, SensorLatestOut, BioRiskOut } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useCachedQuery } from "@/lib/useCachedQuery";
import { supabase } from "@/lib/supabase";
import { 
  Wifi, WifiOff, Droplets, Thermometer, Wind, Info, Activity, RefreshCw, 
  ShieldAlert, Cable, Terminal, AlertCircle, CheckCircle2 
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BioShieldRadar } from "@/components/BioShieldRadar";

function formatTimeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return "recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

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
  const { userId, email } = useAuth();

  // USB Data Cable Live Web Serial State
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbConnecting, setUsbConnecting] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);
  const [usbLogs, setUsbLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [usbLive, setUsbLive] = useState<{
    id: number;
    device_id: string;
    soil_moisture: number;
    temp_c: number;
    humidity: number;
    recorded_at: string;
  } | null>(null);
  const portRef = useRef<any>(null);

  // Live telemetry: cached reading scoped by user, refreshed every 15s in the background.
  const sensorKey = userId ? `sensor:latest:${userId}` : "sensor:latest";
  const sensorQ = useCachedQuery<SensorLatestOut>(sensorKey, getSensorLatest, { refreshInterval: 15_000 });
  const data = sensorQ.data;
  const loading = sensorQ.isValidating;
  const fetchLatest = () => sensorQ.refresh();

  const hasRealData = Boolean(data?.latest || usbLive);
  const activeData: SensorLatestOut = hasRealData ? (data || { series: [] }) : { series: [] };
  const live = usbLive || activeData.latest;

  const recordedDate = live?.recorded_at ? new Date(live.recorded_at) : null;
  const recordedTs = recordedDate ? recordedDate.getTime() : null;
  const isStale = !usbConnected && recordedTs != null && !isNaN(recordedTs) && Date.now() - recordedTs > 30 * 60 * 1000;
  const timeAgo = usbConnected ? "just now (USB Live)" : (live?.recorded_at ? formatTimeAgo(live.recorded_at) : null);

  // Disease Severity Value (DSV) risk derived from the current microclimate reading.
  const riskKey = live ? `biorisk:${live.temp_c}:${live.humidity}:${live.soil_moisture}` : null;
  const riskQ = useCachedQuery<BioRiskOut>(riskKey, () =>
    getBioRisk(live?.temp_c ?? undefined, live?.humidity ?? undefined, live?.soil_moisture ?? undefined),
  );
  const risk = riskQ.data;
  const riskTone = !risk ? "text-gray-300" : risk.risk_percentage > 70 ? "text-rose-400" : risk.risk_percentage > 40 ? "text-amber-400" : "text-emerald-400";
  const riskBar = !risk ? "bg-gray-500" : risk.risk_percentage > 70 ? "bg-rose-500" : risk.risk_percentage > 40 ? "bg-amber-500" : "bg-emerald-500";

  // Web Serial connect function
  async function connectUSB() {
    if (typeof window === "undefined" || !("serial" in navigator)) {
      setUsbError("Web Serial is supported on desktop Chrome & Edge. You can also run: py scripts/esp32_usb_bridge.py");
      return;
    }
    setUsbConnecting(true);
    setUsbError(null);
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setUsbConnected(true);
      setUsbConnecting(false);

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let buffer = "";
      let curTemp: number | null = null;
      let curHum: number | null = null;
      let curSoil: number | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const clean = line.trim();
            if (!clean) continue;
            setUsbLogs((prev) => [clean, ...prev.slice(0, 24)]);

            // Parse text output
            const tMatch = clean.match(/Temperature:\s*([\d\.]+)/i);
            if (tMatch) curTemp = parseFloat(tMatch[1]);
            const hMatch = clean.match(/Humidity:\s*([\d\.]+)/i);
            if (hMatch) curHum = parseFloat(hMatch[1]);
            const sMatch = clean.match(/Soil Moisture:\s*([\d\.]+)/i);
            if (sMatch) curSoil = parseFloat(sMatch[1]);

            if (curTemp !== null && curHum !== null && curSoil !== null) {
              const reading = {
                id: Date.now(),
                device_id: "ESP32-USB-CABLE",
                soil_moisture: curSoil,
                temp_c: curTemp,
                humidity: curHum,
                recorded_at: new Date().toISOString(),
              };
              setUsbLive(reading);

              // Persist directly to Supabase cloud
              Promise.resolve(
                supabase.from("sensor_readings").insert({
                  device_id: reading.device_id,
                  soil_moisture: reading.soil_moisture,
                  temp_c: reading.temp_c,
                  humidity: reading.humidity,
                  recorded_at: reading.recorded_at,
                })
              ).then(() => {
                sensorQ.refresh();
              }).catch(() => {});

              curTemp = null;
              curHum = null;
              curSoil = null;
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Serial connection notice:", err);
      if (err.name !== "NotFoundError") {
        setUsbError(err.message || "Failed to open COM port. Please close Arduino IDE Serial Monitor if open.");
      }
      setUsbConnected(false);
      setUsbConnecting(false);
    }
  }

  async function disconnectUSB() {
    try {
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (_) {}
    portRef.current = null;
    setUsbConnected(false);
  }

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
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.05]">{t("field.title")}</h1>
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

      {/* ⚡ ESP32 USB Cable Direct Stream Card */}
      <div className="glass rounded-2xl p-4 sm:p-5 border border-emerald-500/30 bg-emerald-950/15 space-y-3 shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              usbConnected
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse"
                : "bg-white/10 text-emerald-400 border border-white/10"
            }`}>
              <Cable size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">ESP32 Data Cable Direct Stream</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  usbConnected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/10 text-gray-400"
                }`}>
                  {usbConnected ? "🟢 USB Connected & Streaming" : "USB Ready"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Plug your ESP32 into this laptop via USB cable and stream real-time DHT & Soil data straight into AgriGuard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {usbConnected ? (
              <button
                type="button"
                onClick={disconnectUSB}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
              >
                Disconnect Cable
              </button>
            ) : (
              <button
                type="button"
                onClick={connectUSB}
                disabled={usbConnecting}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Cable size={14} />
                {usbConnecting ? "Selecting COM Port..." : "Connect ESP32 (USB Cable)"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1 border border-white/10 transition-all"
              title="Toggle Live Serial Monitor Logs"
            >
              <Terminal size={14} />
            </button>
          </div>
        </div>

        {usbError && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <div>
              <p>{usbError}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Tip: Close Arduino IDE&apos;s Serial Monitor if it is currently open, then try connecting again.
              </p>
            </div>
          </div>
        )}

        {showLogs && (
          <div className="bg-black/70 rounded-xl p-3 border border-white/10 font-mono text-[11px] text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between text-gray-400 text-[10px] pb-1 border-b border-white/10">
              <span>ESP32 115200 Baud Live Serial Stream:</span>
              <button onClick={() => setUsbLogs([])} className="hover:text-white">Clear</button>
            </div>
            {usbLogs.length === 0 ? (
              <p className="text-gray-500 italic">No serial lines received yet. Click Connect ESP32 to open port.</p>
            ) : (
              usbLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed truncate">{log}</div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl glass border border-white/5 text-xs">
        <div className={`flex items-center gap-2 font-semibold ${
          hasRealData
            ? isStale
              ? "text-amber-400"
              : "text-emerald-400"
            : "text-gray-400"
        }`}>
          {hasRealData && !isStale ? (
            <Wifi size={16} className="animate-pulse" />
          ) : (
            <WifiOff size={16} />
          )}
          <span>
            {hasRealData
              ? isStale
                ? `Last reading ${timeAgo} — node offline (${live?.device_id})`
                : `Hardware IoT Node Connected: ${live?.device_id}`
              : "No sensor readings recorded — node offline"}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">
          {hasRealData
            ? `Recorded: ${recordedDate?.toLocaleDateString()} ${recordedDate?.toLocaleTimeString()}`
            : "No Data"}
        </span>
      </div>

      {sensorQ.isLoading ? (
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
              badge={isStale ? "Offline" : "Root Zone"}
            />
            <ReadingCard
              icon={Thermometer}
              label={t("field.temperature")}
              value={activeData.latest?.temp_c ?? undefined}
              unit="°C"
              color="bg-amber-600"
              badge={isStale ? "Offline" : "Ambient"}
            />
            <ReadingCard
              icon={Wind}
              label={t("field.humidity")}
              value={activeData.latest?.humidity ?? undefined}
              unit="%"
              color="bg-cyan-600"
              badge={isStale ? "Offline" : "Canopy"}
            />
          </div>

          {/* DSV Disease-Risk Index */}
          <div className="glass rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className={riskTone} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">DSV Disease-Risk Index</h3>
              </div>
              {risk && (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 ${riskTone}`}>
                  {risk.risk_level}
                </span>
              )}
            </div>
            {risk ? (
              <>
                <div>
                  <div className="flex items-end justify-between mb-1.5">
                    <p className={`text-4xl font-extrabold ${riskTone}`}>
                      {risk.risk_percentage}<span className="text-base font-medium text-gray-400 ml-1">%</span>
                    </p>
                    <p className="text-xs text-gray-400">DSV {risk.dsv_index} / 4</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${riskBar}`} style={{ width: `${risk.risk_percentage}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    ["VPD", `${risk.vpd.vpd_kpa} kPa`],
                    ["Dew point", `${risk.vpd.dew_point_c}°C`],
                    ["Leaf wetness", `${risk.wet_hours_estimated} h`],
                    ["Germination", `~${risk.hours_to_germination} h`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white/5 rounded-xl p-2.5">
                      <p className="text-sm font-bold text-white">{v}</p>
                      <p className="text-[10px] text-gray-400">{k}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{risk.action_summary}</p>
              </>
            ) : !live ? (
              <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-gray-400">
                No active sensor readings to calculate DSV disease risk. Connect an ESP32 field telemetry station.
              </div>
            ) : (
              <div className="skeleton h-24 rounded-xl" />
            )}
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
            <div className="glass rounded-2xl p-4 sm:p-5 border border-amber-500/30 flex items-start gap-3.5">
              <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">{t("field.context_hint")}</p>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">{activeData.context_hint}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 px-2">
            <span>
              {t("field.last_updated")}: {hasRealData ? `${timeAgo} (${recordedDate?.toLocaleTimeString()})` : "Offline"}
            </span>
            <span>Device: {live?.device_id ?? "Field node (offline)"} · auto-refresh 15s</span>
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
