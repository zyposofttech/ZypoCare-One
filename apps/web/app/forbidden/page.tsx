"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useAuthStore } from "@/lib/auth/store";

import { ShieldAlert, ArrowLeft, Home, KeyRound, Copy } from "lucide-react";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-3 py-1 text-xs font-semibold text-zc-text">
      {children}
    </span>
  );
}

export default function ForbiddenPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const reason =
    sp.get("reason") ||
    "You don’t have permission to access this page. If you believe this is a mistake, request access from your administrator.";

  const perm = sp.get("perm"); // optional: missing permission code
  const path = sp.get("path"); // optional: attempted path

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-zc-bg">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldAlert className="h-6 w-6 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Access denied</div>
              <div className="mt-1 text-sm text-zc-muted">
                403 · Authorization blocked by RBAC policy
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>

            <Button variant="primary" className="gap-2" onClick={() => router.push("/welcome")}>
              <Home className="h-4 w-4" />
              Welcome
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.30)] bg-[rgb(var(--zc-danger-rgb)/0.10)] px-4 py-3 text-sm text-[rgb(var(--zc-danger))]">
              {reason}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user?.email ? <Pill>{user.email}</Pill> : null}
              {user?.roleCode ? <Pill>{String(user.roleCode)}</Pill> : null}
              {user?.branchName ? <Pill>{user.branchName}</Pill> : null}
            </div>

            {(perm || path) ? <Separator /> : null}

            {path ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zc-muted">Attempted route</div>
                <div className="rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 font-mono text-xs text-zc-text break-all">
                  {path}
                </div>
              </div>
            ) : null}

            {perm ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zc-muted">Missing permission</div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/15">
                  <div className="flex items-center gap-2 min-w-0">
                    <KeyRound className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <div className="min-w-0 font-mono text-xs font-semibold text-zc-text truncate">{perm}</div>
                  </div>

                  <Button
                    variant="outline"
                    className="h-8 px-3 gap-2"
                    onClick={() => copy(perm)}
                    title="Copy permission code"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>

                <div className="text-[11px] text-zc-muted">
                  Tip: Share the permission code with your system admin to get access quickly.
                </div>
              </div>
            ) : null}

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zc-muted">
                If you’re an admin, you can manage roles and permissions from the Access module.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </Button>

                <Button variant="outline" asChild>
                  <Link href="/access">Open Access</Link>
                </Button>

                <Button variant="primary" asChild>
                  <Link href="/welcome">Go to Welcome</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-zc-muted">
          For debugging: you can route here like <span className="font-mono">/forbidden?perm=IAM_ROLE_READ&amp;path=/access/roles</span>
        </div>
      </div>
    </div>
  );
}
