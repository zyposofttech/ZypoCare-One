"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Clock,
  History,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  User,
  X,
} from "lucide-react";

type FacilityType = "CLINICAL" | "SERVICE" | "SUPPORT";

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
  extensions?: string[] | null;
  operatingHours?: any | null;
  isActive: boolean;
  parentDepartmentId?: string | null;
  headStaffId?: string | null;
  headStaff?: { id: string; name: string; designation?: string | null } | null;
  doctors?: Array<{
    staffId: string;
    isPrimary: boolean;
    assignedAt?: string | null;
    staff: { id: string; name: string };
  }>;
  specialties?: Array<{
    specialtyId: string;
    isPrimary: boolean;
    specialty: { id: string; code: string; name: string; kind?: string | null; isActive: boolean };
  }>;
  locations?: Array<{
    locationNodeId: string;
    isPrimary: boolean;
    isActive: boolean;
    kind?: string | null;
    node?: { kind?: string | null; code?: string | null; name?: string | null; isActive?: boolean };
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

type LocationNodeUi = {
  id: string;
  kind: string;
  code?: string | null;
  name?: string | null;
  isActive?: boolean;
};

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

const FACILITY_TYPES: FacilityType[] = ["CLINICAL", "SERVICE", "SUPPORT"];

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
  return <div className={cn("animate-pulse rounded bg-zc-panel/20", className)} />;
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

function flattenLocationTree(tree: any): Record<string, LocationNodeUi> {
  const out: Record<string, LocationNodeUi> = {};

  const childLists = (n: any) => {
    const lists: any[] = [];
    for (const k of ["buildings", "floors", "zones", "areas", "children"]) {
      if (Array.isArray(n?.[k])) lists.push(...n[k]);
    }
    return lists;
  };

  const visit = (n: any) => {
    if (!n || typeof n !== "object") return;
    const id = n.id;
    if (id) {
      out[id] = {
        id,
        kind: String(n.type ?? n.kind ?? ""),
        code: n.code ?? null,
        name: n.name ?? null,
        isActive: typeof n.isActive === "boolean" ? n.isActive : undefined,
      };
    }
    for (const c of childLists(n)) visit(c);
  };

  const roots = Array.isArray(tree?.campuses) ? tree.campuses : Array.isArray(tree?.roots) ? tree.roots : [];
  for (const r of roots) visit(r);
  return out;
}

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
  if (h.is24x7 || h.mode === "24X7") return "24x7";
  if (h.mode === "WEEKLY" && h.days) return "Weekly";
  if (h.mode === "SHIFT" && (h.start || h.end)) return `${h.start ?? ""}${h.end ? `-${h.end}` : ""}`;
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

const DAY_LABEL: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

function formatShifts(shifts: any[]): string {
  if (!Array.isArray(shifts) || shifts.length === 0) return "Closed";
  const parts = shifts
    .map((s) => {
      const a = String(s?.start ?? "").slice(0, 5);
      const b = String(s?.end ?? "").slice(0, 5);
      if (!a || !b) return null;
      return `${a}–${b}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "Closed";
}

function OperatingHoursView({ value }: { value: any }) {
  if (!value) {
    return <div className="text-sm text-zc-muted">Not set</div>;
  }
  const is24 = !!value.is24x7 || value.mode === "24X7";
  if (is24) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">24×7</Badge>
        {value.timezone ? <span className="text-sm text-zc-muted">Timezone: {String(value.timezone)}</span> : null}
      </div>
    );
  }

  if (value.mode === "WEEKLY" && value.days && typeof value.days === "object") {
    const order = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    return (
      <div className="overflow-x-auto rounded-xl border border-zc-border">
        <table className="w-full text-sm">
          <thead className="bg-zc-panel/10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zc-text">Day</th>
              <th className="px-3 py-2 text-left font-semibold text-zc-text">Shifts</th>
            </tr>
          </thead>
          <tbody>
            {order.map((d) => (
              <tr key={d} className="border-t border-zc-border">
                <td className="px-3 py-2 text-zc-text">{DAY_LABEL[d] ?? d}</td>
                <td className="px-3 py-2 text-zc-muted">{formatShifts((value.days as any)[d] ?? [])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
      <div className="text-sm text-zc-muted">Custom</div>
      <pre className="mt-2 overflow-auto rounded-lg bg-zc-card p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function InfoTile({
  label,
  value,
  className,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "indigo" | "emerald" | "cyan" | "zinc" | "sky" | "violet" | "amber";
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
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
        {icon ? <span className="text-zc-muted">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function statusBadge(isActive: boolean) {
  return isActive ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Inactive</Badge>;
}

function statusPill(isActive: boolean) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
        isActive ? pillTones.emerald : pillTones.amber,
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default function DepartmentDetailsPage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const deptKey = String(params?.id ?? "");

  const { activeBranchId, isReady, scope, reason } = useBranchContext();
  const branchId = activeBranchId;

  const [row, setRow] = React.useState<DepartmentRow | null>(null);
  const [locIndex, setLocIndex] = React.useState<Record<string, LocationNodeUi>>({});
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"overview" | "specialties" | "locations" | "hours" | "audit">("overview");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [modalErr, setModalErr] = React.useState<string | null>(null);

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

  const [specialties, setSpecialties] = React.useState<SpecialtyMini[]>([]);
  const [specLoading, setSpecLoading] = React.useState(false);
  const [specSearch, setSpecSearch] = React.useState("");
  const [pickedSpecialtyIds, setPickedSpecialtyIds] = React.useState<string[]>([]);
  const [primarySpecialtyId, setPrimarySpecialtyId] = React.useState<string | null>(null);

  const [hodSearch, setHodSearch] = React.useState("");
  const [hodResults, setHodResults] = React.useState<StaffMini[]>([]);
  const [hodId, setHodId] = React.useState<string | null>(null);
  const [hodLabel, setHodLabel] = React.useState<string>("");

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setErr(null);

    try {
      // Attempt direct fetch if your API supports it
      try {
        const direct = await apiFetch<DepartmentRow>(
          `/api/departments/${encodeURIComponent(deptKey)}?branchId=${encodeURIComponent(branchId)}`
        );
        if (direct?.id) setRow(direct);
      } catch {
        // Fallback to list + find
        const params = new URLSearchParams();
        params.set("branchId", branchId);
        params.set("includeInactive", "true");
        const list = await apiFetch<DepartmentRow[]>(`/api/departments?${params.toString()}`);
        const found =
          list.find((d) => d.id === deptKey) ||
          list.find((d) => d.code?.toLowerCase?.() === deptKey.toLowerCase()) ||
          null;
        if (!found) throw new Error("Department not found");
        setRow(found);
      }

      // Load location tree index for readable node names
      try {
        const tree = await apiFetch<any>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`);
        setLocIndex(flattenLocationTree(tree));
      } catch {
        setLocIndex({});
      }
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : e?.message || "Failed to load department";
      setErr(msg);
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, deptKey]);

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

  async function openEdit(r: DepartmentRow) {
    if (!branchId) {
      toast({ title: "Select branch", description: "Select an active branch first.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      let full: DepartmentRow = r;
      if (!Array.isArray((r as any)?.specialties) || !Array.isArray((r as any)?.locations)) {
        try {
          const params = new URLSearchParams();
          params.set("branchId", branchId);
          full = await apiFetch<DepartmentRow>(`/api/departments/${encodeURIComponent(r.id)}?${params.toString()}`);
        } catch {
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

      const locAll = (full.locations ?? []).map((x) => x.locationNodeId);
      const locAllowed = (full.locations ?? [])
        .filter((x) => ALLOWED_LOCATION_TYPES.has(String(x.node?.kind ?? x.kind ?? "")))
        .map((x) => x.locationNodeId);

      if (locAll.length !== locAllowed.length) {
        // legacy cleanup ignored
      }

      setPickedLocationIds(locAllowed);
      let primary =
        (full.locations ?? []).find((x) => x.isPrimary && ALLOWED_LOCATION_TYPES.has(String(x.node?.kind ?? x.kind ?? "")))?.locationNodeId ?? null;
      if (primary && !locAllowed.includes(primary)) primary = locAllowed[0] ?? null;
      if (!primary && locAllowed.length) primary = locAllowed[0];
      setPrimaryLocationId(primary);

      const hod = full.headStaff ?? null;
      setHodId(hod?.id ?? null);
      setHodLabel(hod ? `${hod.name}${hod.designation ? ` - ${hod.designation}` : ""}` : "");
      setHodSearch(hod?.name ?? "");

      let specIds = (full.specialties ?? []).map((x) => x.specialtyId);
      let primarySpec = (full.specialties ?? []).find((x) => x.isPrimary)?.specialtyId ?? null;
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
      if (primaryLocationId && !next.includes(primaryLocationId)) setPrimaryLocationId(next[0] ?? null);
      if (!primaryLocationId && next.length) setPrimaryLocationId(next[0]);
      return next;
    });
  }

  function togglePickSpecialty(id: string) {
    setPickedSpecialtyIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
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
        const normalized = shifts.map((s) => ({ start: String(s.start ?? "").trim(), end: String(s.end ?? "").trim() }));

        for (const [i, s] of normalized.entries()) {
          if (!isHHMM(s.start) || !isHHMM(s.end)) throw new Error(`Invalid time format for ${d} shift #${i + 1}. Use HH:MM.`);
          const sm = toMinutes(s.start);
          const em = toMinutes(s.end);
          if (sm == null || em == null) throw new Error(`Invalid time format for ${d} shift #${i + 1}. Use HH:MM.`);
          if (sm >= em) throw new Error(`${d} shift #${i + 1}: start time must be before end time.`);
        }

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

    if (!pickedLocationIds.length) {
      setModalErr("Department must have a physical location assigned.");
      return;
    }
    if (!primaryLocationId) {
      setModalErr("Select a primary location.");
      return;
    }
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
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to save department";
      setModalErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (!isReady || !branchId || !deptKey) return;
    void load();
  }, [isReady, branchId, deptKey, load]);

  React.useEffect(() => {
    if (!isReady) return;
    if (!branchId) {
      setLoading(false);
      setRow(null);
    }
  }, [isReady, branchId]);

  React.useEffect(() => {
    if (!open || !branchId) return;
    void Promise.all([loadLocations(branchId), loadSpecialties(branchId)]);
  }, [open, branchId]);

  React.useEffect(() => {
    if (!open || !branchId) return;
    const t = setTimeout(() => void searchStaff(branchId, hodSearch), 250);
    return () => clearTimeout(t);
  }, [open, branchId, hodSearch]);

  React.useEffect(() => {
    if (open) setModalErr(null);
  }, [open, editing]);

  const flatLocations = React.useMemo(() => flattenLocations(locationsTree), [locationsTree]);
  const pickableLocations = React.useMemo(
    () => flatLocations.filter((n) => ALLOWED_LOCATION_TYPES.has(String(n.type ?? ""))),
    [flatLocations],
  );
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
      (sp) => sp.name.toLowerCase().includes(s) || sp.code.toLowerCase().includes(s) || (sp.kind || "").toLowerCase().includes(s),
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

  const specialtiesCount = row?.specialties?.length ?? 0;
  const locationsCount = row?.locations?.length ?? 0;
  const extensionsCount = (row?.extensions ?? []).length;

  return (
    <AppShell title="Infrastructure - Departments">
      <RequirePerm perm="DEPARTMENT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <Button variant="outline" className="h-10" asChild>
                  <Link href="/infrastructure/departments">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>

                <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
                  <Building2 className="h-5 w-5 text-zc-accent" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm text-zc-muted">
                    <Link href="/infrastructure/departments" className="hover:underline">
                      Departments
                    </Link>
                    <span className="mx-2 text-zc-muted/60">/</span>
                    <span className="text-zc-text">Details</span>
                  </div>

                  <div className="mt-1 text-3xl font-semibold tracking-tight">
                    {loading ? <Skeleton className="h-9 w-64" /> : row?.name ?? "Department"}
                  </div>

                  {!loading && row ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                      <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                        {row.code}
                      </span>
                      <span className="text-zc-muted/60">/</span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-4 w-4" /> {typeLabel(row.facilityType)}
                      </span>
                      <span className="text-zc-muted/60">/</span>
                      {statusPill(row.isActive)}
                      <span className="text-zc-muted/60">/</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                          row.headStaff ? pillTones.emerald : pillTones.zinc,
                        )}
                      >
                        {row.headStaff ? "HOD assigned" : "No HOD"}
                      </span>
                    </div>
                  ) : loading ? (
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading || !branchId}>
                  <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
                  Refresh
                </Button>

                <RequirePerm perm="DEPARTMENT_UPDATE">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => (row ? void openEdit(row) : undefined)}
                    disabled={!row || loading || !branchId}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </RequirePerm>
              </div>
            </div>

            {scope === "GLOBAL" && !branchId ? (
              <div className="rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                {reason ?? "Select an active branch to view department details."}
              </div>
            ) : null}

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>
        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-zc-text">Loading…</CardTitle>
              <CardDescription className="text-zc-muted">Fetching department details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-24 rounded-2xl bg-zc-panel/10" />
              <div className="h-64 rounded-2xl bg-zc-panel/10" />
            </CardContent>
          </Card>
        ) : row ? (
          <>
            <Card className="overflow-hidden">
              <CardHeader className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">Snapshot</CardTitle>
                    <CardDescription>Status, counts, and identifiers.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MetricPill label="Specialties" value={specialtiesCount} tone="violet" />
                    <MetricPill label="Locations" value={locationsCount} tone="emerald" />
                    <MetricPill label="Extensions" value={extensionsCount} tone="sky" />
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pb-6 pt-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoTile
                    label="Department ID"
                    icon={<Layers className="h-4 w-4" />}
                    tone="zinc"
                    value={<span className="font-mono text-xs break-all">{row.id}</span>}
                  />
                  <InfoTile
                    label="Code"
                    icon={<Layers className="h-4 w-4" />}
                    tone="indigo"
                    value={<span className="font-mono text-sm font-semibold">{row.code}</span>}
                  />
                  <InfoTile
                    label="Type"
                    icon={<Building2 className="h-4 w-4" />}
                    tone="emerald"
                    value={<span className="text-sm font-semibold">{typeLabel(row.facilityType)}</span>}
                  />
                  <InfoTile
                    label="Status"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    tone="amber"
                    value={statusBadge(row.isActive)}
                  />
                  <InfoTile
                    label="Cost Center"
                    icon={<Building2 className="h-4 w-4" />}
                    tone="cyan"
                    value={<span className="font-mono text-sm">{row.costCenterCode ?? "-"}</span>}
                  />
                  <InfoTile
                    label="Operating Hours"
                    icon={<Clock className="h-4 w-4" />}
                    tone="zinc"
                    value={<span className="text-sm">{hoursLabel(row.operatingHours)}</span>}
                  />
                  <InfoTile
                    label="HOD"
                    icon={<User className="h-4 w-4" />}
                    tone="indigo"
                    value={<span className="text-sm">{row.headStaff?.name ?? "-"}</span>}
                  />
                  <InfoTile
                    label="Updated At"
                    icon={<History className="h-4 w-4" />}
                    tone="zinc"
                    value={<span className="text-sm">{fmtDateTime(row.updatedAt)}</span>}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Department Details</CardTitle>
                  <CardDescription>Overview, specialties, locations, operating hours and audit.</CardDescription>
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
                      value="specialties"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      Specialties
                    </TabsTrigger>
                    <TabsTrigger
                      value="locations"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Locations
                    </TabsTrigger>
                    <TabsTrigger
                      value="hours"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Hours
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-zc-border bg-zc-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zc-text">Basics</CardTitle>
                        <CardDescription className="text-zc-muted">Code, type, status, governance IDs.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Code</span>
                          <span className="font-mono text-zc-text">{row.code}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Name</span>
                          <span className="text-zc-text">{row.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Type</span>
                          <span className="text-zc-text">{row.facilityType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Status</span>
                          <span>{statusBadge(row.isActive)}</span>
                        </div>
                        <Separator className="bg-zc-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Cost center</span>
                          <span className="text-zc-text">{row.costCenterCode ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Parent dept</span>
                          <span className="font-mono text-zc-text">{row.parentDepartmentId ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zc-muted">Head staff</span>
                          <span className="text-zc-text">{row.headStaff?.name ?? "—"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-zc-border bg-zc-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zc-text">Extensions</CardTitle>
                        <CardDescription className="text-zc-muted">Phone extensions used for this department.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {Array.isArray(row.extensions) && row.extensions.length ? (
                          <div className="flex flex-wrap gap-2">
                            {row.extensions.map((x) => (
                              <Badge key={x} variant="neutral" className="font-mono">
                                {x}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-zc-muted">No extensions configured</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="specialties" className="mt-0">
                  <Card className="border-zc-border bg-zc-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zc-text">Specialties</CardTitle>
                      <CardDescription className="text-zc-muted">Specialties mapped to this department.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Array.isArray(row.specialties) && row.specialties.length ? (
                        <div className="space-y-2">
                          {row.specialties.map((s) => (
                            <div
                              key={s.specialtyId}
                              className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zc-text">
                                  {s.specialty.name} <span className="text-zc-muted">({s.specialty.code})</span>
                                </div>
                                <div className="text-xs text-zc-muted">
                                  Kind: {s.specialty.kind ?? "—"} · {s.specialty.isActive ? "Active" : "Inactive"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {s.isPrimary ? <Badge variant="accent">Primary</Badge> : null}
                                <Badge variant={s.specialty.isActive ? "success" : "warning"}>
                                  {s.specialty.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zc-muted">No specialties mapped</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="locations" className="mt-0">
                  <Card className="border-zc-border bg-zc-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zc-text">Locations</CardTitle>
                      <CardDescription className="text-zc-muted">Mapped locations (Floor/Zone/Area only).</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(row.locations) && row.locations.length ? (
                        <div className="overflow-x-auto rounded-xl border border-zc-border">
                          <table className="w-full text-sm">
                            <thead className="bg-zc-panel/10">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-zc-text">Kind</th>
                                <th className="px-3 py-2 text-left font-semibold text-zc-text">Code</th>
                                <th className="px-3 py-2 text-left font-semibold text-zc-text">Name</th>
                                <th className="px-3 py-2 text-left font-semibold text-zc-text">Primary</th>
                                <th className="px-3 py-2 text-left font-semibold text-zc-text">Active</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.locations.map((l) => {
                                const node = l.node ?? locIndex[l.locationNodeId];
                                const kind = node?.kind ?? l.kind ?? "—";
                                const invalid = kind === "CAMPUS" || kind === "BUILDING";
                                const isActive =
                                  typeof l.isActive === "boolean" ? l.isActive : typeof node?.isActive === "boolean" ? node.isActive : false;
                                return (
                                  <tr key={l.locationNodeId} className="border-t border-zc-border">
                                    <td className="px-3 py-2 text-zc-text">
                                      <div className="flex items-center gap-2">
                                        <span>{kind}</span>
                                        {invalid ? <Badge variant="warning">Invalid</Badge> : null}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-zc-text">{node?.code ?? "—"}</td>
                                    <td className="px-3 py-2 text-zc-text">{node?.name ?? l.locationNodeId ?? "—"}</td>
                                    <td className="px-3 py-2">
                                      {l.isPrimary ? <Badge variant="accent">Primary</Badge> : <span className="text-zc-muted">—</span>}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isActive ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm text-zc-muted">No locations mapped</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="hours" className="mt-0">
                  <Card className="border-zc-border bg-zc-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zc-text">Operating hours</CardTitle>
                      <CardDescription className="text-zc-muted">Human-friendly view (no JSON required).</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OperatingHoursView value={row.operatingHours} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                  <Card className="border-zc-border bg-zc-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zc-text">Audit</CardTitle>
                      <CardDescription className="text-zc-muted">Created/updated metadata.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Created</span>
                        <span className="font-mono text-zc-text">{new Date(row.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Updated</span>
                        <span className="font-mono text-zc-text">{new Date(row.updatedAt).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </>
        ) : null}
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
