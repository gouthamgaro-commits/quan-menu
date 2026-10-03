import { NextResponse } from "next/server";
import { DEMO, SITE_URL } from "@/lib/config";
import { MODEL } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Deployment check: which settings are present. Reports yes/no only, never values,
 * so it is safe to leave public. Open /api/health after deploying.
 */
export function GET() {
  const missing = [
    DEMO && "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (running in demo mode)",
    !SITE_URL && "NEXT_PUBLIC_SITE_URL (QR codes fall back to the address in the browser)",
  ].filter(Boolean);
  // Optional: without it, common dishes still translate from the built-in list.
  const optional = [
    !process.env.ANTHROPIC_API_KEY && "ANTHROPIC_API_KEY (photo reading and AI translation are off)",
  ].filter(Boolean);
  return NextResponse.json({
    ok: missing.length === 0,
    mode: DEMO ? "demo" : "live",
    ai: !!process.env.ANTHROPIC_API_KEY,
    model: MODEL,
    siteUrl: SITE_URL || null,
    missing,
    optional,
  });
}
