"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { setUserPersona, UserPersona } from "@/lib/api";

export type AuthMode = "login" | "register";

interface Props {
  open: boolean;
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onClose: () => void;
  /** Where to go after signing in (email or Google). */
  next?: string;
}

const INPUT =
  "w-full min-h-[52px] bg-surface border border-line-strong rounded-lg px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink";

/** Log in / sign up dialog: email + password, or Google (Supabase OAuth). */
export default function AuthModal({ open, mode, onModeChange, onClose, next = "/dashboard" }: Props) {
  const { login, register, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [persona, setPersona] = useState<UserPersona>("farmer");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      // Keep keyboard focus inside the dialog
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input, a[href]");
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function switchMode(m: AuthMode) {
    onModeChange(m);
    setError("");
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      if (mode === "register") setUserPersona(persona);
      await loginWithGoogle(next); // leaves the page for Google, then returns to `next`
    } catch (err: any) {
      setError(err?.message || t("auth.error_google"));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        setUserPersona(persona);
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      onClose();
      router.push(next);
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || (mode === "register" ? t("auth.error_register") : t("auth.error_login")));
    } finally {
      setLoading(false);
    }
  }

  const personaBtn = (value: UserPersona, title: string, sub: string, emoji: string) => (
    <button
      type="button"
      aria-pressed={persona === value}
      onClick={() => setPersona(value)}
      className={`min-h-[64px] p-3 rounded-lg border text-left ${
        persona === value ? "border-primary bg-leaf ring-1 ring-primary" : "border-line-strong bg-surface hover:bg-canvas"
      }`}
    >
      <span className="text-lg leading-none" aria-hidden="true">{emoji}</span>
      <strong className="block text-[15px] text-ink leading-tight mt-1">{title}</strong>
      <span className="block text-[13px] text-muted leading-snug">{sub}</span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="bg-surface w-full sm:max-w-md max-h-[100svh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-float p-5 sm:p-7 space-y-5 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("auth.close")}
          className="absolute top-3 right-3 w-12 h-12 flex items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          <X size={20} />
        </button>

        <div className="pr-12">
          <h2 id="auth-title" className="text-2xl">
            {mode === "login" ? t("auth.welcome_back") : t("auth.create_title")}
          </h2>
          <p className="text-[15px] text-muted mt-1">{mode === "login" ? t("auth.login_sub") : t("auth.register_sub")}</p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-canvas border border-line" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`min-h-[44px] rounded-md text-[15px] font-semibold ${
                mode === m ? "bg-surface text-ink shadow-float" : "text-muted hover:text-ink"
              }`}
            >
              {m === "login" ? t("auth.tab_login") : t("auth.tab_signup")}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-danger-soft border border-danger/30 text-[15px] text-danger leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="btn-secondary w-full"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          {googleLoading ? t("auth.google_opening") : t("auth.google")}
        </button>

        <div className="flex items-center gap-3 text-[14px] text-muted">
          <span className="flex-1 h-px bg-line" />
          {t("auth.or_email")}
          <span className="flex-1 h-px bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <label className="block space-y-1.5">
                <span className="text-[15px] font-medium text-ink">{t("auth.full_name")}</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.name_placeholder")}
                  className={INPUT}
                />
              </label>
              <fieldset className="space-y-1.5">
                <legend className="text-[15px] font-medium text-ink mb-1.5">{t("auth.persona_q")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {personaBtn("farmer", t("auth.persona_farmer"), t("auth.persona_farmer_sub"), "🚜")}
                  {personaBtn("student_gardener", t("auth.persona_student"), t("auth.persona_student_sub"), "🪴")}
                </div>
              </fieldset>
            </>
          )}

          <label className="block space-y-1.5">
            <span className="text-[15px] font-medium text-ink">{t("auth.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className={INPUT}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[15px] font-medium text-ink">{t("auth.password")}</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button type="submit" disabled={loading || googleLoading} className="btn-primary w-full">
            {loading ? t("auth.processing") : mode === "login" ? t("auth.submit_login") : t("auth.submit_register")}
          </button>
        </form>

      </div>
    </div>
  );
}
