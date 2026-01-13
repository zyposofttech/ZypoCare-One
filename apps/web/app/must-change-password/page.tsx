"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  LayoutGrid,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Check,
} from "lucide-react";
import { cn } from "@/lib/cn";

// --- Components (Reused from Login for consistency) ---

function BrandPattern() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-30 dark:opacity-20">
      <div className="absolute -left-[10%] -top-[10%] h-[120%] w-[120%] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
}

function StatusBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 text-[11px] font-medium text-zinc-600 backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 cursor-help" title="All systems operational">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      Systems Operational
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = React.useMemo(() => {
    let s = 0;
    if (password.length >= 8) s += 25;
    if (/[A-Z]/.test(password)) s += 25;
    if (/[0-9]/.test(password)) s += 25;
    if (/[^A-Za-z0-9]/.test(password)) s += 25;
    return s;
  }, [password]);

  const color =
    strength <= 25 ? "bg-red-500" : strength <= 50 ? "bg-amber-500" : strength <= 75 ? "bg-blue-500" : "bg-emerald-500";

  return (
    <div className="mt-2 flex gap-1 h-1">
      {[25, 50, 75, 100].map((step) => (
        <div
          key={step}
          className={cn("h-full flex-1 rounded-full transition-all duration-300", strength >= step ? color : "bg-zinc-200 dark:bg-zinc-800")}
        />
      ))}
    </div>
  );
}

type ChangePasswordResponse = {
  ok: boolean;
  access_token?: string;
  user?: any;
};

// --- Main Page ---

export default function MustChangePasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/superadmin";

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s._hasHydrated);
  const updateUser = useAuthStore((s) => s.updateUser);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Only redirect if hydration is complete AND user is missing
    if (isHydrated && !user) {
      router.replace(`/login?next=${encodeURIComponent(next)}` as any);
    }
  }, [user, isHydrated, router, next]);

  // Prevent flicker while waiting for storage
  if (!isHydrated) return null;
  if (!user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!currentPassword.trim()) return setErr("Current password is required.");
    if (!newPassword.trim()) return setErr("New password is required.");
    if (newPassword !== confirm) return setErr("New password and confirmation do not match.");
    if (newPassword.length < 8) return setErr("Password must be at least 8 characters.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as ChangePasswordResponse;

      if (!res.ok) {
        throw new Error((data as any)?.message || "Password change failed.");
      }

      if (data.access_token) {
        try {
          localStorage.setItem("access_token", data.access_token);
        } catch { }
      }

      if (data.user) {
        login(data.user, data.access_token ?? null);
      } else {
        updateUser({ mustChangePassword: false });
      }

      window.location.href = next;
    } catch (e: any) {
      if (String(e?.message || "").toLowerCase().includes("invalid token") || String(e?.message || "").toLowerCase().includes("unauthorized")) {
        logout();
        router.replace(`/login?next=${encodeURIComponent(next)}` as any);
        return;
      }
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">

      {/* --- LEFT PANEL: Brand (67%) --- */}
      <div className="relative hidden w-2/3 flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-16 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white lg:flex">
        <BrandPattern />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold tracking-tight">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 dark:bg-indigo-500 dark:shadow-indigo-500/30">
              <Command className="h-6 w-6" />
            </div>
            <div className="text-xl">
              ZypoCare<span className="font-normal text-zinc-500 dark:text-zinc-400">OS</span>
            </div>
          </div>
          <StatusBadge />
        </div>

        {/* Center Hero */}
        <div className="relative z-10 max-w-2xl">
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:shadow-black/50 dark:ring-zinc-700">
            <LayoutGrid className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight">
            Security Checkpoint. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Update Credentials.
            </span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your security is our priority. Please update your password to maintain compliance with hospital data protection standards.
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

        {/* Footer */}
        <div className="relative z-10 text-xs text-zinc-400 dark:text-zinc-500">
          © 2026 ZypoSoft Technologies • Enterprise Build v4.2.0
        </div>
      </div>

      {/* --- RIGHT PANEL: Form (33%) --- */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-8 dark:bg-zinc-950 lg:w-1/3 lg:flex-none">

        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[360px] space-y-8">

          {/* Header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Update Password
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This account requires a password change before you can access the workspace.
            </p>
          </div>

          {/* Error Alert */}
          {err && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400 animate-in slide-in-from-top-2">
              <ShieldAlert className="h-4 w-4" />
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-4">
              
              {/* Current Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Current Password</label>
                </div>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 transition group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                  <Input
                    placeholder="••••••••"
                    type="password"
                    className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:bg-zinc-900 dark:border-zinc-800 dark:focus:border-indigo-400"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">New Password</label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 transition group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                  <Input
                    placeholder="New password"
                    type="password"
                    className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:bg-zinc-900 dark:border-zinc-800 dark:focus:border-indigo-400"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {/* Visual Strength Meter */}
                <PasswordStrength password={newPassword} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm Password</label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 transition group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                  <Input
                    placeholder="Confirm new password"
                    type="password"
                    className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:bg-zinc-900 dark:border-zinc-800 dark:focus:border-indigo-400"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full h-11 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Secure Account & Login"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full border-zinc-200 dark:border-zinc-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold"><span className="bg-white px-2 text-zinc-400 dark:bg-zinc-950">Or</span></div>
            </div>

            <Button type="button" variant="outline" onClick={() => logout()} className="w-full h-11 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Log Out
            </Button>
          </form>

        </div>

        {/* Footer Links (Right Side) */}
        <div className="absolute bottom-6 left-0 w-full text-center">
          <div className="flex justify-center gap-6 text-xs font-medium text-zinc-400 dark:text-zinc-600">
            <a href="#" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">Terms of Service</a>
            <a href="#" className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              <Globe className="h-3 w-3" /> Help Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}