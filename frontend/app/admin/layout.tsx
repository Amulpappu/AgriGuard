"use client";

import NavBar from "@/components/NavBar";
import { useI18n } from "@/lib/i18n";
import { Database } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 pt-0 sm:pt-14 pb-20 sm:pb-0">
        {children}
      </main>
      <footer className="sm:block hidden glass border-t border-white/5 py-2 px-4 text-center text-xs text-gray-600">
        <Database size={10} className="inline mr-1 text-emerald-600" />
        AgriGuard Central Database & Admin Console
      </footer>
    </div>
  );
}
