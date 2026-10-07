"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCrops, createScan, downscaleImage, CropOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Camera, Upload, Loader2, ChevronRight, AlertCircle, Sun, Focus, ShieldCheck, Sparkles } from "lucide-react";
import { MultispectralShader } from "@/components/MultispectralShader";

const ERROR_KEYS: Record<string, string> = {
  invalid_file: "scan.error_invalid_file",
  too_dark:     "scan.error_too_dark",
  too_bright:   "scan.error_too_bright",
  too_blurry:   "scan.error_too_blurry",
  file_too_large:"scan.error_file_too_large",
};

export default function ScanPage() {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [crops, setCrops] = useState<CropOut[]>([]);
  // null = Auto-detect any crop or vegetable from the image
  const [selectedCrop, setSelectedCrop] = useState<CropOut | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCrops().then((c) => {
      setCrops(c);
    }).catch(() => {});
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setError("");
    try {
      const scaled = await downscaleImage(f, 1280);
      setFile(scaled);
      const url = URL.createObjectURL(scaled);
      setPreview(url);
    } catch {
      setError(t("scan.error_generic"));
    }
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setAnalyzing(true);
    try {
      const cropId = selectedCrop ? selectedCrop.id : "auto";
      const result = await createScan(cropId, file);
      if (typeof window !== "undefined" && preview) {
        try {
          sessionStorage.setItem(`scan_img_${result.id}`, preview);
        } catch {}
      }
      router.push(`/scan/${result.id}`);
    } catch (err: any) {
      console.error("Scan error:", err);
      const key = ERROR_KEYS[err?.code] || "scan.error_generic";
      setError(err?.message || t(key));
      setAnalyzing(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("scan.title")}</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">{t("app.disclaimer")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Crop selection & Photography guidelines */}
          <div className="space-y-5">
            {/* Auto-detect & Crop selector */}
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">{t("scan.select_crop")}</p>
                <span className="text-[11px] text-green-400 font-medium">14+ Crops & Veggies</span>
              </div>

              {/* Primary Option: AI Auto-Detect */}
              <button
                type="button"
                id="crop-auto-detect"
                onClick={() => setSelectedCrop(null)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedCrop === null
                    ? "border-green-500 bg-green-500/15 text-green-300 shadow-md shadow-green-500/10"
                    : "border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/30 border border-green-500/40 flex items-center justify-center text-xl">
                    <Sparkles size={20} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-100">{t("scan.auto_detect_option")}</p>
                    <p className="text-[11px] text-gray-400">{t("scan.auto_detect_hint")}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                  Default
                </span>
              </button>

              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2 font-medium">Or choose specific crop / vegetable:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                  {crops.map((crop) => (
                    <button
                      key={crop.id}
                      type="button"
                      id={`crop-${crop.slug}`}
                      onClick={() => setSelectedCrop(crop)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl border text-center transition-all ${
                        selectedCrop?.id === crop.id
                          ? "border-green-500 bg-green-500/20 text-green-300 shadow-sm"
                          : "border-gray-800 bg-gray-900/30 text-gray-400 hover:border-gray-700 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-2xl">{crop.icon_emoji}</span>
                      <span className="text-[11px] font-semibold leading-tight line-clamp-1">{t(crop.name_key)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Photo Guidelines for Farmers */}
            <div className="glass rounded-2xl p-5 space-y-3 border border-white/5">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-green-400" />
                Guidelines for Best Diagnostic Accuracy
              </h3>
              <ul className="text-xs text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <Sun size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Natural Lighting:</strong> Capture in daylight. Avoid dark shadows or strong direct flash.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Focus size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Close Focus:</strong> Center the leaf lesions, spots, or nutrient yellowing within frame.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Camera size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Whole Leaf / Plant:</strong> Works with leaves, stems, pods, and whole plants.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Image Capture & Upload */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">{t("scan.upload_photo")}</p>
                {selectedCrop ? (
                  <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                    Filter: {selectedCrop.icon_emoji} {t(selectedCrop.name_key)}
                  </span>
                ) : (
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles size={11} /> Auto-Detect Crop & Disease
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileRef}
                id="image-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {preview ? (
                <div className="space-y-3">
                  <MultispectralShader imageSrc={preview} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setPreview(null); setFile(null); fileRef.current?.click(); }}
                      className="bg-black/80 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow border border-white/10"
                    >
                      {t("scan.retake")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/3] border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-green-500/50 hover:bg-green-500/5 hover:text-gray-200 transition-all active:scale-[0.99] p-6 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-green-400">
                    <Camera size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{t("scan.upload_photo")}</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">{t("scan.upload_hint")}</p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-medium">
                      <Camera size={13} /> Camera
                    </span>
                    <span className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-medium">
                      <Upload size={13} /> Upload File
                    </span>
                  </div>
                </button>
              )}

              {error && (
                <div className="flex items-start gap-2.5 bg-red-900/30 border border-red-700/60 rounded-xl p-3.5 text-red-300 text-xs sm:text-sm">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              <button
                id="analyse-btn"
                type="submit"
                disabled={!file || analyzing}
                className="w-full py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{t("scan.analyzing")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("scan.submit")}</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
