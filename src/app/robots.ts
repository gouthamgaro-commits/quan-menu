import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Menus and the home page are for everyone; editors, owner links and print pages aren't for search engines. */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL || "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/k/", "/in-ma/", "/in-thuc-don/", "/to-roi", "/login", "/auth/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
