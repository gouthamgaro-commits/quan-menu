import type { Metadata, Viewport } from "next";
import { configuredSiteUrl } from "@/lib/site";
import "./globals.css";

// Every page reads live data (catalogue, prices, orders), so nothing is pre-built at deploy time.
export const dynamic = "force-dynamic";

const site = configuredSiteUrl();

export const metadata: Metadata = {
  // Absolute share-image and canonical links (WhatsApp and Google need them).
  metadataBase: site ? new URL(site) : undefined,
  title: { default: "Engineering projects for students", template: "%s" },
  description:
    "Final-year and mini projects for CSE, IT, AI & DS, ECE, EEE, Mechanical and Civil, with source code, report, PPT and viva support. Or send your own idea and get a price in 30 seconds.",
  appleWebApp: { capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3446e0" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111c" },
  ],
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
