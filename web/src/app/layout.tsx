import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["500", "600", "700", "800", "900"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", weight: ["400", "500"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PB Mobiles & Repairing Lab — New & Used Phones, Repairs, Accessories",
    template: "%s | PB Mobiles",
  },
  description:
    "Shop new and used phones, genuine accessories and expert phone repairs at PB Mobiles & Repairing Lab. Secure online payment, Care Card benefits and the PB Phone Passport.",
  openGraph: {
    type: "website",
    siteName: "PB Mobiles & Repairing Lab",
    images: [{ url: "/brand/og.jpg", width: 1200, height: 884, alt: "PB Mobiles & Repairing Lab" }],
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#071A2B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
