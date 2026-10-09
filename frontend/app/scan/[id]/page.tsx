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
  const [activeTab, setActiveTab] = useState<"actions" | "symptoms" | "prevention">("actions");

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
      .catch(async () => {
        if (typeof window !== "undefined") {
          try {
            const cached = sessionStorage.getItem(`scan_data_${id}`);
            if (cached) {
              const s = JSON.parse(cached) as ScanOut;
              setScan(s);
              const validTop = (s.top3 || []).find((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
              const slug = s.disease?.slug || (validTop && s.status !== "healthy" ? validTop.disease_slug : (s.status === "healthy" ? `${s.crop.slug}_healthy` : `${s.crop.slug}_blight`));
              try {
                const adv = await getAdvisory(slug, lang);
                setAdvisory(adv);
              } catch {}
              return;
            }
          } catch {}
        }
        setError("Scan not found.");
      })
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
        : t("scan.not_sure");

    const speechText = `${cropName}. ${condition}. ${advisory?.summary || ""} ${(advisory?.management || []).join(". ")}`;
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
    const condition = scan.status === "healthy" ? "Healthy Crop" : scan.disease ? t(scan.disease.name_key) : t("scan.not_sure");
    const text = `🌿 AgriGuard Screening Result (AI-assisted)\nCrop: ${cropName}\nResult: ${condition}\nConfidence: ${Math.round(Math.min(scan.confidence, 0.99) * 100)}%\nView Report: ${window.location.href}`;
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
  const isUncertain = scan.status === "uncertain";
  const sevLevel = scan.severity.level || "none";
  const confPct = Math.round(Math.min(scan.confidence, 0.99) * 100);
  const showExpert = isUncertain || scan.low_confidence || sevLevel === "high";
  const validTop3 = (scan.top3 || []).filter((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
  const topName = scan.disease
    ? t(scan.disease.name_key)
    : validTop3[0]
    ? t(validTop3[0].disease_name_key)
    : "";

  // One plain sentence a farmer can read at a glance
  const headline = isHealthy
    ? t("scan.looks_healthy")
    : isUncertain || !topName
    ? t("scan.not_sure")
    : `${t("scan.possible_prefix")} ${topName}`;

  const tone = isHealthy
    ? { ring: "border-emerald-500/40", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", Icon: CheckCircle2 }
    : isUncertain || !topName
    ? { ring: "border-slate-500/40", chip: "bg-slate-500/15 text-slate-300 border-slate-500/40", Icon: AlertTriangle }
    : sevLevel === "high"
    ? { ring: "border-red-500/40", chip: "bg-red-500/15 text-red-300 border-red-500/40", Icon: AlertTriangle }
    : { ring: "border-amber-500/40", chip: "bg-amber-500/15 text-amber-300 border-amber-500/40", Icon: AlertTriangle };

  const sevTone: Record<string, string> = {
    none: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    low: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    moderate: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    high: "text-red-300 bg-red-500/10 border-red-500/30",
  };

  const tabs: { id: "actions" | "symptoms" | "prevention"; label: string; Icon: any }[] = [
    { id: "actions", label: t("scan.tab_actions"), Icon: Leaf },
    { id: "symptoms", label: t("scan.tab_symptoms"), Icon: FlaskConical },
    { id: "prevention", label: t("scan.tab_prevention"), Icon: Droplets },
  ];

  const imgSrc =
    (typeof window !== "undefined" && sessionStorage.getItem(`scan_img_${scan.id}`)) ||
    (scan.image_url.startsWith("http") || scan.image_url.startsWith("data:") ? scan.image_url : `${API_BASE}${scan.image_url}`);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5 pb-28 sm:pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="text-gray-300 hover:text-white w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">{t("scan.report_title")}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono">{scan.id.slice(0, 8)}</span> • {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border ${
              isPlayingAudio
                ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                : "bg-white/5 border-white/10 text-emerald-300 hover:bg-emerald-500/10"
            }`}
          >
            {isPlayingAudio ? (
              <span className="flex items-end gap-0.5 h-4" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="eq-bar w-1 bg-emerald-300 rounded-sm" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </span>
            ) : (
              <Volume2 size={16} />
            )}
            {isPlayingAudio ? t("scan.stop") : t("scan.listen")}
          </button>
          <button onClick={handleWhatsAppShare} className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border border-white/10 text-gray-200 hover:bg-white/5">
            <Share2 size={15} />
            <span className="hidden md:inline">{t("scan.share")}</span>
          </button>
          <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border border-white/10 text-gray-200 hover:bg-white/5">
            <Printer size={15} />
            <span className="hidden md:inline">{t("scan.print")}</span>
          </button>
          <Link href="/scan" className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold bg-emerald-500 text-black hover:bg-emerald-400">
            <Camera size={15} />
            {t("scan.new_scan")}
          </Link>
        </div>
      </div>

      {/* Plain-language verdict */}
      <div className={`glass rounded-3xl p-5 sm:p-6 border ${tone.ring}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold border ${tone.chip}`}>
            <tone.Icon size={16} />
            {isHealthy ? t("scan.status_healthy") : isUncertain ? t("scan.status_uncertain") : t("scan.status_diseased")}
          </span>
          <span className="text-xs text-gray-400">{t("scan.ai_assisted")}</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">{headline}</h2>
        {isUncertain && <p className="text-sm text-gray-300 mt-2 leading-relaxed">{t("scan.uncertain_message")}</p>}
      </div>

      {showExpert && (
        <div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-300 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-100 leading-relaxed">{t("scan.expert_banner_soft")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: photo + metrics */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass rounded-3xl overflow-hidden aspect-[4/3] bg-black relative">
            <img src={imgSrc} alt="Leaf photo" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3">
              <button
                type="button"
                onClick={() => setShowCropPicker(!showCropPicker)}
                className="h-10 px-3.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-sm font-bold border border-white/20 flex items-center gap-2"
              >
                <span className="text-base">{scan.crop.icon_emoji}</span>
                {t(scan.crop.name_key)}
                <ChevronDown size={14} />
              </button>
              {showCropPicker && (
                <div className="absolute left-0 mt-2 w-64 bg-[#1D2030] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <p className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                    Not {t(scan.crop.name_key)}? Select correct crop
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {crops.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCropChange(c.slug)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium ${
                          c.slug === scan.crop.slug ? "bg-emerald-500/20 text-emerald-300" : "text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-lg">{c.icon_emoji}</span>
                        {t(c.name_key)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {reclassifying && (
              <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500 text-black flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> Updating...
              </span>
            )}
          </div>

          <div className="glass rounded-3xl p-5 space-y-4">
            {/* Confidence */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 font-medium">{t("scan.confidence")}</span>
                <span className="font-mono font-bold">{isUncertain ? t("scan.status_uncertain_confidence") : `${confPct}%`}</span>
              </div>
              <div className="h-2.5 mt-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isUncertain ? "bg-slate-500" : confPct >= 80 ? "bg-emerald-400" : "bg-amber-400"}`}
                  style={{ width: `${isUncertain ? 100 : confPct}%`, opacity: isUncertain ? 0.35 : 1 }}
                />
              </div>
            </div>
            {/* Severity */}
            <div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-gray-300 font-medium">{t("scan.severity")}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sevTone[sevLevel] || sevTone.none}`}>
                  {t(`scan.severity_${sevLevel}`)}
                  {scan.severity.affected_pct != null ? ` • ${scan.severity.affected_pct}%` : ""}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{t("scan.severity_note")}</p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>{scan.model_version || "model"}</span>
              <span>{scan.crop.slug.toUpperCase()}</span>
            </div>
          </div>

          {/* Other possibilities (never shows internal classes) */}
          {validTop3.length > 0 && !isHealthy && (
            <div className="glass rounded-3xl p-5 space-y-3">
              <p className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Layers size={15} className="text-emerald-400" />
                {t("scan.top3_title")}
              </p>
              <p className="text-xs text-gray-400">{t("scan.possibilities_only")}</p>
              <div className="space-y-2">
                {validTop3.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-100">{t(item.disease_name_key)}</span>
                    {!isUncertain && <span className="font-mono text-gray-300">{Math.round(item.confidence * 100)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: advice */}
        <div className="lg:col-span-3 space-y-5">
          {advisory?.summary && (
            <div className="glass rounded-3xl p-5 sm:p-6">
              <h3 className="font-display text-lg font-bold">{advisory.name}</h3>
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed mt-2">{advisory.summary.replace(/\s*\[TODO_VERIFY[^\]]*\]/g, "")}</p>
            </div>
          )}

          <div className="glass rounded-3xl p-5 sm:p-6 space-y-4">
            <div role="tablist" className="flex flex-wrap gap-2">
              {tabs.map(({ id: tid, label, Icon }) => (
                <button
                  key={tid}
                  role="tab"
                  aria-selected={activeTab === tid}
                  type="button"
                  onClick={() => setActiveTab(tid)}
                  className={`flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold border ${
                    activeTab === tid
                      ? "bg-emerald-500 text-black border-emerald-400"
                      : "text-gray-300 border-white/10 hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {activeTab === "actions" && (
              <ul className="space-y-2.5">
                {(advisory?.management?.length ? advisory.management : [t("scan.general_action")]).map((m, i) => (
                  <li key={i} className="flex gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-gray-100 leading-relaxed">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "symptoms" && (
              <ul className="space-y-2.5">
                {(advisory?.symptoms?.length ? advisory.symptoms : [t("scan.no_symptoms")]).map((s, i) => (
                  <li key={i} className="flex gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-gray-100 leading-relaxed">
                    <FlaskConical size={17} className="text-purple-300 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "prevention" && (
              <ul className="space-y-2.5">
                {(advisory?.prevention?.length ? advisory.prevention : [t("scan.general_action")]).map((p, i) => (
                  <li key={i} className="flex gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-gray-100 leading-relaxed">
                    <Droplets size={17} className="text-cyan-300 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* When to get expert help */}
          <div className="glass rounded-3xl p-5 sm:p-6 border border-amber-500/25">
            <h4 className="font-display text-base font-bold flex items-center gap-2 text-amber-200">
              <AlertTriangle size={17} /> {t("scan.when_help")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm sm:text-base text-gray-100 list-disc pl-5 leading-relaxed">
              {(advisory?.seek_help_when?.length ? advisory.seek_help_when : [t("scan.expert_banner_soft")]).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mt-3">{t("scan.consult_kvk")}</p>
          </div>

          <div className="flex gap-3">
            <Link href="/compare" className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border border-white/10 text-gray-200 hover:bg-white/5">
              <GitCompareArrows size={15} /> {t("nav.compare")}
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pt-2">{t("scan.footer_disclaimer")}</p>
    </div>
  );
}
