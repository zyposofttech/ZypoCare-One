"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  ArrowLeft,
  DoorOpen,
  Loader2,
  RefreshCw,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type UnitResourceState = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED" | "INACTIVE";

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

type RoomDetail = {
  id: string;
  branchId: string;
  unitId: string;

  code: string;
  name: string;
  roomNumber?: string | null;

  roomType?: RoomType | null;

  // Physical
  areaSqFt?: number | null;
  hasAttachedBathroom?: boolean;
  hasAC?: boolean;
  hasTV?: boolean;
  hasOxygen?: boolean;
  hasSuction?: boolean;
  hasVentilator?: boolean;
  hasMonitor?: boolean;
  hasCallButton?: boolean;

  // Capacity
  maxOccupancy?: number | null;
  currentOccupancy?: number | null;

  // Pricing
  pricingTier?: PricingTier | null;
  baseChargePerDay?: number | string | null;

  // Isolation
  isIsolation?: boolean;
  isolationType?: IsolationType | null;

  // Status
  isActive: boolean;
  isAvailable?: boolean;
  maintenanceStatus?: MaintenanceStatus | null;
  lastCleanedAt?: string | null;

  // Metadata
  createdAt?: string;
  updatedAt?: string;

  unit?: { id: string; code: string; name: string } | null;
};

type ResourceRow = {
  id: string;
  unitId: string;
  roomId?: string | null;
  code?: string;
  name?: string;
  resourceType?: string;
  state: UnitResourceState;
  isActive: boolean;
};

/* --------------------------------- Const --------------------------------- */

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
const MAINT_STATUSES: MaintenanceStatus[] = [
  "OPERATIONAL",
  "UNDER_MAINTENANCE",
  "CLEANING_IN_PROGRESS",
  "BLOCKED",
  "OUT_OF_SERVICE",
];

const RESOURCE_STATES: UnitResourceState[] = ["AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED", "INACTIVE"];

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

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function stateBadge(state: UnitResourceState, count: number) {
  const base = "min-w-[74px] justify-center tabular-nums";
  if (state === "AVAILABLE") return <Badge className={cn("bg-emerald-600 text-white", base)}>AVL {count}</Badge>;
  if (state === "RESERVED") return <Badge className={cn("bg-indigo-600 text-white", base)}>RSV {count}</Badge>;
  if (state === "OCCUPIED") return <Badge className={cn("bg-rose-600 text-white", base)}>OCC {count}</Badge>;
  if (state === "CLEANING") return <Badge className={cn("bg-sky-600 text-white", base)}>CLN {count}</Badge>;
  if (state === "MAINTENANCE") return <Badge className={cn("bg-amber-600 text-white", base)}>MNT {count}</Badge>;
  if (state === "BLOCKED") return <Badge className={cn("bg-slate-600 text-white", base)}>BLK {count}</Badge>;
  return <Badge variant="secondary" className={cn(base)}>INA {count}</Badge>;
}

function yesNo(v?: boolean | null) {
  if (v === true) return <Badge className="bg-emerald-600 text-white">YES</Badge>;
  if (v === false) return <Badge variant="secondary">NO</Badge>;
  return <Badge variant="secondary">—</Badge>;
}

function roomTypeBadge(value?: RoomType | null) {
  if (!value) return <Badge variant="secondary">—</Badge>;
  return <Badge variant="neutral">{value}</Badge>;
}

function activeBadge(value?: boolean | null) {
  if (value === true) return <Badge variant="success">ACTIVE</Badge>;
  if (value === false) return <Badge variant="secondary">INACTIVE</Badge>;
  return <Badge variant="secondary">—</Badge>;
}

function availabilityBadge(value?: boolean | null) {
  if (value === true) return <Badge variant="ok">AVAILABLE</Badge>;
  if (value === false) return <Badge variant="secondary">UNAVAILABLE</Badge>;
  return <Badge variant="secondary">—</Badge>;
}

function maintenanceBadge(value?: MaintenanceStatus | null) {
  if (!value) return <Badge variant="secondary">—</Badge>;
  if (value === "OPERATIONAL") return <Badge variant="success">OPERATIONAL</Badge>;
  if (value === "UNDER_MAINTENANCE" || value === "CLEANING_IN_PROGRESS") return <Badge variant="warning">{value}</Badge>;
  if (value === "BLOCKED" || value === "OUT_OF_SERVICE") return <Badge variant="destructive">{value}</Badge>;
  return <Badge variant="secondary">{value}</Badge>;
}

function normalizeNumber(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

function toISOFromLocal(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
      <div className="text-right text-sm text-zc-text">{value}</div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function RoomDetailPage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { isReady, branchId, scope, reason } = useBranchContext();

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [room, setRoom] = React.useState<RoomDetail | null>(null);
  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  const [activeTab, setActiveTab] = React.useState<"overview" | "amenities" | "isolation" | "status" | "resources">("overview");

  // editor drawer
  const [openEdit, setOpenEdit] = React.useState(false);
  const [tab, setTab] = React.useState<"basic" | "amenities" | "capacity" | "pricing" | "isolation" | "status">("basic");
  const [modalErr, setModalErr] = React.useState<string | null>(null);

  // deactivate dialog
  const [openDeact, setOpenDeact] = React.useState(false);
  const [deactReason, setDeactReason] = React.useState("");
  const [deactCascade, setDeactCascade] = React.useState(true);

  // form state
  const [fName, setFName] = React.useState("");
  const [fRoomNumber, setFRoomNumber] = React.useState("");
  const [fRoomType, setFRoomType] = React.useState<string>("AUTO");

  const [fAreaSqFt, setFAreaSqFt] = React.useState("");
  const [fHasAttachedBathroom, setFHasAttachedBathroom] = React.useState(false);
  const [fHasAC, setFHasAC] = React.useState(false);
  const [fHasTV, setFHasTV] = React.useState(false);
  const [fHasOxygen, setFHasOxygen] = React.useState(false);
  const [fHasSuction, setFHasSuction] = React.useState(false);
  const [fHasVentilator, setFHasVentilator] = React.useState(false);
  const [fHasMonitor, setFHasMonitor] = React.useState(false);
  const [fHasCallButton, setFHasCallButton] = React.useState(false);

  const [fMaxOcc, setFMaxOcc] = React.useState("");
  const [fCurrentOcc, setFCurrentOcc] = React.useState("");

  const [fPricingTier, setFPricingTier] = React.useState<string>("AUTO");
  const [fBaseCharge, setFBaseCharge] = React.useState("");

  const [fIsIsolation, setFIsIsolation] = React.useState(false);
  const [fIsolationType, setFIsolationType] = React.useState<string>("AUTO");

  const [fIsAvailable, setFIsAvailable] = React.useState(true);
  const [fMaintStatus, setFMaintStatus] = React.useState<string>("AUTO");
  const [fLastCleanedAt, setFLastCleanedAt] = React.useState("");

  function hydrateForm(r: RoomDetail) {
    setFName(r.name ?? "");
    setFRoomNumber(r.roomNumber ?? "");
    setFRoomType(r.roomType ?? "AUTO");

    setFAreaSqFt(r.areaSqFt != null ? String(r.areaSqFt) : "");
    setFHasAttachedBathroom(!!r.hasAttachedBathroom);
    setFHasAC(!!r.hasAC);
    setFHasTV(!!r.hasTV);
    setFHasOxygen(!!r.hasOxygen);
    setFHasSuction(!!r.hasSuction);
    setFHasVentilator(!!(r as any).hasVentilator);
    setFHasMonitor(!!(r as any).hasMonitor);
    setFHasCallButton(!!(r as any).hasCallButton);

    setFMaxOcc(r.maxOccupancy != null ? String(r.maxOccupancy) : "");
    setFCurrentOcc(r.currentOccupancy != null ? String(r.currentOccupancy) : "");

    setFPricingTier(r.pricingTier ?? "AUTO");
    setFBaseCharge(r.baseChargePerDay != null ? String(r.baseChargePerDay) : "");

    setFIsIsolation(!!r.isIsolation);
    setFIsolationType(r.isolationType ?? "AUTO");

    setFIsAvailable(r.isAvailable ?? true);
    setFMaintStatus(r.maintenanceStatus ?? "AUTO");

    // input[type=datetime-local] expects "YYYY-MM-DDTHH:mm"
    if (r.lastCleanedAt) {
      const d = new Date(r.lastCleanedAt);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setFLastCleanedAt(val);
      } else {
        setFLastCleanedAt("");
      }
    } else {
      setFLastCleanedAt("");
    }
  }

  const countsByState = React.useMemo(() => {
    const rec: Record<UnitResourceState, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      MAINTENANCE: 0,
      BLOCKED: 0,
      INACTIVE: 0,
    };
    for (const r of resources) rec[r.state] = (rec[r.state] || 0) + 1;
    return rec;
  }, [resources]);

  const occupancyLabel = room
    ? `${room.currentOccupancy ?? 0} / ${room.maxOccupancy ?? 0}`
    : "—";
  const resourceCount = resources.length;

  async function load() {
    if (!id) return;

    if (scope === "GLOBAL" && !branchId) {
      setRoom(null);
      setResources([]);
      setErr(null);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const r = await apiFetch<RoomDetail>(`/api/infrastructure/rooms/${encodeURIComponent(id)}`, { showLoader: false });
      setRoom(r);

      // resources need unitId to avoid GLOBAL branch requirement
      if (r?.unitId) {
        const list = await apiFetch<ResourceRow[]>(
          `/api/infrastructure/resources?unitId=${encodeURIComponent(r.unitId)}&roomId=${encodeURIComponent(r.id)}&includeInactive=true`,
          { showLoader: false },
        );
        setResources(Array.isArray(list) ? list : []);
      } else {
        setResources([]);
      }
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Failed to load room";
      setErr(msg);
      setRoom(null);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isReady) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id, branchId]);

  async function saveEdit() {
    if (!room) return;
    setBusy(true);
    setModalErr(null);

    try {
      const name = String(fName || "").trim();
      if (!name) throw new Error("Room name is required");

      const maxOcc = normalizeNumber(fMaxOcc);
      const curOcc = normalizeNumber(fCurrentOcc);
      if (maxOcc != null && maxOcc < 1) throw new Error("maxOccupancy must be at least 1");
      if (curOcc != null && curOcc < 0) throw new Error("currentOccupancy cannot be negative");
      if (maxOcc != null && curOcc != null && curOcc > maxOcc) throw new Error("currentOccupancy cannot exceed maxOccupancy");

      const isIso = !!fIsIsolation;
      const isoType = fIsolationType === "AUTO" ? null : fIsolationType;
      if (isIso && !isoType) throw new Error("Isolation type is required when Isolation is enabled");

      const body: any = {
        name,
        roomNumber: String(fRoomNumber || "").trim() || null,
        roomType: fRoomType === "AUTO" ? null : fRoomType,

        areaSqFt: normalizeNumber(fAreaSqFt),
        hasAttachedBathroom: !!fHasAttachedBathroom,
        hasAC: !!fHasAC,
        hasTV: !!fHasTV,
        hasOxygen: !!fHasOxygen,
        hasSuction: !!fHasSuction,
        hasVentilator: !!fHasVentilator,
        hasMonitor: !!fHasMonitor,
        hasCallButton: !!fHasCallButton,

        maxOccupancy: maxOcc,
        currentOccupancy: curOcc,

        pricingTier: fPricingTier === "AUTO" ? null : fPricingTier,
        baseChargePerDay: normalizeNumber(fBaseCharge),

        isIsolation: isIso,
        isolationType: isoType,

        isAvailable: !!fIsAvailable,
        maintenanceStatus: fMaintStatus === "AUTO" ? null : fMaintStatus,
        lastCleanedAt: fLastCleanedAt ? toISOFromLocal(fLastCleanedAt) : null,
      };

      await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}`, {
        method: "PATCH",
        body,
      });

      toast({ title: "Room updated", description: "Room details have been saved." });
      setOpenEdit(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Save failed";
      setModalErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!room) return;
    setBusy(true);

    try {
      const r = String(deactReason || "").trim();
      if (!r) throw new Error("Deactivation reason is required");

      await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}/deactivate`, {
        method: "POST",
        body: { reason: r, cascade: !!deactCascade, hard: false },
      });

      toast({ title: "Room deactivated", description: "Room is inactive now (cascade applied if enabled)." });
      setOpenDeact(false);
      setDeactReason("");
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Deactivation failed";
      toast({ title: "Deactivation failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!room) return;
    setBusy(true);

    try {
      await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}`, {
        method: "PATCH",
        body: { isActive: true },
      });
      toast({ title: "Room activated", description: "Room is active again." });
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : typeof e?.message === "string" ? e.message : "Activation failed";
      toast({ title: "Activation failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Rooms">
      <RequirePerm perm="INFRA_ROOM_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" className="h-10" asChild>
                <Link href="/infrastructure/rooms">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
                <DoorOpen className="h-5 w-5 text-zc-accent" />
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold text-zc-text">
                  {loading ? "Room" : room ? `${room.code} • ${room.name}` : "Room"}
                </div>
                <div className="mt-0.5 text-sm text-zc-muted">View status, amenities, capacity and resources.</div>

                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to view room details."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => void load()}
                disabled={loading || busy || (scope === "GLOBAL" && !branchId)}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>

              {room ? (
                <>
                  <Button
                    className="h-10"
                    onClick={() => {
                      hydrateForm(room);
                      setModalErr(null);
                      setTab("basic");
                      setOpenEdit(true);
                    }}
                    disabled={busy}
                  >
                    <Settings2 className="h-4 w-4" />
                    Edit
                  </Button>

                  <Button
                    variant={room.isActive ? "destructive" : "success"}
                    className="h-10"
                    onClick={() => (room.isActive ? setOpenDeact(true) : void activate())}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : room.isActive ? (
                      <ToggleLeft className="h-4 w-4" />
                    ) : (
                      <ToggleRight className="h-4 w-4" />
                    )}
                    {room.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {err ? (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load room</CardTitle>
                    <CardDescription className="mt-1">{err}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : null}

          {/* Snapshot */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Snapshot</CardTitle>
                  <CardDescription>Status and key indicators.</CardDescription>
                </div>
                {room ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {roomTypeBadge(room.roomType ?? null)}
                    {activeBadge(room.isActive)}
                    {availabilityBadge(room.isAvailable)}
                    {maintenanceBadge(room.maintenanceStatus ?? null)}
                  </div>
                ) : (
                  <div className="text-sm text-zc-muted">—</div>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-6 pt-6">
              {loading ? (
                <div className="grid gap-3 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-full animate-pulse rounded-md bg-zc-panel/30" />
                  ))}
                </div>
              ) : !room ? (
                <div className="py-10 text-center text-sm text-zc-muted">Room not found.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoTile
                    label="Room Number"
                    tone="indigo"
                    value={<span className="font-mono">{room.roomNumber ?? "—"}</span>}
                  />
                  <InfoTile
                    label="Occupancy"
                    tone="emerald"
                    value={<span className="font-semibold tabular-nums">{occupancyLabel}</span>}
                  />
                  <InfoTile
                    label="Pricing Tier"
                    tone="cyan"
                    value={<span className="font-semibold">{room.pricingTier ?? "—"}</span>}
                  />
                  <InfoTile
                    label="Resources"
                    tone="zinc"
                    value={<span className="font-semibold tabular-nums">{resourceCount}</span>}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Room Details</CardTitle>
                  <CardDescription>Overview, amenities, isolation, status and resources.</CardDescription>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                    <TabsTrigger
                      value="overview"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="amenities"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Amenities
                    </TabsTrigger>
                    <TabsTrigger
                      value="isolation"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Isolation
                    </TabsTrigger>
                    <TabsTrigger
                      value="status"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Status
                    </TabsTrigger>
                    <TabsTrigger
                      value="resources"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Resources
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              {!room && loading ? (
                <div className="flex items-center gap-3 text-sm text-zc-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : !room ? (
                <div className="text-sm text-zc-muted">No room loaded.</div>
              ) : (
                <Tabs value={activeTab}>
                  <TabsContent value="overview" className="mt-0">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Identity</CardTitle>
                          <CardDescription>Codes and classification.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row label="Code" value={<span className="font-mono text-xs font-semibold text-zc-text">{room.code}</span>} />
                          <Row label="Name" value={<span className="font-semibold text-zc-text">{room.name}</span>} />
                          <Row label="Room Number" value={room.roomNumber ?? "—"} />
                          <Row label="Room Type" value={room.roomType ?? "—"} />
                          <Row
                            label="Unit"
                            value={room.unit ? `${room.unit.name} (${room.unit.code})` : room.unitId || "—"}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Operations</CardTitle>
                          <CardDescription>Availability, capacity and pricing.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row label="Status" value={activeBadge(room.isActive)} />
                          <Row label="Availability" value={availabilityBadge(room.isAvailable)} />
                          <Row label="Maintenance" value={maintenanceBadge(room.maintenanceStatus ?? null)} />
                          <Row label="Occupancy" value={<span className="font-semibold tabular-nums">{occupancyLabel}</span>} />
                          <Row label="Pricing Tier" value={room.pricingTier ?? "—"} />
                          <Row label="Base Charge" value={room.baseChargePerDay ?? "—"} />
                          <Row label="Last Cleaned" value={fmtDateTime(room.lastCleanedAt)} />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="amenities" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        ["Attached Bathroom", room.hasAttachedBathroom],
                        ["AC", room.hasAC],
                        ["TV", room.hasTV],
                        ["Oxygen", room.hasOxygen],
                        ["Suction", room.hasSuction],
                        ["Ventilator", (room as any).hasVentilator],
                        ["Monitor", (room as any).hasMonitor],
                        ["Call Button", (room as any).hasCallButton],
                      ].map(([label, val]) => (
                        <div
                          key={String(label)}
                          className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3"
                        >
                          <span className="text-sm text-zc-text">{label as any}</span>
                          {yesNo(val as any)}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="isolation" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Isolation Enabled</span>
                        {yesNo(room.isIsolation)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Isolation Type</span>
                        <span className="font-medium">{room.isolationType ?? "—"}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="status" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">isAvailable</span>
                        {yesNo(room.isAvailable)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Maintenance</span>
                        <span className="font-medium">{room.maintenanceStatus ?? "—"}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="resources" className="mt-0">
                    <div className="mt-4 grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        {RESOURCE_STATES.map((s) => (
                          <span key={s}>{stateBadge(s, countsByState[s] || 0)}</span>
                        ))}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-zc-border">
                        <table className="w-full text-sm">
                          <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Code</th>
                              <th className="px-4 py-3 text-left font-semibold">Name</th>
                              <th className="px-4 py-3 text-left font-semibold">Type</th>
                              <th className="px-4 py-3 text-left font-semibold">State</th>
                              <th className="px-4 py-3 text-left font-semibold">Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resources.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-sm text-zc-muted">
                                  No resources mapped to this room.
                                </td>
                              </tr>
                            ) : (
                              resources.map((rr) => (
                                <tr key={rr.id} className="border-t border-zc-border">
                                  <td className="px-4 py-3 font-mono text-xs">{rr.code ?? rr.id.slice(0, 8)}</td>
                                  <td className="px-4 py-3">{rr.name ?? "—"}</td>
                                  <td className="px-4 py-3">{rr.resourceType ?? "—"}</td>
                                  <td className="px-4 py-3">{stateBadge(rr.state, 1)}</td>
                                  <td className="px-4 py-3">{yesNo(rr.isActive)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Edit Drawer */}
          <Dialog
            open={openEdit}
            onOpenChange={(v) => {
              if (busy) return;
              if (!v) setModalErr(null);
              setOpenEdit(v);
            }}
          >
            <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Edit Room
                </DialogTitle>
                <DialogDescription>Update room fields and operational metadata.</DialogDescription>
              </DialogHeader>

              <Separator className="my-4" />

              {modalErr ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{modalErr}</div>
                </div>
              ) : null}

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 rounded-xl">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="capacity">Capacity</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="isolation">Isolation</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Room Name</Label>
                      <Input value={fName} onChange={(e) => setFName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Room Number</Label>
                        <Input value={fRoomNumber} onChange={(e) => setFRoomNumber(e.target.value)} placeholder="e.g. 101 / A-101" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Room Type</Label>
                        <Select value={fRoomType} onValueChange={setFRoomType}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">Auto / Keep Default</SelectItem>
                            {ROOM_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Area (sq ft)</Label>
                      <Input type="number" value={fAreaSqFt} onChange={(e) => setFAreaSqFt(e.target.value)} placeholder="e.g. 180" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="amenities" className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["Attached Bathroom", fHasAttachedBathroom, setFHasAttachedBathroom],
                      ["AC", fHasAC, setFHasAC],
                      ["TV", fHasTV, setFHasTV],
                      ["Oxygen", fHasOxygen, setFHasOxygen],
                      ["Suction", fHasSuction, setFHasSuction],
                      ["Ventilator", fHasVentilator, setFHasVentilator],
                      ["Monitor", fHasMonitor, setFHasMonitor],
                      ["Call Button", fHasCallButton, setFHasCallButton],
                    ].map(([label, val, setter]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3"
                      >
                        <div className="text-sm font-semibold text-zc-text">{label as any}</div>
                        <Switch checked={val as any} onCheckedChange={setter as any} />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="capacity" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Max Occupancy</Label>
                      <Input type="number" value={fMaxOcc} onChange={(e) => setFMaxOcc(e.target.value)} placeholder="e.g. 1 / 2 / 4" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Current Occupancy</Label>
                      <Input type="number" value={fCurrentOcc} onChange={(e) => setFCurrentOcc(e.target.value)} placeholder="e.g. 0 / 1" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Pricing Tier</Label>
                      <Select value={fPricingTier} onValueChange={setFPricingTier}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue placeholder="Select tier…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTO">Auto / None</SelectItem>
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
                      <Input type="number" value={fBaseCharge} onChange={(e) => setFBaseCharge(e.target.value)} placeholder="e.g. 2500" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="isolation" className="mt-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Isolation Enabled</div>
                        <div className="text-xs text-zc-muted">Enable special precautions for this room.</div>
                      </div>
                      <Switch checked={fIsIsolation} onCheckedChange={setFIsIsolation} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Isolation Type</Label>
                      <Select value={fIsolationType} onValueChange={setFIsolationType} disabled={!fIsIsolation}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue placeholder="Select isolation type…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTO">None / Auto</SelectItem>
                          {ISOLATION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!fIsIsolation ? <p className="text-[11px] text-zc-muted">Enable isolation to select a type.</p> : null}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="status" className="mt-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Available</div>
                        <div className="text-xs text-zc-muted">Runtime availability toggle.</div>
                      </div>
                      <Switch checked={fIsAvailable} onCheckedChange={setFIsAvailable} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Maintenance Status</Label>
                        <Select value={fMaintStatus} onValueChange={setFMaintStatus}>
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder="Select status…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">None / Auto</SelectItem>
                            {MAINT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Last Cleaned At</Label>
                        <Input type="datetime-local" value={fLastCleanedAt} onChange={(e) => setFLastCleanedAt(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void saveEdit()} disabled={busy}>
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

          {/* Deactivate Dialog */}
          <Dialog
            open={openDeact}
            onOpenChange={(v) => {
              if (busy) return;
              if (!v) {
                setDeactReason("");
                setDeactCascade(true);
              }
              setOpenDeact(v);
            }}
          >
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle>Deactivate Room</DialogTitle>
                <DialogDescription>
                  A reason is required. Optionally cascade deactivation to resources mapped to this room.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Reason</Label>
                  <Textarea value={deactReason} onChange={(e) => setDeactReason(e.target.value)} placeholder="e.g. Renovation / Ward closed / Maintenance…" />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-zc-text">Cascade to Resources</div>
                    <div className="text-xs text-zc-muted">Deactivate resources in this room automatically.</div>
                  </div>
                  <Switch checked={deactCascade} onCheckedChange={setDeactCascade} />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpenDeact(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => void deactivate()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Working…
                    </span>
                  ) : (
                    "Deactivate"
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
