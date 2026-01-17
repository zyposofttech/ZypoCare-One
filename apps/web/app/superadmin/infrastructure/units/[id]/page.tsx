"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// ✅ Make sure you have this component available (as we shared earlier)
import { LocationNodePicker } from "@/components/infrastructure/LocationNodePicker";

import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  DoorOpen,
  MapPin,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";

/**
 * Location Tree types (minimal; compatible with your /locations/tree payload)
 */
type LocationNode = {
  id: string;
  type: "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
  code: string;
  name: string;
  isActive: boolean;
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};

type LocationTree = { campuses: LocationNode[] };

function nodeLabel(n: LocationNode) {
  return `${n.name} (${n.code})`;
}

function buildLocationLabelMap(tree: LocationTree | null): Record<string, string> {
  if (!tree?.campuses?.length) return {};
  const out: Record<string, string> = {};

  function walk(n: LocationNode, path: LocationNode[]) {
    const next = [...path, n];

    // only store labels for floor + zone (we only need these for units)
    if (n.type === "FLOOR" || n.type === "ZONE") {
      out[n.id] = next.map(nodeLabel).join(" / ");
    }

    for (const b of n.buildings || []) walk(b, next);
    for (const f of n.floors || []) walk(f, next);
    for (const z of n.zones || []) walk(z, next);
  }

  for (const c of tree.campuses) walk(c, []);
  return out;
}

/**
 * Page data types
 */
type UnitDetail = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;

  // ✅ NEW (backend model field)
  locationNodeId?: string | null;

  // These may or may not be present depending on your backend includes
  department?: { id: string; code: string; name: string };
  unitType?: { id: string; code: string; name: string; usesRoomsDefault?: boolean; schedulableByDefault?: boolean };
};

type RoomRow = {
  id: string;
  unitId: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type ResourceRow = {
  id: string;
  unitId: string;
  roomId?: string | null;
  branchId: string;

  resourceType: string; // e.g. BED / OT_TABLE / CHAIR
  code: string;
  name: string;

  state: string; // AVAILABLE / OCCUPIED / CLEANING / MAINTENANCE / INACTIVE
  isActive: boolean;

  // ✅ match backend DTO
  isSchedulable?: boolean;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

// ✅ Match backend SetResourceStateDto enum
const RESOURCE_STATES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "INACTIVE"] as const;

export default function UnitDetailPage({ params }: { params: { id: string } }) {
  const unitId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [unit, setUnit] = React.useState<UnitDetail | null>(null);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  const [tab, setTab] = React.useState<"rooms" | "resources">("rooms");

  // Location tree + label map
  const [locBusy, setLocBusy] = React.useState(false);
  const [locTree, setLocTree] = React.useState<LocationTree | null>(null);
  const [locLabelMap, setLocLabelMap] = React.useState<Record<string, string>>({});
  const [locBranchId, setLocBranchId] = React.useState<string | null>(null);

  // Change Location dialog
  const [openLoc, setOpenLoc] = React.useState(false);
  const [nextLocationNodeId, setNextLocationNodeId] = React.useState<string | undefined>(undefined);

  // Create Room modal
  const [openRoom, setOpenRoom] = React.useState(false);
  const [rCode, setRCode] = React.useState("");
  const [rName, setRName] = React.useState("");
  const [rIsActive, setRIsActive] = React.useState(true);

  // Create Resource modal
  const [openRes, setOpenRes] = React.useState(false);
  const [resRoomId, setResRoomId] = React.useState<string | undefined>(undefined);
  const [resType, setResType] = React.useState("BED");
  const [resCode, setResCode] = React.useState("");
  const [resName, setResName] = React.useState("");
  const [resState, setResState] = React.useState<string>("AVAILABLE");
  const [resIsActive, setResIsActive] = React.useState(true);
  const [resIsSchedulable, setResIsSchedulable] = React.useState(false);

  async function loadLocations(branchId: string) {
    if (!branchId) return;
    if (locBranchId === branchId && Object.keys(locLabelMap).length) return;

    setLocBusy(true);
    try {
      const t = await apiFetch<LocationTree>(
        `/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`
      );
      setLocTree(t);
      setLocLabelMap(buildLocationLabelMap(t));
      setLocBranchId(branchId);
    } catch (e: any) {
      // Non-blocking: page should still work
      setLocTree(null);
      setLocLabelMap({});
      setLocBranchId(branchId);
    } finally {
      setLocBusy(false);
    }
  }

  async function loadRoomsIfNeeded(u: UnitDetail | null) {
    if (!u?.usesRooms) {
      setRooms([]);
      return;
    }
    const rows = await apiFetch<RoomRow[]>(
      `/api/infrastructure/rooms?unitId=${encodeURIComponent(unitId)}`
    );
    setRooms(rows || []);
  }

  async function loadResources() {
    const rows = await apiFetch<ResourceRow[]>(
      `/api/infrastructure/resources?unitId=${encodeURIComponent(unitId)}`
    );
    setResources(rows || []);
  }

  async function refresh(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      const u = await apiFetch<UnitDetail>(`/api/infrastructure/units/${encodeURIComponent(unitId)}`);
      setUnit(u);
      setTab(u?.usesRooms ? "rooms" : "resources");

      if (u?.branchId) await loadLocations(u.branchId);

      await Promise.all([loadRoomsIfNeeded(u), loadResources()]);
      if (showToast) toast({ title: "Refreshed", description: "Loaded latest unit configuration." });
    } catch (e: any) {
      const msg = e?.message || "Unable to load unit details.";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  function resetRoomForm() {
    setRCode("");
    setRName("");
    setRIsActive(true);
  }

  async function createRoom() {
    if (!unit) return;
    if (!unit.usesRooms) {
      toast({
        title: "Not allowed",
        description: "This unit is open-bay (usesRooms=false).",
        variant: "destructive" as any,
      });
      return;
    }
    if (!rCode.trim() || !rName.trim()) {
      toast({
        title: "Missing fields",
        description: "Room code and name are required.",
        variant: "destructive" as any,
      });
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/api/infrastructure/rooms", {
        method: "POST",
        body: JSON.stringify({
          unitId: unit.id,
          code: rCode.trim(),
          name: rName.trim(),
          isActive: rIsActive,
        }),
      });

      toast({ title: "Created", description: "Room created successfully." });
      setOpenRoom(false);
      resetRoomForm();
      await loadRoomsIfNeeded(unit);
    } catch (e: any) {
      const msg = e?.message || "Room creation failed.";
      setErr(msg);
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  function resetResourceForm(u: UnitDetail | null) {
    setResRoomId(undefined);
    setResType("BED");
    setResCode("");
    setResName("");
    setResState("AVAILABLE");
    setResIsActive(true);
    setResIsSchedulable(Boolean(u?.unitType?.schedulableByDefault));
  }

  async function createResource() {
    if (!unit) return;

    if (!resCode.trim() || !resName.trim() || !resType.trim()) {
      toast({
        title: "Missing fields",
        description: "Resource type, code, and name are required.",
        variant: "destructive" as any,
      });
      return;
    }

    if (unit.usesRooms && !resRoomId) {
      toast({
        title: "Missing room",
        description: "Select a room for this unit.",
        variant: "destructive" as any,
      });
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      await apiFetch("/api/infrastructure/resources", {
        method: "POST",
        body: JSON.stringify({
          unitId: unit.id,
          roomId: unit.usesRooms ? resRoomId : null,
          resourceType: resType.trim(),
          code: resCode.trim(),
          name: resName.trim(),
          state: resState,
          isActive: resIsActive,
          // ✅ backend expects isSchedulable
          isSchedulable: resIsSchedulable,
        }),
      });

      toast({ title: "Created", description: "Resource created successfully." });
      setOpenRes(false);
      resetResourceForm(unit);
      await loadResources();
    } catch (e: any) {
      const msg = e?.message || "Resource creation failed.";
      setErr(msg);
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function updateResourceState(resourceId: string, nextState: string) {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resourceId)}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: nextState }),
      });

      toast({ title: "Updated", description: "Resource state updated." });
      await loadResources();
    } catch (e: any) {
      const msg = e?.message || "State update failed.";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function saveLocationBinding() {
    if (!unit) return;

    if (!nextLocationNodeId) {
      toast({
        title: "Missing location",
        description: "Select a Zone (recommended) or Floor.",
        variant: "destructive" as any,
      });
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/infrastructure/units/${encodeURIComponent(unit.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ locationNodeId: nextLocationNodeId }),
      });

      toast({ title: "Updated", description: "Unit location updated successfully." });
      setOpenLoc(false);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Location update failed.";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  const locationLabel =
    unit?.locationNodeId && locLabelMap[unit.locationNodeId]
      ? locLabelMap[unit.locationNodeId]
      : unit?.locationNodeId
      ? `Linked (ID: ${unit.locationNodeId})`
      : null;

  return (
    <AppShell title="Infrastructure • Unit Details">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm text-zc-muted">
              <Link href="/superadmin/infrastructure" className="hover:underline">
                Infrastructure
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <Link href="/superadmin/infrastructure/units" className="hover:underline">
                Units
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <span className="text-zc-text">Details</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-semibold tracking-tight">
                {unit ? unit.name : "Unit Details"}
              </div>
              {unit ? (
                <span className="rounded-full border border-zc-border bg-zc-panel/20 px-3 py-1 text-xs font-mono text-zc-muted">
                  {unit.code}
                </span>
              ) : null}
              {unit ? (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    unit.isActive
                      ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-zc-border bg-zc-panel/20 text-zc-muted"
                  )}
                >
                  {unit.isActive ? "Active" : "Inactive"}
                </span>
              ) : null}
            </div>

            {unit ? (
              <div className="mt-2 text-sm text-zc-muted">
                Department: <span className="font-semibold text-zc-text">{unit.department?.name || "—"}</span>{" "}
                • Unit Type: <span className="font-semibold text-zc-text">{unit.unitType?.name || "—"}</span>{" "}
                • usesRooms: <span className="font-mono">{String(unit.usesRooms)}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void refresh(true)}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ✅ Location Binding Card */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-zc-accent" />
                Location Binding
              </CardTitle>
              <CardDescription>
                Unit must be tagged to a Zone (recommended) or Floor. Rooms/resources inherit location via Unit.
              </CardDescription>
            </div>

            <Dialog
              open={openLoc}
              onOpenChange={(v) => {
                setOpenLoc(v);
                if (v) setNextLocationNodeId(unit?.locationNodeId || undefined);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!unit || busy}
                  className="gap-2"
                >
                  Change Location
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Change Unit Location</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-zc-muted">Current</div>
                    <div className="mt-1 font-medium text-zc-text">
                      {locationLabel ? locationLabel : <span className="text-amber-700 dark:text-amber-200">Not linked yet</span>}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>New Location (Zone / Floor)</Label>
                    <LocationNodePicker
                      branchId={unit?.branchId}
                      value={nextLocationNodeId}
                      onValueChange={setNextLocationNodeId}
                      placeholder="Select Zone (recommended) or Floor…"
                      allowTypes={["ZONE", "FLOOR"]}
                    />
                    {locBusy ? (
                      <div className="text-xs text-zc-muted">Loading location tree…</div>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setOpenLoc(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void saveLocationBinding()} disabled={busy || !unit}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {loading ? (
              <div className="grid gap-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : unit ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                  <div className="text-sm text-zc-muted">Linked location:</div>
                  <div className="text-sm font-semibold text-zc-text">
                    {locationLabel ? locationLabel : <span className="text-amber-700 dark:text-amber-200">Not linked</span>}
                  </div>
                </div>

                {!unit.locationNodeId ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="min-w-0">
                      This unit has no location binding. Create/update will be incomplete until you link a Zone/Floor.
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-zc-muted">Unit not found.</div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!unit?.usesRooms}
            onClick={() => setTab("rooms")}
            className={cn(
              "gap-2",
              tab === "rooms" ? "bg-zc-accent text-white hover:bg-zc-accent/90 border-transparent" : ""
            )}
          >
            <DoorOpen className="h-4 w-4" />
            Rooms
          </Button>

          <Button
            variant="outline"
            onClick={() => setTab("resources")}
            className={cn(
              "gap-2",
              tab === "resources" ? "bg-zc-accent text-white hover:bg-zc-accent/90 border-transparent" : ""
            )}
          >
            <BedDouble className="h-4 w-4" />
            Resources
          </Button>
        </div>

        {/* Rooms */}
        {tab === "rooms" ? (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="h-5 w-5 text-zc-accent" />
                  Rooms
                </CardTitle>
                <CardDescription>Rooms are enabled only when usesRooms=true.</CardDescription>
              </div>

              <Dialog
                open={openRoom}
                onOpenChange={(v) => {
                  setOpenRoom(v);
                  if (!v) resetRoomForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2" disabled={!unit?.usesRooms}>
                    <Plus className="h-4 w-4" />
                    Add Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Room</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Room Code</Label>
                      <Input value={rCode} onChange={(e) => setRCode(e.target.value)} placeholder="e.g. R101 or 101" />
                      <div className="text-xs text-zc-muted">
                        Backend requires numeric (101) or R-prefixed (R101) codes.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Room Name</Label>
                      <Input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="e.g. Room 1" />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Active</div>
                        <div className="text-xs text-zc-muted">Cannot create an active room under an inactive unit.</div>
                      </div>
                      <Switch checked={rIsActive} onCheckedChange={setRIsActive} />
                    </div>
                  </div>

                  <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={() => setOpenRoom(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => void createRoom()} disabled={busy}>
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              ) : !unit?.usesRooms ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                  This unit is open-bay (usesRooms=false). Rooms are not applicable.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zc-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs uppercase tracking-wide text-zc-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Code</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-zc-muted">
                            No rooms created yet.
                          </td>
                        </tr>
                      ) : (
                        rooms.map((r) => (
                          <tr key={r.id} className="border-t border-zc-border">
                            <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-xs",
                                  r.isActive
                                    ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                    : "border-zc-border bg-zc-panel/20 text-zc-muted"
                                )}
                              >
                                {r.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Resources */}
        {tab === "resources" ? (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-zc-accent" />
                  Resources
                </CardTitle>
                <CardDescription>
                  Beds/OT tables/Chairs etc. Update state directly; transitions are validated by backend.
                </CardDescription>
              </div>

              <Dialog
                open={openRes}
                onOpenChange={(v) => {
                  setOpenRes(v);
                  if (!v) resetResourceForm(unit);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2" disabled={!unit}>
                    <Plus className="h-4 w-4" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Add Resource</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    {unit?.usesRooms ? (
                      <div className="grid gap-2">
                        <Label>Room</Label>
                        <Select value={resRoomId} onValueChange={setResRoomId}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select room…" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}{" "}
                                <span className="font-mono text-xs text-zc-muted">({r.code})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rooms.length === 0 ? (
                          <div className="text-xs text-amber-700 dark:text-amber-200">
                            No rooms exist. Create a room first.
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-2">
                      <Label>Resource Type</Label>
                      <Input value={resType} onChange={(e) => setResType(e.target.value)} placeholder="e.g. BED" />
                      <div className="text-xs text-zc-muted">
                        Use BED / OT_TABLE / CHAIR etc (as per backend enum).
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Code</Label>
                      <Input value={resCode} onChange={(e) => setResCode(e.target.value)} placeholder="e.g. B01" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="e.g. Bed 1" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Initial State</Label>
                      <Select value={resState} onValueChange={setResState}>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select state…" />
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

                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Active</div>
                        <div className="text-xs text-zc-muted">
                          Cannot create an active resource under inactive parent(s).
                        </div>
                      </div>
                      <Switch checked={resIsActive} onCheckedChange={setResIsActive} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                        <div className="text-xs text-zc-muted">
                          Enable for schedulable resources as per unit type policy.
                        </div>
                      </div>
                      <Switch checked={resIsSchedulable} onCheckedChange={setResIsSchedulable} />
                    </div>
                  </div>

                  <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={() => setOpenRes(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void createResource()}
                      disabled={busy || (unit?.usesRooms ? rooms.length === 0 : false)}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="overflow-hidden rounded-xl border border-zc-border">
                    <table className="w-full text-sm">
                      <thead className="bg-zc-panel/20 text-xs uppercase tracking-wide text-zc-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Room</th>
                          <th className="px-3 py-2 text-left">State</th>
                          <th className="px-3 py-2 text-left">Active</th>
                          <th className="px-3 py-2 text-left">Schedulable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resources.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-zc-muted">
                              No resources created yet.
                            </td>
                          </tr>
                        ) : (
                          resources.map((r) => (
                            <tr key={r.id} className="border-t border-zc-border">
                              <td className="px-3 py-2 font-mono text-xs">{r.resourceType}</td>
                              <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                              <td className="px-3 py-2">{r.name}</td>

                              <td className="px-3 py-2">
                                {unit?.usesRooms ? (
                                  <span className="text-sm">
                                    {rooms.find((x) => x.id === r.roomId)?.name || (
                                      <span className="text-zc-muted">—</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-zc-muted">Open-bay</span>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                <Select value={r.state} onValueChange={(v) => void updateResourceState(r.id, v)}>
                                  <SelectTrigger className="h-9 w-[200px] rounded-xl">
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
                              </td>

                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-xs",
                                    r.isActive
                                      ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                      : "border-zc-border bg-zc-panel/20 text-zc-muted"
                                  )}
                                >
                                  {r.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>

                              <td className="px-3 py-2">
                                <span className="font-mono text-xs">{String(!!r.isSchedulable)}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-xs text-zc-muted">
                    <Wrench className="mt-0.5 h-4 w-4" />
                    <div className="min-w-0">
                      State transitions are validated in backend. If an update fails, the error will be shown as a toast.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
