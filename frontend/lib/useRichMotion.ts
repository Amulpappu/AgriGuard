"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

/**
 * True only on tablet/desktop screens when the user has not asked for reduced motion.
 * Starts false so the server render and low-end phones get the lightweight version,
 * and heavy effects (WebGL, GSAP) are never downloaded on small screens.
 */
export function useRichMotion(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setOk(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return ok;
}
