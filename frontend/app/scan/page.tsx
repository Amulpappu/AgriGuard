"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getCrops, createScan, downscaleImage, CropOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { invalidateCached } from "@/lib/useCachedQuery";
import { Camera, ImageUp, Loader2, AlertCircle, Check } from "lucide-react";

// Optional false-colour analysis: only loaded if the farmer opens it.
const MultispectralShader = dynamic(
  () => import("@/components/MultispectralShader").then((m) => m.MultispectralShader),
  { ssr: false }
);

const ERROR_KEYS: Record<string, string> = {
  invalid_file: "scan.error_invalid_file",
  too_dark:     "scan.error_too_dark",
  too_bright:   "scan.error_too_bright",
  too_blurry:   "scan.error_too_blurry",
  file_too_large:"scan.error_file_too_large",
};

// After this long, tell the farmer the connection is slow but we're still working.
const SLOW_AFTER_MS = 8000;

export default function ScanPage() {
  const { t } = useI18n();
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [crops, setCrops] = useState<CropOut[]>([]);
  // null = Auto-detect any crop or vegetable from the image
  const [selectedCrop, setSelectedCrop] = useState<CropOut | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [slow, setSlow] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  // Photo check failed -> list of reasons (hand, objects, ...). Shown instead of a diagnosis.
  const [retakeIssues, setRetakeIssues] = useState<string[]>([]);

  useEffect(() => {
    getCrops().then((c) => {
      setCrops(c);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!analyzing) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [analyzing]);

  // Free the previous preview's memory when it changes.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = useCallback(async (f: File) => {
    setError("");
    setRetakeIssues([]);
    setPreparing(true);
    try {
      const scaled = await downscaleImage(f, 1280);
      setFile(scaled);
      setPreview(URL.createObjectURL(scaled));
    } catch {
      setError(t("scan.error_generic"));
    } finally {
      setPreparing(false);
    }
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setRetakeIssues([]);
    setAnalyzing(true);
    try {
      const cropId = selectedCrop ? selectedCrop.id : "auto";
      const result = await createScan(cropId, file);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`scan_data_${result.id}`, JSON.stringify(result));
        } catch {}
      }
      invalidateCached("dashboard");
      invalidateCached("scans");
      router.push(`/scan/${result.id}`);
    } catch (err: any) {
      if (err?.code === "retake_photo") {
        setRetakeIssues(err.issues || []);
        setAnalyzing(false);
        return;
      }
      console.error("Scan error:", err);
      // Always show the translated message; raw backend text stays in the console.
      setError(t(ERROR_KEYS[err?.code] || "scan.error_generic"));
      setAnalyzing(false);
    }
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ""; // allow picking the same file again after "Change photo"
  };

  const cropChip = (active: boolean) =>
    `min-h-[56px] rounded-lg border px-3 flex items-center gap-2 text-left text-[16px] font-medium ${
      active ? "border-primary bg-leaf text-ink ring-1 ring-primary" : "border-line-strong/60 bg-surface text-ink hover:bg-canvas"
    }`;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto pb-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">{t("upload.title")}</h1>
        <p className="mt-3 text-body-lg text-muted">{t("upload.intro")}</p>
      </header>

      {/* Hidden inputs: camera (rear) and gallery */}
      <input ref={cameraRef} id="image-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-10">
        {/* ─── Step 1: photo ─────────────────────────────────────── */}
        <section aria-labelledby="step-photo" className="space-y-4">
          <h2 id="step-photo" className="text-2xl">{t("upload.step_photo")}</h2>

          {preview ? (
            <div className="space-y-3">
              <img
                src={preview}
                alt={t("upload.preview_alt")}
                className="w-full aspect-[4/3] object-cover rounded-2xl bg-leaf"
              />
              <p className="text-[15px] font-medium">{t("upload.change_photo")}</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary" disabled={analyzing}>
                  <Camera size={18} aria-hidden="true" /> {t("upload.take_photo")}
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="btn-secondary" disabled={analyzing}>
                  <ImageUp size={18} aria-hidden="true" /> {t("upload.gallery_short")}
                </button>
              </div>
              <div>
                <button type="button" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced} className="btn-ghost px-0 text-muted underline underline-offset-4">
                  {t("upload.advanced")}
                </button>
              </div>
              {showAdvanced && <MultispectralShader imageSrc={preview} />}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-line-strong/70 bg-surface p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className="btn-primary btn-lg w-full" disabled={preparing}>
                  {preparing ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : <Camera size={22} aria-hidden="true" />}
                  {preparing ? t("upload.preparing") : t("upload.take_photo")}
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="btn-secondary btn-lg w-full" disabled={preparing}>
                  <ImageUp size={22} aria-hidden="true" /> {t("upload.choose_file")}
                </button>
              </div>
              <p className="mt-4 text-[15px] text-muted">{t("upload.photo_hint")}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-sans font-semibold">{t("upload.tips_h")}</h3>
            <ul className="mt-2 space-y-1.5 text-[16px]">
              {["tip1", "tip2", "tip3"].map((k) => (
                <li key={k} className="flex gap-2.5">
                  <Check size={20} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t(`upload.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Step 2: crop + submit ─────────────────────────────── */}
        <section aria-labelledby="step-crop" className="space-y-4">
          <h2 id="step-crop" className="text-2xl">{t("upload.step_crop")}</h2>

          <button
            type="button"
            id="crop-auto-detect"
            aria-pressed={selectedCrop === null}
            onClick={() => setSelectedCrop(null)}
            className={`${cropChip(selectedCrop === null)} w-full min-h-[64px] py-2`}
          >
            <span className="flex-1">
              <span className="block font-semibold">{t("upload.auto")}</span>
              <span className="block text-[14px] text-muted font-normal">{t("upload.auto_hint")}</span>
            </span>
            {selectedCrop === null && <Check size={22} className="text-primary shrink-0" aria-hidden="true" />}
          </button>

          {crops.length > 0 && (
            <div>
              <p className="text-[15px] text-muted mb-2">{t("upload.or_pick")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[19rem] overflow-y-auto pr-1">
                {crops.map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    id={`crop-${crop.slug}`}
                    aria-pressed={selectedCrop?.id === crop.id}
                    onClick={() => setSelectedCrop(crop)}
                    className={cropChip(selectedCrop?.id === crop.id)}
                  >
                    <span className="text-xl" aria-hidden="true">{crop.icon_emoji}</span>
                    <span className="leading-tight line-clamp-2">{t(crop.name_key)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {retakeIssues.length > 0 && (
            <div id="retake-box" role="alert" className="rounded-xl border border-accent bg-accent-soft p-4 text-ink space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <Camera size={20} className="text-accent-ink shrink-0" aria-hidden="true" />
                {t("scan.retake_title")}
              </p>
              <p className="text-[15px]">{t("scan.retake_body")}</p>
              <ul className="list-disc pl-6 space-y-0.5 text-[15px]">
                {retakeIssues.map((i) => (
                  <li key={i}>{t(`scan.retake_${i}`)}</li>
                ))}
              </ul>
              <p className="text-[15px]">{t("scan.retake_tip")}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger text-[16px]">
              <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              id="analyse-btn"
              type="submit"
              disabled={!file || analyzing}
              className="btn-primary btn-lg w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                  <span>{t("upload.loading_check")}</span>
                </>
              ) : (
                <span>{file ? t("upload.submit") : t("upload.need_photo")}</span>
              )}
            </button>
            <p aria-live="polite" className="mt-3 text-[15px] text-center min-h-[1.5em]">
              {analyzing && slow ? <span className="text-accent-ink font-medium">{t("upload.loading_slow")}</span> : null}
            </p>
            <p className="text-[14px] text-muted text-center">{t("result.screening_note")}</p>
          </div>
        </section>
      </form>
    </div>
  );
}
