import type { MetadataRoute } from "next";
import { configuredSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = configuredSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/track/", "/projects/*/order"] }],
    sitemap: site ? `${site}/sitemap.xml` : undefined,
  };
}
