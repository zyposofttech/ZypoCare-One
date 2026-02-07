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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  User,
  X,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type FacilityType = "CLINICAL" | "SERVICE" | "SUPPORT";

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type StaffMini = { id: string; name: string; designation?: string | null; empCode?: string | null };

type SpecialtyMini = { id: string; code: string; name: string; kind: string; isActive: boolean };

type LocationNodeFlat = { id: string; type: string; code: string | null; name: string | null };

type DepartmentRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  facilityType: FacilityType;
  costCenterCode?: string | null;
  extensions: string[];
  operatingHours?: any;
  isActive: boolean;
  headStaff?: { id: string; name: string; designation?: string | null } | null;
  specialties: Array<{ specialtyId: string; isPrimary: boolean; specialty: { id: string; code: string; name: string; kind: string; isActive: boolean } }>;
  locations: Array<{
    id: string;
    locationNodeId: string;
    kind: string;
    isPrimary: boolean;
    node: { id: string; kind: string; code: string | null; name: string | null; isActive: boolean };
  }>;
  createdAt: string;
  updatedAt: string;
};

type LocationTreeNode = {
  id: string;
  type: string;
  code: string;
  name: string;
  buildings?: LocationTreeNode[];
  floors?: LocationTreeNode[];
  zones?: LocationTreeNode[];
  areas?: LocationTreeNode[];
};

type LocationTree = { campuses: LocationTreeNode[] };

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type ShiftUI = { start: string; end: string };

const WEEK_DAYS: Array<{ key: Weekday; label: string }> = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

const ALLOWED_LOCATION_TYPES = new Set(["FLOOR", "ZONE", "AREA"]);

function isHHMM(s: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test((s ?? "").trim());
}

function toMinutes(hhmm: string) {
  const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function buildPresetWeekly(id: string): Partial<Record<Weekday, ShiftUI[]>> {
  const one = (start: string, end: string) => [{ start, end }];
  const two = (a: ShiftUI, b: ShiftUI) => [a, b];
  if (id === "MON_FRI_9_5") {
    return { MON: one("09:00", "17:00"), TUE: one("09:00", "17:00"), WED: one("09:00", "17:00"), THU: one("09:00", "17:00"), FRI: one("09:00", "17:00") };
  }
  if (id === "MON_SAT_9_5") {
    return {
      MON: one("09:00", "17:00"),
      TUE: one("09:00", "17:00"),
      WED: one("09:00", "17:00"),
      THU: one("09:00", "17:00"),
      FRI: one("09:00", "17:00"),
      SAT: one("09:00", "17:00"),
    };
  }
  if (id === "ALL_9_9") {
    return {
      MON: one("09:00", "21:00"),
      TUE: one("09:00", "21:00"),
      WED: one("09:00", "21:00"),
      THU: one("09:00", "21:00"),
      FRI: one("09:00", "21:00"),
      SAT: one("09:00", "21:00"),
      SUN: one("09:00", "21:00"),
    };
  }
  if (id === "MON_SAT_TWO_SHIFTS") {
    const shifts = two({ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" });
    return { MON: shifts, TUE: shifts, WED: shifts, THU: shifts, FRI: shifts, SAT: shifts };
  }
  return {};
}

function normalizeWeeklyFromAny(input: any): Partial<Record<Weekday, ShiftUI[]>> {
  const daysSrc = input?.days ?? input?.week ?? input?.weekly ?? null;
  if (!daysSrc || typeof daysSrc !== "object") return {};
  const out: Partial<Record<Weekday, ShiftUI[]>> = {};
  for (const d of WEEK_DAYS.map((x) => x.key)) {
    const raw = (daysSrc as any)[d] ?? (daysSrc as any)[d.toLowerCase()] ?? null;
    if (!raw) continue;
    const arr = Array.isArray(raw) ? raw : [raw];
    const shifts = arr
      .filter(Boolean)
      .map((s: any) => ({ start: String(s.start ?? "").trim(), end: String(s.end ?? "").trim() }))
      .filter((s: ShiftUI) => isHHMM(s.start) && isHHMM(s.end));
    if (shifts.length) out[d] = shifts;
  }
  return out;
}

/* ----------------------------- Helpers ----------------------------- */

const FACILITY_TYPES: FacilityType[] = ["CLINICAL", "SERVICE", "SUPPORT"];

function fmtDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function typeLabel(t: FacilityType) {
  if (t === "CLINICAL") return "Clinical";
  if (t === "SERVICE") return "Service";
  return "Support";
}

function hoursLabel(h: any): string {
  if (!h) return "-";
  if (h.is24x7 || h.mode === "24X7") return "24×7";
  if (h.mode === "WEEKLY" && h.days) return "Weekly";
  if (h.mode === "SHIFT" && (h.start || h.end)) return `${h.start ?? ""}${h.end ? `–${h.end}` : ""}`;
  return "Custom";
}

function flattenLocations(tree: LocationTree | null): LocationNodeFlat[] {
  if (!tree?.campuses?.length) return [];

  const out: LocationNodeFlat[] = [];
  const push = (n: LocationTreeNode) => {
    out.push({ id: n.id, type: n.type, code: n.code ?? null, name: n.name ?? null });
  };

  for (const c of tree.campuses) {
    push(c);
    for (const b of c.buildings ?? []) {
      push(b);
      for (const f of b.floors ?? []) {
        push(f);
        for (const z of f.zones ?? []) {
          push(z);
          for (const a of z.areas ?? []) push(a);
        }
      }
    }
  }
  return out;
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

/* ----------------------------- Page ----------------------------- */

export default function DepartmentsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { scope, branchId, isReady, reason } = useBranchContext();

  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [rows, setRows] = React.useState<DepartmentRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [modalErr, setModalErr] = React.useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] = React.useState<DepartmentRow | null>(null);
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [deactivateErr, setDeactivateErr] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [facilityType, setFacilityType] = React.useState<FacilityType | "ALL">("ALL");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // Editor dialog
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null);

  // Editor form state
  const [formCode, setFormCode] = React.useState("");
  const [formName, setFormName] = React.useState("");
  const [formType, setFormType] = React.useState<FacilityType>("CLINICAL");
  const [formCostCenter, setFormCostCenter] = React.useState<string>("");
  const [formExtensions, setFormExtensions] = React.useState<string>("");
  const [formOperatingMode, setFormOperatingMode] = React.useState<"24X7" | "WEEKLY" | "CUSTOM">("24X7");
  const [formOperatingJson, setFormOperatingJson] = React.useState<string>(JSON.stringify({ mode: "24X7", is24x7: true }, null, 2));
  const [formOperatingTimezone, setFormOperatingTimezone] = React.useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  });
  const [weeklyDays, setWeeklyDays] = React.useState<Partial<Record<Weekday, ShiftUI[]>>>({});
  const [operatingPreset, setOperatingPreset] = React.useState<string>("24X7");
  const [showOperatingAdvanced, setShowOperatingAdvanced] = React.useState<boolean>(false);

  const [locationsTree, setLocationsTree] = React.useState<LocationTree | null>(null);
  const [locationSearch, setLocationSearch] = React.useState("");
  const [pickedLocationIds, setPickedLocationIds] = React.useState<string[]>([]);
  const [primaryLocationId, setPrimaryLocationId] = React.useState<string | null>(null);

  // Specialties (tagged on Department)
  const [specialties, setSpecialties] = React.useState<SpecialtyMini[]>([]);
  const [specLoading, setSpecLoading] = React.useState(false);
  const [specSearch, setSpecSearch] = React.useState("");
  const [pickedSpecialtyIds, setPickedSpecialtyIds] = React.useState<string[]>([]);
  const [primarySpecialtyId, setPrimarySpecialtyId] = React.useState<string | null>(null);

  const [hodSearch, setHodSearch] = React.useState("");
  const [hodResults, setHodResults] = React.useState<StaffMini[]>([]);
  const [hodId, setHodId] = React.useState<string | null>(null);
  const [hodLabel, setHodLabel] = React.useState<string>("");

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.filter((r) => !r.isActive).length;
  const clinicalCount = rows.filter((r) => r.facilityType === "CLINICAL").length;
  const serviceCount = rows.filter((r) => r.facilityType === "SERVICE").length;
  const supportCount = rows.filter((r) => r.facilityType === "SUPPORT").length;
  const nonClinicalCount = serviceCount + supportCount;

  async function loadBranch(bid: string) {
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(bid)}`);
      setBranch(b);
    } catch {
      setBranch(null);
    }
  }

  async function loadDepartments(bid: string) {
    setErr(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("branchId", bid);
      if (facilityType !== "ALL") params.set("facilityType", facilityType);
      if (includeInactive) params.set("includeInactive", "true");
      if (q.trim()) params.set("q", q.trim());

      const data = await apiFetch<DepartmentRow[]>(`/api/departments?${params.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load departments";
      setErr(msg);
      setRows([]);
    } finally {
      setLoading(false);
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

  async function loadSpecialties(bid: string) {
    setSpecLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("branchId", bid);
      // Include inactive so existing mappings (if any) never disappear from the editor
      params.set("includeInactive", "true");
      params.set("includeMappings", "false");

      const list = await apiFetch<SpecialtyMini[]>(`/api/specialties?${params.toString()}`);
      setSpecialties(Array.isArray(list) ? list : []);
    } catch {
      setSpecialties([]);
    } finally {
      setSpecLoading(false);
    }
  }

  async function searchStaff(bid: string, query: string) {
    try {
      const params = new URLSearchParams();
      params.set("branchId", bid);
      if (query.trim()) params.set("q", query.trim());
      const out = await apiFetch<StaffMini[]>(`/api/staff/search?${params.toString()}`);
      setHodResults(Array.isArray(out) ? out : []);
    } catch {
      setHodResults([]);
    }
  }

  const refreshAll = React.useCallback(async () => {
    if (!branchId) return;
    await Promise.all([loadBranch(branchId), loadDepartments(branchId)]);
  }, [branchId, facilityType, includeInactive, q]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    void loadBranch(branchId);
    void loadDepartments(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId, facilityType, includeInactive, q]);

  // Load locations only when editor opens (less network)
  React.useEffect(() => {
    if (!open || !branchId) return;
    void Promise.all([loadLocations(branchId), loadSpecialties(branchId)]);
  }, [open, branchId]);

  // Debounced staff search
  React.useEffect(() => {
    if (!open || !branchId) return;
    const t = setTimeout(() => void searchStaff(branchId, hodSearch), 250);
    return () => clearTimeout(t);
  }, [open, branchId, hodSearch]);

  React.useEffect(() => {
    if (open) setModalErr(null);
  }, [open, editing]);

  function openCreate() {
    setEditing(null);
    setFormCode("");
    setFormName("");
    setFormType("CLINICAL");
    setFormCostCenter("");
    setFormExtensions("");
    setFormOperatingMode("24X7");
    setFormOperatingJson(JSON.stringify({ mode: "24X7", is24x7: true }, null, 2));
    setWeeklyDays({});
    setOperatingPreset("24X7");
    setShowOperatingAdvanced(false);

    setPickedLocationIds([]);
    setPrimaryLocationId(null);

    setSpecSearch("");
    setPickedSpecialtyIds([]);
    setPrimarySpecialtyId(null);

    setHodSearch("");
    setHodResults([]);
    setHodId(null);
    setHodLabel("");

    setOpen(true);
  }

  async function openEdit(r: DepartmentRow) {
    if (!branchId) {
      toast({ title: "Select branch", description: "Select an active branch first.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      let full: DepartmentRow = r;
      // Some list endpoints may not return nested specialties/locations; fetch detail defensively.
      if (!Array.isArray((r as any)?.specialties) || !Array.isArray((r as any)?.locations)) {
        try {
          const params = new URLSearchParams();
          params.set("branchId", branchId);
          full = await apiFetch<DepartmentRow>(`/api/departments/${encodeURIComponent(r.id)}?${params.toString()}`);
        } catch {
          // fall back to the row we have
          full = r;
        }
      }

      setEditing(full);
      setFormCode(full.code);
      setFormName(full.name);
      setFormType(full.facilityType);
      setFormCostCenter(full.costCenterCode ?? "");
      setFormExtensions((full.extensions ?? []).join(", "));

      const oh = full.operatingHours ?? { mode: "24X7", is24x7: true };
      const mode: "24X7" | "WEEKLY" | "CUSTOM" =
        oh.is24x7 || oh.mode === "24X7" ? "24X7" : oh.mode === "WEEKLY" || oh.days || oh.week || oh.weekly ? "WEEKLY" : "CUSTOM";
      setFormOperatingMode(mode);
      setFormOperatingJson(JSON.stringify(oh, null, 2));
      setWeeklyDays(mode === "WEEKLY" ? normalizeWeeklyFromAny(oh) : {});
      setOperatingPreset(mode === "24X7" ? "24X7" : "CUSTOM");
      setShowOperatingAdvanced(mode === "CUSTOM");

      // Locations: enforce allowed levels (FLOOR/ZONE/AREA). If legacy data has CAMPUS/BUILDING, strip them.
      const locAll = (full.locations ?? []).map((x) => x.locationNodeId);
      const locAllowed = (full.locations ?? [])
        .filter((x) => ALLOWED_LOCATION_TYPES.has(String(x.node?.kind ?? x.kind ?? "")))
        .map((x) => x.locationNodeId);

      if (locAll.length !== locAllowed.length) {
        // toast({
        //   title: "Location levels adjusted",
        //   description: "CAMPUS/BUILDING cannot be assigned to departments. Those were removed from the selection.",
        //   duration: 2200,
        // });
      }

      setPickedLocationIds(locAllowed);
      let primary =
        (full.locations ?? []).find((x) => x.isPrimary && ALLOWED_LOCATION_TYPES.has(String(x.node?.kind ?? x.kind ?? "")))?.locationNodeId ?? null;
      if (primary && !locAllowed.includes(primary)) primary = locAllowed[0] ?? null;
      if (!primary && locAllowed.length) primary = locAllowed[0];
      setPrimaryLocationId(primary);

      const hod = full.headStaff ?? null;
      setHodId(hod?.id ?? null);
      setHodLabel(hod ? `${hod.name}${hod.designation ? ` — ${hod.designation}` : ""}` : "");
      setHodSearch(hod?.name ?? "");

      let specIds = (full.specialties ?? []).map((x) => x.specialtyId);
      let primarySpec = (full.specialties ?? []).find((x) => x.isPrimary)?.specialtyId ?? null;
      // If specialties were not included in the list/detail payload, try the specialties endpoint (GET) as a fallback.
      if (specIds.length === 0 && full.facilityType === "CLINICAL") {
        try {
          const s = await apiFetch<any>(`/api/departments/${encodeURIComponent(full.id)}/specialties?branchId=${encodeURIComponent(branchId)}`);
          if (Array.isArray(s)) {
            specIds = s.map((x: any) => x.specialtyId ?? x.specialty?.id ?? x.id).filter(Boolean);
            primarySpec = (s.find((x: any) => x.isPrimary)?.specialtyId ?? s.find((x: any) => x.isPrimary)?.specialty?.id ?? null) as any;
          }
        } catch {
          // ignore
        }
      }
      setPickedSpecialtyIds(specIds);
      setPrimarySpecialtyId(primarySpec || specIds[0] || null);
      setSpecSearch("");

      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  function togglePickLocation(id: string) {
    // Block selecting invalid levels (but allow un-picking legacy invalid selections)
    const nodeType = flatLocations.find((x) => x.id === id)?.type;
    const alreadyPicked = pickedLocationIds.includes(id);
    if (!alreadyPicked && !ALLOWED_LOCATION_TYPES.has(String(nodeType ?? ""))) {
      toast({
        title: "Invalid location level",
        description: "Department location must be FLOOR/ZONE/AREA.",
        variant: "destructive",
      });
      return;
    }

    setPickedLocationIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // keep primary valid
      if (primaryLocationId && !next.includes(primaryLocationId)) setPrimaryLocationId(next[0] ?? null);
      if (!primaryLocationId && next.length) setPrimaryLocationId(next[0]);
      return next;
    });
  }

  function togglePickSpecialty(id: string) {
    setPickedSpecialtyIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // keep primary valid
      if (primarySpecialtyId && !next.includes(primarySpecialtyId)) setPrimarySpecialtyId(next[0] ?? null);
      if (!primarySpecialtyId && next.length) setPrimarySpecialtyId(next[0]);
      return next;
    });
  }

  function resolveOperatingHours(): any {
    if (formOperatingMode === "24X7") {
      return { mode: "24X7", is24x7: true, timezone: formOperatingTimezone };
    }

    if (formOperatingMode === "WEEKLY") {
      const days: any = {};
      for (const d of WEEK_DAYS.map((x) => x.key)) {
        const shifts = weeklyDays[d] ?? [];
        if (!Array.isArray(shifts) || shifts.length === 0) continue;
        // validate and normalize
        const normalized = shifts.map((s) => ({ start: String(s.start ?? "").trim(), end: String(s.end ?? "").trim() }));

        for (const [i, s] of normalized.entries()) {
          if (!isHHMM(s.start) || !isHHMM(s.end)) throw new Error(`Invalid time format for ${d} shift #${i + 1}. Use HH:MM.`);
          const sm = toMinutes(s.start);
          const em = toMinutes(s.end);
          if (sm == null || em == null) throw new Error(`Invalid time format for ${d} shift #${i + 1}. Use HH:MM.`);
          if (sm >= em) throw new Error(`${d} shift #${i + 1}: start time must be before end time.`);
        }

        // no overlap
        for (let i = 0; i < normalized.length; i++) {
          for (let j = i + 1; j < normalized.length; j++) {
            const aS = toMinutes(normalized[i].start)!;
            const aE = toMinutes(normalized[i].end)!;
            const bS = toMinutes(normalized[j].start)!;
            const bE = toMinutes(normalized[j].end)!;
            const overlaps = aS < bE && bS < aE;
            if (overlaps) throw new Error(`${d}: multiple shifts cannot overlap.`);
          }
        }

        days[d] = normalized;
      }

      const anyShift = Object.values(days).some((arr: any) => Array.isArray(arr) && arr.length > 0);
      if (!anyShift) throw new Error("If not 24x7, at least one day must have operating hours.");

      return { mode: "WEEKLY", is24x7: false, timezone: formOperatingTimezone, days };
    }

    // Advanced JSON (optional)
    try {
      const parsed = JSON.parse(formOperatingJson || "{}") as any;
      if (!parsed || typeof parsed !== "object") throw new Error("Operating hours must be an object");
      return parsed;
    } catch {
      throw new Error("Operating hours must be valid JSON");
    }
  }

  async function saveDepartment() {
    if (!branchId) {
      setModalErr("Select a branch first.");
      return;
    }
    setModalErr(null);
    const code = formCode.trim().toUpperCase();
    const name = formName.trim();

    if (!editing && !code) {
      setModalErr("Department code is required.");
      return;
    }
    if (!name) {
      setModalErr("Department name is required.");
      return;
    }

    const extensions = formExtensions
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    let operatingHours: any = undefined;
    try {
      operatingHours = resolveOperatingHours();
    } catch (e: any) {
      setModalErr(e?.message ?? "Operating hours is invalid.");
      return;
    }

    // Location rules (required)
    if (!pickedLocationIds.length) {
      setModalErr("Department must have a physical location assigned.");
      return;
    }
    if (!primaryLocationId) {
      setModalErr("Select a primary location.");
      return;
    }
    // Block invalid levels per business rules
    const invalidLocId = pickedLocationIds.find((id) => {
      const t = flatLocations.find((x) => x.id === id)?.type;
      return !ALLOWED_LOCATION_TYPES.has(String(t ?? ""));
    });
    if (invalidLocId) {
      setModalErr("Department location must be FLOOR/ZONE/AREA.");
      return;
    }

    if (primaryLocationId && !pickedLocationIds.includes(primaryLocationId)) {
      setModalErr("Primary location must be selected in locations.");
      return;
    }

    if (primarySpecialtyId && !pickedSpecialtyIds.includes(primarySpecialtyId)) {
      setModalErr("Primary specialty must be selected in specialties.");
      return;
    }

    // Specialty rules
    if (formType === "CLINICAL" && pickedSpecialtyIds.length === 0) {
      setModalErr("Clinical department must have at least one specialty.");
      return;
    }
    if (pickedSpecialtyIds.length > 0 && !primarySpecialtyId) {
      setModalErr("Select a primary specialty.");
      return;
    }

    const primarySpecId = pickedSpecialtyIds.length ? (primarySpecialtyId ?? pickedSpecialtyIds[0]) : null;

    const payload: any = {
      branchId,
      facilityType: formType,
      name,
      costCenterCode: formCostCenter.trim() ? formCostCenter.trim() : undefined,
      extensions,
      operatingHours,
      locationNodeIds: pickedLocationIds,
      primaryLocationNodeId: primaryLocationId,
      headStaffId: hodId ?? null,
      isActive: true,
    };
    if (!editing && formType === "CLINICAL") {
      // Create payload must include specialties for clinical departments (backend requirement)
      payload.specialtyIds = pickedSpecialtyIds;
      payload.primarySpecialtyId = primarySpecId;
    }

    if (!editing) payload.code = code;

    setBusy(true);
    try {
      let departmentId: string | null = editing?.id ?? null;
      if (editing) {
        await apiFetch(`/api/departments/${encodeURIComponent(editing.id)}`, { method: "PATCH", body: payload });
        toast({ title: "Department updated", description: "Changes saved successfully.", duration: 1600 });
      } else {
        const created = await apiFetch<DepartmentRow>(`/api/departments`, { method: "POST", body: payload });
        departmentId = created?.id ?? null;
        toast({ title: "Department created", description: "Department added successfully.", duration: 1600 });
      }

      // Specialty tagging lives on Department
      if (departmentId) {
        await apiFetch(`/api/departments/${encodeURIComponent(departmentId)}/specialties`, {
          method: "PUT",
          body: {
            specialtyIds: pickedSpecialtyIds,
            primarySpecialtyId: primarySpecId,
          },
        });
      }
      setOpen(false);
      await loadDepartments(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to save department";
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
      await apiFetch(`/api/departments/${encodeURIComponent(deactivateTarget.id)}/deactivate`, {
        method: "POST",
        body: { reason, cascade: true },
      });
      toast({ title: "Deactivated", description: `${deactivateTarget.name}`, duration: 1400 });
      setDeactivateOpen(false);
      setDeactivateTarget(null);
      setDeactivateReason("");
      setDeactivateErr(null);
      await loadDepartments(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status";
      setDeactivateErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: DepartmentRow) {
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
      await apiFetch(`/api/departments/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        body: { isActive: true },
      });
      toast({ title: "Activated", description: `${r.name}`, duration: 1400 });
      await loadDepartments(branchId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to update status";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const flatLocations = React.useMemo(() => flattenLocations(locationsTree), [locationsTree]);
  const pickableLocations = React.useMemo(() => flatLocations.filter((n) => ALLOWED_LOCATION_TYPES.has(String(n.type ?? ""))), [flatLocations]);
  const filteredFlatLocations = React.useMemo(() => {
    const s = locationSearch.trim().toLowerCase();
    if (!s) return pickableLocations;
    return pickableLocations.filter((n) => (n.name ?? "").toLowerCase().includes(s) || (n.code ?? "").toLowerCase().includes(s));
  }, [pickableLocations, locationSearch]);

  const selectedLocationChips = React.useMemo(() => {
    const byId = new Map(flatLocations.map((x) => [x.id, x]));
    return pickedLocationIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((n) => ({ id: n!.id, label: `${n!.name ?? "(unnamed)"} ${n!.code ? `(${n!.code})` : ""}`.trim(), type: n!.type }));
  }, [flatLocations, pickedLocationIds]);

  const filteredSpecialties = React.useMemo(() => {
    const s = specSearch.trim().toLowerCase();
    if (!s) return specialties;
    return specialties.filter(
      (sp) => sp.name.toLowerCase().includes(s) || sp.code.toLowerCase().includes(s) || (sp.kind || "").toLowerCase().includes(s)
    );
  }, [specialties, specSearch]);

  const selectedSpecialtyChips = React.useMemo(() => {
    const byId = new Map(specialties.map((x) => [x.id, x] as const));
    return pickedSpecialtyIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((s) => ({
        id: s!.id,
        label: `${s!.name} (${s!.code})`,
        kind: s!.kind,
        isActive: s!.isActive,
      }));
  }, [specialties, pickedSpecialtyIds]);

  return (
    <AppShell title="Infrastructure - Departments">
      <RequirePerm perm="DEPARTMENT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconBuilding className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Departments</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure branch departments (Clinical/Service/Support) with locations, operating hours, extensions, and HOD.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage departments."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll()} disabled={loading || busy || !branchId}>
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={loading || busy || !branchId}>
                <Plus className="h-4 w-4" />
                New Department
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Search and filter departments in the active branch.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Departments</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive:{" "}
                    <span className="font-semibold tabular-nums">{inactiveCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Clinical Departments</div>
                  <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{clinicalCount}</div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Non-Clinical Departments</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{nonClinicalCount}</div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                    Service: <span className="font-semibold tabular-nums">{serviceCount}</span> | Support:{" "}
                    <span className="font-semibold tabular-nums">{supportCount}</span>
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
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span> departments
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <Label className="text-xs text-zc-muted">Department type</Label>
                  <Select value={facilityType} onValueChange={(v) => setFacilityType(v as any)} disabled={!branchId}>
                    <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {FACILITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {typeLabel(t)}
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
                    setFacilityType("ALL");
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
                  <CardTitle className="text-base">Department Directory</CardTitle>
                  <CardDescription className="text-sm">Standard seeded departments + custom additions.</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-2" disabled={!branchId}>
                    <Link href={branchId ? `/infrastructure/specialties?tab=mapping` : "#"}>
                      <Settings2 className="h-4 w-4" />
                      Specialty mapping
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
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">HOD</th>
                    <th className="px-4 py-3 text-left font-semibold">Locations</th>
                    <th className="px-4 py-3 text-left font-semibold">Hours</th>
                    <th className="px-4 py-3 text-left font-semibold">Specialties</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-zc-muted">
                        Loading departments...
                      </td>
                    </tr>
                  ) : !branchId ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          Select a branch first.
                        </span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          No departments found.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const locPrimary = r.locations?.find((x) => x.isPrimary) ?? r.locations?.[0];
                      const locLabel = locPrimary?.node?.name
                        ? `${locPrimary.node.name}${locPrimary.node.code ? ` (${locPrimary.node.code})` : ""}`
                        : r.locations?.length
                          ? `${r.locations.length} locations`
                          : "-";
                      const locExtra = (r.locations?.length ?? 0) > 1 ? ` +${(r.locations.length ?? 0) - 1}` : "";

                      return (
                        <tr key={r.id} className={cn("border-t border-zc-border hover:bg-zc-panel/20", !r.isActive && "opacity-70")}>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                              {r.code}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-zc-text">{r.name}</div>
                            {r.extensions?.length ? <div className="mt-0.5 text-xs text-zc-muted">Ext: {r.extensions.join(", ")}</div> : null}
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                              {typeLabel(r.facilityType)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-sm">
                            {r.headStaff ? (
                              <div className="flex items-center gap-2 text-zc-text">
                                <User className="h-4 w-4 text-zc-muted" />
                                <span className="truncate">{r.headStaff.name}</span>
                              </div>
                            ) : (
                              <span className="text-zc-muted">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm">
                            {r.locations?.length ? (
                              <div className="flex items-center gap-2 text-zc-text">
                                <MapPin className="h-4 w-4 text-zc-muted" />
                                <span className="truncate">{locLabel}</span>
                                <span className="text-xs text-zc-muted">{locExtra}</span>
                              </div>
                            ) : (
                              <span className="text-zc-muted">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">{hoursLabel(r.operatingHours)}</td>

                          <td className="px-4 py-3 text-sm text-zc-muted">
                            <span className="font-mono text-xs text-zc-text">{r.specialties?.length ?? 0}</span>
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
                                onClick={() => router.push(`/infrastructure/departments/${r.id}`)}
                                title="View details"
                                aria-label="View details"
                                disabled={!branchId}
                              >
                                <IconChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => void openEdit(r)}
                                title="Edit department"
                                aria-label="Edit department"
                                disabled={!branchId || busy}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={r.isActive ? "secondary" : "success"}
                                size="icon"
                                onClick={() => void toggleActive(r)}
                                title={r.isActive ? "Deactivate department" : "Activate department"}
                                aria-label={r.isActive ? "Deactivate department" : "Activate department"}
                                disabled={!branchId || busy}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : r.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
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
              }
            }}
          >
            <DialogContent className="sm:max-w-[520px] rounded-2xl border border-indigo-200/50 bg-zc-card shadow-2xl shadow-indigo-500/10 dark:border-indigo-800/50">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Deactivate Department
                </DialogTitle>
                <DialogDescription>
                  {deactivateTarget ? `Tell us why you're deactivating ${deactivateTarget.name}.` : "Tell us why you're deactivating this department."}
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
                  placeholder="e.g., Department merged, services moved, or temporarily closed."
                />
              </div>

              <DialogFooter className="mt-5">
                <Button
                  variant="ghost"
                  onClick={() => setDeactivateOpen(false)}
                  disabled={busy}
                >
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
                    <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {editing ? "Edit Department" : "Create Department"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update core details, specialties, operating hours, locations, and HOD."
                    : "Create the department profile and map specialties, hours, locations, and HOD."}
                </DialogDescription>
              </DialogHeader>

              <Separator className="my-4" />

              {modalErr ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{modalErr}</div>
                </div>
              ) : null}

              <div className="grid gap-6">
                <Tabs defaultValue="core">
                  <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                    <TabsTrigger
                      value="core"
                      className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                    >
                      Core
                    </TabsTrigger>
                    <TabsTrigger
                      value="spec"
                      className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                    >
                      Specialties
                    </TabsTrigger>
                    <TabsTrigger
                      value="ops"
                      className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                    >
                      Operating hours
                    </TabsTrigger>
                    <TabsTrigger
                      value="loc"
                      className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                    >
                      Locations
                    </TabsTrigger>
                    <TabsTrigger
                      value="hod"
                      className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                    >
                      HOD
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="core" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <Label>Code</Label>
                        <Input
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          placeholder="e.g. OPD"
                          className="h-11 rounded-xl border-zc-border bg-zc-card font-mono"
                          disabled={!!editing || busy}
                        />
                        <div className="mt-1 text-xs text-zc-muted">Unique within branch. Uppercase letters/numbers/_</div>
                      </div>

                      <div className="md:col-span-8">
                        <Label>Name</Label>
                        <Input
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Department name"
                          className="h-11 rounded-xl border-zc-border bg-zc-card"
                          disabled={busy}
                        />
                      </div>

                      <div className="md:col-span-4">
                        <Label>Type</Label>
                        <Select value={formType} onValueChange={(v) => setFormType(v as FacilityType)} disabled={busy}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FACILITY_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {typeLabel(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-4">
                        <Label>Cost Center Code</Label>
                        <Input
                          value={formCostCenter}
                          onChange={(e) => setFormCostCenter(e.target.value)}
                          placeholder="Optional"
                          className="h-11 rounded-xl border-zc-border bg-zc-card"
                          disabled={busy}
                        />
                      </div>

                      <div className="md:col-span-4">
                        <Label>Extensions</Label>
                        <Input
                          value={formExtensions}
                          onChange={(e) => setFormExtensions(e.target.value)}
                          placeholder="e.g. 123, 124"
                          className="h-11 rounded-xl border-zc-border bg-zc-card"
                          disabled={busy}
                        />
                        <div className="mt-1 text-xs text-zc-muted">Comma-separated phone extensions</div>
                      </div>

                      <div className="md:col-span-12 rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-sm text-zc-muted">
                        Tag specialties in the <span className="font-semibold text-zc-text">Specialties</span> tab above. Master list is under{" "}
                        <span className="font-semibold text-zc-text">Infrastructure → Specialties</span>.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="spec" className="mt-4">
                    <div className="grid gap-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zc-text">Department Specialties</div>
                          <div className="mt-1 text-xs text-zc-muted">
                            Select one or more specialties to tag this department. Optionally mark one as primary.
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href="/infrastructure/specialties">
                              <ChevronDown className="h-4 w-4" />
                              Open Specialty Master
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Selected chips */}
                      <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-zc-muted">
                            Selected: <span className="font-mono text-xs">{pickedSpecialtyIds.length}</span>
                          </div>
                          <div className="w-full md:w-72">
                            <Label>Primary specialty</Label>
                            <Select
                              value={primarySpecialtyId ?? ""}
                              onValueChange={(v) => setPrimarySpecialtyId(v || null)}
                              disabled={busy || pickedSpecialtyIds.length === 0}
                            >
                              <SelectTrigger className="mt-1 h-11 rounded-xl border-zc-border bg-zc-card">
                                <SelectValue placeholder="(optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {pickedSpecialtyIds.map((id) => {
                                  const s = specialties.find((x) => x.id === id);
                                  return (
                                    <SelectItem key={id} value={id}>
                                      {s ? `${s.name} (${s.code})` : id}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {selectedSpecialtyChips.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedSpecialtyChips.map((s) => (
                              <span
                                key={s.id}
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                                  s.isActive ? "border-zc-border bg-zc-card" : "border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15"
                                )}
                              >
                                <span className="font-medium text-zc-text">{s.label}</span>
                                <span className="text-[11px] text-zc-muted">{(s.kind || "").replace(/_/g, " ")}</span>
                                {primarySpecialtyId === s.id ? <Badge variant="ok">Primary</Badge> : null}
                                <button
                                  type="button"
                                  className="grid h-6 w-6 place-items-center rounded-full text-zc-muted hover:bg-zc-panel/30"
                                  onClick={() => togglePickSpecialty(s.id)}
                                  disabled={busy}
                                  title="Remove"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-zc-muted">No specialties selected yet.</div>
                        )}
                      </div>

                      {/* Picker */}
                      <div className="rounded-2xl border border-zc-border">
                        <div className="flex flex-col gap-2 border-b border-zc-border bg-zc-panel/10 p-4 md:flex-row md:items-center md:justify-between">
                          <div className="relative w-full md:w-96">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                            <Input
                              value={specSearch}
                              onChange={(e) => setSpecSearch(e.target.value)}
                              placeholder="Search specialties (name/code/kind)…"
                              className="h-11 rounded-xl border-zc-border bg-zc-card pl-9"
                              disabled={busy}
                            />
                          </div>

                          <div className="flex items-center gap-2 text-xs text-zc-muted">
                            {specLoading ? (
                              <span className="inline-flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> loading
                              </span>
                            ) : null}
                            <span className="font-mono">{filteredSpecialties.length}</span> available
                          </div>
                        </div>

                        <div className="max-h-[320px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[90px]">Pick</TableHead>
                                <TableHead>Specialty</TableHead>
                                <TableHead>Kind</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {!filteredSpecialties.length ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                                    No specialties match your search.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredSpecialties.map((s) => {
                                  const picked = pickedSpecialtyIds.includes(s.id);
                                  return (
                                    <TableRow key={s.id} className={picked ? "bg-zc-panel/10" : ""}>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant={picked ? "primary" : "outline"}
                                          size="sm"
                                          className="gap-2"
                                          onClick={() => togglePickSpecialty(s.id)}
                                          disabled={busy}
                                        >
                                          {picked ? <Check className="h-4 w-4" /> : null}
                                          {picked ? "Selected" : "Select"}
                                        </Button>
                                      </TableCell>
                                      <TableCell>
                                        <div className="min-w-0">
                                          <div className="font-semibold text-zc-text">{s.name}</div>
                                          <div className="mt-0.5 font-mono text-xs text-zc-muted">{s.code}</div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{(s.kind || "").replace(/_/g, " ")}</Badge>
                                      </TableCell>
                                      <TableCell>{s.isActive ? <Badge variant="ok">Active</Badge> : <Badge variant="warning">Inactive</Badge>}</TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ops" className="mt-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <Label>Operating hours</Label>
                          <Select
                            value={formOperatingMode}
                            onValueChange={(v) => {
                              const m = v as any;
                              setFormOperatingMode(m);
                              setShowOperatingAdvanced(m === "CUSTOM");
                              if (m === "24X7") {
                                setOperatingPreset("24X7");
                                setWeeklyDays({});
                              }
                              if (m === "WEEKLY" && Object.keys(weeklyDays ?? {}).length === 0) {
                                // default to a sensible preset when switching from 24x7
                                setOperatingPreset("MON_SAT_9_5");
                                setWeeklyDays(buildPresetWeekly("MON_SAT_9_5"));
                              }
                            }}
                            disabled={busy}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24X7">24×7</SelectItem>
                              <SelectItem value="WEEKLY">Weekly schedule</SelectItem>
                              <SelectItem value="CUSTOM">Advanced (JSON)</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="mt-1 text-xs text-zc-muted">No JSON required for 24×7 or weekly schedules.</div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-sm">
                          <div className="font-semibold text-zc-text">Preview</div>
                          <div className="mt-1 text-zc-muted">
                            {(() => {
                              try {
                                return hoursLabel(resolveOperatingHours());
                              } catch (e: any) {
                                return e?.message ? `⚠ ${e.message}` : "⚠ Invalid";
                              }
                            })()}
                          </div>
                        </div>
                      </div>

                      {formOperatingMode === "24X7" ? (
                        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                          This department is marked as <span className="font-semibold text-zc-text">24×7</span>. No additional configuration needed.
                        </div>
                      ) : null}

                      {formOperatingMode === "WEEKLY" ? (
                        <div className="grid gap-4">
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <Label>Quick preset</Label>
                              <Select
                                value={operatingPreset}
                                onValueChange={(v) => {
                                  setOperatingPreset(v);
                                  if (v === "CUSTOM") return;
                                  if (v === "24X7") {
                                    setFormOperatingMode("24X7");
                                    setShowOperatingAdvanced(false);
                                    setWeeklyDays({});
                                    return;
                                  }
                                  setWeeklyDays(buildPresetWeekly(v));
                                }}
                                disabled={busy}
                              >
                                <SelectTrigger className="mt-1 h-11 rounded-xl border-zc-border bg-zc-card">
                                  <SelectValue placeholder="Select a preset" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CUSTOM">(keep current)</SelectItem>
                                  <SelectItem value="MON_FRI_9_5">Weekdays (Mon–Fri) 09:00–17:00</SelectItem>
                                  <SelectItem value="MON_SAT_9_5">OPD (Mon–Sat) 09:00–17:00</SelectItem>
                                  <SelectItem value="ALL_9_9">All days 09:00–21:00</SelectItem>
                                  <SelectItem value="MON_SAT_TWO_SHIFTS">Two shifts (Mon–Sat) 09:00–13:00 & 14:00–18:00</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="mt-1 text-xs text-zc-muted">Pick a preset, then tweak per day if needed.</div>
                            </div>

                            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-sm">
                              <div className="font-semibold text-zc-text">Timezone</div>
                              <div className="mt-1 text-zc-muted">{formOperatingTimezone || "-"}</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-zc-border overflow-hidden">
                            <div className="border-b border-zc-border bg-zc-panel/10 p-4">
                              <div className="text-sm font-semibold text-zc-text">Weekly schedule</div>
                              <div className="mt-1 text-xs text-zc-muted">Turn days on/off and set start/end time. (HH:MM, 24-hour)</div>
                            </div>

                            <div className="grid gap-3 p-4">
                              {WEEK_DAYS.map((d) => {
                                const shifts = weeklyDays[d.key] ?? [];
                                const enabled = Array.isArray(shifts) && shifts.length > 0;

                                const setShift = (idx: number, patch: Partial<ShiftUI>) => {
                                  setWeeklyDays((prev) => {
                                    const next = { ...(prev || {}) } as any;
                                    const cur = Array.isArray(next[d.key]) ? [...next[d.key]] : [];
                                    const s = { ...(cur[idx] ?? { start: "09:00", end: "17:00" }), ...patch };
                                    cur[idx] = s;
                                    next[d.key] = cur;
                                    return next;
                                  });
                                };

                                const addShift = () => {
                                  setWeeklyDays((prev) => {
                                    const next = { ...(prev || {}) } as any;
                                    const cur = Array.isArray(next[d.key]) ? [...next[d.key]] : [];
                                    cur.push({ start: "09:00", end: "17:00" });
                                    next[d.key] = cur;
                                    return next;
                                  });
                                };

                                const removeShift = (idx: number) => {
                                  setWeeklyDays((prev) => {
                                    const next = { ...(prev || {}) } as any;
                                    const cur = Array.isArray(next[d.key]) ? [...next[d.key]] : [];
                                    const out = cur.filter((_: any, i: number) => i !== idx);
                                    if (out.length === 0) delete next[d.key];
                                    else next[d.key] = out;
                                    return next;
                                  });
                                };

                                const toggleDay = (on: boolean) => {
                                  setWeeklyDays((prev) => {
                                    const next = { ...(prev || {}) } as any;
                                    if (on) next[d.key] = Array.isArray(next[d.key]) && next[d.key].length ? next[d.key] : [{ start: "09:00", end: "17:00" }];
                                    else delete next[d.key];
                                    return next;
                                  });
                                };

                                return (
                                  <div key={d.key} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="flex items-center gap-3">
                                        <Switch checked={enabled} onCheckedChange={(v) => toggleDay(!!v)} disabled={busy} />
                                        <div>
                                          <div className="text-sm font-semibold text-zc-text">{d.label}</div>
                                          <div className="text-xs text-zc-muted">{enabled ? `${shifts.length} shift${shifts.length > 1 ? "s" : ""}` : "Closed"}</div>
                                        </div>
                                      </div>

                                      {enabled ? (
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
                                          {shifts.map((s, idx) => (
                                            <div key={`${d.key}-${idx}`} className="flex items-center gap-2">
                                              <Input
                                                type="time"
                                                value={s.start}
                                                onChange={(e) => setShift(idx, { start: e.target.value })}
                                                className="h-10 w-[140px] rounded-xl border-zc-border bg-zc-card"
                                                disabled={busy}
                                              />
                                              <span className="text-xs text-zc-muted">to</span>
                                              <Input
                                                type="time"
                                                value={s.end}
                                                onChange={(e) => setShift(idx, { end: e.target.value })}
                                                className="h-10 w-[140px] rounded-xl border-zc-border bg-zc-card"
                                                disabled={busy}
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => removeShift(idx)}
                                                disabled={busy}
                                              >
                                                <X className="h-4 w-4" />
                                                Remove
                                              </Button>
                                            </div>
                                          ))}
                                          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addShift} disabled={busy}>
                                            <Plus className="h-4 w-4" />
                                            Add shift
                                          </Button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {formOperatingMode === "CUSTOM" || showOperatingAdvanced ? (
                        <div className="grid gap-2">
                          <Label>Operating hours JSON (advanced)</Label>
                          <textarea
                            value={formOperatingJson}
                            onChange={(e) => setFormOperatingJson(e.target.value)}
                            className="min-h-[200px] w-full rounded-xl border border-zc-border bg-zc-card p-3 font-mono text-xs text-zc-text"
                            spellCheck={false}
                            disabled={busy}
                          />
                          <div className="text-xs text-zc-muted">
                            Only use this if you need a non-standard schedule. Format:{" "}
                            <code>{'{"mode":"WEEKLY","days":{"MON":[{"start":"09:00","end":"17:00"}]}}'}</code>.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="loc" className="mt-4">
                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-zc-text">Selected locations</div>
                          <div className="text-sm text-zc-muted">Pick one or more location nodes for the department (Floor / Zone / Area only)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            placeholder="Search locations..."
                            className="h-10 w-[260px] rounded-xl border-zc-border bg-zc-card"
                            disabled={busy}
                          />
                        </div>
                      </div>

                      {pickedLocationIds.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedLocationChips.map((c) => (
                            <span
                              key={c.id}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border border-zc-border bg-zc-panel/10 px-3 py-1 text-xs",
                                primaryLocationId === c.id ? "ring-2 ring-zc-accent/40" : "",
                              )}
                            >
                              <MapPin className="h-3 w-3 text-zc-muted" />
                              <span className="max-w-[280px] truncate">{c.label}</span>
                              {primaryLocationId === c.id ? <Badge variant="ok">PRIMARY</Badge> : null}
                              <button
                                className="ml-1 rounded-full p-1 hover:bg-zc-panel/30"
                                onClick={() => togglePickLocation(c.id)}
                                type="button"
                                disabled={busy}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">No locations selected.</div>
                      )}

                      <div className="grid gap-2">
                        <Label>Primary location</Label>
                        <Select value={primaryLocationId ?? ""} onValueChange={(v) => setPrimaryLocationId(v || null)} disabled={busy || pickedLocationIds.length === 0}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder={pickedLocationIds.length ? "Select primary..." : "Select locations first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[320px] overflow-y-auto">
                            {selectedLocationChips.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-zc-muted">Backend rule: primaryLocationNodeId must be included in locationNodeIds.</div>
                      </div>

                      <div className="rounded-xl border border-zc-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">Type</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead className="w-[120px]">Pick</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredFlatLocations.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3}>
                                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                    <AlertTriangle className="h-4 w-4 text-zc-warn" />
                                    No locations found.
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredFlatLocations.map((n) => {
                                const checked = pickedLocationIds.includes(n.id);
                                return (
                                  <TableRow key={n.id} className={checked ? "bg-zc-panel/10" : ""}>
                                    <TableCell className="text-sm text-zc-muted">{n.type}</TableCell>
                                    <TableCell className="text-sm text-zc-text">
                                      {n.name ?? "(unnamed)"} {n.code ? <span className="font-mono text-xs text-zc-muted">({n.code})</span> : null}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={checked ? "secondary" : "outline"}
                                        className="gap-2"
                                        onClick={() => togglePickLocation(n.id)}
                                        disabled={busy}
                                      >
                                        {checked ? "Picked" : "Pick"}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="hod" className="mt-4">
                    <div className="grid gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-zc-text">Head of Department</div>
                        <div className="text-sm text-zc-muted">Search staff and set HOD (optional)</div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Search staff</Label>
                        <Input
                          value={hodSearch}
                          onChange={(e) => setHodSearch(e.target.value)}
                          placeholder="Search by name/emp code/designation/email/phone"
                          className="h-11 rounded-xl border-zc-border bg-zc-card"
                          disabled={busy}
                        />
                        {hodId ? (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                            <div className="text-sm">
                              <span className="text-zc-muted">Selected:</span>{" "}
                              <span className="font-semibold text-zc-text">{hodLabel || hodId}</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setHodId(null);
                                setHodLabel("");
                              }}
                              disabled={busy}
                            >
                              <X className="h-4 w-4" />
                              Clear
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-zc-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead className="w-[220px]">Designation</TableHead>
                              <TableHead className="w-[140px]">Emp Code</TableHead>
                              <TableHead className="w-[120px]">Select</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hodResults.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                    <AlertTriangle className="h-4 w-4 text-zc-warn" />
                                    No staff results.
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              hodResults.slice(0, 80).map((s) => {
                                const selected = hodId === s.id;
                                return (
                                  <TableRow key={s.id} className={selected ? "bg-zc-panel/10" : ""}>
                                    <TableCell className="text-sm text-zc-text">{s.name}</TableCell>
                                    <TableCell className="text-sm text-zc-muted">{s.designation ?? "-"}</TableCell>
                                    <TableCell className="text-sm text-zc-muted font-mono">{(s as any).empCode ?? "-"}</TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={selected ? "secondary" : "outline"}
                                        className="gap-2"
                                        onClick={() => {
                                          setHodId(s.id);
                                          setHodLabel(`${s.name}${s.designation ? ` — ${s.designation}` : ""}`);
                                        }}
                                        disabled={busy}
                                      >
                                        {selected ? "Selected" : "Select"}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter>
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => void saveDepartment()}
                    disabled={busy || !branchId}
                    title={!branchId ? "Select a branch first" : undefined}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editing ? "Save Changes" : "Create Department"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
