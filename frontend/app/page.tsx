"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./landing.css";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  Globe,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  X,
  Play,
  Radar,
  Calculator,
  Languages,
  Activity,
  ArrowRight,
} from "lucide-react";

// Illustrative screening results for the specimen explorer (not live data).
const SAMPLE_SPECIMENS = [
  {
    slug: "cucumber",
    emoji: "🥒",
    disease: "cucumber_downy_mildew",
    confidence: 94,
    damage: 34,
    pills: ["Angular yellow patches", "Grey underside growth", "Humid canopy"],
    care: "Remove heavily affected leaves, improve airflow between vines and water at the base in the morning.",
  },
  {
    slug: "rice",
    emoji: "🌾",
    disease: "rice_blast",
    confidence: 96,
    damage: 14,
    pills: ["Diamond-shaped lesions", "Grey centres", "Leaf blade"],
    care: "Keep bunds clean, avoid excess late-season nitrogen and maintain steady field water.",
  },
  {
    slug: "tomato",
    emoji: "🍅",
    disease: "tomato_early_blight",
    confidence: 95,
    damage: 18,
    pills: ["Concentric rings", "Lower leaves first", "Yellow halo"],
    care: "Prune lower leaves touching the soil, mulch the bed and avoid wetting the foliage.",
  },
  {
    slug: "potato",
    emoji: "🥔",
    disease: "potato_late_blight",
    confidence: 93,
    damage: 22,
    pills: ["Water-soaked margins", "White sporulation", "Cool nights"],
    care: "Scout neighbouring rows daily, remove infected haulms and avoid evening irrigation.",
  },
  {
    slug: "cotton",
    emoji: "🌿",
    disease: "cotton_bacterial_blight",
    confidence: 97,
    damage: 9,
    pills: ["Angular leaf spots", "Vein darkening", "Low spread"],
    care: "Use clean seed, clear crop debris after harvest and avoid working in wet fields.",
  },
];

// Other crops, plants & vegetables with screening profiles (keys in locales `crop.*`).
const SUPPORTED_CROPS: Array<[string, string]> = [
  ["wheat", "🌾"], ["corn", "🌽"], ["pepper", "🌶️"], ["brinjal", "🍆"], ["onion", "🧅"],
  ["banana", "🍌"], ["mango", "🥭"], ["grape", "🍇"], ["cabbage", "🥬"],
];

const FEATURES = [
  { icon: Radar, key: "f1" },
  { icon: Calculator, key: "f2" },
  { icon: Languages, key: "f3" },
  { icon: Activity, key: "f4" },
];

const LeafScene = dynamic(() => import("@/components/LeafScene"), { ssr: false });

export default function LandingPage() {
  const { login, register, isLoggedIn, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("demo@agriguard.in");
  const [authPassword, setAuthPassword] = useState("Demo1234!");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Active specimen preview
  const [activeSpecimenIdx, setActiveSpecimenIdx] = useState(0);
  const spec = SAMPLE_SPECIMENS[activeSpecimenIdx];

  function openAuth(mode: "login" | "register") {
    setAuthMode(mode);
    setAuthError("");
    if (mode === "register") {
      if (authEmail === "demo@agriguard.in") setAuthEmail("");
      if (authPassword === "Demo1234!") setAuthPassword("");
    } else {
      if (!authEmail) setAuthEmail("demo@agriguard.in");
      if (!authPassword) setAuthPassword("Demo1234!");
    }
    setAuthModalOpen(true);
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "register") {
        await register(authEmail, authPassword, authName);
      } else {
        await login(authEmail, authPassword);
      }
      setAuthModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err?.message || (authMode === "register" ? "Account creation failed." : "Login failed. Please verify credentials."));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDemoFarmerLogin() {
    setAuthLoading(true);
    try {
      await login("demo@agriguard.in", "Demo1234!");
      setAuthModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err?.message || "Demo login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  const launchScan = () => (isLoggedIn ? router.push("/scan") : openAuth("login"));
  const exploreTelemetry = () => (isLoggedIn ? router.push("/field") : openAuth("register"));

  const stepOf = (n: number) => t("lp.step_of").replace("{n}", String(n));

  return (
    <div className="lp">
      <LeafScene />

      <nav className="lp-nav" aria-label="Main">
        <Link href="/" className="lp-mark"><span />AgriGuard</Link>
        <div className="lp-links">
          <a href="#lp-specimens">{t("lp.nav_crops")}</a>
          <a href="#lp-story">{t("lp.nav_how")}</a>
          <a href="#lp-checks">{t("lp.nav_checks")}</a>
          <a href="#lp-faq">{t("lp.nav_faq")}</a>
        </div>
        <div className="lp-ctl">
          <button className="lp-btn sm" onClick={() => setLang(lang === "en" ? "ta" : "en")}>
            <Globe size={14} /> {lang === "en" ? "தமிழ்" : "EN"}
          </button>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="lp-btn sm fill">{t("landing.dashboard")}</Link>
              <button className="lp-btn sm" onClick={logout}>{t("landing.sign_out")}</button>
            </>
          ) : (
            <>
              <button className="lp-btn sm" onClick={() => openAuth("login")}>
                <LogIn size={14} /> {t("landing.log_in")}
              </button>
              <button className="lp-btn sm fill" onClick={() => openAuth("register")}>
                <UserPlus size={14} /> {t("lp.signup")}
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="lp-hero" id="lp-top">
        <div>
          <span className="lp-badge"><i />{t("lp.badge")}</span>
          <h1>{t("lp.h1")}</h1>
          <p>{t("lp.sub")}</p>
          <div className="lp-row">
            <button className="lp-btn fill" onClick={launchScan}>
              <Camera size={18} /> {t("lp.cta_scan")}
            </button>
            <button className="lp-btn" onClick={exploreTelemetry}>
              <Activity size={18} /> {t("lp.cta_tel")}
            </button>
            {!isLoggedIn && (
              <button className="lp-btn ghost" onClick={handleDemoFarmerLogin} disabled={authLoading}>
                <Play size={16} /> {t("lp.demo")}
              </button>
            )}
          </div>
          <dl className="lp-metrics">
            <div><dt>14</dt><dd>{t("lp.m1")}</dd></div>
            <div><dt>34</dt><dd>{t("lp.m2")}</dd></div>
            <div><dt>2</dt><dd>{t("lp.m3")}</dd></div>
          </dl>
          {authError && !authModalOpen && <p style={{ color: "#fca5a5", margin: "12px 0 0", fontSize: 14 }}>{authError}</p>}
        </div>
      </section>

      <section className="lp-paper" id="lp-specimens">
        <h2>{t("lp.spec_h")}</h2>
        <p className="lp-lead">{t("lp.spec_p")}</p>
        <div className="lp-spec">
          <div className="lp-chips" role="tablist" aria-label={t("lp.spec_h")}>
            {SAMPLE_SPECIMENS.map((s, i) => (
              <button
                key={s.slug}
                role="tab"
                aria-selected={i === activeSpecimenIdx}
                className={`lp-chip${i === activeSpecimenIdx ? " on" : ""}`}
                onClick={() => setActiveSpecimenIdx(i)}
              >
                <span aria-hidden="true">{s.emoji}</span> {t(`crop.${s.slug}`)}
                <b>{s.confidence}%</b>
              </button>
            ))}
          </div>
          <article className="lp-card" role="tabpanel" key={spec.slug}>
            <div className="lp-card-top">
              <span className="lp-emoji" aria-hidden="true">{spec.emoji}</span>
              <div>
                <small>{t(`crop.${spec.slug}`)} · {t("lp.spec_sample")}</small>
                <h3>{t(`disease.${spec.disease}`)}</h3>
              </div>
            </div>
            <div className="lp-meter">
              <div><span>{t("lp.spec_conf")}</span><b>{spec.confidence}%</b></div>
              <i><em style={{ width: `${spec.confidence}%` }} /></i>
            </div>
            <div className="lp-meter warn">
              <div><span>{t("lp.spec_dmg")}</span><b>{spec.damage}%</b></div>
              <i><em style={{ width: `${spec.damage}%` }} /></i>
            </div>
            <ul className="lp-pills">
              {spec.pills.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <p className="lp-care"><strong>{t("lp.spec_care")}:</strong> {spec.care}</p>
            <button className="lp-btn fill sm" onClick={launchScan}>
              {t("lp.cta_scan")} <ArrowRight size={14} />
            </button>
          </article>
        </div>
        <div className="lp-also">
          <span>{t("lp.supported")}:</span>
          {SUPPORTED_CROPS.map(([slug, emoji]) => (
            <span key={slug} className="lp-pill-soft"><span aria-hidden="true">{emoji}</span> {t(`crop.${slug}`)}</span>
          ))}
        </div>
      </section>

      <section className="lp-paper nt" id="lp-features">
        <h2>{t("lp.feat_h")}</h2>
        <div className="lp-feat">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div key={key}>
              <span className="lp-ico"><Icon size={22} /></span>
              <h3>{t(`lp.${key}h`)}</h3>
              <p>{t(`lp.${key}p`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-story" id="lp-story">
        <div className="lp-stick">
          <div className="lp-cap">
            <i id="lp-bar" />
            <div className="lp-step"><h2>{t("lp.s1h")}</h2><p>{t("lp.s1p")}</p><small>{stepOf(1)}</small></div>
            <div className="lp-step"><h2>{t("lp.s2h")}</h2><p>{t("lp.s2p")}</p><small>{stepOf(2)}</small></div>
            <div className="lp-step"><h2>{t("lp.s3h")}</h2><p>{t("lp.s3p")}</p><small>{stepOf(3)}</small></div>
          </div>
        </div>
      </section>

      <section className="lp-paper">
        <h2>{t("lp.hon_h")}</h2>
        <p className="lp-lead">{t("lp.hon_p")}</p>
        <div className="lp-nums">
          {[["1", "lp.n1"], ["3", "lp.n2"], ["0", "lp.n3"], ["2", "lp.n4"]].map(([n, k]) => (
            <div key={k}><b>{n}</b><span>{t(k)}</span></div>
          ))}
        </div>
      </section>

      <section className="lp-paper nt" id="lp-checks">
        <h2>{t("lp.chk_h")}</h2>
        <div className="lp-rail" tabIndex={0} aria-label={t("lp.chk_h")}>
          {[1, 2, 3, 4].map((i) => (
            <div className="lp-tile" key={i}>
              <div><h3>{t(`lp.c${i}h`)}</h3><p>{t(`lp.c${i}p`)}</p></div>
            </div>
          ))}
          <div className="lp-tile soon">
            <span className="lp-tag">{t("lp.soon")}</span>
            <div><h3>{t("lp.c5h")}</h3><p>{t("lp.c5p")}</p></div>
          </div>
        </div>
      </section>

      <section className="lp-paper nt" id="lp-faq">
        <h2>{t("lp.faq_h")}</h2>
        <div className="lp-faq">
          {[1, 2, 3, 4].map((i) => (
            <details key={i}><summary>{t(`lp.q${i}`)}</summary><p>{t(`lp.a${i}`)}</p></details>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        <h2>{t("lp.end_h")}</h2>
        <div className="lp-row" style={{ marginTop: 34 }}>
          <button className="lp-btn fill" onClick={launchScan}>
            <Camera size={18} /> {t("lp.cta_scan")}
          </button>
          <button className="lp-btn" onClick={exploreTelemetry}>
            <Activity size={18} /> {t("lp.cta_tel")}
          </button>
        </div>
      </section>

      <footer className="lp-foot"><p>{t("scan.footer_disclaimer")}</p></footer>

      {/* ─── Interactive Auth Modal (Log In & Sign Up) ─────────────────────────── */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass rounded-3xl p-6 sm:p-7 border border-emerald-500/30 max-w-sm w-full space-y-5 shadow-2xl relative bg-[#1D2030]">
            {/* Close Button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
              title="Close modal"
            >
              <X size={18} />
            </button>

            {/* Modal Title & Toggle Tabs */}
            <div className="text-center pt-1">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-emerald-500/40 p-0.5 bg-black/40 mx-auto mb-2 shadow-lg">
                <img src="/agriguard_logo_4k.png" alt="AgriGuard" className="w-full h-full object-cover rounded-xl" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {authMode === "login" ? "Welcome Back to AgriGuard" : "Create Farmer Account"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {authMode === "login" ? "Access your diagnostic history and crop radar" : "Start monitoring your fields with AI"}
              </p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === "login"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  authMode === "register"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-xs text-rose-200 leading-relaxed">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">{t("auth.full_name")}</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">{t("auth.email")}</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.01] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
              >
                {authLoading ? "Processing..." : authMode === "login" ? "Sign In to AgriGuard" : "Create Your Account"}
              </button>
            </form>

            {/* Quick Demo Options */}
            <div className="pt-2 border-t border-white/10 text-center space-y-2">
              <button
                type="button"
                onClick={handleDemoFarmerLogin}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                Quick 1-Click Demo Login (demo@agriguard.in)
              </button>
              <p className="text-[11px] text-gray-500">
                Or jump directly to{" "}
                <Link href="/scan" className="text-gray-300 hover:text-emerald-400 underline" onClick={() => setAuthModalOpen(false)}>
                  Anonymous Leaf Scanner
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
