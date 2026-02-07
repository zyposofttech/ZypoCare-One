"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";

import { IconBuilding, IconChevronRight } from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";

/* ---------------------------------- Types --------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string; isActive?: boolean };

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

  // Onboarding/capacity metadata (optional)
  totalRoomCount?: number | null;
  totalBedCapacity?: number | null;
  roomsCount?: number | null;
  commissioningDate?: string | null;
  floorNumber?: number | null;
  wingZone?: string | null;
  inchargeStaffId?: string | null;
  nursingStation?: string | null;

  createdAt?: string;
  updatedAt?: string;

  department?: DepartmentRow | null;
  unitType?: { id: string; code: string; name: string } | null;

  locationNode?: null | {
    id: string;
    kind?: string | null;
    revisions?: Array<{
      code?: string | null;
      name?: string | null;
      isActive?: boolean | null;
    }>;
  };
};

/* ---------------------------------- Utils --------------------------------- */

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateUnitCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Unit code is required";
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(v)) {
    return "Code must be 2–32 chars, letters/numbers/hyphen (example: OT-1, TH01, LAB1)";
  }
  return null;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
  if (!rows?.length) return [];
  if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
  return (rows as any[])
    .filter((r) => r?.unitTypeId && r?.isEnabled === true)
    .map((r) => String(r.unitTypeId));
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
        // FLOOR option
        if (String(floor.type).toUpperCase() === "FLOOR") {
          out.push({
            id: floor.id,
            type: "FLOOR",
            label: `${buildingName} — ${floorName}${floorCode}`,
          });
        }

        const zones = floor.zones ?? [];
        for (const zone of zones) {
          const zoneName = zone?.name ?? "Zone";
          const zoneCode = zone?.code ? ` (${zone.code})` : "";
          if (String(zone.type).toUpperCase() === "ZONE") {
            out.push({
              id: zone.id,
              type: "ZONE",
              label: `${buildingName} — ${floorName} — ${zoneName}${zoneCode}`,
            });
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

      // Some trees might put zones directly under building
      const zones = building.zones ?? [];
      for (const zone of zones) {
        const zoneName = zone?.name ?? "Zone";
        const zoneCode = zone?.code ? ` (${zone.code})` : "";
        if (String(zone.type).toUpperCase() === "ZONE") {
          out.push({
            id: zone.id,
            type: "ZONE",
            label: `${buildingName} — ${zoneName}${zoneCode}`,
          });
        }

        const areas = zone.areas ?? [];
        for (const area of areas) {
          const areaName = area?.name ?? "Area";
          const areaCode = area?.code ? ` (${area.code})` : "";
          if (String(area.type).toUpperCase() === "AREA") {
            out.push({
              id: area.id,
              type: "AREA",
              label: `${buildingName} — ${zoneName} — ${areaName}${areaCode}`,
            });
          }
        }
      }
    }
  }

  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

function unitLocationLabel(u: UnitRow) {
  const r0 = u.locationNode?.revisions?.[0];
  const name = r0?.name ?? null;
  const code = r0?.code ?? null;
  const label = [name, code ? `(${code})` : ""].filter(Boolean).join(" ").trim();
  return label || (u.locationNodeId ? `#${u.locationNodeId.slice(0, 8)}…` : "—");
}

/* ---------------------------------- Page ---------------------------------- */

export default function UnitsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { branchId, scope, isReady, reason } = useBranchContext();

  const [branch, setBranch] = React.useState<BranchRow | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<UnitRow[]>([]);

  // Meta
  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [unitTypesCatalog, setUnitTypesCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledUnitTypeIds, setEnabledUnitTypeIds] = React.useState<Set<string>>(new Set());
  const [locationsTree, setLocationsTree] = React.useState<LocationTree | null>(null);

  // Filters (match Departments page UX)
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [filterDept, setFilterDept] = React.useState<string>("ALL");
  const [filterUnitType, setFilterUnitType] = React.useState<string>("ALL");
  const [filterLocation, setFilterLocation] = React.useState<string>("ALL");

  // Editor
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UnitRow | null>(null);
  const [modalErr, setModalErr] = React.useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] = React.useState<UnitRow | null>(null);
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [deactivateErr, setDeactivateErr] = React.useState<string | null>(null);

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


  const enabledUnitTypes = React.useMemo(
    () => unitTypesCatalog.filter((ut) => enabledUnitTypeIds.has(ut.id)),
    [unitTypesCatalog, enabledUnitTypeIds],
  );

  const locationOptions = React.useMemo(() => buildLocationOptions(locationsTree), [locationsTree]);

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.filter((r) => !r.isActive).length;
  const usesRoomsCount = rows.filter((r) => r.usesRooms).length;

  const filteredRows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((u) => {
      if (!includeInactive && !u.isActive) return false;
      if (filterDept !== "ALL" && u.departmentId !== filterDept) return false;
      if (filterUnitType !== "ALL" && u.unitTypeId !== filterUnitType) return false;
      if (filterLocation !== "ALL" && String(u.locationNodeId || "") !== String(filterLocation)) return false;

      if (!s) return true;
      const hay = `${u.code} ${u.name} ${u.department?.name ?? ""} ${u.unitType?.name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, includeInactive, filterDept, filterUnitType, filterLocation]);

  async function loadBranch(bid: string) {
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(bid)}`);
      setBranch(b);
    } catch {
      setBranch(null);
    }
  }

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
      const list = await apiFetch<BranchUnitTypeRow[]>(
        `/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`,
      );
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

  async function loadUnits(bid: string) {
    setErr(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("branchId", bid);
      if (q.trim()) params.set("q", q.trim());
      if (includeInactive) params.set("includeInactive", "true");
      if (filterDept !== "ALL") params.set("departmentId", filterDept);
      if (filterUnitType !== "ALL") params.set("unitTypeId", filterUnitType);
      if (filterLocation !== "ALL") params.set("locationNodeId", filterLocation);

      const data = await apiFetch<UnitRow[]>(`/api/infrastructure/units?${params.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load units";
      setErr(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const refreshAll = React.useCallback(async () => {
    if (!branchId) return;
    await Promise.all([
      loadBranch(branchId),
      loadDepartments(branchId),
      loadUnitTypesCatalog(),
      loadBranchUnitTypeEnablement(branchId),
      loadLocations(branchId),
      loadUnits(branchId),
    ]);
  }, [branchId, q, includeInactive, filterDept, filterUnitType, filterLocation]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    void loadBranch(branchId);
    void Promise.all([
      loadDepartments(branchId),
      loadUnitTypesCatalog(),
      loadBranchUnitTypeEnablement(branchId),
      loadLocations(branchId),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    void loadUnits(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId, q, includeInactive, filterDept, filterUnitType, filterLocation]);

  function openCreate() {
    setEditing(null);
    setFormDeptId("");
    setFormUnitTypeId("");
    setFormLocationId("");
    setFormCode("");
    setFormName("");
    setFormTotalRoomCount("");
    setFormTotalBedCapacity("");
    setFormCommissioningDate("");
    setFormFloorNumber("");
    setFormWingZone("");
    setFormInchargeStaffId("");
    setFormNursingStation("");
    setModalErr(null);
    setOpen(true);
  }

  function openEdit(r: UnitRow) {
    setEditing(r);
    setFormDeptId(r.departmentId);
    setFormUnitTypeId(r.unitTypeId);
    setFormLocationId(r.locationNodeId ?? "");
    setFormCode(r.code);
    setFormName(r.name);
    setFormTotalRoomCount(r.totalRoomCount != null ? String(r.totalRoomCount) : "");
    setFormTotalBedCapacity(r.totalBedCapacity != null ? String(r.totalBedCapacity) : "");
    setFormCommissioningDate(r.commissioningDate ? new Date(r.commissioningDate).toISOString().slice(0, 10) : "");
    setFormFloorNumber(r.floorNumber != null ? String(r.floorNumber) : "");
    setFormWingZone(r.wingZone ?? "");
    setFormInchargeStaffId(r.inchargeStaffId ?? "");
    setFormNursingStation(r.nursingStation ?? "");
    setModalErr(null);
    setOpen(true);
  }

  const unitTypeOptions = React.useMemo(() => {
    if (editing) return unitTypesCatalog;
    return enabledUnitTypes.length ? enabledUnitTypes : unitTypesCatalog;
  }, [editing, enabledUnitTypes, unitTypesCatalog]);

  const selectedUnitType = React.useMemo(() => {
    return unitTypeOptions.find((x) => x.id === formUnitTypeId) ?? null;
  }, [unitTypeOptions, formUnitTypeId]);

  const derivedUsesRooms = React.useMemo(() => {
    if (!selectedUnitType) return null;
    return selectedUnitType.usesRoomsDefault ?? null;
  }, [selectedUnitType]);

  const derivedSchedulable = React.useMemo(() => {
    if (!selectedUnitType) return null;
    return selectedUnitType.schedulableByDefault ?? null;
  }, [selectedUnitType]);

  const derivedBedBased = React.useMemo(() => {
    if (!selectedUnitType) return null;
    return selectedUnitType.bedBasedDefault ?? null;
  }, [selectedUnitType]);

  // Helpful defaults when user selects a Unit Type
  React.useEffect(() => {
    if (!open || !!editing) return;
    if (derivedUsesRooms === false) {
      setFormTotalRoomCount("0");
    } else if (derivedUsesRooms === true && !formTotalRoomCount.trim()) {
      setFormTotalRoomCount("1");
    }

    if (derivedBedBased === false) {
      // leave blank unless user wants to record a nominal value
    } else if (derivedBedBased === true && !formTotalBedCapacity.trim()) {
      setFormTotalBedCapacity("1");
    }
  }, [open, editing, derivedUsesRooms, derivedBedBased]);

  const nameDupWarning = React.useMemo(() => {
    const name = formName.trim().toLowerCase();
    if (!name || !formDeptId) return null;
    const dup = rows.find(
      (u) =>
        u.departmentId === formDeptId &&
        u.name.trim().toLowerCase() === name &&
        (!editing || u.id !== editing.id),
    );
    if (!dup) return null;
    return `Another unit in this department already uses the name “${dup.name}”. Recommended: keep unit names unique within a department.`;
  }, [rows, formName, formDeptId, editing]);

  async function saveUnit() {
    if (!branchId) return;
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

      if (!editing) {
        const ce = validateUnitCode(formCode);
        if (ce) throw new ApiError(ce);
        await apiFetch(`/api/infrastructure/units?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            departmentId: formDeptId,
            unitTypeId: formUnitTypeId,
            locationNodeId: formLocationId,
            code: normalizeCode(formCode),
            name: formName.trim(),
            totalRoomCount: effectiveRoomCount,
            totalBedCapacity: bedCapacityPayload,
            commissioningDate: formCommissioningDate ? formCommissioningDate : undefined,
            floorNumber,
            wingZone: formWingZone.trim() ? formWingZone.trim() : undefined,
            inchargeStaffId: formInchargeStaffId.trim() ? formInchargeStaffId.trim() : undefined,
            nursingStation: formNursingStation.trim() ? formNursingStation.trim() : undefined,
          }),
        });
        toast({ title: "Unit created", description: "Unit added successfully.", duration: 1600 });
      } else {
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
      }

      setOpen(false);
      await loadUnits(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to save unit";
      setModalErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeactivation() {
    if (!branchId || !deactivateTarget) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setDeactivateErr("Please provide a reason for deactivation.");
      return;
    }
    setBusy(true);
    try {
      // Soft deactivate (backend uses DELETE for deactivation; reason is passed as query for future compatibility)
      await apiFetch(
        `/api/infrastructure/units/${encodeURIComponent(deactivateTarget.id)}?hard=false&cascade=true&reason=${encodeURIComponent(
          reason,
        )}`,
        { method: "DELETE" },
      );
      toast({ title: "Deactivated", description: `${deactivateTarget.name}`, duration: 1400 });
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      setDeactivateReason("");
      setDeactivateErr(null);
      await loadUnits(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status";
      setDeactivateErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: UnitRow) {
    if (!branchId) return;
    if (r.isActive) {
      setDeactivateTarget(r);
      setDeactivateReason("");
      setDeactivateErr(null);
      setDeactivateOpen(true);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/units/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });
      toast({ title: "Activated", description: `${r.name}`, duration: 1400 });
      await loadUnits(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Units">
      <RequirePerm perm="INFRA_UNIT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconBuilding className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Units</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure Units/Wards under Departments. Then manage Rooms/Bays and Resources inside each Unit.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage units."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void refreshAll()}
                disabled={loading || busy || !branchId}
              >
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={openCreate}
                disabled={loading || busy || !branchId}
              >
                <Plus className="h-4 w-4" />
                New Unit
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Search and filter units in the active branch.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Units</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive:{" "}
                    <span className="font-semibold tabular-nums">{inactiveCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Uses Rooms</div>
                  <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{usesRoomsCount}</div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Enabled Unit Types</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{enabledUnitTypes.length}</div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                    Catalog: <span className="font-semibold tabular-nums">{unitTypesCatalog.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by code or name..."
                    className="pl-10"
                    disabled={!branchId}
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span> units
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <Label className="text-xs text-zc-muted">Department</Label>
                  <Select value={filterDept} onValueChange={(v) => setFilterDept(v)} disabled={!branchId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[220px]">
                  <Label className="text-xs text-zc-muted">Unit Type</Label>
                  <Select value={filterUnitType} onValueChange={(v) => setFilterUnitType(v)} disabled={!branchId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      <SelectItem value="ALL">All</SelectItem>
                      {(enabledUnitTypes.length ? enabledUnitTypes : unitTypesCatalog).map((ut) => (
                        <SelectItem key={ut.id} value={ut.id}>
                          {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[260px]">
                  <Label className="text-xs text-zc-muted">Location</Label>
                  <Select value={filterLocation} onValueChange={(v) => setFilterLocation(v)} disabled={!branchId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      <SelectItem value="ALL">All</SelectItem>
                      {locationOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="block max-w-full truncate" title={o.label}>
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Include inactive</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setQ("");
                    setFilterDept("ALL");
                    setFilterUnitType("ALL");
                    setFilterLocation("ALL");
                    setIncludeInactive(false);
                  }}
                  disabled={!branchId}
                >
                  <Filter className="h-4 w-4" />
                  Reset
                </Button>

                {branch ? (
                  <span className="text-xs text-zc-muted">
                    Branch: <span className="font-semibold text-zc-text">{branch.code}</span>
                  </span>
                ) : null}
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
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Unit Directory</CardTitle>
                  <CardDescription className="text-sm">Units/Wards configured in the active branch.</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-2" disabled={!branchId}>
                    <Link href={branchId ? `/infrastructure/unit-types` : "#"}>
                      <Settings2 className="h-4 w-4" />
                      Unit Types
                    </Link>
                  </Button>
                </div>
              </div>
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
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                    <th className="px-4 py-3 text-left font-semibold">Rooms</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-zc-border">
                        <td className="px-4 py-3" colSpan={9}>
                          <div className="h-4 w-full animate-pulse rounded bg-zc-panel/30" />
                        </td>
                      </tr>
                    ))
                  ) : filteredRows.length === 0 ? (
                    <tr className="border-t border-zc-border">
                      <td className="px-4 py-10 text-center text-sm text-zc-muted" colSpan={9}>
                        No units found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/10">
                        <td className="px-4 py-3 font-mono text-xs">{r.code}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{r.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {r.department ? (
                            <span>
                              {r.department.name}{" "}
                              <span className="font-mono text-xs text-zc-muted">({r.department.code})</span>
                            </span>
                          ) : (
                            <span className="text-zc-muted">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {r.unitType ? (
                            <span>
                              {r.unitType.name}{" "}
                              <span className="font-mono text-xs text-zc-muted">({r.unitType.code})</span>
                            </span>
                          ) : (
                            <span className="text-zc-muted">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-zc-muted">{unitLocationLabel(r)}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {r.usesRooms ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                              >
                                {`${r.roomsCount ?? r.totalRoomCount ?? 0} rooms`}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-800/40 dark:bg-slate-900/20 dark:text-slate-200"
                              >
                                Open-bay
                              </Badge>
                            )}

                            {r.totalBedCapacity != null ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                              >
                                {`${r.totalBedCapacity} beds`}
                              </Badge>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {r.isActive ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                              INACTIVE
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-zc-muted">{fmtDateTime(r.updatedAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="success"
                              size="icon"
                              onClick={() => router.push(`/infrastructure/units/${r.id}`)}
                              title="View details"
                              aria-label="View details"
                              disabled={!branchId}
                            >
                              <IconChevronRight className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => openEdit(r)}
                              title="Edit unit"
                              aria-label="Edit unit"
                              disabled={!branchId || busy}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant={r.isActive ? "secondary" : "success"}
                              size="icon"
                              onClick={() => void toggleActive(r)}
                              title={r.isActive ? "Deactivate unit" : "Activate unit"}
                              aria-label={r.isActive ? "Deactivate unit" : "Activate unit"}
                              disabled={!branchId || busy}
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : r.isActive ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Deactivate */}
          <Dialog
            open={deactivateOpen}
            onOpenChange={(v) => {
              if (busy) return;
              setDeactivateOpen(v);
              if (!v) {
                setDeactivateErr(null);
                setDeactivateReason("");
                setDeactivateTarget(null);
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
                  {deactivateTarget ? `Tell us why you're deactivating ${deactivateTarget.name}.` : "Tell us why you're deactivating this unit."}
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
                <Button variant="destructive" onClick={() => void confirmDeactivation()} disabled={busy || !deactivateReason.trim()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Deactivate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Editor */}
          <Dialog
            open={open}
            onOpenChange={(v) => {
              if (busy) return;
              if (!v) setModalErr(null);
              setOpen(v);
            }}
          >
            <DialogContent className={drawerClassName()}>
              <ModalHeader
                title={editing ? "Edit Unit" : "Create Unit"}
                description="Configure units with capacity, location, and staffing defaults."
                onClose={() => setOpen(false)}
              />

              <div className="grid gap-6">
                {!branchId ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
                    <div className="min-w-0">Select a branch first.</div>
                  </div>
                ) : null}

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
                    <Select value={formDeptId} onValueChange={setFormDeptId} disabled={!branchId || !!editing}>
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
                    {editing ? <p className="text-[11px] text-zc-muted">Department cannot be changed after creation.</p> : null}
                  </div>

                  <div className="grid gap-2">
                    <Label>Unit Type</Label>
                    <Select value={formUnitTypeId} onValueChange={(v) => setFormUnitTypeId(v)} disabled={!branchId || !!editing}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select unit type…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px] overflow-y-auto">
                        {unitTypeOptions.map((ut) => (
                          <SelectItem key={ut.id} value={ut.id}>
                            {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editing ? <p className="text-[11px] text-zc-muted">Unit type cannot be changed after creation.</p> : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Location (Floor / Zone / Area)</Label>
                  <Select value={formLocationId} onValueChange={setFormLocationId} disabled={!branchId}>
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
                      disabled={!!editing || !branchId}
                    />
                    
                  </div>

                  <div className="grid gap-2">
                    <Label>Unit Name</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Operation Theatre Suite"
                      disabled={!branchId}
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
                    <Input type="number" min={0} value={formFloorNumber} onChange={(e) => setFormFloorNumber(e.target.value)} />
                  </div>

                  <div className="grid gap-2">
                    <Label>Wing / Zone</Label>
                    <Input value={formWingZone} onChange={(e) => setFormWingZone(e.target.value)} placeholder="e.g., A Wing" />
                  </div>
                </div>

                <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="text-sm font-semibold text-zc-text">Capabilities (derived from Unit Type)</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {derivedUsesRooms == null ? (
                      <Badge variant="secondary">Select Unit Type</Badge>
                    ) : derivedUsesRooms ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Has Rooms</Badge>
                    ) : (
                      <Badge variant="outline">No Rooms</Badge>
                    )}
                    {derivedSchedulable == null ? null : derivedSchedulable ? (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600">Schedulable</Badge>
                    ) : (
                      <Badge variant="outline">Not Schedulable</Badge>
                    )}
                    {derivedBedBased == null ? null : derivedBedBased ? (
                      <Badge className="bg-amber-600 hover:bg-amber-600">Bed-based</Badge>
                    ) : (
                      <Badge variant="outline">Not Bed-based</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-2">
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
                  <Switch checked={editing ? !!editing.isActive : true} disabled />
                  <span className="text-xs text-zc-muted">Status is managed from the directory (Activate/Deactivate).</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={() => void saveUnit()} disabled={busy || !branchId}>
                  {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
