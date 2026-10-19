"use client";

import dynamic from "next/dynamic";
import { useRichMotion } from "@/lib/useRichMotion";

// WebGL aurora is only downloaded on tablet/desktop with motion allowed.
const Aurora = dynamic(() => import("@/components/Aurora"), { ssr: false });

/**
 * Hero background: a plain soft gradient everywhere (always rendered, zero JS),
 * with the green-tinted React Bits Aurora layered on top when rich motion is OK.
 */
export default function HeroBackdrop() {
  const rich = useRichMotion();
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_0%,rgb(var(--ag-leaf))_0%,rgb(var(--ag-canvas))_60%)]" />
      {rich && (
        <div className="absolute inset-x-0 top-0 h-[85%] opacity-70">
          <Aurora
            colorStops={["#9CC58F", "#2E7D32", "#C9DEC0"]}
            amplitude={0.9}
            blend={0.55}
            speed={0.6}
            lightMode
            mouseInteraction={false}
          />
        </div>
      )}
      {/* Fade into the page so text below the fold sits on plain canvas */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}
