"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
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

import { AlertTriangle, Building2, DoorOpen, Plus, RefreshCw, Settings2 } from "lucide-react";

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

const LS_KEY = "zc.superadmin.infrastructure.branchId";

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

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export default function SuperAdminRoomsPage() {
  const { toast } = useToast();
  const sp = useSearchParams();

  const initialUnitId = sp.get("unitId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [unitId, setUnitId] = React.useState<string | undefined>(undefined);

  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [q, setQ] = React.useState("");

  // Create Room modal state
  const [openCreate, setOpenCreate] = React.useState(false);
  const [cUnitId, setCUnitId] = React.useState<string | undefined>(undefined);
  const [cCode, setCCode] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cIsActive, setCIsActive] = React.useState(true);

  const initialAppliedRef = React.useRef(false);

  const selectedUnit = React.useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId]);

  const filteredRooms = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rooms;
    return rooms.filter((r) => (`${r.code} ${r.name}`).toLowerCase().includes(s));
  }, [rooms, q]);

  async function loadBranches() {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    setBranches(rows || []);

    const stored = readLS(LS_KEY);
    const first = rows?.[0]?.id;

    const next =
      (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_KEY, next);
  }

  async function loadUnits(bid: string) {
    const rows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(bid)}`);
    setUnits(rows || []);
  }

  async function loadRoomsForUnit(uid?: string) {
    if (!uid) {
      setRooms([]);
      return;
    }
    // ✅ FIX: rooms endpoint is unit-scoped in your backend
    const rows = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?unitId=${encodeURIComponent(uid)}`);
    setRooms(rows || []);
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      if (branchId) {
        await loadUnits(branchId);

        // apply initial unitId once (deep link)
        if (!initialAppliedRef.current && initialUnitId) {
          initialAppliedRef.current = true;
          setUnitId(initialUnitId);
        }

        await loadRoomsForUnit(unitId || initialUnitId);
      }

      if (showToast) toast({ title: "Refreshed", description: "Rooms loaded successfully." });
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

  React.useEffect(() => {
    if (!branchId) return;

    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        await loadUnits(branchId);
        // If unit no longer valid in this branch, clear selection
        if (unitId && !units.some((u) => u.id === unitId)) {
          setUnitId(undefined);
          setRooms([]);
        } else {
          await loadRoomsForUnit(unitId);
        }
      } catch (e: any) {
        setErr(e?.message || "Unable to load units.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    // When unit changes -> fetch rooms for that unit
    void (async () => {
      try {
        await loadRoomsForUnit(unitId);
      } catch (e: any) {
        setErr(e?.message || "Unable to load rooms.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  function resetCreate() {
    setCUnitId(undefined);
    setCCode("");
    setCName("");
    setCIsActive(true);
  }

  async function createRoom() {
    if (!cUnitId || !cCode.trim() || !cName.trim()) {
      toast({
        title: "Missing fields",
        description: "Unit, room code and name are required.",
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
          unitId: cUnitId,
          code: cCode.trim(),
          name: cName.trim(),
          isActive: cIsActive,
        }),
      });

      toast({ title: "Created", description: "Room created successfully." });
      setOpenCreate(false);
      resetCreate();

      // refresh list if it belongs to selected unit
      if (unitId === cUnitId) await loadRoomsForUnit(unitId);
    } catch (e: any) {
      const msg = e?.message || "Room creation failed.";
      setErr(msg);
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Rooms / Bays">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-zc-muted">
              <Link href="/superadmin/infrastructure" className="hover:underline">
                Infrastructure
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <span className="text-zc-text">Rooms / Bays</span>
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">Rooms / Bays</div>
            <div className="mt-2 text-sm text-zc-muted">
              Rooms are unit-scoped in your backend. Select Branch → Unit to view and manage rooms.
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
                <Button className="gap-2" disabled={!branchId || units.filter((u) => u.usesRooms).length === 0}>
                  <Plus className="h-4 w-4" />
                  Add Room
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Create Room</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Unit (rooms-enabled only)</Label>
                    <Select value={cUnitId} onValueChange={setCUnitId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select unit…" />
                      </SelectTrigger>
                      <SelectContent>
                        {units
                          .filter((u) => u.usesRooms)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} <span className="font-mono text-xs text-zc-muted">({u.code})</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Room Code</Label>
                    <Input value={cCode} onChange={(e) => setCCode(e.target.value)} placeholder="e.g. R01" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Room Name</Label>
                    <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Room 1" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div>
                      <div className="text-sm font-semibold text-zc-text">Active</div>
                      <div className="text-xs text-zc-muted">Backend enforces parent active rules.</div>
                    </div>
                    <Switch checked={cIsActive} onCheckedChange={setCIsActive} />
                  </div>
                </div>

                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createRoom()} disabled={busy || !cUnitId}>
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
              <DoorOpen className="h-5 w-5 text-zc-accent" />
              Rooms
            </CardTitle>
            <CardDescription>Select a Unit to load rooms. Search is client-side.</CardDescription>
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
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch</div>
                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        writeLS(LS_KEY, v);
                        setUnitId(undefined);
                        setRooms([]);
                        setQ("");
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

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Unit</div>
                    <Select value={unitId} onValueChange={setUnitId}>
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
                    {selectedUnit && !selectedUnit.usesRooms ? (
                      <div className="text-xs text-amber-700 dark:text-amber-200">
                        Selected unit is open-bay (usesRooms=false). It will not have rooms.
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Search</div>
                    <input
                      className="h-11 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Search room code/name…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      disabled={!unitId || rooms.length === 0}
                    />
                  </div>
                </div>

                {!unitId ? (
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                    Select a Unit to load rooms.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zc-border">
                    <table className="w-full text-sm">
                      <thead className="bg-zc-panel/20 text-xs uppercase tracking-wide text-zc-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Active</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRooms.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-zc-muted">
                              No rooms found.
                            </td>
                          </tr>
                        ) : (
                          filteredRooms.map((r) => (
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
                              <td className="px-3 py-2 text-right">
                                <Button asChild variant="outline" className="gap-2">
                                  <Link
                                    href={`/superadmin/infrastructure/resources?unitId=${encodeURIComponent(
                                      r.unitId
                                    )}&roomId=${encodeURIComponent(r.id)}`}
                                  >
                                    <Settings2 className="h-4 w-4" />
                                    View Resources
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-xs text-zc-muted">
                  “Bays” in current model means open-bay units where resources have <span className="font-mono">roomId = null</span>.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
