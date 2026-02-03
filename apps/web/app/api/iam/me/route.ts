import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL =
  process.env.CORE_API_URL ??
  (process.env.VERCEL ? "https://zypocare-one.onrender.com" : "http://localhost:4000");

function resolveScope(principal: any): "GLOBAL" | "BRANCH" | null {
  if (!principal) return null;

  const scope = principal.roleScope as ("GLOBAL" | "BRANCH" | null | undefined);
  if (scope === "GLOBAL" || scope === "BRANCH") return scope;

  const roleCode = String(principal.roleCode ?? "").trim().toUpperCase();
  if (roleCode === "SUPER_ADMIN" || roleCode === "CORPORATE_ADMIN") return "GLOBAL";
  if (principal.branchId) return "BRANCH";
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";

    const upstream = await fetch(`${CORE_API_URL}/api/iam/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : await upstream.text().catch(() => "");

    const res = NextResponse.json(data, { status: upstream.status });

    if (upstream.ok) {
      const principal = (data as any)?.principal;

      res.cookies.set("zypocare_auth", "1", { path: "/", sameSite: "lax" });

      if (principal) {
        const scope = resolveScope(principal);
        const roleCode = String(principal.roleCode ?? "").trim().toUpperCase();

        if (scope) res.cookies.set("zypocare_scope", scope, { path: "/", sameSite: "lax" });
        else res.cookies.delete("zypocare_scope");

        if (roleCode) res.cookies.set("zypocare_role", roleCode, { path: "/", sameSite: "lax" });
        else res.cookies.delete("zypocare_role");
      }
    } else {
      // ✅ Only drop cookies on 401 (unauthenticated).
      // 403 is a valid "forbidden" state and must NOT destroy session cookies.
      if (upstream.status === 401) {
        res.cookies.delete("zypocare_auth");
        res.cookies.delete("zypocare_scope");
        res.cookies.delete("zypocare_role");
      }
    }

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "IAM me proxy failed" },
      { status: 502 }
    );
  }
}
