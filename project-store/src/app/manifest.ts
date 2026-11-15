import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { DEFAULTS } from "@/lib/settings";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

/** Lets students install the store on their phone's home screen and open it like an app. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings().catch(() => DEFAULTS);
  return {
    name: `${s.brandName} · ${s.tagline}`,
    short_name: s.brandName.slice(0, 12),
    description: "Engineering projects with source code, report, PPT and viva support. Order, pay by UPI and track your project.",
    lang: "en-IN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060914",
    theme_color: "#060914",
    categories: ["education", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Browse projects", url: "/projects" },
      { name: "Price my idea", url: "/custom" },
      { name: "Track my order", url: "/track" },
    ],
  };
}
