"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type AuthView = "LOGIN" | "FORGOT_PASSWORD" | "RESET_SUBMITTED";
type BusyPhase = "IDLE" | "CONNECTING" | "VERIFYING" | "FINALIZING";

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

function nowMs() {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/superadmin";

  const { user, login } = useAuthStore();

  const [view, setView] = React.useState<AuthView>("LOGIN");

  // Form
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // UX / state
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<BusyPhase>("IDLE");
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [slowHint, setSlowHint] = React.useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState<number>(0);

  const abortRef = React.useRef<AbortController | null>(null);
  const elapsedTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  // Prefetch destination to reduce “post-login blank time”
  React.useEffect(() => {
    router.prefetch(next);
  }, [router, next]);

  function startElapsedClock() {
    const start = nowMs();
    if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedMs(Math.max(0, Math.round(nowMs() - start)));
    }, 120);
    return () => {
      if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    };
  }

  function cancelInFlight() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setPhase("IDLE");
    setSlowHint(null);
    if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSlowHint(null);
    setElapsedMs(0);

    // Reset any prior inflight requests
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setBusy(true);
    setPhase("CONNECTING");

    const stopClock = startElapsedClock();

    // Step-up messages for “it’s taking time” perception
    const t1 = window.setTimeout(() => setPhase("VERIFYING"), 450);
    const tSlow = window.setTimeout(() => {
      setSlowHint("Still working… verifying credentials and loading your workspace.");
    }, 1200);
    const tVerySlow = window.setTimeout(() => {
      setSlowHint(
        "This is taking longer than usual. Please check network/backend status if it persists."
      );
    }, 5500);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: abortRef.current.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Login failed. Please check your credentials.");
      }

      // Finalizing: store session, prefetch route already done, then navigate
      setPhase("FINALIZING");
      login(data.user, data.access_token);
      router.replace(next);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // user canceled
        return;
      }
      setError(err?.message || "Login failed.");
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(tSlow);
      window.clearTimeout(tVerySlow);
      stopClock();

      // If success, route will change; leaving busy overlay for a moment is OK.
      // If error, we should clear busy state.
      setBusy(false);
      setPhase("IDLE");
      abortRef.current = null;
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setPhase("CONNECTING");

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to process request.");

      setView("RESET_SUBMITTED");
      setSuccessMsg("If an account exists, we’ve sent a password reset link.");
    } catch (err: any) {
      setError(err?.message || "Failed to process request.");
    } finally {
      setBusy(false);
      setPhase("IDLE");
    }
  }

  const phaseLabel =
    phase === "CONNECTING"
      ? "Contacting server"
      : phase === "VERIFYING"
      ? "Verifying credentials"
      : phase === "FINALIZING"
      ? "Loading workspace"
      : "";

  return (
    <div className="relative flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950">
      {/* Busy overlay (premium feedback) */}
      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-xc-border bg-xc-card shadow-elev-2">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-xc-accent" />
                    <div className="text-base font-semibold">Signing you in</div>
                  </div>
                  <div className="mt-1 text-sm text-xc-muted" aria-live="polite">
                    {phaseLabel}
                    {elapsedMs ? (
                      <span className="ml-2 inline-flex items-center gap-1 font-mono text-xs text-xc-muted">
                        <Wifi className="h-3.5 w-3.5" />
                        {Math.round(elapsedMs / 1000)}s
                      </span>
                    ) : null}
                  </div>
                </div>

                <Button variant="outline" onClick={cancelInFlight}>
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <Step done={phase !== "CONNECTING"} active={phase === "CONNECTING"} label="Contacting API" />
                <Step done={phase === "FINALIZING"} active={phase === "VERIFYING"} label="Verifying credentials" />
                <Step done={false} active={phase === "FINALIZING"} label="Preparing your workspace" />
              </div>

              {slowHint ? (
                <div className="mt-4 rounded-xl border border-xc-warn/30 bg-xc-warn/10 px-4 py-3 text-sm text-xc-warn">
                  {slowHint}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* LEFT: Brand panel (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-900 p-12 text-white lg:flex xl:w-5/12">
        <div className="absolute inset-0">
          <div className="absolute -left-24 -top-24 h-[600px] w-[600px] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[800px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ExcelCare HIMS</h1>
            <p className="text-xs font-medium text-zinc-400">Enterprise Hospital OS</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <ShieldCheck className="mr-2 h-3.5 w-3.5 text-emerald-400" />
            Audit-ready access control
          </div>

          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Secure operations for multi-facility hospitals.
          </h2>

          <p className="text-sm leading-relaxed text-zinc-400">
            Fast, role-based access with traceable changes and enterprise-grade governance.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <MiniStat title="Sessions" value="Revocable" />
            <MiniStat title="Access" value="RBAC + Audit" />
            <MiniStat title="Facilities" value="Multi-branch" />
            <MiniStat title="Security" value="Policy-driven" />
          </div>
        </div>

        <div className="relative z-10 flex justify-between border-t border-white/10 pt-6 text-xs text-zinc-500">
          <span>© 2026 ExcelCare Systems</span>
          <span className="flex gap-4">
            <a href="#" className="hover:text-white">
              Privacy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
          </span>
        </div>
      </div>

      {/* RIGHT: Auth */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2 xl:w-7/12">
        <div className="absolute right-8 top-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[460px]">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Activity className="h-7 w-7" />
            </div>
          </div>

          {/* LOGIN */}
          {view === "LOGIN" ? (
            <Card className="border-xc-border">
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Access your clinical workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        className="h-11 pl-10"
                        placeholder="user@hospital.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <button
                        type="button"
                        onClick={() => setView("FORGOT_PASSWORD")}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        className="h-11 pl-10"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-11 w-full bg-indigo-600 text-white hover:bg-indigo-700"
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign in
                  </Button>

                  <div className="pt-2 text-center text-xs text-xc-muted">
                    Tip: If sign-in is slow, check backend logs and DB connectivity.
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {/* FORGOT */}
          {view === "FORGOT_PASSWORD" ? (
            <Card className="border-xc-border">
              <CardHeader>
                <button
                  onClick={() => setView("LOGIN")}
                  className="group mb-2 flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  type="button"
                >
                  <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Back to Sign in
                </button>
                <CardTitle>Reset password</CardTitle>
                <CardDescription>
                  Enter your email address and we’ll send a reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        className="h-11 pl-10"
                        placeholder="user@hospital.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                      {error}
                    </div>
                  ) : null}

                  <Button type="submit" className="h-11 w-full" disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send reset link
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {/* RESET SUBMITTED */}
          {view === "RESET_SUBMITTED" ? (
            <Card className="border-xc-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-500" />
                </div>
                <CardTitle>Check your email</CardTitle>
                <CardDescription>{successMsg}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setView("LOGIN")} className="w-full">
                  Return to Sign in
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-xc-border bg-xc-panel px-4 py-2.5">
      <div className="text-sm font-medium">{label}</div>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-xc-ok" />
      ) : active ? (
        <Loader2 className="h-5 w-5 animate-spin text-xc-accent" />
      ) : (
        <div className="h-5 w-5 rounded-full border border-xc-border" />
      )}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
      <div className="text-[11px] text-zinc-400">{title}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
