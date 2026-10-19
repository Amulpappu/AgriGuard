"use client";

import { useEffect, useState, type ComponentType } from "react";

type Props = { value: number; suffix?: string };
type CountUpType = ComponentType<{ to: number; from?: number; duration?: number; separator?: string; trigger?: "view" | "load" }>;

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * Stat figure. Shows the real number straight away (server render, slow networks),
 * then swaps in the React Bits CountUp once its code has loaded; CountUp only
 * starts counting when the figure scrolls into view and respects reduced motion.
 */
export default function StatNumber({ value, suffix = "" }: Props) {
  const [CountUp, setCountUp] = useState<CountUpType | null>(null);

  useEffect(() => {
    let alive = true;
    import("@/components/CountUp").then((m) => {
      if (alive) setCountUp(() => m.default as CountUpType);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <span className="tabular-nums">
      <span className="sr-only">{`${fmt(value)}${suffix}`}</span>
      <span aria-hidden="true">
        {CountUp ? <CountUp to={value} from={0} duration={1.6} separator="," trigger="view" /> : fmt(value)}
        {suffix}
      </span>
    </span>
  );
}
