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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  BedDouble,
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

type RoomRow = {
  id: string;
  unitId: string;
  code: string;
  name: string;
  isActive: boolean;
};

// ✅ Matches your required interface (superset-safe)
export type ResourceType =
  | "GENERAL_BED"
  | "ICU_BED"
  | "NICU_INCUBATOR"
  | "CRIB"
  | "TROLLEY"
  | "STRETCHER"
  | "WHEELCHAIR_POSITION"
  | "OT_TABLE"
  | "DIALYSIS_STATION"
  | "CHEMOTHERAPY_CHAIR"
  | "PROCEDURE_CHAIR"
  | "RECOVERY_BAY"
  | "DENTAL_CHAIR"
  | "XRAY_MACHINE_SLOT"
  | "CT_SCANNER_SLOT"
  | "MRI_SCANNER_SLOT"
  | "USG_MACHINE_SLOT"
  | "ECG_MACHINE_SLOT"
  | "ECHO_MACHINE_SLOT"
  | "SAMPLE_COLLECTION_COUNTER"
  | "CONSULTATION_SLOT"
  | "EXAMINATION_TABLE"
  // legacy (kept to avoid breaking existing data)
  | "BED"
  | "BAY"
  | "CHAIR"
  | "PROCEDURE_TABLE"
  | "EXAM_SLOT"
  | "INCUBATOR";

export type ResourceCategory = "BED" | "PROCEDURE" | "DIAGNOSTIC" | "CONSULTATION" | "OTHER";

export type ResourceState =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RESERVED"
  | "CLEANING"
  | "MAINTENANCE"
  | "BLOCKED"
  | "INACTIVE"
  | "SANITIZATION";

type ResourceRow = {
  id: string;
  branchId: string;
  unitId: string;
  roomId?: string | null;

  code: string;
  name: string;
  assetTag?: string | null;

  resourceType: ResourceType;
  resourceCategory: ResourceCategory;

  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;

  hasMonitor: boolean;
  hasOxygenSupply: boolean;
  hasSuction: boolean;
  hasVentilatorSupport: boolean;
  isPowerRequired: boolean;

  currentState: ResourceState;
  isAvailable: boolean;

  isSchedulable: boolean;
  slotDurationMinutes?: number | null;

  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  warrantyExpiryDate?: string | null;

  isActive: boolean;
  commissionedAt?: string | null;

  reservedReason?: string | null;
  blockedReason?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

/* --------------------------------- Const --------------------------------- */

const RESOURCE_TYPES: ResourceType[] = [
  // Beds
  "GENERAL_BED",
  "ICU_BED",
  "NICU_INCUBATOR",
  "CRIB",
  "TROLLEY",
  "STRETCHER",
  "WHEELCHAIR_POSITION",
  // Procedure
  "OT_TABLE",
  "DIALYSIS_STATION",
  "CHEMOTHERAPY_CHAIR",
  "PROCEDURE_CHAIR",
  "RECOVERY_BAY",
  "DENTAL_CHAIR",
  "EXAMINATION_TABLE",
  // Diagnostic
  "XRAY_MACHINE_SLOT",
  "CT_SCANNER_SLOT",
  "MRI_SCANNER_SLOT",
  "USG_MACHINE_SLOT",
  "ECG_MACHINE_SLOT",
  "ECHO_MACHINE_SLOT",
  "SAMPLE_COLLECTION_COUNTER",
  // Consultation
  "CONSULTATION_SLOT",
  // legacy
  "BED",
  "BAY",
  "CHAIR",
  "PROCEDURE_TABLE",
  "EXAM_SLOT",
  "INCUBATOR",
];

const RESOURCE_STATES: ResourceState[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "CLEANING",
  "SANITIZATION",
  "MAINTENANCE",
  "BLOCKED",
  "INACTIVE",
];

const RESOURCE_CATEGORIES: ResourceCategory[] = ["BED", "PROCEDURE", "DIAGNOSTIC", "CONSULTATION", "OTHER"];

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

function validateResourceCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Resource code is required";
  if (!/^[A-Z0-9][A-Z0-9_-]{1,95}$/.test(v)) {
    return "Code must be 2–96 chars, letters/numbers/underscore/hyphen";
  }
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

function requiresReasonForState(next: ResourceState) {
  return next === "RESERVED" || next === "BLOCKED";
}

function stateIsAvailable(st: ResourceState) {
  return st === "AVAILABLE";
}

function defaultCategoryForType(t: ResourceType): ResourceCategory {
  // map by your PRD semantics
  if (
    t === "GENERAL_BED" ||
    t === "ICU_BED" ||
    t === "NICU_INCUBATOR" ||
    t === "CRIB" ||
    t === "TROLLEY" ||
    t === "STRETCHER" ||
    t === "WHEELCHAIR_POSITION" ||
    t === "BED" ||
    t === "BAY" ||
    t === "INCUBATOR"
  ) {
    return "BED";
  }

  if (
    t === "OT_TABLE" ||
    t === "DIALYSIS_STATION" ||
    t === "CHEMOTHERAPY_CHAIR" ||
    t === "PROCEDURE_CHAIR" ||
    t === "RECOVERY_BAY" ||
    t === "DENTAL_CHAIR" ||
    t === "EXAMINATION_TABLE" ||
    t === "PROCEDURE_TABLE" ||
    t === "CHAIR"
  ) {
    return "PROCEDURE";
  }

  if (
    t === "XRAY_MACHINE_SLOT" ||
    t === "CT_SCANNER_SLOT" ||
    t === "MRI_SCANNER_SLOT" ||
    t === "USG_MACHINE_SLOT" ||
    t === "ECG_MACHINE_SLOT" ||
    t === "ECHO_MACHINE_SLOT" ||
    t === "SAMPLE_COLLECTION_COUNTER"
  ) {
    return "DIAGNOSTIC";
  }

  if (t === "CONSULTATION_SLOT" || t === "EXAM_SLOT") return "CONSULTATION";

  return "OTHER";
}

function dateToInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // yyyy-mm-dd
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inputToIsoDate(value: string) {
  const v = String(value || "").trim();
  if (!v) return null;
  // Interpret as midnight UTC to avoid tz shifting
  return `${v}T00:00:00.000Z`;
}

function normalizeResourceRow(raw: any): ResourceRow {
  const currentState = (raw?.currentState ?? raw?.state ?? "AVAILABLE") as ResourceState;
  const resourceType = (raw?.resourceType ?? "GENERAL_BED") as ResourceType;
  const resourceCategory = (raw?.resourceCategory ?? defaultCategoryForType(resourceType)) as ResourceCategory;

  return {
    id: String(raw?.id ?? ""),
    branchId: String(raw?.branchId ?? ""),
    unitId: String(raw?.unitId ?? ""),
    roomId: raw?.roomId ?? null,

    code: String(raw?.code ?? ""),
    name: String(raw?.name ?? ""),
    assetTag: raw?.assetTag ?? null,

    resourceType,
    resourceCategory,

    manufacturer: raw?.manufacturer ?? null,
    model: raw?.model ?? null,
    serialNumber: raw?.serialNumber ?? null,

    hasMonitor: !!raw?.hasMonitor,
    hasOxygenSupply: !!raw?.hasOxygenSupply,
    hasSuction: !!raw?.hasSuction,
    hasVentilatorSupport: !!raw?.hasVentilatorSupport,
    isPowerRequired: !!raw?.isPowerRequired,

    currentState,
    isAvailable: typeof raw?.isAvailable === "boolean" ? raw.isAvailable : stateIsAvailable(currentState),

    isSchedulable: !!raw?.isSchedulable,
    slotDurationMinutes: raw?.slotDurationMinutes ?? null,

    lastMaintenanceDate: raw?.lastMaintenanceDate ?? null,
    nextMaintenanceDate: raw?.nextMaintenanceDate ?? null,
    warrantyExpiryDate: raw?.warrantyExpiryDate ?? null,

    isActive: !!raw?.isActive,
    commissionedAt: raw?.commissionedAt ?? null,

    reservedReason: raw?.reservedReason ?? null,
    blockedReason: raw?.blockedReason ?? null,

    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

/* ---------------------------------- Page ---------------------------------- */

export default function ResourcesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();

  const { isReady, branchId, scope, reason } = useBranchContext();

  const qpUnitId = sp.get("unitId") || null;
  const qpRoomId = sp.get("roomId") || null;

  const [branch, setBranch] = React.useState<BranchRow | null>(null);

  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [unitId, setUnitId] = React.useState<string>("");

  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [rows, setRows] = React.useState<ResourceRow[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [filterRoomId, setFilterRoomId] = React.useState<string>("ALL");
  const [filterState, setFilterState] = React.useState<string>("ALL");
  const [filterType, setFilterType] = React.useState<string>("ALL");

  // Editor
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ResourceRow | null>(null);
  const [tab, setTab] = React.useState<"basic" | "rules">("basic");
  const [modalErr, setModalErr] = React.useState<string | null>(null);

  const [formUnitId, setFormUnitId] = React.useState<string>("");
  const [formRoomId, setFormRoomId] = React.useState<string>(""); // optional; required if usesRooms (non-mobile)
  const [formType, setFormType] = React.useState<ResourceType>("GENERAL_BED");
  const [formCategory, setFormCategory] = React.useState<ResourceCategory>("BED");
  const [formCode, setFormCode] = React.useState<string>("");
  const [formName, setFormName] = React.useState<string>("");
  const [formAssetTag, setFormAssetTag] = React.useState<string>("");

  // Specs
  const [formManufacturer, setFormManufacturer] = React.useState<string>("");
  const [formModel, setFormModel] = React.useState<string>("");
  const [formSerialNumber, setFormSerialNumber] = React.useState<string>("");

  // Capabilities
  const [formHasMonitor, setFormHasMonitor] = React.useState<boolean>(false);
  const [formHasOxygenSupply, setFormHasOxygenSupply] = React.useState<boolean>(false);
  const [formHasSuction, setFormHasSuction] = React.useState<boolean>(false);
  const [formHasVentilatorSupport, setFormHasVentilatorSupport] = React.useState<boolean>(false);
  const [formIsPowerRequired, setFormIsPowerRequired] = React.useState<boolean>(false);

  // Scheduling + status
  const [formActive, setFormActive] = React.useState<boolean>(true);
  const [formSchedulable, setFormSchedulable] = React.useState<boolean>(false);
  const [formSlotDuration, setFormSlotDuration] = React.useState<string>("");

  // Create-only initial state
  const [formInitialState, setFormInitialState] = React.useState<ResourceState>("AVAILABLE");
  const [formInitialStateReason, setFormInitialStateReason] = React.useState<string>("");

  // Maintenance
  const [formLastMaintenanceDate, setFormLastMaintenanceDate] = React.useState<string>("");
  const [formNextMaintenanceDate, setFormNextMaintenanceDate] = React.useState<string>("");
  const [formWarrantyExpiryDate, setFormWarrantyExpiryDate] = React.useState<string>("");

  // Commissioning
  const [formCommissionedAt, setFormCommissionedAt] = React.useState<string>("");

  // State reason dialog
  const [stateDlgOpen, setStateDlgOpen] = React.useState(false);
  const [stateDlgResource, setStateDlgResource] = React.useState<ResourceRow | null>(null);
  const [stateDlgNext, setStateDlgNext] = React.useState<ResourceState>("AVAILABLE");
  const [stateDlgReason, setStateDlgReason] = React.useState<string>("");

  // Deactivate reason dialog
  const [deactDlgOpen, setDeactDlgOpen] = React.useState(false);
  const [deactDlgResource, setDeactDlgResource] = React.useState<ResourceRow | null>(null);
  const [deactReason, setDeactReason] = React.useState<string>("");

  const selectedUnit = React.useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId]);

  const roomsMap = React.useMemo(() => {
    const m = new Map<string, RoomRow>();
    for (const r of rooms) m.set(r.id, r);
    return m;
  }, [rooms]);

  const filteredRows = React.useMemo(() => {
    let out = rows.slice();

    const v = String(q || "").trim().toLowerCase();
    if (v) {
      out = out.filter((r) => r.code.toLowerCase().includes(v) || r.name.toLowerCase().includes(v));
    }
    if (filterRoomId !== "ALL") out = out.filter((r) => (r.roomId || "") === filterRoomId);
    if (filterState !== "ALL") out = out.filter((r) => r.currentState === (filterState as ResourceState));
    if (filterType !== "ALL") out = out.filter((r) => r.resourceType === (filterType as ResourceType));

    return out;
  }, [rows, q, filterRoomId, filterState, filterType]);

  const totals = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;

    const byState: Record<ResourceState, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      SANITIZATION: 0,
      MAINTENANCE: 0,
      BLOCKED: 0,
      INACTIVE: 0,
    };

    for (const r of rows) byState[r.currentState] = (byState[r.currentState] || 0) + 1;

    return { total, active, byState };
  }, [rows]);

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
      `/api/infrastructure/rooms?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=true`,
      { showLoader: false },
    );
    setRooms(Array.isArray(list) ? list : []);
  }

  async function loadResources(nextUnitId: string) {
    const list = await apiFetch<any[]>(
      `/api/infrastructure/resources?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=${includeInactive ? "true" : "false"}&q=${encodeURIComponent(String(q || ""))}`,
      { showLoader: false },
    );
    setRows(Array.isArray(list) ? list.map(normalizeResourceRow) : []);
  }

  async function refreshAll() {
    if (!branchId) {
      setBranch(null);
      setUnits([]);
      setUnitId("");
      setRooms([]);
      setRows([]);
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

      if (!nextUnitId && u.length) nextUnitId = u[0].id;

      setUnitId(nextUnitId);

      if (nextUnitId) {
        await Promise.all([loadRooms(nextUnitId), loadResources(nextUnitId)]);
        if (qpRoomId) setFilterRoomId(qpRoomId);
      } else {
        setRooms([]);
        setRows([]);
      }
    } catch (e: any) {
      const msg =
        e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Failed to load resources";
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
      setLoading(true);
      setErr(null);
      try {
        await Promise.all([loadRooms(unitId), loadResources(unitId)]);
      } catch (e: any) {
        const msg =
          e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Failed to load resources";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, includeInactive]);

  function openCreate() {
    setEditing(null);
    setTab("basic");
    setModalErr(null);

    const defaultUnit = unitId || units[0]?.id || "";
    setFormUnitId(defaultUnit);
    setFormRoomId(qpRoomId || "");

    setFormType("GENERAL_BED");
    setFormCategory(defaultCategoryForType("GENERAL_BED"));

    setFormCode("");
    setFormName("");
    setFormAssetTag("");

    setFormManufacturer("");
    setFormModel("");
    setFormSerialNumber("");

    setFormHasMonitor(false);
    setFormHasOxygenSupply(false);
    setFormHasSuction(false);
    setFormHasVentilatorSupport(false);
    setFormIsPowerRequired(false);

    setFormActive(true);
    setFormSchedulable(false);
    setFormSlotDuration("");

    setFormInitialState("AVAILABLE");
    setFormInitialStateReason("");

    setFormLastMaintenanceDate("");
    setFormNextMaintenanceDate("");
    setFormWarrantyExpiryDate("");

    setFormCommissionedAt("");

    setOpen(true);
  }

  function openEdit(r: ResourceRow) {
    setEditing(r);
    setTab("basic");
    setModalErr(null);

    setFormUnitId(r.unitId);
    setFormRoomId(r.roomId || "");
    setFormType(r.resourceType);
    setFormCategory(r.resourceCategory || defaultCategoryForType(r.resourceType));

    setFormCode(r.code);
    setFormName(r.name);
    setFormAssetTag(r.assetTag ? String(r.assetTag) : "");

    setFormManufacturer(r.manufacturer ? String(r.manufacturer) : "");
    setFormModel(r.model ? String(r.model) : "");
    setFormSerialNumber(r.serialNumber ? String(r.serialNumber) : "");

    setFormHasMonitor(!!r.hasMonitor);
    setFormHasOxygenSupply(!!r.hasOxygenSupply);
    setFormHasSuction(!!r.hasSuction);
    setFormHasVentilatorSupport(!!r.hasVentilatorSupport);
    setFormIsPowerRequired(!!r.isPowerRequired);

    setFormActive(r.isActive);
    setFormSchedulable(r.isSchedulable);
    setFormSlotDuration(r.slotDurationMinutes != null ? String(r.slotDurationMinutes) : "");

    setFormInitialState(r.currentState);
    setFormInitialStateReason("");

    setFormLastMaintenanceDate(dateToInput(r.lastMaintenanceDate));
    setFormNextMaintenanceDate(dateToInput(r.nextMaintenanceDate));
    setFormWarrantyExpiryDate(dateToInput(r.warrantyExpiryDate));
    setFormCommissionedAt(dateToInput(r.commissionedAt));

    setOpen(true);
  }

  async function save() {
    if (!branchId) return;
    setBusy(true);
    setModalErr(null);

    try {
      const name = String(formName || "").trim();
      if (!formUnitId) throw new Error("Unit is required");
      if (!name) throw new Error("Resource name is required");

      const u = units.find((x) => x.id === formUnitId) || null;
      if (!u) throw new Error("Unit not found");
      if (!u.isActive && (editing ? false : formActive)) {
        throw new Error("Unit is inactive");
      }

      const usesRooms = !!u.usesRooms;

      // Room association rules: if unit uses rooms, room required unless it's clearly mobile
      const isMobile =
        formType === "TROLLEY" ||
        formType === "STRETCHER" ||
        formType === "WHEELCHAIR_POSITION" ||
        formType === "CHAIR";

      let nextRoomId: string | null = null;
      if (usesRooms) {
        if (!formRoomId && !isMobile) throw new Error("Room is required for this unit (usesRooms=true).");
        if (formRoomId) {
          const room = roomsMap.get(formRoomId);
          if (!room) throw new Error("Room not found");
          if (!room.isActive && (editing ? false : formActive)) throw new Error("Room is inactive");
          nextRoomId = formRoomId;
        } else {
          nextRoomId = null;
        }
      } else {
        // open-bay: room must be null
        nextRoomId = null;
      }

      const assetTag = String(formAssetTag || "").trim() || null;
      const manufacturer = String(formManufacturer || "").trim() || null;
      const model = String(formModel || "").trim() || null;
      const serialNumber = String(formSerialNumber || "").trim() || null;

      const slotDurationMinutes = formSchedulable
        ? (() => {
          const n = Number(String(formSlotDuration || "").trim());
          if (!Number.isFinite(n) || n <= 0) return null;
          return Math.floor(n);
        })()
        : null;

      const lastMaintenanceDate = inputToIsoDate(formLastMaintenanceDate);
      const nextMaintenanceDate = inputToIsoDate(formNextMaintenanceDate);
      const warrantyExpiryDate = inputToIsoDate(formWarrantyExpiryDate);
      const commissionedAt = inputToIsoDate(formCommissionedAt);

      const category = formCategory || defaultCategoryForType(formType);

      if (!editing) {
        const codeErr = validateResourceCode(formCode);
        if (codeErr) throw new Error(codeErr);

        const initialState = formActive ? formInitialState : ("INACTIVE" as ResourceState);
        const initialReason = String(formInitialStateReason || "").trim() || undefined;

        if (requiresReasonForState(initialState) && !initialReason) {
          throw new Error(`Reason is required when initial state is ${initialState}`);
        }

        await apiFetch(`/api/infrastructure/resources`, {
          method: "POST",
          body: {
            unitId: formUnitId,
            roomId: nextRoomId,
            resourceType: formType,
            resourceCategory: category,
            code: normalizeCode(formCode),
            name,
            assetTag,

            manufacturer,
            model,
            serialNumber,

            hasMonitor: !!formHasMonitor,
            hasOxygenSupply: !!formHasOxygenSupply,
            hasSuction: !!formHasSuction,
            hasVentilatorSupport: !!formHasVentilatorSupport,
            isPowerRequired: !!formIsPowerRequired,

            isActive: !!formActive,
            isSchedulable: !!formSchedulable,
            slotDurationMinutes,

            state: initialState,
            reason: initialReason,

            lastMaintenanceDate,
            nextMaintenanceDate,
            warrantyExpiryDate,
            commissionedAt,
          },
        });

        toast({ title: "Resource created", description: "Resource has been created successfully." });
        setUnitId(formUnitId);
      } else {
        // Deactivation requires reason via dedicated endpoint. Keep modal Active switch read-only for edit.
        await apiFetch(`/api/infrastructure/resources/${editing.id}`, {
          method: "PATCH",
          body: {
            name,
            assetTag,
            resourceCategory: category,

            manufacturer,
            model,
            serialNumber,

            hasMonitor: !!formHasMonitor,
            hasOxygenSupply: !!formHasOxygenSupply,
            hasSuction: !!formHasSuction,
            hasVentilatorSupport: !!formHasVentilatorSupport,
            isPowerRequired: !!formIsPowerRequired,

            isSchedulable: !!formSchedulable,
            slotDurationMinutes,

            lastMaintenanceDate,
            nextMaintenanceDate,
            warrantyExpiryDate,
            commissionedAt,

            // allow re-activation only; deactivation is via dedicated dialog/button
            isActive: formActive === true ? true : undefined,
          },
        });

        toast({ title: "Resource updated", description: "Resource has been updated successfully." });
      }

      setOpen(false);
      await loadResources(formUnitId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Save failed";
      setModalErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function setState(r: ResourceRow, next: ResourceState, reason?: string) {
    if (!branchId) return;
    setBusy(true);
    setErr(null);

    try {
      await apiFetch(`/api/infrastructure/resources/${r.id}/state`, {
        method: "POST",
        body: { state: next, reason: reason || undefined },
      });
      toast({ title: "State updated", description: `${r.code} → ${next}` });
      await loadResources(unitId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "State update failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  function requestStateChange(r: ResourceRow, next: ResourceState) {
    if (next === r.currentState) return;

    if (requiresReasonForState(next)) {
      setStateDlgResource(r);
      setStateDlgNext(next);
      setStateDlgReason("");
      setStateDlgOpen(true);
      return;
    }

    void setState(r, next);
  }

  async function toggleActive(r: ResourceRow) {
    if (!branchId) return;

    if (r.isActive) {
      setDeactDlgResource(r);
      setDeactReason("");
      setDeactDlgOpen(true);
      return;
    }

    // Reactivate
    setBusy(true);
    setErr(null);

    try {
      await apiFetch(`/api/infrastructure/resources/${r.id}`, { method: "PATCH", body: { isActive: true } });
      toast({ title: "Resource activated", description: "Resource is active again." });
      await loadResources(unitId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Update failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeactivate() {
    if (!branchId) return;
    if (!deactDlgResource) return;

    const reasonText = String(deactReason || "").trim();
    if (!reasonText) {
      toast({
        title: "Reason required",
        description: "Please provide a deactivation reason.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      await apiFetch(`/api/infrastructure/resources/${deactDlgResource.id}/deactivate`, {
        method: "POST",
        body: { reason: reasonText, hard: false },
      });
      toast({ title: "Resource deactivated", description: "Resource marked inactive." });
      setDeactDlgOpen(false);
      setDeactDlgResource(null);
      setDeactReason("");
      await loadResources(unitId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Update failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Resources">
      <RequirePerm perm="INFRA_RESOURCE_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconBuilding className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Resources</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure unit resources (beds/procedure/diagnostic/slots). Includes room mapping and a resource state machine.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage resources."}
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
                New Resource
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Pick a unit, then search/filter resources.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Resources</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totals.total}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{totals.active}</span> | Inactive:{" "}
                    <span className="font-semibold tabular-nums">{totals.total - totals.active}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">By State</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RESOURCE_STATES.map((s) => (
                      <Badge
                        key={s}
                        className="bg-emerald-600/10 text-emerald-800 dark:text-emerald-200"
                        variant="secondary"
                      >
                        {s}: <span className="ml-1 font-semibold tabular-nums">{totals.byState[s] || 0}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Selected Unit</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                    {selectedUnit ? selectedUnit.code : "—"}
                  </div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                    {selectedUnit ? selectedUnit.name : "Pick a unit to view resources."}
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
                    placeholder="Search by code or name..."
                    className="pl-10"
                    disabled={!branchId}
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span> resources
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

                {selectedUnit?.usesRooms ? (
                  <div className="min-w-[260px]">
                    <Label className="text-xs text-zc-muted">Room</Label>
                    <Select value={filterRoomId} onValueChange={setFilterRoomId} disabled={!branchId || !unitId}>
                      <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[340px] overflow-y-auto">
                        <SelectItem value="ALL">All</SelectItem>
                        {rooms
                          .filter((r) => r.unitId === unitId)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} <span className="font-mono text-xs text-zc-muted">({r.code})</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="min-w-[220px]">
                  <Label className="text-xs text-zc-muted">State</Label>
                  <Select value={filterState} onValueChange={setFilterState} disabled={!branchId || !unitId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {RESOURCE_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[220px]">
                  <Label className="text-xs text-zc-muted">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType} disabled={!branchId || !unitId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[340px] overflow-y-auto">
                      <SelectItem value="ALL">All</SelectItem>
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
                    setFilterRoomId("ALL");
                    setFilterState("ALL");
                    setFilterType("ALL");
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

                {err ? (
                  <div className="w-full flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="min-w-0">{err}</div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Resource Directory</CardTitle>
                  <CardDescription className="text-sm">
                    {selectedUnit ? (
                      <>
                        Resources for unit <span className="font-semibold">{selectedUnit.name}</span>{" "}
                        <span className="font-mono text-xs text-zc-muted">({selectedUnit.code})</span>
                      </>
                    ) : (
                      "Select a unit to view resources."
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
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Resource</th>
                    <th className="px-4 py-3 text-left font-semibold">Room</th>
                    <th className="px-4 py-3 text-left font-semibold">State</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Schedulable</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!unitId ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10">
                        <div className="text-sm text-zc-muted">Select a unit to view resources.</div>
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10">
                        <div className="flex items-center gap-3 text-sm text-zc-muted">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading resources…
                        </div>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10">
                        <div className="text-sm text-zc-muted">No resources found.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const room = r.roomId ? roomsMap.get(r.roomId) : null;

                      return (
                        <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/10">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-zc-text">{r.resourceType}</span>
                          </td>

                          <td className="px-4 py-3 font-mono text-xs text-zc-text">{r.code}</td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-zc-text">{r.name}</div>
                            <div className="text-xs text-zc-muted">
                              {r.assetTag ? (
                                <>
                                  Asset: <span className="font-mono">{r.assetTag}</span> •{" "}
                                </>
                              ) : null}
                              ID: {r.id.slice(0, 8)}…
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {selectedUnit?.usesRooms ? (
                              room ? (
                                <div>
                                  <div className="text-sm text-zc-text">{room.name}</div>
                                  <div className="font-mono text-xs text-zc-muted">{room.code}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-zc-muted">—</span>
                              )
                            ) : (
                              <span className="text-sm text-zc-muted">Open-bay</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <Select
                              value={r.currentState}
                              onValueChange={(v) => requestStateChange(r, v as ResourceState)}
                              disabled={!branchId || busy || !unitId || !r.isActive}
                            >
                              <SelectTrigger className="h-9 w-[170px] rounded-xl border-zc-border bg-zc-card">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESOURCE_STATES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {r.currentState === "RESERVED" && r.reservedReason ? (
                              <div className="mt-1 text-[11px] text-zc-muted line-clamp-1">Reason: {r.reservedReason}</div>
                            ) : null}
                            {r.currentState === "BLOCKED" && r.blockedReason ? (
                              <div className="mt-1 text-[11px] text-zc-muted line-clamp-1">Reason: {r.blockedReason}</div>
                            ) : null}
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

                          <td className="px-4 py-3">
                            {r.isSchedulable ? <Badge className="bg-sky-600 text-white">YES</Badge> : <Badge variant="secondary">NO</Badge>}
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">{fmtDateTime(r.updatedAt)}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {selectedUnit?.usesRooms && r.roomId ? (
                                <Button
                                  asChild
                                  variant="success"
                                  size="icon"
                                  title="Go to Room"
                                  aria-label="Go to Room"
                                  disabled={!branchId || busy}
                                >
                                  <Link href={`/infrastructure/resources/${encodeURIComponent(r.id)}`}>
                                    <IconChevronRight className="h-4 w-4" />
                                  </Link>

                                </Button>
                              ) : null}

                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => openEdit(r)}
                                title="Edit resource"
                                aria-label="Edit resource"
                                disabled={!branchId || busy}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant={r.isActive ? "secondary" : "success"}
                                size="icon"
                                onClick={() => void toggleActive(r)}
                                title={r.isActive ? "Deactivate resource" : "Activate resource"}
                                aria-label={r.isActive ? "Deactivate resource" : "Activate resource"}
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

          {/* State Reason Dialog */}
          <Dialog open={stateDlgOpen} onOpenChange={(v) => (busy ? null : setStateDlgOpen(v))}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>State change requires a reason</DialogTitle>
                <DialogDescription>
                  {stateDlgResource ? (
                    <>
                      {stateDlgResource.code} → <span className="font-semibold">{stateDlgNext}</span>
                    </>
                  ) : (
                    "Provide a reason to continue."
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={stateDlgReason} onChange={(e) => setStateDlgReason(e.target.value)} placeholder="Enter reason..." />
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (busy) return;
                    setStateDlgOpen(false);
                    setStateDlgResource(null);
                    setStateDlgReason("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!stateDlgResource) return;
                    const rr = String(stateDlgReason || "").trim();
                    if (!rr) {
                      toast({ title: "Reason required", description: "Please provide a reason.", variant: "destructive" });
                      return;
                    }
                    setStateDlgOpen(false);
                    void setState(stateDlgResource, stateDlgNext, rr);
                    setStateDlgResource(null);
                    setStateDlgReason("");
                  }}
                  disabled={busy}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Deactivate Dialog */}
          <Dialog open={deactDlgOpen} onOpenChange={(v) => (busy ? null : setDeactDlgOpen(v))}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Deactivate resource</DialogTitle>
                <DialogDescription>
                  Deactivation requires a reason (audit + governance). This will set state to INACTIVE and remove it from default lists.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={deactReason} onChange={(e) => setDeactReason(e.target.value)} placeholder="Enter reason..." />
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (busy) return;
                    setDeactDlgOpen(false);
                    setDeactDlgResource(null);
                    setDeactReason("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void confirmDeactivate()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Deactivating…
                    </span>
                  ) : (
                    "Deactivate"
                  )}
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
                    <BedDouble className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {editing ? "Edit Resource" : "Create Resource"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update resource attributes, capabilities, scheduling and maintenance. Unit/type/code/room remain stable."
                    : "Create a resource under the unit. For usesRooms units, room assignment is required unless the resource is mobile."}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Unit</Label>
                        <Select value={formUnitId || "NONE"} onValueChange={(v) => setFormUnitId(v === "NONE" ? "" : v)} disabled={!!editing}>
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

                      <div className="grid gap-2">
                        <Label>Resource Type</Label>
                        <Select
                          value={formType}
                          onValueChange={(v) => {
                            const next = v as ResourceType;
                            setFormType(next);
                            // auto-suggest category
                            const auto = defaultCategoryForType(next);
                            setFormCategory(auto);
                          }}
                          disabled={!!editing}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[340px] overflow-y-auto">
                            {RESOURCE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editing ? <p className="text-[11px] text-zc-muted">Type cannot be changed after creation.</p> : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Resource Category</Label>
                        <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ResourceCategory)}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOURCE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-zc-muted">Category is used for reporting and scheduling policies.</p>
                      </div>

                      <div className="grid gap-2">
                        <Label>Asset Tag (optional)</Label>
                        <Input
                          value={formAssetTag}
                          onChange={(e) => setFormAssetTag(e.target.value)}
                          placeholder="e.g. TAG-000123"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    {(units.find((x) => x.id === formUnitId)?.usesRooms ?? false) ? (
                      <div className="grid gap-2">
                        <Label>Room</Label>
                        <Select
                          value={formRoomId || "NONE"}
                          onValueChange={(v) => setFormRoomId(v === "NONE" ? "" : v)}
                          disabled={!!editing ? true : false}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder="Select room…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[340px] overflow-y-auto">
                            <SelectItem value="NONE">Select room…</SelectItem>
                            {rooms
                              .filter((r) => r.unitId === formUnitId)
                              .map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name} <span className="font-mono text-xs text-zc-muted">({r.code})</span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {editing ? <p className="text-[11px] text-zc-muted">Room mapping is immutable after creation.</p> : null}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Resource Code</Label>
                        <Input
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                          placeholder='e.g. BED-ICU-A-101-1'
                          className={cn(
                            "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                            editing && "opacity-80",
                          )}
                          disabled={!!editing}
                        />
                        <p className="text-[11px] text-zc-muted">Code is stable. Editing is disabled after creation.</p>
                      </div>

                      <div className="grid gap-2">
                        <Label>Resource Name</Label>
                        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Bed 01" />
                      </div>
                    </div>

                    {!editing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Initial State</Label>
                          <Select value={formInitialState} onValueChange={(v) => setFormInitialState(v as ResourceState)}>
                            <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOURCE_STATES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-zc-muted">Use RESERVED/BLOCKED only when you have a reason.</p>
                        </div>

                        {requiresReasonForState(formInitialState) ? (
                          <div className="grid gap-2">
                            <Label>Reason</Label>
                            <Input
                              value={formInitialStateReason}
                              onChange={(e) => setFormInitialStateReason(e.target.value)}
                              placeholder="Reason for RESERVED/BLOCKED"
                            />
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <Label>Reason</Label>
                            <Input value={formInitialStateReason} disabled placeholder="Not required" />
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-zc-text">Active</div>
                          <div className="text-xs text-zc-muted">
                            {editing ? "Deactivate from table actions (reason required)." : "Inactive resources are excluded by default."}
                          </div>
                        </div>
                        <Switch checked={formActive} onCheckedChange={setFormActive} disabled={!!editing} />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                          <div className="text-xs text-zc-muted">Used by scheduling logic for slots.</div>
                        </div>
                        <Switch checked={formSchedulable} onCheckedChange={setFormSchedulable} />
                      </div>
                    </div>

                    {formSchedulable ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Slot Duration (minutes)</Label>
                          <Input
                            value={formSlotDuration}
                            onChange={(e) => setFormSlotDuration(e.target.value)}
                            placeholder="e.g. 10, 15, 30"
                            inputMode="numeric"
                          />
                          <p className="text-[11px] text-zc-muted">Optional. Leave empty to let backend defaults apply.</p>
                        </div>
                        <div />
                      </div>
                    ) : null}

                    <Separator />

                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-zc-text">Specifications</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Manufacturer</Label>
                          <Input value={formManufacturer} onChange={(e) => setFormManufacturer(e.target.value)} placeholder="Optional" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Model</Label>
                          <Input value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="Optional" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Serial Number</Label>
                          <Input value={formSerialNumber} onChange={(e) => setFormSerialNumber(e.target.value)} placeholder="Optional" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-zc-text">Capabilities</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Monitor</div>
                            <div className="text-xs text-zc-muted">Has monitor/telemetry</div>
                          </div>
                          <Switch checked={formHasMonitor} onCheckedChange={setFormHasMonitor} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Oxygen Supply</div>
                            <div className="text-xs text-zc-muted">Pipeline/port available</div>
                          </div>
                          <Switch checked={formHasOxygenSupply} onCheckedChange={setFormHasOxygenSupply} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Suction</div>
                            <div className="text-xs text-zc-muted">Suction support available</div>
                          </div>
                          <Switch checked={formHasSuction} onCheckedChange={setFormHasSuction} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Ventilator Support</div>
                            <div className="text-xs text-zc-muted">Ventilator compatible</div>
                          </div>
                          <Switch checked={formHasVentilatorSupport} onCheckedChange={setFormHasVentilatorSupport} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-zc-text">Power Required</div>
                            <div className="text-xs text-zc-muted">Needs power connection</div>
                          </div>
                          <Switch checked={formIsPowerRequired} onCheckedChange={setFormIsPowerRequired} />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-zc-text">Maintenance</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>Last Maintenance</Label>
                          <Input type="date" value={formLastMaintenanceDate} onChange={(e) => setFormLastMaintenanceDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Next Maintenance</Label>
                          <Input type="date" value={formNextMaintenanceDate} onChange={(e) => setFormNextMaintenanceDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Warranty Expiry</Label>
                          <Input type="date" value={formWarrantyExpiryDate} onChange={(e) => setFormWarrantyExpiryDate(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-zc-text">Commissioning</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Commissioned At</Label>
                          <Input type="date" value={formCommissionedAt} onChange={(e) => setFormCommissionedAt(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="mt-4">
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                      <div className="text-sm font-semibold text-zc-text">Resource rules</div>
                      <div className="mt-2 text-sm text-zc-muted">
                        Resources are unique per unit by code. State transitions are enforced by backend (AVAILABLE/RESERVED/OCCUPIED/CLEANING/SANITIZATION/MAINTENANCE/BLOCKED/INACTIVE).
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                          <div className="text-xs text-zc-muted">Room mapping</div>
                          <div className="mt-1 text-sm text-zc-text">
                            For usesRooms units, room assignment is required except for mobile resources (trolley/stretcher/wheelchair etc). For open-bay units, roomId must be null.
                          </div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                          <div className="text-xs text-zc-muted">Reasons</div>
                          <div className="mt-1 text-sm text-zc-text">
                            RESERVED and BLOCKED require a reason (stored as reservedReason/blockedReason). Deactivation also requires a reason.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.10)] p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zc-text">Reminder</div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Scheduling should only allow AVAILABLE resources. If housekeeping gate is enabled, beds cannot move from OCCUPIED to AVAILABLE directly.
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
