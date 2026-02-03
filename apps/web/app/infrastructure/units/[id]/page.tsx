"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconBuilding } from "@/components/icons";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";

// ---------------- Types ----------------
type BranchRow = {
  id: string;
  code: string;
  name: string;
  city?: string;
};
type UnitDetail = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;
  locationNodeId?: string | null;
  createdAt?: string;
  updatedAt?: string;

  department?: { id: string; code: string; name: string };
  unitType?: { id: string; code: string; name: string; usesRoomsDefault?: boolean; schedulableByDefault?: boolean };

  // Optional enriched location payload (if backend includes it)
  locationNode?: {
    id: string;
    kind?: string | null;
    parentId?: string | null;
    revisions?: Array<{
      code: string;
      name: string;
      isActive?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string | null;
    }>;
  } | null;
};

type RoomRow = {
  id: string;
  unitId: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ResourceRow = {
  id: string;
  unitId: string;
  branchId: string;
  roomId?: string | null;

  resourceType: string;
  code: string;
  name: string;

  state: string;
  isActive: boolean;
  isSchedulable?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

// ---------------- Utilities (same style as your attached page.tsx) ----------------

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
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function valOrDash(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}
function formatLocation(node: UnitDetail["locationNode"], fallbackId?: string | null) {
  const rev = node?.revisions?.[0];
  const primary = rev ? `${rev.name} (${rev.code})` : valOrDash(fallbackId);
  const kind = (node?.kind || "")
    .toString()
    .trim()
    .replace(/_/g, " ");
  const secondary = kind ? kind : undefined;
  return { primary, secondary };
}

const tileTones = {
  indigo:
    "border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-indigo-100/40 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-indigo-900/10",
  sky:
    "border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-sky-100/40 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-sky-900/10",
  emerald:
    "border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-emerald-900/10",
  violet:
    "border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-violet-100/40 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-violet-900/10",
  amber:
    "border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-amber-900/10",
  rose:
    "border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-rose-100/40 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-rose-900/10",
} as const;

type TileTone = keyof typeof tileTones;

function InfoTile({
  tone,
  label,
  value,
  icon,
  mono,
  hint,
}: {
  tone: TileTone;
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-4", tileTones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
          <div className={cn("mt-2 text-sm font-semibold text-zc-text break-words", mono ? "font-mono" : "")}>{value}</div>
          {hint ? <div className="mt-1 text-xs text-zc-muted">{hint}</div> : null}
        </div>

        <div className="shrink-0 rounded-xl border border-white/60 bg-white/55 p-2 text-zc-text/80 shadow-sm dark:border-white/10 dark:bg-black/10">
          {icon}
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/45 blur-2xl dark:bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/30 blur-2xl dark:bg-white/5" />
    </div>
  );
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

function readinessFlag(ok: boolean, note?: string) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Pending{note ? ` • ${note}` : ""}
    </span>
  );
}

// ---------------- ModalShell (same as attached page.tsx) ----------------

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-200/40 bg-zc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Modals ----------------

function EditUnitModal({
  open,
  unit,
  onClose,
  onSaved,
}: {
  open: boolean;
  unit: UnitDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !unit) return;
    setErr(null);
    setBusy(false);
    setName(unit.name ?? "");
    setIsActive(!!unit.isActive);
  }, [open, unit]);

  async function onSubmit() {
    if (!unit?.id) return;
    setErr(null);
    if (!name.trim()) return setErr("Unit name is required");

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/units/${encodeURIComponent(unit.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), isActive }),
      });

      toast({ title: "Unit Updated", description: `Updated "${name.trim()}"` });
      onClose();
      void Promise.resolve(onSaved()).catch(() => { });
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !unit) return null;

  return (
    <ModalShell
      title="Edit Unit"
      description="Update name and activation. Unit code/type mapping is intended to stay stable."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4 ">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Unit code</div>
            <Input value={unit.code} disabled className="mt-1 font-mono" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch</div>
            <Input value={unit.branchId} disabled className="mt-1 font-mono" />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Unit name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zc-text">Active</div>
            <div className="mt-1 text-sm text-zc-muted">Inactive units are hidden in selectors and workflows.</div>
          </div>
          <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}

function CreateOrEditRoomModal({
  open,
  mode,
  unit,
  room,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  unit: UnitDetail | null;
  room: RoomRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    if (mode === "edit" && room) {
      setCode(room.code ?? "");
      setName(room.name ?? "");
      setIsActive(!!room.isActive);
    } else {
      setCode("");
      setName("");
      setIsActive(true);
    }
  }, [open, mode, room]);

  async function onSubmit() {
    if (!unit?.id) return;
    if (!unit.branchId) return setErr("BranchId missing. Refresh unit details.");
    if (!unit.usesRooms) return setErr("This unit is open-bay (usesRooms=false). Rooms are not allowed.");

    setErr(null);
    if (!code.trim()) return setErr("Room code is required");
    if (!name.trim()) return setErr("Room name is required");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/rooms?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            unitId: unit.id,
            code: code.trim(),
            name: name.trim(),
            isActive,
          }),
        });
        toast({ title: "Room Created", description: `Created "${name.trim()}"` });
      } else {
        if (!room?.id) throw new Error("Room not found");
        await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "PATCH",
          body: JSON.stringify({ code: code.trim(), name: name.trim(), isActive }),
        });
        toast({ title: "Room Updated", description: `Updated "${name.trim()}"` });
      }

      onClose();
      void Promise.resolve(onSaved()).catch(() => { });
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Create Room" : "Edit Room"}
      description={mode === "create" ? "Add a Room/Bay under this unit." : "Update code/name and activation."}
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room code</div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TH01 / OT-1 / LAB1"
              className="mt-1 font-mono"
              maxLength={32}
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
              <div className="text-sm text-zc-muted">Visibility in selectors</div>
              <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Theatre 1" className="mt-1" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DeleteRoomModal({
  open,
  unit,
  room,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitDetail | null;
  room: RoomRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
  }, [open]);

  async function onConfirm() {
    if (!unit?.branchId || !room?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/rooms/${encodeURIComponent(room.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
        method: "DELETE",
      });

      toast({ title: "Room Deleted", description: `Deleted "${room.name}"` });
      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !room) return null;

  return (
    <ModalShell title="Delete Room" description="This will remove the room from the unit. Ensure no active dependencies." onClose={onClose}>
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {room.name} <span className="text-zc-muted">({room.code})</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

const RESOURCE_STATES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "INACTIVE"] as const;

function CreateOrEditResourceModal({
  open,
  mode,
  unit,
  rooms,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  unit: UnitDetail | null;
  rooms: RoomRow[];
  resource: ResourceRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [roomId, setRoomId] = React.useState<string | undefined>(undefined);
  const [resourceType, setResourceType] = React.useState("BED");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [state, setState] = React.useState<string>("AVAILABLE");
  const [isActive, setIsActive] = React.useState(true);
  const [isSchedulable, setIsSchedulable] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "edit" && resource) {
      setRoomId(resource.roomId || undefined);
      setResourceType(resource.resourceType || "BED");
      setCode(resource.code || "");
      setName(resource.name || "");
      setState(resource.state || "AVAILABLE");
      setIsActive(!!resource.isActive);
      setIsSchedulable(!!resource.isSchedulable);
    } else {
      setRoomId(undefined);
      setResourceType("BED");
      setCode("");
      setName("");
      setState("AVAILABLE");
      setIsActive(true);
      setIsSchedulable(Boolean(unit?.unitType?.schedulableByDefault));
    }
  }, [open, mode, resource, unit]);

  async function onSubmit() {
    if (!unit?.id) return;
    if (!unit.branchId) return setErr("BranchId missing. Refresh unit details.");

    setErr(null);
    if (!resourceType.trim()) return setErr("Resource type is required");
    if (!code.trim()) return setErr("Resource code is required");
    if (!name.trim()) return setErr("Resource name is required");
    if (unit.usesRooms && !roomId) return setErr("Room selection is required for this unit (usesRooms=true)");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/resources?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            unitId: unit.id,
            roomId: unit.usesRooms ? roomId : null,
            resourceType: resourceType.trim(),
            code: code.trim(),
            name: name.trim(),
            state,
            isActive,
            isSchedulable,
          }),
        });

        toast({ title: "Resource Created", description: `Created "${name.trim()}"` });
      } else {
        if (!resource?.id) throw new Error("Resource not found");
        await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}?branchId=${encodeURIComponent(unit.branchId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            roomId: unit.usesRooms ? roomId : null,
            resourceType: resourceType.trim(),
            code: code.trim(),
            name: name.trim(),
            state,
            isActive,
            isSchedulable,
          }),
        });

        toast({ title: "Resource Updated", description: `Updated "${name.trim()}"` });
      }

      onClose();
      void Promise.resolve(onSaved()).catch(() => { });
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Create Resource" : "Edit Resource"}
      description="Add equipment/beds/tables and set state/schedulability."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {unit?.usesRooms ? (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Room</div>
            <Select value={roomId} onValueChange={(v) => setRoomId(v)}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Select room…" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} <span className="text-zc-muted">({r.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Resource type</div>
            <Input
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value.toUpperCase())}
              placeholder="BED / OT_TABLE / VENTILATOR"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">State</div>
            <Select value={state} onValueChange={(v) => setState(v)}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="State" />
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
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="B01 / OT-TABLE-1" className="mt-1 font-mono" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bed 01" className="mt-1" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <div className="mt-1 text-sm text-zc-muted">Inactive resources are hidden in selectors.</div>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Schedulable</div>
              <div className="mt-1 text-sm text-zc-muted">Use in scheduling workflows (OT/appointments).</div>
            </div>
            <Switch checked={isSchedulable} onCheckedChange={(v) => setIsSchedulable(!!v)} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DeleteResourceModal({
  open,
  unit,
  resource,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitDetail | null;
  resource: ResourceRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
  }, [open]);

  async function onConfirm() {
    if (!unit?.branchId || !resource?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(
        `/api/infrastructure/resources/${encodeURIComponent(resource.id)}?branchId=${encodeURIComponent(unit.branchId)}`,
        { method: "DELETE" },
      );

      toast({ title: "Resource Deleted", description: `Deleted "${resource.name}"` });
      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !resource) return null;

  return (
    <ModalShell title="Delete Resource" description="Ensure this resource is not used in active workflows." onClose={onClose}>
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {resource.name} <span className="text-zc-muted">({resource.code})</span>
        </div>
        <div className="mt-2 text-sm text-zc-muted">
          Type: <span className="font-mono">{resource.resourceType}</span> • State:{" "}
          <span className="font-mono">{resource.state}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

function DeleteUnitModal({
  open,
  unit,
  roomsCount,
  resourcesCount,
  onClose,
  onDeleted,
}: {
  open: boolean;
  unit: UnitDetail | null;
  roomsCount: number;
  resourcesCount: number;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
  }, [open]);

  async function onConfirm() {
    if (!unit?.id) return;
    setErr(null);
    setBusy(true);
    try {
      // soft deactivation with cascade by default
      await apiFetch(
        `/api/infrastructure/units/${encodeURIComponent(unit.id)}?cascade=true&hard=false`,
        { method: "DELETE" },
      );

      toast({ title: "Unit Deleted", description: `Deactivated "${unit.name}"` });
      await onDeleted();

      // route back to units list
      router.push("/infrastructure/units");
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !unit) return null;

  return (
    <ModalShell
      title="Delete Unit"
      description="This deactivates the unit (soft delete). Cascade will deactivate dependent items where allowed."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {unit.name} <span className="text-zc-muted">({unit.code})</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MetricPill label="Rooms" value={roomsCount} tone="sky" />
          <MetricPill label="Resources" value={resourcesCount} tone="violet" />
        </div>

        {(roomsCount + resourcesCount) > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
            <div className="min-w-0">
              Unit has dependent records. Deactivation will be cascaded where allowed.
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

// ---------------- Page ----------------

export default function UnitDetailPage() {
  const { toast } = useToast();

  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [branchLoading, setBranchLoading] = React.useState(false);
  const [row, setRow] = React.useState<UnitDetail | null>(null);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [resources, setResources] = React.useState<ResourceRow[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<"rooms" | "resources">("rooms");

  // modals
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [roomModalOpen, setRoomModalOpen] = React.useState(false);
  const [roomModalMode, setRoomModalMode] = React.useState<"create" | "edit">("create");
  const [roomEditing, setRoomEditing] = React.useState<RoomRow | null>(null);
  const [roomDeleteOpen, setRoomDeleteOpen] = React.useState(false);

  const [resModalOpen, setResModalOpen] = React.useState(false);
  const [resModalMode, setResModalMode] = React.useState<"create" | "edit">("create");
  const [resEditing, setResEditing] = React.useState<ResourceRow | null>(null);
  const [resDeleteOpen, setResDeleteOpen] = React.useState(false);

  const branchId = row?.branchId || "";

  async function loadRooms(u: UnitDetail | null) {
    if (!u?.id) return setRooms([]);
    if (!u.branchId) throw new Error("branchId is required for global operations");
    if (!u.usesRooms) return setRooms([]);
    const r = await apiFetch<RoomRow[]>(
      `/api/infrastructure/rooms?branchId=${encodeURIComponent(u.branchId)}&unitId=${encodeURIComponent(u.id)}`,
    );
    setRooms(r || []);
  }

  async function loadResources(u: UnitDetail | null) {
    if (!u?.id) return setResources([]);
    if (!u.branchId) throw new Error("branchId is required for global operations");
    const r = await apiFetch<ResourceRow[]>(
      `/api/infrastructure/resources?branchId=${encodeURIComponent(u.branchId)}&unitId=${encodeURIComponent(u.id)}`,
    );
    setResources(r || []);
  }

  async function refresh(showToast = false) {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<UnitDetail>(`/api/infrastructure/units/${encodeURIComponent(id)}`);
      setRow(data);
      if (data?.branchId) void loadBranchById(data.branchId);
      // default tab
      setActiveTab(data?.usesRooms ? "rooms" : "resources");

      // load dependent lists (with branchId)
      await Promise.all([loadRooms(data), loadResources(data)]);

      if (showToast) {
        toast({ title: "Unit refreshed", description: "Loaded latest unit details.", duration: 1800 });
      }
      

    } catch (e: any) {
      const msg = e?.message || "Failed to load unit";
      setErr(msg);
      setRow(null);
      setRooms([]);
      setResources([]);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }
  async function loadBranchById(branchId: string) {
    setBranchLoading(true);
    try {
      // 1) Try direct endpoint (if you have it)
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(branchId)}`);
      setBranch(b);
      return;
    } catch {
      // 2) Fallback to list endpoint (you definitely used this earlier)
      try {
        const list = await apiFetch<BranchRow[]>(`/api/branches`);
        const found = (list || []).find((x) => x.id === branchId) || null;
        setBranch(found);
      } finally {
        // no-op
      }
    } finally {
      setBranchLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  React.useEffect(() => {
        if (!row?.branchId) return;
        void loadBranchById(row.branchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [row?.branchId]);
  async function updateResourceState(resourceId: string, state: string) {
    if (!row?.branchId) {
      toast({ title: "Branch missing", description: "BranchId is required for global operations.", variant: "destructive" as any });
      return;
    }
    try {
      await apiFetch(
        `/api/infrastructure/resources/${encodeURIComponent(resourceId)}/state?branchId=${encodeURIComponent(row.branchId)}`,
        { method: "PUT", body: JSON.stringify({ state }) },
      );
      toast({ title: "Updated", description: "Resource state updated." });
      await loadResources(row);
    } catch (e: any) {
      const msg = e?.message || "State update failed";
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    }
  }

  const roomsCount = rooms.length;
  const resourcesCount = resources.length;

  const readyLocation = !!row?.locationNodeId;
  const readyRooms = row?.usesRooms ? roomsCount > 0 : true; // open-bay: rooms not required
  const readyResources = resourcesCount > 0;

  return (
    <AppShell title="Unit Dashboard">
      <RequirePerm perm="INFRA_UNIT_READ">
      <div className="grid gap-6">
        {/* Header (same pattern as attached page.tsx) */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/infrastructure" className="hover:underline">
                    Infrastructure
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <Link href="/infrastructure/units" className="hover:underline">
                    Units
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Details</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-9 w-72" /> : row?.name || "Unit"}
                </div>

                {!loading && row ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                    <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                      {row.code}
                    </span>
                    <span className="text-zc-muted/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Branch:{" "}
                      <span className="font-semibold text-zc-text">
                        {branchLoading ? "Loading…" : branch?.name || row.branchId}
                      </span>
                      {branch?.code ? (
                        <span className="ml-2 rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[11px] text-zc-muted">
                          {branch.code}
                        </span>
                      ) : null}

                    </span>
                    <span className="text-zc-muted/60">•</span>
                    <span className="inline-flex items-center gap-1" style={{ color: row.isActive ? "green" : "red" }}>
                      <BadgeCheck className="h-4 w-4" />
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {readinessFlag(readyLocation, "Location")}
              {readinessFlag(readyRooms, row?.usesRooms ? "Rooms" : "Open-bay")}
              {readinessFlag(readyResources, "Resources")}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button variant="outline" className="gap-2" onClick={() => void refresh(true)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            <Button variant="secondary" className="gap-2" disabled={loading || !row} onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>


            <Button
              variant="success"
              className="gap-2"
              disabled={loading || !row?.usesRooms}
              onClick={() => {
                setRoomEditing(null);
                setRoomModalMode("create");
                setRoomModalOpen(true);
              }}
              title={row?.usesRooms ? "Create room" : "Rooms are disabled (open-bay unit)"}
            >
              <DoorOpen className="h-4 w-4" />
              Add Room
            </Button>

            <Button
              className="gap-2"
              disabled={loading || !row}
              onClick={() => {
                setResEditing(null);
                setResModalMode("create");
                setResModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={loading || !row}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>

          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Summary tiles */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-zc-accent" />
                Unit Summary
              </CardTitle>
              <CardDescription>Core configuration and references.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : row ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile
                    tone="indigo"
                    label="Unit code"
                    value={<span className="text-lg font-mono">{row.code}</span>}
                    icon={<BadgeCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />}
                  />

                  <InfoTile
                    tone="sky"
                    label="Branch"
                    value={<span className="font-mono">{row.branchId}</span>}
                    icon={<IconBuilding className="h-5 w-5 text-sky-600 dark:text-sky-300" />}
                    mono
                  />

                  <InfoTile
                    tone="emerald"
                    label="Department"
                    value={row.department ? `${row.department.name} (${row.department.code})` : valOrDash(row.departmentId)}
                    icon={<ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />}
                  />

                  <InfoTile
                    tone="violet"
                    label="Unit type"
                    value={row.unitType ? `${row.unitType.name} (${row.unitType.code})` : valOrDash(row.unitTypeId)}
                    icon={<Wrench className="h-5 w-5 text-violet-600 dark:text-violet-300" />}
                  />

                  <InfoTile
                    tone="amber"
                    label="Rooms mode"
                    value={<span className="font-semibold">{row.usesRooms ? "Rooms" : "Open-bay"}</span>}
                    icon={<DoorOpen className="h-5 w-5 text-amber-700 dark:text-amber-300" />}
                    hint={row.usesRooms ? "Rooms/Bays can be configured under this unit." : "Open-bay unit: rooms are disabled."}
                  />

                  {(() => {
                    const loc = formatLocation(row.locationNode ?? null, row.locationNodeId ?? null);
                    const isFallback = !row.locationNode?.revisions?.[0] && !!row.locationNodeId;

                    return (
                      <InfoTile
                        tone="rose"
                        label="Location"
                        value={
                          <div className="grid gap-1">
                            <span className={cn("text-sm font-semibold", isFallback ? "font-mono" : "")}>{loc.primary}</span>
                            {loc.secondary ? <span className="text-xs text-zc-muted">{loc.secondary}</span> : null}
                          </div>
                        }
                        icon={<MapPin className="h-5 w-5 text-rose-600 dark:text-rose-300" />}
                      />
                    );
                  })()}


                  <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4 md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <MetricPill label="Rooms" value={roomsCount} tone="sky" />
                      <MetricPill label="Resources" value={resourcesCount} tone="violet" />
                      <MetricPill label="Updated" value={0} tone="zinc" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-zc-muted">
                      <span>Created: {fmtDate(row.createdAt)}</span>
                      <span>Updated: {fmtDate(row.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zc-muted">Unit not found.</div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-zc-accent" />
                Quick Actions
              </CardTitle>
              <CardDescription>Most common configuration operations.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="grid gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Views</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!row?.usesRooms}
                      onClick={() => setActiveTab("rooms")}
                      className={cn(
                        "group rounded-2xl border p-3 text-left transition",
                        activeTab === "rooms"
                          ? "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-900/20"
                          : "border-zc-border bg-zc-panel/10 hover:bg-zc-panel/20",
                        !row?.usesRooms ? "opacity-50 cursor-not-allowed" : "",
                      )}
                      aria-pressed={activeTab === "rooms"}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-black/10">
                            <DoorOpen className="h-4 w-4 text-sky-700 dark:text-sky-200" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zc-text">Rooms / Bays</div>
                            <div className="text-xs text-zc-muted">Configure room structure</div>
                          </div>
                        </div>
                        <span className="rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                          {roomsCount}
                        </span>
                      </div>

                      {!row?.usesRooms ? (
                        <div className="mt-2 text-xs text-zc-muted">Open-bay unit: rooms disabled</div>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("resources")}
                      className={cn(
                        "group rounded-2xl border p-3 text-left transition",
                        activeTab === "resources"
                          ? "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/40 dark:bg-violet-900/20"
                          : "border-zc-border bg-zc-panel/10 hover:bg-zc-panel/20",
                      )}
                      aria-pressed={activeTab === "resources"}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-black/10">
                            <Wrench className="h-4 w-4 text-violet-700 dark:text-violet-200" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zc-text">Resources</div>
                            <div className="text-xs text-zc-muted">Beds / OT tables / equipment</div>
                          </div>
                        </div>
                        <span className="rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                          {resourcesCount}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-zc-muted">
                    Tip: Use “Rooms / Bays” to structure the unit (if enabled), then add Resources for beds/equipment.
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Actions</div>
                  <div className="mt-2 grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      disabled={!row?.usesRooms}
                      onClick={() => {
                        setRoomEditing(null);
                        setRoomModalMode("create");
                        setRoomModalOpen(true);
                      }}
                      title={row?.usesRooms ? "Create Room" : "Rooms are disabled for open-bay units"}
                    >
                      <Plus className="h-4 w-4" />
                      Create Room
                    </Button>

                    <Button
                      className="justify-start gap-2"
                      disabled={!row}
                      onClick={() => {
                        setResEditing(null);
                        setResModalMode("create");
                        setResModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Create Resource
                    </Button>

                    <Button variant="outline" className="justify-start gap-2" disabled={!row} onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4" />
                      Edit Unit
                    </Button>

                    <Button variant="outline" className="justify-start gap-2" onClick={() => void refresh(true)}>
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* View Switcher (sticky-friendly) */}
        <Card className="overflow-hidden">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Manage Unit Contents</div>
                <div className="mt-1 text-sm text-zc-muted">Switch between Rooms/Bays and Resources. Counts update live.</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-2xl border border-zc-border bg-zc-panel/10 p-1">
                  <button
                    type="button"
                    disabled={!row?.usesRooms}
                    onClick={() => setActiveTab("rooms")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      activeTab === "rooms"
                        ? "bg-sky-50/70 text-sky-800 border border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-900/40"
                        : "text-zc-muted hover:text-zc-text",
                      !row?.usesRooms ? "opacity-50 cursor-not-allowed" : "",
                    )}
                    aria-pressed={activeTab === "rooms"}
                  >
                    <DoorOpen className="h-4 w-4" />
                    Rooms
                    <span className="ml-1 rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] tabular-nums text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                      {roomsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("resources")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      activeTab === "resources"
                        ? "bg-violet-50/70 text-violet-800 border border-violet-200/70 dark:bg-violet-900/20 dark:text-violet-200 dark:border-violet-900/40"
                        : "text-zc-muted hover:text-zc-text",
                    )}
                    aria-pressed={activeTab === "resources"}
                  >
                    <Wrench className="h-4 w-4" />
                    Resources
                    <span className="ml-1 rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] tabular-nums text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                      {resourcesCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lists */}
        {activeTab === "rooms" ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Rooms / Bays</CardTitle>
              <CardDescription>
                {row?.usesRooms
                  ? "Rooms configured under this unit."
                  : "This unit is open-bay (usesRooms=false). Rooms are disabled."}
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !row?.usesRooms ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4 text-sm text-zc-muted">
                  Rooms are disabled for this unit. (Open-bay)
                </div>
              ) : rooms.length === 0 ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4 text-sm text-zc-muted">
                  No rooms found. Click “Add Room” to create one.
                </div>
              ) : (
                <div className="grid gap-2">
                  {rooms.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-2 rounded-2xl border border-zc-border bg-zc-panel/20 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                            {r.code}
                          </span>
                          <span className="text-sm font-semibold text-zc-text">{r.name}</span>
                          {r.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-zc-muted">
                          Updated: {fmtDate(r.updatedAt)} • Created: {fmtDate(r.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setRoomEditing(r);
                            setRoomModalMode("edit");
                            setRoomModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setRoomEditing(r);
                            setRoomDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "resources" ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Manage equipment/beds/tables and state.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : resources.length === 0 ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4 text-sm text-zc-muted">
                  No resources found. Click “Add Resource” to create one.
                </div>
              ) : (
                <div className="grid gap-2">
                  {resources.map((res) => {
                    const roomCode = res.roomId ? rooms.find((x) => x.id === res.roomId)?.code : null;

                    return (
                      <div
                        key={res.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zc-border bg-zc-panel/20 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                              {res.code}
                            </span>
                            <span className="text-sm font-semibold text-zc-text">{res.name}</span>
                            <span className="rounded-full border border-zc-border bg-zc-panel/25 px-2 py-0.5 text-[11px] text-zc-muted">
                              type: <span className="font-mono text-zc-text">{res.resourceType}</span>
                            </span>

                            {row?.usesRooms ? (
                              <span className="rounded-full border border-zc-border bg-zc-panel/25 px-2 py-0.5 text-[11px] text-zc-muted">
                                room: <span className="font-mono text-zc-text">{roomCode || "—"}</span>
                              </span>
                            ) : null}

                            {res.isSchedulable ? (
                              <span className="rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                schedulable
                              </span>
                            ) : (
                              <span className="rounded-full border border-zc-border bg-zc-panel/25 px-2 py-0.5 text-[11px] text-zc-muted">
                                not schedulable
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-zc-muted">
                            Updated: {fmtDate(res.updatedAt)} • Created: {fmtDate(res.createdAt)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Select value={res.state} onValueChange={(v) => void updateResourceState(res.id, v)}>
                            <SelectTrigger className="h-9 w-[220px]">
                              <SelectValue placeholder="State" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOURCE_STATES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setResEditing(res);
                              setResModalMode("edit");
                              setResModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setResEditing(res);
                              setResDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Modals */}
      <EditUnitModal open={editOpen} unit={row} onClose={() => setEditOpen(false)} onSaved={() => refresh(false)} />

      <DeleteUnitModal
        open={deleteOpen}
        unit={row}
        roomsCount={roomsCount}
        resourcesCount={resourcesCount}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => refresh(false)}
      />

      <CreateOrEditRoomModal
        open={roomModalOpen}
        mode={roomModalMode}
        unit={row}
        room={roomEditing}
        onClose={() => setRoomModalOpen(false)}
        onSaved={() => refresh(false)}
      />

      <DeleteRoomModal
        open={roomDeleteOpen}
        unit={row}
        room={roomEditing}
        onClose={() => setRoomDeleteOpen(false)}
        onDeleted={() => refresh(false)}
      />

      <CreateOrEditResourceModal
        open={resModalOpen}
        mode={resModalMode}
        unit={row}
        rooms={rooms}
        resource={resEditing}
        onClose={() => setResModalOpen(false)}
        onSaved={() => refresh(false)}
      />

      <DeleteResourceModal
        open={resDeleteOpen}
        unit={row}
        resource={resEditing}
        onClose={() => setResDeleteOpen(false)}
        onDeleted={() => refresh(false)}
      />
          </RequirePerm>
</AppShell>
  );
}
