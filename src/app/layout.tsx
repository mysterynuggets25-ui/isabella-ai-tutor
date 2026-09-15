import type { Metadata, Viewport } from "next";
import { Fraunces, Lexend } from "next/font/google";
import "./globals.css";

// Warm serif for headings (the mockup's display face).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

// Lexend for body/UI — designed to reduce reading stress (accessibility).
const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Isabella's Tutor",
  description: "A private AI tutor and parent console.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Isabella" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3eee2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}
