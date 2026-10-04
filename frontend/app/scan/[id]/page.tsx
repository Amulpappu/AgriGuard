"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getScan, getAdvisory, ScanOut, AdvisoryOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import {
  CheckCircle2, AlertTriangle, HelpCircle, ChevronDown, ChevronUp,
  ArrowLeft, Camera, GitCompareArrows, BookOpen, Info, ShieldCheck, MapPin,
  Sparkles, Leaf, Droplets, Bug, SunMedium, FlaskConical,
  Volume2, VolumeX, Printer, Share2
} from "lucide-react";

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-healthy text-sm font-semibold">
        <CheckCircle2 size={16} /> {t("scan.status_healthy")}
      </span>
    );
  }
  if (status === "potentially_diseased") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-diseased text-sm font-semibold">
        <AlertTriangle size={16} /> {t("scan.status_diseased")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-uncertain text-sm font-semibold">
      <HelpCircle size={16} /> {t("scan.status_uncertain")}
    </span>
  );
}

function CategoryBadge({ conditionType, t }: { conditionType?: string; t: (k: string) => string }) {
  if (conditionType === "nutrient_deficiency") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-300 border border-purple-600/50 text-xs font-semibold">
        <FlaskConical size={13} className="text-purple-400" />
        {t("scan.cat_nutrient")}
      </span>
    );
  }
  if (conditionType === "pest_damage") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-600/50 text-xs font-semibold">
        <Bug size={13} className="text-amber-400" />
        {t("scan.cat_pest")}
      </span>
    );
  }
  if (conditionType === "environmental_stress") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-900/40 text-orange-300 border border-orange-600/50 text-xs font-semibold">
        <SunMedium size={13} className="text-orange-400" />
        {t("scan.cat_stress")}
      </span>
    );
  }
  if (conditionType === "healthy") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-600/50 text-xs font-semibold">
        <Leaf size={13} className="text-emerald-400" />
        {t("scan.cat_healthy")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-900/40 text-red-300 border border-red-600/50 text-xs font-semibold">
      <AlertTriangle size={13} className="text-red-400" />
      {t("scan.cat_disease")}
    </span>
  );
}

function SeverityChip({ level, t }: { level: string; t: (k: string) => string }) {
  const cls =
    level === "high" ? "badge-high" :
    level === "moderate" ? "badge-amber" :
    level === "low" ? "bg-blue-900/40 text-blue-300 border border-blue-700" :
    "bg-gray-800 text-gray-400 border border-gray-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {t(`severity.${level}`)}
      <span className="text-[10px] opacity-70 ml-0.5">({t("severity.estimate_label")})</span>
    </span>
  );
}

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden transition-all bg-white/[0.02]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 hover:bg-white/8 text-left transition-all"
      >
        <span className="text-sm font-semibold text-gray-200">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3.5 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 bg-black/20">{children}</div>}
    </div>
  );
}

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const lang = useLang();
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const [scan, setScan] = useState<ScanOut | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
    const condition = scan.status === "healthy" ? t("scan.status_healthy") : scan.disease ? t(scan.disease.name_key) : t("scan.status_uncertain");
    const summary = advisory?.summary || "";
    const organic = advisory?.organic_solution ? `${t("scan.organic_remedy_title")}: ${advisory.organic_solution}` : "";
    const textToSpeak = `${cropName}. ${condition}. ${summary}. ${organic}`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9;
    utterance.lang = lang === "ta" ? "ta-IN" : "en-IN";
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function handleWhatsAppShare() {
    if (typeof window === "undefined" || !scan) return;
    const cropName = t(scan.crop.name_key);
    const diagnosis = scan.status === "healthy" ? t("scan.status_healthy") : scan.disease ? t(scan.disease.name_key) : t("scan.status_uncertain");
    const affectedPct = scan.severity.affected_pct != null ? `${scan.severity.affected_pct}%` : "AI Estimate";
    const msg = `🌾 *AgriGuard Precision Agriculture Report*\n\n🌱 *Crop:* ${cropName}\n🔬 *Diagnosis:* ${diagnosis}\n📊 *Visible Damage:* ${affectedPct}\n📍 *Remedy Summary:* ${advisory?.summary || 'Standard crop care guidelines apply.'}\n\n*Verified by AgriGuard Local Diagnostic Station*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  }

  useEffect(() => {
    if (!id) return;
    getScan(id as string)
      .then(async (s) => {
        setScan(s);
        const slug = s.disease?.slug || `${s.crop.slug}_healthy`;
        try {
          const adv = await getAdvisory(slug, lang);
          setAdvisory(adv);
        } catch {}
      })
      .catch(() => setError("Scan not found."))
      .finally(() => setLoading(false));
  }, [id, lang]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton aspect-[4/3] rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="p-8 text-center text-gray-400 mt-12 max-w-md mx-auto glass rounded-2xl">
        <p className="text-base font-semibold">{error || "Scan not found."}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-xs text-green-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const showExpertBanner = scan.low_confidence || scan.severity.level === "high";
  const confPct = Math.round(Math.min(scan.confidence, 0.99) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("scan.result_title")}</h1>
              {scan.crop_auto_detected && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles size={12} /> {t("scan.auto_detect_badge")}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {scan.crop.icon_emoji} {t(scan.crop.name_key)} • {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Advisory Audio Player */}
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold transition-all ${
              isPlayingAudio
                ? "bg-emerald-500/25 border border-emerald-400 text-emerald-300 animate-pulse"
                : "bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30"
            }`}
            title={isPlayingAudio ? t("scan.stop_advisory") : t("scan.listen_advisory")}
          >
            {isPlayingAudio ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} />}
            <span>{isPlayingAudio ? t("scan.stop_advisory") : t("scan.listen_advisory")}</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-green-600/20 border border-green-500/40 text-green-300 text-xs font-semibold hover:bg-green-600/30 transition-all"
            title={t("scan.share_whatsapp")}
          >
            <Share2 size={14} />
            <span className="hidden md:inline">{t("scan.share_whatsapp")}</span>
          </button>

          {/* Print / PDF Report */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:border-gray-500 hover:bg-white/5 transition-all"
            title={t("scan.print_report")}
          >
            <Printer size={14} />
            <span className="hidden md:inline">{t("scan.print_report")}</span>
          </button>

          {/* Scan Again */}
          <Link
            href="/scan"
            className="hidden sm:flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:border-gray-500 hover:bg-white/5 transition-all"
          >
            <Camera size={14} />
            {t("common.scan_again")}
          </Link>

          {/* Compare */}
          <Link
            href="/compare"
            className="hidden sm:flex items-center gap-1.5 py-2 px-4 rounded-xl bg-blue-600/20 border border-blue-600/40 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 transition-all"
          >
            <GitCompareArrows size={14} />
            {t("nav.compare")}
          </Link>
        </div>
      </div>

      {/* Auto-detect announcement banner for mobile */}
      {scan.crop_auto_detected && (
        <div className="flex sm:hidden items-center gap-2 bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-xs font-medium">
          <Sparkles size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{t("scan.auto_detect_badge")}: <strong>{scan.crop.icon_emoji} {t(scan.crop.name_key)}</strong></span>
        </div>
      )}

      {/* Expert help banner */}
      {showExpertBanner && (
        <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-600/30 rounded-2xl p-4 shadow-lg shadow-amber-950/10">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-200 leading-relaxed font-medium">
            {t("scan.expert_help_banner")}
          </p>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Photo & Diagnostics Summary) */}
        <div className="space-y-6">
          {/* Leaf Image Card */}
          <div className="glass rounded-2xl overflow-hidden aspect-[4/3] bg-gray-900 border border-white/10 relative shadow-xl">
            <img
              src={`${API_BASE}${scan.image_url}`}
              alt="Scan"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5">
                {scan.crop.icon_emoji} {t(scan.crop.name_key)}
              </span>
              {scan.crop_auto_detected && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600/80 backdrop-blur-md text-white flex items-center gap-1">
                  <Sparkles size={10} /> Auto-Detected
                </span>
              )}
            </div>
          </div>

          {/* Status & Severity Card */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">Diagnosis Assessment</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={scan.status} t={t} />
                  <CategoryBadge conditionType={scan.condition_type} t={t} />
                </div>
                {scan.disease && scan.status !== "uncertain" && (
                  <p className="text-base font-bold text-gray-100 mt-2">
                    {t(scan.disease.name_key)}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 mb-1 font-semibold">{t("scan.severity")}</p>
                <SeverityChip level={scan.severity.level} t={t} />
                {scan.severity.affected_pct != null && (
                  <p className="text-xs text-gray-400 mt-1 font-medium">~{scan.severity.affected_pct}% leaf lesion</p>
                )}
                <p className="text-[10px] text-gray-500 mt-1 max-w-[190px] leading-tight ml-auto">
                  {t("scan.severity_note")}
                </p>
              </div>
            </div>

            {/* Uncertain message */}
            {scan.status === "uncertain" && (
              <div className="flex items-start gap-2.5 bg-gray-800/80 border border-gray-700 rounded-xl p-3.5">
                <Info size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{t("scan.uncertain_message")}</p>
              </div>
            )}

            {/* Low confidence banner */}
            {scan.low_confidence && scan.status !== "uncertain" && (
              <div className="flex items-start gap-2.5 bg-amber-900/30 border border-amber-700/60 rounded-xl p-3.5">
                <HelpCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">{t("scan.low_confidence_banner")}</p>
              </div>
            )}

            {/* Confidence progress meter */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-400">{t("scan.confidence")}</span>
                {scan.status === "uncertain" ? (
                  <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                    {t("scan.status_uncertain_confidence")}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{confPct}%</span>
                )}
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    scan.status === "uncertain"
                      ? "bg-gray-600/70"
                      : confPct >= 80
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : confPct >= 55
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                      : "bg-gray-500"
                  }`}
                  style={{ width: `${confPct}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
              <span>Model: {scan.model_version}</span>
              <span>Crop: {scan.crop.slug}</span>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <Link
              href="/scan"
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-white/5"
            >
              <Camera size={15} />
              {t("common.scan_again")}
            </Link>
            <Link
              href="/compare"
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600/20 border border-blue-600/40 text-blue-300 text-xs font-semibold"
            >
              <GitCompareArrows size={15} />
              {t("nav.compare")}
            </Link>
          </div>
        </div>

        {/* Right Column (Emergency Rescue Plan, Differential Candidates & Advisory) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 🚨 Immediate Emergency Action / Rescue Card */}
          {advisory?.emergency_action && scan.status !== "uncertain" && (
            <div className="bg-gradient-to-br from-red-950/40 via-red-900/20 to-amber-950/30 border border-red-500/40 rounded-2xl p-5 shadow-lg space-y-2.5">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm sm:text-base">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                <div>
                  <h3>{t("scan.rescue_title")}</h3>
                  <p className="text-[11px] text-red-300/80 font-normal">{t("scan.rescue_subtitle")}</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-red-100 leading-relaxed bg-black/40 p-4 rounded-xl border border-red-500/25">
                {advisory.emergency_action}
              </div>
            </div>
          )}

          {/* Top 3 Candidates */}
          {(() => {
            const validTop3 = (scan.top3 || []).filter((item) => item.disease_slug !== "__uncertain__");
            if (validTop3.length === 0) return null;
            return (
              <div className="glass rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                  <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">{t("scan.top3")}</h2>
                  {(scan.low_confidence || scan.status === "uncertain") && (
                    <span className="text-[11px] text-amber-300 font-medium">
                      {t("scan.top3_low_confidence_note")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {validTop3.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs font-semibold text-gray-200 truncate">{t(item.disease_name_key)}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-400 ml-2">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Comprehensive Scientific Advisory */}
          {advisory ? (
            <div className="glass rounded-2xl p-5 sm:p-6 space-y-4 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen size={20} className="text-green-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">{t("scan.advisory")}: {advisory.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{advisory.category || "Agricultural Decision Support"}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  ICAR / KVK Compliant
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                {advisory.summary}
              </p>

              {/* 🌱 Organic & Biological Solutions */}
              {advisory.organic_solution && (
                <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                    <Leaf size={16} className="text-emerald-400" />
                    <h4>{t("scan.organic_remedy_title")}</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                    {advisory.organic_solution}
                  </p>
                </div>
              )}

              {/* 💧 Soil & Irrigation Care */}
              {advisory.soil_and_water && (
                <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-xs sm:text-sm">
                    <Droplets size={16} className="text-blue-400" />
                    <h4>{t("scan.soil_water_title")}</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
                    {advisory.soil_and_water}
                  </p>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                {advisory.symptoms && advisory.symptoms.length > 0 && (
                  <AccordionSection title="Identified Symptoms & Key Markers" defaultOpen={true}>
                    <ul className="list-disc pl-5 space-y-1.5">
                      {advisory.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </AccordionSection>
                )}
                {advisory.prevention && advisory.prevention.length > 0 && (
                  <AccordionSection title="Cultural & Sanitation Prevention">
                    <ul className="list-disc pl-5 space-y-1.5">
                      {advisory.prevention.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </AccordionSection>
                )}
                {advisory.management && advisory.management.length > 0 && (
                  <AccordionSection title="Field Management & Cultural Practices">
                    <ul className="list-disc pl-5 space-y-1.5">
                      {advisory.management.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </AccordionSection>
                )}
                {advisory.seek_help_when && advisory.seek_help_when.length > 0 && (
                  <AccordionSection title="When to Escalate to Agricultural Officers">
                    <ul className="list-disc pl-5 space-y-1.5">
                      {advisory.seek_help_when.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </AccordionSection>
                )}
              </div>

              {/* Regulatory KVK Mandate Card */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 mt-4">
                <MapPin size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Krishi Vigyan Kendra (KVK) Advisory</p>
                  <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                    {advisory.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 text-center space-y-3">
              <ShieldCheck size={32} className="text-green-400 mx-auto" />
              <h3 className="text-base font-bold text-white">General Crop Health Maintenance</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Ensure proper plant spacing, drip irrigation at root zone, clean pruning tools, and crop rotation with non-host crops.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
