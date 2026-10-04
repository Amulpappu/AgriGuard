"use client";

import { useEffect, useState } from "react";
import { getScans, compareScans, ScanListItem, CompareOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { GitCompareArrows, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, HelpCircle, Calendar, Sparkles } from "lucide-react";

export default function ComparePage() {
  const { t } = useI18n();
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [selA, setSelA] = useState<string>("");
  const [selB, setSelB] = useState<string>("");
  const [result, setResult] = useState<CompareOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  useEffect(() => {
    getScans({ limit: 100 }).then((s) => {
      setScans(s);
      if (s.length >= 2) {
        setSelA(s[0].id);
        setSelB(s[1].id);
      }
    }).catch(() => {});
  }, []);

  async function runCompare() {
    if (!selA || !selB || selA === selB) return;
    setLoading(true);
    setError("");
    try {
      const r = await compareScans(selA, selB);
      setResult(r);
    } catch (err: any) {
      setError(err?.message || "Compare failed.");
    } finally {
      setLoading(false);
    }
  }

  const StatusIcon = ({ status }: { status: string }) =>
    status === "healthy" ? <CheckCircle2 size={16} className="text-green-400" />
    : status === "potentially_diseased" ? <AlertTriangle size={16} className="text-orange-400" />
    : <HelpCircle size={16} className="text-gray-400" />;

  function DeltaBadge({ delta }: { delta: number | null | undefined }) {
    if (delta == null) return <span className="text-gray-500 text-sm font-semibold">—</span>;
    const abs = Math.abs(delta).toFixed(1);
    if (delta > 0.5) return (
      <span className="inline-flex items-center gap-1 text-red-400 text-sm sm:text-base font-bold bg-red-500/10 px-2.5 py-0.5 rounded-lg border border-red-500/20">
        <TrendingUp size={16} />+{abs}%
      </span>
    );
    if (delta < -0.5) return (
      <span className="inline-flex items-center gap-1 text-green-400 text-sm sm:text-base font-bold bg-green-500/10 px-2.5 py-0.5 rounded-lg border border-green-500/20">
        <TrendingDown size={16} />-{abs}%
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-gray-400 text-sm sm:text-base font-bold bg-white/5 px-2.5 py-0.5 rounded-lg">
        <Minus size={16} />{abs}%
      </span>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t("compare.title")}</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">{t("history.compare_select")}</p>
      </div>

      {/* Selectors Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">{t("compare.scan_a")}</label>
            <select
              value={selA}
              onChange={(e) => setSelA(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-green-500"
            >
              <option value="">Select Baseline Scan...</option>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.crop.name_key)} • {s.disease ? t(s.disease.name_key) : "Uncertain"} • {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">{t("compare.scan_b")}</label>
            <select
              value={selB}
              onChange={(e) => setSelB(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-green-500"
            >
              <option value="">Select Follow-up Scan...</option>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.crop.name_key)} • {s.disease ? t(s.disease.name_key) : "Uncertain"} • {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          id="compare-btn"
          onClick={runCompare}
          disabled={!selA || !selB || selA === selB || loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
        >
          <GitCompareArrows size={17} />
          {loading ? t("common.loading") : "Run Progression Comparison"}
        </button>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Delta summary metrics */}
          <div className="glass rounded-2xl p-5 grid grid-cols-3 gap-4 text-center border border-white/10">
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{t("compare.severity_delta")}</p>
              <DeltaBadge delta={result.severity_delta} />
              <p className="text-[10px] text-gray-500 mt-1">Leaf lesion change</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Confidence Δ</p>
              <DeltaBadge delta={result.confidence_delta * 100} />
              <p className="text-[10px] text-gray-500 mt-1">Probability shift</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{t("compare.status_change")}</p>
              <span className={`inline-block text-sm sm:text-base font-bold px-3 py-0.5 rounded-lg ${
                result.status_change ? "text-amber-300 bg-amber-500/10 border border-amber-500/20"
                : "text-green-300 bg-green-500/10 border border-green-500/20"
              }`}>
                {result.status_change ? "Status Changed" : "Stable Status"}
              </span>
              <p className="text-[10px] text-gray-500 mt-1">{result.status_change ? "Transition detected" : "Consistent diagnosis"}</p>
            </div>
          </div>

          {/* Side by side visual cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: t("compare.scan_a"), scan: result.scan_a, tag: "Baseline Scan" },
              { label: t("compare.scan_b"), scan: result.scan_b, tag: "Follow-up Scan" },
            ].map(({ label, scan, tag }) => (
              <div key={scan.id} className="glass rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200">{label}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-white/5 rounded-full text-gray-400 border border-white/5">
                      {tag}
                    </span>
                  </div>

                  <div className="aspect-[4/3] bg-gray-900 overflow-hidden relative">
                    <img
                      src={`${API_BASE}${scan.thumb_url || scan.image_url}`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                    />
                    <div className="absolute bottom-2 left-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white">
                        {scan.crop.icon_emoji} {t(scan.crop.name_key)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={scan.status} />
                        <span className="text-sm font-bold text-gray-200">
                          {scan.status === "healthy" ? t("scan.status_healthy")
                           : scan.status === "potentially_diseased" ? t("scan.status_diseased")
                           : t("scan.status_uncertain")}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        scan.severity.level === "high" ? "badge-high"
                        : scan.severity.level === "moderate" ? "badge-amber"
                        : scan.status === "healthy" ? "badge-healthy"
                        : "badge-uncertain"
                      }`}>
                        {t(`severity.${scan.severity.level}`)}
                      </span>
                    </div>

                    {scan.disease && (
                      <p className="text-xs font-semibold text-gray-300">
                        {t(scan.disease.name_key)}
                      </p>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                      <span>Lesion: {scan.severity.affected_pct != null ? `${scan.severity.affected_pct}%` : "0%"}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
