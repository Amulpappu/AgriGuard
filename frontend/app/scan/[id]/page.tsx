"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getScan,
  getAdvisory,
  reclassifyScan,
  getCrops,
  resolveImageUrl,
  getUserPersona,
  setUserPersona,
  UserPersona,
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
  Volume2,
  Printer,
  Share2,
  ChevronDown,
  Loader2,
  Info,
} from "lucide-react";

// Below this confidence the farmer is always told to consult a human expert.
const LOW_CONFIDENCE_PCT = 70;

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const lang = useLang();
  const router = useRouter();

  const [scan, setScan] = useState<ScanOut | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryOut | null>(null);
  const [crops, setCrops] = useState<CropOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [error, setError] = useState("");
  const [reclassifyError, setReclassifyError] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<"actions" | "symptoms" | "prevention">("actions");
  const [persona, setPersona] = useState<UserPersona>("student_gardener");

  useEffect(() => {
    setPersona(getUserPersona());
  }, []);

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
        setError("not_found");
      })
      .finally(() => setLoading(false));
  }, [id, lang]);

  async function handleCropChange(cropSlug: string) {
    if (!id) return;
    setReclassifying(true);
    setReclassifyError(false);
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
      setReclassifyError(true);
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
    const condition = scan.status === "healthy" ? t("scan.looks_healthy") : scan.disease ? t(scan.disease.name_key) : t("scan.not_sure");
    const text = `🌿 ${t("result.share_title")}\n${t("result.share_crop")}: ${cropName}\n${t("result.share_result")}: ${condition}\n${t("scan.confidence")}: ${Math.round(Math.min(scan.confidence, 0.99) * 100)}%\n${t("result.share_link")}: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-6xl mx-auto" aria-busy="true">
        <p className="flex items-center gap-2.5 text-[17px] text-ink" role="status">
          <Loader2 size={22} className="animate-spin text-primary" aria-hidden="true" />
          {t("result.loading")}
        </p>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 skeleton aspect-[4/3]" />
          <div className="lg:col-span-3 space-y-4">
            <div className="skeleton h-28" />
            <div className="skeleton h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="px-4 py-16 text-center max-w-md mx-auto">
        <p className="text-xl font-semibold">{t("result.not_found")}</p>
        <Link href="/dashboard" className="btn-primary mt-6">
          {t("result.back_dashboard")}
        </Link>
      </div>
    );
  }

  const isHealthy = scan.status === "healthy";
  const isUncertain = scan.status === "uncertain";
  const sevLevel = scan.severity.level || "none";
  const confPct = Math.round(Math.min(scan.confidence, 0.99) * 100);
  const validTop3 = (scan.top3 || []).filter((it) => it.disease_slug && it.disease_slug !== "__uncertain__");
  // "Not sure": still show the AI's best guess and its (low) score instead of a blank 0%
  const bestGuess = isUncertain && validTop3.length > 0 ? validTop3[0] : null;
  const guessPct = bestGuess ? Math.round(Math.min(bestGuess.confidence, 0.99) * 100) : 0;
  const shownPct = isUncertain ? guessPct : confPct;
  const lowConfidence = isUncertain || scan.low_confidence || shownPct < LOW_CONFIDENCE_PCT;
  const showExpert = lowConfidence || sevLevel === "high";
  const cleanFoliarName = (raw?: string) => {
    if (!raw) return "";
    return raw.replace(/^(disease|crop)\./, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const rawTopName = scan.disease
    ? t(scan.disease.name_key)
    : validTop3[0]
    ? t(validTop3[0].disease_name_key)
    : "";

  const topName = (rawTopName.startsWith("disease.") || rawTopName.startsWith("crop."))
    ? cleanFoliarName(rawTopName)
    : rawTopName;

  // Plain sentence farmer/student can read at a glance
  const headline = isHealthy
    ? t("scan.looks_healthy")
    : isUncertain || !topName
    ? t("scan.not_sure")
    : `${t("scan.possible_prefix")} ${topName}`;

  const tone = isHealthy
    ? { chip: "bg-leaf text-primary-strong border-primary/30", Icon: CheckCircle2, label: t("scan.status_healthy") }
    : isUncertain || !topName
    ? { chip: "bg-canvas text-ink border-line-strong", Icon: Info, label: t("scan.status_uncertain") }
    : sevLevel === "high"
    ? { chip: "bg-danger-soft text-danger border-danger/30", Icon: AlertTriangle, label: t("scan.status_diseased") }
    : { chip: "bg-accent-soft text-accent-ink border-accent/60", Icon: AlertTriangle, label: t("scan.status_diseased") };

  const sevTone: Record<string, string> = {
    none: "text-primary-strong bg-leaf border-primary/30",
    low: "text-primary-strong bg-leaf border-primary/30",
    moderate: "text-accent-ink bg-accent-soft border-accent/60",
    high: "text-danger bg-danger-soft border-danger/30",
  };

  const tabs: { id: "actions" | "symptoms" | "prevention"; label: string }[] = [
    { id: "actions", label: t("scan.tab_actions") },
    { id: "symptoms", label: t("scan.tab_symptoms") },
    { id: "prevention", label: t("scan.tab_prevention") },
  ];
  const tabItems =
    activeTab === "actions"
      ? (advisory?.management?.length ? advisory.management : [t("scan.general_action")])
      : activeTab === "symptoms"
      ? (advisory?.symptoms?.length ? advisory.symptoms : [t("scan.no_symptoms")])
      : (advisory?.prevention?.length ? advisory.prevention : [t("scan.general_action")]);

  const imgSrc =
    (typeof window !== "undefined" && sessionStorage.getItem(`scan_img_${scan.id}`)) ||
    resolveImageUrl(scan.image_url);

  const actionBtn = "btn-secondary px-4 text-[15px]";

  return (
    <div className="px-4 sm:px-6 py-5 sm:py-8 max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            aria-label={t("result.back")}
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-line-strong/60 bg-surface text-ink hover:bg-leaf"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl">{t("scan.report_title")}</h1>
            <p className="text-[14px] text-muted">{new Date(scan.created_at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={handleToggleAudio} aria-pressed={isPlayingAudio} className={`${actionBtn} flex-1 sm:flex-none`}>
            {isPlayingAudio ? (
              <span className="flex items-end gap-0.5 h-4" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="eq-bar w-1 bg-primary rounded-sm" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </span>
            ) : (
              <Volume2 size={18} aria-hidden="true" />
            )}
            {isPlayingAudio ? t("scan.stop") : t("scan.listen")}
          </button>
          <button onClick={handleWhatsAppShare} className={`${actionBtn} flex-1 sm:flex-none`}>
            <Share2 size={18} aria-hidden="true" />
            {t("scan.share")}
          </button>
          <button onClick={handlePrint} className={`${actionBtn} hidden sm:inline-flex`}>
            <Printer size={18} aria-hidden="true" />
            {t("scan.print")}
          </button>
        </div>
      </div>

      {/* Screening disclaimer: always visible */}
      <p className="flex items-center gap-2 rounded-lg bg-surface border border-line px-4 py-3 text-[15px] font-medium text-ink">
        <Info size={18} className="text-primary shrink-0" aria-hidden="true" />
        {t("result.screening_note")}
      </p>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:items-start">
        {/* ─── Left: verdict, photo, confidence ───────────────────── */}
        <div className="contents lg:block lg:col-span-2 lg:space-y-6">
          <section className="glass p-5 sm:p-6 order-1 lg:order-none" aria-labelledby="verdict">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[15px] font-semibold border ${tone.chip}`}>
              <tone.Icon size={18} aria-hidden="true" />
              {tone.label}
            </span>
            <h2 id="verdict" className="mt-3 text-3xl sm:text-4xl">{headline}</h2>
            {isUncertain && <p className="mt-2 text-body text-ink">{t("scan.uncertain_message")}</p>}

            {/* Confidence */}
            <div className="mt-6">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-[16px] font-medium">{t("scan.confidence")}</span>
                <span className="font-display text-3xl font-semibold tabular-nums">
                  {isUncertain && !bestGuess ? t("scan.status_uncertain_confidence") : `${shownPct}%`}
                </span>
              </div>
              <div
                className="h-3 mt-2 rounded-full bg-surface overflow-hidden"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={shownPct}
                aria-label={t("scan.confidence")}
              >
                <div
                  className={`h-full rounded-full ${lowConfidence ? "bg-accent" : "bg-primary"}`}
                  style={{ width: `${isUncertain && !bestGuess ? 100 : shownPct}%`, opacity: isUncertain && !bestGuess ? 0.35 : 1 }}
                />
              </div>
              {bestGuess && (
                <p className="text-[15px] mt-2">
                  {t("scan.closest_match")}: <span className="font-semibold">{t(bestGuess.disease_name_key)}</span> ({guessPct}%)
                </p>
              )}
            </div>

            {/* Severity */}
            <div className="mt-5 pt-5 border-t border-ink/10">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[16px] font-medium">{t("scan.severity")}</span>
                <span className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[14px] font-semibold border ${sevTone[sevLevel] || sevTone.none}`}>
                  {t(`scan.severity_${sevLevel}`)}
                  {scan.severity.affected_pct != null ? ` • ${scan.severity.affected_pct}%` : ""}
                </span>
              </div>
              <p className="text-[14px] text-muted mt-1.5">{t("scan.severity_note")}</p>
            </div>
          </section>

          {/* Low confidence / severe: always point to a human expert */}
          {showExpert && (
            <div role="alert" className="rounded-xl border border-accent bg-accent-soft p-4 sm:p-5 order-2 lg:order-none">
              <p className="flex items-start gap-2.5 font-semibold text-ink text-[17px]">
                <AlertTriangle size={22} className="text-accent-ink shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {lowConfidence && <span className="block">{t("result.low_conf_title")}</span>}
                  <span className="block">{t("result.consult_officer")}</span>
                </span>
              </p>
            </div>
          )}

          <figure className="relative order-7 lg:order-none">
            <img
              src={imgSrc}
              alt={t("result.photo_alt")}
              className="w-full aspect-[4/3] object-cover rounded-2xl bg-leaf"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icon-192.png";
              }}
            />
            <div className="absolute top-3 left-3">
              <button
                type="button"
                onClick={() => setShowCropPicker(!showCropPicker)}
                aria-expanded={showCropPicker}
                aria-label={t("result.change_crop")}
                className="min-h-[48px] px-4 rounded-full bg-surface text-ink text-[15px] font-semibold shadow-float flex items-center gap-2"
              >
                <span className="text-lg" aria-hidden="true">{scan.crop.icon_emoji}</span>
                {t(scan.crop.name_key)}
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {showCropPicker && (
                <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-3rem)] bg-surface rounded-xl shadow-float border border-line p-2 z-50">
                  <p className="text-[14px] font-semibold text-muted px-2 py-1.5">
                    {t("result.wrong_crop").replace("{crop}", t(scan.crop.name_key))}
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    {crops.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCropChange(c.slug)}
                        className={`w-full min-h-[48px] flex items-center gap-2.5 px-3 rounded-lg text-left text-[16px] ${
                          c.slug === scan.crop.slug ? "bg-leaf font-semibold" : "hover:bg-canvas"
                        }`}
                      >
                        <span className="text-lg" aria-hidden="true">{c.icon_emoji}</span>
                        {t(c.name_key)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {reclassifying && (
              <span role="status" className="absolute top-3 right-3 text-[14px] font-semibold px-3 py-2 rounded-full bg-primary text-white flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" /> {t("result.updating")}
              </span>
            )}
            {reclassifyError && (
              <figcaption role="alert" className="mt-2 rounded-lg bg-danger-soft border border-danger/30 px-3 py-2 text-[15px] text-danger">
                {t("result.reclassify_failed")}
              </figcaption>
            )}
          </figure>

          {/* Other possibilities (never shows internal classes) */}
          {validTop3.length > 0 && !isHealthy && (
            <section aria-labelledby="others" className="order-8 lg:order-none">
              <h3 id="others" className="text-xl">{t("scan.top3_title")}</h3>
              <p className="text-[15px] text-muted mt-1">{t("scan.possibilities_only")}</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {validTop3.map((item, i) => (
                  <li key={i} className="py-3 flex items-center justify-between gap-3 text-[16px]">
                    <span className="font-medium">{t(item.disease_name_key)}</span>
                    <span className="tabular-nums text-muted">{Math.round(Math.min(item.confidence, 0.99) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ─── Right: advice ─────────────────────────────────────── */}
        <div className="contents lg:block lg:col-span-3 lg:space-y-6">
          {advisory?.summary && (
            <section className="order-9 lg:order-none">
              <h3 className="text-2xl">{advisory.name}</h3>
              <p className="text-body-lg mt-2">{advisory.summary.replace(/\s*\[TODO_VERIFY[^\]]*\]/g, "")}</p>
            </section>
          )}

          {/* What to do / Symptoms / Prevention */}
          <section className="glass p-5 sm:p-6 order-3 lg:order-none">
            <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-surface border border-line">
              {tabs.map(({ id: tid, label }) => (
                <button
                  key={tid}
                  id={`tab-${tid}`}
                  role="tab"
                  aria-controls="tab-panel"
                  aria-selected={activeTab === tid}
                  type="button"
                  onClick={() => setActiveTab(tid)}
                  className={`min-h-[48px] px-2 rounded-md text-[15px] font-semibold leading-tight ${
                    activeTab === tid ? "bg-primary text-white" : "text-ink hover:bg-leaf"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul role="tabpanel" id="tab-panel" aria-labelledby={`tab-${activeTab}`} className="mt-5 space-y-4">
              {tabItems.map((m, i) => (
                <li key={i} className="flex gap-3 text-[17px] leading-relaxed">
                  <CheckCircle2 size={22} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Advice for home garden vs farm */}
          {(advisory?.student_advice || advisory?.farmer_advice) && (
            <section aria-labelledby="advice-for" className="space-y-4 order-4 lg:order-none">
              <div className="flex flex-wrap items-center gap-3">
                <h3 id="advice-for" className="text-xl">{t("result.advice_for")}</h3>
                <div className="inline-grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface border border-line">
                  {([["student_gardener", t("result.view_garden")], ["farmer", t("result.view_farm")]] as const).map(([p, label]) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={persona === p}
                      onClick={() => {
                        setPersona(p);
                        setUserPersona(p);
                      }}
                      className={`min-h-[48px] px-4 rounded-md text-[15px] font-semibold ${
                        persona === p ? "bg-ink text-white" : "text-ink hover:bg-leaf"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {persona === "student_gardener" && advisory?.student_advice && (
                <div className="glass p-5 sm:p-6 space-y-5">
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.garden_care")}</h4>
                    <ul className="mt-2 space-y-2 list-disc pl-5 text-[16px] leading-relaxed">
                      {advisory.student_advice.pot_care.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.home_remedy")}</h4>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{advisory.student_advice.home_remedy}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.light_water")}</h4>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{advisory.student_advice.light_water}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.science")}</h4>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{advisory.student_advice.botany_insight}</p>
                  </div>
                </div>
              )}

              {persona === "farmer" && advisory?.farmer_advice && (
                <div className="glass p-5 sm:p-6 space-y-5">
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.farm_ops")}</h4>
                    <ul className="mt-2 space-y-2 list-disc pl-5 text-[16px] leading-relaxed">
                      {advisory.farmer_advice.field_actions.map((act, idx) => (
                        <li key={idx}>{act}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.dosage")}</h4>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{advisory.farmer_advice.acre_dosage}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-sans font-semibold">{t("result.irrigation")}</h4>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{advisory.farmer_advice.irrigation_schedule}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* When to get expert help */}
          <section className="rounded-xl border border-line-strong/60 bg-surface p-5 sm:p-6 order-5 lg:order-none">
            <h3 className="text-xl flex items-center gap-2">{t("scan.when_help")}</h3>
            <ul className="mt-3 space-y-2 text-[16px] list-disc pl-5 leading-relaxed">
              {(advisory?.seek_help_when?.length ? advisory.seek_help_when : [t("scan.expert_banner_soft")]).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            {!showExpert && <p className="mt-4 text-[16px] font-semibold">{t("result.consult_officer")}</p>}
          </section>

          <div className="flex flex-col sm:flex-row gap-3 order-6 lg:order-none">
            <Link href="/scan" className="btn-primary btn-lg flex-1">
              <Camera size={22} aria-hidden="true" />
              {t("scan.new_scan")}
            </Link>
            <Link href="/compare" className="btn-secondary btn-lg">
              <GitCompareArrows size={20} aria-hidden="true" /> {t("nav.compare")}
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-[14px] text-muted pt-2 max-w-3xl mx-auto">{t("scan.footer_disclaimer")}</p>
    </div>
  );
}
