"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRichMotion } from "@/lib/useRichMotion";

// Three.js is only downloaded where the 3D leaf will actually run (768px+, motion allowed).
const LeafScene = dynamic(() => import("@/components/LeafScene"), { ssr: false });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Scroll budget for the fade when the leaf sits above the headline (phones/tablets),
// so it is gone before the text scrolls up underneath it.
const STACKED_FADE_PX = 130;
const MAX_TURN_DEG = 15;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/**
 * Hero leaf: the original AgriGuard leaf.
 * - Everywhere: a snapshot image of the 3D leaf (11 KB), so the page shows it instantly.
 * - 768px+ with motion allowed: the live 3D leaf fades in over it once loaded.
 * - On scroll (not under reduced motion): the leaf pins just below the navbar while it
 *   turns ~15°, shrinks slightly and fades out. The pin is capped at the bottom of the
 *   hero and the fade ends before the cap, so it never slides under the navbar or into
 *   the next section. Leaf and shadow share one wrapper, so they always move together.
 *   Only transform and opacity change.
 */
export default function HeroLeaf() {
  const rich = useRichMotion();
  const reduce = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const anchorRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const mover = moverRef.current;
    const hero = anchor?.closest("section");
    if (!anchor || !mover || !hero) return;
    if (reduce) {
      mover.style.transform = "";
      mover.style.opacity = "";
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const nav = document.querySelector("[data-site-header]");
      const pinTop = (nav ? nav.getBoundingClientRect().bottom : 64) + 12;
      const a = anchor.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const y = window.scrollY;
      // Scroll distance before the leaf would reach the navbar, and room left below it in the hero
      const untilPin = Math.max(0, a.top + y - pinTop);
      let room = Math.max(0, h.bottom - a.bottom - 8);
      const stacked = window.innerWidth < 1024;
      if (stacked) room = Math.min(room, STACKED_FADE_PX);
      const total = Math.max(1, untilPin + room);
      const t = clamp01(y / total);
      const shift = Math.min(Math.max(0, y - untilPin), room);
      mover.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) rotate(${(t * MAX_TURN_DEG).toFixed(2)}deg) scale(${(1 - 0.12 * t).toFixed(3)})`;
      mover.style.opacity = (1 - smooth(0.15, 1, t)).toFixed(3);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <div ref={anchorRef} className="relative mx-auto aspect-[4/5] w-[180px] sm:w-[240px] lg:w-full lg:max-w-[360px]" aria-hidden="true">
      <div ref={moverRef} className={`absolute inset-0 origin-center ${reduce ? "" : "will-change-transform"}`}>
        {/* Soft ground shadow: lives inside the moving wrapper so it travels with the leaf */}
        <div className="absolute left-[22%] right-[22%] bottom-[3%] h-[6%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--ag-ink)/0.16),transparent)]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, must paint before JS */}
        <img
          src="/images/hero-leaf.webp"
          alt=""
          width={720}
          height={900}
          decoding="async"
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${rich && ready ? "opacity-0" : "opacity-100"}`}
        />
        {rich && !reduce && (
          <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
            <LeafScene onReady={onReady} />
          </div>
        )}
      </div>
    </div>
  );
}
