"use client";

import NavBar from "@/components/NavBar";
import { useI18n } from "@/lib/i18n";
import { Database } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 pt-0 lg:pt-16 pb-24 lg:pb-0">
        {children}
      </main>
      <footer className="lg:block hidden glass border-t border-line py-3 px-4 text-center text-[14px] text-muted">
        <Database size={10} className="inline mr-1 text-primary-strong" />
        AgriGuard Central Database & Admin Console
      </footer>
    </div>
  );
}
