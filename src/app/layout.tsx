import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  // Makes share images and canonical links absolute (they must be, for Zalo, Facebook and Google).
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: "Quán · Thực đơn QR 4 thứ tiếng",
  appleWebApp: { capable: true, title: "Quán", statusBarStyle: "default" },
  description: "Thực đơn QR cho quán ăn, quán cà phê, nhà hàng: khách nước ngoài xem món bằng tiếng Anh, Hàn, Trung, Nhật. Menus in English, Korean, Chinese and Japanese.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#14211c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
