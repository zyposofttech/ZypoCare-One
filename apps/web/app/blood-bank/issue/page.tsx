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
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, PackageCheck, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IssueRow = {
  id: string;
  issueNumber?: string;
  unitNumber?: string;
  patient?: { firstName?: string; lastName?: string; uhid?: string };
  crossMatchRef?: string;
  crossMatchId?: string;
  issuedToPerson?: string;
  issuedToWard?: string;
  transportBoxTemp?: string | number | null;
  status?: string;
  issuedAt?: string;
  createdAt?: string;
  notes?: string | null;
};

type IssueForm = {
  crossMatchId: string;
  issuedToPerson: string;
  issuedToWard: string;
  transportBoxTemp: string;
  notes: string;
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

function statusBadge(status?: string) {
  const s = (status || "").toUpperCase();
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
    s === "ISSUED" && "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400",
    s === "RETURNED" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400",
    s === "TRANSFUSED" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400",
    s === "DISCARDED" && "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400",
  );
}

const EMPTY_FORM: IssueForm = {
  crossMatchId: "",
  issuedToPerson: "",
  issuedToWard: "",
  transportBoxTemp: "",
  notes: "",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IssueDeskPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_ISSUE_READ");
  const canCreate = hasPerm(user, "BB_ISSUE_CREATE");

  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<IssueRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  /* Dialog state */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<IssueForm>(EMPTY_FORM);

  /* ---- data fetch ---- */
  async function reload(showToast = false) {
    if (!branchId) return;
    setError(null);
    setLoading(true);
    try {
      const data: any = await apiFetch(`/api/blood-bank/issue?branchId=${branchId}`);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      if (showToast) {
        toast({ title: "Refreshed", description: `Loaded ${list.length} issues.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load issues";
      setError(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- filtering ---- */
  const filtered = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.issueNumber ?? ""} ${r.unitNumber ?? ""} ${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""} ${r.patient?.uhid ?? ""} ${r.crossMatchRef ?? ""} ${r.issuedToPerson ?? ""} ${r.issuedToWard ?? ""} ${r.status ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search]);

  /* ---- stats ---- */
  const stats = React.useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    let issuedToday = 0;
    let active = 0;
    let returns = 0;
    for (const r of rows) {
      const dateStr = (r.issuedAt || r.createdAt || "").slice(0, 10);
      if (dateStr === todayStr && r.status === "ISSUED") issuedToday++;
      if (r.status === "ISSUED") active++;
      if (r.status === "RETURNED") returns++;
    }
    return { issuedToday, active, returns };
  }, [rows]);

  /* ---- dialog handlers ---- */
  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function set<K extends keyof IssueForm>(key: K, value: IssueForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    if (!form.crossMatchId.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Cross-Match ID is required" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/blood-bank/issue", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          crossMatchId: form.crossMatchId.trim(),
          issuedToPerson: form.issuedToPerson.trim() || null,
          issuedToWard: form.issuedToWard.trim() || null,
          transportBoxTemp: form.transportBoxTemp.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      toast({ title: "Issue Created", description: "Blood unit issued successfully.", variant: "success" });
      setDialogOpen(false);
      await reload(false);
    } catch (e: any) {
      const msg = e?.message || "Failed to issue blood unit";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Issue Desk">
      <div className="grid gap-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <PackageCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zc-text">Issue Desk</h1>
              <p className="mt-1 text-sm text-zc-muted">Issue blood units against cross-match results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void reload(true)} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <IconPlus className="mr-2 h-4 w-4" /> New Issue
              </Button>
            )}
          </div>
        </div>

        {/* ---- Error banner ---- */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-4 py-3 text-sm text-zc-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ---- Overview stat cards ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Issue Overview</CardTitle>
            <CardDescription className="text-sm">Summary of blood issue activity for this branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
                <div className="text-[11px] font-medium uppercase tracking-wider text-green-700 dark:text-green-400">Issued Today</div>
                <div className="mt-1 text-2xl font-bold text-green-800 dark:text-green-300">{stats.issuedToday}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-[11px] font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">Active</div>
                <div className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-300">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">Returns</div>
                <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">{stats.returns}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Search + counter ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issue Registry</CardTitle>
            <CardDescription className="text-sm">Track all blood unit issues and their current status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                <Input
                  placeholder="Search issues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span> issues
              </p>
            </div>
          </CardContent>

          {/* ---- Table ---- */}
          <Separator />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Issue #</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Cross-Match Ref</th>
                  <th className="px-4 py-3 text-left font-semibold">Issued To</th>
                  <th className="px-4 py-3 text-left font-semibold">Transport Temp</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading issues..." : "No issues found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3 font-medium">{row.issueNumber ?? "---"}</td>
                    <td className="px-4 py-3">{row.unitNumber ?? "---"}</td>
                    <td className="px-4 py-3">
                      {row.patient
                        ? `${row.patient.firstName ?? ""} ${row.patient.lastName ?? ""} (${row.patient.uhid ?? ""})`
                        : "---"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.crossMatchRef ?? row.crossMatchId ?? "---"}</td>
                    <td className="px-4 py-3">
                      <div>{row.issuedToPerson ?? "---"}</div>
                      {row.issuedToWard && (
                        <div className="text-xs text-zc-muted">{row.issuedToWard}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.transportBoxTemp != null ? `${row.transportBoxTemp}` : "---"}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(row.status)}>
                        {row.status ?? "---"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zc-muted">
                      {row.issuedAt
                        ? new Date(row.issuedAt).toLocaleString()
                        : row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "---"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void 0}
                          className="rounded-lg p-1.5 hover:bg-zc-panel"
                          title="View"
                        >
                          <IconChevronRight className="h-4 w-4 text-zc-muted" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---- Bottom tip ---- */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <h3 className="text-sm font-semibold text-zc-text">Blood Issue Desk</h3>
          <p className="mt-1 text-sm text-zc-muted">
            Issue blood units against confirmed cross-match results. Each issued unit is tracked from release to transfusion or return. Ensure transport temperature is recorded for cold-chain compliance.
          </p>
        </div>
      </div>

      {/* ---- Create Issue Dialog (drawer-style) ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/30">
                <PackageCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Issue Blood Unit</DialogTitle>
                <DialogDescription>Issue a cross-matched blood unit for patient</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="grid gap-6">
            {/* Cross-Match Info */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Cross-Match Information</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cross-Match ID</Label>
                  <Input
                    value={form.crossMatchId}
                    onChange={(e) => set("crossMatchId", e.target.value)}
                    placeholder="Enter cross-match ID"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Issue Details */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Issue Details</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Issued To (Person)</Label>
                  <Input
                    value={form.issuedToPerson}
                    onChange={(e) => set("issuedToPerson", e.target.value)}
                    placeholder="Name of person collecting"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Issued To (Ward)</Label>
                  <Input
                    value={form.issuedToWard}
                    onChange={(e) => set("issuedToWard", e.target.value)}
                    placeholder="e.g. ICU, Ward 3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Transport Box Temperature</Label>
                  <Input
                    value={form.transportBoxTemp}
                    onChange={(e) => set("transportBoxTemp", e.target.value)}
                    placeholder="e.g. 4.2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Issue Unit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
