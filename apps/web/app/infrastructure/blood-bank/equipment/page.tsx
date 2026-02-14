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
import { AlertTriangle, Loader2, Pencil, RefreshCw, Thermometer } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EquipmentRow = {
  id: string;
  equipmentId: string;
  equipmentType: string;
  make?: string;
  model?: string;
  serialNo?: string;
  tempRangeMinC?: number;
  tempRangeMaxC?: number;
  location?: string;
  capacityUnits?: number;
  lastCalibratedAt?: string;
  calibrationDueDate?: string;
  isActive?: boolean;
  createdAt?: string;
};

type EquipmentForm = {
  equipmentId: string;
  equipmentType: string;
  make: string;
  model: string;
  serialNo: string;
  tempRangeMinC: string;
  tempRangeMaxC: string;
  location: string;
  capacityUnits: string;
  calibrationDueDate: string;
};

type TempAlert = {
  id: string;
  equipmentId: string;
  temperatureC: number;
  recordedAt: string;
  equipment?: {
    equipmentId: string;
    equipmentType: string;
  };
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EQUIPMENT_TYPES = [
  "BLOOD_BANK_FRIDGE",
  "PLATELET_AGITATOR",
  "PLASMA_FREEZER",
  "CENTRIFUGE",
  "BLOOD_WARMER",
  "TUBE_SEALER",
  "CELL_WASHER",
  "IRRADIATOR",
  "OTHER",
] as const;

const EMPTY_FORM: EquipmentForm = {
  equipmentId: "",
  equipmentType: "",
  make: "",
  model: "",
  serialNo: "",
  tempRangeMinC: "",
  tempRangeMaxC: "",
  location: "",
  capacityUnits: "",
  calibrationDueDate: "",
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

function formatTempRange(row: EquipmentRow): string {
  if (row.tempRangeMinC == null && row.tempRangeMaxC == null) return "-";
  const min = row.tempRangeMinC != null ? `${row.tempRangeMinC}` : "?";
  const max = row.tempRangeMaxC != null ? `${row.tempRangeMaxC}` : "?";
  return `${min}\u00B0C to ${max}\u00B0C`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "-";
  }
}

function isCalibrationOverdue(row: EquipmentRow): boolean {
  if (!row.calibrationDueDate) return false;
  try {
    return new Date(row.calibrationDueDate) < new Date();
  } catch {
    return false;
  }
}

function rowToForm(row: EquipmentRow): EquipmentForm {
  return {
    equipmentId: row.equipmentId ?? "",
    equipmentType: row.equipmentType ?? "",
    make: row.make ?? "",
    model: row.model ?? "",
    serialNo: row.serialNo ?? "",
    tempRangeMinC: row.tempRangeMinC != null ? String(row.tempRangeMinC) : "",
    tempRangeMaxC: row.tempRangeMaxC != null ? String(row.tempRangeMaxC) : "",
    location: row.location ?? "",
    capacityUnits: row.capacityUnits != null ? String(row.capacityUnits) : "",
    calibrationDueDate: row.calibrationDueDate ? String(row.calibrationDueDate).slice(0, 10) : "",
  };
}

/* ------------------------------------------------------------------ */
/*  Editor Modal                                                       */
/* ------------------------------------------------------------------ */

function EditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: EquipmentRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<EquipmentForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm(initial ? rowToForm(initial) : { ...EMPTY_FORM });
  }, [open, initial]);

  function set<K extends keyof EquipmentForm>(key: K, value: EquipmentForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!form.equipmentId.trim()) return setErr("Equipment ID is required");
    if (!form.equipmentType) return setErr("Equipment type is required");

    const body: Record<string, unknown> = {
      equipmentId: form.equipmentId.trim(),
      equipmentType: form.equipmentType,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      serialNo: form.serialNo.trim() || null,
      tempRangeMinC: form.tempRangeMinC.trim() ? Number(form.tempRangeMinC) : null,
      tempRangeMaxC: form.tempRangeMaxC.trim() ? Number(form.tempRangeMaxC) : null,
      location: form.location.trim() || null,
      capacityUnits: form.capacityUnits.trim() ? Number(form.capacityUnits) : null,
      calibrationDueDate: form.calibrationDueDate || null,
      branchId,
    };

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/blood-bank/equipment", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else {
        if (!initial?.id) throw new Error("Missing equipment id");
        await apiFetch(`/api/blood-bank/equipment/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Equipment Created" : "Equipment Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} equipment "${form.equipmentId}"`,
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
              <Thermometer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Register Equipment" : "Edit Equipment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new blood bank equipment item with identification, temperature range and calibration details."
              : "Update equipment identification, temperature range and calibration details."}
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
          {/* Identification */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Identification</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Equipment ID</Label>
                <Input
                  value={form.equipmentId}
                  onChange={(e) => set("equipmentId", e.target.value)}
                  placeholder="e.g. FRIDGE-01"
                  disabled={mode === "edit"}
                  className={cn(mode === "edit" && "opacity-80")}
                />
              </div>

              <div className="grid gap-2">
                <Label>Equipment Type</Label>
                <Select value={form.equipmentType} onValueChange={(v) => set("equipmentType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Make</Label>
                <Input value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Thermo Fisher" />
              </div>

              <div className="grid gap-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. TSX-500" />
              </div>

              <div className="grid gap-2">
                <Label>Serial No.</Label>
                <Input value={form.serialNo} onChange={(e) => set("serialNo", e.target.value)} placeholder="e.g. SN-12345" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Temperature & Storage */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Temperature & Storage</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Temperature (&deg;C)</Label>
                <Input
                  value={form.tempRangeMinC}
                  onChange={(e) => set("tempRangeMinC", e.target.value)}
                  placeholder="e.g. 2"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Max Temperature (&deg;C)</Label>
                <Input
                  value={form.tempRangeMaxC}
                  onChange={(e) => set("tempRangeMaxC", e.target.value)}
                  placeholder="e.g. 6"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Capacity (Units)</Label>
                <Input
                  value={form.capacityUnits}
                  onChange={(e) => set("capacityUnits", e.target.value)}
                  placeholder="e.g. 500"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Blood Bank Room 1" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Calibration */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Calibration</div>

            <div className="grid gap-2">
              <Label>Calibration Due Date</Label>
              <Input
                value={form.calibrationDueDate}
                onChange={(e) => set("calibrationDueDate", e.target.value)}
                type="date"
              />
              <p className="text-[11px] text-zc-muted">
                Equipment with past-due calibration dates will be flagged in the overview.
              </p>
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
              {mode === "create" ? "Register Equipment" : "Save Changes"}
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

export default function BBEquipmentPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_EQUIPMENT_READ");
  const canCreate = hasPerm(user, "BB_EQUIPMENT_CREATE");
  const canUpdate = hasPerm(user, "BB_EQUIPMENT_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<EquipmentRow[]>([]);
  const [alerts, setAlerts] = React.useState<TempAlert[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<EquipmentRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r) => {
      const hay = `${r.equipmentId} ${r.equipmentType} ${r.make ?? ""} ${r.model ?? ""} ${r.serialNo ?? ""} ${r.location ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const overdueCount = React.useMemo(() => rows.filter((r) => isCalibrationOverdue(r)).length, [rows]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const [eqData, alertData] = await Promise.all([
        apiFetch<EquipmentRow[]>(`/api/blood-bank/equipment?branchId=${branchId}`),
        apiFetch<TempAlert[]>(`/api/blood-bank/equipment/temp-alerts?branchId=${branchId}`),
      ]);
      const sorted = [...(eqData ?? [])].sort((a, b) => (a.equipmentId || "").localeCompare(b.equipmentId || ""));
      setRows(sorted);
      setAlerts(alertData ?? []);

      if (showToast) {
        toast({ title: "Equipment refreshed", description: `Loaded ${sorted.length} equipment items.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load equipment";
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

  const activeCount = rows.filter((r) => r.isActive !== false).length;

  return (
    <AppShell title="BB Equipment">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Thermometer className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">BB Equipment</div>
              <div className="mt-1 text-sm text-zc-muted">
                Register blood bank equipment and monitor temperature breach alerts. Track calibration schedules.
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
                Register Equipment
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search equipment, monitor temperature alerts and calibration schedules.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Equipment</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Active: <span className="font-semibold tabular-nums">{activeCount}</span>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-3",
                  alerts.length > 0
                    ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10"
                    : "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-900/10",
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium",
                    alerts.length > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-sky-600 dark:text-sky-400",
                  )}
                >
                  Active Temp Alerts
                </div>
                <div
                  className={cn(
                    "mt-1 text-lg font-bold",
                    alerts.length > 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-sky-700 dark:text-sky-300",
                  )}
                >
                  {alerts.length}
                </div>
                {alerts.length > 0 ? (
                  <div className="mt-1 text-[11px] text-red-700/80 dark:text-red-300/80">
                    Requires immediate attention
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Overdue Calibrations</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{overdueCount}</div>
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
                  placeholder="Search by ID, type, make, model, serial, location..."
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

        {/* Temperature Alerts Banner */}
        {alerts.length > 0 ? (
          <Card className="border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Temperature Breach Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-red-200/60 bg-white/50 px-3 py-2 text-sm dark:border-red-900/40 dark:bg-red-950/20"
                  >
                    <Thermometer className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-red-700 dark:text-red-300">
                        {a.equipment?.equipmentId ?? a.equipmentId}
                      </span>
                      {a.equipment?.equipmentType ? (
                        <span className="ml-1 text-xs text-red-600/80 dark:text-red-400/80">
                          ({a.equipment.equipmentType.replace(/_/g, " ")})
                        </span>
                      ) : null}
                      <span className="mx-2 text-red-400">|</span>
                      <span className="font-semibold text-red-600 dark:text-red-300">
                        {a.temperatureC}&deg;C
                      </span>
                      <span className="ml-2 text-xs text-red-600/70 dark:text-red-400/70">
                        at {new Date(a.recordedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equipment Registry</CardTitle>
            <CardDescription className="text-sm">
              Registered blood bank equipment with calibration and temperature monitoring status.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Equipment ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Make / Model</th>
                  <th className="px-4 py-3 text-left font-semibold">Temp Range</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-left font-semibold">Calibration Due</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading equipment..." : "No equipment found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => {
                  const overdue = isCalibrationOverdue(r);

                  return (
                    <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {r.equipmentId}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        {r.equipmentType.replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{r.make || "-"}</div>
                        {r.model ? (
                          <div className="mt-0.5 text-xs text-zc-muted truncate" title={r.model}>
                            {r.model}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zc-text">{formatTempRange(r)}</span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">{r.location || "-"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs",
                            overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-zc-muted",
                          )}
                        >
                          {formatDate(r.calibrationDueDate)}
                          {overdue ? " (OVERDUE)" : ""}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {r.isActive !== false ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            INACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate ? (
                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => {
                                setSelected(r);
                                setEditOpen(true);
                              }}
                              title="Edit equipment"
                              aria-label="Edit equipment"
                            >
                              <Pencil className="h-4 w-4" />
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
      </div>

      <EditorModal
        mode="create"
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_EQUIPMENT_CREATE"
      />

      <EditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_EQUIPMENT_UPDATE"
      />
    </AppShell>
  );
}
