"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Copy, KeyRound, ShieldAlert } from "lucide-react";

export function NoAccess({
  perm,
  title = "Access denied",
  description = "You don’t have permission to view this page.",
}: {
  perm?: string;
  title?: string;
  description?: string;
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="border-[rgb(var(--zc-danger-rgb)/0.30)] bg-[rgb(var(--zc-danger-rgb)/0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/30">
            <ShieldAlert className="h-5 w-5 text-zc-accent" />
          </span>
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {perm ? (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/15">
            <div className="text-[11px] font-semibold text-zc-muted">Missing permission</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <KeyRound className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <div className="min-w-0 font-mono text-xs font-semibold text-zc-text truncate">{perm}</div>
              </div>
              <Button
                variant="outline"
                className="h-8 px-3 gap-2"
                onClick={() => void copy(perm)}
                title="Copy permission code"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/welcome">Go to Welcome</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href="/access">Open Access</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
