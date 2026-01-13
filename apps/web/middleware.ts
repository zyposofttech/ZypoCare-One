import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ FIXED: Added /api to the whitelist so login requests can pass through
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/must-change-password") || 
    pathname.startsWith("/api") || 
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authed = req.cookies.get("zypocare_auth")?.value === "1";
  if (authed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};