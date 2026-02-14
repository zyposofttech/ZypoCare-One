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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, Clock } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DiscardRow = {
  id: string;
  unitNumber?: string;
  bloodGroup?: string;
  reason?: string;
  notes?: string;
  discardedAt?: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISCARD_REASONS = [
  "EXPIRED",
  "TTI_REACTIVE",
  "BAG_LEAK",
  "CLOT",
  "LIPEMIC",
  "HEMOLYZED",
  "QC_FAILURE",
  "RETURN_TIMEOUT",
  "OTHER",
] as const;

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

function topReason(rows: DiscardRow[]): string {
  if (!rows.length) return "-";
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const key = r.reason ?? "UNKNOWN";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let best = "-";
  let max = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best.replace(/_/g, " ");
}

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/* ------------------------------------------------------------------ */
/*  Discard Dialog                                                     */
/* ------------------------------------------------------------------ */

function DiscardDialog({
  open,
  onClose,
  onDiscarded,
  branchId,
  canDiscard,
  deniedMessage,
}: {
  open: boolean;
  onClose: () => void;
  onDiscarded: () => Promise<void> | void;
  branchId: string | null;
  canDiscard: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [bloodUnitId, setBloodUnitId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setBloodUnitId("");
      setReason("");
      setNotes("");
    }
  }, [open]);

  async function onSubmit() {
    setErr(null);
    if (!canDiscard) return setErr(deniedMessage);
    if (!bloodUnitId.trim()) return setErr("Unit number is required");
    if (!reason) return setErr("Discard reason is required");

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/inventory/discard", {
        method: "POST",
        body: JSON.stringify({
          bloodUnitId: bloodUnitId.trim(),
          reason,
          notes: notes.trim() || null,
          branchId,
        }),
      });
      await onDiscarded();
      toast({
        title: "Unit Discarded",
        description: `Successfully discarded unit "${bloodUnitId.trim()}"`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Discard failed");
      toast({ variant: "destructive", title: "Discard failed", description: e?.message || "Discard failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent className={drawerClassName("max-w-2xl")} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Discard Blood Unit
          </DialogTitle>
          <DialogDescription>
            Record a unit discard with reason and documentation. All discards are audited for regulatory compliance.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Unit Number</Label>
              <Input
                value={bloodUnitId}
                onChange={(e) => setBloodUnitId(e.target.value)}
                placeholder="Enter unit number or scan barcode"
              />
            </div>

            <div className="grid gap-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discard reason" />
                </SelectTrigger>
                <SelectContent>
                  {DISCARD_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or observations..."
                className="min-h-[84px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => void onSubmit()}
              disabled={busy || !canDiscard}
              title={!canDiscard ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Discard
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DiscardUnitsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_INVENTORY_READ");
  const canDiscard = hasPerm(user, "BB_INVENTORY_DISCARD");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DiscardRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [discardOpen, setDiscardOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((d) => {
      const hay = `${d.unitNumber ?? ""} ${d.bloodGroup ?? ""} ${d.reason ?? ""} ${d.notes ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<DiscardRow[]>(
        `/api/blood-bank/inventory/units?branchId=${branchId}&status=DISCARDED`,
      );
      const sorted = [...(data ?? [])].sort((a, b) => {
        const da = a.discardedAt ? new Date(a.discardedAt).getTime() : 0;
        const db = b.discardedAt ? new Date(b.discardedAt).getTime() : 0;
        return db - da;
      });
      setRows(sorted);
      if (showToast) {
        toast({
          title: "Discard history refreshed",
          description: `Loaded ${sorted.length} discarded units.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load discard history";
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
  const totalDiscards = rows.length;
  const thisMonth = rows.filter((r) => isThisMonth(r.discardedAt)).length;
  const topReasonLabel = topReason(rows);

  return (
    <AppShell title="Discard Units">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <AlertTriangle className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Discard Units</div>
              <div className="mt-1 text-sm text-zc-muted">
                Record unit discards with reason documentation
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

            {canDiscard ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => setDiscardOpen(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Discard Unit
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Summary of discarded blood units and top discard reasons.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Discards</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalDiscards}</div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">This Month</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{thisMonth}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Top Reason</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{topReasonLabel}</div>
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
                  placeholder="Search by unit #, blood group, reason, notes..."
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
            <CardTitle className="text-base">Recent Discards</CardTitle>
            <CardDescription className="text-sm">
              All discarded blood units with reason documentation. All discards are audited for regulatory compliance.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold">Discarded At</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading discard history..." : "No discarded units found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {d.unitNumber ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-zc-text">
                        {d.bloodGroup?.replace(/_/g, " ") ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                        {d.reason?.replace(/_/g, " ") ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted max-w-[200px] truncate" title={d.notes ?? ""}>
                      {d.notes ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">
                        {d.discardedAt
                          ? new Date(d.discardedAt).toLocaleString()
                          : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <DiscardDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onDiscarded={() => refresh(false)}
        branchId={branchId ?? ""}
        canDiscard={canDiscard}
        deniedMessage="Missing permission: BB_INVENTORY_DISCARD"
      />
    </AppShell>
  );
}
