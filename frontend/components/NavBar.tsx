"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LayoutDashboard, Camera, History, GitCompareArrows, Wifi, LogOut, Globe, Database, Shield } from "lucide-react";

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
      <header className="hidden lg:flex fixed top-0 inset-x-0 z-50 h-16 glass border-b items-center px-8 gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-4 min-h-tap">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />
          <span className="font-display text-xl font-semibold text-ink">{t("app.name")}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label={t("nav.main")}>
          {visibleNavItems.map(({ href, icon: Icon, key, adminOnly }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-3 min-h-[44px] min-w-[44px] justify-center rounded-lg text-[15px] font-medium ${
                  active ? "text-ink" : "text-muted hover:text-ink hover:bg-ink/5"
                }`}
              >
                <Icon size={18} aria-hidden />
                <span className="whitespace-nowrap">{t(key)}</span>
                {adminOnly && <Shield size={13} className="text-accent-ink" aria-label="admin" />}
                {active && <span className="absolute left-3 right-3 -bottom-[10px] h-0.5 bg-ink rounded-full" aria-hidden />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="flex items-center gap-1.5 text-[15px] text-ink min-h-[44px] px-3 rounded-lg hover:bg-ink/5"
          >
            <Globe size={16} aria-hidden />
            {lang === "en" ? "தமிழ்" : "English"}
          </button>
          {fullName && (
            <span className="hidden md:inline text-[15px] text-muted max-w-[14ch] truncate">{fullName}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-muted hover:text-danger min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-danger-soft"
            title={t("nav.logout")}
            aria-label={t("nav.logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Compact top bar (phones/tablets): language and logout stay reachable */}
      <header className="lg:hidden flex items-center gap-1 h-14 px-3 border-b border-line bg-canvas">
        <Link href="/dashboard" className="flex items-center gap-2 mr-auto min-h-tap px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />
          <span className="font-display text-lg font-semibold text-ink">{t("app.name")}</span>
        </Link>
        <button
          onClick={() => setLang(lang === "en" ? "ta" : "en")}
          className="flex items-center gap-1.5 text-[15px] text-ink min-h-[48px] px-3 rounded-lg hover:bg-ink/5"
        >
          <Globe size={18} aria-hidden />
          {lang === "en" ? "தமிழ்" : "English"}
        </button>
        <button
          onClick={handleLogout}
          className="text-muted hover:text-danger min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
          aria-label={t("nav.logout")}
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Bottom nav (phones/tablets) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t flex items-stretch justify-around px-1 safe-bottom"
        aria-label={t("nav.main")}
      >
        {visibleNavItems.filter((i) => !i.adminOnly && i.href !== "/compare").map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] text-[13px] font-semibold ${
                active ? "text-primary-strong" : "text-muted"
              }`}
            >
              <Icon size={24} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="leading-none">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
