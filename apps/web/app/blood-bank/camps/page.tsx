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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Tent } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CampRow = {
  id: string;
  campCode: string;
  location: string;
  scheduledDate?: string;
  organizer: string;
  estimatedDonors?: number;
  actualDonors?: number;
  status: string;
  notes?: string;
  createdAt?: string;
};

type CampForm = {
  campCode: string;
  location: string;
  scheduledDate: string;
  organizer: string;
  estimatedDonors: string;
  status: string;
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

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "PLANNED":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "IN_PROGRESS":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "COMPLETED":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "CANCELLED":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function emptyForm(): CampForm {
  return {
    campCode: "",
    location: "",
    scheduledDate: "",
    organizer: "",
    estimatedDonors: "",
    status: "PLANNED",
    notes: "",
  };
}

function rowToForm(row: CampRow): CampForm {
  return {
    campCode: row.campCode ?? "",
    location: row.location ?? "",
    scheduledDate: row.scheduledDate ? String(row.scheduledDate).slice(0, 10) : "",
    organizer: row.organizer ?? "",
    estimatedDonors: row.estimatedDonors != null ? String(row.estimatedDonors) : "",
    status: row.status ?? "PLANNED",
    notes: row.notes ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*  Editor Modal                                                       */
/* ------------------------------------------------------------------ */

function CampEditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: CampRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CampForm>(emptyForm());

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm(initial ? rowToForm(initial) : emptyForm());
  }, [open, initial]);

  function set<K extends keyof CampForm>(key: K, value: CampForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.campCode.trim()) return setErr("Camp code is required");
    if (!form.location.trim()) return setErr("Location is required");
    if (!form.organizer.trim()) return setErr("Organizer is required");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/blood-bank/camps", {
          method: "POST",
          body: JSON.stringify({
            campCode: form.campCode.trim(),
            location: form.location.trim(),
            scheduledDate: form.scheduledDate || null,
            organizer: form.organizer.trim(),
            estimatedDonors: form.estimatedDonors.trim() ? Number(form.estimatedDonors) : null,
            status: form.status,
            notes: form.notes.trim() || null,
            branchId,
          }),
        });
      } else {
        if (!initial?.id) throw new Error("Missing camp id");
        await apiFetch(`/api/blood-bank/camps/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            campCode: form.campCode.trim(),
            location: form.location.trim(),
            scheduledDate: form.scheduledDate || null,
            organizer: form.organizer.trim(),
            estimatedDonors: form.estimatedDonors.trim() ? Number(form.estimatedDonors) : null,
            status: form.status,
            notes: form.notes.trim() || null,
          }),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Camp Created" : "Camp Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} camp "${form.campCode}"`,
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
              <Tent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Register Camp" : "Edit Camp"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new blood donation camp event with location, organizer and target details."
              : "Update camp details, targets and status."}
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
          {/* Camp Details */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Camp Details</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Camp Code</Label>
                <Input value={form.campCode} onChange={(e) => set("campCode", e.target.value)} placeholder="e.g. CAMP-2024-001" />
              </div>

              <div className="grid gap-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Community Hall, Sector 5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Organizer</Label>
                <Input value={form.organizer} onChange={(e) => set("organizer", e.target.value)} placeholder="e.g. Red Cross Society" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Targets */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Targets</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Estimated Donors</Label>
                <Input
                  type="number"
                  value={form.estimatedDonors}
                  onChange={(e) => set("estimatedDonors", e.target.value)}
                  placeholder="e.g. 100"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Notes</div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Additional information about the camp..."
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
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Register Camp" : "Save Changes"}
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

export default function CampsPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_CAMP_READ");
  const canCreate = hasPerm(user, "BB_CAMP_CREATE");
  const canUpdate = hasPerm(user, "BB_CAMP_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<CampRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<CampRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((c) => {
      const hay = `${c.campCode} ${c.location} ${c.organizer}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<CampRow[]>(`/api/blood-bank/camps?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => (a.campCode || "").localeCompare(b.campCode || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Camps refreshed", description: `Loaded ${sorted.length} camps.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load camps";
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

  const totalCamps = rows.length;
  const upcomingCamps = rows.filter((r) => r.status === "PLANNED").length;
  const completedCamps = rows.filter((r) => r.status === "COMPLETED").length;

  return (
    <AppShell title="Donation Camps">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Tent className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Donation Camps</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage blood donation camp events. Register new camps, track progress and monitor donor targets.
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
                Register Camp
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search donation camps and manage camp events. Track planned, in-progress and completed camps.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Camps</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalCamps}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Upcoming</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{upcomingCamps}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{completedCamps}</div>
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
                  placeholder="Search by camp code, location, organizer..."
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
            <CardTitle className="text-base">Camp Registry</CardTitle>
            <CardDescription className="text-sm">All registered blood donation camp events for this branch.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Camp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Organizer</th>
                  <th className="px-4 py-3 text-left font-semibold">Est. Donors</th>
                  <th className="px-4 py-3 text-left font-semibold">Actual</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading camps..." : "No camps found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {c.campCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{c.location}</div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{c.organizer || "-"}</td>

                    <td className="px-4 py-3 text-zc-muted tabular-nums">{c.estimatedDonors ?? "-"}</td>

                    <td className="px-4 py-3 text-zc-muted tabular-nums">{c.actualDonors ?? "-"}</td>

                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadge(c.status))}>
                        {c.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => {
                              setSelected(c);
                              setEditOpen(true);
                            }}
                            title="Edit camp"
                            aria-label="Edit camp"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <CampEditorModal
        mode="create"
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_CAMP_CREATE"
        branchId={branchId ?? ""}
      />

      <CampEditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_CAMP_UPDATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
