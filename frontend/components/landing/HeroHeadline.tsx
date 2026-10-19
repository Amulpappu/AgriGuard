"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/lib/i18n";
import { useRichMotion } from "@/lib/useRichMotion";

// GSAP is only downloaded where the animation will actually play.
const SplitText = dynamic(() => import("@/components/SplitText"), { ssr: false });

const BASE = "font-display text-ink font-semibold tracking-tight";
// Tamil words are longer and the script is taller, so it runs one size smaller.
const SIZE = {
  en: "text-[2.35rem] leading-[1.08] sm:text-6xl lg:text-7xl max-w-[16ch]",
  ta: "text-[1.85rem] leading-[1.3] sm:text-5xl lg:text-6xl max-w-[20ch]",
};

/**
 * Hero h1. Phones, slow connections and reduced-motion users get plain text
 * immediately; desktop gets the React Bits SplitText word reveal. Splits by
 * words (never chars) so Tamil letters with vowel signs stay intact.
 */
export default function HeroHeadline({ text }: { text: string }) {
  const rich = useRichMotion();
  const lang = useLang();
  const classes = `${BASE} ${SIZE[lang] ?? SIZE.en}`;
  if (!rich) return <h1 className={classes}>{text}</h1>;
  return (
    <SplitText
      key={text}
      text={text}
      tag="h1"
      className={`${classes} block`}
      splitType="words"
      textAlign="left"
      delay={60}
      duration={0.9}
      effect="rise"
      trigger="load"
    />
  );
}
