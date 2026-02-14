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
import { AlertTriangle, Loader2, Pencil, RefreshCw, GitCompareArrows } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type RequestRow = {
  id: string;
  requestNumber?: string;
  patientId?: string;
  patient?: { name: string; uhid?: string };
  requestedComponent: string;
  quantityUnits: number;
  urgency: string;
  status: string;
  indication?: string;
  createdAt?: string;
};

type RequestForm = {
  patientId: string;
  requestedComponent: string;
  quantityUnits: string;
  urgency: string;
  indication: string;
};

/* ------------------------------------------------------------------ */
/*  Options                                                           */
/* ------------------------------------------------------------------ */

const COMPONENT_OPTIONS = [
  { value: "WHOLE_BLOOD", label: "Whole Blood" },
  { value: "PRBC", label: "PRBC" },
  { value: "FFP", label: "FFP" },
  { value: "PLATELET_RDP", label: "Platelet RDP" },
  { value: "PLATELET_SDP", label: "Platelet SDP" },
  { value: "CRYOPRECIPITATE", label: "Cryoprecipitate" },
] as const;

const URGENCY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "MTP", label: "MTP" },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: RequestForm = {
  patientId: "",
  requestedComponent: "",
  quantityUnits: "",
  urgency: "",
  indication: "",
};

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

function componentLabel(value: string): string {
  const opt = COMPONENT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

function urgencyBadge(urgency: string) {
  const u = (urgency || "").toUpperCase();
  switch (u) {
    case "ROUTINE":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "URGENT":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "EMERGENCY":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "MTP":
      return "border-red-200/70 bg-red-50/70 text-red-700 font-bold dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "PENDING":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "SAMPLE_RECEIVED":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "CROSS_MATCHING":
      return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
    case "READY":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "ISSUED":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
    case "COMPLETED":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "CANCELLED":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function formatStatus(status: string): string {
  return (status || "").replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  EditorModal                                                       */
/* ------------------------------------------------------------------ */

function EditorModal({
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
  branchId: string | null;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<RequestForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({ ...EMPTY_FORM });
  }, [open]);

  function set<K extends keyof RequestForm>(key: K, value: RequestForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.patientId.trim()) return setErr("Patient ID / UHID is required");
    if (!form.requestedComponent) return setErr("Requested component is required");

    const qty = Number(form.quantityUnits);
    if (!form.quantityUnits.trim() || !Number.isFinite(qty) || qty < 1) {
      return setErr("Quantity must be at least 1");
    }

    if (!form.urgency) return setErr("Urgency level is required");

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/requests", {
        method: "POST",
        body: JSON.stringify({
          patientId: form.patientId.trim(),
          requestedComponent: form.requestedComponent,
          quantityUnits: qty,
          urgency: form.urgency,
          indication: form.indication.trim() || null,
          branchId,
        }),
      });

      await onSaved();

      toast({
        title: "Request Created",
        description: `Successfully created blood request for component "${componentLabel(form.requestedComponent)}"`,
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
            Create Blood Request
          </DialogTitle>
          <DialogDescription>
            Submit a new clinical blood request from ward or OT. Specify the patient, component, quantity and urgency.
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
          {/* Section: Patient */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Patient</div>

            <div className="grid gap-2">
              <Label>Patient ID / UHID</Label>
              <Input
                value={form.patientId}
                onChange={(e) => set("patientId", e.target.value)}
                placeholder="Enter patient UHID or ID"
              />
            </div>
          </div>

          <Separator />

          {/* Section: Request Details */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Request Details</div>

            <div className="grid gap-2">
              <Label>Requested Component</Label>
              <Select value={form.requestedComponent} onValueChange={(v) => set("requestedComponent", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity (Units)</Label>
                <Input
                  value={form.quantityUnits}
                  onChange={(e) => set("quantityUnits", e.target.value)}
                  placeholder="e.g. 2"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Clinical */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Clinical</div>

            <div className="grid gap-2">
              <Label>Indication (optional)</Label>
              <Textarea
                value={form.indication}
                onChange={(e) => set("indication", e.target.value)}
                placeholder="Clinical indication for the blood request"
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
              Create Request
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function BloodRequestsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_CROSSMATCH_READ");
  const canCreate = hasPerm(user, "BB_CROSSMATCH_CREATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);

  /* ---- derived data ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r) => {
      const hay = `${r.requestNumber ?? ""} ${r.patient?.name ?? ""} ${r.patient?.uhid ?? ""} ${r.requestedComponent} ${r.urgency} ${r.status} ${r.indication ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const pendingCount = React.useMemo(() => {
    return rows.filter((r) => (r.status || "").toUpperCase() === "PENDING").length;
  }, [rows]);

  const readyCount = React.useMemo(() => {
    return rows.filter((r) => (r.status || "").toUpperCase() === "READY").length;
  }, [rows]);

  /* ---- data fetch ---- */
  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<RequestRow[]>(`/api/blood-bank/requests?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      setRows(sorted);

      if (showToast) {
        toast({ title: "Requests refreshed", description: `Loaded ${sorted.length} blood requests.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load blood requests";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (branchId) void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- render ---- */
  return (
    <AppShell title="Blood Requests">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <GitCompareArrows className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Blood Requests</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage clinical blood requests from wards and operation theatres. Track request status from submission through issue.
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
                Create Request
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search blood requests and track status. Submit new requests for clinical blood component needs.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {/* Stats */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Requests</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{pendingCount}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Ready for Issue</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{readyCount}</div>
              </div>
            </div>

            {/* Search + count */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by request #, patient, component, urgency, status..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {/* Error banner */}
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
            <CardTitle className="text-base">Blood Request Registry</CardTitle>
            <CardDescription className="text-sm">
              Clinical blood requests with status tracking from submission through cross-matching to issue.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Request #</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Component</th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Urgency</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading blood requests..." : "No blood requests found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.requestNumber || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.patient?.name ?? "-"}</div>
                      {r.patient?.uhid ? (
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={r.patient.uhid}>
                          UHID: {r.patient.uhid}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{componentLabel(r.requestedComponent)}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.quantityUnits}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyBadge(r.urgency))}>
                        {r.urgency}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadge(r.status))}>
                        {formatStatus(r.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs text-zc-muted">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="info"
                          size="icon"
                          title="View request details"
                          aria-label="View request details"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <EditorModal
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
