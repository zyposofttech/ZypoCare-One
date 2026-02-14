"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, Clock } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ExpiringUnit = {
  id: string;
  unitNumber: string;
  bloodGroup?: string;
  componentType?: string;
  expiryDate?: string;
  storageLoc?: string;
  status: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function daysLeft(expiryDate?: string): number {
  if (!expiryDate) return 999;
  return Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function daysLeftColor(days: number) {
  if (days <= 1)
    return "border-red-200 bg-red-50/50 text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300";
  if (days <= 3)
    return "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300";
  return "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-300";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExpiringUnitsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_INVENTORY_READ");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ExpiringUnit[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((u) => {
      const hay = `${u.unitNumber} ${u.bloodGroup ?? ""} ${u.componentType ?? ""} ${u.status} ${u.storageLoc ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<ExpiringUnit[]>(
        `/api/blood-bank/inventory/expiring?branchId=${branchId}`,
      );
      const sorted = [...(data ?? [])].sort((a, b) => daysLeft(a.expiryDate) - daysLeft(b.expiryDate));
      setRows(sorted);
      if (showToast) {
        toast({
          title: "Expiring units refreshed",
          description: `Loaded ${sorted.length} expiring units.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load expiring units";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* --- Stats --- */
  const expiring24h = rows.filter((u) => daysLeft(u.expiryDate) <= 1).length;
  const expiring3d = rows.filter((u) => daysLeft(u.expiryDate) > 1 && daysLeft(u.expiryDate) <= 3).length;
  const expiring7d = rows.filter((u) => daysLeft(u.expiryDate) > 3 && daysLeft(u.expiryDate) <= 7).length;

  return (
    <AppShell title="Expiring Units">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Clock className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Expiring Units</div>
              <div className="mt-1 text-sm text-zc-muted">
                Track and manage blood units approaching expiry
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refresh(true)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Blood units approaching their expiry date grouped by urgency.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Expiring 24h</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{expiring24h}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Expiring 3d</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{expiring3d}</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Expiring 7d</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{expiring7d}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by unit #, blood group, component, status..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing{" "}
                <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expiring Units</CardTitle>
            <CardDescription className="text-sm">
              Blood units nearing their expiry date. Days left is color-coded by urgency.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Component</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Storage</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Days Left</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading expiring units..." : "No expiring units found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((u) => {
                  const days = daysLeft(u.expiryDate);
                  return (
                    <tr key={u.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {u.unitNumber}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-zc-text">
                          {u.bloodGroup?.replace(/_/g, " ") ?? "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        {u.componentType ?? "Whole Blood"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          {u.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        {u.storageLoc ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zc-text">
                          {u.expiryDate
                            ? new Date(u.expiryDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                            daysLeftColor(days),
                          )}
                        >
                          {days}d
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-zc-muted">Read-only</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
