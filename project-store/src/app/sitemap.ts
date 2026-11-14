import type { MetadataRoute } from "next";
import { BRANCHES } from "@/lib/catalog";
import { listProjects } from "@/lib/data";
import { siteUrl } from "@/lib/site";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

/** Every live project, so students searching “ECE final year project with code” can find them. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const projects = await listProjects({ limit: 500 }).catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/projects`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/custom`, changeFrequency: "monthly", priority: 0.8 },
    ...BRANCHES.map((b) => ({ url: `${base}/projects?branch=${b.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...projects.map((p) => ({ url: `${base}/projects/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/policies`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
