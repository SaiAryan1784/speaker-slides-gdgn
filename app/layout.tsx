import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GDG Noida Talks & Slides", template: "%s | GDG Noida" },
  description: "Every talk and every slide deck from GDG Noida events. Search speakers and topics, view slides in the browser, download them.",
  openGraph: { title: "GDG Noida Talks & Slides", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f7f9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
