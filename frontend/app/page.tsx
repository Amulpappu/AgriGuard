"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Leaf, Eye, EyeOff, Globe, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, register, isLoggedIn } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("demo@agriguard.in");
  const [password, setPassword] = useState("Demo1234!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (isLoggedIn) router.replace("/dashboard");
  }, [isLoggedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Auth submit error:", err);
      const msg = err?.message || (typeof err === "string" ? err : null);
      setError(msg || (isRegisterMode ? "Registration failed." : "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setIsRegisterMode(!isRegisterMode);
    setError("");
    if (!isRegisterMode) {
      // Switching to register, clear demo credentials
      if (email === "demo@agriguard.in") setEmail("");
      if (password === "Demo1234!") setPassword("");
    } else {
      // Switching back to demo login
      setEmail("demo@agriguard.in");
      setPassword("Demo1234!");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(22,163,74,0.08)_0%,transparent_70%)]" />
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setLang(lang === "en" ? "ta" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-medium text-gray-400 hover:text-white hover:border-green-500/50"
        >
          <Globe size={14} />
          {lang === "en" ? "தமிழ்" : "English"}
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-emerald-500/30 p-1 bg-black/40 mb-3 pulse-glow shadow-2xl">
            <img src="/agriguard_logo_4k.png" alt="AgriGuard Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">{t("app.name")}</h1>
          <p className="text-xs text-gray-500 mt-1 text-center">{t("app.tagline")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-100">
              {isRegisterMode ? t("auth.register") : t("auth.login")}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {isRegisterMode ? "New Farmer" : "Member"}
            </span>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">{t("auth.full_name")}</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
                placeholder="Ramesh Kumar"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">{t("auth.password")}</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              isRegisterMode ? t("auth.registering") : t("auth.logging_in")
            ) : isRegisterMode ? (
              <>
                <UserPlus size={16} />
                {t("auth.register")}
              </>
            ) : (
              <>
                <LogIn size={16} />
                {t("auth.login")}
              </>
            )}
          </button>

          {/* Switch mode button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs text-green-400 hover:text-green-300 hover:underline transition-colors"
            >
              {isRegisterMode ? t("auth.switch_to_login") : t("auth.switch_to_register")}
            </button>
          </div>

          {!isRegisterMode && (
            <p className="text-center text-xs text-gray-600 pt-1">{t("auth.demo_hint")}</p>
          )}
        </form>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-600 mt-6 px-2 leading-relaxed">
          {t("app.disclaimer")}
        </p>
      </div>
    </main>
  );
}
