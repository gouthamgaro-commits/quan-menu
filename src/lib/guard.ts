import { NextResponse } from "next/server";
import { DEMO } from "./config";
import { supabaseServer } from "./supabase/server";

/**
 * AI routes cost money per call, so in live mode only signed-in vendors may use them.
 * In demo mode (local development, no Supabase) they are open.
 */
export async function requireVendor(): Promise<NextResponse | null> {
  if (DEMO) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to use this." }, { status: 401 });
  return null;
}
