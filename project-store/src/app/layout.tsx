import type { Metadata, Viewport } from "next";
import { configuredSiteUrl } from "@/lib/site";
import "./globals.css";

// Every page reads live data (catalogue, prices, orders), so nothing is pre-built at deploy time.
export const dynamic = "force-dynamic";

const site = configuredSiteUrl();

export const metadata: Metadata = {
  // Absolute share-image and canonical links (WhatsApp and Google need them).
  metadataBase: site ? new URL(site) : undefined,
  title: { default: "Coding & engineering projects, built for you", template: "%s" },
  description:
    "Working coding and engineering projects for students and self-taught devs worldwide: web, mobile, AI, data, cybersecurity, web3, games, cloud, core CS and hardware. Source code, docs, demo and a walkthrough. Prices are negotiable.",
  appleWebApp: { capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff6e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=JetBrains+Mono:wght@500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
