"use client";

import { useEffect, useState } from "react";
import { getScans, compareScans, resolveImageUrl, ScanListItem, CompareOut } from "@/lib/api";
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
    status === "healthy" ? <CheckCircle2 size={16} className="text-primary-strong" />
    : status === "potentially_diseased" ? <AlertTriangle size={16} className="text-accent-ink" />
    : <HelpCircle size={16} className="text-muted" />;

  function DeltaBadge({ delta }: { delta: number | null | undefined }) {
    if (delta == null) return <span className="text-muted text-sm font-semibold">—</span>;
    const abs = Math.abs(delta).toFixed(1);
    if (delta > 0.5) return (
      <span className="inline-flex items-center gap-1 text-danger text-sm sm:text-base font-bold bg-danger-soft px-2.5 py-0.5 rounded-lg border border-danger/40">
        <TrendingUp size={16} />+{abs}%
      </span>
    );
    if (delta < -0.5) return (
      <span className="inline-flex items-center gap-1 text-primary-strong text-sm sm:text-base font-bold bg-leaf px-2.5 py-0.5 rounded-lg border border-primary/40">
        <TrendingDown size={16} />-{abs}%
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-muted text-sm sm:text-base font-bold bg-surface px-2.5 py-0.5 rounded-lg">
        <Minus size={16} />{abs}%
      </span>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pt-2">
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink tracking-tight leading-[1.05]">{t("compare.title")}</h1>
        <p className="text-xs sm:text-sm text-muted mt-1">{t("history.compare_select")}</p>
      </div>

      {/* Selectors Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-ink block mb-1.5 uppercase tracking-wider">{t("compare.scan_a")}</label>
            <select
              value={selA}
              onChange={(e) => setSelA(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-primary"
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
            <label className="text-xs font-semibold text-ink block mb-1.5 uppercase tracking-wider">{t("compare.scan_b")}</label>
            <select
              value={selB}
              onChange={(e) => setSelB(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-primary"
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
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-strong text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg "
        >
          <GitCompareArrows size={17} />
          {loading ? t("common.loading") : "Run Progression Comparison"}
        </button>

        {error && <p className="text-sm text-danger text-center">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Delta summary metrics */}
          <div className="glass rounded-2xl p-5 grid grid-cols-3 gap-4 text-center border border-line">
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">{t("compare.severity_delta")}</p>
              <DeltaBadge delta={result.severity_delta} />
              <p className="text-[10px] text-muted mt-1">Leaf lesion change</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">Confidence Δ</p>
              <DeltaBadge delta={result.confidence_delta * 100} />
              <p className="text-[10px] text-muted mt-1">Probability shift</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">{t("compare.status_change")}</p>
              <span className={`inline-block text-sm sm:text-base font-bold px-3 py-0.5 rounded-lg ${
                result.status_change ? "text-accent-ink bg-accent-soft border border-accent/60"
                : "text-primary-strong bg-leaf border border-primary/40"
              }`}>
                {result.status_change ? "Status Changed" : "Stable Status"}
              </span>
              <p className="text-[10px] text-muted mt-1">{result.status_change ? "Transition detected" : "Consistent diagnosis"}</p>
            </div>
          </div>

          {/* Side by side visual cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: t("compare.scan_a"), scan: result.scan_a, tag: "Baseline Scan" },
              { label: t("compare.scan_b"), scan: result.scan_b, tag: "Follow-up Scan" },
            ].map(({ label, scan, tag }) => (
              <div key={scan.id} className="glass rounded-2xl overflow-hidden border border-line flex flex-col justify-between">
                <div>
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{label}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-surface rounded-full text-muted border border-line">
                      {tag}
                    </span>
                  </div>

                  <div className="aspect-[4/3] bg-surface overflow-hidden relative">
                    <img
                      src={resolveImageUrl(scan.thumb_url || scan.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/agriguard_logo_4k.png"; }}
                    />
                    <div className="absolute bottom-2 left-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink/50 backdrop-blur-md text-ink">
                        {scan.crop.icon_emoji} {t(scan.crop.name_key)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={scan.status} />
                        <span className="text-sm font-bold text-ink">
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
                      <p className="text-xs font-semibold text-ink">
                        {t(scan.disease.name_key)}
                      </p>
                    )}

                    <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-muted">
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
