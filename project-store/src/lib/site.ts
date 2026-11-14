import "server-only";
import { headers } from "next/headers";

/** The site's public address from settings: NEXT_PUBLIC_SITE_URL, else Vercel's production domain. */
export function configuredSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "") ||
    (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "");
  return raw.replace(/\/+$/, "");
}

/** Address for links we send to students. Falls back to the address this request came in on. */
export async function siteUrl() {
  const fixed = configuredSiteUrl();
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
