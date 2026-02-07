"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Calendar,
  ClipboardList,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type UnitBrief = { id: string; code: string; name: string; usesRooms?: boolean | null };
type RoomBrief = { id: string; code: string; name: string };

type ResourceState =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "CLEANING"
  | "SANITIZATION"
  | "MAINTENANCE"
  | "BLOCKED"
  | "INACTIVE";

type ResourceCategory = "BED" | "PROCEDURE" | "DIAGNOSTIC" | "CONSULTATION" | "OTHER";

type ResourceDetail = {
  id: string;
  branchId: string;
  unitId: string;
  roomId?: string | null;

  code: string;
  name: string;
  assetTag?: string | null;

  resourceType: string;
  resourceCategory?: ResourceCategory | null;

  // specs
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;

  // caps
  hasMonitor?: boolean | null;
  hasOxygenSupply?: boolean | null;
  hasSuction?: boolean | null;
  hasVentilatorSupport?: boolean | null;
  isPowerRequired?: boolean | null;

  // state mgmt
  state: ResourceState;
  currentState?: ResourceState;
  isAvailable?: boolean;
  assignedPatientId?: string | null;

  // scheduling
  isSchedulable: boolean;
  slotDurationMinutes?: number | null;

  // maintenance
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  warrantyExpiryDate?: string | null;

  // status
  isActive: boolean;
  commissionedAt?: string | null;

  // reasons (optional)
  reservedReason?: string | null;
  blockedReason?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  unit?: UnitBrief | null;
  room?: RoomBrief | null;
};

/* --------------------------------- UI utils --------------------------------- */

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  rose: "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
};

function pill(tone: keyof typeof pillTones, text: string) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", pillTones[tone])}>
      {text}
    </span>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function isoDateToInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // Use yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

function inputToDateString(v: string) {
  const s = String(v || "").trim();
  return s ? s : undefined;
}

/* ----------------------------- State UI helpers ---------------------------- */

const RESOURCE_CATEGORIES: ResourceCategory[] = ["BED", "PROCEDURE", "DIAGNOSTIC", "CONSULTATION", "OTHER"];

const ALL_STATES: ResourceState[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "CLEANING",
  "SANITIZATION",
  "MAINTENANCE",
  "BLOCKED",
  "INACTIVE",
];

function stateTone(s: ResourceState): keyof typeof pillTones {
  switch (s) {
    case "AVAILABLE":
      return "emerald";
    case "RESERVED":
      return "amber";
    case "OCCUPIED":
      return "rose";
    case "CLEANING":
    case "SANITIZATION":
      return "sky";
    case "MAINTENANCE":
      return "violet";
    case "BLOCKED":
      return "zinc";
    case "INACTIVE":
      return "zinc";
  }
}

function allowedTransitions(from: ResourceState): ResourceState[] {
  switch (from) {
    case "AVAILABLE":
      return ["OCCUPIED", "RESERVED", "MAINTENANCE", "BLOCKED", "INACTIVE"];
    case "RESERVED":
      return ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED", "INACTIVE"];
    case "OCCUPIED":
      return ["CLEANING", "SANITIZATION", "MAINTENANCE", "BLOCKED", "INACTIVE"];
    case "CLEANING":
      return ["AVAILABLE", "MAINTENANCE", "BLOCKED", "INACTIVE"];
    case "SANITIZATION":
      return ["AVAILABLE", "MAINTENANCE", "BLOCKED", "INACTIVE"];
    case "MAINTENANCE":
      return ["AVAILABLE", "BLOCKED", "INACTIVE"];
    case "BLOCKED":
      return ["AVAILABLE", "MAINTENANCE", "INACTIVE"];
    case "INACTIVE":
      return [];
  }
}

function requiresReason(s: ResourceState) {
  return s === "RESERVED" || s === "BLOCKED";
}

function resourceTypeBadge(value?: string | null) {
  if (!value) return <Badge variant="secondary">â€”</Badge>;
  return <Badge variant="neutral">{value}</Badge>;
}

function categoryBadge(value?: ResourceCategory | null) {
  if (!value) return <Badge variant="secondary">â€”</Badge>;
  return <Badge variant="neutral">{value}</Badge>;
}

function activeBadge(value?: boolean | null) {
  if (value === true) return <Badge variant="success">ACTIVE</Badge>;
  if (value === false) return <Badge variant="secondary">INACTIVE</Badge>;
  return <Badge variant="secondary">â€”</Badge>;
}

function availabilityBadge(value?: boolean | null) {
  if (value === true) return <Badge variant="ok">AVAILABLE</Badge>;
  if (value === false) return <Badge variant="secondary">UNAVAILABLE</Badge>;
  return <Badge variant="secondary">â€”</Badge>;
}

function stateBadge(value?: ResourceState | null) {
  if (!value) return <Badge variant="secondary">â€”</Badge>;
  if (value === "AVAILABLE") return <Badge variant="ok">AVAILABLE</Badge>;
  if (value === "RESERVED") return <Badge variant="warning">RESERVED</Badge>;
  if (value === "OCCUPIED") return <Badge variant="destructive">OCCUPIED</Badge>;
  if (value === "CLEANING" || value === "SANITIZATION") return <Badge variant="neutral">{value}</Badge>;
  if (value === "MAINTENANCE") return <Badge variant="warning">MAINTENANCE</Badge>;
  if (value === "BLOCKED") return <Badge variant="destructive">BLOCKED</Badge>;
  return <Badge variant="secondary">INACTIVE</Badge>;
}

function yesNo(v?: boolean | null) {
  if (v === true) return <Badge className="bg-emerald-600 text-white">YES</Badge>;
  if (v === false) return <Badge variant="secondary">NO</Badge>;
  return <Badge variant="secondary">â€”</Badge>;
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

/* --------------------------------- Modals --------------------------------- */

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
      <div className="w-full max-w-3xl rounded-2xl border border-indigo-200/40 bg-zc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
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

function EditResourceModal({
  open,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  resource: ResourceDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [assetTag, setAssetTag] = React.useState("");
  const [category, setCategory] = React.useState<ResourceCategory>("OTHER");

  const [manufacturer, setManufacturer] = React.useState("");
  const [model, setModel] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");

  const [hasMonitor, setHasMonitor] = React.useState(false);
  const [hasOxygenSupply, setHasOxygenSupply] = React.useState(false);
  const [hasSuction, setHasSuction] = React.useState(false);
  const [hasVentilatorSupport, setHasVentilatorSupport] = React.useState(false);
  const [isPowerRequired, setIsPowerRequired] = React.useState(false);

  const [isSchedulable, setIsSchedulable] = React.useState(false);
  const [slotDurationMinutes, setSlotDurationMinutes] = React.useState<string>("");

  const [lastMaintenanceDate, setLastMaintenanceDate] = React.useState<string>("");
  const [nextMaintenanceDate, setNextMaintenanceDate] = React.useState<string>("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = React.useState<string>("");

  const [commissionedAt, setCommissionedAt] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !resource) return;

    setErr(null);
    setBusy(false);

    setName(resource.name ?? "");
    setAssetTag(resource.assetTag ?? "");
    setCategory((resource.resourceCategory as any) || "OTHER");

    setManufacturer(resource.manufacturer ?? "");
    setModel(resource.model ?? "");
    setSerialNumber(resource.serialNumber ?? "");

    setHasMonitor(!!resource.hasMonitor);
    setHasOxygenSupply(!!resource.hasOxygenSupply);
    setHasSuction(!!resource.hasSuction);
    setHasVentilatorSupport(!!resource.hasVentilatorSupport);
    setIsPowerRequired(!!resource.isPowerRequired);

    setIsSchedulable(!!resource.isSchedulable);
    setSlotDurationMinutes(resource.slotDurationMinutes ? String(resource.slotDurationMinutes) : "");

    setLastMaintenanceDate(isoDateToInput(resource.lastMaintenanceDate));
    setNextMaintenanceDate(isoDateToInput(resource.nextMaintenanceDate));
    setWarrantyExpiryDate(isoDateToInput(resource.warrantyExpiryDate));

    setCommissionedAt(isoDateToInput(resource.commissionedAt));
    setIsActive(!!resource.isActive);
  }, [open, resource]);

  async function onSubmit() {
    if (!resource?.id) return;
    setErr(null);

    if (!name.trim()) {
      setErr("Resource name is required");
      return;
    }

    const slotRaw = slotDurationMinutes.trim();
    const slotNum = slotRaw === "" ? null : Number.parseInt(slotRaw, 10);
    if (slotNum !== null && (!Number.isFinite(slotNum) || slotNum <= 0)) {
      setErr("Slot duration must be a valid number (minutes)");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          assetTag: assetTag.trim() ? assetTag.trim() : undefined,
          resourceCategory: category,

          manufacturer: manufacturer.trim() ? manufacturer.trim() : undefined,
          model: model.trim() ? model.trim() : undefined,
          serialNumber: serialNumber.trim() ? serialNumber.trim() : undefined,

          hasMonitor,
          hasOxygenSupply,
          hasSuction,
          hasVentilatorSupport,
          isPowerRequired,

          isSchedulable,
          slotDurationMinutes: slotNum ?? undefined,

          lastMaintenanceDate: inputToDateString(lastMaintenanceDate),
          nextMaintenanceDate: inputToDateString(nextMaintenanceDate),
          warrantyExpiryDate: inputToDateString(warrantyExpiryDate),

          commissionedAt: inputToDateString(commissionedAt),

          isActive,
        }),
      });

      toast({ title: "Resource Updated", description: `Updated "${name.trim()}"` });
      onClose();
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!resource) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return;
        if (!v) setErr(null);
        if (!v) onClose();
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Edit Resource
          </DialogTitle>
          <DialogDescription>Update resource metadata, capabilities, scheduling and maintenance.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., ICU Bed 101-1" />
        </div>

        <div className="space-y-2">
          <Label>Asset Tag</Label>
          <Input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="Optional physical tag" />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ResourceCategory)}>
            <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Commissioned At</Label>
          <Input type="date" value={commissionedAt} onChange={(e) => setCommissionedAt(e.target.value)} />
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Manufacturer</Label>
          <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Serial Number</Label>
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
            <ShieldCheck className="h-4 w-4 text-zc-accent" />
            Capabilities
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Monitor</span>
              <Switch checked={hasMonitor} onCheckedChange={setHasMonitor} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Oxygen Supply</span>
              <Switch checked={hasOxygenSupply} onCheckedChange={setHasOxygenSupply} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Suction</span>
              <Switch checked={hasSuction} onCheckedChange={setHasSuction} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Ventilator Support</span>
              <Switch checked={hasVentilatorSupport} onCheckedChange={setHasVentilatorSupport} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2 md:col-span-2">
              <span className="text-sm text-zc-muted">Power Required</span>
              <Switch checked={isPowerRequired} onCheckedChange={setIsPowerRequired} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
            <ClipboardList className="h-4 w-4 text-zc-accent" />
            Scheduling & Status
          </div>

          <div className="mt-3 grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Schedulable</span>
              <Switch checked={isSchedulable} onCheckedChange={setIsSchedulable} />
            </div>

            <div className="grid gap-2">
              <Label>Slot Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(e.target.value)}
                placeholder="e.g., 15"
                disabled={!isSchedulable}
              />
              <div className="text-xs text-zc-muted">Enabled only for schedulable resources.</div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/20 px-3 py-2">
              <span className="text-sm text-zc-muted">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
          <Calendar className="h-4 w-4 text-zc-accent" />
          Maintenance Dates
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Last Maintenance</Label>
            <Input type="date" value={lastMaintenanceDate} onChange={(e) => setLastMaintenanceDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Next Maintenance</Label>
            <Input type="date" value={nextMaintenanceDate} onChange={(e) => setNextMaintenanceDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Warranty Expiry</Label>
            <Input type="date" value={warrantyExpiryDate} onChange={(e) => setWarrantyExpiryDate(e.target.value)} />
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
      </DialogContent>
    </Dialog>
  );
}

function SetStateModal({
  open,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  resource: ResourceDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const current = (resource?.currentState || resource?.state || "AVAILABLE") as ResourceState;
  const options = allowedTransitions(current);

  const [nextState, setNextState] = React.useState<ResourceState>("AVAILABLE");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open || !resource) return;
    setErr(null);
    setBusy(false);

    const first = options[0] || current;
    setNextState(first);
    setReason("");
  }, [open, resource]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit() {
    if (!resource?.id) return;
    setErr(null);

    if (!nextState) {
      setErr("Select a state");
      return;
    }
    if (requiresReason(nextState) && !reason.trim()) {
      setErr("Reason is required for this state");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}/state`, {
        method: "POST",
        body: JSON.stringify({
          state: nextState,
          reason: reason.trim() ? reason.trim() : undefined,
        }),
      });

      toast({ title: "State Updated", description: `${resource.code} → ${nextState}` });
      onClose();
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "State update failed";
      setErr(msg);
      toast({ title: "State update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !resource) return null;

  return (
    <ModalShell
      title="Change Resource State"
      description={`Current: ${current}. Choose the next state.`}
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      {options.length === 0 ? (
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4 text-sm text-zc-muted">
          No allowed transitions from <span className="font-mono">{current}</span>.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Next State</Label>
              <Select value={nextState} onValueChange={(v) => setNextState(v as ResourceState)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
              <div className="text-xs text-zc-muted">Preview</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {pill(stateTone(current), `FROM: ${current}`)}
                {pill(stateTone(nextState), `TO: ${nextState}`)}
              </div>
            </div>
          </div>

          {requiresReason(nextState) ? (
            <div className="mt-4 space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason (required)"
              />
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? "Updating…" : "Update State"}
            </Button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function DeactivateModal({
  open,
  resource,
  onClose,
  onSaved,
}: {
  open: boolean;
  resource: ResourceDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setReason("");
  }, [open]);

  async function onConfirm() {
    if (!resource?.id) return;
    setErr(null);

    if (!reason.trim()) {
      setErr("Deactivation reason is required");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}/deactivate`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim(), hard: false }),
      });

      toast({ title: "Resource Deactivated", description: `Deactivated "${resource.name}"` });
      onClose();
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "Deactivation failed";
      setErr(msg);
      toast({ title: "Deactivation failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !resource) return null;

  return (
    <ModalShell
      title="Deactivate Resource"
      description="This is a soft delete. State will become INACTIVE."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deactivating</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {resource.name} <span className="text-zc-muted">({resource.code})</span>
        </div>
        <div className="mt-2 text-sm text-zc-muted">
          Type: <span className="font-mono">{resource.resourceType}</span> • Current State:{" "}
          <span className="font-mono">{resource.currentState || resource.state}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason is mandatory for deactivation"
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? "Deactivating…" : "Deactivate"}
        </Button>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function ResourceDetailPage() {
  const { toast } = useToast();
  const params = useParams();

  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [resource, setResource] = React.useState<ResourceDetail | null>(null);
  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [branchLoading, setBranchLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [stateOpen, setStateOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "capabilities" | "scheduling" | "maintenance" | "status">(
    "overview",
  );

  async function loadBranch(branchId: string) {
    if (!branchId) return;
    setBranchLoading(true);
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(branchId)}`);
      setBranch(b);
    } catch {
      // fallback (do not break page)
      try {
        const list = await apiFetch<BranchRow[]>(`/api/branches`);
        const found = list.find((x) => x.id === branchId) || null;
        setBranch(found);
      } catch {
        setBranch(null);
      }
    } finally {
      setBranchLoading(false);
    }
  }

  async function refresh(showToast?: boolean) {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await apiFetch<ResourceDetail>(`/api/infrastructure/resources/${encodeURIComponent(id)}`);
      setResource(r);
      if (r?.branchId) void loadBranch(r.branchId);

      if (showToast) toast({ title: "Refreshed", description: "Resource details updated." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load resource";
      setErr(msg);
      setResource(null);
      toast({ title: "Load failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const currentState = (resource?.currentState || resource?.state || "AVAILABLE") as ResourceState;

  return (
    <AppShell title="Infrastructure â€¢ Resources">
      <RequirePerm perm="INFRA_RESOURCE_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" className="h-10" asChild>
                <Link href="/infrastructure/resources">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
                <BedDouble className="h-5 w-5 text-zc-accent" />
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold text-zc-text">
                  {loading ? "Resource" : resource ? `${resource.code} • ${resource.name}` : "Resource"}
                </div>
                <div className="mt-0.5 text-sm text-zc-muted">View status, capabilities, scheduling and maintenance.</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" className="h-10" onClick={() => void refresh(true)} disabled={loading}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>

              {resource ? (
                <RequirePerm perm="INFRA_RESOURCE_UPDATE">
                  <>
                    <Button className="h-10" onClick={() => setEditOpen(true)} disabled={loading}>
                      <Settings2 className="h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      className="h-10"
                      disabled={loading || !resource.isActive}
                      onClick={() => setStateOpen(true)}
                      title={!resource?.isActive ? "Activate resource to change state" : "Change state"}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Change State
                    </Button>

                    {resource.isActive ? (
                      <Button variant="destructive" className="h-10" disabled={loading} onClick={() => setDeactivateOpen(true)}>
                        <ToggleLeft className="h-4 w-4" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        className="h-10"
                        disabled={loading}
                        onClick={async () => {
                          if (!resource?.id) return;
                          try {
                            await apiFetch(`/api/infrastructure/resources/${encodeURIComponent(resource.id)}`, {
                              method: "PATCH",
                              body: JSON.stringify({ isActive: true }),
                            });
                            toast({ title: "Activated", description: "Resource reactivated." });
                            void refresh(false);
                          } catch (e: any) {
                            const msg = e?.message || "Activation failed";
                            toast({ title: "Activation failed", description: msg, variant: "destructive" as any });
                          }
                        }}
                      >
                        <ToggleRight className="h-4 w-4" />
                        Activate
                      </Button>
                    )}
                  </>
                </RequirePerm>
              ) : null}
            </div>
          </div>

          {err ? (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load resource</CardTitle>
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
                {resource ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {resourceTypeBadge(resource.resourceType)}
                    {categoryBadge(resource.resourceCategory ?? null)}
                    {stateBadge(currentState)}
                    {activeBadge(resource.isActive)}
                    {availabilityBadge(resource.isAvailable)}
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
              ) : !resource ? (
                <div className="py-10 text-center text-sm text-zc-muted">Resource not found.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoTile
                    label="Unit"
                    tone="indigo"
                    value={
                      resource.unit ? (
                        <Link href={`/infrastructure/units/${resource.unit.id}`} className="font-semibold hover:underline">
                          {resource.unit.code} • {resource.unit.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{resource.unitId}</span>
                      )
                    }
                  />
                  <InfoTile
                    label="Room"
                    tone="cyan"
                    value={
                      resource.room ? (
                        <Link href={`/infrastructure/rooms/${resource.room.id}`} className="font-semibold hover:underline">
                          {resource.room.code} • {resource.room.name}
                        </Link>
                      ) : resource.roomId ? (
                        <span className="font-semibold">{resource.roomId}</span>
                      ) : (
                        "— (Mobile / Open-bay)"
                      )
                    }
                  />
                  <InfoTile
                    label="Asset Tag"
                    tone="zinc"
                    value={resource.assetTag ? <span className="font-mono">{resource.assetTag}</span> : "—"}
                  />
                  <InfoTile
                    label="Scheduling"
                    tone="emerald"
                    value={
                      resource.isSchedulable ? (
                        <span className="font-semibold">
                          Yes {resource.slotDurationMinutes ? `• ${resource.slotDurationMinutes}m` : ""}
                        </span>
                      ) : (
                        "Not schedulable"
                      )
                    }
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
                  <CardTitle className="text-base">Resource Details</CardTitle>
                  <CardDescription>Overview, capabilities, scheduling, maintenance and status.</CardDescription>
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
                      value="capabilities"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Capabilities
                    </TabsTrigger>
                    <TabsTrigger
                      value="scheduling"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Scheduling
                    </TabsTrigger>
                    <TabsTrigger
                      value="maintenance"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Maintenance
                    </TabsTrigger>
                    <TabsTrigger
                      value="status"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Status
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              {!resource && loading ? (
                <div className="flex items-center gap-3 text-sm text-zc-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : !resource ? (
                <div className="text-sm text-zc-muted">No resource loaded.</div>
              ) : (
                <Tabs value={activeTab}>
                  <TabsContent value="overview" className="mt-0">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Identity</CardTitle>
                          <CardDescription>Codes, type and classification.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row
                            label="Code"
                            value={<span className="font-mono text-xs font-semibold text-zc-text">{resource.code}</span>}
                          />
                          <Row label="Name" value={<span className="font-semibold text-zc-text">{resource.name}</span>} />
                          <Row label="Resource Type" value={resourceTypeBadge(resource.resourceType)} />
                          <Row label="Category" value={categoryBadge(resource.resourceCategory ?? null)} />
                          <Row
                            label="Asset Tag"
                            value={resource.assetTag ? <span className="font-mono text-xs">{resource.assetTag}</span> : "—"}
                          />
                          <Row label="Serial" value={resource.serialNumber ?? "—"} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Operations</CardTitle>
                          <CardDescription>Placement and operational status.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row
                            label="Unit"
                            value={resource.unit ? `${resource.unit.name} (${resource.unit.code})` : resource.unitId || "—"}
                          />
                          <Row
                            label="Room"
                            value={resource.room ? `${resource.room.name} (${resource.room.code})` : resource.roomId || "—"}
                          />
                          <Row label="Branch" value={branchLoading ? "Loading…" : branch?.name || resource.branchId || "—"} />
                          <Row label="State" value={stateBadge(currentState)} />
                          <Row label="Active" value={activeBadge(resource.isActive)} />
                          <Row label="Available" value={availabilityBadge(resource.isAvailable)} />
                          <Row label="Assigned Patient" value={resource.assignedPatientId ?? "—"} />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="capabilities" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        ["Monitor", resource.hasMonitor],
                        ["Oxygen Supply", resource.hasOxygenSupply],
                        ["Suction", resource.hasSuction],
                        ["Ventilator Support", resource.hasVentilatorSupport],
                        ["Power Required", resource.isPowerRequired],
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

                  <TabsContent value="scheduling" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Schedulable</span>
                        {yesNo(resource.isSchedulable)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Slot Duration</span>
                        <span className="font-medium">
                          {resource.slotDurationMinutes ? `${resource.slotDurationMinutes} min` : "—"}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="maintenance" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Last Maintenance</span>
                        <span className="font-medium">{fmtDate(resource.lastMaintenanceDate)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Next Maintenance</span>
                        <span className="font-medium">{fmtDate(resource.nextMaintenanceDate)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Warranty Expiry</span>
                        <span className="font-medium">{fmtDate(resource.warrantyExpiryDate)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Commissioned</span>
                        <span className="font-medium">{fmtDate(resource.commissionedAt)}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="status" className="mt-0">
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Current State</span>
                        {stateBadge(currentState)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Active</span>
                        {activeBadge(resource.isActive)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Availability</span>
                        {availabilityBadge(resource.isAvailable)}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Reserved Reason</span>
                        <span className="font-medium">{resource.reservedReason ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Blocked Reason</span>
                        <span className="font-medium">{resource.blockedReason ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Created</span>
                        <span className="font-medium">{fmtDateTime(resource.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-4 py-3">
                        <span className="text-sm text-zc-text">Updated</span>
                        <span className="font-medium">{fmtDateTime(resource.updatedAt)}</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
          {/* Modals */}
          <EditResourceModal
            open={editOpen}
            resource={resource}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              await refresh(false);
            }}
          />

          <SetStateModal
            open={stateOpen}
            resource={resource}
            onClose={() => setStateOpen(false)}
            onSaved={async () => {
              await refresh(false);
            }}
          />

          <DeactivateModal
            open={deactivateOpen}
            resource={resource}
            onClose={() => setDeactivateOpen(false)}
            onSaved={async () => {
              await refresh(false);
            }}
          />
        </div>
      </RequirePerm>
    </AppShell>
  );
}
