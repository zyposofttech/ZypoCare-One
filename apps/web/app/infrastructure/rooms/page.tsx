"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  DoorOpen,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type UnitRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;
};

type RoomType =
  | "CONSULTATION"
  | "PROCEDURE"
  | "EXAMINATION"
  | "PATIENT_ROOM"
  | "ISOLATION"
  | "NEGATIVE_PRESSURE"
  | "POSITIVE_PRESSURE"
  | "NURSING_STATION"
  | "WAITING"
  | "STORAGE"
  | "UTILITY"
  | "RECOVERY";

type PricingTier = "ECONOMY" | "STANDARD" | "DELUXE" | "SUITE" | "VIP";

type IsolationType = "CONTACT" | "DROPLET" | "AIRBORNE" | "PROTECTIVE";

type MaintenanceStatus = "OPERATIONAL" | "UNDER_MAINTENANCE" | "CLEANING_IN_PROGRESS" | "BLOCKED" | "OUT_OF_SERVICE";

type RoomRow = {
  id: string;
  branchId: string;
  unitId: string;

  code: string;
  name: string;
  roomNumber?: string | null;

  roomType?: RoomType | null;

  areaSqFt?: number | null;
  hasAttachedBathroom?: boolean;
  hasAC?: boolean;
  hasTV?: boolean;
  hasOxygen?: boolean;
  hasSuction?: boolean;
  hasVentilator?: boolean;
  hasMonitor?: boolean;
  hasCallButton?: boolean;

  maxOccupancy?: number;
  currentOccupancy?: number;

  pricingTier?: PricingTier | null;
  baseChargePerDay?: any;

  isIsolation?: boolean;
  isolationType?: IsolationType | null;

  isActive: boolean;
  isAvailable?: boolean;
  maintenanceStatus?: MaintenanceStatus;
  lastCleanedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  unit?: { id: string; code: string; name: string } | null;
};

type UnitResourceState = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED" | "INACTIVE";

type ResourceRow = {
  id: string;
  unitId: string;
  roomId?: string | null;
  state: UnitResourceState;
  isActive: boolean;
};

/* --------------------------------- Const --------------------------------- */

const RESOURCE_STATES: UnitResourceState[] = ["AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED", "INACTIVE"];

const ROOM_TYPES: RoomType[] = [
  "CONSULTATION",
  "PROCEDURE",
  "EXAMINATION",
  "PATIENT_ROOM",
  "ISOLATION",
  "NEGATIVE_PRESSURE",
  "POSITIVE_PRESSURE",
  "NURSING_STATION",
  "WAITING",
  "STORAGE",
  "UTILITY",
  "RECOVERY",
];

const PRICING_TIERS: PricingTier[] = ["ECONOMY", "STANDARD", "DELUXE", "SUITE", "VIP"];
const ISOLATION_TYPES: IsolationType[] = ["CONTACT", "DROPLET", "AIRBORNE", "PROTECTIVE"];
const MAINTENANCE_STATUSES: MaintenanceStatus[] = ["OPERATIONAL", "UNDER_MAINTENANCE", "CLEANING_IN_PROGRESS", "BLOCKED", "OUT_OF_SERVICE"];

const PATIENT_ROOM_TYPES = new Set<RoomType>(["PATIENT_ROOM", "ISOLATION", "NEGATIVE_PRESSURE", "POSITIVE_PRESSURE"]);
const ISOLATION_ROOM_TYPES = new Set<RoomType>(["ISOLATION", "NEGATIVE_PRESSURE", "POSITIVE_PRESSURE"]);

/* --------------------------------- Utils --------------------------------- */

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

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateRoomCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Room code is required";
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(v)) {
    return "Code must be 2–32 chars, letters/numbers/underscore/hyphen (example: OT-1, TH01, LAB_1)";
  }
  return null;
}

function normalizeRoomNumber(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateRoomNumber(roomNumber: string): string | null {
  const v = normalizeRoomNumber(roomNumber);
  if (!v) return "Room number is required";
  if (v.length > 32) return "Room number must be <= 32 characters";
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(v)) return "Room number allowed: A–Z, 0–9, underscore (_) and hyphen (-)";
  return null;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pill(className: string, text: string) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", className)}>
      {text}
    </span>
  );
}

function stateBadge(state: UnitResourceState, count: number) {
  const base = "min-w-[72px] justify-center tabular-nums";
  if (state === "AVAILABLE") return <Badge className={cn("bg-emerald-600 text-white", base)}>AVL {count}</Badge>;
  if (state === "RESERVED") return <Badge className={cn("bg-violet-600 text-white", base)}>RSV {count}</Badge>;
  if (state === "OCCUPIED") return <Badge className={cn("bg-rose-600 text-white", base)}>OCC {count}</Badge>;
  if (state === "CLEANING") return <Badge className={cn("bg-sky-600 text-white", base)}>CLN {count}</Badge>;
  if (state === "MAINTENANCE") return <Badge className={cn("bg-amber-600 text-white", base)}>MNT {count}</Badge>;
  if (state === "BLOCKED") return <Badge className={cn("bg-orange-600 text-white", base)}>BLK {count}</Badge>;
  return <Badge variant="secondary" className={cn(base)}>INA {count}</Badge>;
}

function asNumberOrUndef(v: string) {
  const t = String(v ?? "").trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/* ---------------------------------- Page ---------------------------------- */

export default function RoomsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();

  const { isReady, branchId, scope, reason } = useBranchContext();

  const highlightRoomId = sp.get("roomId") || null;
  const qpUnitId = sp.get("unitId") || null;

  const [branch, setBranch] = React.useState<BranchRow | null>(null);

  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [unitId, setUnitId] = React.useState<string>("");

  const [rows, setRows] = React.useState<RoomRow[]>([]);
  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // Editor
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RoomRow | null>(null);
  const [tab, setTab] = React.useState<"basic" | "rules">("basic");
  const [modalErr, setModalErr] = React.useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] = React.useState<RoomRow | null>(null);
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [deactivateErr, setDeactivateErr] = React.useState<string | null>(null);
  const [deactivateOrigin, setDeactivateOrigin] = React.useState<"edit" | "toggle" | null>(null);

  // Form (matches your interface)
  const [formUnitId, setFormUnitId] = React.useState<string>("");

  const [formCode, setFormCode] = React.useState<string>("");
  const [formRoomNumber, setFormRoomNumber] = React.useState<string>("");
  const [formName, setFormName] = React.useState<string>("");

  const [formRoomType, setFormRoomType] = React.useState<RoomType>("CONSULTATION");
  const [formAreaSqFt, setFormAreaSqFt] = React.useState<string>("");

  const [formHasAttachedBathroom, setFormHasAttachedBathroom] = React.useState(false);
  const [formHasAC, setFormHasAC] = React.useState(false);
  const [formHasTV, setFormHasTV] = React.useState(false);
  const [formHasOxygen, setFormHasOxygen] = React.useState(false);
  const [formHasSuction, setFormHasSuction] = React.useState(false);
  const [formHasVentilator, setFormHasVentilator] = React.useState(false);
  const [formHasMonitor, setFormHasMonitor] = React.useState(false);
  const [formHasCallButton, setFormHasCallButton] = React.useState(false);

  const [formMaxOccupancy, setFormMaxOccupancy] = React.useState<string>("1");
  const [formCurrentOccupancy, setFormCurrentOccupancy] = React.useState<string>("0");

  const [formPricingTier, setFormPricingTier] = React.useState<PricingTier | "">("");
  const [formBaseChargePerDay, setFormBaseChargePerDay] = React.useState<string>("");

  const [formIsIsolation, setFormIsIsolation] = React.useState(false);
  const [formIsolationType, setFormIsolationType] = React.useState<IsolationType | "">("");

  const [formAvailable, setFormAvailable] = React.useState(true);
  const [formMaintenanceStatus, setFormMaintenanceStatus] = React.useState<MaintenanceStatus>("OPERATIONAL");
  const [formLastCleanedAt, setFormLastCleanedAt] = React.useState<string>("");

  const [formActive, setFormActive] = React.useState<boolean>(true);

  const selectedUnit = React.useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId]);

  const filteredRows = React.useMemo(() => {
    const v = String(q || "").trim().toLowerCase();
    if (!v) return rows;
    return rows.filter((r) => {
      const rn = String(r.roomNumber ?? "").toLowerCase();
      return r.code.toLowerCase().includes(v) || r.name.toLowerCase().includes(v) || rn.includes(v);
    });
  }, [rows, q]);

  const totals = React.useMemo(() => {
    const totalRooms = rows.length;
    const activeRooms = rows.filter((r) => r.isActive).length;
    const resForCounts = includeInactive ? resources : resources.filter((x) => x.isActive);
    const totalResources = resForCounts.length;

    const byState: Record<UnitResourceState, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      MAINTENANCE: 0,
      BLOCKED: 0,
      INACTIVE: 0,
    };
    for (const r of resForCounts) {
      byState[r.state] = (byState[r.state] || 0) + 1;
    }

    return { totalRooms, activeRooms, totalResources, byState };
  }, [rows, resources, includeInactive]);

  const countsByRoom = React.useMemo(() => {
    const m = new Map<string, Record<UnitResourceState, number>>();
    const data = includeInactive ? resources : resources.filter((x) => x.isActive);

    for (const r of data) {
      if (!r.roomId) continue;
      if (!m.has(r.roomId)) {
        m.set(r.roomId, { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, CLEANING: 0, MAINTENANCE: 0, BLOCKED: 0, INACTIVE: 0 });
      }
      const rec = m.get(r.roomId)!;
      rec[r.state] = (rec[r.state] || 0) + 1;
    }
    return m;
  }, [resources, includeInactive]);

  async function loadBranch(bid: string) {
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${bid}`, { showLoader: false });
      setBranch(b);
    } catch {
      setBranch(null);
    }
  }

  async function loadUnits(bid: string) {
    const list = await apiFetch<UnitRow[]>(
      `/api/infrastructure/units?branchId=${encodeURIComponent(bid)}&includeInactive=true`,
      { showLoader: false },
    );
    setUnits(Array.isArray(list) ? list : []);
    return Array.isArray(list) ? list : [];
  }

  async function loadRooms(nextUnitId: string) {
    const list = await apiFetch<RoomRow[]>(
      `/api/infrastructure/rooms?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=${includeInactive ? "true" : "false"}`,
      { showLoader: false },
    );
    setRows(Array.isArray(list) ? list : []);
  }

  async function loadResources(nextUnitId: string) {
    const list = await apiFetch<ResourceRow[]>(
      `/api/infrastructure/resources?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=${includeInactive ? "true" : "false"}`,
      { showLoader: false },
    );
    setResources(Array.isArray(list) ? list : []);
  }

  async function refreshAll() {
    if (!branchId) {
      setBranch(null);
      setUnits([]);
      setUnitId("");
      setRows([]);
      setResources([]);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      await loadBranch(branchId);
      const u = await loadUnits(branchId);

      let nextUnitId = unitId;

      if (qpUnitId && u.some((x) => x.id === qpUnitId)) nextUnitId = qpUnitId;
      if (nextUnitId && !u.some((x) => x.id === nextUnitId)) nextUnitId = "";
      if (!nextUnitId && u.length) {
        const firstRoomsUnit = u.find((x) => x.usesRooms) || u[0];
        nextUnitId = firstRoomsUnit?.id || "";
      }

      setUnitId(nextUnitId);

      if (nextUnitId) {
        await Promise.all([loadRooms(nextUnitId), loadResources(nextUnitId)]);
      } else {
        setRows([]);
        setResources([]);
      }
    } catch (e: any) {
      const msg =
        e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Failed to load rooms";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isReady) return;
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    if (!unitId) return;
    void (async () => {
      try {
        setErr(null);
        setLoading(true);
        await Promise.all([loadRooms(unitId), loadResources(unitId)]);
      } catch (e: any) {
        const msg =
          e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Failed to load rooms";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, includeInactive]);

  React.useEffect(() => {
    if (!highlightRoomId) return;
    if (!filteredRows.some((r) => r.id === highlightRoomId)) return;

    const t = window.setTimeout(() => {
      const el = document.getElementById(`room-${highlightRoomId}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 250);

    return () => window.clearTimeout(t);
  }, [highlightRoomId, filteredRows]);

  function openCreate() {
    setEditing(null);
    setTab("basic");
    setModalErr(null);

    const defaultUnit = unitId || units.find((u) => u.usesRooms)?.id || units[0]?.id || "";
    setFormUnitId(defaultUnit);

    setFormCode("");
    setFormRoomNumber("");
    setFormName("");

    setFormRoomType("CONSULTATION");
    setFormAreaSqFt("");

    setFormHasAttachedBathroom(false);
    setFormHasAC(false);
    setFormHasTV(false);
    setFormHasOxygen(false);
    setFormHasSuction(false);
    setFormHasVentilator(false);
    setFormHasMonitor(false);
    setFormHasCallButton(false);

    setFormMaxOccupancy("1");
    setFormCurrentOccupancy("0");

    setFormPricingTier("");
    setFormBaseChargePerDay("");

    setFormIsIsolation(false);
    setFormIsolationType("");

    setFormAvailable(true);
    setFormMaintenanceStatus("OPERATIONAL");
    setFormLastCleanedAt("");

    setFormActive(true);

    setOpen(true);
  }

  function openEdit(r: RoomRow) {
    setEditing(r);
    setTab("basic");
    setModalErr(null);

    setFormUnitId(r.unitId);

    setFormCode(r.code);
    setFormRoomNumber(String(r.roomNumber ?? ""));
    setFormName(r.name);

    setFormRoomType((r.roomType ?? "CONSULTATION") as RoomType);
    setFormAreaSqFt(r.areaSqFt != null ? String(r.areaSqFt) : "");

    setFormHasAttachedBathroom(!!r.hasAttachedBathroom);
    setFormHasAC(!!r.hasAC);
    setFormHasTV(!!r.hasTV);
    setFormHasOxygen(!!r.hasOxygen);
    setFormHasSuction(!!r.hasSuction);
    setFormHasVentilator(!!r.hasVentilator);
    setFormHasMonitor(!!r.hasMonitor);
    setFormHasCallButton(!!r.hasCallButton);

    setFormMaxOccupancy(String(r.maxOccupancy ?? 1));
    setFormCurrentOccupancy(String(r.currentOccupancy ?? 0));

    setFormPricingTier((r.pricingTier ?? "") as any);
    setFormBaseChargePerDay(r.baseChargePerDay != null ? String(r.baseChargePerDay) : "");

    const impliedIso = ISOLATION_ROOM_TYPES.has((r.roomType ?? "CONSULTATION") as RoomType);
    setFormIsIsolation(!!r.isIsolation || impliedIso);
    setFormIsolationType((r.isolationType ?? "") as any);

    setFormAvailable(r.isAvailable ?? true);
    setFormMaintenanceStatus((r.maintenanceStatus ?? "OPERATIONAL") as MaintenanceStatus);
    setFormLastCleanedAt(r.lastCleanedAt ? String(r.lastCleanedAt).slice(0, 16) : "");

    setFormActive(r.isActive);

    setOpen(true);
  }

  function openDeactivateModal(target: RoomRow, origin: "edit" | "toggle") {
    setDeactivateTarget(target);
    setDeactivateOrigin(origin);
    setDeactivateReason("");
    setDeactivateErr(null);
    setDeactivateOpen(true);
  }

  async function save() {
    if (!branchId) return;
    setBusy(true);
    setModalErr(null);

    try {
      const name = String(formName || "").trim();
      if (!formUnitId) throw new Error("Unit is required");
      if (!name) throw new Error("Room name is required");

      if (!editing) {
        const codeErr = validateRoomCode(formCode);
        if (codeErr) throw new Error(codeErr);

        const rnErr = validateRoomNumber(formRoomNumber);
        if (rnErr) throw new Error(rnErr);

        const u = units.find((x) => x.id === formUnitId) || null;
        if (!u) throw new Error("Unit not found");
        if (!u.isActive) throw new Error("Unit is inactive");
        if (!u.usesRooms) throw new Error("This unit is open-bay (usesRooms=false). Rooms are not allowed.");

        const maxOcc = asNumberOrUndef(formMaxOccupancy) ?? 1;
        const curOcc = asNumberOrUndef(formCurrentOccupancy) ?? 0;
        if (curOcc > maxOcc) throw new Error("Current occupancy cannot exceed max occupancy.");

        if ((PATIENT_ROOM_TYPES.has(formRoomType) || ISOLATION_ROOM_TYPES.has(formRoomType)) && !formPricingTier) {
          throw new Error("Pricing tier is required for patient rooms / isolation rooms.");
        }
        const isoEnabled = formIsIsolation || ISOLATION_ROOM_TYPES.has(formRoomType);
        if (isoEnabled && !formIsolationType) {
          throw new Error("Isolation type is required when isolation is enabled.");
        }

        const res = await apiFetch<any>(`/api/infrastructure/rooms`, {
          method: "POST",
          body: {
            unitId: formUnitId,
            code: normalizeCode(formCode),
            roomNumber: normalizeRoomNumber(formRoomNumber),
            name,
            roomType: formRoomType,

            areaSqFt: asNumberOrUndef(formAreaSqFt),
            hasAttachedBathroom: formHasAttachedBathroom,
            hasAC: formHasAC,
            hasTV: formHasTV,
            hasOxygen: formHasOxygen,
            hasSuction: formHasSuction,
            hasVentilator: formHasVentilator,
            hasMonitor: formHasMonitor,
            hasCallButton: formHasCallButton,

            maxOccupancy: maxOcc,
            currentOccupancy: curOcc,

            pricingTier: formPricingTier || undefined,
            baseChargePerDay: asNumberOrUndef(formBaseChargePerDay),

            isIsolation: isoEnabled,
            isolationType: isoEnabled ? (formIsolationType || undefined) : undefined,

            isAvailable: formAvailable,
            maintenanceStatus: formMaintenanceStatus,
            lastCleanedAt: formLastCleanedAt ? new Date(formLastCleanedAt).toISOString() : undefined,

            isActive: !!formActive,
          },
        });

        toast({ title: "Room created", description: "Room has been created successfully." });

        if (Array.isArray(res?.warnings) && res.warnings.length) {
          toast({
            title: "Warnings",
            description: res.warnings.join(" • "),
          });
        }

        setUnitId(formUnitId);
      } else {
        // If user turned OFF active in edit, enforce reason-required deactivate
        if (editing.isActive && !formActive) {
          openDeactivateModal(editing, "edit");
          setBusy(false);
          return;
        } else {
          const maxOcc = asNumberOrUndef(formMaxOccupancy) ?? (editing.maxOccupancy ?? 1);
          const curOcc = asNumberOrUndef(formCurrentOccupancy) ?? (editing.currentOccupancy ?? 0);
          if (curOcc > maxOcc) throw new Error("Current occupancy cannot exceed max occupancy.");

          if ((PATIENT_ROOM_TYPES.has(formRoomType) || ISOLATION_ROOM_TYPES.has(formRoomType)) && !formPricingTier) {
            throw new Error("Pricing tier is required for patient rooms / isolation rooms.");
          }
          const isoEnabled = formIsIsolation || ISOLATION_ROOM_TYPES.has(formRoomType);
          if (isoEnabled && !formIsolationType) {
            throw new Error("Isolation type is required when isolation is enabled.");
          }

          const res = await apiFetch<any>(`/api/infrastructure/rooms/${editing.id}`, {
            method: "PATCH",
            body: {
              // keep code/unit stable in UI; roomNumber editable
              roomNumber: normalizeRoomNumber(formRoomNumber),
              name,
              roomType: formRoomType,

              areaSqFt: asNumberOrUndef(formAreaSqFt),
              hasAttachedBathroom: formHasAttachedBathroom,
              hasAC: formHasAC,
              hasTV: formHasTV,
              hasOxygen: formHasOxygen,
              hasSuction: formHasSuction,
              hasVentilator: formHasVentilator,
              hasMonitor: formHasMonitor,
              hasCallButton: formHasCallButton,

              maxOccupancy: maxOcc,
              currentOccupancy: curOcc,

              pricingTier: formPricingTier || null,
              baseChargePerDay: formBaseChargePerDay ? asNumberOrUndef(formBaseChargePerDay) : null,

              isIsolation: isoEnabled,
              isolationType: isoEnabled ? (formIsolationType || null) : null,

              isAvailable: formAvailable,
              maintenanceStatus: formMaintenanceStatus,
              lastCleanedAt: formLastCleanedAt ? new Date(formLastCleanedAt).toISOString() : null,

              isActive: formActive, // true allowed; false handled via deactivate
            },
          });

          toast({ title: "Room updated", description: "Room has been updated successfully." });

          if (Array.isArray(res?.warnings) && res.warnings.length) {
            toast({
              title: "Warnings",
              description: res.warnings.join(" • "),
            });
          }
        }
      }

      setOpen(false);
      await Promise.all([loadRooms(formUnitId), loadResources(formUnitId)]);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Save failed";
      setModalErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: RoomRow) {
    if (!branchId) return;
    setErr(null);

    try {
      if (r.isActive) {
        openDeactivateModal(r, "toggle");
        return;
      } else {
        setBusy(true);
        await apiFetch(`/api/infrastructure/rooms/${r.id}`, { method: "PATCH", body: { isActive: true } });
        toast({ title: "Room activated", description: "Room is active again." });
      }

      await Promise.all([loadRooms(unitId), loadResources(unitId)]);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Update failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeactivation() {
    if (!branchId || !deactivateTarget) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setDeactivateErr("Reason is required.");
      return;
    }

    setBusy(true);
    setDeactivateErr(null);
    try {
      await apiFetch(`/api/infrastructure/rooms/${deactivateTarget.id}/deactivate`, {
        method: "POST",
        body: { reason, cascade: true },
      });
      toast({ title: "Room deactivated", description: "Room marked inactive (resources cascaded inactive)." });

      if (deactivateOrigin === "edit") {
        setOpen(false);
      }

      const refreshUnitId = formUnitId || unitId || deactivateTarget.unitId;
      if (refreshUnitId) {
        await Promise.all([loadRooms(refreshUnitId), loadResources(refreshUnitId)]);
      }
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      setDeactivateOrigin(null);
      setDeactivateReason("");
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Update failed";
      setDeactivateErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Rooms">
      <RequirePerm perm="INFRA_ROOM_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconBuilding className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Rooms</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure rooms under a unit (units with <span className="font-semibold">usesRooms=true</span>). Room list shows resource counts by state.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage rooms."}
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
                New Room
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Pick a unit, then search/filter rooms.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Rooms</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totals.totalRooms}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{totals.activeRooms}</span> | Inactive:{" "}
                    <span className="font-semibold tabular-nums">{totals.totalRooms - totals.activeRooms}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Resources in Unit</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{totals.totalResources}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RESOURCE_STATES.map((s) => (
                      <span key={s}>{stateBadge(s, totals.byState[s] || 0)}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Selected Unit</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                    {selectedUnit ? selectedUnit.code : "—"}
                  </div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                    {selectedUnit ? selectedUnit.name : "Pick a unit to view rooms."}
                  </div>
                  <div className="mt-2">
                    {selectedUnit ? (
                      selectedUnit.usesRooms ? (
                        <Badge className="bg-emerald-600 text-white">usesRooms=true</Badge>
                      ) : (
                        <Badge variant="secondary">open-bay (usesRooms=false)</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">No unit selected</Badge>
                    )}
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
                    placeholder="Search by code, room number, or name..."
                    className="pl-10"
                    disabled={!branchId}
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span> rooms
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[320px]">
                  <Label className="text-xs text-zc-muted">Unit</Label>
                  <Select
                    value={unitId || "NONE"}
                    onValueChange={(v) => setUnitId(v === "NONE" ? "" : v)}
                    disabled={!branchId}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue placeholder="Select unit…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[340px] overflow-y-auto">
                      <SelectItem value="NONE">Select unit…</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}{" "}
                          <span className="font-mono text-xs text-zc-muted">
                            ({u.code}) {u.usesRooms ? "" : "• open-bay"}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId || !unitId} />
                  <span className="text-xs text-zc-muted">Include inactive</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setQ("");
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

              {selectedUnit && !selectedUnit.usesRooms ? (
                <div className="rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.10)] px-3 py-2 text-sm text-zc-text">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
                    <div className="min-w-0">
                      This unit is configured as <span className="font-semibold">open-bay</span> (usesRooms=false). Rooms are not allowed. Manage resources under{" "}
                      <Link className="underline" href={`/infrastructure/resources?unitId=${encodeURIComponent(selectedUnit.id)}`}>
                        Resources
                      </Link>
                      .
                    </div>
                  </div>
                </div>
              ) : null}

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
                  <CardTitle className="text-base">Room Directory</CardTitle>
                  <CardDescription className="text-sm">
                    {selectedUnit ? (
                      <>
                        Rooms for unit <span className="font-semibold">{selectedUnit.name}</span>{" "}
                        <span className="font-mono text-xs text-zc-muted">({selectedUnit.code})</span>
                      </>
                    ) : (
                      "Select a unit to view rooms."
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Room</th>
                    <th className="px-4 py-3 text-left font-semibold">Resources by state</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!unitId ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10">
                        <div className="text-sm text-zc-muted">Select a unit to view rooms.</div>
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10">
                        <div className="flex items-center gap-3 text-sm text-zc-muted">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
                        </div>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10">
                        <div className="text-sm text-zc-muted">No rooms found.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const c = countsByRoom.get(r.id) || {
                        AVAILABLE: 0,
                        RESERVED: 0,
                        OCCUPIED: 0,
                        CLEANING: 0,
                        MAINTENANCE: 0,
                        BLOCKED: 0,
                        INACTIVE: 0,
                      };

                      const isHighlighted = highlightRoomId === r.id;
                      const occ = (c.OCCUPIED || 0) + (c.RESERVED || 0);
                      const maxOcc = r.maxOccupancy ?? 1;

                      return (
                        <tr
                          key={r.id}
                          id={`room-${r.id}`}
                          className={cn(
                            "border-t border-zc-border hover:bg-zc-panel/10",
                            isHighlighted && "bg-indigo-50/60 dark:bg-indigo-900/15",
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-zc-text">{r.code}</td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-zc-text">
                              {r.name}{" "}
                              {r.roomNumber ? <span className="ml-2 font-mono text-xs text-zc-muted">#{r.roomNumber}</span> : null}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zc-muted">
                              <span className="rounded-full border border-zc-border bg-zc-panel/10 px-2 py-0.5">
                                Type: <span className="font-semibold text-zc-text">{String(r.roomType ?? "—")}</span>
                              </span>
                              <span className="rounded-full border border-zc-border bg-zc-panel/10 px-2 py-0.5">
                                Occ: <span className="font-semibold text-zc-text tabular-nums">{occ}</span> /{" "}
                                <span className="font-semibold text-zc-text tabular-nums">{maxOcc}</span>
                              </span>
                              <span className="rounded-full border border-zc-border bg-zc-panel/10 px-2 py-0.5">
                                Maint: <span className="font-semibold text-zc-text">{String(r.maintenanceStatus ?? "OPERATIONAL")}</span>
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {RESOURCE_STATES.map((s) => (
                                <span key={s}>{stateBadge(s, c[s] || 0)}</span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {r.isActive
                              ? pill(
                                  "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
                                  "ACTIVE",
                                )
                              : pill(
                                  "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
                                  "INACTIVE",
                                )}
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">{fmtDateTime(r.updatedAt)}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="success"
                                size="icon"
                                onClick={() =>
                                  router.push(
                                    `/infrastructure/rooms/${encodeURIComponent(r.id)}`,
                                  )
                                }
                                title="View details"
                                aria-label="View details"
                                disabled={!branchId || busy}
                              >
                                <IconChevronRight className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => openEdit(r)}
                                title="Edit room"
                                aria-label="Edit room"
                                disabled={!branchId || busy}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant={r.isActive ? "secondary" : "success"}
                                size="icon"
                                onClick={() => void toggleActive(r)}
                                title={r.isActive ? "Deactivate room" : "Activate room"}
                                aria-label={r.isActive ? "Deactivate room" : "Activate room"}
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
                      );
                    })
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
                setDeactivateOrigin(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[520px] rounded-2xl border border-indigo-200/50 bg-zc-card shadow-2xl shadow-indigo-500/10 dark:border-indigo-800/50">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Deactivate Room
                </DialogTitle>
                <DialogDescription>
                  {deactivateTarget ? `Tell us why you're deactivating ${deactivateTarget.name}.` : "Tell us why you're deactivating this room."}
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
                <Label htmlFor="room-deactivate-reason">Reason</Label>
                <Textarea
                  id="room-deactivate-reason"
                  value={deactivateReason}
                  onChange={(e) => {
                    setDeactivateReason(e.target.value);
                    if (deactivateErr) setDeactivateErr(null);
                  }}
                  rows={4}
                  placeholder="e.g., Room closed for renovation, merged, or repurposed."
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
            <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <DoorOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {editing ? "Edit Room" : "Create Room"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update room attributes (type, amenities, capacity, pricing, isolation, availability & maintenance)."
                    : "Create a room under a unit (usesRooms=true). Resources can then be mapped to this room."}
                </DialogDescription>
              </DialogHeader>

              <Separator className="my-4" />

              {modalErr ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{modalErr}</div>
                </div>
              ) : null}

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="basic">Basics</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4">
                  <div className="grid gap-5">
                    <div className="grid gap-2">
                      <Label>Unit</Label>
                      <Select
                        value={formUnitId || "NONE"}
                        onValueChange={(v) => setFormUnitId(v === "NONE" ? "" : v)}
                        disabled={!!editing}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue placeholder="Select unit…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[340px] overflow-y-auto">
                          <SelectItem value="NONE">Select unit…</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}{" "}
                              <span className="font-mono text-xs text-zc-muted">
                                ({u.code}) {u.usesRooms ? "" : "• open-bay"}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editing ? <p className="text-[11px] text-zc-muted">Unit cannot be changed after creation.</p> : null}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="grid gap-2 sm:col-span-1">
                        <Label>Room Code</Label>
                        <Input
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                          placeholder="e.g. RM-ICU-A-101"
                          className={cn(
                            "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                            editing && "opacity-80",
                          )}
                          disabled={!!editing}
                        />
                        <p className="text-[11px] text-zc-muted">Code should be stable. Editing is disabled after creation.</p>
                      </div>

                      <div className="grid gap-2 sm:col-span-1">
                        <Label>Room Number</Label>
                        <Input
                          value={formRoomNumber}
                          onChange={(e) => setFormRoomNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. 101 / ICU-101"
                          className="font-mono"
                        />
                        <p className="text-[11px] text-zc-muted">Used as display number. Must be unique within unit.</p>
                      </div>

                      <div className="grid gap-2 sm:col-span-1">
                        <Label>Room Name</Label>
                        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. ICU Room 101" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Room Type</Label>
                        <Select value={formRoomType} onValueChange={(v) => setFormRoomType(v as RoomType)}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[340px] overflow-y-auto">
                            {ROOM_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Area (sq.ft)</Label>
                        <Input
                          type="number"
                          value={formAreaSqFt}
                          onChange={(e) => setFormAreaSqFt(e.target.value)}
                          placeholder="e.g. 180"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Max Occupancy</Label>
                        <Input
                          type="number"
                          value={formMaxOccupancy}
                          onChange={(e) => setFormMaxOccupancy(e.target.value)}
                          placeholder="e.g. 1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Current Occupancy</Label>
                        <Input
                          type="number"
                          value={formCurrentOccupancy}
                          onChange={(e) => setFormCurrentOccupancy(e.target.value)}
                          placeholder="0"
                        />
                        </div>

                      <div className="grid gap-2">
                        <Label>Pricing Tier</Label>
                        <Select value={formPricingTier || "NONE"} onValueChange={(v) => setFormPricingTier(v === "NONE" ? "" : (v as PricingTier))}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder="Select tier…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {PRICING_TIERS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Base Charge / Day</Label>
                        <Input
                          type="number"
                          value={formBaseChargePerDay}
                          onChange={(e) => setFormBaseChargePerDay(e.target.value)}
                          placeholder="e.g. 3500"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="text-sm font-semibold text-zc-text">Amenities</div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Attached Bathroom</div>
                            <div className="text-xs text-zc-muted">hasAttachedBathroom</div>
                          </div>
                          <Switch checked={formHasAttachedBathroom} onCheckedChange={setFormHasAttachedBathroom} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">AC</div>
                            <div className="text-xs text-zc-muted">hasAC</div>
                          </div>
                          <Switch checked={formHasAC} onCheckedChange={setFormHasAC} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">TV</div>
                            <div className="text-xs text-zc-muted">hasTV</div>
                          </div>
                          <Switch checked={formHasTV} onCheckedChange={setFormHasTV} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Oxygen</div>
                            <div className="text-xs text-zc-muted">hasOxygen</div>
                          </div>
                          <Switch checked={formHasOxygen} onCheckedChange={setFormHasOxygen} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Suction</div>
                            <div className="text-xs text-zc-muted">hasSuction</div>
                          </div>
                          <Switch checked={formHasSuction} onCheckedChange={setFormHasSuction} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Ventilator</div>
                            <div className="text-xs text-zc-muted">hasVentilator</div>
                          </div>
                          <Switch checked={formHasVentilator} onCheckedChange={setFormHasVentilator} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Monitor</div>
                            <div className="text-xs text-zc-muted">hasMonitor</div>
                          </div>
                          <Switch checked={formHasMonitor} onCheckedChange={setFormHasMonitor} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Call Button</div>
                            <div className="text-xs text-zc-muted">hasCallButton</div>
                          </div>
                          <Switch checked={formHasCallButton} onCheckedChange={setFormHasCallButton} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="text-sm font-semibold text-zc-text">Isolation</div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Isolation Enabled</div>
                            <div className="text-xs text-zc-muted">isIsolation</div>
                          </div>
                          <Switch
                            checked={formIsIsolation || ISOLATION_ROOM_TYPES.has(formRoomType)}
                            onCheckedChange={(v) => setFormIsIsolation(v)}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Isolation Type</Label>
                          <Select
                            value={formIsolationType || "NONE"}
                            onValueChange={(v) => setFormIsolationType(v === "NONE" ? "" : (v as IsolationType))}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                              <SelectValue placeholder="Select isolation type…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {ISOLATION_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-zc-muted">Required when isolation is enabled.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="text-sm font-semibold text-zc-text">Status</div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Active</div>
                            <div className="text-xs text-zc-muted">isActive</div>
                          </div>
                          <Switch checked={formActive} onCheckedChange={setFormActive} />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Available</div>
                            <div className="text-xs text-zc-muted">isAvailable</div>
                          </div>
                          <Switch checked={formAvailable} onCheckedChange={setFormAvailable} />
                        </div>

                        <div className="grid gap-2">
                          <Label>Maintenance Status</Label>
                          <Select value={formMaintenanceStatus} onValueChange={(v) => setFormMaintenanceStatus(v as MaintenanceStatus)}>
                            <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                              <SelectValue placeholder="Select status…" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[340px] overflow-y-auto">
                              {MAINTENANCE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2 sm:col-span-2 lg:col-span-3">
                          <Label>Last Cleaned At</Label>
                          <Input
                            type="datetime-local"
                            value={formLastCleanedAt}
                            onChange={(e) => setFormLastCleanedAt(e.target.value)}
                          />
                          <p className="text-[11px] text-zc-muted">Optional. Stored as ISO datetime.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="mt-4">
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                      <div className="text-sm font-semibold text-zc-text">Room rules</div>
                      <div className="mt-2 text-sm text-zc-muted">
                        Rooms are allowed only under units configured with <span className="font-semibold">usesRooms=true</span>. Deactivating a room requires a reason and will cascade resources inactive by default.
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                          <div className="text-xs text-zc-muted">Uniqueness</div>
                          <div className="mt-1 text-sm text-zc-text">
                            Room uniqueness is enforced per unit by <span className="font-semibold">code</span> and <span className="font-semibold">roomNumber</span>.
                          </div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                          <div className="text-xs text-zc-muted">Resource counts</div>
                          <div className="mt-1 text-sm text-zc-text">This page shows resource counts by state per room (AVL/RSV/OCC/CLN/MNT/BLK/INA).</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.10)] p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zc-text">Reminder</div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Patient room / isolation room types require a pricing tier. Isolation requires an isolation type.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void save()} disabled={busy || !branchId}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </span>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
