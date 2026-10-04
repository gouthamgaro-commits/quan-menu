import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Keeps the Supabase login session fresh. Does nothing in demo mode. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!URL_ || !KEY) return response;

  const supabase = createServerClient(URL_, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*", "/auth/:path*"],
};
