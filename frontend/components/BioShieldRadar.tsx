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
      <div className="glass rounded-3xl p-6 border border-primary/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-leaf rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-leaf text-primary-strong border border-primary/40 text-[11px] font-bold tracking-wider uppercase font-mono">
                Concept preview • Simulated data
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-leaf text-primary-strong border border-primary/40 text-[11px] font-bold">
                Not connected to real field data
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight flex items-center gap-2 mt-1">
              Field Alerts Concept: Spread Radar & Harvest Planning
            </h2>
            <p className="text-xs sm:text-sm text-ink max-w-2xl">
              Illustrative preview of a planned feature. Numbers on this panel are simulated and must not be used for farming decisions.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-ink/5 text-ink text-xs font-semibold transition border border-line"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid: 3 Major Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: Pre-Symptomatic Epiphytology Window */}
        <div className="glass rounded-2xl p-5 border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-ink flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <h3 className="text-sm font-bold text-ink">Pre-Symptomatic Infection Window</h3>
              </div>
              {bioRisk && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  bioRisk.risk_percentage >= 70
                    ? "bg-danger-soft text-danger border border-danger/40"
                    : "bg-leaf text-primary-strong border border-primary/40"
                }`}>
                  {bioRisk.risk_level}
                </span>
              )}
            </div>

            {bioRisk ? (
              <div className="space-y-3">
                <div className="bg-surface p-4 rounded-xl border border-line flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted font-medium">Infection Spore Pressure</p>
                    <p className="text-2xl font-black text-ink mt-0.5">
                      {bioRisk.risk_percentage}%
                    </p>
                    <p className="text-[11px] text-accent-ink font-semibold mt-0.5">
                      Germination window: ~{bioRisk.hours_to_germination}h ahead
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[11px] text-muted">Canopy VPD</p>
                    <p className="text-sm font-bold font-mono text-primary-strong">{bioRisk.vpd.vpd_kpa} kPa</p>
                    <p className="text-[10px] text-muted">Dew Pt: {bioRisk.vpd.dew_point_c}°C</p>
                  </div>
                </div>

                <div className="bg-leaf p-3 rounded-xl border border-primary/40 space-y-1.5">
                  <p className="text-xs font-bold text-primary-strong flex items-center gap-1.5">
                    <Leaf size={14} /> Prophylactic Bio-Barrier Recipe
                  </p>
                  <p className="text-xs text-primary-strong leading-relaxed">
                    {bioRisk.prophylactic_bio_action}
                  </p>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-line space-y-1">
                  <p className="text-[11px] text-muted font-medium">Swachh & Sustainable Impact</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">Chemical Runoff Averted:</span>
                    <span className="font-bold text-primary-strong">{bioRisk.economic_benefits.toxic_chemical_runoff_saved_kg} kg / acre</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">Preventive Treatment Cost:</span>
                    <span className="font-bold text-primary-strong">₹{bioRisk.economic_benefits.bio_treatment_cost_inr} vs ₹{bioRisk.economic_benefits.chemical_fungicide_cost_inr}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-muted">
                Loading micro-climatic telemetry...
              </div>
            )}
          </div>
        </div>

        {/* Pillar 2: Village Spore Dispersion Bio-Radar */}
        <div className="glass rounded-2xl p-5 border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-leaf text-primary-strong flex items-center justify-center">
                  <Radio size={18} />
                </div>
                <h3 className="text-sm font-bold text-ink">Village Spore Bio-Radar</h3>
              </div>
              {bioRadar && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-leaf text-primary-strong border border-primary/40">
                  {bioRadar.cluster_name}
                </span>
              )}
            </div>

            {bioRadar ? (
              <div className="space-y-3">
                <div className="bg-surface p-3 rounded-xl border border-line flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-ink">
                    <Wind size={16} className="text-primary-strong" />
                    <span>Wind Vector:</span>
                    <span className="font-bold text-ink">{bioRadar.wind_vector.speed_kmh} km/h</span>
                  </div>
                  <span className="font-mono text-primary-strong font-bold">{bioRadar.wind_vector.cardinal} ({bioRadar.wind_vector.direction_deg}°)</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted">Panchayat Farm Nodes in Dispersion Cone:</p>
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {bioRadar.cluster_nodes.map((node) => (
                      <div
                        key={node.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                          node.in_plume_zone
                            ? "bg-danger-soft border-danger/40"
                            : "bg-surface border-line"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-ink flex items-center gap-1.5">
                            {node.farmer}
                            <span className="text-[10px] text-muted font-normal">({node.crop})</span>
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {node.distance_m}m away • Bearing {node.bearing}°
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            node.in_plume_zone
                              ? "bg-danger-soft text-danger font-mono"
                              : "bg-leaf text-primary-strong font-mono"
                          }`}>
                            {node.projected_risk_pct}% Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-leaf p-2.5 rounded-xl border border-primary/40 text-[11px] text-primary-strong">
                  <p className="font-semibold flex items-center gap-1 text-primary-strong">
                    <Sparkles size={12} /> Community Early Warning Blast
                  </p>
                  <p className="mt-0.5 text-primary-strong leading-tight">
                    {bioRadar.community_action}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-muted">
                Calculating airborne spore trajectories...
              </div>
            )}
          </div>
        </div>

        {/* Pillar 3: Mandi Pre-Harvest Interval (PHI) & ROI Engine */}
        <div className="glass rounded-2xl p-5 border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-leaf text-primary-strong flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <h3 className="text-sm font-bold text-ink">Mandi PHI & Treat-vs-Harvest</h3>
              </div>
              {mandiROI?.has_mrl_safety_lock && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger border border-danger/40 flex items-center gap-1">
                  <Lock size={10} /> MRL Lock Active
                </span>
              )}
            </div>

            {/* Interactive Simulation Sliders */}
            <div className="bg-surface p-3 rounded-xl border border-line space-y-3">
              <div>
                <div className="flex justify-between text-xs text-ink mb-1">
                  <span>Days Until Planned Harvest:</span>
                  <span className="font-mono font-bold text-accent-ink">{daysToHarvest} days</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  value={daysToHarvest}
                  onChange={(e) => setDaysToHarvest(Number(e.target.value))}
                  className="w-full h-1.5 bg-line rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-ink mb-1">
                  <span>Current Mandi Price:</span>
                  <span className="font-mono font-bold text-primary-strong">₹{mandiPrice} / kg</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={mandiPrice}
                  onChange={(e) => setMandiPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-line rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {mandiROI && (
              <div className="space-y-3">
                {mandiROI.has_mrl_safety_lock ? (
                  <div className="p-3 rounded-xl bg-danger-soft border border-danger/40 text-xs space-y-1">
                    <p className="font-bold text-danger flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Chemical Fungicide MRL Conflict!
                    </p>
                    <p className="text-ink text-[11px] leading-tight">
                      Chemical requires {mandiROI.chemical_phi_days_required} days PHI, but harvest is in {daysToHarvest} days. Spraying chemical will cause 70% price slash or rejection at Mandi!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-leaf border border-primary/40 text-xs">
                    <p className="font-bold text-primary-strong flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> PHI Window Compliant
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-danger-soft p-2.5 rounded-xl border border-danger/40">
                    <p className="text-[10px] text-muted">Chemical Spray Net</p>
                    <p className="text-base font-extrabold text-danger mt-0.5">
                      ₹{mandiROI.scenarios.chemical_spray.net_profit_inr.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-leaf p-2.5 rounded-xl border border-primary/40">
                    <p className="text-[10px] text-muted">Bio-Shield Net Profit</p>
                    <p className="text-base font-extrabold text-primary-strong mt-0.5">
                      ₹{mandiROI.scenarios.bio_shield_prophylactic.net_profit_inr.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-leaf border border-primary/40 text-center">
                  <span className="text-xs text-ink">Farmer Profit Gain with Bio-Shield:</span>
                  <p className="text-lg font-black text-primary-strong">
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
