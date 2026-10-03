import { NextResponse } from "next/server";
import { DEMO } from "./config";
import { supabaseServer } from "./supabase/server";

/**
 * AI routes cost money per call. In live mode only signed-in vendors may use them,
 * and each vendor has a daily cap enforced by the database (see take_ai_call in
 * supabase/schema.sql). Demo mode has no logins, so AI is open there only during
 * local development: a production deploy that is missing its Supabase settings
 * must not hand the API key to the whole internet.
 */
export async function requireVendor(): Promise<NextResponse | null> {
  if (DEMO) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json(
      { error: "Photo reading needs vendor logins, and logins need Supabase. Add the Supabase settings to the server." },
      { status: 503 },
    );
  }

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to use this." }, { status: 401 });

  const { data: allowed, error } = await supabase.rpc("take_ai_call");
  if (error) {
    console.error("[guard] take_ai_call failed. Has supabase/schema.sql been run?", error.message);
    return NextResponse.json({ error: "Photo reading is temporarily unavailable. Try again later." }, { status: 503 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "You've used today's AI allowance. It resets at 7 am Vietnam time." }, { status: 429 });
  }
  return null;
}
