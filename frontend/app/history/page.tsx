"use client";

import { useState } from "react";
import Link from "next/link";
import { getScans, getCrops, resolveImageUrl, ScanListItem, CropOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCachedQuery } from "@/lib/useCachedQuery";
import { CheckCircle2, AlertTriangle, HelpCircle, ChevronRight, Filter, RefreshCw } from "lucide-react";

export default function HistoryPage() {
  const { t } = useI18n();
  const { userId } = useAuth();
  const [filterCrop, setFilterCrop] = useState("all");

  // User-scoped cache key prevents cross-user scan leaks
  const scansKey = userId ? `${userId}:scans:${filterCrop}` : null;

  // Stale-while-revalidate: each filter's last result renders instantly while Supabase refreshes.
  const cropsQ = useCachedQuery<CropOut[]>("crops", getCrops);
  const scansQ = useCachedQuery<ScanListItem[]>(
    scansKey,
    () => getScans({ crop: filterCrop === "all" ? undefined : filterCrop, limit: 100 }),
    { refreshInterval: 60_000 },
  );
  const crops = cropsQ.data ?? [];
  const scans = scansQ.data ?? [];
  const loading = scansQ.isLoading;

  const statusIcon = (s: string) =>
    s === "healthy" ? <CheckCircle2 size={16} className="text-green-400" />
    : s === "potentially_diseased" ? <AlertTriangle size={16} className="text-orange-400" />
    : <HelpCircle size={16} className="text-gray-400" />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12">
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.05]">{t("history.title")}</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Review past crop & plant scans, progression over time, and AI health assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300">
            {scans.length} Total Records
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mr-2 flex-shrink-0">
          <Filter size={14} /> Filter:
        </div>
        <button
          onClick={() => setFilterCrop("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
            filterCrop === "all"
              ? "bg-green-500/20 text-green-300 border border-green-500/40"
              : "bg-gray-900/60 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
          }`}
        >
          {t("history.all_crops")}
        </button>
        {crops.map((c) => (
          <button
            key={c.slug}
            onClick={() => setFilterCrop(c.slug)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              filterCrop === c.slug
                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                : "bg-gray-900/60 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
            }`}
          >
            {c.icon_emoji} {t(c.name_key)}
          </button>
        ))}
      </div>

      {scansQ.error ? (
        <div className={`rounded-xl p-3 text-sm flex items-center justify-between gap-3 border ${
          scansQ.data ? "bg-amber-900/20 border-amber-700/50 text-amber-200" : "bg-red-900/30 border-red-700 text-red-300"
        }`}>
          <span>{scansQ.data ? "Showing your last synced records — live refresh is temporarily unavailable." : "Could not reach the database. Check your connection and retry."}</span>
          <button
            onClick={() => scansQ.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition"
          >
            <RefreshCw size={13} className={scansQ.isValidating ? "animate-spin" : ""} /> Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : scans.length === 0 && !scansQ.error ? (
        <div className="glass rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <p className="text-gray-400 text-sm">{t("history.no_results")}</p>
          <Link href="/scan" className="inline-block text-xs font-semibold text-green-400 hover:underline">
            Scan a new leaf now →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/scan/${scan.id}`}
              className="glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:bg-white/[0.05] transition-all hover:scale-[1.01] active:scale-[0.99] border border-white/5 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border border-white/10">
                  {scan.thumb_url || scan.image_url ? (
                    <img
                      src={resolveImageUrl(scan.thumb_url || scan.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {scan.crop.icon_emoji}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(scan.status)}
                    <span className="text-sm font-bold text-gray-200 truncate">
                      {scan.crop.icon_emoji} {t(scan.crop.name_key)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium mt-1 truncate">
                    {scan.disease ? t(scan.disease.name_key) : "Uncertain Identification"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {new Date(scan.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                  scan.severity.level === "high" ? "badge-high"
                  : scan.severity.level === "moderate" ? "badge-amber"
                  : scan.status === "healthy" ? "badge-healthy"
                  : "badge-uncertain"
                }`}>
                  {t(`severity.${scan.severity.level}`)}
                </span>
                <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  View <ChevronRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
