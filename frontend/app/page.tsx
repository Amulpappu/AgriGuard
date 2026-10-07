"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  Globe,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  Leaf,
  Wifi,
  Layers,
  FileCheck,
  DollarSign,
  AlertTriangle,
  X,
  Play,
  Share2,
} from "lucide-react";

const SAMPLE_SPECIMENS = [
  {
    slug: "cucumber",
    name: "Cucumber & Gourds",
    emoji: "🥒",
    diagnosis: "Downy Mildew",
    severity: "Moderate (34%)",
    treatment: "Fermented sour buttermilk + Neem seed extract (NSKE 5%)",
    status: "Pathology Managed",
    confidence: "94%",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    slug: "rice",
    name: "Rice / Paddy",
    emoji: "🌾",
    diagnosis: "Sheath Blight",
    severity: "Low (14%)",
    treatment: "Pseudomonas fluorescens foliar spray (5g/L) with morning dew",
    status: "Export Safe",
    confidence: "96%",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    slug: "tomato",
    name: "Tomato & Chilli",
    emoji: "🍅",
    diagnosis: "Early Blight",
    severity: "Low (18%)",
    treatment: "Trichoderma harzianum foliar spray + balanced micronutrient zinc",
    status: "Early Catch",
    confidence: "95%",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
  {
    slug: "potato",
    name: "Potato Crops",
    emoji: "🥔",
    diagnosis: "Late Blight",
    severity: "Controlled (22%)",
    treatment: "Copper oxychloride prophylactic barrier with biological booster",
    status: "Shield Active",
    confidence: "93%",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    slug: "cotton",
    name: "Cotton Plants",
    emoji: "🌿",
    diagnosis: "Bacterial Blight",
    severity: "Prophylactic",
    treatment: "Agrimycin + copper hydroxide foliar spray at boll formation",
    status: "Certified",
    confidence: "97%",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
];

const SUPPORTED_CROPS = [
  { name: "Cucumber & Gourds", emoji: "🥒" },
  { name: "Rice / Paddy", emoji: "🌾" },
  { name: "Tomato", emoji: "🍅" },
  { name: "Potato", emoji: "🥔" },
  { name: "Chilli & Pepper", emoji: "🌶️" },
  { name: "Cotton", emoji: "🌿" },
  { name: "Wheat", emoji: "🌾" },
  { name: "Corn / Maize", emoji: "🌽" },
  { name: "Banana", emoji: "🍌" },
  { name: "Mango", emoji: "🥭" },
  { name: "Grapes", emoji: "🍇" },
  { name: "Cabbage", emoji: "🥬" },
  { name: "Brinjal", emoji: "🍆" },
  { name: "Onion", emoji: "🧅" },
];

export default function LandingPage() {
  const { login, register, isLoggedIn, fullName, logout } = useAuth();
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
  const currentSpecimen = SAMPLE_SPECIMENS[activeSpecimenIdx];

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

  return (
    <div className="min-h-screen bg-[#060D13] text-gray-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06)_0%,transparent_70%)]" />
      </div>

      {/* ─── Top Navigation Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/40 p-0.5 bg-black/50 shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform">
              <img src="/agriguard_logo_4k.png" alt="AgriGuard" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  AgriGuard
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-gray-400 -mt-0.5 hidden sm:block">
                {t("app.tagline")}
              </p>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-gray-300">
            <a href="#discover" className="hover:text-emerald-400 transition-colors">
              Discover Tool
            </a>
            <a href="#crops" className="hover:text-emerald-400 transition-colors">
              Crops & Plants
            </a>
            <a href="#bioshield" className="hover:text-emerald-400 transition-colors">
              Bio-Shield 360°
            </a>
            <a href="#impact" className="hover:text-emerald-400 transition-colors">
              Farmer Impact
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "ta" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 border border-white/5 transition-all"
              title="Change Language"
            >
              <Globe size={14} className="text-emerald-400" />
              <span>{lang === "en" ? "தமிழ்" : "English"}</span>
            </button>

            {/* If logged in: Go to dashboard */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Sparkles size={14} />
                  <span>Dashboard ({fullName?.split(" ")[0] || "Farmer"})</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition"
                  title="Logout"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              /* If not logged in: Log In and Sign Up buttons in top right */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="top-login-btn"
                  onClick={() => openAuth("login")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10 transition-all hover:border-emerald-500/40"
                >
                  <LogIn size={14} className="text-emerald-400" />
                  <span>Log In</span>
                </button>

                <button
                  type="button"
                  id="top-signup-btn"
                  onClick={() => openAuth("register")}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/20"
                >
                  <UserPlus size={14} />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Badges */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles size={14} className="text-emerald-400" />
          <span>Next-Gen Agricultural Intelligence for Indian Farmers</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] text-emerald-200">14+ Crops & Plants</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-[1.15]">
          Detect <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent">Crop & Plant Diseases</span> in Seconds with AI
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl leading-relaxed">
          Screen foliar pathology across vegetables, food grains, and horticulture plants with 95%+ precision.
          Equipped with <strong>Bio-Shield 360°</strong> airborne spore radar and <strong>APMC Mandi</strong> harvest price economics.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/scan"
            id="hero-scan-cta"
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-sm font-bold shadow-xl shadow-emerald-500/25 hover:scale-[1.03] transition-all"
          >
            <Camera size={18} />
            <span>Discover The Tool & Scan Leaf</span>
            <ArrowRight size={16} />
          </Link>

          {!isLoggedIn ? (
            <button
              onClick={() => openAuth("register")}
              id="hero-register-cta"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-all hover:border-emerald-500/40"
            >
              <UserPlus size={16} className="text-emerald-400" />
              <span>Create Free Account</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-all hover:border-emerald-500/40"
            >
              <Leaf size={16} className="text-emerald-400" />
              <span>Open Dashboard</span>
            </Link>
          )}

          <button
            onClick={handleDemoFarmerLogin}
            disabled={authLoading}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all"
          >
            <Play size={13} className="fill-teal-300" />
            <span>1-Click Demo Farmer</span>
          </button>
        </div>

        {/* Feature Pill Matrix */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-4xl text-left">
          <div className="p-3.5 rounded-2xl glass border border-white/5 bg-black/30">
            <p className="text-xs text-gray-400 font-medium">Detection Speed</p>
            <p className="text-lg font-black text-white mt-0.5">Under 2.5 Sec</p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Real-time foliar analysis</p>
          </div>
          <div className="p-3.5 rounded-2xl glass border border-white/5 bg-black/30">
            <p className="text-xs text-gray-400 font-medium">Diagnostic Scope</p>
            <p className="text-lg font-black text-white mt-0.5">14+ Crop & Plants</p>
            <p className="text-[10px] text-teal-400 font-medium mt-0.5">Vegetables, cereals & fruit</p>
          </div>
          <div className="p-3.5 rounded-2xl glass border border-white/5 bg-black/30">
            <p className="text-xs text-gray-400 font-medium">Spore Warning</p>
            <p className="text-lg font-black text-white mt-0.5">48h Ahead</p>
            <p className="text-[10px] text-amber-400 font-medium mt-0.5">Pre-symptomatic radar</p>
          </div>
          <div className="p-3.5 rounded-2xl glass border border-white/5 bg-black/30">
            <p className="text-xs text-gray-400 font-medium">Mandi Safety</p>
            <p className="text-lg font-black text-white mt-0.5">100% Export Safe</p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">0-Day PHI biological spray</p>
          </div>
        </div>
      </section>

      {/* ─── Interactive "Discover The Tool" Section ───────────────────────────── */}
      <section id="discover" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
            Interactive Diagnostic Preview
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
            Discover The AgriGuard Intelligence Tool
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-2">
            Experience how AgriGuard analyzes specimen leaves, predicts infection risks, and generates commercial biological remedies.
          </p>
        </div>

        {/* Specimen Selector Tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {SAMPLE_SPECIMENS.map((specimen, idx) => (
            <button
              key={specimen.slug}
              onClick={() => setActiveSpecimenIdx(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeSpecimenIdx === idx
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              <span className="text-base">{specimen.emoji}</span>
              <span>{specimen.name}</span>
            </button>
          ))}
        </div>

        {/* Interactive Specimen Report Card Preview */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-black to-[#061118] shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Visual Leaf Specimen Card */}
            <div className="space-y-3">
              <div className="aspect-[4/3] rounded-2xl bg-black/60 border border-white/10 overflow-hidden relative shadow-lg group">
                <img
                  src={`/uploads/scans/sample_${currentSpecimen.slug}.jpg`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/agriguard_logo_4k.png";
                  }}
                  alt={currentSpecimen.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-bold text-white border border-emerald-500/30 flex items-center gap-1.5">
                  <span>{currentSpecimen.emoji}</span>
                  <span>{currentSpecimen.name}</span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  {currentSpecimen.confidence} Confidence
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-1">
                <span>Specimen ID: AG-84729</span>
                <span className="text-emerald-400 font-semibold">{currentSpecimen.status}</span>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    Foliar Pathology Screening
                  </span>
                  <h3 className="text-xl font-black text-white">{currentSpecimen.diagnosis}</h3>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${currentSpecimen.badgeColor}`}>
                  Damage: {currentSpecimen.severity}
                </span>
              </div>

              {/* Biological Protocol */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <ShieldCheck size={15} />
                  <span>Certified Biological Protocol</span>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">
                  {currentSpecimen.treatment}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1 font-mono">
                  <span>Dosage: 30 ml / 15L tank</span>
                  <span>PHI: 0 Days (Safe)</span>
                  <span className="text-emerald-400">Cost: ₹75–85 / acre</span>
                </div>
              </div>

              {/* CTA to run live scan */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-gray-400">
                  Have a real plant or crop leaf? Test your specimen immediately.
                </p>
                <Link
                  href="/scan"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-emerald-500/20"
                >
                  <Camera size={14} />
                  <span>Start Live Scan Now</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 14+ Crops & Plants Supported Grid ─────────────────────────────────── */}
      <section id="crops" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
            Multi-Species Coverage
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Crops, Plants & Vegetables Supported
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
            AgriGuard supports diverse plant species — from broadleaf vegetables and food grain crops to commercial horticulture trees.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {SUPPORTED_CROPS.map((crop) => (
            <div
              key={crop.name}
              className="p-3.5 rounded-2xl glass border border-white/5 bg-black/20 flex flex-col items-center text-center hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
            >
              <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">{crop.emoji}</span>
              <span className="text-xs font-bold text-gray-200 line-clamp-1">{crop.name}</span>
              <span className="text-[10px] text-emerald-400 mt-0.5">AI Verified</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bio-Shield 360° Innovation Section ────────────────────────────────── */}
      <section id="bioshield" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="glass rounded-3xl p-8 sm:p-10 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-black relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                Pioneering Innovation
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Bio-Shield 360° Epidemic Radar & Mandi Economics
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Why wait for foliar lesions to destroy yield? AgriGuard connects to field microclimate IoT stations to calculate Leaf Wetness Duration (LWD) and Tom-Cast DSV pressure, issuing warnings 48 hours before visible spores emerge.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">48-Hour Pre-Symptomatic Warning</p>
                    <p className="text-[11px] text-gray-400">Prevents spore germination using low-cost biological inoculants.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Downwind Village Cluster Bio-Radar</p>
                    <p className="text-[11px] text-gray-400">Maps spore plume trajectories across neighboring farms for collective defense.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">APMC Mandi Harvest Safe (0-Day PHI)</p>
                    <p className="text-[11px] text-gray-400">Never suffer chemical residue rejection or distress discounts at market.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/field"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all"
                >
                  <Wifi size={14} className="text-emerald-400" />
                  <span>Inspect Bio-Shield 360° Station</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Mini Visual Metric Display */}
            <div className="glass rounded-2xl p-6 border border-white/10 bg-black/60 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Live Cluster Epidemiology</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">Station #01 Active</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-gray-400 font-medium">Spore Incubation Window</p>
                  <p className="text-lg font-black text-amber-400 mt-0.5">18 Hours Left</p>
                  <p className="text-[10px] text-gray-400">High Risk Threshold</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-gray-400 font-medium">Chemical Runoff Saved</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">1.8 kg / acre</p>
                  <p className="text-[10px] text-gray-400">100% Groundwater Safe</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                💡 <strong>Agronomic Insight:</strong> Prophylactic application of bio-fermented buttermilk + Trichoderma viride provides 12-day cuticle protection at just ₹85/acre, compared to ₹2,200 for systemic chemical fungicides.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Impact & National Theme Section ───────────────────────────────────── */}
      <section id="impact" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
          Theme Alignment
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
          Samriddh Annadata & Swachh Bharat
        </h2>
        <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-2xl mx-auto">
          Empowering India&apos;s farming families with accessible, affordable intelligence that eliminates toxic chemical dependency and boosts net farm profitability.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-5 rounded-2xl glass border border-white/5 bg-black/30">
            <span className="text-2xl">💰</span>
            <h3 className="text-base font-bold text-white mt-2">₹2,115 / acre Profit Boost</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Replacing expensive late-stage synthetic sprays with early bio-formulations radically reduces input expenditures.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass border border-white/5 bg-black/30">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-base font-bold text-white mt-2">0-Day Harvest Interval</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Biological remedies leave zero chemical residues, ensuring 100% compliance with APMC market quality standards.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass border border-white/5 bg-black/30">
            <span className="text-2xl">🌱</span>
            <h3 className="text-base font-bold text-white mt-2">Clean Soil & Water</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Drastically limits pesticide leaching into village drinking wells and preserves beneficial soil mycorrhizae.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl glass border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-black space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Protect Your Crops & Plants?
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            Take a photo of any suspect leaf or plant part right now. Receive certified biological guidance and treatment prescriptions in under 3 seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/scan"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-xl shadow-emerald-500/25 hover:scale-[1.03] transition-all"
            >
              <Camera size={18} />
              <span>Launch Plant Scanner</span>
              <ArrowRight size={16} />
            </Link>
            {!isLoggedIn && (
              <button
                onClick={() => openAuth("register")}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 transition-all"
              >
                <UserPlus size={16} />
                <span>Create Separate Account</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/5 py-8 px-4 text-center text-xs text-gray-400 space-y-3 bg-black/60">
        <div className="flex items-center justify-center gap-3">
          <span className="font-bold text-white text-sm">AgriGuard</span>
          <span>•</span>
          <span>{t("app.tagline")}</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">14+ Crops & Plants</span>
        </div>
        <p className="max-w-2xl mx-auto text-[11px] text-gray-400 leading-relaxed">
          {t("app.disclaimer")}
        </p>
        <p className="text-[10px] text-gray-500 font-mono">
          © {new Date().getFullYear()} AgriGuard • Built for Indian Agriculture & Sustainable Growth
        </p>
      </footer>

      {/* ─── Interactive Auth Modal (Log In & Sign Up) ─────────────────────────── */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass rounded-3xl p-6 sm:p-7 border border-emerald-500/30 max-w-sm w-full space-y-5 shadow-2xl relative bg-[#09131A]">
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
