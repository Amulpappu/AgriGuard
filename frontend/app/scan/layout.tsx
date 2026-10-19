"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import AuthModal, { AuthMode } from "@/components/AuthModal";
import { useI18n } from "@/lib/i18n";
import { Globe, Leaf } from "lucide-react";

/**
 * Scan pages are open to guests: anyone can check a leaf without an account.
 * Signed-in users get the full app shell; guests get a light header with sign-in.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, ready } = useAuth();
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  // Wait for the stored session so signed-in users don't flash the guest header.
  if (!ready) return null;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center gap-1 h-14 lg:h-16 px-3 lg:px-8 border-b border-line bg-canvas">
          <Link href="/" className="flex items-center gap-2 mr-auto min-h-tap px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />
            <span className="font-display text-lg lg:text-xl font-semibold text-ink">{t("app.name")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="btn-ghost px-3 text-[15px]"
          >
            <Globe size={18} aria-hidden />
            <span lang={lang === "en" ? "ta" : "en"}>{lang === "en" ? "தமிழ்" : "English"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthOpen(true);
            }}
            className="btn-secondary px-4 text-[15px]"
          >
            {t("landing.log_in")}
          </button>
        </header>
        <main className="flex-1">{children}</main>
        <AuthModal open={authOpen} mode={authMode} onModeChange={setAuthMode} onClose={closeAuth} next={pathname} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      {/* Content area padded for top bar (desktop) and bottom nav (mobile) */}
      <main className="flex-1 pt-0 lg:pt-16 pb-24 lg:pb-0">
        {children}
      </main>
      {/* Persistent disclaimer footer */}
      <footer className="lg:block hidden glass border-t border-line py-3 px-4 text-center text-[14px] text-muted">
        <Leaf size={10} className="inline mr-1 text-primary-strong" />
        {t("app.disclaimer")}
      </footer>
    </div>
  );
}
