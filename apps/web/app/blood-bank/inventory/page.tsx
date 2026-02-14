"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, Warehouse } from "lucide-react";

type UnitRow = {
  id: string;
  unitNumber: string;
  bloodGroup?: string;
  componentType?: string;
  status: string;
  expiryDate?: string;
  storageLoc?: string;
  collectionStartAt?: string;
  volumeCollectedMl?: number;
};

const STATUS_OPTIONS = ["ALL", "AVAILABLE", "RESERVED", "CROSS_MATCHED", "ISSUED", "QUARANTINED", "TESTING"] as const;

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

function statusBadgeClass(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "RESERVED":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "CROSS_MATCHED":
      return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
    case "ISSUED":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
    case "QUARANTINED":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "TESTING":
      return "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200";
    case "DISCARDED":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function isExpiringWithin7Days(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InventoryDashboardPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_INVENTORY_READ");

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<UnitRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    let list = rows;

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((u) => u.status === statusFilter);
    }

    // Text search
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((u) => {
        const hay = `${u.unitNumber ?? ""} ${u.bloodGroup ?? ""} ${u.componentType ?? ""}`.toLowerCase();
        return hay.includes(s);
      });
    }

    return list;
  }, [rows, q, statusFilter]);

  // Computed stats
  const totalUnits = rows.length;
  const availableCount = rows.filter((u) => u.status === "AVAILABLE").length;
  const reservedCrossMatchedCount = rows.filter((u) => u.status === "RESERVED" || u.status === "CROSS_MATCHED").length;
  const expiringCount = rows.filter((u) => isExpiringWithin7Days(u.expiryDate)).length;

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<UnitRow[]>(`/api/blood-bank/inventory/units?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => (a.unitNumber || "").localeCompare(b.unitNumber || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Inventory refreshed", description: `Loaded ${sorted.length} units.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load inventory";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!branchId) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <AppShell title="Inventory Dashboard">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Warehouse className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Inventory Dashboard</div>
              <div className="mt-1 text-sm text-zc-muted">
                View available blood units by group, component and status. Use filters to narrow results.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Blood unit inventory summary for the current branch.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Units</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalUnits}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Available</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{availableCount}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Reserved / Cross-matched</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{reservedCrossMatchedCount}</div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Expiring in 7d</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{expiringCount}</div>
              </div>
            </div>

            {/* Search + Status filter */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 w-full lg:max-w-2xl">
                <div className="relative w-full lg:max-w-md">
                  <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by unit #, blood group, component..."
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
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
            <CardTitle className="text-base">Blood Units</CardTitle>
            <CardDescription className="text-sm">All blood units in inventory with current status and storage details.</CardDescription>
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
                  <th className="px-4 py-3 text-left font-semibold">Volume (ml)</th>
                  <th className="px-4 py-3 text-left font-semibold">Storage</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold">Collected At</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading inventory..." : "No blood units found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {u.unitNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-text">{u.bloodGroup ?? "-"}</td>

                    <td className="px-4 py-3 text-zc-muted">{u.componentType ? u.componentType.replace(/_/g, " ") : "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          statusBadgeClass(u.status),
                        )}
                      >
                        {u.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3 tabular-nums text-zc-text">
                      {u.volumeCollectedMl != null ? u.volumeCollectedMl : "-"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{u.storageLoc ?? "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-zc-text",
                          isExpiringWithin7Days(u.expiryDate) && "font-semibold text-red-600 dark:text-red-400",
                        )}
                      >
                        {formatDate(u.expiryDate)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{formatDate(u.collectionStartAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Tip</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage expiring units at Blood Bank &rarr; Expiring Units. Discard units at Blood Bank &rarr; Inventory &rarr; Discard.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
