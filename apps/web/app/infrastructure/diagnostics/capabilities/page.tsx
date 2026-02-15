"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { Plus, RefreshCw, Pencil, Trash2, Search } from "lucide-react";

import type {
  CapabilityRow,
  DiagnosticItemRow,
  DiagnosticServicePointRow,
  Modality,
  AllowedRoomRow,
  AllowedResourceRow,
  AllowedEquipmentRow,
  RoomRow,
  UnitResourceRow,
  EquipmentAssetRow,
} from "../_shared/types";
import { MODALITIES } from "../_shared/constants";
import { safeArray, normalizeEquipmentList, toInt } from "../_shared/utils";
import { Field, ModalHeader, modalClassName } from "../_shared/components";

/* =========================================================
   Capabilities (Routing Rules) Page
   ========================================================= */

export default function CapabilitiesPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Routing Rules">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <CapabilitiesContent branchId={branchId} />
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   Main content
   ========================================================= */

function CapabilitiesContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [caps, setCaps] = React.useState<CapabilityRow[]>([]);
  const [servicePoints, setServicePoints] = React.useState<DiagnosticServicePointRow[]>([]);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CapabilityRow | null>(null);
  const [allowedRooms, setAllowedRooms] = React.useState<CapabilityRow | null>(null);
  const [allowedResources, setAllowedResources] = React.useState<CapabilityRow | null>(null);
  const [allowedEquipment, setAllowedEquipment] = React.useState<CapabilityRow | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const sp = await apiFetch<DiagnosticServicePointRow[]>(
        `/api/infrastructure/diagnostics/service-points?branchId=${encodeURIComponent(branchId)}`,
      );
      setServicePoints(safeArray(sp));
      const it = await apiFetch<DiagnosticItemRow[]>(
        `/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`,
      );
      setItems(safeArray(it));

      const qs = new URLSearchParams();
      qs.set("branchId", branchId);
      const rows = await apiFetch<CapabilityRow[]>(
        `/api/infrastructure/diagnostics/capabilities?${qs.toString()}`,
      );
      let next = safeArray(rows);
      if (!includeInactive) next = next.filter((c) => c.isActive);
      setCaps(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to load capabilities");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Capabilities</CardTitle>
        <CardDescription>
          Map diagnostic items to service points with modalities and constraints.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {err ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {err}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={loading}
          >
            <Plus className="mr-2 h-4 w-4" /> Capability
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {showFilters ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <Checkbox
              checked={includeInactive}
              onCheckedChange={(v) => setIncludeInactive(Boolean(v))}
            />
            <span className="text-sm text-zc-muted">Include Inactive</span>
          </div>
        ) : null}

        <Separator className="my-4" />
        <div className="grid gap-3">
          {caps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
              No capabilities configured.
            </div>
          ) : (
            caps.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-zc-border bg-zc-panel/10 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zc-text">
                      {c.diagnosticItem?.name || "Item"} @{" "}
                      {c.servicePoint?.name || "Service point"}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Modality: <span className="font-mono">{c.modality || "-"}</span> |
                      Duration:{" "}
                      <span className="font-mono">{c.defaultDurationMins ?? "-"}</span> mins
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Rooms:{" "}
                      <span className="font-mono">{c._count?.allowedRooms ?? 0}</span> |
                      Resources:{" "}
                      <span className="font-mono">{c._count?.allowedResources ?? 0}</span> |
                      Equipment:{" "}
                      <span className="font-mono">{c._count?.allowedEquipment ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAllowedRooms(c)}>
                      Rooms
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllowedResources(c)}
                    >
                      Resources
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllowedEquipment(c)}
                    >
                      Equipment
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(
                            `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(c.id)}?branchId=${encodeURIComponent(branchId)}`,
                            { method: "DELETE" },
                          );
                          toast({ title: "Capability deactivated" });
                          await loadAll();
                        } catch (e: any) {
                          toast({
                            title: "Deactivate failed",
                            description: e?.message || "Error",
                            variant: "destructive" as any,
                          });
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <CapabilityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          branchId={branchId}
          editing={editing}
          servicePoints={servicePoints}
          items={items}
          onSaved={loadAll}
        />
        <CapabilityRoomsDialog
          open={!!allowedRooms}
          onOpenChange={(v) => !v && setAllowedRooms(null)}
          branchId={branchId}
          capability={allowedRooms}
        />
        <CapabilityResourcesDialog
          open={!!allowedResources}
          onOpenChange={(v) => !v && setAllowedResources(null)}
          branchId={branchId}
          capability={allowedResources}
        />
        <CapabilityEquipmentDialog
          open={!!allowedEquipment}
          onOpenChange={(v) => !v && setAllowedEquipment(null)}
          branchId={branchId}
          capability={allowedEquipment}
        />
      </CardContent>
    </Card>
  );
}

/* =========================================================
   CapabilityDialog - create / edit a capability
   ========================================================= */

function CapabilityDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  servicePoints,
  items,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: CapabilityRow | null;
  servicePoints: DiagnosticServicePointRow[];
  items: DiagnosticItemRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [servicePointId, setServicePointId] = React.useState("");
  const [diagnosticItemId, setDiagnosticItemId] = React.useState("");
  const [modality, setModality] = React.useState<Modality | "none">("none");
  const [defaultDurationMins, setDefaultDurationMins] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setServicePointId(editing?.servicePointId ?? "");
    setDiagnosticItemId(editing?.diagnosticItemId ?? "");
    setModality((editing?.modality as Modality) ?? "none");
    setDefaultDurationMins(
      editing?.defaultDurationMins != null ? String(editing.defaultDurationMins) : "",
    );
    setIsPrimary(editing?.isPrimary ?? false);
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    if (!servicePointId || !diagnosticItemId) {
      setErr("Service point and diagnostic item are required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(
          `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(editing.id)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              branchId,
              modality: modality === "none" ? null : modality,
              defaultDurationMins: toInt(defaultDurationMins) ?? null,
              isPrimary,
              isActive,
            }),
          },
        );
      } else {
        await apiFetch("/api/infrastructure/diagnostics/capabilities", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            servicePointId,
            diagnosticItemId,
            modality: modality === "none" ? undefined : modality,
            defaultDurationMins: toInt(defaultDurationMins) ?? undefined,
            isPrimary,
          }),
        });
      }
      toast({ title: editing ? "Capability updated" : "Capability created" });
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
      <DialogContent
        className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}
      >
        <ModalHeader
          title={editing ? "Edit Capability" : "Create Capability"}
          description="Connect an item to a service point and configure modality."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
              {err}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Service point" required>
              <Select
                value={servicePointId}
                onValueChange={setServicePointId}
                disabled={!!editing}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select service point" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {servicePoints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Diagnostic item" required>
              <Select
                value={diagnosticItemId}
                onValueChange={setDiagnosticItemId}
                disabled={!!editing}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as any)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default duration (mins)">
              <Input
                value={defaultDurationMins}
                onChange={(e) => setDefaultDurationMins(e.target.value)}
                placeholder="30"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-sm font-semibold text-zc-text">Primary</div>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>
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

/* =========================================================
   CapabilityRoomsDialog
   ========================================================= */

function CapabilityRoomsDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<RoomRow[]>([]);
  const [rows, setRows] = React.useState<AllowedRoomRow[]>([]);
  const [roomId, setRoomId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const rooms = await apiFetch<RoomRow[]>(
      `/api/infrastructure/rooms?branchId=${encodeURIComponent(branchId)}`,
    );
    setAvailable(safeArray(rooms));
    const mapped = await apiFetch<AllowedRoomRow[]>(
      `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/rooms?branchId=${encodeURIComponent(branchId)}`,
    );
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || roomId === "none") return;
    try {
      await apiFetch(
        `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/rooms?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ roomId }),
        },
      );
      toast({ title: "Room allowed" });
      setRoomId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({
        title: "Add failed",
        description: e?.message || "Error",
        variant: "destructive" as any,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}
      >
        <ModalHeader
          title="Allowed Rooms"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select room</SelectItem>
                {available.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={roomId === "none"}>
              Add
            </Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                No allowed rooms.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm"
                >
                  <div>{r.room?.name || r.roomId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(
                          `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/rooms/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`,
                          { method: "DELETE" },
                        );
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({
                          title: "Remove failed",
                          description: e?.message || "Error",
                          variant: "destructive" as any,
                        });
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

/* =========================================================
   CapabilityResourcesDialog
   ========================================================= */

function CapabilityResourcesDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<UnitResourceRow[]>([]);
  const [rows, setRows] = React.useState<AllowedResourceRow[]>([]);
  const [resourceId, setResourceId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const resources = await apiFetch<UnitResourceRow[]>(
      `/api/infrastructure/resources?branchId=${encodeURIComponent(branchId)}`,
    );
    setAvailable(safeArray(resources));
    const mapped = await apiFetch<AllowedResourceRow[]>(
      `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/resources?branchId=${encodeURIComponent(branchId)}`,
    );
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || resourceId === "none") return;
    try {
      await apiFetch(
        `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/resources?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ resourceId }),
        },
      );
      toast({ title: "Resource allowed" });
      setResourceId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({
        title: "Add failed",
        description: e?.message || "Error",
        variant: "destructive" as any,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}
      >
        <ModalHeader
          title="Allowed Resources"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select resource" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select resource</SelectItem>
                {available.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={resourceId === "none"}>
              Add
            </Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                No allowed resources.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm"
                >
                  <div>{r.resource?.name || r.resourceId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(
                          `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/resources/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`,
                          { method: "DELETE" },
                        );
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({
                          title: "Remove failed",
                          description: e?.message || "Error",
                          variant: "destructive" as any,
                        });
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

/* =========================================================
   CapabilityEquipmentDialog
   ========================================================= */

function CapabilityEquipmentDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<EquipmentAssetRow[]>([]);
  const [rows, setRows] = React.useState<AllowedEquipmentRow[]>([]);
  const [equipmentId, setEquipmentId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const equipment = await apiFetch(
      `/api/infrastructure/equipment?branchId=${encodeURIComponent(branchId)}`,
    );
    setAvailable(normalizeEquipmentList(equipment));
    const mapped = await apiFetch<AllowedEquipmentRow[]>(
      `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/equipment?branchId=${encodeURIComponent(branchId)}`,
    );
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || equipmentId === "none") return;
    try {
      await apiFetch(
        `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/equipment?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ equipmentId }),
        },
      );
      toast({ title: "Equipment allowed" });
      setEquipmentId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({
        title: "Add failed",
        description: e?.message || "Error",
        variant: "destructive" as any,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}
      >
        <ModalHeader
          title="Allowed Equipment"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select equipment</SelectItem>
                {available.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={equipmentId === "none"}>
              Add
            </Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                No allowed equipment.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm"
                >
                  <div>{r.equipment?.name || r.equipmentId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(
                          `/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/equipment/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`,
                          { method: "DELETE" },
                        );
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({
                          title: "Remove failed",
                          description: e?.message || "Error",
                          variant: "destructive" as any,
                        });
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
