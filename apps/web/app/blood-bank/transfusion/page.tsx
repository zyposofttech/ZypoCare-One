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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Activity } from "lucide-react";

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

function elapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
}

function statusBadge(status: string, reactionFlagged?: boolean) {
  const s = (status || "").toUpperCase();

  if (reactionFlagged || s === "REACTION") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        REACTION
      </span>
    );
  }

  if (s === "ACTIVE" || s === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {s === "IN_PROGRESS" ? "IN PROGRESS" : "ACTIVE"}
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
    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
      {s || "UNKNOWN"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Record Vitals Dialog                                              */
/* ------------------------------------------------------------------ */

function RecordVitalsDialog({
  open,
  issue,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  issue: any;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [temperature, setTemperature] = React.useState("");
  const [pulseRate, setPulseRate] = React.useState("");
  const [bloodPressure, setBloodPressure] = React.useState("");
  const [respiratoryRate, setRespiratoryRate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setTemperature("");
      setPulseRate("");
      setBloodPressure("");
      setRespiratoryRate("");
      setNotes("");
    }
  }, [open]);

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!issue?.id) return setErr("No transfusion selected");
    if (!temperature.trim()) return setErr("Temperature is required");
    if (!pulseRate.trim()) return setErr("Pulse rate is required");
    if (!bloodPressure.trim()) return setErr("Blood pressure is required");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/issue/${issue.id}/transfusion/vitals`, {
        method: "POST",
        body: JSON.stringify({
          temperature: temperature.trim(),
          pulseRate: pulseRate.trim(),
          bloodPressure: bloodPressure.trim(),
          respiratoryRate: respiratoryRate.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      await onSaved();
      toast({
        title: "Vitals Recorded",
        description: `Recorded vitals for unit ${issue.unitNumber ?? issue.id}`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to record vitals");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Failed to record vitals" });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !issue) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setErr(null); onClose(); } }}>
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Record Vitals
          </DialogTitle>
          <DialogDescription>
            Record patient vitals during active transfusion for unit {issue.unitNumber ?? issue.id}.
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
            <div className="text-sm font-semibold text-zc-text">Vital Signs</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Temperature</Label>
                <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="e.g. 98.6 F" />
              </div>

              <div className="grid gap-2">
                <Label>Pulse Rate</Label>
                <Input value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} placeholder="e.g. 72 bpm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Blood Pressure</Label>
                <Input value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="e.g. 120/80 mmHg" />
              </div>

              <div className="grid gap-2">
                <Label>Respiratory Rate</Label>
                <Input value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="e.g. 16 breaths/min" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Notes</div>
            <div className="grid gap-2">
              <Label>Additional Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any observations or remarks" />
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
              Save Vitals
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Start Transfusion Dialog                                          */
/* ------------------------------------------------------------------ */

function StartTransfusionDialog({
  open,
  issue,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  issue: any;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [verifiedBy, setVerifiedBy] = React.useState("");
  const [startNotes, setStartNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setVerifiedBy("");
      setStartNotes("");
    }
  }, [open]);

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!issue?.id) return setErr("No issue selected");
    if (!verifiedBy.trim()) return setErr("Verified-by name is required");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/issue/${issue.id}/transfusion/start`, {
        method: "POST",
        body: JSON.stringify({
          verifiedBy: verifiedBy.trim(),
          startNotes: startNotes.trim() || null,
        }),
      });

      await onSaved();
      toast({
        title: "Transfusion Started",
        description: `Started transfusion for unit ${issue.unitNumber ?? issue.id}`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to start transfusion");
      toast({ variant: "destructive", title: "Start failed", description: e?.message || "Failed to start transfusion" });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !issue) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setErr(null); onClose(); } }}>
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Start Transfusion
          </DialogTitle>
          <DialogDescription>
            Begin blood transfusion for unit {issue.unitNumber ?? issue.id}. Ensure bedside identity verification is complete.
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
            <div className="text-sm font-semibold text-zc-text">Verification</div>

            <div className="grid gap-2">
              <Label>Verified By</Label>
              <Input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Name of verifying nurse / doctor" />
              <p className="text-[11px] text-zc-muted">
                Person who performed bedside identity verification before transfusion.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Start Notes</Label>
              <Input value={startNotes} onChange={(e) => setStartNotes(e.target.value)} placeholder="Any pre-transfusion notes (optional)" />
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
              Start Transfusion
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  End Transfusion Dialog                                            */
/* ------------------------------------------------------------------ */

function EndTransfusionDialog({
  open,
  issue,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  issue: any;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  async function onConfirm() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!issue?.id) return setErr("No transfusion selected");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/issue/${issue.id}/transfusion/end`, {
        method: "POST",
      });

      await onSaved();
      toast({
        title: "Transfusion Ended",
        description: `Completed transfusion for unit ${issue.unitNumber ?? issue.id}`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to end transfusion");
      toast({ variant: "destructive", title: "End failed", description: e?.message || "Failed to end transfusion" });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !issue) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={drawerClassName("max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>End Transfusion</DialogTitle>
          <DialogDescription>
            This will mark the transfusion as completed for unit {issue.unitNumber ?? issue.id}.
          </DialogDescription>
        </DialogHeader>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            {issue.patientName ?? issue.patient ?? "Unknown Patient"}{" "}
            <span className="font-mono text-xs text-zc-muted">({issue.unitNumber ?? "-"})</span>
          </div>
          <div className="mt-2 text-sm text-zc-muted">
            Component: {issue.component ?? "-"} | Blood Group: {issue.bloodGroup ?? "-"}
          </div>
          {issue.startedAt ? (
            <div className="mt-1 text-sm text-zc-muted">
              Elapsed: {elapsed(issue.startedAt)}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            End Transfusion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function TransfusionMonitorPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_TRANSFUSION_READ");
  const canCreate = hasPerm(user, "BB_TRANSFUSION_CREATE");
  const canReaction = hasPerm(user, "BB_TRANSFUSION_REACTION");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState<any[]>([]);
  const [completed, setCompleted] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [vitalsOpen, setVitalsOpen] = React.useState(false);
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<any>(null);

  const allRows = React.useMemo(() => [...active, ...completed], [active, completed]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allRows;

    return allRows.filter((t: any) => {
      const hay = `${t.patientName ?? t.patient ?? ""} ${t.unitNumber ?? ""} ${t.component ?? ""} ${t.bloodGroup ?? ""} ${t.status ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [allRows, q]);

  const activeCount = active.length;
  const completedCount = completed.length;
  const reactionCount = allRows.filter((t: any) => t.reactionFlagged || (t.status || "").toUpperCase() === "REACTION").length;

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const [a, c]: any[] = await Promise.all([
        apiFetch(`/api/blood-bank/issue?branchId=${branchId}&transfusing=true`),
        apiFetch(`/api/blood-bank/issue?branchId=${branchId}&transfused_today=true`),
      ]);
      setActive(a ?? []);
      setCompleted(c ?? []);

      if (showToast) {
        toast({ title: "Transfusions refreshed", description: `Loaded ${(a ?? []).length} active, ${(c ?? []).length} completed today.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load transfusions";
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
    <AppShell title="Transfusion Monitor">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Activity className="h-5 w-5 text-red-500" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Transfusion Monitor</div>
              <div className="mt-1 text-sm text-zc-muted">
                Monitor active blood transfusions and record vitals
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

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Track active transfusions, record vitals, and monitor for adverse reactions in real time.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Active Transfusions</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{activeCount}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed Today</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{completedCount}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Reactions</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{reactionCount}</div>
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
                  placeholder="Search by patient, unit, component, blood group..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{allRows.length}</span>
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
            <CardTitle className="text-base">Transfusion Registry</CardTitle>
            <CardDescription className="text-sm">Active transfusions and those completed today. Record vitals and end transfusions from the actions column.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Component</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Started At</th>
                  <th className="px-4 py-3 text-left font-semibold">Elapsed</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Reaction Flag</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading transfusions..." : "No transfusions found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((t: any) => {
                  const s = (t.status || "").toUpperCase();
                  const isActive = s === "ACTIVE" || s === "IN_PROGRESS";

                  return (
                    <tr key={t.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{t.patientName ?? t.patient ?? "-"}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {t.unitNumber ?? "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">{t.component ?? "-"}</td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zc-text">{t.bloodGroup ?? "-"}</span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        {t.startedAt ? new Date(t.startedAt).toLocaleTimeString() : "-"}
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        {t.startedAt ? elapsed(t.startedAt) : "-"}
                      </td>

                      <td className="px-4 py-3">
                        {statusBadge(t.status, t.reactionFlagged)}
                      </td>

                      <td className="px-4 py-3">
                        {t.reactionFlagged ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                            None
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isActive && canCreate ? (
                            <>
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => {
                                  setSelected(t);
                                  setVitalsOpen(true);
                                }}
                                title="Record vitals"
                                aria-label="Record vitals"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                  setSelected(t);
                                  setEndOpen(true);
                                }}
                                title="End transfusion"
                                aria-label="End transfusion"
                              >
                                <IconChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}

                          {!isActive && canCreate ? (
                            <Button
                              variant="success"
                              size="icon"
                              onClick={() => {
                                setSelected(t);
                                setStartOpen(true);
                              }}
                              title="Start transfusion"
                              aria-label="Start transfusion"
                            >
                              <IconPlus className="h-4 w-4" />
                            </Button>
                          ) : null}
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
              <div className="text-sm font-semibold text-zc-text">Transfusion monitoring tips</div>
              <div className="mt-1 text-sm text-zc-muted">
                Record vitals every 15 minutes during active transfusion. Flag any adverse reactions immediately and notify the attending physician.
              </div>
            </div>
          </div>
        </div>
      </div>

      <RecordVitalsDialog
        open={vitalsOpen}
        issue={selected}
        onClose={() => setVitalsOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_TRANSFUSION_CREATE"
      />

      <StartTransfusionDialog
        open={startOpen}
        issue={selected}
        onClose={() => setStartOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_TRANSFUSION_CREATE"
      />

      <EndTransfusionDialog
        open={endOpen}
        issue={selected}
        onClose={() => setEndOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_TRANSFUSION_CREATE"
      />
    </AppShell>
  );
}
