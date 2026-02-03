import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    // common static extensions
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff2?|ttf|eot)$/.test(pathname)
  );
}

function getScope(req: NextRequest): "GLOBAL" | "BRANCH" | null {
  const v = req.cookies.get("zypocare_scope")?.value;
  if (v === "GLOBAL" || v === "BRANCH") return v;
  return null;
}

function homeForScope(scope: "GLOBAL" | "BRANCH" | null) {
  // "superadmin" workspace has been removed. Use dashboard routes.
  if (scope === "BRANCH") return "/dashboard";
  if (scope === "GLOBAL") return "/dashboard/global";
  return "/"; // unknown scope
}

function isMustChangePasswordPath(pathname: string) {
  return pathname === "/must-change-password" || pathname.startsWith("/must-change-password/");
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always allow Next internals + static
  if (isStaticAsset(pathname)) return NextResponse.next();

  // Always allow API (proxy/rewrite will handle it)
  if (pathname.startsWith("/api")) return NextResponse.next();

  const authed = req.cookies.get("zypocare_auth")?.value === "1";
  const scope = getScope(req);
  const isMcp = isMustChangePasswordPath(pathname);

  // Optional: "force must-change-password" flag (safe if not used)
  // Set either cookie to "1" at login time when user must update password.
  const mustChangeFlag =
    req.cookies.get("zypocare_mcp")?.value === "1" ||
    req.cookies.get("zypocare_must_change")?.value === "1";

  // If user is already authed and hits /login, send them to their home
  if (pathname.startsWith("/login")) {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = homeForScope(scope);
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ✅ Option C: must-change-password is NOT public.
  // If user hits it without auth, force login (preserve next)
  if (!authed && isMcp) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${search || ""}`);
    return NextResponse.redirect(url);
  }

  // Not authed -> force login with next (include querystring)
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${search || ""}`);
    return NextResponse.redirect(url);
  }

  // ✅ Optional: enforce must-change-password flow for authenticated users
  // If the flag is set, keep the user on /must-change-password until cleared.
  if (authed && mustChangeFlag && !isMcp) {
    const url = req.nextUrl.clone();
    url.pathname = "/must-change-password";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Authenticated users can reach must-change-password page
  if (authed && isMcp) {
    return NextResponse.next();
  }

  // -------------------------
  // Legacy route compatibility
  // -------------------------
  // The /superadmin workspace was removed; redirect stale links to their new homes.
  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    const url = req.nextUrl.clone();

    // Branch users should never land in global console.
    if (scope === "BRANCH") {
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // GLOBAL users: map known subtrees.
    if (pathname.startsWith("/superadmin/infrastructure")) {
      url.pathname = pathname.replace("/superadmin/infrastructure", "/infrastructure") || "/infrastructure";
    } else if (pathname.startsWith("/superadmin/branches")) {
      url.pathname = pathname.replace("/superadmin/branches", "/branches") || "/branches";
    } else if (pathname.startsWith("/superadmin/policy")) {
      url.pathname = pathname.replace("/superadmin/policy", "/policy") || "/policy";
    } else if (pathname.startsWith("/superadmin/users")) {
      url.pathname = pathname.replace("/superadmin/users", "/users") || "/users";
    } else if (pathname.startsWith("/superadmin/dashboard")) {
      url.pathname = "/dashboard/global";
    } else {
      url.pathname = "/dashboard/global";
    }

    url.search = "";
    return NextResponse.redirect(url);
  }

  // -------------------------
  // Role-scope UX routing (NOT security)
  // -------------------------

  // Branch-scoped users must not enter Central Console routes
  if (scope === "BRANCH") {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Keep branch users in branch workspace UX.
    if (
      pathname.startsWith("/access") ||
      pathname.startsWith("/policy") ||
      pathname.startsWith("/dashboard/global") ||
      pathname.startsWith("/branches")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Global users should operate from Central Console
  if (scope === "GLOBAL") {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/global";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/global";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
