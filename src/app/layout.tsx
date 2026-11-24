import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/config";
// Fonts are served from this site (npm @fontsource), not Google: no extra connection before the
// menu can draw, nothing for Google to log, and each script range only loads when it's used.
// Be Vietnam Pro for text; Fraunces (with optical sizes) for headings. Both cover Vietnamese.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource-variable/fraunces/opsz.css";
import "./globals.css";

export const metadata: Metadata = {
  // Makes share images and canonical links absolute (they must be, for Zalo, Facebook and Google).
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: "Quán · Thực đơn QR 4 thứ tiếng",
  appleWebApp: { capable: true, title: "Quán", statusBarStyle: "default" },
  description: "Thực đơn QR cho quán ăn, quán cà phê, nhà hàng: khách nước ngoài xem món bằng tiếng Anh, Hàn, Trung, Nhật. Menus in English, Korean, Chinese and Japanese.",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0c1210" }, { color: "#163a2f" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
