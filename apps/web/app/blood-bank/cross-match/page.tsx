"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, GitCompareArrows, Loader2, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CrossMatchRow = {
  id: string;
  requestId?: string;
  request?: {
    requestNumber?: string;
    patient?: { name: string };
    requestedComponent?: string;
  };
  bloodUnitId?: string;
  bloodUnit?: {
    unitNumber: string;
    bloodGroup?: string;
  };
  method: string;
  result: string;
  validUntil?: string;
  certificateNumber?: string;
  createdAt?: string;
};

type CrossMatchForm = {
  requestId: string;
  bloodUnitId: string;
  method: string;
  result: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const METHODS = [
  { value: "IMMEDIATE_SPIN", label: "Immediate Spin" },
  { value: "AHG_INDIRECT_COOMBS", label: "AHG / Indirect Coombs" },
  { value: "ELECTRONIC", label: "Electronic" },
];

const RESULTS = [
  { value: "COMPATIBLE", label: "Compatible" },
  { value: "INCOMPATIBLE", label: "Incompatible" },
  { value: "PENDING", label: "Pending" },
];

const EMPTY_FORM: CrossMatchForm = {
  requestId: "",
  bloodUnitId: "",
  method: "IMMEDIATE_SPIN",
  result: "PENDING",
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

function methodLabel(method: string) {
  const found = METHODS.find((m) => m.value === method);
  return found ? found.label : method.replace(/_/g, " ");
}

function resultBadge(result: string) {
  if (result === "COMPATIBLE") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        COMPATIBLE
      </span>
    );
  }
  if (result === "INCOMPATIBLE") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        INCOMPATIBLE
      </span>
    );
  }
  if (result === "PENDING") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        PENDING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
      {result}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Modal                                                       */
/* ------------------------------------------------------------------ */

function CrossMatchEditorModal({
  open,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CrossMatchForm>({ ...EMPTY_FORM });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({ ...EMPTY_FORM });
  }, [open]);

  function set<K extends keyof CrossMatchForm>(key: K, value: CrossMatchForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.requestId.trim()) return setErr("Request ID is required");
    if (!form.bloodUnitId.trim()) return setErr("Blood Unit ID is required");
    if (!form.method) return setErr("Cross-match method is required");
    if (!form.result) return setErr("Cross-match result is required");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/requests/${form.requestId.trim()}/cross-match`, {
        method: "POST",
        body: JSON.stringify({
          bloodUnitId: form.bloodUnitId.trim(),
          method: form.method,
          result: form.result,
          branchId,
        }),
      });

      await onSaved();

      toast({
        title: "Cross-Match Recorded",
        description: `Successfully recorded cross-match result for request "${form.requestId.trim()}"`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
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
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <GitCompareArrows className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Record Cross-Match
          </DialogTitle>
          <DialogDescription>
            Record a cross-match result between a blood request and a blood unit.
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
          {/* Request & Unit */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Request & Unit</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Request ID</Label>
                <Input value={form.requestId} onChange={(e) => set("requestId", e.target.value)} placeholder="e.g. req_abc123" />
              </div>

              <div className="grid gap-2">
                <Label>Blood Unit ID</Label>
                <Input value={form.bloodUnitId} onChange={(e) => set("bloodUnitId", e.target.value)} placeholder="e.g. unit_xyz789" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Cross-Match */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Cross-Match</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => set("method", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Result</Label>
                <Select value={form.result} onValueChange={(v) => set("result", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record Cross-Match
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CrossMatchPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_CROSSMATCH_READ");
  const canCreate = hasPerm(user, "BB_CROSSMATCH_CREATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<CrossMatchRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r) => {
      const hay = `${r.request?.requestNumber ?? ""} ${r.request?.patient?.name ?? ""} ${r.bloodUnit?.unitNumber ?? ""} ${r.method} ${r.result} ${r.certificateNumber ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<CrossMatchRow[]>(`/api/blood-bank/cross-match?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => {
        const da = a.createdAt ?? "";
        const db = b.createdAt ?? "";
        return db.localeCompare(da);
      });
      setRows(sorted);

      if (showToast) {
        toast({ title: "Cross-matches refreshed", description: `Loaded ${sorted.length} records.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load cross-match records";
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

  const totalXM = rows.length;
  const compatibleToday = rows.filter((r) => {
    if (r.result !== "COMPATIBLE") return false;
    if (!r.createdAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return r.createdAt.slice(0, 10) === today;
  }).length;
  const pendingCount = rows.filter((r) => r.result === "PENDING").length;

  return (
    <AppShell title="Cross-Match Workbench">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <GitCompareArrows className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Cross-Match Workbench</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage cross-matching of patient samples against blood units.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Record Cross-Match
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search cross-match records. Record new cross-match results between patient requests and blood units.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total XM</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalXM}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Compatible Today</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{compatibleToday}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{pendingCount}</div>
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
                  placeholder="Search by request #, patient, unit #, method, result..."
                  className="pl-10"
                />
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
            <CardTitle className="text-base">Cross-Match Records</CardTitle>
            <CardDescription className="text-sm">Cross-match results between patient blood requests and available blood units.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Request #</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Method</th>
                  <th className="px-4 py-3 text-left font-semibold">Result</th>
                  <th className="px-4 py-3 text-left font-semibold">Valid Until</th>
                  <th className="px-4 py-3 text-left font-semibold">Certificate #</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading cross-match records..." : "No cross-match records found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">
                        {r.request?.requestNumber ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.request?.patient?.name ?? "-"}</div>
                      {r.request?.requestedComponent ? (
                        <div className="mt-0.5 text-xs text-zc-muted">{r.request.requestedComponent.replace(/_/g, " ")}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs">
                        {r.bloodUnit?.unitNumber ?? "-"}
                      </span>
                      {r.bloodUnit?.bloodGroup ? (
                        <div className="mt-0.5 text-xs text-zc-muted">{r.bloodUnit.bloodGroup.replace(/_/g, " ")}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{methodLabel(r.method)}</td>

                    <td className="px-4 py-3">{resultBadge(r.result)}</td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.validUntil ? new Date(r.validUntil).toLocaleString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.certificateNumber ?? "-"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Actions placeholder - can be extended with view/edit as needed */}
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
              <div className="text-sm font-semibold text-zc-text">Cross-match workflow</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Select a pending blood request, then 2) Match against available blood units, then 3) Record the cross-match result and certificate.
              </div>
            </div>
          </div>
        </div>
      </div>

      <CrossMatchEditorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_CROSSMATCH_CREATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
