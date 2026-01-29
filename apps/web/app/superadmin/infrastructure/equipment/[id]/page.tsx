"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { AlertTriangle, ArrowLeft, ClipboardList, Edit3, RefreshCw, ShieldCheck } from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type DepartmentRow = { id: string; code: string; name: string };
type UnitRow = { id: string; branchId: string; code: string; name: string; usesRooms: boolean; isActive: boolean };
type RoomRow = { id: string; unitId: string; branchId: string; code: string; name: string; isActive: boolean };

type LocationType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
type LocationNode = {
  id: string;
  branchId: string;
  type: LocationType;
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};
type LocationTreeResponse = { campuses: LocationNode[] } | any;

type EquipmentCategory = "GENERAL" | "RADIOLOGY" | "ULTRASOUND";
type EquipmentOperationalStatus = "OPERATIONAL" | "DOWN" | "MAINTENANCE" | "RETIRED";

type DowntimeTicketRow = {
  id: string;
  assetId: string;
  status: "OPEN" | "CLOSED";
  reason: string;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
};

type EquipmentAssetRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  make?: string | null;
  model?: string | null;
  serial?: string | null;

  ownerDepartmentId?: string | null;
  ownerDepartment?: DepartmentRow | null;

  unitId?: string | null;
  roomId?: string | null;
  locationNodeId?: string | null;

  operationalStatus: EquipmentOperationalStatus;
  isSchedulable: boolean;

  amcVendor?: string | null;
  amcValidFrom?: string | null;
  amcValidTo?: string | null;
  warrantyValidTo?: string | null;

  pmFrequencyDays?: number | null;
  nextPmDueAt?: string | null;

  aerbLicenseNo?: string | null;
  aerbValidTo?: string | null;
  pcpndtRegNo?: string | null;
  pcpndtValidTo?: string | null;

  downtimeTickets?: DowntimeTicketRow[];
  warnings?: string[];
};

/* --------------------------------- Utils --------------------------------- */

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
function daysUntil(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
function dueTone(days: number | null) {
  if (days === null) return "secondary" as const;
  if (days <= 0) return "destructive" as const;
  if (days <= 7) return "warning" as const;
  if (days <= 30) return "accent" as const;
  return "secondary" as const;
}
function flattenLocations(tree: LocationTreeResponse): Array<{ id: string; label: string; type: LocationType }> {
  const campuses: LocationNode[] = Array.isArray(tree?.campuses)
    ? tree.campuses
    : Array.isArray(tree?.items)
      ? tree.items
      : Array.isArray(tree?.data)
        ? tree.data
        : [];
  const out: Array<{ id: string; label: string; type: LocationType }> = [];
  const walk = (node: LocationNode, prefix: string) => {
    const label = `${prefix}${node.code} • ${node.name}`;
    out.push({ id: node.id, label, type: node.type });
    (node.buildings || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
    (node.floors || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
    (node.zones || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
  };
  campuses.forEach((c) => walk(c, ""));
  return out;
}
function statusBadge(s: EquipmentOperationalStatus) {
  if (s === "OPERATIONAL") return <Badge variant="success">OPERATIONAL</Badge>;
  if (s === "DOWN") return <Badge variant="destructive">DOWN</Badge>;
  if (s === "MAINTENANCE") return <Badge variant="warning">MAINTENANCE</Badge>;
  return <Badge variant="secondary">RETIRED</Badge>;
}
function catBadge(c: EquipmentCategory) {
  if (c === "GENERAL") return <Badge variant="neutral">GENERAL</Badge>;
  if (c === "RADIOLOGY") return <Badge variant="info">RADIOLOGY</Badge>;
  return <Badge variant="accent">ULTRASOUND</Badge>;
}
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function modalClassName(extra?: string) {
  return cn("rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card shadow-2xl shadow-indigo-500/10", extra);
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

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Edit3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

/* ---------------------------------- Page --------------------------------- */

export default function SuperAdminEquipmentDetailsPage() {
  const { toast } = useToast();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [activeTab, setActiveTab] = React.useState<"overview" | "downtime">("overview");

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [asset, setAsset] = React.useState<EquipmentAssetRow | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [locations, setLocations] = React.useState<Array<{ id: string; label: string; type: LocationType }>>([]);

  const [assetDialogOpen, setAssetDialogOpen] = React.useState(false);

  const [downtimeDialogOpen, setDowntimeDialogOpen] = React.useState(false);
  const [closingTicket, setClosingTicket] = React.useState<DowntimeTicketRow | null>(null);
  const [dtReason, setDtReason] = React.useState("");
  const [dtNotes, setDtNotes] = React.useState("");

  const unitMap = React.useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const roomMap = React.useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const deptMap = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const locMap = React.useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  async function loadAsset() {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const a = await apiFetch<EquipmentAssetRow>(`/api/infrastructure/equipment/${encodeURIComponent(id)}`);
      setAsset(a || null);

      if (a?.branchId) {
        const [deps, us, locTree] = await Promise.all([
          apiFetch<DepartmentRow[]>(`/api/infrastructure/departments?branchId=${encodeURIComponent(a.branchId)}`),
          apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(a.branchId)}`),
          apiFetch<LocationTreeResponse>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(a.branchId)}`),
        ]);
        setDepartments(deps || []);
        setUnits(us || []);
        setLocations(flattenLocations(locTree));
      } else {
        setDepartments([]);
        setUnits([]);
        setLocations([]);
      }

      const tickets = await apiFetch<DowntimeTicketRow[]>(
        `/api/infrastructure/equipment/${encodeURIComponent(id)}/downtime`,
      ).catch(() => []);
      setAsset((prev) => (prev ? { ...prev, downtimeTickets: tickets || [] } : prev));

      if (a?.unitId) {
        const rs = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?unitId=${encodeURIComponent(a.unitId)}`).catch(
          () => [],
        );
        setRooms(rs || []);
      } else {
        setRooms([]);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load equipment";
      setErr(msg);
      setAsset(null);
      toast({ title: "Load failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAsset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openTicket = (asset?.downtimeTickets || []).find((t) => t.status === "OPEN") || null;

  const u = asset?.unitId ? unitMap.get(asset.unitId) : null;
  const rm = asset?.roomId ? roomMap.get(asset.roomId) : null;
  const dept = asset?.ownerDepartment || (asset?.ownerDepartmentId ? deptMap.get(asset.ownerDepartmentId) : null);
  const loc = asset?.locationNodeId ? locMap.get(asset.locationNodeId) : null;

  const pmDays = daysUntil(asset?.nextPmDueAt);
  const amcDays = daysUntil(asset?.amcValidTo);
  const warDays = daysUntil(asset?.warrantyValidTo);
  const compDate =
    asset?.category === "RADIOLOGY"
      ? asset?.aerbValidTo
      : asset?.category === "ULTRASOUND"
        ? asset?.pcpndtValidTo
        : null;
  const compDays = daysUntil(compDate);

  function openDowntime() {
    setClosingTicket(null);
    setDtReason("");
    setDtNotes("");
    setDowntimeDialogOpen(true);
  }
  function openCloseDowntime(t: DowntimeTicketRow) {
    setClosingTicket(t);
    setDtReason(t.reason);
    setDtNotes("");
    setDowntimeDialogOpen(true);
  }

  async function retireAsset() {
    if (!asset) return;
    if (!window.confirm(`Retire equipment ${asset.code} • ${asset.name}? This will disable scheduling.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/equipment/${encodeURIComponent(asset.id)}/retire`, { method: "POST" });
      toast({ title: "Equipment retired", description: `${asset.code} has been marked as RETIRED.` });
      await loadAsset();
    } catch (e: any) {
      toast({ title: "Retire failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function submitDowntime() {
    if (!asset) return;
    if (!closingTicket && !dtReason.trim()) {
      toast({ title: "Reason required", description: "Enter a downtime reason." });
      return;
    }
    setBusy(true);
    try {
      if (closingTicket) {
        await apiFetch(`/api/infrastructure/equipment/downtime/close`, {
          method: "POST",
          body: JSON.stringify({ ticketId: closingTicket.id, notes: dtNotes.trim() || undefined }),
        });
        toast({ title: "Downtime closed", description: "Ticket closed successfully." });
      } else {
        await apiFetch(`/api/infrastructure/equipment/downtime`, {
          method: "POST",
          body: JSON.stringify({ assetId: asset.id, reason: dtReason.trim(), notes: dtNotes.trim() || undefined }),
        });
        toast({ title: "Downtime opened", description: "Ticket created and status set to DOWN." });
      }
      setDowntimeDialogOpen(false);
      await loadAsset();
    } catch (e: any) {
      toast({ title: "Request failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Equipment">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" className="h-10" asChild>
              <Link href="/superadmin/infrastructure/equipment">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>

            <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold text-zc-text">
                {loading ? "Equipment" : asset ? `${asset.code} • ${asset.name}` : "Equipment"}
              </div>
              <div className="mt-0.5 text-sm text-zc-muted">View schedules, compliance and downtime history.</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" className="h-10" onClick={() => loadAsset()} disabled={loading || busy}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </Button>

            <Button className="h-10" onClick={() => setAssetDialogOpen(true)} disabled={!asset || busy}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button variant="destructive" className="h-10" onClick={retireAsset} disabled={!asset || busy}>
              Retire
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load equipment</CardTitle>
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
                <CardDescription>Status and key due dates.</CardDescription>
              </div>
              {asset ? (
                <div className="flex flex-wrap items-center gap-2">
                  {catBadge(asset.category)}
                  {statusBadge(asset.operationalStatus)}
                  {asset.isSchedulable ? <Badge variant="ok">Schedulable</Badge> : <Badge variant="secondary">Not schedulable</Badge>}
                  {openTicket ? <Badge variant="destructive">Open downtime</Badge> : <Badge variant="secondary">No downtime</Badge>}
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
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !asset ? (
              <div className="py-10 text-center text-sm text-zc-muted">Equipment not found.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                <InfoTile
                  label="Next PM Due"
                  tone="indigo"
                  value={<Badge variant={dueTone(pmDays)}>{fmtDate(asset.nextPmDueAt)}{pmDays != null ? ` (${pmDays}d)` : ""}</Badge>}
                />
                <InfoTile
                  label="AMC Valid To"
                  tone="emerald"
                  value={<Badge variant={dueTone(amcDays)}>{fmtDate(asset.amcValidTo)}{amcDays != null ? ` (${amcDays}d)` : ""}</Badge>}
                />
                <InfoTile
                  label="Warranty Valid To"
                  tone="cyan"
                  value={<Badge variant={dueTone(warDays)}>{fmtDate(asset.warrantyValidTo)}{warDays != null ? ` (${warDays}d)` : ""}</Badge>}
                />
                <InfoTile
                  label="Compliance Valid To"
                  tone="zinc"
                  value={<Badge variant={dueTone(compDays)}>{fmtDate(compDate)}{compDays != null ? ` (${compDays}d)` : ""}</Badge>}
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
                <CardTitle className="text-base">Equipment Details</CardTitle>
                <CardDescription>Overview, placement and downtime history.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="downtime"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Downtime
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="overview" className="mt-0">
                {loading ? (
                  <div className="grid gap-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : !asset ? (
                  <div className="py-10 text-center text-sm text-zc-muted">—</div>
                ) : (
                  <div className="grid gap-6">
                    {asset.warnings?.length ? (
                      <Card className="border-zc-warn/40">
                        <CardHeader className="py-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-warn" />
                            <div>
                              <CardTitle className="text-base">Warnings</CardTitle>
                              <CardDescription className="mt-1">{asset.warnings.join(" • ")}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ) : null}

                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Identity</CardTitle>
                          <CardDescription>Make/model/serial and ownership.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row label="Code" value={<span className="font-mono text-xs font-semibold text-zc-text">{asset.code}</span>} />
                          <Row label="Name" value={<span className="font-semibold text-zc-text">{asset.name}</span>} />
                          <Row label="Category" value={catBadge(asset.category)} />
                          <Row label="Make / Model" value={[asset.make, asset.model].filter(Boolean).join(" ") || "—"} />
                          <Row label="Serial" value={asset.serial || "—"} />
                          <Row label="Owner Department" value={dept ? `${dept.code} • ${dept.name}` : "—"} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Placement</CardTitle>
                          <CardDescription>Where this equipment is bound today.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row label="Unit" value={u ? `${u.code} • ${u.name}` : "—"} />
                          <Row label="Room/Bay" value={rm ? `${rm.code} • ${rm.name}` : "—"} />
                          <Row
                            label="Location Node"
                            value={loc ? loc.label : asset.locationNodeId ? String(asset.locationNodeId).slice(0, 8) + "…" : "—"}
                          />
                          <Row label="Schedulable" value={asset.isSchedulable ? <Badge variant="ok">Yes</Badge> : <Badge variant="secondary">No</Badge>} />
                          <Row label="Operational Status" value={statusBadge(asset.operationalStatus)} />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Maintenance</CardTitle>
                          <CardDescription>AMC / Warranty / Preventive maintenance schedule.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <Row label="AMC Vendor" value={asset.amcVendor || "—"} />
                          <Row label="AMC Valid From" value={fmtDate(asset.amcValidFrom)} />
                          <Row label="AMC Valid To" value={<Badge variant={dueTone(amcDays)}>{fmtDate(asset.amcValidTo)}{amcDays != null ? ` (${amcDays}d)` : ""}</Badge>} />
                          <Row label="Warranty Valid To" value={<Badge variant={dueTone(warDays)}>{fmtDate(asset.warrantyValidTo)}{warDays != null ? ` (${warDays}d)` : ""}</Badge>} />
                          <Row label="PM Frequency" value={asset.pmFrequencyDays ? `${asset.pmFrequencyDays} days` : "—"} />
                          <Row label="Next PM Due" value={<Badge variant={dueTone(pmDays)}>{fmtDate(asset.nextPmDueAt)}{pmDays != null ? ` (${pmDays}d)` : ""}</Badge>} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Compliance</CardTitle>
                          <CardDescription>AERB or PCPNDT depending on category.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          {asset.category === "RADIOLOGY" ? (
                            <>
                              <Row label="AERB License No" value={asset.aerbLicenseNo || "—"} />
                              <Row label="AERB Valid To" value={<Badge variant={dueTone(compDays)}>{fmtDate(asset.aerbValidTo)}{compDays != null ? ` (${compDays}d)` : ""}</Badge>} />
                            </>
                          ) : asset.category === "ULTRASOUND" ? (
                            <>
                              <Row label="PCPNDT Reg No" value={asset.pcpndtRegNo || "—"} />
                              <Row label="PCPNDT Valid To" value={<Badge variant={dueTone(compDays)}>{fmtDate(asset.pcpndtValidTo)}{compDays != null ? ` (${compDays}d)` : ""}</Badge>} />
                            </>
                          ) : (
                            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                              Compliance fields apply only to <span className="font-semibold text-zc-text">RADIOLOGY</span> (AERB) and{" "}
                              <span className="font-semibold text-zc-text">ULTRASOUND</span> (PCPNDT).
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="downtime" className="mt-0">
                {loading ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : !asset ? (
                  <div className="py-10 text-center text-sm text-zc-muted">—</div>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-zc-text">Downtime</div>
                        <div className="text-sm text-zc-muted">Open a ticket when equipment is down; close after restoration.</div>
                      </div>

                      {openTicket ? (
                        <Button variant="outline" className="h-10" onClick={() => openCloseDowntime(openTicket)} disabled={busy}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Close open ticket
                        </Button>
                      ) : (
                        <Button className="h-10" onClick={openDowntime} disabled={busy}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Open downtime
                        </Button>
                      )}
                    </div>

                    <div className="rounded-xl border border-zc-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="w-[180px]">Opened</TableHead>
                            <TableHead className="w-[180px]">Closed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(asset.downtimeTickets || []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                  <ClipboardList className="h-4 w-4" /> No downtime tickets yet.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            (asset.downtimeTickets || []).map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  {t.status === "OPEN" ? <Badge variant="destructive">OPEN</Badge> : <Badge variant="secondary">CLOSED</Badge>}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-zc-text">{t.reason}</span>
                                    {t.notes ? <span className="text-xs text-zc-muted">{t.notes}</span> : null}
                                  </div>
                                </TableCell>
                                <TableCell>{fmtDate(t.openedAt)}</TableCell>
                                <TableCell>{fmtDate(t.closedAt)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog: minimal edit for details page */}
      <EquipmentAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        asset={asset}
        departments={departments}
        units={units}
        rooms={rooms}
        locations={locations}
        onSaved={async (row) => {
          toast({ title: "Equipment updated", description: row?.warnings?.length ? row.warnings.join(" • ") : "Saved successfully." });
          setAsset(row);
          await loadAsset();
        }}
      />

      {/* Downtime Dialog */}
      <Dialog open={downtimeDialogOpen} onOpenChange={setDowntimeDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{closingTicket ? "Close Downtime" : "Open Downtime"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl border border-zc-border bg-zc-accent/20 p-4 mt-2">
              <div className="text-sm font-semibold text-zc-text">{asset ? `${asset.code} • ${asset.name}` : ""}</div>
              <div className="mt-2 text-sm text-zc-muted">
                {closingTicket ? "Add closure notes and confirm." : "Create a downtime ticket; equipment status will be set to DOWN."}
              </div>
            </div>

            {!closingTicket ? (
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={dtReason} onChange={(e) => setDtReason(e.target.value)} placeholder="e.g., Power supply failure" />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={dtReason} disabled />
              </div>
            )}

            <div className="grid gap-2">
              <Label>{closingTicket ? "Closure notes" : "Notes"}</Label>
              <Textarea value={dtNotes} onChange={(e) => setDtNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDowntimeDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitDowntime} disabled={busy || !asset}>
              {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {closingTicket ? "Close Ticket" : "Open Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ------------------------------ UI Helpers ------------------------------ */

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

/* ------------------------- Minimal Edit Dialog -------------------------- */
/* Note: This is intentionally “edit-only” on details page.
   Create + full workflow remains on the main register page. */

function EquipmentAssetDialog({
  open,
  onOpenChange,
  asset,
  departments,
  units,
  rooms,
  locations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: EquipmentAssetRow | null;
  departments: DepartmentRow[];
  units: UnitRow[];
  rooms: RoomRow[];
  locations: Array<{ id: string; label: string; type: LocationType }>;
  onSaved: (row: EquipmentAssetRow) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (!open || !asset) return;
    setForm({
      name: asset.name || "",
      make: asset.make || "",
      model: asset.model || "",
      serial: asset.serial || "",
      ownerDepartmentId: asset.ownerDepartmentId || "",
      unitId: asset.unitId || "",
      roomId: asset.roomId || "",
      locationNodeId: asset.locationNodeId || "",
      isSchedulable: Boolean(asset.isSchedulable),
      amcVendor: asset.amcVendor || "",
      amcValidFrom: asset.amcValidFrom ? String(asset.amcValidFrom).slice(0, 10) : "",
      amcValidTo: asset.amcValidTo ? String(asset.amcValidTo).slice(0, 10) : "",
      warrantyValidTo: asset.warrantyValidTo ? String(asset.warrantyValidTo).slice(0, 10) : "",
      pmFrequencyDays: asset.pmFrequencyDays ?? "",
      nextPmDueAt: asset.nextPmDueAt ? String(asset.nextPmDueAt).slice(0, 10) : "",
      aerbLicenseNo: asset.aerbLicenseNo || "",
      aerbValidTo: asset.aerbValidTo ? String(asset.aerbValidTo).slice(0, 10) : "",
      pcpndtRegNo: asset.pcpndtRegNo || "",
      pcpndtValidTo: asset.pcpndtValidTo ? String(asset.pcpndtValidTo).slice(0, 10) : "",
    });
  }, [open, asset]);

  const requiresAerb = asset?.category === "RADIOLOGY";
  const requiresPcpndt = asset?.category === "ULTRASOUND";

  const roomOptions = React.useMemo(() => {
    if (!form.unitId) return [] as RoomRow[];
    return rooms.filter((r) => r.unitId === form.unitId);
  }, [rooms, form.unitId]);

  const patch = (p: Partial<any>) => setForm((prev: any) => ({ ...prev, ...p }));

  if (!asset) return null;

  async function save() {
    if (!asset) return;
    if (!form.name?.trim()) {
      toast({ title: "Missing fields", description: "Name is required." });
      return;
    }
    const payload: any = {
      name: String(form.name || "").trim(),
      make: form.make?.trim() ? String(form.make).trim() : null,
      model: form.model?.trim() ? String(form.model).trim() : null,
      serial: form.serial?.trim() ? String(form.serial).trim() : null,
      ownerDepartmentId: form.ownerDepartmentId ? form.ownerDepartmentId : null,
      unitId: form.unitId ? form.unitId : null,
      roomId: form.roomId ? form.roomId : null,
      locationNodeId: form.locationNodeId ? form.locationNodeId : null,
      isSchedulable: Boolean(form.isSchedulable),
      amcVendor: form.amcVendor?.trim() ? String(form.amcVendor).trim() : null,
      amcValidFrom: form.amcValidFrom || null,
      amcValidTo: form.amcValidTo || null,
      warrantyValidTo: form.warrantyValidTo || null,
      pmFrequencyDays: form.pmFrequencyDays === "" || form.pmFrequencyDays === null ? null : Number(form.pmFrequencyDays),
      nextPmDueAt: form.nextPmDueAt || null,
      aerbLicenseNo: requiresAerb && form.aerbLicenseNo?.trim() ? String(form.aerbLicenseNo).trim() : null,
      aerbValidTo: requiresAerb ? (form.aerbValidTo || null) : null,
      pcpndtRegNo: requiresPcpndt && form.pcpndtRegNo?.trim() ? String(form.pcpndtRegNo).trim() : null,
      pcpndtValidTo: requiresPcpndt ? (form.pcpndtValidTo || null) : null,
    };

    setSaving(true);
    try {
      const res = await apiFetch<EquipmentAssetRow>(`/api/infrastructure/equipment/${encodeURIComponent(asset.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onOpenChange(false);
      onSaved(res);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title="Edit Equipment"
          description="Update placement, schedules, and compliance fields."
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-6">
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zc-text">
                {asset.code} • {asset.name}
              </div>
              <div className="flex items-center gap-2">
                {catBadge(asset.category)}
                {statusBadge(asset.operationalStatus)}
              </div>
            </div>
            <div className="mt-1 text-sm text-zc-muted">
              For lifecycle actions, use downtime workflow or retire from the details page.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Owner Department</Label>
              <Select
                value={form.ownerDepartmentId || "none"}
                onValueChange={(v) => patch({ ownerDepartmentId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {departments.filter((d) => d.id).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Make</Label>
              <Input value={form.make || ""} onChange={(e) => patch({ make: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input value={form.model || ""} onChange={(e) => patch({ model: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label>Serial No</Label>
              <Input value={form.serial || ""} onChange={(e) => patch({ serial: e.target.value })} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select
                value={form.unitId || "none"}
                onValueChange={(v) => patch({ unitId: v === "none" ? "" : v, roomId: "" })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {units.filter((u) => u.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} - {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room / Bay</Label>
              <Select
                value={form.roomId || "none"}
                onValueChange={(v) => patch({ roomId: v === "none" ? "" : v })}
                disabled={!form.unitId}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={!form.unitId ? "Select Unit first" : "Optional"} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {roomOptions.filter((r) => r.id).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Location Node</Label>
              <Select
                value={form.locationNodeId || "none"}
                onValueChange={(v) => patch({ locationNodeId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {locations.filter((l) => l.id).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>AMC Vendor</Label>
              <Input value={form.amcVendor || ""} onChange={(e) => patch({ amcVendor: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>AMC Valid From</Label>
              <Input type="date" value={form.amcValidFrom || ""} onChange={(e) => patch({ amcValidFrom: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>AMC Valid To</Label>
              <Input type="date" value={form.amcValidTo || ""} onChange={(e) => patch({ amcValidTo: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label>Warranty Valid To</Label>
              <Input type="date" value={form.warrantyValidTo || ""} onChange={(e) => patch({ warrantyValidTo: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>PM Frequency (days)</Label>
              <Input type="number" min={1} value={form.pmFrequencyDays ?? ""} onChange={(e) => patch({ pmFrequencyDays: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Next PM Due</Label>
              <Input type="date" value={form.nextPmDueAt || ""} onChange={(e) => patch({ nextPmDueAt: e.target.value })} />
            </div>
          </div>

          <Separator />

          {(requiresAerb || requiresPcpndt) ? (
            <div className="grid gap-4 md:grid-cols-2">
              {requiresAerb ? (
                <>
                  <div className="grid gap-2">
                    <Label>AERB License No</Label>
                    <Input value={form.aerbLicenseNo || ""} onChange={(e) => patch({ aerbLicenseNo: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>AERB Valid To</Label>
                    <Input type="date" value={form.aerbValidTo || ""} onChange={(e) => patch({ aerbValidTo: e.target.value })} />
                  </div>
                </>
              ) : null}
              {requiresPcpndt ? (
                <>
                  <div className="grid gap-2">
                    <Label>PCPNDT Reg No</Label>
                    <Input value={form.pcpndtRegNo || ""} onChange={(e) => patch({ pcpndtRegNo: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>PCPNDT Valid To</Label>
                    <Input type="date" value={form.pcpndtValidTo || ""} onChange={(e) => patch({ pcpndtValidTo: e.target.value })} />
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
              Compliance fields apply only to <span className="font-semibold text-zc-text">RADIOLOGY</span> (AERB) and{" "}
              <span className="font-semibold text-zc-text">ULTRASOUND</span> (PCPNDT) categories.
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={Boolean(form.isSchedulable)} onCheckedChange={(v) => patch({ isSchedulable: v })} disabled={asset.operationalStatus === "RETIRED"} />
              <div>
                <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                <div className="text-sm text-zc-muted">Enables scheduling enforcement based on compliance policies.</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {form.isSchedulable ? <Badge variant="ok">Schedulable</Badge> : <Badge variant="secondary">Not schedulable</Badge>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
