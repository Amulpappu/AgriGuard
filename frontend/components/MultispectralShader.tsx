"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Eye, Layers, Activity, Sliders, ShieldAlert } from "lucide-react";

interface MultispectralShaderProps {
  imageSrc: string;
  onAnalysisComplete?: (stats: { stressPct: number; ngrdiMean: number }) => void;
}

export function MultispectralShader({ imageSrc, onAnalysisComplete }: MultispectralShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"rgb" | "ngrdi" | "exg">("ngrdi");
  const [blend, setBlend] = useState<number>(85); // 0 = 100% RGB, 100 = 100% False Color
  const [stats, setStats] = useState<{ stressPct: number; ngrdiMean: number; healthyPct: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!imageSrc) return;
    setProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Limit max render size for real-time 60fps performance
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      // Draw original
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const pixels = imgData.data;

      let totalLeafPixels = 0;
      let stressedPixels = 0;
      let ngrdiSum = 0;

      const alphaBlend = blend / 100;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Mask out non-plant background (pure dark shadows or pure white studio background)
        const brightness = (r + g + b) / 3;
        const isPlant = brightness > 25 && brightness < 240 && (g > b * 0.85 || g > r * 0.7);

        if (!isPlant) continue;

        totalLeafPixels++;

        // 1. Normalized Green-Red Difference Index: (G - R) / (G + R)
        const denom = g + r || 1;
        const ngrdi = (g - r) / denom;
        ngrdiSum += ngrdi;

        // 2. Excess Green Index: 2G - R - B
        const exg = 2 * g - r - b;

        // Pre-visual stress condition: NGRDI drops below 0.08 indicates chlorophyll decay
        const isStressed = ngrdi < 0.08 || exg < 15;
        if (isStressed) {
          stressedPixels++;
        }

        if (mode === "rgb") {
          continue; // Keep original
        }

        // Color mapping for False-Color Radiometric Heatmap:
        // High NGRDI (> 0.15) = Vibrant Emerald Green
        // Medium NGRDI (0.05 to 0.15) = Golden Yellow / Amber
        // Low/Stressed NGRDI (< 0.05) = Vivid Crimson Red / Magenta
        let heatR = 0;
        let heatG = 0;
        let heatB = 0;

        if (mode === "ngrdi") {
          // Normalize NGRDI [-0.1 to +0.3] to [0 to 1]
          const t = Math.max(0, Math.min(1, (ngrdi + 0.1) / 0.4));
          if (t < 0.35) {
            // High Stress -> Red to Orange
            const subT = t / 0.35;
            heatR = 240;
            heatG = Math.round(50 + subT * 120);
            heatB = 50;
          } else if (t < 0.65) {
            // Moderate Stress -> Yellow to Lime
            const subT = (t - 0.35) / 0.3;
            heatR = Math.round(240 - subT * 180);
            heatG = 220;
            heatB = 40;
          } else {
            // Robust Healthy Chlorophyll -> Deep Green
            const subT = (t - 0.65) / 0.35;
            heatR = Math.round(40 - subT * 30);
            heatG = Math.round(200 + subT * 40);
            heatB = Math.round(50 + subT * 40);
          }
        } else {
          // Excess Green Mode (ExG)
          const normExg = Math.max(0, Math.min(1, (exg + 20) / 100));
          heatR = Math.round((1 - normExg) * 255);
          heatG = Math.round(normExg * 240);
          heatB = Math.round(normExg * 60);
        }

        // Alpha blend with original leaf texture
        pixels[i] = Math.round(r * (1 - alphaBlend) + heatR * alphaBlend);
        pixels[i + 1] = Math.round(g * (1 - alphaBlend) + heatG * alphaBlend);
        pixels[i + 2] = Math.round(b * (1 - alphaBlend) + heatB * alphaBlend);
      }

      ctx.putImageData(imgData, 0, 0);

      const stressPct = totalLeafPixels > 0 ? (stressedPixels / totalLeafPixels) * 100 : 0;
      const ngrdiMean = totalLeafPixels > 0 ? ngrdiSum / totalLeafPixels : 0;
      const computedStats = {
        stressPct: Math.round(stressPct * 10) / 10,
        ngrdiMean: Math.round(ngrdiMean * 1000) / 1000,
        healthyPct: Math.round((100 - stressPct) * 10) / 10,
      };

      setStats(computedStats);
      if (onAnalysisComplete) onAnalysisComplete(computedStats);
      setProcessing(false);
    };
  }, [imageSrc, mode, blend, onAnalysisComplete]);

  return (
    <div className="glass rounded-2xl p-5 border border-emerald-500/30 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Photo colour filter (illustrative, not real NDVI)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                EDGE-NGRDI
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Reveals pre-symptomatic cellular stress before visible spots appear
            </p>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMode("rgb")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
              mode === "rgb" ? "bg-white/20 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            RGB Lens
          </button>
          <button
            type="button"
            onClick={() => setMode("ngrdi")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
              mode === "ngrdi" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-emerald-300"
            }`}
          >
            <Layers size={13} /> NGRDI Heatmap
          </button>
          <button
            type="button"
            onClick={() => setMode("exg")}
            className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
              mode === "exg" ? "bg-cyan-600 text-white shadow" : "text-gray-400 hover:text-cyan-300"
            }`}
          >
            ExG Vigor
          </button>
        </div>
      </div>

      {/* Canvas Rendering Area */}
      <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center min-h-[280px]">
        <canvas ref={canvasRef} className="max-w-full max-h-[420px] object-contain rounded-lg shadow-2xl" />

        {/* Legend Overlay */}
        {mode !== "rgb" && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-[11px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-gray-200">High Chlorophyll Vigor (Intact Cuticle)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="text-gray-200">Pre-Visual Cellular Disruption</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-gray-200">Active Cellular Breakdown / Lesion Core</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Shader Blend Slider & Metrics */}
      <div className="space-y-3 pt-1">
        {mode !== "rgb" && (
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
            <Sliders size={16} className="text-gray-400" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Spectral Shader Overlay Intensity</span>
                <span className="font-mono text-emerald-400 font-bold">{blend}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={blend}
                onChange={(e) => setBlend(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <p className="text-[11px] text-gray-400">Mean NGRDI</p>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">{stats.ngrdiMean}</p>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <p className="text-[11px] text-gray-400">Healthy Canopy</p>
              <p className="text-base font-extrabold text-white mt-0.5">{stats.healthyPct}%</p>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-rose-500/20">
              <p className="text-[11px] text-rose-300 flex items-center justify-center gap-1">
                <ShieldAlert size={12} /> Pre-Lesion Stress
              </p>
              <p className="text-base font-extrabold text-rose-400 mt-0.5">{stats.stressPct}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
