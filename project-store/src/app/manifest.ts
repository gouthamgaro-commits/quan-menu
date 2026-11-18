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
    description: "Coding & engineering projects with source code, docs, demo and a walkthrough. Make an offer, pay and track your project.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff6e5",
    theme_color: "#fff6e5",
    categories: ["education", "productivity", "shopping"],
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
