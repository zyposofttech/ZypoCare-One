"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { AlertTriangle, Loader2, Pencil, Trash2, Wrench } from "lucide-react";

import type { OtEquipmentRow, OtSpaceRow, OtSuiteRow } from "../../_shared/types";
import { EQUIPMENT_CATEGORIES } from "../../_shared/constants";
import { humanize } from "../../_shared/utils";
import {
  SuiteContextBar,
  OtPageHeader,
  Field,
  StatBox,
  CodeBadge,
  EmptyRow,
  SearchBar,
  ErrorAlert,
  ModalHeader,
  drawerClassName,
  NoBranchGuard,
} from "../../_shared/components";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 04 — Equipment Inventory Page
   OTS-022 through OTS-026
   ========================================================= */

type EquipmentForm = {
  name: string;
  category: string;
  qty: number;
  manufacturer: string;
  model: string;
  serialNumber: string;
  spaceId: string;
  status: string;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  amcVendor: string;
  amcExpiry: string;
};

const EMPTY_FORM: EquipmentForm = {
  name: "",
  category: "",
  qty: 1,
  manufacturer: "",
  model: "",
  serialNumber: "",
  spaceId: "",
  status: "OPERATIONAL",
  lastMaintenanceDate: "",
  nextMaintenanceDue: "",
  amcVendor: "",
  amcExpiry: "",
};

const EQUIPMENT_STATUSES = [
  { value: "OPERATIONAL", label: "Operational" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "OUT_OF_ORDER", label: "Out of Order" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
] as const;

/* ---- Page export ---- */

export default function EquipmentPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Equipment Inventory">
      <RequirePerm perm="ot.suite.read">
        {branchId ? <EquipmentContent branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Content ---- */

function EquipmentContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canCreate = hasPerm(user, "ot.suite.update");
  const canUpdate = hasPerm(user, "ot.suite.update");
  const canDelete = hasPerm(user, "ot.suite.delete");

  /* ---- State ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [rows, setRows] = React.useState<OtEquipmentRow[]>([]);
  const [spaces, setSpaces] = React.useState<OtSpaceRow[]>([]);
  const [search, setSearch] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [downtimeOpen, setDowntimeOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<OtEquipmentRow | null>(null);

  const [form, setForm] = React.useState<EquipmentForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [pendingStatusChange, setPendingStatusChange] = React.useState<{ row: OtEquipmentRow; newStatus: string } | null>(null);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-equipment" });

  /* ---- Derived data ---- */
  const filtered = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.name} ${r.category} ${r.manufacturer ?? ""} ${r.model ?? ""} ${r.serialNumber ?? ""} ${r.space?.name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search]);

  const categoryBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.category] = (map[r.category] ?? 0) + r.qty;
    }
    return map;
  }, [rows]);

  const maintenanceAlerts = React.useMemo(() => {
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      if (!r.nextMaintenanceDue) return false;
      const due = new Date(r.nextMaintenanceDue);
      return due.getTime() - now.getTime() <= thirtyDays;
    });
  }, [rows]);

  const totalQty = React.useMemo(() => rows.reduce((acc, r) => acc + r.qty, 0), [rows]);

  /* ---- Helpers ---- */
  const qs = `?branchId=${encodeURIComponent(branchId)}`;
  const apiBase = `/api/infrastructure/ot/suites/${suiteId}`;

  const spaceLabel = React.useCallback(
    (spaceId?: string | null) => {
      if (!spaceId) return "\u2014";
      const sp = spaces.find((s) => s.id === spaceId);
      return sp ? sp.name : spaceId;
    },
    [spaces],
  );

  const statusBadge = (status?: string) => {
    switch (status) {
      case "OPERATIONAL":
        return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
      case "UNDER_MAINTENANCE":
        return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
      case "OUT_OF_ORDER":
        return "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200";
      case "DECOMMISSIONED":
        return "border-zinc-200 bg-zinc-50/70 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300";
      default:
        return "border-zc-border bg-zc-panel/30 text-zc-text";
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "\u2014";
    try {
      return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  /* ---- API ---- */

  const loadData = React.useCallback(
    async (showToast = false) => {
      setError(null);
      setLoading(true);
      try {
        const [suiteRes, equipRes, spacesRes] = await Promise.allSettled([
          apiFetch<OtSuiteRow>(`${apiBase}${qs}`),
          apiFetch<OtEquipmentRow[]>(`${apiBase}/equipment${qs}`),
          apiFetch<OtSpaceRow[]>(`${apiBase}/spaces${qs}`),
        ]);

        if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
        else setError("Failed to load suite information.");

        if (equipRes.status === "fulfilled") {
          const data = Array.isArray(equipRes.value) ? equipRes.value : [];
          setRows(data.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setError("Failed to load equipment.");
        }

        if (spacesRes.status === "fulfilled") {
          setSpaces(Array.isArray(spacesRes.value) ? spacesRes.value : []);
        }

        if (showToast) toast({ title: "Equipment refreshed" });
      } catch (e: any) {
        setError(e?.message || "Failed to load equipment data.");
      } finally {
        setLoading(false);
      }
    },
    [apiBase, qs, toast],
  );

  React.useEffect(() => {
    void loadData(false);
  }, [loadData]);

  /* ---- CRUD handlers ---- */

  async function handleCreate() {
    if (!form.name.trim() || !form.category) {
      toast({ variant: "destructive", title: "Validation", description: "Name and Category are required." });
      return;
    }
    if (form.qty < 1) {
      toast({ variant: "destructive", title: "Validation", description: "Quantity must be at least 1." });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
        qty: form.qty,
        manufacturer: form.manufacturer.trim() || undefined,
        model: form.model.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        spaceId: form.spaceId || undefined,
        status: form.status || "OPERATIONAL",
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        nextMaintenanceDue: form.nextMaintenanceDue || undefined,
        amcVendor: form.amcVendor.trim() || undefined,
        amcExpiry: form.amcExpiry || undefined,
      };
      await apiFetch(`${apiBase}/equipment`, { method: "POST", body: JSON.stringify(body) });
      toast({ title: "Equipment created", description: `${form.name} has been added.` });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await loadData(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    if (!form.name.trim() || !form.category) {
      toast({ variant: "destructive", title: "Validation", description: "Name and Category are required." });
      return;
    }

    // OTS-026: Detect status change to maintenance/out-of-order
    const oldStatus = selected.status || "OPERATIONAL";
    const newStatus = form.status;
    const isDowntimeTrigger =
      oldStatus === "OPERATIONAL" &&
      (newStatus === "UNDER_MAINTENANCE" || newStatus === "OUT_OF_ORDER");

    if (isDowntimeTrigger && !pendingStatusChange) {
      setPendingStatusChange({ row: selected, newStatus });
      setDowntimeOpen(true);
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
        qty: form.qty,
        manufacturer: form.manufacturer.trim() || undefined,
        model: form.model.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        spaceId: form.spaceId || undefined,
        status: form.status || "OPERATIONAL",
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        nextMaintenanceDue: form.nextMaintenanceDue || undefined,
        amcVendor: form.amcVendor.trim() || undefined,
        amcExpiry: form.amcExpiry || undefined,
      };
      await apiFetch(`/api/infrastructure/ot/equipment/${selected.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast({ title: "Equipment updated", description: `${form.name} has been updated.` });
      setEditOpen(false);
      setSelected(null);
      setForm(EMPTY_FORM);
      setPendingStatusChange(null);
      await loadData(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/infrastructure/ot/equipment/${selected.id}`, { method: "DELETE" });
      toast({ title: "Equipment deleted", description: `${selected.name} has been removed.` });
      setDeleteOpen(false);
      setSelected(null);
      await loadData(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row: OtEquipmentRow) {
    setSelected(row);
    setForm({
      name: row.name,
      category: row.category,
      qty: row.qty,
      manufacturer: row.manufacturer ?? "",
      model: row.model ?? "",
      serialNumber: row.serialNumber ?? "",
      spaceId: row.spaceId ?? "",
      status: row.status ?? "OPERATIONAL",
      lastMaintenanceDate: row.lastMaintenanceDate?.slice(0, 10) ?? "",
      nextMaintenanceDue: row.nextMaintenanceDue?.slice(0, 10) ?? "",
      amcVendor: row.amcVendor ?? "",
      amcExpiry: row.amcExpiry?.slice(0, 10) ?? "",
    });
    setEditOpen(true);
  }

  function openDelete(row: OtEquipmentRow) {
    setSelected(row);
    setDeleteOpen(true);
  }

  function handleDowntimeConfirm() {
    setDowntimeOpen(false);
    // Continue with the update after user acknowledges downtime impact
    void handleUpdate();
  }

  function handleDowntimeCancel() {
    setDowntimeOpen(false);
    setPendingStatusChange(null);
    // Revert status in form
    if (selected) {
      setForm((prev) => ({ ...prev, status: selected.status ?? "OPERATIONAL" }));
    }
  }

  /* ---- Category display helpers ---- */
  const topCategories = React.useMemo(() => {
    const entries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 4);
  }, [categoryBreakdown]);

  /* ---- Render ---- */
  return (
    <div className="grid gap-6">
      {/* Suite context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* Page header */}
      <OtPageHeader
        icon={<Wrench className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
        title="Equipment Inventory"
        description="Manage OT equipment, track maintenance schedules, and monitor operational status."
        loading={loading}
        onRefresh={() => void loadData(true)}
        canCreate={canCreate}
        createLabel="Add Equipment"
        onCreate={() => {
          setForm(EMPTY_FORM);
          setCreateOpen(true);
        }}
      />

      {/* Error */}
      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Stats row */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatBox label="Total Items" value={loading ? "\u2014" : rows.length} color="violet" detail={`${totalQty} units`} />
        {topCategories.map(([cat, count]) => (
          <StatBox key={cat} label={humanize(cat)} value={count} color="blue" detail="units" />
        ))}
        <StatBox
          label="Maintenance Alerts"
          value={loading ? "\u2014" : maintenanceAlerts.length}
          color={maintenanceAlerts.length > 0 ? "amber" : "emerald"}
          detail="due within 30 days"
        />
      </div>

      {/* Search */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search equipment by name, category, manufacturer, model..."
        filteredCount={filtered.length}
        totalCount={rows.length}
      />

      {/* Equipment table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Space / Theatre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Last Maintenance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Next Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">AMC Expiry</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={11} loading={loading} message="No equipment found. Add your first equipment item." />
                ) : (
                  filtered.map((row) => {
                    const isDueSoon = row.nextMaintenanceDue && new Date(row.nextMaintenanceDue).getTime() - Date.now() <= 30 * 86400000;
                    return (
                      <tr key={row.id} className="group transition-colors hover:bg-zc-panel/15">
                        <td className="px-4 py-3 font-medium text-zc-text">{row.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {humanize(row.category)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">{row.qty}</td>
                        <td className="px-4 py-3 text-zc-muted">{spaceLabel(row.spaceId)}</td>
                        <td className="px-4 py-3 text-zc-muted">{row.manufacturer ?? "\u2014"}</td>
                        <td className="px-4 py-3 text-zc-muted">{row.model ?? "\u2014"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-[10px]", statusBadge(row.status))}>
                            {humanize(row.status ?? "OPERATIONAL")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zc-muted">{formatDate(row.lastMaintenanceDate)}</td>
                        <td className={cn("px-4 py-3 tabular-nums", isDueSoon ? "font-semibold text-amber-600 dark:text-amber-400" : "text-zc-muted")}>
                          {formatDate(row.nextMaintenanceDue)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zc-muted">{formatDate(row.amcExpiry)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {canUpdate && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => openDelete(row)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---- Create Equipment Drawer ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={drawerClassName()}>
          <ModalHeader title="Add Equipment" description="Add a new equipment item to this OT suite." onClose={() => setCreateOpen(false)} />
          <EquipmentFormFields form={form} setForm={setForm} spaces={spaces} />
          <Separator className="my-4" />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Equipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Equipment Drawer ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={drawerClassName()}>
          <ModalHeader title="Edit Equipment" description={`Editing ${selected?.name ?? "equipment"}`} onClose={() => setEditOpen(false)} />
          <EquipmentFormFields form={form} setForm={setForm} spaces={spaces} />
          <Separator className="my-4" />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Downtime Impact Dialog (OTS-026) ---- */}
      <Dialog open={downtimeOpen} onOpenChange={(open) => { if (!open) handleDowntimeCancel(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Equipment Downtime Impact
            </DialogTitle>
            <DialogDescription>
              You are changing the status of <strong>{pendingStatusChange?.row.name}</strong> to{" "}
              <strong>{humanize(pendingStatusChange?.newStatus ?? "")}</strong>. Please review the potential impact.
            </DialogDescription>
          </DialogHeader>
          <Separator className="my-2" />
          <div className="grid gap-4 py-2">
            <DowntimeImpactSection
              label="Is this equipment mandatory for surgery?"
              value={
                pendingStatusChange?.row.category
                  ? ["ANESTHESIA_MACHINE", "PATIENT_MONITOR", "OT_TABLE", "OT_LIGHT", "ELECTROSURGICAL_UNIT", "DEFIBRILLATOR"].includes(
                      pendingStatusChange.row.category,
                    )
                    ? "Yes \u2014 this is a critical equipment category"
                    : "No \u2014 non-critical category"
                  : "\u2014"
              }
              critical={
                pendingStatusChange?.row.category
                  ? ["ANESTHESIA_MACHINE", "PATIENT_MONITOR", "OT_TABLE", "OT_LIGHT", "ELECTROSURGICAL_UNIT", "DEFIBRILLATOR"].includes(
                      pendingStatusChange.row.category,
                    )
                  : false
              }
            />
            <DowntimeImpactSection
              label="Scheduled cases affected?"
              value="Check with scheduling module for upcoming cases using this equipment."
              critical={false}
            />
            <DowntimeImpactSection
              label="Backup equipment available?"
              value={
                rows.filter(
                  (r) =>
                    r.category === pendingStatusChange?.row.category &&
                    r.id !== pendingStatusChange?.row.id &&
                    r.status === "OPERATIONAL",
                ).length > 0
                  ? `Yes \u2014 ${rows.filter((r) => r.category === pendingStatusChange?.row.category && r.id !== pendingStatusChange?.row.id && r.status === "OPERATIONAL").length} operational backup(s) found`
                  : "No \u2014 no operational backup equipment of this type"
              }
              critical={
                rows.filter(
                  (r) =>
                    r.category === pendingStatusChange?.row.category &&
                    r.id !== pendingStatusChange?.row.id &&
                    r.status === "OPERATIONAL",
                ).length === 0
              }
            />
          </div>
          <Separator className="my-2" />
          <DialogFooter>
            <Button variant="outline" onClick={handleDowntimeCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDowntimeConfirm} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Acknowledge & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
   Form fields component (shared between create/edit)
   ========================================================= */

function EquipmentFormFields({
  form,
  setForm,
  spaces,
}: {
  form: EquipmentForm;
  setForm: React.Dispatch<React.SetStateAction<EquipmentForm>>;
  spaces: OtSpaceRow[];
}) {
  return (
    <div className="grid gap-6">
      {/* Basic info */}
      <div className="text-xs font-bold uppercase tracking-widest text-zc-muted">Basic Information</div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Equipment Name" required>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Drager Fabius Plus XL" />
        </Field>
        <Field label="Category" required>
          <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {humanize(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Quantity" required>
          <Input
            type="number"
            min={1}
            value={form.qty}
            onChange={(e) => setForm((p) => ({ ...p, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Assigned Space">
          <Select value={form.spaceId} onValueChange={(v) => setForm((p) => ({ ...p, spaceId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {spaces.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>
                  {sp.name} ({humanize(sp.type)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Manufacturer info */}
      <Separator />
      <div className="text-xs font-bold uppercase tracking-widest text-zc-muted">Manufacturer Details</div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Manufacturer">
          <Input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Drager" />
        </Field>
        <Field label="Model">
          <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="e.g. Fabius Plus XL" />
        </Field>
        <Field label="Serial Number">
          <Input value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} placeholder="e.g. SN-2024-001" />
        </Field>
      </div>

      {/* Maintenance info */}
      <Separator />
      <div className="text-xs font-bold uppercase tracking-widest text-zc-muted">Maintenance & AMC</div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Last Maintenance Date">
          <Input
            type="date"
            value={form.lastMaintenanceDate}
            onChange={(e) => setForm((p) => ({ ...p, lastMaintenanceDate: e.target.value }))}
          />
        </Field>
        <Field label="Next Maintenance Due">
          <Input
            type="date"
            value={form.nextMaintenanceDue}
            onChange={(e) => setForm((p) => ({ ...p, nextMaintenanceDue: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="AMC Vendor">
          <Input value={form.amcVendor} onChange={(e) => setForm((p) => ({ ...p, amcVendor: e.target.value }))} placeholder="e.g. Drager India Pvt Ltd" />
        </Field>
        <Field label="AMC Expiry Date">
          <Input
            type="date"
            value={form.amcExpiry}
            onChange={(e) => setForm((p) => ({ ...p, amcExpiry: e.target.value }))}
          />
        </Field>
      </div>
    </div>
  );
}

/* =========================================================
   Downtime impact section
   ========================================================= */

function DowntimeImpactSection({
  label,
  value,
  critical,
}: {
  label: string;
  value: string;
  critical: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", critical ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10" : "border-zc-border bg-zc-panel/20")}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
      <div className={cn("mt-1 text-sm", critical ? "font-medium text-rose-700 dark:text-rose-300" : "text-zc-text")}>
        {value}
      </div>
    </div>
  );
}
