"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRichMotion } from "@/lib/useRichMotion";

// Three.js is only downloaded where the 3D leaf will actually run.
const LeafScene = dynamic(() => import("@/components/LeafScene"), { ssr: false });

/** Lightweight leaf drawing: the phone / reduced-motion leaf, and the poster while 3D loads. */
function LeafIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 300" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-leaf-fill" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#5FA357" />
          <stop offset="0.5" stopColor="#2E7D32" />
          <stop offset="1" stopColor="#1D4F20" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 100 150)">
        <path
          d="M100 16 C150 52 176 112 168 172 C160 228 128 266 100 284 C72 266 40 228 32 172 C24 112 50 52 100 16 Z"
          fill="url(#hero-leaf-fill)"
        />
        <g stroke="#E6EFE0" strokeLinecap="round" fill="none">
          <path d="M100 30 L100 290" strokeWidth="3.2" strokeOpacity="0.6" />
          <path
            d="M100 80 Q78 70 60 52 M100 80 Q122 70 140 52 M100 118 Q74 106 50 88 M100 118 Q126 106 150 88 M100 156 Q72 144 44 128 M100 156 Q128 144 156 128 M100 194 Q76 184 52 170 M100 194 Q124 184 148 170 M100 230 Q82 222 66 210 M100 230 Q118 222 134 210"
            strokeWidth="1.6"
            strokeOpacity="0.4"
          />
        </g>
      </g>
    </svg>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Hero leaf. Tablet/desktop with motion allowed: lazy-loaded 3D leaf that turns
 * slowly and floats down as the page scrolls (transform/opacity only on the DOM side).
 * Phones and reduced-motion: the static SVG leaf, no WebGL download.
 */
export default function HeroLeaf() {
  const rich = useRichMotion();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const floatRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Float down + shadow spread, driven by hero scroll progress.
  useEffect(() => {
    if (!rich) return;
    const el = floatRef.current;
    const hero = el?.closest("section");
    if (!el || !hero) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = hero.getBoundingClientRect();
      const p = clamp01(-r.top / (r.height * 0.9));
      // Drift down at about a third of scroll speed, staying inside the hero
      el.style.transform = `translate3d(0, ${(p * r.height * 0.32).toFixed(1)}px, 0)`;
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate3d(0, ${(p * r.height * 0.32).toFixed(1)}px, 0) scale(${(1 - p * 0.25).toFixed(3)})`;
        shadowRef.current.style.opacity = (1 - p * 0.6).toFixed(3);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [rich]);

  return (
    <div className="relative mx-auto w-[150px] h-[190px] sm:w-[220px] sm:h-[280px] lg:w-full lg:h-[460px]" aria-hidden="true">
      {/* Soft contact shadow for the light page */}
      <div
        ref={shadowRef}
        className={`absolute left-1/2 bottom-0 -translate-x-1/2 h-6 w-[60%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--ag-ink)/0.18),transparent)] blur-[2px] ${rich ? "will-change-transform" : ""}`}
      />
      <div ref={floatRef} className={`absolute inset-0 ${rich ? "will-change-transform" : "hero-leaf-bob"}`}>
        <LeafIllustration
          className={`absolute inset-x-[12%] top-[2%] bottom-[10%] h-[88%] w-[76%] drop-shadow-[0_18px_22px_rgba(28,42,30,0.18)] transition-opacity duration-500 ${
            rich && ready ? "opacity-0" : "opacity-100"
          }`}
        />
        {rich && (
          <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
            <LeafScene onReady={onReady} />
          </div>
        )}
      </div>
    </div>
  );
}
