"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Command,
  LayoutGrid,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Globe,
  ChevronLeft,
} from "lucide-react";
import { zcLoading } from "@/lib/loading-events";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type AuthView = "LOGIN" | "FORGOT";
const REMEMBER_DEVICE_KEY = "zypocare-remember-device";

function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  // Prevent open redirects
  if (!v.startsWith("/")) return null;
  return v;
}

function resolveScope(u: any): "GLOBAL" | "BRANCH" | null {
  if (!u) return null;
  const scope = u.roleScope as ("GLOBAL" | "BRANCH" | null | undefined);
  if (scope === "GLOBAL" || scope === "BRANCH") return scope;

  const roleCode = String(u.roleCode ?? u.role ?? "").trim().toUpperCase();
  if (roleCode === "SUPER_ADMIN" || roleCode === "CORPORATE_ADMIN") return "GLOBAL";
  if (u.branchId) return "BRANCH";
  return null;
}

function homeForUser(u: any): string {
  const scope = resolveScope(u);
  // "superadmin" workspace has been removed.
  return scope === "BRANCH" ? "/dashboard" : "/dashboard/global";
}

function nextForUser(u: any, requestedNext: string | null): string {
  const scope = resolveScope(u);
  const safeNext = sanitizeNext(requestedNext);

  if (!safeNext) return homeForUser(u);

  // Branch users must never land in Central Console or Access screens
  if (
    scope === "BRANCH" &&
    (safeNext.startsWith("/access") ||
      safeNext.startsWith("/policy") ||
      safeNext.startsWith("/branches") ||
      safeNext.startsWith("/dashboard/global") ||
      safeNext.startsWith("/superadmin"))
  ) {
    return "/dashboard";
  }

  // Global users normally operate from Central Console
  if (scope === "GLOBAL" && safeNext.startsWith("/admin")) {
    return "/dashboard/global";
  }

  return safeNext;
}

function BrandPattern() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-30 dark:opacity-20">
      <div className="absolute -left-[10%] -top-[10%] h-[120%] w-[120%] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
}

function StatusBadge() {
  const [status, setStatus] = React.useState<"loading" | "online" | "offline">("loading");

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        // Fetches the NestJS HealthController @ /health (via proxy /api/health)
        const res = await fetch("/api/health");
        if (res.ok) {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch (error) {
        setStatus("offline");
      }
    };

    checkHealth();
    // Optional: Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === "offline") {
    return (
      <div
        className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50/80 px-3 py-1 text-[11px] font-medium text-red-600 backdrop-blur-md transition dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 cursor-not-allowed"
        title="Cannot connect to server"
      >
        <span className="relative flex h-2 w-2">
          {/* Static red dot for offline */}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
        </span>
        System Offline
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 text-[11px] font-medium text-zinc-500 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Checking Systems...
      </div>
    );
  }

  // Default: Online (Green)
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 cursor-help"
      title="All systems operational"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      Systems Operational
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");

  const { user, login } = useAuthStore();
  const isHydrated = useAuthStore((s) => s._hasHydrated);
  const [view, setView] = React.useState<AuthView>("LOGIN");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isHydrated && user) {
      const dest = nextForUser(user, requestedNext);
      if (user.mustChangePassword) {
        router.replace(`/must-change-password?next=${encodeURIComponent(dest)}` as any);
      } else {
        router.replace(dest as any);
      }
    }
  }, [user, isHydrated, router, requestedNext]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const id = zcLoading.start({ kind: "action", label: "Working…" });
      try {
        const res = await fetch(`/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Service unavailable. Please try again later.");
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Invalid credentials.");
        }

        const accessToken = (data as any)?.access_token;
        const loggedInUser = (data as any)?.user;

        if (accessToken) {
          if (remember) localStorage.setItem("access_token", accessToken);
          else sessionStorage.setItem("access_token", accessToken);
        }

        if (loggedInUser) {
          try {
            if (remember) {
              localStorage.setItem(REMEMBER_DEVICE_KEY, "1");
              sessionStorage.removeItem(REMEMBER_DEVICE_KEY);
              sessionStorage.removeItem("zypocare-auth");
            } else {
              sessionStorage.setItem(REMEMBER_DEVICE_KEY, "1");
              localStorage.removeItem(REMEMBER_DEVICE_KEY);
              localStorage.removeItem("zypocare-auth");
            }
          } catch { }
          login(loggedInUser, accessToken ?? null);
        }
      } finally {
        zcLoading.end(id);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-zinc-900 dark:bg-zc-panel dark:text-zc-text">
      {/* Left Panel */}
      <div className="relative hidden w-2/3 flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-16 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white lg:flex">
        <BrandPattern />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-[200px]" />
            <span className="sr-only">ZypoCare ONE</span>
          </div>
          <StatusBadge />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:shadow-black/50 dark:ring-zinc-700">
            <LayoutGrid className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight">
            The Operating System for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Modern Healthcare.
            </span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Unified clinical workflows, governed operations, and enterprise-grade setup built for hospitals.
          </p>

          <div className="mt-8 flex gap-4">
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              HIPAA Compliant
            </div>
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              <Lock className="h-4 w-4 text-emerald-500" />
              End-to-End Encrypted
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div>© {new Date().getFullYear()} ZypoCare</div>
          <div className="flex items-center gap-2">
            <span>v0.1</span>
            <span className="h-1 w-1 rounded-full bg-zinc-400" />
            <span>Build: DEV</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full flex-col justify-between p-8 lg:w-1/3 lg:p-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-8 w-[170px]" />
            <span className="sr-only">ZypoCare ONE</span>
          </div>
          <div className="absolute right-6 top-6">
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              {view === "LOGIN" ? "Sign in" : "Reset password"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {view === "LOGIN"
                ? "Use your work email and password to continue."
                : "Enter your email and we’ll send reset instructions."}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember this device
              </label>

              <button
                type="button"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                onClick={() => setView("FORGOT")}
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <Separator className="my-8" />

          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Need access? Contact your system administrator.
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="inline-flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            Enterprise-ready HIMS
          </div>
          <div className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to site
          </div>
        </div>
      </div>
    </div>
  );
}
