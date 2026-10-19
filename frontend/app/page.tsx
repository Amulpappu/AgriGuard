"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import AuthModal, { AuthMode } from "@/components/AuthModal";
import SpotlightCard from "@/components/SpotlightCard";
import HeroLeaf from "@/components/landing/HeroLeaf";
import HeroHeadline from "@/components/landing/HeroHeadline";
import StatNumber from "@/components/landing/StatNumber";

const STEPS = [1, 2, 3] as const;
const FEATURES = ["f1", "f2", "f3"] as const;

// ─── Facts strip: only true statements about the product ────────────────────
// `count` animates with CountUp; facts without a number show `big` as text.
const FACTS: { count?: number; big?: string; label: string }[] = [
  { count: 14, label: "home.fact_crops" },
  { count: 2, label: "home.fact_langs" },
  { big: "home.fact_alerts_big", label: "home.fact_alerts" },
  { big: "home.fact_fast_big", label: "home.fact_fast" },
];

const SUPPORT_EMAIL = "lohithgamer12@gmail.com";

export default function LandingPage() {
  const { isLoggedIn, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authNext, setAuthNext] = useState("/dashboard");
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  function openAuth(mode: AuthMode, next = "/dashboard") {
    setAuthMode(mode);
    setAuthNext(next);
    setAuthOpen(true);
  }

  // Anyone can check a leaf; guests are asked to sign in only to save the result.
  const checkCrop = () => router.push("/scan");
  const langToggle = (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ta" : "en")}
      className="btn-ghost px-3 text-[15px]"
      title={t("home.language")}
    >
      <Globe size={18} aria-hidden="true" />
      <span lang={lang === "en" ? "ta" : "en"}>{lang === "en" ? "தமிழ்" : "English"}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ─── Top nav ─────────────────────────────────────────────── */}
      <header data-site-header className="sticky top-0 z-40 bg-canvas border-b border-line/70">
        <nav
          aria-label={t("nav.main")}
          className="mx-auto max-w-6xl flex items-center gap-2 px-4 sm:px-6 h-16"
        >
          <Link href="/" className="flex items-center gap-2 mr-auto min-h-tap">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-display text-xl font-semibold">{t("app.name")}</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 mr-2 text-[15px]">
            <a href="#how" className="btn-ghost px-3 font-medium">{t("home.nav_how")}</a>
            <a href="#features" className="btn-ghost px-3 font-medium">{t("home.nav_features")}</a>
          </div>
          {langToggle}
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="btn-primary px-4 text-[15px]">{t("landing.dashboard")}</Link>
              <button type="button" onClick={logout} className="hidden sm:inline-flex btn-ghost px-3 text-[15px]">
                {t("landing.sign_out")}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => openAuth("login")} className="btn-ghost px-3 text-[15px]">
                {t("landing.log_in")}
              </button>
              <button type="button" onClick={() => openAuth("register")} className="hidden sm:inline-flex btn-secondary px-4 text-[15px]">
                {t("auth.tab_signup")}
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* ─── Hero ────────────────────────────────────────────────── */}
        <section className="relative">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-16 sm:pt-16 lg:pt-12 sm:pb-28 grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center lg:gap-10">
            {/* Leaf: above the headline on phones/tablets, right column on desktop */}
            <div className="-mb-2 sm:mb-0 lg:order-last">
              <HeroLeaf />
            </div>
            <div className="relative z-10">
            <HeroHeadline text={t("home.h1")} />
            <p className="mt-5 max-w-[38ch] text-body-lg text-ink/85">{t("home.sub")}</p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <button type="button" onClick={checkCrop} className="btn-primary btn-lg w-full sm:w-auto">
                <Camera size={22} aria-hidden="true" />
                {t("home.cta")}
              </button>
              <a href="#how" className="btn-ghost justify-center sm:justify-start text-[17px] underline underline-offset-4 decoration-line-strong">
                {t("home.cta_secondary")}
              </a>
            </div>
            <p className="mt-6 text-[15px] text-muted">{t("home.screening_note")}</p>
            </div>
          </div>
        </section>

        {/* ─── How it works ────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl">{t("home.how_h")}</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((n) => (
              <li key={n} className="relative md:pr-6">
                <span className="font-display text-5xl font-semibold text-primary leading-none tabular-nums" aria-hidden="true">
                  {n}
                </span>
                <h3 className="mt-3 text-2xl">
                  <span className="sr-only">{t("home.step_label").replace("{n}", String(n))}: </span>
                  {t(`home.step${n}_h`)}
                </h3>
                <p className="mt-2 text-body text-muted max-w-[34ch]">{t(`home.step${n}_p`)}</p>
                {n < 3 && (
                  <ArrowRight
                    size={22}
                    aria-hidden="true"
                    className="hidden md:block absolute right-0 top-3 text-line-strong"
                  />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Features ────────────────────────────────────────────── */}
        <section id="features" className="scroll-mt-20 bg-leaf/60 border-y border-line/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-3xl sm:text-4xl">{t("home.feat_h")}</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map((f) => (
                <SpotlightCard
                  key={f}
                  theme="light"
                  spotlightColor="#2E7D32"
                  intensity={0.35}
                  className="!p-6 sm:!p-7 !rounded-2xl"
                  style={
                    {
                      "--spotlight-card-surface": "#FFFFFF",
                      "--spotlight-card-border": "rgba(28,42,30,0.10)",
                      "--spotlight-card-shadow": "none",
                    } as React.CSSProperties
                  }
                >
                  <h3 className="text-2xl">{t(`home.${f}_h`)}</h3>
                  <p className="mt-3 text-body text-muted">{t(`home.${f}_p`)}</p>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Facts ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl">{t("home.facts_h")}</h2>
          <dl className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 border-t border-line pt-10">
            {FACTS.map((f) => (
              <div key={f.label} className="flex flex-col-reverse">
                <dt className="mt-2 text-[16px] text-ink">{t(f.label)}</dt>
                <dd className="font-display font-semibold text-primary-strong leading-none">
                  {f.count !== undefined ? (
                    <span className="text-5xl"><StatNumber value={f.count} /></span>
                  ) : (
                    <span className="text-3xl sm:text-[2.1rem] leading-tight">{t(f.big!)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── Closing CTA ─────────────────────────────────────────── */}
        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-16 flex flex-col sm:flex-row sm:items-center gap-6 sm:justify-between">
            <h2 className="text-3xl sm:text-4xl text-white max-w-[20ch]">{t("home.end_h")}</h2>
            <button type="button" onClick={checkCrop} className="btn btn-lg bg-white text-primary-strong hover:bg-leaf w-full sm:w-auto">
              <Camera size={22} aria-hidden="true" />
              {t("home.cta")}
            </button>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-xl font-semibold">{t("app.name")}</p>
            <p className="mt-2 text-[15px] text-muted max-w-[40ch]">{t("home.foot_tagline")}</p>
            <p className="mt-4 text-[15px] text-ink">
              {t("support.issue")}{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=AgriGuard%20website%20issue`}
                className="inline-flex items-center min-h-[44px] text-primary underline underline-offset-2 hover:text-primary-strong [overflow-wrap:anywhere]"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2 md:justify-end">
            {langToggle}
            <button type="button" onClick={checkCrop} className="btn-ghost px-3 text-[15px]">{t("home.cta")}</button>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-[15px] text-muted leading-relaxed"><span className="block max-w-3xl">
            {t("scan.footer_disclaimer")}
          </span></p>
        </div>
      </footer>

      <AuthModal open={authOpen} mode={authMode} onModeChange={setAuthMode} onClose={closeAuth} next={authNext} />
    </div>
  );
}
