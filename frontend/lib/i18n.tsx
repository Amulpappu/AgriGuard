/**
 * i18n hook: loads locale JSON from /locales/{lang}.json.
 * Persists language choice to localStorage.
 * Supports nested keys via dot notation: t("scan.title")
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import enStrings from "@/locales/en.json";
import taStrings from "@/locales/ta.json";

type Lang = "en" | "ta";
type Strings = typeof enStrings;

const STORAGE_KEY = "agriguard_lang";
const STRINGS: Record<Lang, any> = { en: enStrings, ta: taStrings };

function getNestedValue(obj: any, path: string): string {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return path;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : path;
}

interface I18nContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nContext>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && STRINGS[stored]) setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const val = getNestedValue(STRINGS[lang], key);
      if (val === key && lang !== "en") {
        return getNestedValue(STRINGS["en"], key);
      }
      return val;
    },
    [lang]
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

export function useLang(): Lang {
  return useContext(Ctx).lang;
}
