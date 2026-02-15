"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconBuilding } from "@/components/icons";
import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";

import type {
  DiagnosticServicePointRow,
  ServicePointType,
  Modality,
  UnitRow,
  RoomRow,
  UnitResourceRow,
  EquipmentAssetRow,
  RoomMapRow,
  ResourceMapRow,
  EquipmentMapRow,
  FlatLocationNode,
  LocationTreeNode,
} from "../_shared/types";

import { SERVICE_POINT_TYPES, MODALITIES } from "../_shared/constants";

import {
  safeArray,
  normalizeCode,
  validateCode,
  validateName,
  toInt,
  normalizeEquipmentList,
  flattenLocationTree,
  normalizeLocationTree,
} from "../_shared/utils";

import {
  Field,
  ToneBadge,
  ModalHeader,
  modalClassName,
  toneForServicePointType,
  NoBranchGuard,
  PageHeader,
  ErrorAlert,
  StatusPill,
  CodeBadge,
  StatBox,
  SearchBar,
  OnboardingCallout,
} from "../_shared/components";

/* =========================================================
   Service Points page
   ========================================================= */

export default function ServicePointsPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Service Points">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <ServicePointsContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Main content ---- */

function ServicePointsContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPerm(user, "INFRA_DIAGNOSTICS_CREATE");
  const canUpdate = hasPerm(user, "INFRA_DIAGNOSTICS_UPDATE");
  const canDelete = hasPerm(user, "INFRA_DIAGNOSTICS_DELETE");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [servicePoints, setServicePoints] = React.useState<DiagnosticServicePointRow[]>([]);
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [locations, setLocations] = React.useState<FlatLocationNode[]>([]);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<ServicePointType | "all">("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DiagnosticServicePointRow | null>(null);
  const [roomsDialog, setRoomsDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [resourcesDialog, setResourcesDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [equipmentDialog, setEquipmentDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [staffDialog, setStaffDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [sectionsDialog, setSectionsDialog] = React.useState<DiagnosticServicePointRow | null>(null);

  // AI page-level insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-service-points" });

  async function loadLists() {
    setLoading(true);
    setErr(null);
    try {
      const locTree = await apiFetch<any>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`);
      setLocations(flattenLocationTree(normalizeLocationTree(locTree)));
      const unitRows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(branchId)}`);
      setUnits(safeArray(unitRows));

      const qs = new URLSearchParams();
      qs.set("branchId", branchId);
      if (typeFilter !== "all") qs.set("type", typeFilter);
      const rows = await apiFetch<DiagnosticServicePointRow[]>(`/api/infrastructure/diagnostics/service-points?${qs.toString()}`);
      let next = safeArray(rows);
      if (!includeInactive) next = next.filter((r) => r.isActive);
      setServicePoints(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to load service points");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive, typeFilter]);

  // Filtered rows for search
  const rows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return servicePoints;
    return servicePoints.filter((sp) => {
      const hay = `${sp.code} ${sp.name} ${sp.type} ${sp.locationNode?.name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [servicePoints, q]);

  // Stats
  const activeCount = servicePoints.filter((sp) => sp.isActive).length;
  const inactiveCount = servicePoints.length - activeCount;
  const typeCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const sp of servicePoints) {
      map[sp.type] = (map[sp.type] || 0) + 1;
    }
    return map;
  }, [servicePoints]);

  async function handleToggleActive(sp: DiagnosticServicePointRow) {
    try {
      if (sp.isActive) {
        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
        toast({ title: "Service point deactivated" });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}`, {
          method: "PUT",
          body: JSON.stringify({ branchId, isActive: true }),
        });
        toast({ title: "Service point reactivated" });
      }
      await loadLists();
    } catch (e: any) {
      toast({ title: "Toggle failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconBuilding className="h-5 w-5 text-zc-accent" />}
        title="Service Points"
        description="Configure diagnostic service points, rooms, resources and equipment."
        loading={loading}
        onRefresh={() => void loadLists()}
        canCreate={canCreate}
        createLabel="Create Service Point"
        onCreate={() => { setEditing(null); setDialogOpen(true); }}
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">
            Search service points and manage rooms, resources, and equipment mappings.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox label="Total Service Points" value={servicePoints.length} color="blue" detail={<>Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive: <span className="font-semibold tabular-nums">{inactiveCount}</span></>} />
            <StatBox label="Active" value={activeCount} color="emerald" />
            <StatBox label="LAB" value={typeCounts["LAB"] ?? 0} color="emerald" />
            <StatBox label="RADIOLOGY" value={typeCounts["RADIOLOGY"] ?? 0} color="sky" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>

          {showFilters ? (
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <Field label="Type filter">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-10 w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2">
                <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
                <span className="text-sm text-zc-muted">Include Inactive</span>
              </div>
            </div>
          ) : null}

          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search by code, name, type, location..."
            filteredCount={rows.length}
            totalCount={servicePoints.length}
          />

          <ErrorAlert message={err} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service Point Registry</CardTitle>
          <CardDescription className="text-sm">Use the action buttons to edit service points or manage their room/resource/equipment mappings.</CardDescription>
        </CardHeader>
        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                    {loading ? "Loading service points..." : "No service points found."}
                  </td>
                </tr>
              ) : null}

              {rows.map((sp) => (
                <tr key={sp.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                  <td className="px-4 py-3">
                    <CodeBadge>{sp.code}</CodeBadge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-zc-text">{sp.name}</div>
                    <div className="mt-0.5 text-xs text-zc-muted">
                      R: {sp._count?.rooms ?? 0} | Res: {sp._count?.resources ?? 0} | Eq: {sp._count?.equipment ?? 0} | Staff: {sp._count?.staff ?? 0} | Sec: {sp._count?.sections ?? 0}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <ToneBadge tone={toneForServicePointType(sp.type)}>{sp.type}</ToneBadge>
                  </td>

                  <td className="px-4 py-3 text-zc-muted">{sp.locationNode?.name ?? "\u2014"}</td>

                  <td className="px-4 py-3">
                    <StatusPill active={sp.isActive} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate ? (
                        <Button
                          variant="info"
                          size="icon"
                          onClick={() => { setEditing(sp); setDialogOpen(true); }}
                          title="Edit service point"
                          aria-label="Edit service point"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setRoomsDialog(sp)} title="Rooms">Rooms</Button>
                          <Button variant="outline" size="sm" onClick={() => setResourcesDialog(sp)} title="Resources">Res</Button>
                          <Button variant="outline" size="sm" onClick={() => setEquipmentDialog(sp)} title="Equipment">Eq</Button>
                          <Button variant="outline" size="sm" onClick={() => setStaffDialog(sp)} title="Staff">Staff</Button>
                          <Button variant="outline" size="sm" onClick={() => setSectionsDialog(sp)} title="Sections">Sec</Button>
                        </>
                      ) : null}
                      {canDelete ? (
                        sp.isActive ? (
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => void handleToggleActive(sp)}
                            title="Deactivate service point"
                            aria-label="Deactivate service point"
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="icon"
                            onClick={() => void handleToggleActive(sp)}
                            title="Reactivate service point"
                            aria-label="Reactivate service point"
                          >
                            <ToggleRight className="h-4 w-4" />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Recommended setup order"
        description="1) Create Service Points (Lab, Radiology, etc.), then 2) Map Rooms, Resources and Equipment to each point, then 3) Assign Staff and link Sections."
      />

      {/* Dialogs */}
      <ServicePointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branchId={branchId}
        editing={editing}
        locations={locations}
        units={units}
        onSaved={loadLists}
      />
      <ServicePointRoomsDialog
        open={!!roomsDialog}
        onOpenChange={(v) => !v && setRoomsDialog(null)}
        branchId={branchId}
        servicePoint={roomsDialog}
      />
      <ServicePointResourcesDialog
        open={!!resourcesDialog}
        onOpenChange={(v) => !v && setResourcesDialog(null)}
        branchId={branchId}
        servicePoint={resourcesDialog}
      />
      <ServicePointEquipmentDialog
        open={!!equipmentDialog}
        onOpenChange={(v) => !v && setEquipmentDialog(null)}
        branchId={branchId}
        servicePoint={equipmentDialog}
      />
      <ServicePointStaffDialog
        open={!!staffDialog}
        onOpenChange={(v) => { if (!v) setStaffDialog(null); }}
        branchId={branchId}
        servicePoint={staffDialog}
        onSaved={loadLists}
      />
      <ServicePointSectionsDialog
        open={!!sectionsDialog}
        onOpenChange={(v) => { if (!v) setSectionsDialog(null); }}
        branchId={branchId}
        servicePoint={sectionsDialog}
        onSaved={loadLists}
      />
    </div>
  );
}

/* ---- Create / Edit dialog ---- */

function ServicePointDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  locations,
  units,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: DiagnosticServicePointRow | null;
  locations: FlatLocationNode[];
  units: UnitRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ServicePointType>("OTHER");
  const [locationNodeId, setLocationNodeId] = React.useState("");
  const [unitId, setUnitId] = React.useState("none");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [operatingHoursText, setOperatingHoursText] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setType(editing?.type ?? "OTHER");
    setLocationNodeId(editing?.locationNodeId ?? "");
    setUnitId(editing?.unitId ?? "none");
    setSortOrder(editing?.sortOrder != null ? String(editing.sortOrder) : "");
    setNotes(editing?.notes ?? "");
    setOperatingHoursText(editing?.operatingHours ? (typeof editing.operatingHours === "string" ? editing.operatingHours : JSON.stringify(editing.operatingHours)) : "");
    setCapacity(editing?.capacity != null ? String(editing.capacity) : "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Service point");
    const nameErr = validateName(name, "Service point");
    if (!locationNodeId) return setErr("Location is required");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type,
            locationNodeId,
            unitId: unitId === "none" ? null : unitId,
            sortOrder: toInt(sortOrder) ?? undefined,
            notes: notes.trim() || null,
            operatingHours: operatingHoursText.trim() || null,
            capacity: toInt(capacity) ?? null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/service-points", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type,
            locationNodeId,
            unitId: unitId === "none" ? undefined : unitId,
            sortOrder: toInt(sortOrder) ?? undefined,
            notes: notes.trim() || undefined,
            operatingHours: operatingHoursText.trim() || undefined,
            capacity: toInt(capacity) ?? undefined,
          }),
        });
      }
      toast({ title: editing ? "Service point updated" : "Service point created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Service Point" : "Create Service Point"}
          description="Service points are diagnostic units bound to a location."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          <ErrorAlert message={err} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAB" />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Central Lab" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as ServicePointType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location" required>
              <Select value={locationNodeId} onValueChange={setLocationNodeId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Unit (optional)">
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="No unit" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">No unit</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Operating Hours" hint="e.g. Mon-Fri 8AM-6PM">
              <Input value={operatingHoursText} onChange={(e) => setOperatingHoursText(e.target.value)} placeholder="Mon-Fri 8AM-6PM" />
            </Field>
            <Field label="Capacity" hint="Max daily tests/procedures">
              <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="100" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </Field>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Map Rooms dialog ---- */

function ServicePointRoomsDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<RoomRow[]>([]);
  const [rows, setRows] = React.useState<RoomMapRow[]>([]);
  const [roomId, setRoomId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const rooms = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(safeArray(rooms));
      const mapped = await apiFetch<RoomMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/rooms?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || roomId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/rooms?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({
          roomId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast({ title: "Room added" });
      setRoomId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Rooms"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Room">
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select room</SelectItem>
                  {available.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || roomId === "none"}>Add room</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No rooms mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.room?.name || r.roomId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/rooms/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Map Resources dialog ---- */

function ServicePointResourcesDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<UnitResourceRow[]>([]);
  const [rows, setRows] = React.useState<ResourceMapRow[]>([]);
  const [resourceId, setResourceId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const resources = await apiFetch<UnitResourceRow[]>(`/api/infrastructure/resources?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(safeArray(resources));
      const mapped = await apiFetch<ResourceMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/resources?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || resourceId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/resources?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({
          resourceId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast({ title: "Resource added" });
      setResourceId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Resources"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Resource">
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select resource</SelectItem>
                  {available.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || resourceId === "none"}>Add resource</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No resources mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.resource?.name || r.resourceId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/resources/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Map Equipment dialog ---- */

function ServicePointEquipmentDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<EquipmentAssetRow[]>([]);
  const [rows, setRows] = React.useState<EquipmentMapRow[]>([]);
  const [equipmentId, setEquipmentId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const equipment = await apiFetch(`/api/infrastructure/equipment?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(normalizeEquipmentList(equipment));
      const mapped = await apiFetch<EquipmentMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/equipment?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || equipmentId === "none") return;
    try {
      const created = await apiFetch<EquipmentMapRow>(
        `/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/equipment?branchId=${encodeURIComponent(branchId)}`,
        {
        method: "POST",
        body: JSON.stringify({
          equipmentId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
        },
      );
      toast({ title: "Equipment added" });
      if (created?.id) {
        setRows((prev) => {
          const next = prev.filter((r) => r.id !== created.id);
          return [created, ...next];
        });
      }
      setEquipmentId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Equipment"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Equipment">
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select equipment</SelectItem>
                  {available.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || equipmentId === "none"}>Add equipment</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No equipment mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.equipment?.name || r.equipmentId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/equipment/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Staff dialog ---- */

function ServicePointStaffDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<any[]>([]);
  const [staffId, setStaffId] = React.useState("");
  const [role, setRole] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadStaff(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const mapped = await apiFetch<any[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/staff?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadStaff(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || !staffId.trim()) return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/staff?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ staffId: staffId.trim(), role: role.trim() || undefined }),
      });
      toast({ title: "Staff assigned" });
      setStaffId("");
      setRole("");
      await loadStaff(servicePoint);
      await onSaved();
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader title="Staff Assignment" description={servicePoint?.name || ""} onClose={() => onOpenChange(false)} />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Staff ID" required>
              <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Staff user ID" />
            </Field>
            <Field label="Role">
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Technician, Pathologist..." />
            </Field>
            <div className="flex items-end">
              <Button onClick={add} disabled={loading || !staffId.trim()}>Assign</Button>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No staff assigned.</div>
            ) : (
              rows.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    <span className="font-mono">{r.staffId}</span>
                    {r.role ? <span className="ml-2 text-xs text-zc-muted">({r.role})</span> : null}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/staff/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadStaff(servicePoint);
                        await onSaved();
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Sections dialog ---- */

function ServicePointSectionsDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<any[]>([]);
  const [allSections, setAllSections] = React.useState<{ id: string; name: string; code: string }[]>([]);
  const [sectionId, setSectionId] = React.useState("none");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const [mapped, secs] = await Promise.all([
        apiFetch<any[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/sections?branchId=${encodeURIComponent(branchId)}`),
        apiFetch<any[]>(`/api/infrastructure/diagnostics/sections?branchId=${encodeURIComponent(branchId)}`),
      ]);
      setRows(safeArray(mapped));
      setAllSections(safeArray(secs));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || sectionId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/sections?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ sectionId }),
      });
      toast({ title: "Section linked" });
      setSectionId("none");
      await loadAll(servicePoint);
      await onSaved();
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader title="Section Mapping" description={servicePoint?.name || ""} onClose={() => onOpenChange(false)} />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Section">
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select section</SelectItem>
                  {allSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button onClick={add} disabled={loading || sectionId === "none"}>Link section</Button>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No sections linked.</div>
            ) : (
              rows.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>{r.section?.name || r.sectionId} <span className="text-xs text-zc-muted font-mono">({r.section?.code || ""})</span></div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/sections/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                        await onSaved();
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
