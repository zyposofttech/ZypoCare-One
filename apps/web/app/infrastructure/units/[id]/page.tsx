"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  DoorOpen,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
  CheckCircle2,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ---------------- Types ----------------
type BranchRow = {
  id: string;
  code: string;
  name: string;
  city?: string;
};
type UnitDetail = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;

  // Onboarding/capacity metadata (optional)
  totalRoomCount?: number | null;
  totalBedCapacity?: number | null;
  commissioningDate?: string | null;
  floorNumber?: number | null;
  wingZone?: string | null;
  inchargeStaffId?: string | null;
  nursingStation?: string | null;

  locationNodeId?: string | null;
  createdAt?: string;
  updatedAt?: string;

  department?: { id: string; code: string; name: string };
  unitType?: { id: string; code: string; name: string; usesRoomsDefault?: boolean; schedulableByDefault?: boolean };

  // Optional enriched location payload (if backend includes it)
  locationNode?: {
    id: string;
    kind?: string | null;
    parentId?: string | null;
    revisions?: Array<{
      code: string;
      name: string;
      isActive?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string | null;
    }>;
  } | null;
};

type RoomRow = {
  id: string;
  unitId: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ResourceRow = {
  id: string;
  unitId: string;
  branchId: string;
  roomId?: string | null;

  resourceType: string;
  code: string;
  name: string;

  state: string;
  isActive: boolean;
  isSchedulable?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

type DepartmentRow = { id: string; code: string; name: string };

type UnitTypeCatalogRow = {
  id: string;
  code: string;
  name: string;
  usesRoomsDefault?: boolean | null;
  schedulableByDefault?: boolean | null;
  bedBasedDefault?: boolean | null;
};

type BranchUnitTypeRow =
  | string
  | {
      unitTypeId: string;
      isEnabled: boolean;
    };

type LocationTreeNode = {
  id: string;
  type: string; // CAMPUS/BUILDING/FLOOR/ZONE/AREA
  code?: string | null;
  name?: string | null;
  buildings?: LocationTreeNode[];
  floors?: LocationTreeNode[];
  zones?: LocationTreeNode[];
  areas?: LocationTreeNode[];
};

type LocationTree = { campuses: LocationTreeNode[] };

type LocationOption = { id: string; type: string; label: string };

function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
  if (!rows?.length) return [];
  if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
  return (rows as any[])
    .filter((r) => r?.unitTypeId && r?.isEnabled === true)
    .map((r) => String(r.unitTypeId));
}

function buildLocationOptions(tree: LocationTree | null): LocationOption[] {
  if (!tree?.campuses?.length) return [];
  const out: LocationOption[] = [];

  for (const campus of tree.campuses) {
    const buildings = campus.buildings ?? [];
    for (const building of buildings) {
      const buildingName = building?.name ?? "Building";
      const floors = building.floors ?? [];
      for (const floor of floors) {
        const floorName = floor?.name ?? "Floor";
        const floorCode = floor?.code ? ` (${floor.code})` : "";

        if (String(floor.type).toUpperCase() === "FLOOR") {
          out.push({ id: floor.id, type: "FLOOR", label: `${buildingName} — ${floorName}${floorCode}` });
        }

        const zones = floor.zones ?? [];
        for (const zone of zones) {
          const zoneName = zone?.name ?? "Zone";
          const zoneCode = zone?.code ? ` (${zone.code})` : "";
          if (String(zone.type).toUpperCase() === "ZONE") {
            out.push({ id: zone.id, type: "ZONE", label: `${buildingName} — ${floorName} — ${zoneName}${zoneCode}` });
          }

          const areas = zone.areas ?? [];
          for (const area of areas) {
            const areaName = area?.name ?? "Area";
            const areaCode = area?.code ? ` (${area.code})` : "";
            if (String(area.type).toUpperCase() === "AREA") {
              out.push({
                id: area.id,
                type: "AREA",
                label: `${buildingName} — ${floorName} — ${zoneName} — ${areaName}${areaCode}`,
              });
            }
          }
        }
      }

      const zones = building.zones ?? [];
      for (const zone of zones) {
        const zoneName = zone?.name ?? "Zone";
        const zoneCode = zone?.code ? ` (${zone.code})` : "";
        if (String(zone.type).toUpperCase() === "ZONE") {
          out.push({ id: zone.id, type: "ZONE", label: `${buildingName} — ${zoneName}${zoneCode}` });
        }

        const areas = zone.areas ?? [];
        for (const area of areas) {
          const areaName = area?.name ?? "Area";
          const areaCode = area?.code ? ` (${area.code})` : "";
          if (String(area.type).toUpperCase() === "AREA") {
            out.push({ id: area.id, type: "AREA", label: `${buildingName} — ${zoneName} — ${areaName}${areaCode}` });
          }
        }
      }
    }
  }

  return out.filter((o) => ["FLOOR", "ZONE", "AREA"].includes(String(o.type).toUpperCase()));
}

// ---------------- Utilities (same style as your attached page.tsx) ----------------

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

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

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  // onClose is kept for API compatibility with existing call sites.
  // DialogContent already renders its own close button.
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function valOrDash(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "-";
}
function formatLocation(node: UnitDetail["locationNode"], fallbackId?: string | null) {
  const rev = node?.revisions?.[0];
  const primary = rev ? `${rev.name} (${rev.code})` : valOrDash(fallbackId);
  const kind = (node?.kind || "")
    .toString()
    .trim()
    .replace(/_/g, " ");
  const secondary = kind ? kind : undefined;
  return { primary, secondary };
}

function InfoTile({
  label,
  value,
  className,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  tone?: "indigo" | "emerald" | "cyan" | "zinc";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
      : tone === "emerald"
        ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
        : tone === "cyan"
          ? "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/35 dark:bg-cyan-900/15"
          : "border-zc-border bg-zc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
      <div className="mt-2 text-sm">{value}</div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof pillTones;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTones[tone])}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
      <div className="text-right text-sm text-zc-text">{value}</div>
    </div>
  );
}

// ---------------- ModalShell (same as attached page.tsx) ----------------

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-200/40 bg-zc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              X
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Modals ----------------

function EditUnitModal({
  open,
  unit,
  onClose,
  onSaved,
}: {
  open: boolean;
  unit: UnitDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [modalErr, setModalErr] = React.useState<string | null>(null);

  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [unitTypesCatalog, setUnitTypesCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledUnitTypeIds, setEnabledUnitTypeIds] = React.useState<Set<string>>(new Set());
  const [locationsTree, setLocationsTree] = React.useState<LocationTree | null>(null);
  const [unitsForWarn, setUnitsForWarn] = React.useState<Array<{ id: string; departmentId: string; name: string }>>([]);

  const enabledUnitTypes = React.useMemo(
    () => unitTypesCatalog.filter((ut) => enabledUnitTypeIds.has(ut.id)),
    [unitTypesCatalog, enabledUnitTypeIds],
  );

  const locationOptions = React.useMemo(() => buildLocationOptions(locationsTree), [locationsTree]);

  const [formDeptId, setFormDeptId] = React.useState("");
  const [formUnitTypeId, setFormUnitTypeId] = React.useState("");
  const [formLocationId, setFormLocationId] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formName, setFormName] = React.useState("");

  const [formTotalRoomCount, setFormTotalRoomCount] = React.useState("");
  const [formTotalBedCapacity, setFormTotalBedCapacity] = React.useState("");
  const [formCommissioningDate, setFormCommissioningDate] = React.useState("");
  const [formFloorNumber, setFormFloorNumber] = React.useState("");
  const [formWingZone, setFormWingZone] = React.useState("");
  const [formInchargeStaffId, setFormInchargeStaffId] = React.useState("");
  const [formNursingStation, setFormNursingStation] = React.useState("");

  const editing = unit;

  React.useEffect(() => {
    if (!open || !editing) return;

    setFormDeptId(editing.departmentId);
    setFormUnitTypeId(editing.unitTypeId);
    setFormLocationId(editing.locationNodeId ?? "");
    setFormCode(editing.code ?? "");
    setFormName(editing.name ?? "");

    setFormTotalRoomCount(editing.totalRoomCount != null ? String(editing.totalRoomCount) : "");
    setFormTotalBedCapacity(editing.totalBedCapacity != null ? String(editing.totalBedCapacity) : "");
    setFormCommissioningDate(
      editing.commissioningDate ? new Date(editing.commissioningDate).toISOString().slice(0, 10) : "",
    );
    setFormFloorNumber(editing.floorNumber != null ? String(editing.floorNumber) : "");
    setFormWingZone(editing.wingZone ?? "");
    setFormInchargeStaffId(editing.inchargeStaffId ?? "");
    setFormNursingStation(editing.nursingStation ?? "");

    setModalErr(null);
    setBusy(false);
  }, [open, editing?.id]);

  async function loadDepartments(bid: string) {
    try {
      const list = await apiFetch<DepartmentRow[]>(`/api/infrastructure/departments?branchId=${encodeURIComponent(bid)}`);
      setDepartments(Array.isArray(list) ? list : []);
    } catch {
      setDepartments([]);
    }
  }

  async function loadUnitTypesCatalog() {
    try {
      const list = await apiFetch<UnitTypeCatalogRow[]>(`/api/infrastructure/unit-types/catalog`);
      setUnitTypesCatalog(Array.isArray(list) ? list : []);
    } catch {
      setUnitTypesCatalog([]);
    }
  }

  async function loadBranchUnitTypeEnablement(bid: string) {
    try {
      const list = await apiFetch<BranchUnitTypeRow[]>(`/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`);
      setEnabledUnitTypeIds(new Set(normalizeEnabledIds(Array.isArray(list) ? list : [])));
    } catch {
      setEnabledUnitTypeIds(new Set());
    }
  }

  async function loadLocations(bid: string) {
    try {
      const t = await apiFetch<LocationTree>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(bid)}`);
      setLocationsTree(t);
    } catch {
      setLocationsTree({ campuses: [] });
    }
  }

  async function loadUnitsForWarn(bid: string) {
    try {
      const list = await apiFetch<any[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(bid)}&includeInactive=true`);
      const slim = (Array.isArray(list) ? list : [])
        .map((u) => ({ id: String(u.id), departmentId: String(u.departmentId), name: String(u.name ?? "") }))
        .filter((u) => u.id && u.departmentId);
      setUnitsForWarn(slim);
    } catch {
      setUnitsForWarn([]);
    }
  }

  React.useEffect(() => {
    if (!open || !editing?.branchId) return;
    const bid = editing.branchId;
    void Promise.all([loadDepartments(bid), loadUnitTypesCatalog(), loadBranchUnitTypeEnablement(bid), loadLocations(bid), loadUnitsForWarn(bid)]);
  }, [open, editing?.branchId]);

  const selectedUnitType = React.useMemo(() => {
    const src = enabledUnitTypes.length ? enabledUnitTypes : unitTypesCatalog;
    return src.find((x) => x.id === formUnitTypeId) ?? null;
  }, [enabledUnitTypes, unitTypesCatalog, formUnitTypeId]);

  const derivedUsesRooms = React.useMemo(() => {
    if (!selectedUnitType) return null;
    return selectedUnitType.usesRoomsDefault ?? null;
  }, [selectedUnitType]);

  const derivedBedBased = React.useMemo(() => {
    if (!selectedUnitType) return null;
    return selectedUnitType.bedBasedDefault ?? null;
  }, [selectedUnitType]);

  // Helpful defaults (kept in sync with Units page)
  React.useEffect(() => {
    if (!open || !editing) return;

    if (derivedUsesRooms === false) {
      setFormTotalRoomCount("0");
    } else if (derivedUsesRooms === true && !formTotalRoomCount.trim()) {
      setFormTotalRoomCount("1");
    }

    if (derivedBedBased === true && !formTotalBedCapacity.trim()) {
      setFormTotalBedCapacity("1");
    }
  }, [open, editing?.id, derivedUsesRooms, derivedBedBased]);

  const nameDupWarning = React.useMemo(() => {
    const name = formName.trim().toLowerCase();
    if (!name || !formDeptId) return null;
    const dup = unitsForWarn.find(
      (u) => u.departmentId === formDeptId && u.name.trim().toLowerCase() === name && (!editing || u.id !== editing.id),
    );
    if (!dup) return null;
    return `Another unit in this department already uses the name “${dup.name}”. Recommended: keep unit names unique within a department.`;
  }, [unitsForWarn, formName, formDeptId, editing?.id]);

  async function saveUnit() {
    if (!editing?.id || !editing.branchId) return;

    setModalErr(null);
    setBusy(true);

    try {
      if (!formDeptId) throw new ApiError("Department is required");
      if (!formUnitTypeId) throw new ApiError("Unit type is required");
      if (!formLocationId) throw new ApiError("Location is required");
      if (!formName.trim()) throw new ApiError("Unit name is required");

      const totalRoomCountRaw = formTotalRoomCount.trim();
      const totalRoomCount = totalRoomCountRaw ? Number.parseInt(totalRoomCountRaw, 10) : undefined;
      if (totalRoomCountRaw) {
        const totalRoomCountValue = totalRoomCount ?? Number.NaN;
        if (!Number.isFinite(totalRoomCountValue) || totalRoomCountValue < 0) {
          throw new ApiError("Total room count must be a non-negative integer");
        }
      }

      const totalBedCapacityRaw = formTotalBedCapacity.trim();
      const totalBedCapacity = totalBedCapacityRaw ? Number.parseInt(totalBedCapacityRaw, 10) : undefined;
      if (totalBedCapacityRaw) {
        const totalBedCapacityValue = totalBedCapacity ?? Number.NaN;
        if (!Number.isFinite(totalBedCapacityValue) || totalBedCapacityValue < 0) {
          throw new ApiError("Total bed capacity must be a non-negative integer");
        }
      }

      const floorNumberRaw = formFloorNumber.trim();
      const floorNumber = floorNumberRaw ? Number.parseInt(floorNumberRaw, 10) : undefined;
      if (floorNumberRaw) {
        const floorNumberValue = floorNumber ?? Number.NaN;
        if (!Number.isFinite(floorNumberValue) || floorNumberValue < 0) {
          throw new ApiError("Floor number must be a non-negative integer");
        }
      }

      const usesRooms = derivedUsesRooms ?? true;
      const bedBased = derivedBedBased ?? false;

      const effectiveRoomCount = usesRooms ? (totalRoomCount ?? 0) : 0;
      if (usesRooms && effectiveRoomCount < 1) {
        throw new ApiError("Total room count must be at least 1 for room-based units");
      }

      const effectiveBedCapacity = bedBased ? (totalBedCapacity ?? 0) : 0;
      if (bedBased && effectiveBedCapacity < 1) {
        throw new ApiError("Total bed capacity must be at least 1 for bed-based unit types");
      }
      const bedCapacityPayload = bedBased ? effectiveBedCapacity : undefined;

      // Update only (edit mode)
      await apiFetch(`/api/infrastructure/units/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formName.trim(),
          locationNodeId: formLocationId,
          totalRoomCount: effectiveRoomCount,
          totalBedCapacity: bedCapacityPayload,
          commissioningDate: formCommissioningDate ? formCommissioningDate : undefined,
          floorNumber,
          wingZone: formWingZone.trim() ? formWingZone.trim() : undefined,
          inchargeStaffId: formInchargeStaffId.trim() ? formInchargeStaffId.trim() : undefined,
          nursingStation: formNursingStation.trim() ? formNursingStation.trim() : undefined,
        }),
      });

      toast({ title: "Unit updated", description: "Changes saved successfully.", duration: 1600 });

      onClose();
      await Promise.resolve(onSaved());
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : (e?.message || "Failed to save unit");
      setModalErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !editing) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return;
        if (!v) setModalErr(null);
        if (!v) onClose();
      }}
    >
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title="Edit Unit"
          description="Configure units with capacity, location, and staffing defaults."
          onClose={onClose}
        />

        <div className="grid gap-6">
          {modalErr ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{modalErr}</div>
            </div>
          ) : null}

          {nameDupWarning ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.10)] px-3 py-2 text-sm text-zc-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
              <div className="min-w-0">{nameDupWarning}</div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select value={formDeptId} onValueChange={setFormDeptId} disabled={!!editing}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zc-muted">Department cannot be changed after creation.</p>
            </div>

            <div className="grid gap-2">
              <Label>Unit Type</Label>
              <Select value={formUnitTypeId} onValueChange={(v) => setFormUnitTypeId(v)} disabled={!!editing}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select unit type…" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {(enabledUnitTypes.length ? enabledUnitTypes : unitTypesCatalog).map((ut) => (
                    <SelectItem key={ut.id} value={ut.id}>
                      {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zc-muted">Unit type cannot be changed after creation.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Location (Floor / Zone / Area)</Label>
            <Select value={formLocationId} onValueChange={setFormLocationId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select location…" />
              </SelectTrigger>
              <SelectContent className="max-h-[340px] overflow-y-auto">
                {locationOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="block max-w-full truncate" title={o.label}>
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-zc-muted">Allowed levels: Floor / Zone / Area.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Unit Code</Label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. OT-1, TH01, LAB1"
                className="font-mono"
                disabled={true}
              />
            </div>

            <div className="grid gap-2">
              <Label>Unit Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Operation Theatre Suite"
              />
            </div>
          </div>
          <p className="text-[11px] text-zc-muted">Code should be stable. Editing is disabled after creation.</p>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Total Room Count</Label>
              <Input
                type="number"
                min={0}
                value={formTotalRoomCount}
                onChange={(e) => setFormTotalRoomCount(e.target.value)}
                disabled={derivedUsesRooms !== true}
              />
              <p className="text-xs text-zc-muted">
                For room-based units, minimum 1. For open-bay units, this stays 0.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Total Bed Capacity</Label>
              <Input
                type="number"
                min={0}
                value={formTotalBedCapacity}
                onChange={(e) => setFormTotalBedCapacity(e.target.value)}
                disabled={derivedBedBased !== true}
              />
              <p className="text-xs text-zc-muted">Required when the unit type is bed-based.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Commissioning Date</Label>
              <Input type="date" value={formCommissioningDate} onChange={(e) => setFormCommissioningDate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Floor Number</Label>
              <Input
                type="number"
                min={0}
                value={formFloorNumber}
                onChange={(e) => setFormFloorNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-2">
              <Label>Wing / Zone</Label>
              <Input value={formWingZone} onChange={(e) => setFormWingZone(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Unit In-charge (Staff ID)</Label>
              <Input value={formInchargeStaffId} onChange={(e) => setFormInchargeStaffId(e.target.value)} placeholder="Optional" />
              <p className="text-xs text-zc-muted">Optional: Staff Master ID / Employee Code.</p>
            </div>

            <div className="grid gap-2">
              <Label>Nursing Station</Label>
              <Input value={formNursingStation} onChange={(e) => setFormNursingStation(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="text-sm font-semibold text-zc-text">Notes</div>
            <div className="mt-2 text-xs text-zc-muted">
              These fields are optional onboarding metadata. You can refine staffing later via Staff Assignments.
            </div>
          </div>

          <Separator />

          <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Derived behavior</div>
                <div className="mt-1 text-xs text-zc-muted">Unit behavior is derived from the selected Unit Type.</div>
              </div>
              {derivedUsesRooms == null ? (
                <Badge variant="secondary">Select Unit Type</Badge>
              ) : derivedUsesRooms ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Uses Rooms</Badge>
              ) : (
                <Badge variant="outline">Open-bay (No Rooms)</Badge>
              )}
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  Updates allow changing <span className="font-semibold">Name</span>, <span className="font-semibold">Location</span>, and onboarding metadata (capacity/staff).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Deactivation uses cascade (Rooms/Resources) via the status toggle in the directory.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-zc-border bg-zc-card px-3 py-2">
            <Switch checked={!!editing.isActive} disabled />
            <span className="text-xs text-zc-muted">Status is managed from the directory (Activate/Deactivate).</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void saveUnit()} disabled={busy}>
            {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrEditRoomModal({
  open,
  mode,
  unit,
  room,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  unit: UnitDetail | null;
  room: RoomRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    if (mode === "edit" && room) {
      setCode(room.code ?? "");
      setName(room.name ?? "");
      setIsActive(!!room.isActive);
    } else {
      setCode("");
      setName("");
      setIsActive(true);
    }
  }, [open, mode, room]);

  async function onSubmit() {
    if (!unit?.id) return;
    if (!unit.branchId) return setErr("BranchId missing. Refresh unit details.");
    if (!unit.usesRooms) return setErr("This unit is open-bay (usesRooms=false). Rooms are not allowed.");

    setErr(null);
    if (!code.trim()) return setErr("Room code is required");
    if (!name.trim()) return setErr("Room name is required");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/rooms?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            unitId: unit.id,
            code: code.trim(),
            name: name.trim(),
            isActive,
          }),
        });
        toast({ title: "Room Created", description: `Created "${name.trim()}"` });
      } else {
        if (!room?.id) throw new Error("Room not found");
        await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "PATCH",
          body: JSON.stringify({ code: code.trim(), name: name.trim(), isActive }),
        });
        toast({ title: "Room Updated", description: `Updated "${name.trim()}"` });
      }

      onClose();
      void Promise.resolve(onSaved()).catch(() => { });
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Create Room" : "Edit Room"}
      description={mode === "create" ? "Add a Room/Bay under this unit." : "Update code/name and activation."}
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room code</div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TH01 / OT-1 / LAB1"
              className="mt-1 font-mono"
              maxLength={32}
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
              <div className="text-sm text-zc-muted">Visibility in selectors</div>
              <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Theatre 1" className="mt-1" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DeleteRoomModal({
  open,
  unit,
  room,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitDetail | null;
  room: RoomRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
  }, [open]);

  async function onConfirm() {
    if (!unit?.branchId || !room?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
        method: "DELETE",
      });

      toast({ title: "Room Deleted", description: `Deleted "${room.name}"` });
      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !room) return null;

  return (
    <ModalShell title="Delete Room" description="This will remove the room from the unit. Ensure no active dependencies." onClose={onClose}>
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {room.name} <span className="text-zc-muted">({room.code})</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

const RESOURCE_STATES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "INACTIVE"] as const;

function CreateOrEditResourceModal({
  open,
  mode,
  unit,
  rooms,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  unit: UnitDetail | null;
  rooms: RoomRow[];
  resource: ResourceRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [roomId, setRoomId] = React.useState<string | undefined>(undefined);
  const [resourceType, setResourceType] = React.useState("BED");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [state, setState] = React.useState<string>("AVAILABLE");
  const [isActive, setIsActive] = React.useState(true);
  const [isSchedulable, setIsSchedulable] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "edit" && resource) {
      setRoomId(resource.roomId || undefined);
      setResourceType(resource.resourceType || "BED");
      setCode(resource.code || "");
      setName(resource.name || "");
      setState(resource.state || "AVAILABLE");
      setIsActive(!!resource.isActive);
      setIsSchedulable(!!resource.isSchedulable);
    } else {
      setRoomId(undefined);
      setResourceType("BED");
      setCode("");
      setName("");
      setState("AVAILABLE");
      setIsActive(true);
      setIsSchedulable(Boolean(unit?.unitType?.schedulableByDefault));
    }
  }, [open, mode, resource, unit]);

  async function onSubmit() {
    if (!unit?.id) return;
    if (!unit.branchId) return setErr("BranchId missing. Refresh unit details.");

    setErr(null);
    if (!resourceType.trim()) return setErr("Resource type is required");
    if (!code.trim()) return setErr("Resource code is required");
    if (!name.trim()) return setErr("Resource name is required");
    if (unit.usesRooms && !roomId) return setErr("Room selection is required for this unit (usesRooms=true)");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/resources?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            unitId: unit.id,
            roomId: unit.usesRooms ? roomId : null,
            resourceType: resourceType.trim(),
            code: code.trim(),
            name: name.trim(),
            state,
            isActive,
            isSchedulable,
          }),
        });

        toast({ title: "Resource Created", description: `Created "${name.trim()}"` });
      } else {
        if (!resource?.id) throw new Error("Resource not found");
        await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            roomId: unit.usesRooms ? roomId : null,
            resourceType: resourceType.trim(),
            code: code.trim(),
            name: name.trim(),
            state,
            isActive,
            isSchedulable,
          }),
        });

        toast({ title: "Resource Updated", description: `Updated "${name.trim()}"` });
      }

      onClose();
      void Promise.resolve(onSaved()).catch(() => { });
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Create Resource" : "Edit Resource"}
      description="Add equipment/beds/tables and set state/schedulability."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {unit?.usesRooms ? (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room</div>
            <Select value={roomId} onValueChange={(v) => setRoomId(v)}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Select room..." />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} <span className="text-zc-muted">({r.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Resource type</div>
            <Input
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value.toUpperCase())}
              placeholder="BED / OT_TABLE / VENTILATOR"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">State</div>
            <Select value={state} onValueChange={(v) => setState(v)}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="B01 / OT-TABLE-1" className="mt-1 font-mono" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bed 01" className="mt-1" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <div className="mt-1 text-sm text-zc-muted">Inactive resources are hidden in selectors.</div>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Schedulable</div>
              <div className="mt-1 text-sm text-zc-muted">Use in scheduling workflows (OT/appointments).</div>
            </div>
            <Switch checked={isSchedulable} onCheckedChange={(v) => setIsSchedulable(!!v)} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DeleteResourceModal({
  open,
  unit,
  resource,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitDetail | null;
  resource: ResourceRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
  }, [open]);

  async function onConfirm() {
    if (!unit?.branchId || !resource?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(
        `/api/infrastructure/resources/${encodeURIComponent(resource.id)}?branchId=${encodeURIComponent(unit.branchId)}`,
        { method: "DELETE" },
      );

      toast({ title: "Resource Deleted", description: `Deleted "${resource.name}"` });
      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !resource) return null;

  return (
    <ModalShell title="Delete Resource" description="Ensure this resource is not used in active workflows." onClose={onClose}>
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {resource.name} <span className="text-zc-muted">({resource.code})</span>
        </div>
        <div className="mt-2 text-sm text-zc-muted">
          Type: <span className="font-mono">{resource.resourceType}</span> - State:{" "}
          <span className="font-mono">{resource.state}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

// ---------------- Page ----------------

export default function UnitDetailPage() {
  const { toast } = useToast();
  const { scope, branchId: activeBranchId, reason } = useBranchContext();

  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [branchLoading, setBranchLoading] = React.useState(false);
  const [row, setRow] = React.useState<UnitDetail | null>(null);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<"overview" | "rooms" | "resources" | "audit">("overview");

  // modals
  const [editOpen, setEditOpen] = React.useState(false);

  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [deactivateErr, setDeactivateErr] = React.useState<string | null>(null);

  const [busy, setBusy] = React.useState(false);

  const [roomModalOpen, setRoomModalOpen] = React.useState(false);
  const [roomModalMode, setRoomModalMode] = React.useState<"create" | "edit">("create");
  const [roomEditing, setRoomEditing] = React.useState<RoomRow | null>(null);
  const [roomDeleteOpen, setRoomDeleteOpen] = React.useState(false);

  const [resModalOpen, setResModalOpen] = React.useState(false);
  const [resModalMode, setResModalMode] = React.useState<"create" | "edit">("create");
  const [resEditing, setResEditing] = React.useState<ResourceRow | null>(null);
  const [resDeleteOpen, setResDeleteOpen] = React.useState(false);

  const unitBranchId = row?.branchId || "";

  async function loadRooms(u: UnitDetail | null) {
    if (!u?.id) return setRooms([]);
    if (!u.branchId) throw new Error("branchId is required for global operations");
    if (!u.usesRooms) return setRooms([]);
    const r = await apiFetch<RoomRow[]>(
      `/api/infrastructure/rooms?branchId=${encodeURIComponent(u.branchId)}&unitId=${encodeURIComponent(u.id)}`,
    );
    setRooms(r || []);
  }

  async function loadResources(u: UnitDetail | null) {
    if (!u?.id) return setResources([]);
    if (!u.branchId) throw new Error("branchId is required for global operations");
    const r = await apiFetch<ResourceRow[]>(
      `/api/infrastructure/resources?branchId=${encodeURIComponent(u.branchId)}&unitId=${encodeURIComponent(u.id)}`,
    );
    setResources(r || []);
  }

  async function refresh(showToast = false) {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<UnitDetail>(`/api/infrastructure/units/${encodeURIComponent(id)}`);
      setRow(data);
      if (data?.branchId) void loadBranchById(data.branchId);
      // load dependent lists (with branchId)
      await Promise.all([loadRooms(data), loadResources(data)]);

      if (showToast) {
        toast({ title: "Unit refreshed", description: "Loaded latest unit details.", duration: 1800 });
      }
      

    } catch (e: any) {
      const msg = e?.message || "Failed to load unit";
      setErr(msg);
      setRow(null);
      setRooms([]);
      setResources([]);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }


async function confirmDeactivation() {
  if (!row?.id) return;
  const r = deactivateReason.trim();
  if (!r) {
    setDeactivateErr("Please provide a reason for deactivation.");
    return;
  }
  setBusy(true);
  try {
    await apiFetch(
      `/api/infrastructure/units/${encodeURIComponent(row.id)}?hard=false&cascade=true&reason=${encodeURIComponent(r)}`,
      { method: "DELETE" },
    );
    toast({ title: "Deactivated", description: `${row.name}`, duration: 1400 });
    setDeactivateOpen(false);
    setDeactivateReason("");
    setDeactivateErr(null);
    await refresh(false);
  } catch (e: any) {
    const msg = e instanceof ApiError ? e.message : e?.message || "Failed to update status";
    setDeactivateErr(msg);
    toast({ title: "Update failed", description: msg, variant: "destructive" as any });
  } finally {
    setBusy(false);
  }
}

async function activateUnit() {
  if (!row?.id) return;
  setBusy(true);
  try {
    await apiFetch(`/api/infrastructure/units/${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    });
    toast({ title: "Activated", description: `${row.name}`, duration: 1400 });
    await refresh(false);
  } catch (e: any) {
    const msg = e instanceof ApiError ? e.message : e?.message || "Failed to update status";
    toast({ title: "Update failed", description: msg, variant: "destructive" as any });
  } finally {
    setBusy(false);
  }
}


  async function loadBranchById(branchId: string) {
    setBranchLoading(true);
    try {
      // 1) Try direct endpoint (if you have it)
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(branchId)}`);
      setBranch(b);
      return;
    } catch {
      // 2) Fallback to list endpoint (you definitely used this earlier)
      try {
        const list = await apiFetch<BranchRow[]>(`/api/branches`);
        const found = (list || []).find((x) => x.id === branchId) || null;
        setBranch(found);
      } finally {
        // no-op
      }
    } finally {
      setBranchLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  React.useEffect(() => {
    if (!row?.branchId) return;
    void loadBranchById(row.branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.branchId]);
  async function updateResourceState(resourceId: string, state: string) {
    if (!row?.branchId) {
      toast({ title: "Branch missing", description: "BranchId is required for global operations.", variant: "destructive" as any });
      return;
    }
    try {
      await apiFetch(
        `/api/infrastructure/resources/${encodeURIComponent(resourceId)}/state?branchId=${encodeURIComponent(row.branchId)}`,
        { method: "PUT", body: JSON.stringify({ state }) },
      );
      toast({ title: "Updated", description: "Resource state updated." });
      await loadResources(row);
    } catch (e: any) {
      const msg = e?.message || "State update failed";
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    }
  }

  const roomsCount = rooms.length;
  const resourcesCount = resources.length;
  const emptyState = !activeBranchId ? "Select a branch to view details." : "Unit not found.";

  return (
    <AppShell title="Infrastructure - Units">
      <RequirePerm perm="INFRA_UNIT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" className="h-10" asChild>
                <Link href="/infrastructure/units">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
                <Building2 className="h-5 w-5 text-zc-accent" />
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold text-zc-text">
                  {loading ? "Unit" : row ? `${row.code} - ${row.name}` : "Unit"}
                </div>
                <div className="mt-0.5 text-sm text-zc-muted">
                  {activeBranchId ? (
                    <span>Branch-scoped ? {scope === "GLOBAL" ? "Corporate view" : "Branch view"}</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-zc-warn" />
                      {reason || "Select a branch to view details."}
                    </span>
                  )}
                </div>
              </div>
            </div>

            
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
  <Button variant="outline" className="h-10" onClick={() => void refresh(true)} disabled={loading || busy}>
    <RefreshCw className={cn("mr-2 h-4 w-4", loading || busy ? "animate-spin" : "")} />
    Refresh
  </Button>

  <RequirePerm perm="INFRA_UNIT_UPDATE">
    <Button
      variant="outline"
      className="h-10 gap-2"
      onClick={() => setEditOpen(true)}
      disabled={loading || busy || !row}
    >
      <Pencil className="h-4 w-4" />
      Edit Unit
    </Button>

    <Button
      variant={row?.isActive ? "destructive" : "success"}
      className="h-10 gap-2"
      disabled={loading || busy || !row}
      onClick={() => {
        if (!row) return;
        if (row.isActive) {
          setDeactivateReason("");
          setDeactivateErr(null);
          setDeactivateOpen(true);
        } else {
          void activateUnit();
        }
      }}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : row?.isActive ? (
        <ToggleLeft className="h-4 w-4" />
      ) : (
        <ToggleRight className="h-4 w-4" />
      )}
      {row?.isActive ? "Deactivate" : "Activate"}
    </Button>
  </RequirePerm>
</div>
          </div>

          {err ? (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load unit</CardTitle>
                    <CardDescription className="mt-1">{err}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-zc-muted">
                <div>
                  Common causes:
                  <ul className="mt-2 list-disc pl-5">
                    <li>Unit was deleted or deactivated.</li>
                    <li>Selected branch is different from the unit branch.</li>
                    <li>Network or server error.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Snapshot */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Snapshot</CardTitle>
                  <CardDescription>Unit type, status and key counts.</CardDescription>
                </div>
                {row ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {row.usesRooms ? <Badge variant="info">Rooms</Badge> : <Badge variant="neutral">Open-bay</Badge>}
                    {row.isActive ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="warning">INACTIVE</Badge>}
                  </div>
                ) : (
                  <div className="text-sm text-zc-muted">-</div>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-6 pt-6">
              {loading ? (
                <div className="grid gap-3 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !row ? (
                <div className="py-10 text-center text-sm text-zc-muted">{emptyState}</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoTile
                    label="Unit Type"
                    tone="indigo"
                    value={
                      row.unitType ? (
                        <Badge variant="neutral">
                          {row.unitType.name} ({row.unitType.code})
                        </Badge>
                      ) : (
                        <span className="text-sm text-zc-text">{row.unitTypeId}</span>
                      )
                    }
                  />
                  <InfoTile
                    label="Rooms"
                    tone="emerald"
                    value={<span className="font-semibold text-zc-text">{roomsCount}</span>}
                  />
                  <InfoTile
                    label="Resources"
                    tone="cyan"
                    value={<span className="font-semibold text-zc-text">{resourcesCount}</span>}
                  />
                  <InfoTile
                    label="Status"
                    tone="zinc"
                    value={row.isActive ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="warning">INACTIVE</Badge>}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Unit Details</CardTitle>
                  <CardDescription>Overview, rooms, resources and audit.</CardDescription>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                    <TabsTrigger
                      value="overview"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="rooms"
                      disabled={!row?.usesRooms}
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Rooms
                    </TabsTrigger>
                    <TabsTrigger
                      value="resources"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Resources
                    </TabsTrigger>
                    <TabsTrigger
                      value="audit"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <History className="mr-2 h-4 w-4" />
                      Audit
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <Tabs value={activeTab}>
                <TabsContent value="overview" className="mt-0">
                  {loading ? (
                    <div className="grid gap-4">
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                    </div>
                  ) : !row ? (
                    <div className="py-10 text-center text-sm text-zc-muted">{emptyState}</div>
                  ) : (
                    <div className="grid gap-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                          <CardHeader className="py-4">
                            <CardTitle className="text-base">Identity</CardTitle>
                            <CardDescription>Code, name and branch info.</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-3 text-sm">
                            <Row
                              label="Code"
                              value={<span className="font-mono text-xs font-semibold text-zc-text">{row.code}</span>}
                            />
                            <Row label="Name" value={<span className="font-semibold text-zc-text">{row.name}</span>} />
                            <Row
                              label="Branch"
                              value={
                                <span className="text-zc-text">
                                  {branchLoading ? "Loading..." : branch?.name || unitBranchId}
                                  {branch?.code ? (
                                    <span className="ml-2 font-mono text-xs text-zc-muted">({branch.code})</span>
                                  ) : null}
                                </span>
                              }
                            />
                            <Row
                              label="Department"
                              value={
                                row.department ? (
                                  <span className="text-zc-text">
                                    {row.department.name} ({row.department.code})
                                  </span>
                                ) : (
                                  "-"
                                )
                              }
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="py-4">
                            <CardTitle className="text-base">Configuration</CardTitle>
                            <CardDescription>Type, location and status.</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-3 text-sm">
                            <Row
                              label="Unit Type"
                              value={row.unitType ? `${row.unitType.name} (${row.unitType.code})` : "-"}
                            />
                            <Row label="Rooms Mode" value={row.usesRooms ? "Rooms" : "Open-bay"} />
                            <Row
                              label="Location"
                              value={(() => {
                                const loc = formatLocation(row.locationNode ?? null, row.locationNodeId ?? null);
                                return (
                                  <span className="text-zc-text">
                                    {loc.primary}
                                    {loc.secondary ? <span className="ml-2 text-xs text-zc-muted">({loc.secondary})</span> : null}
                                  </span>
                                );
                              })()}
                            />
                            <Row
                              label="Status"
                              value={row.isActive ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="warning">INACTIVE</Badge>}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rooms" className="mt-0">
                  {loading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  ) : !row ? (
                    <div className="py-10 text-center text-sm text-zc-muted">{emptyState}</div>
                  ) : !row.usesRooms ? (
                    <div className="py-10 text-center text-sm text-zc-muted">Rooms are disabled for this unit.</div>
                  ) : (
                    <div className="rounded-xl border border-zc-border">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <DoorOpen className="h-4 w-4 text-zc-muted" />
                          Rooms / Bays
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-zc-muted">Total: {roomsCount}</div>
                          {row.usesRooms ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={loading}
                              onClick={() => {
                                setRoomEditing(null);
                                setRoomModalMode("create");
                                setRoomModalOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Add Room
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <Separator />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zc-panel/10 text-xs text-zc-muted">
                            <tr>
                              <th className="px-4 py-2 text-left">Code</th>
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-left">Active</th>
                              <th className="px-4 py-2 text-left">Updated</th>
                              <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rooms.length ? (
                              rooms.map((r) => (
                                <tr key={r.id} className="border-t border-zc-border">
                                  <td className="px-4 py-2 font-mono text-xs text-zc-text">{r.code}</td>
                                  <td className="px-4 py-2 text-zc-text">{r.name}</td>
                                  <td className="px-4 py-2">
                                    {r.isActive ? (
                                      <span className="text-xs font-semibold text-emerald-600">Yes</span>
                                    ) : (
                                      <span className="text-xs font-semibold text-amber-700">No</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-zc-muted">{fmtDate(r.updatedAt)}</td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => {
                                          setRoomEditing(r);
                                          setRoomModalMode("edit");
                                          setRoomModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => {
                                          setRoomEditing(r);
                                          setRoomDeleteOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zc-muted">
                                  No rooms found. Click "Add Room" to create one.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resources" className="mt-0">
                  {loading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  ) : !row ? (
                    <div className="py-10 text-center text-sm text-zc-muted">{emptyState}</div>
                  ) : (
                    <div className="rounded-xl border border-zc-border">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Wrench className="h-4 w-4 text-zc-muted" />
                          Resources
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-zc-muted">Total: {resourcesCount}</div>
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={loading || !row}
                            onClick={() => {
                              setResEditing(null);
                              setResModalMode("create");
                              setResModalOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add Resource
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zc-panel/10 text-xs text-zc-muted">
                            <tr>
                              <th className="px-4 py-2 text-left">Code</th>
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-left">Type</th>
                              {row.usesRooms ? <th className="px-4 py-2 text-left">Room</th> : null}
                              <th className="px-4 py-2 text-left">State</th>
                              <th className="px-4 py-2 text-left">Active</th>
                              <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resources.length ? (
                              resources.map((res) => {
                                const roomCode = res.roomId ? rooms.find((x) => x.id === res.roomId)?.code : null;
                                return (
                                  <tr key={res.id} className="border-t border-zc-border">
                                    <td className="px-4 py-2 font-mono text-xs text-zc-text">{res.code}</td>
                                    <td className="px-4 py-2 text-zc-text">{res.name}</td>
                                    <td className="px-4 py-2 text-xs text-zc-muted">{res.resourceType}</td>
                                    {row.usesRooms ? (
                                      <td className="px-4 py-2 text-xs text-zc-muted">{roomCode || "-"}</td>
                                    ) : null}
                                    <td className="px-4 py-2">
                                      <Select value={res.state} onValueChange={(v) => void updateResourceState(res.id, v)}>
                                        <SelectTrigger className="h-8 w-[180px]">
                                          <SelectValue placeholder="State" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {RESOURCE_STATES.map((s) => (
                                            <SelectItem key={s} value={s}>
                                              {s}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="px-4 py-2">
                                      {res.isActive ? (
                                        <span className="text-xs font-semibold text-emerald-600">Yes</span>
                                      ) : (
                                        <span className="text-xs font-semibold text-amber-700">No</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-2"
                                          onClick={() => {
                                            setResEditing(res);
                                            setResModalMode("edit");
                                            setResModalOpen(true);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="gap-2"
                                          onClick={() => {
                                            setResEditing(res);
                                            setResDeleteOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={row.usesRooms ? 7 : 6} className="px-4 py-8 text-center text-sm text-zc-muted">
                                  No resources found. Click "Add Resource" to create one.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                  {loading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !row ? (
                    <div className="py-10 text-center text-sm text-zc-muted">{emptyState}</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoTile
                        label="Created"
                        tone="zinc"
                        value={<span className="text-sm text-zc-text">{fmtDate(row.createdAt)}</span>}
                      />
                      <InfoTile
                        label="Last Updated"
                        tone="zinc"
                        value={<span className="text-sm text-zc-text">{fmtDate(row.updatedAt)}</span>}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}

{/* Deactivate */}
<Dialog
  open={deactivateOpen}
  onOpenChange={(v) => {
    if (busy) return;
    setDeactivateOpen(v);
    if (!v) {
      setDeactivateErr(null);
      setDeactivateReason("");
    }
  }}
>
  <DialogContent className="sm:max-w-[520px] rounded-2xl border border-indigo-200/50 bg-zc-card shadow-2xl shadow-indigo-500/10 dark:border-indigo-800/50">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
          <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        Deactivate Unit
      </DialogTitle>
      <DialogDescription>
        {row ? `Tell us why you're deactivating ${row.name}.` : "Tell us why you're deactivating this unit."}
      </DialogDescription>
    </DialogHeader>

    <Separator className="my-4" />

    {deactivateErr ? (
      <div className="mb-2 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
        <AlertTriangle className="mt-0.5 h-4 w-4" />
        <div className="min-w-0">{deactivateErr}</div>
      </div>
    ) : null}

    <div className="grid gap-3">
      <Label htmlFor="deactivate-reason">Reason</Label>
      <Textarea
        id="deactivate-reason"
        value={deactivateReason}
        onChange={(e) => {
          setDeactivateReason(e.target.value);
          if (deactivateErr) setDeactivateErr(null);
        }}
        rows={4}
        placeholder="e.g., Unit merged, temporarily closed, or repurposed."
      />
    </div>

    <DialogFooter className="mt-5">
      <Button variant="ghost" onClick={() => setDeactivateOpen(false)} disabled={busy}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={() => void confirmDeactivation()}
        disabled={busy || !deactivateReason.trim()}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Deactivate
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

        <EditUnitModal open={editOpen} unit={row} onClose={() => setEditOpen(false)} onSaved={() => refresh(false)} />

        <CreateOrEditRoomModal
          open={roomModalOpen}
          mode={roomModalMode}
          unit={row}
          room={roomEditing}
          onClose={() => setRoomModalOpen(false)}
          onSaved={() => refresh(false)}
        />

        <DeleteRoomModal
          open={roomDeleteOpen}
          unit={row}
          room={roomEditing}
          onClose={() => setRoomDeleteOpen(false)}
          onDeleted={() => refresh(false)}
        />

        <CreateOrEditResourceModal
          open={resModalOpen}
          mode={resModalMode}
          unit={row}
          rooms={rooms}
          resource={resEditing}
          onClose={() => setResModalOpen(false)}
          onSaved={() => refresh(false)}
        />

        <DeleteResourceModal
          open={resDeleteOpen}
          unit={row}
          resource={resEditing}
          onClose={() => setResDeleteOpen(false)}
          onDeleted={() => refresh(false)}
        />
      </RequirePerm>
    </AppShell>
  );
}

