import { NextResponse } from "next/server";
import { getSettings, ping } from "@/lib/data";
import { dbMode } from "@/lib/db";
import { setupMissing } from "@/lib/settings";
import { configuredSiteUrl } from "@/lib/site";

// Reads live data from the database, so it is built on each request, never at deploy time.
export const dynamic = "force-dynamic";

/** Deployment check: lists what is still missing (yes/no only, never values). Open /api/health after deploying. */
export async function GET() {
  const mode = dbMode();
  let database: "ok" | "error" | "not configured" = "not configured";
  let settings: string[] = [];
  if (mode !== "missing") {
    try {
      await ping();
      database = "ok";
      settings = setupMissing(await getSettings());
    } catch (e) {
      console.error("[health]", (e as Error).message);
      database = "error";
    }
  }
  const missing = [
    mode === "missing" && "DATABASE_URL",
    database === "error" && "DATABASE_URL works (the database did not answer: check the connection string and password)",
    !process.env.ADMIN_PASSWORD && "ADMIN_PASSWORD",
    !configuredSiteUrl() && "NEXT_PUBLIC_SITE_URL",
    ...settings.map((s) => `${s} (Admin → Settings)`),
  ].filter(Boolean);
  return NextResponse.json(
    {
      ok: missing.length === 0,
      database: mode === "local" ? "built-in (development only)" : database,
      telegramAlerts: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      missing,
    },
    { status: database === "error" ? 503 : 200 },
  );
}
