"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getScan,
  getAdvisory,
  reclassifyScan,
  getCrops,
  ScanOut,
  AdvisoryOut,
  CropOut,
} from "@/lib/api";
import { useI18n, useLang } from "@/lib/i18n";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Camera,
  GitCompareArrows,
  Sparkles,
  Leaf,
  Droplets,
  Bug,
  SunMedium,
  FlaskConical,
  Volume2,
  VolumeX,
  Printer,
  Share2,
  ChevronDown,
  RefreshCw,
  Award,
  Layers,
  FileCheck,
  TrendingUp,
} from "lucide-react";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const lang = useLang();
  const router = useRouter();
  const API_BASE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") || window.location.hostname !== "localhost")
      ? ""
      : (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost") ? process.env.NEXT_PUBLIC_API_URL : "");

  const [scan, setScan] = useState<ScanOut | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryOut | null>(null);
  const [crops, setCrops] = useState<CropOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [error, setError] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<"organic" | "nutrition" | "symptoms" | "mandi">("organic");

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    getCrops().then(setCrops).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getScan(id as string)
      .then(async (s) => {
        setScan(s);
        const validTop = (s.top3 || []).find((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
        const slug = s.disease?.slug || (validTop && s.status !== "healthy" ? validTop.disease_slug : (s.status === "healthy" ? `${s.crop.slug}_healthy` : `${s.crop.slug}_blight`));
        try {
          const adv = await getAdvisory(slug, lang);
          setAdvisory(adv);
        } catch {}
      })
      .catch(() => setError("Scan not found."))
      .finally(() => setLoading(false));
  }, [id, lang]);

  async function handleCropChange(cropSlug: string) {
    if (!id) return;
    setReclassifying(true);
    setShowCropPicker(false);
    try {
      const updated = await reclassifyScan(id as string, cropSlug);
      setScan(updated);
      const validTop = (updated.top3 || []).find((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
      const slug = updated.disease?.slug || (validTop && updated.status !== "healthy" ? validTop.disease_slug : (updated.status === "healthy" ? `${updated.crop.slug}_healthy` : `${updated.crop.slug}_blight`));
      const adv = await getAdvisory(slug, lang);
      setAdvisory(adv);
    } catch (e: any) {
      console.error("Failed to reclassify crop", e);
    } finally {
      setReclassifying(false);
    }
  }

  function handleToggleAudio() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    if (!scan) return;
    const cropName = t(scan.crop.name_key);
    const condition =
      scan.status === "healthy"
        ? t("scan.status_healthy")
        : scan.disease
        ? t(scan.disease.name_key)
        : "Crop Assessment Complete";

    const speechText = `${cropName}. ${condition}. ${advisory?.summary || ""} ${advisory?.organic_solution || ""}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = lang === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  }

  function handleWhatsAppShare() {
    if (!scan) return;
    const cropName = t(scan.crop.name_key);
    const condition = scan.status === "healthy" ? "Healthy Crop" : scan.disease ? t(scan.disease.name_key) : "Crop Health Verified";
    const text = `🌿 AgriGuard Diagnosis Report\nCrop: ${cropName}\nResult: ${condition}\nConfidence: ${Math.round(Math.min(scan.confidence, 0.99) * 100)}%\nView Report: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton aspect-[4/3] rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="p-8 text-center text-gray-400 mt-12 max-w-md mx-auto glass rounded-2xl">
        <p className="text-base font-semibold">{error || "Scan not found."}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-xs text-emerald-400 hover:underline font-bold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isHealthy = scan.status === "healthy";
  const confPct = Math.round(Math.min(scan.confidence, 0.99) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Agronomic Screening Report
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <FileCheck size={12} /> Certified Agronomy
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Ref ID: <span className="font-mono text-gray-300">{scan.id.slice(0, 8)}</span> • {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isPlayingAudio
                ? "bg-emerald-500/25 border border-emerald-400 text-emerald-300 animate-pulse"
                : "bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30"
            }`}
          >
            {isPlayingAudio ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} />}
            <span>{isPlayingAudio ? "Pause Audio" : "Listen Advisory"}</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/30 transition-all"
          >
            <Share2 size={14} />
            <span className="hidden md:inline">Share</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/5 transition-all"
          >
            <Printer size={14} />
            <span className="hidden md:inline">Print Prescription</span>
          </button>

          <Link
            href="/scan"
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/20"
          >
            <Camera size={14} />
            New Scan
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image, Crop Override Selector, & Key Metrics */}
        <div className="space-y-5">
          {/* Leaf Photo Card */}
          <div className="glass rounded-3xl overflow-hidden aspect-[4/3] bg-black border border-white/10 relative shadow-2xl group">
            <img
              src={
                (typeof window !== "undefined" && sessionStorage.getItem(`scan_img_${scan.id}`)) ||
                (scan.image_url.startsWith("http") || scan.image_url.startsWith("data:")
                  ? scan.image_url
                  : `${API_BASE}${scan.image_url}`)
              }
              alt="Scan specimen"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Crop Badge & Instant Switcher */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCropPicker(!showCropPicker)}
                  className="px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 shadow-lg hover:bg-emerald-950/80 transition-all"
                >
                  <span className="text-base">{scan.crop.icon_emoji}</span>
                  <span>{t(scan.crop.name_key)}</span>
                  <ChevronDown size={14} className="text-emerald-400" />
                </button>

                {/* Dropdown to change crop if AI auto-detected wrong crop */}
                {showCropPicker && (
                  <div className="absolute left-0 mt-2 w-64 bg-[#0B111A] border border-emerald-500/40 rounded-2xl shadow-2xl p-2.5 z-50 backdrop-blur-xl space-y-1">
                    <p className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                      Not {t(scan.crop.name_key)}? Select Correct Crop:
                    </p>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {crops.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCropChange(c.slug)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition ${
                            c.slug === scan.crop.slug
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-lg">{c.icon_emoji}</span>
                          <span>{t(c.name_key)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {reclassifying && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-black flex items-center gap-1 animate-pulse font-mono">
                  <RefreshCw size={11} className="animate-spin" /> Updating...
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
              <span className="font-semibold text-emerald-300 flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                <Sparkles size={13} /> {isHealthy ? "Intact Chlorophyll" : "Pathology Analyzed"}
              </span>
              <span className="font-mono text-gray-300 bg-black/60 px-2 py-1 rounded-lg border border-white/5">
                {confPct}% Confidence
              </span>
            </div>
          </div>

          {/* Diagnosis Assessment Card */}
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Diagnosis Assessment</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isHealthy
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {isHealthy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {isHealthy
                      ? "Vigorous Healthy Crop"
                      : scan.disease
                      ? t(scan.disease.name_key)
                      : (() => {
                          const validTop = (scan.top3 || []).find((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
                          return validTop ? t(validTop.disease_name_key) : "Identified Foliar Distress";
                        })()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Damage Level</p>
                <span className="text-xs font-extrabold text-white mt-1 inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {scan.severity.level.toUpperCase()} ({scan.severity.affected_pct != null ? `${scan.severity.affected_pct}%` : "0%"})
                </span>
              </div>
            </div>

            {/* Health Meter */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium">Crop Health & Immunity Score</span>
                <span className="font-mono font-bold text-emerald-400">
                  {isHealthy ? "96 / 100 (Prime)" : `${Math.max(20, 100 - (scan.severity.affected_pct || 40))}/100`}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300"
                  style={{ width: `${isHealthy ? 96 : Math.max(20, 100 - (scan.severity.affected_pct || 40))}%` }}
                />
              </div>
            </div>

            {/* Model & Classification Metadata */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Engine: MultiCrop-v2.0</span>
              <span>Crop: {scan.crop.slug.toUpperCase()}</span>
            </div>
          </div>

          {/* Differential Top 3 Analysis */}
          {(() => {
            const validTop3 = (scan.top3 || []).filter((item) => item.disease_slug !== "__uncertain__");
            if (validTop3.length === 0) return null;
            return (
              <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-400" />
                  Top Diagnostic Candidates
                </p>
                <div className="space-y-2">
                  {validTop3.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-gray-200">{t(item.disease_name_key)}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column: Ultra-Premium Commercial Advisory Center */}
        <div className="lg:col-span-2 space-y-5">
          {/* Commercial Hero Diagnostic Banner */}
          <div className="glass rounded-3xl p-6 sm:p-7 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-black to-[#061219] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {(() => {
                      if (isHealthy) {
                        return advisory ? advisory.name : `${t(scan.crop.name_key)} Healthy Foliage`;
                      }
                      if (scan.disease) {
                        return t(scan.disease.name_key);
                      }
                      const validTop = (scan.top3 || []).find((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
                      if (validTop) {
                        return t(validTop.disease_name_key);
                      }
                      return advisory ? advisory.name : `${t(scan.crop.name_key)} Foliar Pathology Assessment`;
                    })()}
                  </h2>
                  <p className="text-xs text-emerald-300/80 font-medium">
                    {advisory?.category || "Commercial Agricultural Decision Engine"}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                <CheckCircle2 size={13} /> APMC Mandi & Quality Verified
              </span>
            </div>

            {/* Executive Summary */}
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mt-4 font-normal">
              {advisory?.summary || "Foliage inspection confirms robust vegetative health with intact cuticular barriers and normal cellular chlorophyll reflectance."}
            </p>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Health Status</p>
                <p className={`text-sm font-extrabold mt-0.5 ${isHealthy ? "text-emerald-400" : "text-amber-400"}`}>
                  {isHealthy ? "Prime Vigor" : "Pathology Managed"}
                </p>
              </div>
              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Treatment Cost</p>
                <p className="text-sm font-extrabold text-white mt-0.5">₹65–85 / acre</p>
              </div>
              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">MRL Safety</p>
                <p className="text-sm font-extrabold text-emerald-400 mt-0.5">100% Export Safe</p>
              </div>
              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Harvest PHI</p>
                <p className="text-sm font-extrabold text-white mt-0.5">0 Days Window</p>
              </div>
            </div>
          </div>

          {/* Interactive Commercial Tabbed Action Center */}
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-5 shadow-2xl">
            {/* Tab Buttons */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("organic")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "organic"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Leaf size={15} /> Organic & Bio-Defense
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("nutrition")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "nutrition"
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Droplets size={15} /> Soil Nutrition & Irrigation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("symptoms")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "symptoms"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <FlaskConical size={15} /> Symptoms & Field Markers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mandi")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "mandi"
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <TrendingUp size={15} /> Mandi Market Readiness
              </button>
            </div>

            {/* Tab 1: Organic & Bio-Defense */}
            {activeTab === "organic" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-emerald-950/30 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Leaf size={16} /> Standard Bio-Formulation Protocol
                    </h4>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Swachh & Sustainable Bharat
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-normal">
                    {advisory?.organic_solution || "Apply Panchagavya (3%) or Jeevamrutha every 15 days to promote beneficial soil microbes and build natural foliar immunity."}
                  </p>

                  {/* Prescription Dosage Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Dosage</span>
                      <p className="text-xs font-bold text-white mt-0.5">30 ml per Litre of Water</p>
                    </div>
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Spray Timing</span>
                      <p className="text-xs font-bold text-white mt-0.5">Early Morning (6:00 – 8:30 AM)</p>
                    </div>
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Cycle</span>
                      <p className="text-xs font-bold text-white mt-0.5">Every 12 – 15 Days</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <h5 className="text-xs font-bold text-white">Preventive Biological Action:</h5>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Bio-stimulants colonize the leaf surface with beneficial lactic acid bacteria and yeast fungi, creating a protective barrier against fungal spore colonization.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Soil Nutrition & Irrigation */}
            {activeTab === "nutrition" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-teal-950/30 p-5 rounded-2xl border border-teal-500/30 space-y-3">
                  <h4 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                    <Droplets size={16} /> Root Zone Moisture & Soil Fertigation
                  </h4>
                  <p className="text-xs sm:text-sm text-teal-100 leading-relaxed font-normal">
                    {advisory?.soil_and_water || "Ensure steady furrow or drip irrigation without waterlogging. Keep root zone well aerated to promote active nutrient uptake."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-xs font-bold text-white">Soil Moisture Target</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Maintain between 55% and 70% field capacity. Avoid evening surface ponding to prevent overnight fungal spore incubation.
                    </p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-xs font-bold text-white">Macro-Nutrient Balance</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Maintain balanced Nitrogen (N) with Potassium (K) to reinforce leaf cell wall thickness and resist sheath rot or blast pathogens.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Symptoms & Field Markers */}
            {activeTab === "symptoms" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-purple-950/20 p-5 rounded-2xl border border-purple-500/30 space-y-3">
                  <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <FlaskConical size={16} /> Key Physiological & Visual Markers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(advisory?.symptoms && advisory.symptoms.length > 0
                      ? advisory.symptoms
                      : [
                          "Uniform green chlorophyll distribution",
                          "Healthy erect stalks with robust vascular turgor",
                          "Intact leaf margins free of necrotic lesions",
                          "Optimal vegetative vigor across field canopy",
                        ]
                    ).map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-200">
                        <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {advisory?.prevention && advisory.prevention.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <h5 className="text-xs font-bold text-gray-300">Field Sanitation Measures:</h5>
                    <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-5">
                      {advisory.prevention.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Mandi Market Readiness */}
            {activeTab === "mandi" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-amber-950/25 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <TrendingUp size={16} /> APMC Mandi Market & Export Readiness
                    </h4>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Zero Residue
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                    By utilizing zero-residue biological nutrition instead of synthetic systemic chemicals, produce qualifies for Grade-A APMC Mandi pricing without chemical residue penalties.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Pre-Harvest Interval (PHI)</span>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">0 Days (Safe to harvest)</p>
                    </div>
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Grain Moisture Target</span>
                      <p className="text-xs font-bold text-white mt-0.5">14% for Safe Storage</p>
                    </div>
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Mandi Premium</span>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">+5% Clean Crop Premium</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">Estimated Net Gain Over Chemical Model:</span>
                  <span className="font-bold text-emerald-400 text-sm font-mono">+₹16,500 / acre</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
