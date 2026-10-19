import type { Metadata, Viewport } from "next";
import { Fraunces, Mukta_Malar } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

// Self-hosted at build time by next/font: no render-blocking Google Fonts request.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-display",
});
const body = Mukta_Malar({
  subsets: ["latin", "tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "AgriGuard – AI Crop Health Monitor",
  description:
    "AI-assisted crop disease screening for Indian smallholder farmers. Samriddh Annadata, Samriddh Bharat.",
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png", icon: "/logo.png", shortcut: "/favicon.ico" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgriGuard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F5EE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-canvas text-ink min-h-screen">
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
