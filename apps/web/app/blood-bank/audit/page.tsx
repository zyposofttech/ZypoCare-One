"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, ScrollText, Eye } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
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

function actionBadge(action: string) {
  const a = (action || "").toUpperCase();
  if (a === "CREATE")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (a === "UPDATE")
    return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
  if (a === "DELETE")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  if (a === "VERIFY")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (a === "ISSUE")
    return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

const ENTITY_TYPES = [
  "ALL",
  "DONOR",
  "BLOOD_UNIT",
  "CROSS_MATCH",
  "ISSUE",
  "TRANSFUSION",
] as const;

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function AuditPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_AUDIT_READ");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<any | null>(null);

  /* ---- fetch ---- */

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data: any = await apiFetch(
        `/api/blood-bank/reports/daily-summary?branchId=${branchId}`,
      );
      const list = Array.isArray(data) ? data : [];
      setRows(list);

      if (showToast) {
        toast({ title: "Audit trail refreshed", description: `Loaded ${list.length} events.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load audit trail";
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

  /* ---- filtering ---- */

  const filtered = React.useMemo(() => {
    let list = rows;

    if (entityFilter !== "ALL") {
      list = list.filter(
        (r: any) => (r.entity || "").toUpperCase() === entityFilter,
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((r: any) => {
        const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
        return ts >= from;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // end-of-day inclusive
      list = list.filter((r: any) => {
        const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
        return ts < to;
      });
    }

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r: any) => {
        const hay = `${r.action ?? ""} ${r.entity ?? ""} ${r.entityId ?? ""} ${r.details ?? ""} ${r.actor ?? ""}`.toLowerCase();
        return hay.includes(s);
      });
    }

    return list;
  }, [rows, q, entityFilter, dateFrom, dateTo]);

  /* ---- stats ---- */

  const totalEvents = rows.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEvents = rows.filter((r: any) => {
    const ts = r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 10) : "";
    return ts === todayStr;
  }).length;

  const topAction = React.useMemo(() => {
    if (!rows.length) return "-";
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const a = (r.action || "UNKNOWN").toUpperCase();
      counts[a] = (counts[a] || 0) + 1;
    }
    let best = "";
    let max = 0;
    for (const [k, v] of Object.entries(counts)) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    return best || "-";
  }, [rows]);

  /* ---- render ---- */

  return (
    <AppShell title="Blood Bank Audit Trail">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ScrollText className="h-5 w-5 text-gray-600" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Blood Bank Audit Trail</div>
              <div className="mt-1 text-sm text-zc-muted">
                Regulatory audit log for all blood bank operations
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
              Summary of blood bank audit events across all entity types.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Events</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalEvents}</div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
                <div className="text-xs font-medium text-green-600 dark:text-green-400">Today&apos;s Events</div>
                <div className="mt-1 text-lg font-bold text-green-700 dark:text-green-300">{todayEvents}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Top Action</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{topAction}</div>
                <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  Most frequent action type
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search action, entity, actor..."
                    className="pl-10"
                  />
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-zc-muted">Entity Type</Label>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "ALL" ? "All Entities" : t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-zc-muted">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-zc-muted">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
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
            <CardTitle className="text-base">Audit Events</CardTitle>
            <CardDescription className="text-sm">All recorded blood bank operations with actor, entity, and change details.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold">Entity ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                  <th className="px-4 py-3 text-left font-semibold">Actor</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading audit trail..." : "No audit records found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((a: any, idx: number) => (
                  <tr key={a.id ?? idx} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3 text-zc-muted whitespace-nowrap">
                      {a.timestamp ? new Date(a.timestamp).toLocaleString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          actionBadge(a.action),
                        )}
                      >
                        {(a.action || "-").toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-zc-text">{a.entity ?? "-"}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-muted">{a.entityId ?? "-"}</span>
                    </td>

                    <td className="px-4 py-3 max-w-xs truncate text-zc-muted" title={a.details ?? ""}>
                      {a.details ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-zc-text">{a.actor ?? "-"}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="success"
                          size="icon"
                          onClick={() => {
                            setSelected(a);
                            setDetailOpen(true);
                          }}
                          title="View detail"
                          aria-label="View detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
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
              <div className="text-sm font-semibold text-zc-text">Audit trail information</div>
              <div className="mt-1 text-sm text-zc-muted">
                All blood bank operations are logged automatically for regulatory compliance. Records cannot be edited or deleted. Use filters to narrow down specific events by entity type or date range.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Detail Dialog (drawer-style) */}
      <Dialog open={detailOpen} onOpenChange={(v) => (!v ? setDetailOpen(false) : null)}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/30">
                <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              Audit Record Detail
            </DialogTitle>
            <DialogDescription>
              Full details of the selected audit event, including before/after state.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {selected ? (
            <div className="grid gap-6">
              {/* Record metadata */}
              <div className="grid gap-3">
                <div className="text-sm font-semibold text-zc-text">Event Information</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Timestamp</Label>
                    <div className="text-sm text-zc-text">
                      {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : "-"}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Action</Label>
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          actionBadge(selected.action),
                        )}
                      >
                        {(selected.action || "-").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Entity Type</Label>
                    <div className="text-sm text-zc-text">{selected.entity ?? "-"}</div>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Entity ID</Label>
                    <div className="font-mono text-xs text-zc-text">{selected.entityId ?? "-"}</div>
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-zc-muted">Actor</Label>
                  <div className="text-sm text-zc-text">{selected.actor ?? "-"}</div>
                </div>

                {selected.details ? (
                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Details</Label>
                    <div className="text-sm text-zc-text">{selected.details}</div>
                  </div>
                ) : null}
              </div>

              <Separator />

              {/* Before / After */}
              <div className="grid gap-3">
                <div className="text-sm font-semibold text-zc-text">Before / After State</div>

                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">Before</Label>
                    <pre className="rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-xs font-mono overflow-x-auto">
                      {selected.before
                        ? typeof selected.before === "string"
                          ? selected.before
                          : JSON.stringify(selected.before, null, 2)
                        : "—"}
                    </pre>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs text-zc-muted">After</Label>
                    <pre className="rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-xs font-mono overflow-x-auto">
                      {selected.after
                        ? typeof selected.after === "string"
                          ? selected.after
                          : JSON.stringify(selected.after, null, 2)
                        : "—"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
