import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AgriGuard – AI Crop Health Monitor",
  description:
    "AI-assisted crop disease screening for Indian smallholder farmers. Samriddh Annadata, Samriddh Bharat.",
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png", icon: "/logo.png", shortcut: "/favicon.ico" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgriGuard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
