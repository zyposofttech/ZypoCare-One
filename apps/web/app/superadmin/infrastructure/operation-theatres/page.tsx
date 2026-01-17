"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth/store";

import { IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, RefreshCw, Scissors, Trash2, Wand2 } from "lucide-react";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
};

type UnitTypeCatalog = {
  id: string;
  code: string;
  name: string;
  usesRoomsDefault: boolean;
  schedulableByDefault: boolean;
};

type BranchUnitTypeLink = {
  id: string;
  unitTypeId: string;
  isEnabled: boolean;
  enabledAt?: string | null;
  unitType: UnitTypeCatalog;
};

type Department = {
  id: string;
  code: string;
  name: string;
};

type Unit = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;
  department?: { id: string; code: string; name: string } | null;
  unitType?: { id: string; code: string; name: string } | null;
};

type UnitRoom = {
  id: string;
  branchId: string;
  unitId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type UnitResource = {
  id: string;
  branchId: string;
  unitId: string;
  roomId?: string | null;
  resourceType:
    | "BED"
    | "BAY"
    | "CHAIR"
    | "OT_TABLE"
    | "PROCEDURE_TABLE"
    | "DIALYSIS_STATION"
    | "RECOVERY_BAY"
    | "EXAM_SLOT"
    | "INCUBATOR";
  code: string;
  name: string;
  state: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "INACTIVE";
  isActive: boolean;
  isSchedulable: boolean;
};

type TemplateConfig = {
  theatres: number;
  recoveryRoomsPerTheatre: number;
  recoveryBaysPerTheatre: number;
  otTablesPerTheatre: number;
};

const DEFAULT_TEMPLATE: TemplateConfig = {
  theatres: 4,
  recoveryRoomsPerTheatre: 1,
  recoveryBaysPerTheatre: 1,
  otTablesPerTheatre: 1,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function safeLower(s: any) {
  return String(s || "").toLowerCase();
}

function looksLikeOTUnit(u: Unit) {
  const hay = `${u.code} ${u.name} ${u.unitType?.code ?? ""} ${u.unitType?.name ?? ""}`;
  const l = hay.toLowerCase();
  return l.includes("ot") || l.includes("theatre") || l.includes("operation theatre") || l.includes("operating");
}

function toneTile(kind: "primary" | "info" | "success" | "warn") {
  if (kind === "primary")
    return "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300";
  if (kind === "info")
    return "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-900/10 text-sky-700 dark:text-sky-300";
  if (kind === "success")
    return "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300";
  return "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300";
}

function StatusPill({ ok, labelOk, labelBad }: { ok: boolean; labelOk: string; labelBad: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        ok
          ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200"
          : "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200",
      )}
    >
      <span className="font-semibold">{ok ? "OK" : "Needs"}</span>
      <span>{ok ? labelOk : labelBad}</span>
    </span>
  );
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

// Room code validation (matches your backend rule error)
// numeric (101) OR R-prefixed numeric (R101)
function isValidRoomCode(code: string) {
  const c = String(code || "").trim().toUpperCase();
  return /^\d+$/.test(c) || /^R\d+$/.test(c);
}

function normalizeRoomCode(code: string) {
  return String(code || "").trim().toUpperCase();
}

function normalizeUnitName(name: string) {
  return String(name || "").trim();
}

function normalizeText(name: string) {
  return String(name || "").trim();
}

function computeNextTheatreCode(existingRooms: UnitRoom[]) {
  const used = new Set<number>();
  for (const r of existingRooms) {
    const s = String(r.code || "").trim();
    if (/^\d+$/.test(s)) used.add(Number(s));
  }
  // start from 101 (your template standard)
  for (let n = 101; n < 999; n++) {
    if (!used.has(n)) return String(n);
  }
  return "101";
}

function computeNextRecoveryCode(existingRooms: UnitRoom[]) {
  const used = new Set<number>();
  for (const r of existingRooms) {
    const m = String(r.code || "").trim().toUpperCase().match(/^R(\d+)$/);
    if (m) used.add(Number(m[1]));
  }
  for (let n = 101; n < 999; n++) {
    if (!used.has(n)) return `R${n}`;
  }
  return "R101";
}

export default function OperationTheatreSetupPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isSuperAdmin = String(user?.role || "").toUpperCase() === "SUPER_ADMIN";

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [catalog, setCatalog] = React.useState<UnitTypeCatalog[]>([]);
  const [branchUnitTypes, setBranchUnitTypes] = React.useState<BranchUnitTypeLink[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);

  const [unitTypeId, setUnitTypeId] = React.useState<string>("");
  const [departmentId, setDepartmentId] = React.useState<string>("");

  const [units, setUnits] = React.useState<Unit[]>([]);
  const [otUnits, setOtUnits] = React.useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = React.useState<string>("");

  const [rooms, setRooms] = React.useState<UnitRoom[]>([]);
  const [resources, setResources] = React.useState<UnitResource[]>([]);

  const [q, setQ] = React.useState("");
  const [template, setTemplate] = React.useState<TemplateConfig>({ ...DEFAULT_TEMPLATE });

  // Bootstrap
  const [bootstrapOpen, setBootstrapOpen] = React.useState(false);
  const [bootBusy, setBootBusy] = React.useState(false);
  const [bootErr, setBootErr] = React.useState<string | null>(null);
  const [bootProgress, setBootProgress] = React.useState<{ phase: string; done: number; total: number } | null>(null);

  // Unit edit / delete
  const [unitEditOpen, setUnitEditOpen] = React.useState(false);
  const [unitDeleteOpen, setUnitDeleteOpen] = React.useState(false);
  const [unitDraft, setUnitDraft] = React.useState<{ id: string; name: string; isActive: boolean } | null>(null);

  // Add room / add resource
  const [addRoomOpen, setAddRoomOpen] = React.useState(false);
  const [roomCreate, setRoomCreate] = React.useState<{ kind: "THEATRE" | "RECOVERY" | "CUSTOM"; code: string; name: string }>({
    kind: "THEATRE",
    code: "",
    name: "",
  });

  const [addResOpen, setAddResOpen] = React.useState(false);
  const [resCreate, setResCreate] = React.useState<{
    roomId: string;
    resourceType: "OT_TABLE" | "RECOVERY_BAY";
    code: string;
    name: string;
    isSchedulable: boolean;
    state: UnitResource["state"];
  }>({
    roomId: "",
    resourceType: "OT_TABLE",
    code: "",
    name: "",
    isSchedulable: true,
    state: "AVAILABLE",
  });

  // Room edit / delete
  const [roomEditOpen, setRoomEditOpen] = React.useState(false);
  const [roomDeleteOpen, setRoomDeleteOpen] = React.useState(false);
  const [roomDraft, setRoomDraft] = React.useState<{ id: string; code: string; name: string; isActive: boolean } | null>(null);

  // Resource edit / delete
  const [resEditOpen, setResEditOpen] = React.useState(false);
  const [resDeleteOpen, setResDeleteOpen] = React.useState(false);
  const [resDraft, setResDraft] = React.useState<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    isSchedulable: boolean;
    state: UnitResource["state"];
  } | null>(null);

  const [rowBusy, setRowBusy] = React.useState(false);
  const [rowErr, setRowErr] = React.useState<string | null>(null);

  const selectedBranch = React.useMemo(() => branches.find((b) => b.id === branchId) || null, [branches, branchId]);
  const enabledUnitTypeIds = React.useMemo(() => new Set(branchUnitTypes.filter((x) => x.isEnabled).map((x) => x.unitTypeId)), [branchUnitTypes]);

  const selectedUnitType = React.useMemo(() => catalog.find((c) => c.id === unitTypeId) || null, [catalog, unitTypeId]);
  const selectedDepartment = React.useMemo(() => departments.find((d) => d.id === departmentId) || null, [departments, departmentId]);
  const activeUnit = React.useMemo(() => otUnits.find((u) => u.id === activeUnitId) || null, [otUnits, activeUnitId]);

  const unitTypeEnabled = !!unitTypeId && enabledUnitTypeIds.has(unitTypeId);

  const filteredResources = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return resources;
    return resources.filter((r) => `${r.code} ${r.name} ${r.resourceType} ${r.state}`.toLowerCase().includes(needle));
  }, [resources, q]);

  const theatreRooms = React.useMemo(() => {
    const numeric101 = rooms.filter((r) => /^\d+$/.test(String(r.code || "")) && Number(r.code) >= 101 && Number(r.code) < 200);
    return numeric101.length ? numeric101 : rooms.filter((r) => safeLower(r.name).includes("theatre"));
  }, [rooms]);

  const schedulableOtTables = React.useMemo(
    () => resources.filter((r) => r.resourceType === "OT_TABLE" && r.isActive && r.isSchedulable),
    [resources],
  );

  const activeRecoveryBays = React.useMemo(
    () => resources.filter((r) => r.resourceType === "RECOVERY_BAY" && r.isActive),
    [resources],
  );

  const goLiveChecks = React.useMemo(() => {
    return [
      { key: "branch", label: "Branch selected", ok: !!branchId, hint: "Select a branch." },
      { key: "unitType", label: "OT Unit Type selected", ok: !!unitTypeId, hint: "Select OT unit type from catalog." },
      { key: "unitTypeEnabled", label: "OT Unit Type enabled", ok: unitTypeEnabled, hint: "Enable OT unit type for this branch." },
      { key: "unitCreated", label: "Minimum 1 OT Unit", ok: otUnits.some((u) => u.isActive), hint: "Create OT unit or run template." },
      { key: "theatres", label: "Minimum 1 theatre room", ok: theatreRooms.length >= 1, hint: "Add at least one theatre room." },
      { key: "otTable", label: "Minimum 1 schedulable OT Table", ok: schedulableOtTables.length >= 1, hint: "Add OT_TABLE (schedulable=true)." },
      { key: "recovery", label: "Recovery bays present", ok: activeRecoveryBays.length >= 1, hint: "Add at least one RECOVERY_BAY." },
    ] as const;
  }, [branchId, unitTypeId, unitTypeEnabled, otUnits, theatreRooms.length, schedulableOtTables.length, activeRecoveryBays.length]);

  const isGoLiveReady = React.useMemo(() => goLiveChecks.every((c) => c.ok), [goLiveChecks]);

  function suggestDefaultUnitType(cats: UnitTypeCatalog[]) {
    const preferred = cats.find((c) => safeLower(c.name).includes("operation") && safeLower(c.name).includes("theatre"));
    if (preferred) return preferred.id;
    const otCode = cats.find((c) => safeLower(c.code) === "ot");
    if (otCode) return otCode.id;
    const anyOT = cats.find((c) => safeLower(c.name).includes("theatre") || safeLower(c.code).includes("ot"));
    return anyOT?.id || "";
  }

  function suggestDefaultDepartment(depts: Department[]) {
    const surgery = depts.find((d) => safeLower(d.name).includes("surgery"));
    if (surgery) return surgery.id;
    const ana = depts.find((d) => safeLower(d.name).includes("anesth") || safeLower(d.name).includes("anaesthesia"));
    if (ana) return ana.id;
    return depts[0]?.id || "";
  }

  async function refreshUnitInventory(unitId: string) {
    if (!unitId) return;
    const [rms, res] = await Promise.all([
      apiFetch<UnitRoom[]>(`/api/infrastructure/rooms?unitId=${unitId}`),
      apiFetch<UnitResource[]>(`/api/infrastructure/resources?unitId=${unitId}`),
    ]);
    setRooms(rms || []);
    setResources(res || []);
  }

  async function refreshAll(initial = false) {
    setErr(null);
    if (!initial) setLoading(true);

    try {
      const br = await apiFetch<BranchRow[]>("/api/branches");
      setBranches(br || []);

      let bid = branchId;
      if (!bid && br?.length) bid = br[0].id;
      setBranchId(bid);

      const cats = await apiFetch<UnitTypeCatalog[]>("/api/infrastructure/unit-types/catalog");
      setCatalog(cats || []);

      if (bid) {
        const [links, depts, u] = await Promise.all([
          apiFetch<BranchUnitTypeLink[]>(`/api/infrastructure/branches/${bid}/unit-types`),
          apiFetch<Department[]>(`/api/infrastructure/departments?branchId=${bid}`),
          apiFetch<Unit[]>(`/api/infrastructure/units?branchId=${bid}`),
        ]);

        setBranchUnitTypes(links || []);
        setDepartments(depts || []);
        setUnits(u || []);

        const ot = (u || []).filter(looksLikeOTUnit);
        setOtUnits(ot);

        if (!unitTypeId) setUnitTypeId(suggestDefaultUnitType(cats || []));
        if (!departmentId) setDepartmentId(suggestDefaultDepartment(depts || []));

        const nextActive = activeUnitId || ot[0]?.id || "";
        setActiveUnitId(nextActive);

        if (nextActive) {
          await refreshUnitInventory(nextActive);
        } else {
          setRooms([]);
          setResources([]);
        }
      } else {
        setBranchUnitTypes([]);
        setDepartments([]);
        setUnits([]);
        setOtUnits([]);
        setActiveUnitId("");
        setRooms([]);
        setResources([]);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load OT setup data");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [links, depts, u] = await Promise.all([
          apiFetch<BranchUnitTypeLink[]>(`/api/infrastructure/branches/${branchId}/unit-types`),
          apiFetch<Department[]>(`/api/infrastructure/departments?branchId=${branchId}`),
          apiFetch<Unit[]>(`/api/infrastructure/units?branchId=${branchId}`),
        ]);

        setBranchUnitTypes(links || []);
        setDepartments(depts || []);
        setUnits(u || []);

        const ot = (u || []).filter(looksLikeOTUnit);
        setOtUnits(ot);

        if (!depts?.some((d) => d.id === departmentId)) setDepartmentId(suggestDefaultDepartment(depts || []));
        if (!catalog?.some((c) => c.id === unitTypeId)) setUnitTypeId(suggestDefaultUnitType(catalog || []));

        const nextActive = ot[0]?.id || "";
        setActiveUnitId(nextActive);

        if (nextActive) await refreshUnitInventory(nextActive);
        else {
          setRooms([]);
          setResources([]);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load branch OT data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // ---------------- Branch Unit Type enable ----------------
  async function ensureUnitTypeEnabled(bid: string, utid: string) {
    if (!bid || !utid) return;
    if (enabledUnitTypeIds.has(utid)) return;

    const enabled = branchUnitTypes.filter((x) => x.isEnabled).map((x) => x.unitTypeId);
    const next = Array.from(new Set([...enabled, utid]));
    await apiFetch(` /api/infrastructure/branches/${bid}/unit-types`.replace(" ", ""), {
      method: "PUT",
      body: JSON.stringify({ unitTypeIds: next }),
    });

    const links = await apiFetch<BranchUnitTypeLink[]>(`/api/infrastructure/branches/${bid}/unit-types`);
    setBranchUnitTypes(links || []);
  }

  // ---------------- Create Unit (manual) ----------------
  function nextUnitCode(existing: Unit[], base = "OT") {
    const used = new Set(existing.map((u) => String(u.code || "").toUpperCase()));
    for (let i = 1; i <= 99; i++) {
      const c = `${base}${pad2(i)}`.toUpperCase();
      if (!used.has(c)) return c;
    }
    return `${base}${Date.now().toString().slice(-4)}`.toUpperCase();
  }

  async function createOtUnitManual() {
    if (!branchId) {
      toast({ title: "Select branch", description: "Please select a branch first.", variant: "destructive" as any });
      return;
    }
    if (!departmentId || !unitTypeId) {
      toast({ title: "Missing setup", description: "Select Department and Unit Type.", variant: "destructive" as any });
      return;
    }

    setRowBusy(true);
    try {
      await ensureUnitTypeEnabled(branchId, unitTypeId);

      const code = nextUnitCode(units, "OT");
      const name = `Operation Theatre Block (${code})`;

      // NOTE: we keep branchId in query like your other infra pages generally do
      const created = await apiFetch<Unit>(`/api/infrastructure/units?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({
          departmentId,
          unitTypeId,
          code,
          name,
          usesRooms: true,
          isActive: true,
        }),
      });

      toast({ title: "OT Unit created", description: `${created.name}` });
      await refreshAll(false);
      setActiveUnitId(created.id);
      await refreshUnitInventory(created.id);
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "Unable to create OT Unit", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  // ---------------- Rooms / Resources CRUD ----------------
  function openAddRoom() {
    if (!activeUnitId) {
      toast({ title: "Select an OT Unit", description: "Pick an OT Unit first.", variant: "destructive" as any });
      return;
    }
    const nextTheatreCode = computeNextTheatreCode(rooms);
    setRoomCreate({
      kind: "THEATRE",
      code: nextTheatreCode,
      name: `Operation Theatre ${pad2(Math.max(1, theatreRooms.length + 1))}`,
    });
    setAddRoomOpen(true);
  }

  async function createRoom() {
    if (!activeUnitId) return;
    const code = normalizeRoomCode(roomCreate.code);
    const name = normalizeText(roomCreate.name);

    if (!name) return toast({ title: "Invalid", description: "Room name is required.", variant: "destructive" as any });
    if (!isValidRoomCode(code)) {
      return toast({
        title: "Invalid Room Code",
        description: 'Use numeric (101) or R-prefixed numeric (R101).',
        variant: "destructive" as any,
      });
    }

    setRowBusy(true);
    setRowErr(null);
    try {
      await apiFetch(`/api/infrastructure/rooms`, {
        method: "POST",
        body: JSON.stringify({ unitId: activeUnitId, code, name, isActive: true }),
      });

      toast({ title: "Room added", description: `${code} created under selected OT.` });
      setAddRoomOpen(false);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to create room");
      toast({ title: "Create failed", description: e?.message || "Failed to create room", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  function openAddResource() {
    if (!activeUnitId) {
      toast({ title: "Select an OT Unit", description: "Pick an OT Unit first.", variant: "destructive" as any });
      return;
    }
    if (!rooms.length) {
      toast({ title: "Add a room first", description: "Resources must be created under a room.", variant: "destructive" as any });
      return;
    }
    const defaultRoomId = rooms[0].id;
    setResCreate({
      roomId: defaultRoomId,
      resourceType: "OT_TABLE",
      code: `TB${pad2(1)}`,
      name: "OT Table",
      isSchedulable: true,
      state: "AVAILABLE",
    });
    setAddResOpen(true);
  }

  async function createResource() {
    if (!activeUnitId) return;

    const code = String(resCreate.code || "").trim().toUpperCase();
    const name = normalizeText(resCreate.name);
    if (!resCreate.roomId) return toast({ title: "Select room", description: "Room is required.", variant: "destructive" as any });
    if (!code) return toast({ title: "Invalid code", description: "Resource code is required.", variant: "destructive" as any });
    if (!name) return toast({ title: "Invalid name", description: "Resource name is required.", variant: "destructive" as any });

    setRowBusy(true);
    setRowErr(null);
    try {
      const created = await apiFetch<UnitResource>(`/api/infrastructure/resources`, {
        method: "POST",
        body: JSON.stringify({
          unitId: activeUnitId,
          roomId: resCreate.roomId,
          resourceType: resCreate.resourceType,
          code,
          name,
          isActive: true,
          isSchedulable: resCreate.isSchedulable,
        }),
      });

      // set state as requested (best effort)
      await apiFetch(`/api/infrastructure/resources/${created.id}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: resCreate.state }),
      }).catch(() => null);

      toast({ title: "Resource added", description: `${created.code} created.` });
      setAddResOpen(false);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to create resource");
      toast({ title: "Create failed", description: e?.message || "Failed to create resource", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  function openEditRoom(r: UnitRoom) {
    setRowErr(null);
    setRoomDraft({ id: r.id, code: r.code, name: r.name, isActive: !!r.isActive });
    setRoomEditOpen(true);
  }

  function openDeleteRoom(r: UnitRoom) {
    setRowErr(null);
    setRoomDraft({ id: r.id, code: r.code, name: r.name, isActive: !!r.isActive });
    setRoomDeleteOpen(true);
  }

  async function saveRoom() {
    if (!roomDraft?.id || !activeUnitId) return;
    const name = normalizeText(roomDraft.name);
    if (!name) return toast({ title: "Invalid", description: "Room name is required.", variant: "destructive" as any });

    setRowBusy(true);
    setRowErr(null);
    try {
      // Backend UpdateUnitRoomDto allows name + isActive only (code is immutable)
      await apiFetch(`/api/infrastructure/rooms/${roomDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, isActive: !!roomDraft.isActive }),
      });

      toast({ title: "Room updated", description: `${roomDraft.code} updated.` });
      setRoomEditOpen(false);
      setRoomDraft(null);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to update room");
      toast({ title: "Update failed", description: e?.message || "Failed to update room", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  async function deactivateRoomCascade() {
    if (!roomDraft?.id || !activeUnitId) return;
    setRowBusy(true);
    setRowErr(null);
    try {
      const inRoom = resources.filter((r) => r.roomId === roomDraft.id && r.isActive);

      // deactivate resources in room first
      for (const r of inRoom) {
        await apiFetch(`/api/infrastructure/resources/${r.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: false }),
        }).catch(() => null);

        await apiFetch(`/api/infrastructure/resources/${r.id}/state`, {
          method: "PUT",
          body: JSON.stringify({ state: "INACTIVE" }),
        }).catch(() => null);
      }

      // deactivate room
      await apiFetch(`/api/infrastructure/rooms/${roomDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });

      toast({
        title: "Room deleted (deactivated)",
        description: `${roomDraft.code} deactivated.${inRoom.length ? ` ${inRoom.length} resources also deactivated.` : ""}`,
      });

      setRoomDeleteOpen(false);
      setRoomDraft(null);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to delete room");
      toast({ title: "Delete failed", description: e?.message || "Failed to delete room", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  function openEditResource(r: UnitResource) {
    setRowErr(null);
    setResDraft({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: !!r.isActive,
      isSchedulable: !!r.isSchedulable,
      state: r.state,
    });
    setResEditOpen(true);
  }

  function openDeleteResource(r: UnitResource) {
    setRowErr(null);
    setResDraft({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: !!r.isActive,
      isSchedulable: !!r.isSchedulable,
      state: r.state,
    });
    setResDeleteOpen(true);
  }

  async function saveResource() {
    if (!resDraft?.id || !activeUnitId) return;
    const name = normalizeText(resDraft.name);
    if (!name) return toast({ title: "Invalid", description: "Resource name is required.", variant: "destructive" as any });

    setRowBusy(true);
    setRowErr(null);
    try {
      // Backend UpdateUnitResourceDto allows name + isActive + isSchedulable (code is immutable)
      await apiFetch(`/api/infrastructure/resources/${resDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          isActive: !!resDraft.isActive,
          isSchedulable: !!resDraft.isSchedulable,
        }),
      });

      await apiFetch(`/api/infrastructure/resources/${resDraft.id}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: resDraft.state }),
      }).catch(() => null);

      toast({ title: "Resource updated", description: `${resDraft.code} updated.` });
      setResEditOpen(false);
      setResDraft(null);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to update resource");
      toast({ title: "Update failed", description: e?.message || "Failed to update resource", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  async function deactivateResource() {
    if (!resDraft?.id || !activeUnitId) return;

    setRowBusy(true);
    setRowErr(null);
    try {
      await apiFetch(`/api/infrastructure/resources/${resDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });

      await apiFetch(`/api/infrastructure/resources/${resDraft.id}/state`, {
        method: "PUT",
        body: JSON.stringify({ state: "INACTIVE" }),
      }).catch(() => null);

      toast({ title: "Resource deleted (deactivated)", description: `${resDraft.code} deactivated.` });
      setResDeleteOpen(false);
      setResDraft(null);
      await refreshUnitInventory(activeUnitId);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to delete resource");
      toast({ title: "Delete failed", description: e?.message || "Failed to delete resource", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  // ---------------- Unit edit / delete ----------------
  function openEditUnit(u: Unit) {
    setRowErr(null);
    setUnitDraft({ id: u.id, name: u.name, isActive: !!u.isActive });
    setUnitEditOpen(true);
  }

  function openDeleteUnit(u: Unit) {
    setRowErr(null);
    setUnitDraft({ id: u.id, name: u.name, isActive: !!u.isActive });
    setUnitDeleteOpen(true);
  }

  async function saveUnit() {
    if (!unitDraft?.id) return;
    const name = normalizeUnitName(unitDraft.name);
    if (!name) return toast({ title: "Invalid", description: "Unit name is required.", variant: "destructive" as any });

    setRowBusy(true);
    setRowErr(null);
    try {
      await apiFetch(`/api/infrastructure/units/${unitDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, isActive: !!unitDraft.isActive }),
      });

      toast({ title: "OT Unit updated", description: "Saved successfully." });
      setUnitEditOpen(false);
      setUnitDraft(null);
      await refreshAll(false);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to update OT Unit");
      toast({ title: "Update failed", description: e?.message || "Failed to update OT Unit", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  async function deactivateUnitCascade() {
    if (!unitDraft?.id) return;

    setRowBusy(true);
    setRowErr(null);
    try {
      // fetch all rooms/resources for that unit (including inactive, so we can clean properly)
      const [uRooms, uRes] = await Promise.all([
        apiFetch<UnitRoom[]>(`/api/infrastructure/rooms?unitId=${unitDraft.id}&includeInactive=true`),
        apiFetch<UnitResource[]>(`/api/infrastructure/resources?unitId=${unitDraft.id}&includeInactive=true`),
      ]);

      // deactivate resources first
      for (const r of uRes || []) {
        if (r.isActive) {
          await apiFetch(`/api/infrastructure/resources/${r.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isActive: false }),
          }).catch(() => null);

          await apiFetch(`/api/infrastructure/resources/${r.id}/state`, {
            method: "PUT",
            body: JSON.stringify({ state: "INACTIVE" }),
          }).catch(() => null);
        }
      }

      // deactivate rooms
      for (const rm of uRooms || []) {
        if (rm.isActive) {
          await apiFetch(`/api/infrastructure/rooms/${rm.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isActive: false }),
          }).catch(() => null);
        }
      }

      // deactivate unit
      await apiFetch(`/api/infrastructure/units/${unitDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });

      toast({
        title: "OT Unit deleted (deactivated)",
        description: `OT Unit deactivated with ${uRooms?.length || 0} rooms and ${uRes?.length || 0} resources.`,
      });

      setUnitDeleteOpen(false);
      const deletedId = unitDraft.id;
      setUnitDraft(null);

      // if active unit removed, clear selection
      if (activeUnitId === deletedId) {
        setActiveUnitId("");
        setRooms([]);
        setResources([]);
      }

      await refreshAll(false);
    } catch (e: any) {
      setRowErr(e?.message || "Failed to delete OT Unit");
      toast({ title: "Delete failed", description: e?.message || "Failed to delete OT Unit", variant: "destructive" as any });
    } finally {
      setRowBusy(false);
    }
  }

  // ---------------- Bootstrap template ----------------
  function plannedTotals(cfg: TemplateConfig) {
    const theatreRoomsCount = cfg.theatres;
    const recoveryRoomsCount = cfg.theatres * cfg.recoveryRoomsPerTheatre;
    const roomsTotal = theatreRoomsCount + recoveryRoomsCount;

    const otTablesTotal = cfg.theatres * cfg.otTablesPerTheatre;
    const recoveryBaysTotal = cfg.theatres * cfg.recoveryBaysPerTheatre;
    const resourcesTotal = otTablesTotal + recoveryBaysTotal;

    return { roomsTotal, theatreRooms: theatreRoomsCount, recoveryRooms: recoveryRoomsCount, otTablesTotal, recoveryBaysTotal, resourcesTotal };
  }

  function nextRoomCode(codeBase: string, attempt: number) {
    const s = String(codeBase || "").trim().toUpperCase();
    const mR = s.match(/^R(\d+)$/);
    if (mR) return `R${Number(mR[1]) + attempt}`;
    const mN = s.match(/^(\d+)$/);
    if (mN) return String(Number(mN[1]) + attempt);
    throw new Error(`Invalid Room code "${codeBase}". Use numeric (101) or R-prefixed (R101).`);
  }

  async function createRoomWithRetry(unitId: string, codeBase: string, name: string) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = nextRoomCode(codeBase, attempt);
      try {
        const created = await apiFetch<UnitRoom>(`/api/infrastructure/rooms`, {
          method: "POST",
          body: JSON.stringify({ unitId, code, name, isActive: true }),
        });
        return created;
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          await sleep(80);
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Unable to create room "${codeBase}" due to duplicate codes.`);
  }

  async function createResourceWithRetry(params: {
    unitId: string;
    roomId: string;
    resourceType: UnitResource["resourceType"];
    codeBase: string;
    name: string;
    isSchedulable?: boolean;
  }) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
      const code = `${params.codeBase}${suffix}`.toUpperCase();
      try {
        const created = await apiFetch<UnitResource>(`/api/infrastructure/resources`, {
          method: "POST",
          body: JSON.stringify({
            unitId: params.unitId,
            roomId: params.roomId,
            resourceType: params.resourceType,
            code,
            name: params.name,
            isActive: true,
            isSchedulable: params.isSchedulable ?? (params.resourceType !== "BED"),
          }),
        });
        return created;
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          await sleep(80);
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Unable to create resource "${params.codeBase}" due to duplicates.`);
  }

  async function runBootstrap() {
    setBootErr(null);

    if (!branchId) return setBootErr("Please select a branch.");
    if (!departmentId) return setBootErr("Please select a department.");
    if (!unitTypeId) return setBootErr("Please select an OT Unit Type.");

    const totals = plannedTotals(template);
    setBootBusy(true);

    try {
      setBootProgress({ phase: "Enabling Unit Type", done: 0, total: 1 });
      await ensureUnitTypeEnabled(branchId, unitTypeId);
      setBootProgress({ phase: "Enabling Unit Type", done: 1, total: 1 });

      setBootProgress({ phase: "Creating OT Unit", done: 0, total: 1 });
      const code = nextUnitCode(units, "OT");
      const unit = await apiFetch<Unit>(`/api/infrastructure/units?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({
          departmentId,
          unitTypeId,
          code,
          name: `Operation Theatre Block (${code})`,
          usesRooms: true,
          isActive: true,
        }),
      });
      setBootProgress({ phase: "Creating OT Unit", done: 1, total: 1 });

      const stepsTotal = totals.roomsTotal + totals.resourcesTotal;
      let done = 0;
      setBootProgress({ phase: "Creating Rooms & Resources", done, total: stepsTotal });

      for (let i = 1; i <= template.theatres; i++) {
        const theatreNo = 100 + i; // 101..104
        const thCode = String(theatreNo);
        const thName = `Operation Theatre ${pad2(i)}`;
        const theatreRoom = await createRoomWithRetry(unit.id, thCode, thName);
        done++;
        setBootProgress({ phase: "Creating Rooms & Resources", done, total: stepsTotal });

        for (let t = 1; t <= template.otTablesPerTheatre; t++) {
          const tbCode = `TB${pad2(i)}${template.otTablesPerTheatre > 1 ? `-${t}` : ""}`;
          const tbName = `OT Table ${pad2(i)}${template.otTablesPerTheatre > 1 ? ` (${t})` : ""}`;
          await createResourceWithRetry({
            unitId: unit.id,
            roomId: theatreRoom.id,
            resourceType: "OT_TABLE",
            codeBase: tbCode,
            name: tbName,
            isSchedulable: true,
          });
          done++;
          setBootProgress({ phase: "Creating Rooms & Resources", done, total: stepsTotal });
        }

        for (let rr = 1; rr <= template.recoveryRoomsPerTheatre; rr++) {
          const rcCode = template.recoveryRoomsPerTheatre > 1 ? `R${theatreNo}${rr}` : `R${theatreNo}`;
          const rcName = `Recovery - OT ${pad2(i)}${template.recoveryRoomsPerTheatre > 1 ? ` (${rr})` : ""}`;
          const recoveryRoom = await createRoomWithRetry(unit.id, rcCode, rcName);
          done++;
          setBootProgress({ phase: "Creating Rooms & Resources", done, total: stepsTotal });

          for (let b = 1; b <= template.recoveryBaysPerTheatre; b++) {
            const rbCode = `RB${pad2(i)}${template.recoveryBaysPerTheatre > 1 ? `-${b}` : ""}`;
            const rbName = `Recovery Bay - OT ${pad2(i)}${template.recoveryBaysPerTheatre > 1 ? ` (${b})` : ""}`;
            await createResourceWithRetry({
              unitId: unit.id,
              roomId: recoveryRoom.id,
              resourceType: "RECOVERY_BAY",
              codeBase: rbCode,
              name: rbName,
              isSchedulable: false,
            });
            done++;
            setBootProgress({ phase: "Creating Rooms & Resources", done, total: stepsTotal });
          }
        }
      }

      toast({
        title: "OT template applied",
        description: `Created ${template.theatres} theatres + recovery + OT tables.`,
      });

      setBootstrapOpen(false);
      await refreshAll(false);
      setActiveUnitId(unit.id);
      await refreshUnitInventory(unit.id);
    } catch (e: any) {
      setBootErr(e?.message || "OT bootstrap failed");
      toast({ title: "Bootstrap failed", description: e?.message || "Unable to create OT setup", variant: "destructive" as any });
    } finally {
      setBootBusy(false);
      setBootProgress(null);
    }
  }

  const totals = plannedTotals(template);

  return (
    <AppShell title="Operation Theatre Setup">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Scissors className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Operation Theatre Setup</div>
              <div className="mt-1 text-sm text-zc-muted">
                Setup OT infrastructure in Super Admin so the Operational module can start immediately.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                isGoLiveReady
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300",
              )}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-zc-border bg-white/70 dark:bg-zc-panel/30">
                {isGoLiveReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              </span>
              {isGoLiveReady ? "Ready for Operations" : "Not Ready"}
            </span>

            <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll(false)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={() => setBootstrapOpen(true)}
              disabled={loading || !isSuperAdmin}
              title={!isSuperAdmin ? "Only Super Admin can bootstrap OT setup" : undefined}
            >
              <Wand2 className="h-4 w-4" />
              One-Click Template
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Step 1: Select Branch + OT Unit Type + Department. Step 2: Create/Select OT Unit. Step 3: Add Rooms & Resources.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className={cn("rounded-xl border p-3", toneTile("primary"))}>
                <div className="text-xs font-medium opacity-90">OT Units (branch)</div>
                <div className="mt-1 text-lg font-bold">{otUnits.length}</div>
              </div>
              <div className={cn("rounded-xl border p-3", toneTile("info"))}>
                <div className="text-xs font-medium opacity-90">Theatres (selected OT)</div>
                <div className="mt-1 text-lg font-bold">{activeUnitId ? theatreRooms.length : 0}</div>
              </div>
              <div className={cn("rounded-xl border p-3", toneTile("success"))}>
                <div className="text-xs font-medium opacity-90">Schedulable OT Tables</div>
                <div className="mt-1 text-lg font-bold">{activeUnitId ? schedulableOtTables.length : 0}</div>
              </div>
              <div className={cn("rounded-xl border p-3", toneTile("warn"))}>
                <div className="text-xs font-medium opacity-90">Recovery Bays</div>
                <div className="mt-1 text-lg font-bold">{activeUnitId ? activeRecoveryBays.length : 0}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…" className="pl-10" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusPill ok={!!branchId} labelOk="Branch selected" labelBad="Select a branch" />
                <StatusPill ok={!!departmentId} labelOk="Department selected" labelBad="Select department" />
                <StatusPill ok={!!unitTypeId} labelOk="Unit Type selected" labelBad="Select Unit Type" />
                <StatusPill ok={unitTypeEnabled} labelOk="Unit Type enabled" labelBad="Enable Unit Type" />
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Configuration */}
          <Card className="lg:col-span-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription className="text-sm">Select context for OT provisioning.</CardDescription>
            </CardHeader>
            <Separator />

            <CardContent className="grid gap-4 pt-4">
              <div className="grid gap-2">
                <Label>Branch</Label>
                <select
                  className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={loading}
                >
                  {!branches.length ? <option value="">No branches</option> : null}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Owning Department</Label>
                <select
                  className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={loading || !branchId}
                >
                  {!departments.length ? <option value="">No departments</option> : <option value="">Select…</option>}
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Unit Type (Catalog)</Label>
                  <Link href="/superadmin/infrastructure/unit-types" className="text-xs text-zc-accent hover:underline">
                    Manage Unit Types
                  </Link>
                </div>

                <select
                  className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                  value={unitTypeId}
                  onChange={(e) => setUnitTypeId(e.target.value)}
                  disabled={loading}
                >
                  {!catalog.length ? <option value="">No unit types</option> : <option value="">Select…</option>}
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>

                <div className="text-xs text-zc-muted">
                  Unit Type must be enabled for branch before OT is production-ready (template auto-enables).
                </div>
              </div>

              <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="text-sm font-semibold text-zc-text">Manual Actions</div>
                <div className="mt-2 grid gap-2">
                  <Button variant="secondary" className="gap-2" onClick={() => void createOtUnitManual()} disabled={rowBusy || !isSuperAdmin}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconPlus className="h-4 w-4" />}
                    Create OT Unit
                  </Button>
                  <div className="text-xs text-zc-muted">Creates an OT Unit under selected Department + Unit Type.</div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Template Preview</div>
                  <Button variant="outline" size="sm" onClick={() => setTemplate({ ...DEFAULT_TEMPLATE })}>
                    Reset
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">Theatres</Label>
                    <Input
                      type="number"
                      min={1}
                      value={template.theatres}
                      onChange={(e) => setTemplate((p) => ({ ...p, theatres: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">OT Tables / Theatre</Label>
                    <Input
                      type="number"
                      min={1}
                      value={template.otTablesPerTheatre}
                      onChange={(e) => setTemplate((p) => ({ ...p, otTablesPerTheatre: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">Recovery Rooms / Theatre</Label>
                    <Input
                      type="number"
                      min={1}
                      value={template.recoveryRoomsPerTheatre}
                      onChange={(e) => setTemplate((p) => ({ ...p, recoveryRoomsPerTheatre: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">Recovery Bays / Theatre</Label>
                    <Input
                      type="number"
                      min={1}
                      value={template.recoveryBaysPerTheatre}
                      onChange={(e) => setTemplate((p) => ({ ...p, recoveryBaysPerTheatre: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs text-zc-muted">
                  Rooms: <span className="font-semibold text-zc-text">{totals.roomsTotal}</span> • Resources:{" "}
                  <span className="font-semibold text-zc-text">{totals.resourcesTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Units + Active OT */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">OT Units</CardTitle>
                  <CardDescription className="text-sm">Select an OT Unit. Then add Rooms under that OT.</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => void refreshAll(false)} disabled={loading}>
                    <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    Refresh
                  </Button>

                  <Button variant="primary" className="gap-2" onClick={() => setBootstrapOpen(true)} disabled={loading || !isSuperAdmin}>
                    <Wand2 className="h-4 w-4" />
                    Apply Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />

            <CardContent className="grid gap-4 pt-4">
              {!branchId ? (
                <div className="text-sm text-zc-muted">Select a branch to view OT Units.</div>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-zc-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading OT units…
                </div>
              ) : !otUnits.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
                  <div className="font-semibold">No OT Units found</div>
                  <div className="mt-1 text-xs opacity-90">Use Template or “Create OT Unit”.</div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {otUnits.map((u) => {
                    const active = u.id === activeUnitId;
                    return (
                      <div
                        key={u.id}
                        className={cn(
                          "rounded-2xl border p-4 transition",
                          active
                            ? "border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-900/10"
                            : "border-zc-border bg-zc-card hover:bg-zc-panel/20",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 text-left"
                            onClick={async () => {
                              setActiveUnitId(u.id);
                              await refreshUnitInventory(u.id);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                                {u.code}
                              </span>
                              <span className={cn("text-xs", u.isActive ? "text-emerald-600 dark:text-emerald-300" : "text-zc-muted")}>
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="mt-2 font-semibold text-zc-text">{u.name}</div>
                            <div className="mt-1 text-xs text-zc-muted">
                              Dept: {u.department?.name ?? u.departmentId} • Type: {u.unitType?.name ?? u.unitTypeId}
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit OT Unit" onClick={() => openEditUnit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[rgb(var(--zc-danger))]"
                              title="Delete OT Unit (Deactivate)"
                              onClick={() => openDeleteUnit(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {active ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" className="gap-2" onClick={openAddRoom}>
                              <IconPlus className="h-4 w-4" />
                              Add Room
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" onClick={openAddResource}>
                              <IconPlus className="h-4 w-4" />
                              Add Resource
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active OT: Rooms + Resources */}
              {activeUnit ? (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-base">Selected OT: {activeUnit.name}</CardTitle>
                        <CardDescription className="text-sm">
                          Add rooms under this OT. Then add OT Tables and Recovery Bays under the rooms.
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" className="gap-2" onClick={openAddRoom}>
                          <IconPlus className="h-4 w-4" />
                          Add Room
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={openAddResource}>
                          <IconPlus className="h-4 w-4" />
                          Add Resource
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="pt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Rooms */}
                      <div className="rounded-2xl border border-zc-border bg-zc-card overflow-hidden">
                        <div className="px-4 py-3 text-sm font-semibold text-zc-text bg-zc-panel/20">Rooms</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Code</th>
                                <th className="px-4 py-2 text-left font-semibold">Name</th>
                                <th className="px-4 py-2 text-right font-semibold">Status</th>
                                <th className="px-4 py-2 text-right font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!rooms.length ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zc-muted">
                                    No rooms yet. Click “Add Room”.
                                  </td>
                                </tr>
                              ) : null}

                              {rooms.map((r) => (
                                <tr key={r.id} className="group border-t border-zc-border hover:bg-zc-panel/20">
                                  <td className="px-4 py-2">
                                    <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                                      {r.code}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="font-semibold text-zc-text">{r.name}</div>
                                    <div className="text-xs text-zc-muted">Room code is immutable (backend rule).</div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <span className={cn("text-xs", r.isActive ? "text-emerald-600 dark:text-emerald-300" : "text-zc-muted")}>
                                      {r.isActive ? "Active" : "Inactive"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="inline-flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditRoom(r)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[rgb(var(--zc-danger))]"
                                        title="Delete (Deactivate)"
                                        onClick={() => openDeleteRoom(r)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Resources */}
                      <div className="rounded-2xl border border-zc-border bg-zc-card overflow-hidden">
                        <div className="px-4 py-3 text-sm font-semibold text-zc-text bg-zc-panel/20">Resources</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Code</th>
                                <th className="px-4 py-2 text-left font-semibold">Type</th>
                                <th className="px-4 py-2 text-left font-semibold">Name</th>
                                <th className="px-4 py-2 text-right font-semibold">State</th>
                                <th className="px-4 py-2 text-right font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!filteredResources.length ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zc-muted">
                                    {resources.length ? "No resources match your search." : "No resources yet. Click “Add Resource”."}
                                  </td>
                                </tr>
                              ) : null}

                              {filteredResources.map((r) => (
                                <tr key={r.id} className="group border-t border-zc-border hover:bg-zc-panel/20">
                                  <td className="px-4 py-2">
                                    <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                                      {r.code}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-xs text-zc-muted">{r.resourceType}</span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="font-semibold text-zc-text">{r.name}</div>
                                    <div className="text-xs text-zc-muted">
                                      {r.isSchedulable ? "Schedulable" : "Non-schedulable"} • {r.isActive ? "Active" : "Inactive"} • Code immutable
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <span className="text-xs text-zc-muted">{r.state}</span>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="inline-flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditResource(r)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[rgb(var(--zc-danger))]"
                                        title="Delete (Deactivate)"
                                        onClick={() => openDeleteResource(r)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Go-Live Checks */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">OT Go-Live Checks</CardTitle>
                  <CardDescription className="text-sm">A quick validator for operational readiness.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {goLiveChecks.map((c) => (
                      <div
                        key={c.key}
                        className={cn(
                          "rounded-2xl border p-4",
                          c.ok
                            ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-900/10"
                            : "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-900/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="grid h-8 w-8 place-items-center rounded-xl border border-zc-border bg-white/70 dark:bg-zc-panel/30">
                                {c.ok ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-300" />
                                )}
                              </span>
                              <div className="font-semibold text-zc-text">{c.label}</div>
                            </div>
                            {!c.ok ? <div className="mt-2 text-xs text-zc-muted">{c.hint}</div> : null}
                          </div>
                          <span className={cn("text-xs font-semibold", c.ok ? "text-emerald-700" : "text-amber-800")}>
                            {c.ok ? "PASS" : "FIX"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- Bootstrap dialog ---------------- */}
        <Dialog open={bootstrapOpen} onOpenChange={(v) => (bootBusy ? null : setBootstrapOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[720px] max-h-[85vh] overflow-y-auto rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <Wand2 className="h-5 w-5" />
                  </span>
                  One-Click OT Template
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Branch: <span className="font-semibold text-zc-text">{selectedBranch ? `${selectedBranch.code} — ${selectedBranch.name}` : "—"}</span>
                </DialogDescription>
              </DialogHeader>

              {bootErr ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{bootErr}</div>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-zc-border bg-zc-panel/20 p-4 text-sm">
                <div className="font-semibold text-zc-text">Plan</div>
                <div className="mt-1 text-xs text-zc-muted">
                  {totals.theatreRooms} theatres + {totals.recoveryRooms} recovery rooms • {totals.otTablesTotal} OT tables • {totals.recoveryBaysTotal} recovery bays
                </div>

                {bootProgress ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zc-border bg-white/50 dark:bg-zc-panel/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-zc-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-semibold text-zc-text">{bootProgress.phase}</span>
                    </div>
                    <div className="text-xs text-zc-muted">
                      <span className="font-semibold tabular-nums text-zc-text">{bootProgress.done}</span> /{" "}
                      <span className="font-semibold tabular-nums text-zc-text">{bootProgress.total}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setBootstrapOpen(false)} disabled={bootBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void runBootstrap()} disabled={bootBusy || !isSuperAdmin}>
                    {bootBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {bootBusy ? "Applying…" : "Apply Template"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Add Room dialog ---------------- */}
        <Dialog open={addRoomOpen} onOpenChange={(v) => (rowBusy ? null : setAddRoomOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[640px] rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <IconPlus className="h-5 w-5" />
                  </span>
                  Add Room under selected OT
                </DialogTitle>
                <DialogDescription className="text-sm">
                  OT: <span className="font-semibold text-zc-text">{activeUnit?.name ?? "—"}</span>
                </DialogDescription>
              </DialogHeader>

              {rowErr ? (
                <div className="mt-4 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  {rowErr}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Room Type</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                    value={roomCreate.kind}
                    onChange={(e) => {
                      const kind = e.target.value as any;
                      if (kind === "THEATRE") {
                        const c = computeNextTheatreCode(rooms);
                        setRoomCreate({ kind, code: c, name: `Operation Theatre ${pad2(Math.max(1, theatreRooms.length + 1))}` });
                      } else if (kind === "RECOVERY") {
                        const c = computeNextRecoveryCode(rooms);
                        setRoomCreate({ kind, code: c, name: `Recovery Room ${c.replace(/^R/, "")}` });
                      } else {
                        setRoomCreate({ kind, code: "", name: "" });
                      }
                    }}
                    disabled={rowBusy}
                  >
                    <option value="THEATRE">Theatre Room (numeric code)</option>
                    <option value="RECOVERY">Recovery Room (R + numeric)</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  <div className="text-[11px] text-zc-muted">Code rule: numeric (101) OR R-prefixed numeric (R101).</div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Code</Label>
                  <Input
                    value={roomCreate.code}
                    onChange={(e) => setRoomCreate((p) => ({ ...p, code: e.target.value }))}
                    className="font-mono"
                    placeholder="101 or R101"
                    disabled={rowBusy}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Name</Label>
                  <Input
                    value={roomCreate.name}
                    onChange={(e) => setRoomCreate((p) => ({ ...p, name: e.target.value }))}
                    disabled={rowBusy}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setAddRoomOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void createRoom()} disabled={rowBusy || !activeUnitId}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconPlus className="h-4 w-4" />}
                    Create Room
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Add Resource dialog ---------------- */}
        <Dialog open={addResOpen} onOpenChange={(v) => (rowBusy ? null : setAddResOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[720px] rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <IconPlus className="h-5 w-5" />
                  </span>
                  Add Resource under a Room
                </DialogTitle>
                <DialogDescription className="text-sm">Create OT tables and recovery bays inside rooms.</DialogDescription>
              </DialogHeader>

              {rowErr ? (
                <div className="mt-4 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  {rowErr}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Room</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                    value={resCreate.roomId}
                    onChange={(e) => setResCreate((p) => ({ ...p, roomId: e.target.value }))}
                    disabled={rowBusy}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">Type</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                      value={resCreate.resourceType}
                      onChange={(e) => {
                        const t = e.target.value as "OT_TABLE" | "RECOVERY_BAY";
                        setResCreate((p) => ({
                          ...p,
                          resourceType: t,
                          isSchedulable: t === "OT_TABLE",
                          name: t === "OT_TABLE" ? "OT Table" : "Recovery Bay",
                        }));
                      }}
                      disabled={rowBusy}
                    >
                      <option value="OT_TABLE">OT_TABLE</option>
                      <option value="RECOVERY_BAY">RECOVERY_BAY</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs text-zc-muted">State</Label>
                    <select
                      className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                      value={resCreate.state}
                      onChange={(e) => setResCreate((p) => ({ ...p, state: e.target.value as any }))}
                      disabled={rowBusy}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="OCCUPIED">OCCUPIED</option>
                      <option value="CLEANING">CLEANING</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Code</Label>
                  <Input value={resCreate.code} onChange={(e) => setResCreate((p) => ({ ...p, code: e.target.value }))} className="font-mono" disabled={rowBusy} />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Name</Label>
                  <Input value={resCreate.name} onChange={(e) => setResCreate((p) => ({ ...p, name: e.target.value }))} disabled={rowBusy} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!resCreate.isSchedulable}
                    onChange={(e) => setResCreate((p) => ({ ...p, isSchedulable: e.target.checked }))}
                    disabled={rowBusy || resCreate.resourceType !== "OT_TABLE"}
                  />
                  Schedulable (required for OT_TABLE)
                </label>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setAddResOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void createResource()} disabled={rowBusy || !activeUnitId}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconPlus className="h-4 w-4" />}
                    Create Resource
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Edit Unit dialog ---------------- */}
        <Dialog open={unitEditOpen} onOpenChange={(v) => (rowBusy ? null : setUnitEditOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[560px] rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <Pencil className="h-5 w-5" />
                  </span>
                  Edit OT Unit
                </DialogTitle>
                <DialogDescription className="text-sm">Unit code is immutable; you can update name and active status.</DialogDescription>
              </DialogHeader>

              {rowErr ? (
                <div className="mt-4 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  {rowErr}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Name</Label>
                  <Input value={unitDraft?.name ?? ""} onChange={(e) => setUnitDraft((p) => (p ? { ...p, name: e.target.value } : p))} disabled={rowBusy} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!unitDraft?.isActive}
                    onChange={(e) => setUnitDraft((p) => (p ? { ...p, isActive: e.target.checked } : p))}
                    disabled={rowBusy}
                  />
                  Active
                </label>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setUnitEditOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void saveUnit()} disabled={rowBusy || !unitDraft?.id}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Delete Unit dialog ---------------- */}
        <Dialog open={unitDeleteOpen} onOpenChange={(v) => (rowBusy ? null : setUnitDeleteOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[600px] rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-white p-0 shadow-elev-2 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-[rgb(var(--zc-danger))]">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.10)]">
                    <Trash2 className="h-5 w-5" />
                  </span>
                  Delete OT Unit
                </DialogTitle>
                <DialogDescription className="text-sm">
                  This is a safe delete (deactivate). We also deactivate all rooms and resources under this OT Unit.
                </DialogDescription>
              </DialogHeader>

              {rowErr ? (
                <div className="mt-4 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  {rowErr}
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="text-sm font-semibold text-zc-text">{unitDraft?.name}</div>
                <div className="mt-1 text-xs text-zc-muted">This OT block will disappear from operational usage.</div>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setUnitDeleteOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-[rgb(var(--zc-danger))] border-[rgb(var(--zc-danger-rgb)/0.35)] hover:bg-[rgb(var(--zc-danger-rgb)/0.10)]"
                    onClick={() => void deactivateUnitCascade()}
                    disabled={rowBusy || !unitDraft?.id}
                  >
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete (Deactivate)
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Edit Room dialog ---------------- */}
        <Dialog open={roomEditOpen} onOpenChange={(v) => (rowBusy ? null : setRoomEditOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[560px] rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <Pencil className="h-5 w-5" />
                  </span>
                  Edit Room
                </DialogTitle>
                <DialogDescription className="text-sm">Room code is immutable; update name and active status.</DialogDescription>
              </DialogHeader>

              {rowErr ? (
                <div className="mt-4 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  {rowErr}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Code (read-only)</Label>
                  <Input value={roomDraft?.code ?? ""} disabled className="font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Name</Label>
                  <Input value={roomDraft?.name ?? ""} onChange={(e) => setRoomDraft((p) => (p ? { ...p, name: e.target.value } : p))} disabled={rowBusy} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!roomDraft?.isActive} onChange={(e) => setRoomDraft((p) => (p ? { ...p, isActive: e.target.checked } : p))} disabled={rowBusy} />
                  Active
                </label>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setRoomEditOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void saveRoom()} disabled={rowBusy || !roomDraft?.id}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Delete Room dialog ---------------- */}
        <Dialog open={roomDeleteOpen} onOpenChange={(v) => (rowBusy ? null : setRoomDeleteOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[560px] rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-white p-0 shadow-elev-2 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-[rgb(var(--zc-danger))]">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.10)]">
                    <Trash2 className="h-5 w-5" />
                  </span>
                  Delete Room
                </DialogTitle>
                <DialogDescription className="text-sm">Deactivates room and any resources inside it.</DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setRoomDeleteOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-[rgb(var(--zc-danger))] border-[rgb(var(--zc-danger-rgb)/0.35)] hover:bg-[rgb(var(--zc-danger-rgb)/0.10)]"
                    onClick={() => void deactivateRoomCascade()}
                    disabled={rowBusy || !roomDraft?.id}
                  >
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete (Deactivate)
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Edit Resource dialog ---------------- */}
        <Dialog open={resEditOpen} onOpenChange={(v) => (rowBusy ? null : setResEditOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[620px] rounded-2xl border border-indigo-200/50 bg-white p-0 shadow-elev-2 dark:border-indigo-800/50 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                    <Pencil className="h-5 w-5" />
                  </span>
                  Edit Resource
                </DialogTitle>
                <DialogDescription className="text-sm">Resource code is immutable; update name, active, schedulable, and state.</DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Code (read-only)</Label>
                  <Input value={resDraft?.code ?? ""} disabled className="font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">Name</Label>
                  <Input value={resDraft?.name ?? ""} onChange={(e) => setResDraft((p) => (p ? { ...p, name: e.target.value } : p))} disabled={rowBusy} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-zc-muted">State</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm text-zc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zc-accent/40"
                    value={resDraft?.state ?? "AVAILABLE"}
                    onChange={(e) => setResDraft((p) => (p ? { ...p, state: e.target.value as any } : p))}
                    disabled={rowBusy}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="CLEANING">CLEANING</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!resDraft?.isSchedulable} onChange={(e) => setResDraft((p) => (p ? { ...p, isSchedulable: e.target.checked } : p))} disabled={rowBusy} />
                  Schedulable
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!resDraft?.isActive} onChange={(e) => setResDraft((p) => (p ? { ...p, isActive: e.target.checked } : p))} disabled={rowBusy} />
                  Active
                </label>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setResEditOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="gap-2" onClick={() => void saveResource()} disabled={rowBusy || !resDraft?.id}>
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Delete Resource dialog ---------------- */}
        <Dialog open={resDeleteOpen} onOpenChange={(v) => (rowBusy ? null : setResDeleteOpen(v))}>
          <DialogContent className="w-[95vw] sm:max-w-[560px] rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-white p-0 shadow-elev-2 dark:bg-zc-card">
            <div className="p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center gap-3 text-[rgb(var(--zc-danger))]">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.10)]">
                    <Trash2 className="h-5 w-5" />
                  </span>
                  Delete Resource
                </DialogTitle>
                <DialogDescription className="text-sm">Deactivates resource and sets state INACTIVE.</DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setResDeleteOpen(false)} disabled={rowBusy}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-[rgb(var(--zc-danger))] border-[rgb(var(--zc-danger-rgb)/0.35)] hover:bg-[rgb(var(--zc-danger-rgb)/0.10)]"
                    onClick={() => void deactivateResource()}
                    disabled={rowBusy || !resDraft?.id}
                  >
                    {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete (Deactivate)
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
