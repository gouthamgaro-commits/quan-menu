import { NextResponse } from "next/server";
import { ping } from "@/lib/data";
import { dbMode } from "@/lib/db";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel (vercel.json). Supabase's free plan pauses a database after a week
 * without activity, which would take the store offline in a quiet week; one tiny read prevents that.
 */
export async function GET() {
  if (dbMode() !== "postgres") return NextResponse.json({ ok: true, mode: dbMode() });
  try {
    return NextResponse.json({ ok: true, projects: await ping() });
  } catch (e) {
    console.error("[keepalive]", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
