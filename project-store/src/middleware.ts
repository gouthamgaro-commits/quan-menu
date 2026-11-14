import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, validSession } from "@/lib/auth";

/** Sends anyone who isn't signed in from the owner screens to the sign-in page. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (await validSession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
