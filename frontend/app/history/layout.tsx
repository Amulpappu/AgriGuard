"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useI18n } from "@/lib/i18n";
import { Leaf } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    // Wait until the stored session is read, otherwise a reload bounces signed-in users.
    if (ready && !isLoggedIn) router.replace("/");
  }, [ready, isLoggedIn, router]);

  if (!isLoggedIn) return null;

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
