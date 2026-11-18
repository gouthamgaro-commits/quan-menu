import { getSettings } from "@/lib/data";
import { OG_SIZE, shareImage } from "@/lib/og";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

export const alt = "Coding and engineering projects with source code, docs and a demo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const s = await getSettings();
  return shareImage({
    brand: s.brandName,
    title: "need a project? we got you.",
    subtitle: "Working projects for CS students, bootcamps & self-taught devs worldwide. Code, docs, demo and a walkthrough.",
    chips: ["web", "AI", "games", "hardware"],
    negotiable: s.negotiable,
  });
}
