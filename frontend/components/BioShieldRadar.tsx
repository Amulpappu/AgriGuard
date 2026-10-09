"use client";

import { useEffect, useState } from "react";
import {
  getBioRisk,
  getBioRadar,
  getMandiROI,
  BioRiskOut,
  BioRadarOut,
  MandiROIOut,
} from "@/lib/api";
import {
  ShieldAlert,
  Wind,
  TrendingUp,
  AlertTriangle,
  Leaf,
  Clock,
  Sparkles,
  DollarSign,
  Radio,
  CheckCircle2,
  Lock,
  RefreshCw,
} from "lucide-react";

export function BioShieldRadar() {
  const [bioRisk, setBioRisk] = useState<BioRiskOut | null>(null);
  const [bioRadar, setBioRadar] = useState<BioRadarOut | null>(null);
  const [mandiROI, setMandiROI] = useState<MandiROIOut | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Mandi simulation state
  const [daysToHarvest, setDaysToHarvest] = useState(6);
  const [mandiPrice, setMandiPrice] = useState(28);
  const [cropSlug, setCropSlug] = useState("tomato");

  async function loadData() {
    setLoading(true);
    try {
      const [risk, radar, roi] = await Promise.all([
        getBioRisk(),
        getBioRadar(),
        getMandiROI(cropSlug, daysToHarvest, mandiPrice),
      ]);
      setBioRisk(risk);
      setBioRadar(radar);
      setMandiROI(roi);
    } catch (err) {
      console.error("Failed to load BioShield telemetry", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Update Mandi ROI when sliders change
  useEffect(() => {
    getMandiROI(cropSlug, daysToHarvest, mandiPrice)
      .then(setMandiROI)
      .catch(() => {});
  }, [daysToHarvest, mandiPrice, cropSlug]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass rounded-3xl p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tracking-wider uppercase font-mono">
                Concept preview • Simulated data
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                Not connected to real field data
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-1">
              Field Alerts Concept: Spread Radar & Harvest Planning
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl">
              Illustrative preview of a planned feature. Numbers on this panel are simulated and must not be used for farming decisions.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid: 3 Major Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: Pre-Symptomatic Epiphytology Window */}
        <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <h3 className="text-sm font-bold text-white">Pre-Symptomatic Infection Window</h3>
              </div>
              {bioRisk && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  bioRisk.risk_percentage >= 70
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}>
                  {bioRisk.risk_level}
                </span>
              )}
            </div>

            {bioRisk ? (
              <div className="space-y-3">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Infection Spore Pressure</p>
                    <p className="text-2xl font-black text-white mt-0.5">
                      {bioRisk.risk_percentage}%
                    </p>
                    <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                      Germination window: ~{bioRisk.hours_to_germination}h ahead
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[11px] text-gray-400">Canopy VPD</p>
                    <p className="text-sm font-bold font-mono text-emerald-400">{bioRisk.vpd.vpd_kpa} kPa</p>
                    <p className="text-[10px] text-gray-500">Dew Pt: {bioRisk.vpd.dew_point_c}°C</p>
                  </div>
                </div>

                <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Leaf size={14} /> Prophylactic Bio-Barrier Recipe
                  </p>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    {bioRisk.prophylactic_bio_action}
                  </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[11px] text-gray-400 font-medium">Swachh & Sustainable Impact</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Chemical Runoff Averted:</span>
                    <span className="font-bold text-emerald-400">{bioRisk.economic_benefits.toxic_chemical_runoff_saved_kg} kg / acre</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Preventive Treatment Cost:</span>
                    <span className="font-bold text-emerald-400">₹{bioRisk.economic_benefits.bio_treatment_cost_inr} vs ₹{bioRisk.economic_benefits.chemical_fungicide_cost_inr}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-gray-500">
                Loading micro-climatic telemetry...
              </div>
            )}
          </div>
        </div>

        {/* Pillar 2: Village Spore Dispersion Bio-Radar */}
        <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Radio size={18} />
                </div>
                <h3 className="text-sm font-bold text-white">Village Spore Bio-Radar</h3>
              </div>
              {bioRadar && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {bioRadar.cluster_name}
                </span>
              )}
            </div>

            {bioRadar ? (
              <div className="space-y-3">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Wind size={16} className="text-teal-400" />
                    <span>Wind Vector:</span>
                    <span className="font-bold text-white">{bioRadar.wind_vector.speed_kmh} km/h</span>
                  </div>
                  <span className="font-mono text-teal-400 font-bold">{bioRadar.wind_vector.cardinal} ({bioRadar.wind_vector.direction_deg}°)</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400">Panchayat Farm Nodes in Dispersion Cone:</p>
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {bioRadar.cluster_nodes.map((node) => (
                      <div
                        key={node.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                          node.in_plume_zone
                            ? "bg-rose-950/30 border-rose-500/40"
                            : "bg-white/5 border-white/5"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {node.farmer}
                            <span className="text-[10px] text-gray-400 font-normal">({node.crop})</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {node.distance_m}m away • Bearing {node.bearing}°
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            node.in_plume_zone
                              ? "bg-rose-500/20 text-rose-300 font-mono"
                              : "bg-emerald-500/20 text-emerald-300 font-mono"
                          }`}>
                            {node.projected_risk_pct}% Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-teal-950/30 p-2.5 rounded-xl border border-teal-500/30 text-[11px] text-teal-200">
                  <p className="font-semibold flex items-center gap-1 text-teal-300">
                    <Sparkles size={12} /> Community Early Warning Blast
                  </p>
                  <p className="mt-0.5 text-teal-100/90 leading-tight">
                    {bioRadar.community_action}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-gray-500">
                Calculating airborne spore trajectories...
              </div>
            )}
          </div>
        </div>

        {/* Pillar 3: Mandi Pre-Harvest Interval (PHI) & ROI Engine */}
        <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <h3 className="text-sm font-bold text-white">Mandi PHI & Treat-vs-Harvest</h3>
              </div>
              {mandiROI?.has_mrl_safety_lock && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <Lock size={10} /> MRL Lock Active
                </span>
              )}
            </div>

            {/* Interactive Simulation Sliders */}
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Days Until Planned Harvest:</span>
                  <span className="font-mono font-bold text-amber-400">{daysToHarvest} days</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  value={daysToHarvest}
                  onChange={(e) => setDaysToHarvest(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Current Mandi Price:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{mandiPrice} / kg</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={mandiPrice}
                  onChange={(e) => setMandiPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {mandiROI && (
              <div className="space-y-3">
                {mandiROI.has_mrl_safety_lock ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs space-y-1">
                    <p className="font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Chemical Fungicide MRL Conflict!
                    </p>
                    <p className="text-gray-300 text-[11px] leading-tight">
                      Chemical requires {mandiROI.chemical_phi_days_required} days PHI, but harvest is in {daysToHarvest} days. Spraying chemical will cause 70% price slash or rejection at Mandi!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                    <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> PHI Window Compliant
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/20">
                    <p className="text-[10px] text-gray-400">Chemical Spray Net</p>
                    <p className="text-base font-extrabold text-rose-400 mt-0.5">
                      ₹{mandiROI.scenarios.chemical_spray.net_profit_inr.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
                    <p className="text-[10px] text-gray-400">Bio-Shield Net Profit</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                      ₹{mandiROI.scenarios.bio_shield_prophylactic.net_profit_inr.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="text-xs text-gray-300">Farmer Profit Gain with Bio-Shield:</span>
                  <p className="text-lg font-black text-emerald-400">
                    +₹{mandiROI.farmer_profit_difference_inr.toLocaleString()} INR
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
