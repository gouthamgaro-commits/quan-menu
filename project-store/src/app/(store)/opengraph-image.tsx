import { getSettings } from "@/lib/data";
import { OG_SIZE, shareImage } from "@/lib/og";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

export const alt = "Engineering projects with source code, report and PPT";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const s = await getSettings();
  return shareImage({
    brand: s.brandName,
    title: s.tagline || "Engineering projects, built for you",
    subtitle: "Final-year & mini projects with source code, report, PPT and viva support. Or price your own idea in 30 seconds.",
    chips: ["CSE", "ECE", "EEE", "Mech", "Civil"],
  });
}
