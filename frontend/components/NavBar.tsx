"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Leaf, LayoutDashboard, Camera, History, GitCompareArrows, Wifi, LogOut, Globe, Database } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/scan",      icon: Camera,          key: "nav.scan" },
  { href: "/history",   icon: History,          key: "nav.history" },
  { href: "/compare",   icon: GitCompareArrows, key: "nav.compare" },
  { href: "/field",     icon: Wifi,             key: "nav.field" },
  { href: "/admin",     icon: Database,         key: "nav.database" },
];

export default function NavBar() {
  const { logout, fullName } = useAuth();
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="hidden sm:flex fixed top-0 inset-x-0 z-50 h-14 glass border-b border-white/5 items-center px-4 gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-6 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg border border-emerald-500/30 flex items-center justify-center bg-black/40 group-hover:scale-105 transition-transform duration-200">
            <img src="/agriguard_logo_4k.png" alt="AgriGuard Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-sm gradient-text tracking-wide">{t("app.name")}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  active
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <Globe size={13} />
            {lang === "en" ? "தமிழ்" : "EN"}
          </button>
          {fullName && <span className="text-xs text-gray-500 hidden md:block">{fullName}</span>}
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10"
            title={t("nav.logout")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/5 flex items-center justify-around py-2 px-2 safe-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[3.5rem] ${
                active ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-none">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
