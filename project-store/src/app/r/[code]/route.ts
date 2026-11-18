import { NextResponse, type NextRequest } from "next/server";
import { findReferrer, normalizeRefCode } from "@/lib/data";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/referral";

// Looks the code up on every visit.
export const dynamic = "force-dynamic";

/**
 * A student's invite link: https://site/r/RAHUL-K7QM. Remembers the code so the order forms fill
 * it in, then sends the visitor to the home page, which says whose code they're using.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeRefCode(decodeURIComponent((await params).code));
  const res = NextResponse.redirect(new URL("/?invited=1", req.url), 303);
  try {
    if (code && (await findReferrer(code))) {
      res.cookies.set(REF_COOKIE, code, {
        maxAge: REF_COOKIE_DAYS * 86400,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
      });
    }
  } catch (e) {
    console.error("[invite]", (e as Error).message);
  }
  return res;
}
