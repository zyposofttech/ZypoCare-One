"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationNodePicker } from "@/components/infrastructure/LocationNodePicker";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

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
import { useAuthStore } from "@/lib/auth/store";

import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Building2, Loader2, Pencil, RefreshCw, Settings2, Trash2, Wand2 } from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type DepartmentRow = { id: string; code: string; name: string };

type UnitTypeCatalogRow = { id: string; code: string; name: string; usesRoomsDefault?: boolean };

type BranchUnitTypeRow =
  | string
  | {
      unitTypeId: string;
      isEnabled: boolean;
    };

type LocationNodeLite = { id: string; name: string; code?: string; type?: string };

type UnitRow = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  locationNodeId?: string | null;

  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;

  department?: DepartmentRow | null;
  unitType?: { id: string; code: string; name: string } | null;
  locationNode?: LocationNodeLite | null;
};

type UnitForm = {
  departmentId: string;
  unitTypeId: string;
  locationNodeId: string;

  code: string;
  name: string;

  usesRooms: boolean;
  isActive: boolean;
};

/* --------------------------------- Utils --------------------------------- */

const LS_KEY = "zc.superadmin.infrastructure.units.branchId";

function readLS(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

/**
 * Acceptance: TH01, OT-1, LAB1
 * - Uppercase normalized
 * - 2–32 chars
 * - Letters/numbers/hyphen only
 */
function validateUnitCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Unit code is required";
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(v)) {
    return "Code must be 2–32 chars, letters/numbers/hyphen (example: OT-1, TH01, LAB1)";
  }
  return null;
}

function safeBool(v: any) {
  return v === true;
}

function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
  if (!rows?.length) return [];
  if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
  return (rows as any[])
    .filter((r) => r?.unitTypeId && r?.isEnabled === true)
    .map((r) => String(r.unitTypeId));
}

function branchOneLineLabel(b: BranchRow) {
  return `${b.name} (${b.code}) • ${b.city}`;
}

/* ------------------------------ Modal: Editor ------------------------------ */

function UnitEditorModal({
  mode,
  open,
  branchId,
  departments,
  enabledUnitTypes,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  open: boolean;
  branchId: string | undefined;

  departments: DepartmentRow[];
  enabledUnitTypes: UnitTypeCatalogRow[];

  initial?: UnitRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<UnitForm>({
    departmentId: initial?.departmentId ?? "",
    unitTypeId: initial?.unitTypeId ?? "",
    locationNodeId: (initial?.locationNodeId ?? "") || "",
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    usesRooms: initial?.usesRooms ?? true,
    isActive: initial?.isActive ?? true,
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({
      departmentId: initial?.departmentId ?? "",
      unitTypeId: initial?.unitTypeId ?? "",
      locationNodeId: (initial?.locationNodeId ?? "") || "",
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      usesRooms: initial?.usesRooms ?? true,
      isActive: initial?.isActive ?? true,
    });
  }, [open, initial]);

  const selectTriggerCls = "h-11 w-full min-w-0 overflow-hidden rounded-xl border-zc-border bg-zc-card";
  const selectContentMaxW = "max-w-[min(560px,calc(100vw-2rem))]";

  async function onSubmit() {
    setErr(null);

    if (!branchId) return setErr("Branch is required");
    if (!form.departmentId) return setErr("Department is required");
    if (!form.unitTypeId) return setErr("Unit Type is required");
    if (!form.locationNodeId) return setErr("Location is required");
    if (!form.name.trim()) return setErr("Unit name is required");

    if (mode === "create") {
      const ce = validateUnitCode(form.code);
      if (ce) return setErr(ce);
    }

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/units?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            departmentId: form.departmentId,
            unitTypeId: form.unitTypeId,
            locationNodeId: String(form.locationNodeId),
            code: normalizeCode(form.code),
            name: form.name.trim(),
            usesRooms: safeBool(form.usesRooms),
            isActive: safeBool(form.isActive),
          }),
        });
      } else {
        if (!initial?.id) throw new Error("Missing unit id");
        await apiFetch(`/api/infrastructure/units/${encodeURIComponent(initial.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            departmentId: form.departmentId,
            unitTypeId: form.unitTypeId,
            locationNodeId: String(form.locationNodeId),
            name: form.name.trim(),
            usesRooms: safeBool(form.usesRooms),
            isActive: safeBool(form.isActive),
          }),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Unit Created" : "Unit Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} unit "${form.name}".`,
        variant: "success" as any,
      });

      onClose();
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  const unitTypeHint = React.useMemo(() => {
    const ut = enabledUnitTypes.find((x) => x.id === form.unitTypeId);
    return ut?.usesRoomsDefault;
  }, [enabledUnitTypes, form.unitTypeId]);

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
      <DialogContent className={drawerClassName("max-w-[820px]")} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Create Unit" : "Edit Unit"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a Unit/Ward for the selected branch. Then configure Rooms/Bays, Resources and OT assets inside the Unit."
              : "Update Unit configuration and operational flags."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2 min-w-0">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm((s) => ({ ...s, departmentId: v }))}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select department…" />
                </SelectTrigger>
                <SelectContent align="start" className={selectContentMaxW}>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="block max-w-full truncate" title={`${d.name} (${d.code})`}>
                        {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 min-w-0">
              <div className="flex items-center justify-between">
                <Label>Unit Type</Label>
                {mode === "create" && unitTypeHint != null ? (
                  <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                    <Wand2 className="h-3 w-3" /> Default Uses Rooms: {unitTypeHint ? "On" : "Off"}
                  </span>
                ) : null}
              </div>

              <Select
                value={form.unitTypeId}
                onValueChange={(v) => {
                  setForm((s) => ({ ...s, unitTypeId: v }));
                  const ut = enabledUnitTypes.find((x) => x.id === v);
                  if (ut?.usesRoomsDefault != null) setForm((s) => ({ ...s, usesRooms: !!ut.usesRoomsDefault }));
                }}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select unit type…" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  className={cn(selectContentMaxW, "max-h-[320px] overflow-y-auto overflow-x-hidden")}
                >
                  {enabledUnitTypes.map((ut) => (
                    <SelectItem key={ut.id} value={ut.id}>
                      <span className="block max-w-full truncate" title={`${ut.name} (${ut.code})`}>
                        {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {enabledUnitTypes.length === 0 ? (
                <div className="text-xs text-amber-700 dark:text-amber-200">
                  No Unit Types enabled for this branch. Enable Unit Types first.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 min-w-0">
            <Label>Location (Zone / Floor)</Label>
            <LocationNodePicker
              branchId={branchId}
              value={form.locationNodeId || undefined}
              onValueChange={(v) => setForm((s) => ({ ...s, locationNodeId: v || "" }))}
              placeholder="Select Zone (recommended) or Floor…"
            />
            <p className="text-[11px] text-zc-muted">We recommend Zone-level tagging for accurate resource mapping and reporting.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Unit Code</Label>
              <Input
                value={form.code}
                disabled={mode === "edit"}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. OT-1, TH01, LAB1"
                className={cn(
                  "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                  mode === "edit" && "opacity-80",
                )}
              />
              
            </div>

            <div className="grid gap-2">
              <Label>Unit Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Operation Theatre Suite"
              />
            </div>
          </div>
<p className="text-[11px] text-zc-muted">Code should be stable. Editing is disabled after creation.</p>
          <Separator className="my-1" />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Uses Rooms / Bays</div>
                <div className="text-xs text-zc-muted">
                  If off: open-bay unit. Rooms are disabled and resources are created directly under Unit.
                </div>
              </div>
              <Switch checked={!!form.usesRooms} onCheckedChange={(v) => setForm((s) => ({ ...s, usesRooms: !!v }))} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Active</div>
                <div className="text-xs text-zc-muted">Inactive units should not be used for operations.</div>
              </div>
              <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
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
              disabled={busy || (mode === "create" && enabledUnitTypes.length === 0)}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create Unit" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Modal: Delete ------------------------------ */

function DeleteUnitModal({
  open,
  unit,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
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
    if (!unit?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/units/${encodeURIComponent(unit.id)}`, { method: "DELETE" });
      await onDeleted();
      toast({
        title: "Unit Deleted",
        description: `Successfully deleted unit "${unit.name}"`,
        variant: "success" as any,
      });
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Delete failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Trash2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Delete Unit
          </DialogTitle>
          <DialogDescription>Deletion may be blocked if the Unit has Rooms/Bays, Resources, or OT assets configured.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            {unit?.name}{" "}
            <span className="font-mono text-xs text-zc-muted">
              ({unit?.code})
            </span>
          </div>

          <div className="mt-2 text-xs text-zc-muted">
            Department: <span className="text-zc-text">{unit?.department?.name || "—"}</span>
          </div>
          <div className="mt-1 text-xs text-zc-muted">
            Unit Type: <span className="text-zc-text">{unit?.unitType?.name || "—"}</span>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
            <div className="min-w-0">
              If this Unit is already used in operations, prefer retiring (deactivate) instead of deleting.
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onConfirm()} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function UnitsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user as any)?.roleCode === "SUPER_ADMIN";

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [unitTypesCatalog, setUnitTypesCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledUnitTypeIds, setEnabledUnitTypeIds] = React.useState<Set<string>>(new Set());

  const [rows, setRows] = React.useState<UnitRow[]>([]);

  // Filters (client-side like Branch page)
  const [q, setQ] = React.useState("");
  const [filterDept, setFilterDept] = React.useState<string | undefined>(undefined);
  const [filterUT, setFilterUT] = React.useState<string | undefined>(undefined);
  const [filterLoc, setFilterLoc] = React.useState<string | undefined>(undefined);

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<UnitRow | null>(null);

  const enabledUnitTypes = React.useMemo(() => unitTypesCatalog.filter((ut) => enabledUnitTypeIds.has(ut.id)), [unitTypesCatalog, enabledUnitTypeIds]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((u) => {
      if (filterDept && u.departmentId !== filterDept) return false;
      if (filterUT && u.unitTypeId !== filterUT) return false;
      if (filterLoc && String(u.locationNodeId || "") !== String(filterLoc)) return false;

      if (!s) return true;
      const hay = `${u.code} ${u.name} ${u.department?.name ?? ""} ${u.unitType?.name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, filterDept, filterUT, filterLoc]);

  const totalUnits = rows.length;
  const activeUnits = rows.filter((u) => u.isActive).length;
  const roomsUnits = rows.filter((u) => u.usesRooms).length;

  const selectTriggerCls = "h-11 w-full min-w-0 overflow-hidden rounded-xl border-zc-border bg-zc-card";
  const selectContentMaxW = "max-w-[min(560px,calc(100vw-2rem))]";

  async function loadBranches(): Promise<string | undefined> {
    const data = await apiFetch<BranchRow[]>("/api/branches");
    const list = data ?? [];
    setBranches(list);

    const stored = readLS(LS_KEY);
    const first = list?.[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_KEY, next);

    return next;
  }

  async function loadUnitTypesCatalog() {
    const rows = await apiFetch<UnitTypeCatalogRow[]>("/api/infrastructure/unit-types/catalog");
    setUnitTypesCatalog(rows || []);
  }

  async function loadBranchEnablement(bid: string) {
    const rows = await apiFetch<BranchUnitTypeRow[]>(`/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`);
    setEnabledUnitTypeIds(new Set(normalizeEnabledIds(rows || [])));
  }

  async function loadDepartments(bid: string) {
    const rows = await apiFetch<DepartmentRow[]>(`/api/infrastructure/departments?branchId=${encodeURIComponent(bid)}`);
    setDepartments(rows || []);
  }

  async function loadUnits(bid: string) {
    const rows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(bid)}`);
    setRows(rows || []);
  }

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const bid = branchId || (await loadBranches());
      await loadUnitTypesCatalog();
      if (bid) {
        await Promise.all([loadDepartments(bid), loadBranchEnablement(bid), loadUnits(bid)]);
      }

      if (showToast) toast({ title: "Units refreshed", description: `Loaded ${bid ? "branch scope" : ""} units.` });
    } catch (e: any) {
      const msg = e?.message || "Failed to load units";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    writeLS(LS_KEY, nextId);

    // Reset filters like Branch page behavior
    setQ("");
    setFilterDept(undefined);
    setFilterUT(undefined);
    setFilterLoc(undefined);

    setErr(null);
    setLoading(true);
    try {
      await Promise.all([loadDepartments(nextId), loadBranchEnablement(nextId), loadUnits(nextId)]);
      toast({ title: "Branch scope changed", description: "Loaded units for selected branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load branch scope";
      setErr(msg);
      toast({ variant: "destructive", title: "Load failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Units">
      <div className="grid gap-6">
        {/* Header (same pattern as Branch page) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconBuilding className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Units</div>
              <div className="mt-1 text-sm text-zc-muted">
                Select branch, create Units/Wards, then configure Rooms/Bays and Resources inside each Unit.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {isSuperAdmin ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)} disabled={!branchId}>
                <IconPlus className="h-4 w-4" />
                Create Unit
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview (same concept as Branch page + branch scope + filters) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Pick a branch, filter units, and open details. Super Admin can create/edit/delete.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {/* Branch picker */}
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId ?? ""} onValueChange={(v) => void onBranchChange(v)}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select branch…" />
                </SelectTrigger>
                <SelectContent align="start" className={selectContentMaxW}>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="block max-w-full truncate" title={branchOneLineLabel(b)}>
                        {branchOneLineLabel(b)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats tiles (same style as Branch page) */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Units</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalUnits}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Units</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{activeUnits}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Uses Rooms</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{roomsUnits}</div>
              </div>
            </div>

            {/* Search + count line (same style as Branch page) */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by code, name, department, unit type…"
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {/* Filters row (kept compact; still consistent with overall layout) */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2 min-w-0">
                <Label>Department</Label>
                <Select value={filterDept ?? ""} onValueChange={(v) => setFilterDept(v || undefined)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent align="start" className={selectContentMaxW}>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="block max-w-full truncate" title={`${d.name} (${d.code})`}>
                          {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 min-w-0">
  <Label>Unit Type</Label>
  <Select value={filterUT ?? ""} onValueChange={(v) => setFilterUT(v || undefined)}>
    <SelectTrigger className={selectTriggerCls}>
      <SelectValue placeholder="All unit types" />
    </SelectTrigger>

    <SelectContent
      align="start"
      className={cn(selectContentMaxW, "max-h-[320px] overflow-y-auto overflow-x-hidden")}
    >
      {unitTypesCatalog.map((ut) => (
        <SelectItem key={ut.id} value={ut.id}>
          <span className="block max-w-full truncate" title={`${ut.name} (${ut.code})`}>
            {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>


              <div className="grid gap-2 min-w-0">
                <Label>Location</Label>
                <LocationNodePicker
                  branchId={branchId}
                  value={filterLoc}
                  onValueChange={(v) => setFilterLoc(v || undefined)}
                  placeholder="All locations"
                />
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

        {/* Registry table (same pattern as Branch page) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unit Registry</CardTitle>
            <CardDescription className="text-sm">Open Details to configure Rooms/Bays, Resources, and OT assets.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Rooms</th>
                  <th className="px-4 py-3 text-left font-semibold">Active</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading units…" : "No units found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {u.code}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{u.name}</div>
                      {u.locationNode?.name ? <div className="mt-0.5 text-xs text-zc-muted">{u.locationNode.name}</div> : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{u.department?.name || "—"}</td>
                    <td className="px-4 py-3 text-zc-muted">{u.unitType?.name || "—"}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{u.usesRooms ? "Yes" : "No"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn("font-mono text-xs", u.isActive ? "text-emerald-600 dark:text-emerald-300" : "text-zc-muted")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" className="px-3 gap-2">
                          <Link href={`/superadmin/infrastructure/units/${encodeURIComponent(u.id)}`}>
                            Details <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>

                        {isSuperAdmin ? (
                          <>
                            <Button
                              variant="secondary"
                              className="px-3 gap-2"
                              onClick={() => {
                                setSelected(u);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              variant="destructive"
                              className="px-3 gap-2"
                              onClick={() => {
                                setSelected(u);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Onboarding callout (same idea as Branch page) */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Recommended setup order</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Enable Unit Types for the Branch → 2) Create Units → 3) Configure Rooms/Bays → 4) Add Resources/OT assets and go-live checks.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UnitEditorModal
        mode="create"
        open={createOpen}
        branchId={branchId}
        departments={departments}
        enabledUnitTypes={enabledUnitTypes}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
      />

      <UnitEditorModal
        mode="edit"
        open={editOpen}
        branchId={branchId}
        departments={departments}
        enabledUnitTypes={enabledUnitTypes}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
      />

      <DeleteUnitModal
        open={deleteOpen}
        unit={selected}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => refresh(false)}
      />
    </AppShell>
  );
}
