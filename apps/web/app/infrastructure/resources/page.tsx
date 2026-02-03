"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { AlertTriangle, BedDouble, Building2, Plus, RefreshCw, Wrench } from "lucide-react";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

type BranchRow = { id: string; code: string; name: string; city: string };

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

  resourceType: string;
  code: string;
  name: string;

  state: string;
  isActive: boolean;
  schedulable?: boolean;

  unit?: { id: string; code: string; name: string; usesRooms: boolean };
  room?: { id: string; code: string; name: string };
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

const RESOURCE_STATES = ["AVAILABLE", "OCCUPIED", "CLEANING", "OUT_OF_SERVICE", "RESERVED"] as const;

export default function SuperAdminResourcesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const sp = useSearchParams();

  const initialUnitId = sp.get("unitId") || undefined;
  const initialRoomId = sp.get("roomId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [unitId, setUnitId] = React.useState<string | undefined>(undefined);

  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [roomId, setRoomId] = React.useState<string | undefined>(undefined);

  const [state, setState] = React.useState<string | undefined>(undefined);
  const [resourceType, setResourceType] = React.useState<string>("");
  const [q, setQ] = React.useState<string>("");

  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  // Create modal
  const [openCreate, setOpenCreate] = React.useState(false);
  const [cUnitId, setCUnitId] = React.useState<string | undefined>(undefined);
  const [cRoomId, setCRoomId] = React.useState<string | undefined>(undefined);
  const [cType, setCType] = React.useState("BED");
  const [cCode, setCCode] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cState, setCState] = React.useState<string>("AVAILABLE");
  const [cIsActive, setCIsActive] = React.useState(true);
  const [cSchedulable, setCSchedulable] = React.useState(false);

  const initialAppliedRef = React.useRef(false);

  const selectedUnit = React.useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId]);
  const selectedCreateUnit = React.useMemo(() => units.find((u) => u.id === cUnitId) || null, [units, cUnitId]);

  async function loadBranches() {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    const list = rows || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const first = list[0]?.id;

    const next =
      (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) if (isGlobalScope) setActiveBranchId(next || null);
}

  async function loadUnitsOnly(bid: string) {
    const rows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(bid)}`);
    setUnits(rows || []);
  }

  async function loadRoomsForUnit(uid?: string) {
    if (!uid) {
      setRooms([]);
      return;
    }
    // IMPORTANT: your backend rooms listing is unit-scoped
    const rows = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?unitId=${encodeURIComponent(uid)}`);
    setRooms(rows || []);
  }

  async function loadResources() {
    // ✅ FIX: backend seems to require unitId; do not call with only branchId
    if (!branchId || !unitId) {
      setResources([]);
      return;
    }

    const params = new URLSearchParams();
    params.set("branchId", branchId);
    params.set("unitId", unitId);
    if (roomId) params.set("roomId", roomId);
    if (state) params.set("state", state);
    if (resourceType.trim()) params.set("resourceType", resourceType.trim());
    if (q.trim()) params.set("q", q.trim());

    const rows = await apiFetch<ResourceRow[]>(`/api/infrastructure/resources?${params.toString()}`);
    setResources(rows || []);
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      if (branchId) {
        await loadUnitsOnly(branchId);

        // Apply deep link once
        if (!initialAppliedRef.current) {
          initialAppliedRef.current = true;
          if (initialUnitId) setUnitId(initialUnitId);
          if (initialRoomId) setRoomId(initialRoomId);
        }
      }

      // If we already have a unit selected (or deep link), load rooms/resources
      const effectiveUnitId = unitId || initialUnitId;
      if (effectiveUnitId) {
        await loadRoomsForUnit(effectiveUnitId);
      }
      await loadResources();

      if (showToast) toast({ title: "Refreshed", description: "Resources loaded successfully." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed.";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branch change -> reload units and reset filters
  React.useEffect(() => {
    if (!branchId) return;

    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        await loadUnitsOnly(branchId);

        // reset unit/room selection when branch changes
        setUnitId(undefined);
        setRoomId(undefined);
        setRooms([]);
        setResources([]);
      } catch (e: any) {
        setErr(e?.message || "Unable to load units.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Unit change -> load rooms (if applicable) and resources
  React.useEffect(() => {
    if (!unitId) {
      setRoomId(undefined);
      setRooms([]);
      setResources([]);
      return;
    }

    const u = units.find((x) => x.id === unitId);
    if (!u) return;

    if (!u.usesRooms) {
      setRoomId(undefined);
      setRooms([]);
      void loadResources();
      return;
    }

    void (async () => {
      try {
        await loadRoomsForUnit(unitId);
        // If deep link roomId is invalid for this unit, clear it
        if (roomId && !rooms.some((r) => r.id === roomId)) setRoomId(undefined);
        await loadResources();
      } catch (e: any) {
        setErr(e?.message || "Unable to load rooms/resources.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  // Filter changes -> reload resources (debounced)
  React.useEffect(() => {
    if (!branchId || !unitId) return;
    const t = setTimeout(() => void loadResources().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, state, resourceType, q]);

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

  function resetCreate() {
    setCUnitId(undefined);
    setCRoomId(undefined);
    setCType("BED");
    setCCode("");
    setCName("");
    setCState("AVAILABLE");
    setCIsActive(true);
    setCSchedulable(false);
  }

  async function createResource() {
    if (!cUnitId || !cType.trim() || !cCode.trim() || !cName.trim()) {
      toast({
        title: "Missing fields",
        description: "Unit, type, code and name are required.",
        variant: "destructive" as any,
      });
      return;
    }

    const u = units.find((x) => x.id === cUnitId);
    if (!u) {
      toast({ title: "Invalid unit", description: "Please select a valid unit.", variant: "destructive" as any });
      return;
    }

    if (u.usesRooms && !cRoomId) {
      toast({
        title: "Room required",
        description: "This unit uses rooms; select a room for the resource.",
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
          unitId: cUnitId,
          roomId: u.usesRooms ? cRoomId : null,
          resourceType: cType.trim(),
          code: cCode.trim(),
          name: cName.trim(),
          state: cState,
          isActive: cIsActive,
          schedulable: cSchedulable,
        }),
      });

      toast({ title: "Created", description: "Resource created successfully." });
      setOpenCreate(false);
      resetCreate();

      // refresh list if we are currently viewing the same unit
      if (unitId === cUnitId) await loadResources();
    } catch (e: any) {
      const msg = e?.message || "Resource creation failed.";
      setErr(msg);
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Resources">
      <RequirePerm perm="INFRA_RESOURCE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-zc-muted">
              <Link href="/infrastructure" className="hover:underline">
                Infrastructure
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <span className="text-zc-text">Resources</span>
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">Resources</div>
            <div className="mt-2 text-sm text-zc-muted">
              Backend resources listing is currently unit-scoped. Select Branch → Unit to load resources.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void refreshAll(true)}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>

            <Dialog
              open={openCreate}
              onOpenChange={(v) => {
                setOpenCreate(v);
                if (!v) resetCreate();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!branchId}>
                  <Plus className="h-4 w-4" />
                  Add Resource
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Resource</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Unit</Label>
                    <Select
                      value={cUnitId}
                      onValueChange={(v) => {
                        setCUnitId(v);
                        setCRoomId(undefined);
                        const u = units.find((x) => x.id === v);
                        if (u?.usesRooms) void loadRoomsForUnit(v);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select unit…" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} <span className="font-mono text-xs text-zc-muted">({u.code})</span>{" "}
                            {!u.usesRooms ? <span className="text-xs text-amber-700">• open-bay</span> : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCreateUnit?.usesRooms ? (
                    <div className="grid gap-2">
                      <Label>Room</Label>
                      <Select value={cRoomId} onValueChange={setCRoomId}>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select room…" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} <span className="font-mono text-xs text-zc-muted">({r.code})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label>Resource Type</Label>
                    <Input value={cType} onChange={(e) => setCType(e.target.value)} placeholder="e.g. BED / OT_TABLE" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input value={cCode} onChange={(e) => setCCode(e.target.value)} placeholder="e.g. B01" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Bed 1" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Initial State</Label>
                    <Select value={cState} onValueChange={setCState}>
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Active</div>
                        <div className="text-xs text-zc-muted">Backend enforces parent active constraints.</div>
                      </div>
                      <Switch checked={cIsActive} onCheckedChange={setCIsActive} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                        <div className="text-xs text-zc-muted">Enable for schedulable resources (e.g., OT table).</div>
                      </div>
                      <Switch checked={cSchedulable} onCheckedChange={setCSchedulable} />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createResource()} disabled={busy || !cUnitId}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-zc-accent" />
              Resources
            </CardTitle>
            <CardDescription>Select a Unit to load resources. Update state inline.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {loading ? (
              <div className="grid gap-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Filters */}
                <div className="grid gap-3 lg:grid-cols-6">
                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch</div>
                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        if (isGlobalScope) setActiveBranchId(v || null);
setErr(null);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue placeholder="Select branch…" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>{" "}
                            <span className="text-xs text-zc-muted">• {b.city}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Unit</div>
                    <Select
                      value={unitId}
                      onValueChange={(v) => {
                        setUnitId(v);
                        setRoomId(undefined);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select unit…" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} <span className="font-mono text-xs text-zc-muted">({u.code})</span>{" "}
                            {!u.usesRooms ? <span className="text-xs text-amber-700">• open-bay</span> : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room</div>
                    <Select
                      value={roomId}
                      onValueChange={setRoomId}
                      disabled={!unitId || !selectedUnit?.usesRooms}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder={selectedUnit?.usesRooms ? "All rooms" : "Open-bay / not applicable"} />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} <span className="font-mono text-xs text-zc-muted">({r.code})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">State</div>
                    <Select value={state} onValueChange={setState} disabled={!unitId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Any state" />
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

                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Type</div>
                    <Input
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      placeholder="e.g. BED"
                      className="h-11 rounded-xl"
                      disabled={!unitId}
                    />
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Search</div>
                    <input
                      className="h-11 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Search code/name…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      disabled={!unitId}
                    />
                  </div>
                </div>

                {!unitId ? (
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                    Select a Unit to load resources. (Your backend currently returns 500 if only branchId is provided.)
                  </div>
                ) : (
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
                              No resources found.
                            </td>
                          </tr>
                        ) : (
                          resources.map((r) => (
                            <tr key={r.id} className="border-t border-zc-border">
                              <td className="px-3 py-2 font-mono text-xs">{r.resourceType}</td>
                              <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                              <td className="px-3 py-2">{r.name}</td>
                              <td className="px-3 py-2">
                                {r.roomId ? (
                                  <span className="text-zc-text">
                                    {rooms.find((x) => x.id === r.roomId)?.name || r.room?.name || "—"}
                                  </span>
                                ) : (
                                  <span className="text-zc-muted">Open-bay</span>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                <Select value={r.state} onValueChange={(v) => void updateResourceState(r.id, v)}>
                                  <SelectTrigger className="h-9 w-[190px] rounded-xl">
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
                                <span className="font-mono text-xs">{String(!!r.schedulable)}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3 text-xs text-zc-muted">
                  <Wrench className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">
                    State transitions are enforced by backend rules. Invalid transitions will show toast errors.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
          </RequirePerm>
</AppShell>
  );
}
