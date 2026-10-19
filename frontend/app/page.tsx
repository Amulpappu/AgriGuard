"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./landing.css";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import AuthModal, { AuthMode } from "@/components/AuthModal";
import {
  Camera,
  Globe,
  LogIn,
  UserPlus,
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

const LeafScene = dynamic(() => import("@/components/LandingLeafScene"), { ssr: false });

export default function LandingPage() {
  const { isLoggedIn, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authNext, setAuthNext] = useState("/dashboard");
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  // Active specimen preview
  const [activeSpecimenIdx, setActiveSpecimenIdx] = useState(0);
  const spec = SAMPLE_SPECIMENS[activeSpecimenIdx];

  function openAuth(mode: AuthMode, next = "/dashboard") {
    setAuthMode(mode);
    setAuthNext(next);
    setAuthOpen(true);
  }

  // Anyone can scan a leaf; guests are asked to sign in only to save the result.
  const launchScan = () => router.push("/scan");
  const exploreTelemetry = () => (isLoggedIn ? router.push("/field") : openAuth("register", "/field"));

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
          </div>
          <dl className="lp-metrics">
            <div><dt>14</dt><dd>{t("lp.m1")}</dd></div>
            <div><dt>34</dt><dd>{t("lp.m2")}</dd></div>
            <div><dt>2</dt><dd>{t("lp.m3")}</dd></div>
          </dl>
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

      <footer className="lp-foot">
        <p>{t("scan.footer_disclaimer")}</p>
        <p style={{ marginTop: 10 }}>
          {t("support.issue")}{" "}
          <a href="mailto:lohithgamer12@gmail.com?subject=AgriGuard%20website%20issue">lohithgamer12@gmail.com</a>
        </p>
      </footer>

      <AuthModal open={authOpen} mode={authMode} onModeChange={setAuthMode} onClose={closeAuth} next={authNext} />
    </div>
  );
}
