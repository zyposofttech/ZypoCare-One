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
import { AlertTriangle, Loader2, RefreshCw, Siren } from "lucide-react";

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

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        ACTIVE
      </span>
    );
  }
  if (s === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        COMPLETED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300">
      {s || "UNKNOWN"}
    </span>
  );
}

function formatDuration(activatedAt: string | null | undefined, deactivatedAt?: string | null | undefined, status?: string): string {
  if (!activatedAt) return "-";
  const start = new Date(activatedAt).getTime();
  const end = deactivatedAt ? new Date(deactivatedAt).getTime() : (status === "ACTIVE" ? Date.now() : new Date(activatedAt).getTime());
  const diffMs = Math.max(0, end - start);
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) return `${hrs}h ${remMins}m`;
  return `${mins}m`;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function MTPDashboardPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_MTP_READ");
  const canActivate = hasPerm(user, "BB_MTP_ACTIVATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [activateOpen, setActivateOpen] = React.useState(false);

  /* ---- Filtered list ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r: any) => {
      const hay = `${r.mtpId ?? r.id} ${r.patientName ?? r.patient ?? ""} ${r.indication ?? ""} ${r.status ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  /* ---- Data fetch ---- */
  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data: any = await apiFetch(`/api/blood-bank/issue/mtp?branchId=${branchId}`);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      if (showToast) {
        toast({ title: "MTP sessions refreshed", description: `Loaded ${list.length} sessions.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load MTP sessions";
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

  /* ---- Stats ---- */
  const activeSessions = rows.filter((r: any) => (r.status || "").toUpperCase() === "ACTIVE").length;
  const totalSessions = rows.length;
  const avgUnits = totalSessions > 0
    ? Math.round(rows.reduce((acc: number, r: any) => acc + (r.unitsIssued ?? r.prbcCount ?? 0) + (r.ffpCount ?? 0) + (r.pltCount ?? 0), 0) / totalSessions)
    : 0;

  /* ---- Deactivate handler ---- */
  async function handleDeactivate(sessionId: string) {
    try {
      await apiFetch(`/api/blood-bank/issue/mtp/${sessionId}/deactivate`, { method: "POST" });
      toast({ title: "MTP Deactivated", description: `Session ${sessionId} has been deactivated.`, variant: "success" });
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deactivate failed", description: e?.message || "Deactivate failed" });
    }
  }

  return (
    <AppShell title="MTP Dashboard">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Siren className="h-5 w-5 text-red-600" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">MTP Dashboard</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage Massive Transfusion Protocol sessions
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canActivate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setActivateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Activate MTP
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search MTP sessions and manage protocol activations. Active sessions are highlighted for immediate attention.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Active Sessions</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{activeSessions}</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Sessions</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalSessions}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Avg Units / Session</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{avgUnits}</div>
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
                  placeholder="Search by MTP ID, patient, indication, status..."
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
            <CardTitle className="text-base">MTP Sessions</CardTitle>
            <CardDescription className="text-sm">All Massive Transfusion Protocol sessions for this branch.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">MTP ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Indication</th>
                  <th className="px-4 py-3 text-left font-semibold">Activated At</th>
                  <th className="px-4 py-3 text-left font-semibold">Units Issued</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading MTP sessions..." : "No MTP sessions found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((s: any) => {
                  const isActive = (s.status || "").toUpperCase() === "ACTIVE";
                  return (
                    <tr key={s.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {s.mtpId ?? s.id}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{s.patientName ?? s.patient ?? "-"}</div>
                        {s.patientId ? (
                          <div className="mt-0.5 text-xs text-zc-muted truncate" title={s.patientId}>
                            ID: {s.patientId}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-zc-muted">{s.indication ?? "-"}</td>

                      <td className="px-4 py-3 text-zc-muted">
                        {s.activatedAt ? new Date(s.activatedAt).toLocaleString() : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zc-text">
                          {s.unitsIssued != null
                            ? s.unitsIssued
                            : `PRBC: ${s.prbcCount ?? 0} / FFP: ${s.ffpCount ?? 0} / Plt: ${s.pltCount ?? 0}`}
                        </span>
                      </td>

                      <td className="px-4 py-3">{statusBadge(s.status)}</td>

                      <td className="px-4 py-3 text-zc-muted">
                        {formatDuration(s.activatedAt, s.deactivatedAt ?? s.completedAt, s.status)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isActive && canActivate ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleDeactivate(s.id)}
                              title="Deactivate MTP"
                              aria-label="Deactivate MTP"
                            >
                              Deactivate
                            </Button>
                          ) : null}
                          <Button variant="success" size="icon" title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">About Massive Transfusion Protocol</div>
              <div className="mt-1 text-sm text-zc-muted">
                MTP is activated during life-threatening haemorrhage. Monitor active sessions closely, ensure blood products are issued promptly, and deactivate when the patient is stabilised.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activate MTP Dialog */}
      <ActivateMTPDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canActivate}
        deniedMessage="Missing permission: BB_MTP_ACTIVATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Activate MTP Dialog                                               */
/* ------------------------------------------------------------------ */

function ActivateMTPDialog({
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
  branchId: string | null | undefined;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    patientId: "",
    indication: "",
    notes: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({ patientId: "", indication: "", notes: "" });
  }, [open]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!form.patientId.trim()) return setErr("Patient ID is required");
    if (!form.indication.trim()) return setErr("Indication is required");

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/issue/mtp/activate", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          patientId: form.patientId.trim(),
          indication: form.indication.trim(),
          notes: form.notes.trim() || null,
        }),
      });

      await onSaved();

      toast({
        title: "MTP Activated",
        description: `Massive Transfusion Protocol activated for patient ${form.patientId.trim()}`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Activation failed");
      toast({ variant: "destructive", title: "Activation failed", description: e?.message || "Activation failed" });
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
          <DialogTitle className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Siren className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            Activate MTP
          </DialogTitle>
          <DialogDescription>
            Activate a Massive Transfusion Protocol session for a patient requiring emergent transfusion support.
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
            <div className="text-sm font-semibold text-zc-text">Patient & Indication</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Patient ID</Label>
                <Input
                  value={form.patientId}
                  onChange={(e) => set("patientId", e.target.value)}
                  placeholder="e.g. PAT-00123"
                />
              </div>

              <div className="grid gap-2">
                <Label>Indication</Label>
                <Input
                  value={form.indication}
                  onChange={(e) => set("indication", e.target.value)}
                  placeholder="e.g. Massive haemorrhage, trauma"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Additional clinical notes..."
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
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Activate MTP
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
