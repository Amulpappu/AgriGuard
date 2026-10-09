"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Leaf, LayoutDashboard, Camera, History, GitCompareArrows, Wifi, LogOut, Globe, Database, Shield, Sun, Moon } from "lucide-react";

interface NavItem {
  href: string;
  icon: any;
  key: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/scan",      icon: Camera,          key: "nav.scan" },
  { href: "/history",   icon: History,          key: "nav.history" },
  { href: "/compare",   icon: GitCompareArrows, key: "nav.compare" },
  { href: "/field",     icon: Wifi,             key: "nav.field" },
  { href: "/admin",     icon: Database,         key: "nav.database", adminOnly: true },
];

export default function NavBar() {
  const { logout, fullName, isLohith } = useAuth();
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [outdoor, setOutdoor] = useState(false);
  useEffect(() => {
    const on = localStorage.getItem("ag_outdoor") === "1";
    setOutdoor(on);
    document.documentElement.classList.toggle("outdoor", on);
  }, []);
  function toggleOutdoor() {
    const next = !outdoor;
    setOutdoor(next);
    localStorage.setItem("ag_outdoor", next ? "1" : "0");
    document.documentElement.classList.toggle("outdoor", next);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  // Filter items: Database access is strictly reserved for Lohith
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) {
      return isLohith;
    }
    return true;
  });

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="hidden sm:flex fixed top-0 inset-x-0 z-50 h-14 glass border-b border-white/5 items-center px-4 gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-6 group">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(62,160,148,0.25)]" aria-hidden />
          <span className="font-display text-xl font-semibold text-gray-100">{t("app.name")}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {visibleNavItems.map(({ href, icon: Icon, key, adminOnly }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-green-500/15 text-green-400 border border-green-500/30 shadow-sm"
                    : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                }`}
              >
                <Icon size={14} className={adminOnly ? "text-amber-400" : ""} />
                {t(key)}
                {adminOnly && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-semibold tracking-wider">
                    LOHITH
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={toggleOutdoor}
            aria-label="Outdoor mode"
            title="Outdoor mode (high contrast)"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-100 px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            {outdoor ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-100 px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Globe size={13} />
            {lang === "en" ? "தமிழ்" : "EN"}
          </button>
          {fullName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 hidden md:flex">
              {isLohith && <Shield size={11} className="text-amber-400" />}
              <span>{fullName}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            title={t("nav.logout")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/5 flex items-center justify-around py-2 px-2 safe-bottom">
        {visibleNavItems.filter((i) => !i.adminOnly && i.href !== "/compare").map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[4rem] min-h-[48px] justify-center ${
                active ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-semibold leading-none">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
