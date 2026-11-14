import { branchName } from "@/lib/catalog";
import { getProjectBySlug, getSettings } from "@/lib/data";
import { OG_SIZE, shareImage } from "@/lib/og";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

export const alt = "Project details and price";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The card shown when a student shares a project link in a WhatsApp group. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  if (!p || !p.active) {
    return shareImage({ brand: s.brandName, title: s.tagline, subtitle: "Engineering projects with source code, report and PPT." });
  }
  return shareImage({
    brand: s.brandName,
    title: p.title,
    subtitle: p.summary,
    price: p.price,
    difficulty: p.difficulty,
    chips: p.branches.slice(0, 3).map((b) => branchName(b, true)),
  });
}
