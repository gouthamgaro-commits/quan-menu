import type { MetadataRoute } from "next";
import { DEMO, SITE_URL } from "@/lib/config";
import { supabasePublic } from "@/lib/supabase/public";

/** Every live menu, so search engines can find stalls by name. Rebuilt at most once an hour. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL || "http://localhost:3000";
  const home: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
  if (DEMO) return home;
  const { data, error } = await supabasePublic()
    .from("stalls")
    .select("slug, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(10000);
  // Without the database, list what is certain rather than fail the whole file.
  if (error || !data) return home;
  return [
    ...home,
    ...data.map((s) => ({ url: `${base}/m/${s.slug}`, lastModified: s.updated_at, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
