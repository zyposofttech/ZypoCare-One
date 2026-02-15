"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { BedDouble, Loader2, Pencil, Trash2 } from "lucide-react";

import type { OtSuiteRow, OtSpaceRow, OtSpaceType } from "../../_shared/types";
import { SPACE_TYPES } from "../../_shared/constants";
import { spaceTypeBadge, humanize } from "../../_shared/utils";
import {
  NoBranchGuard,
  SuiteContextBar,
  OtPageHeader,
  Field,
  StatBox,
  CodeBadge,
  StatusPill,
  EmptyRow,
  ErrorAlert,
  SearchBar,
  OnboardingCallout,
  drawerClassName,
  ModalHeader,
} from "../../_shared/components";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 02 — Spaces Configuration Page (OTS-006 to OTS-012)
   Manage all spaces within an OT Suite: theatres, recovery
   bays, pre-op holding, induction rooms, scrub rooms,
   sterile/anesthesia stores, staff change rooms, etc.
   ========================================================= */

export default function SpacesPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Spaces">
      <RequirePerm perm="ot.suite.read">
        {branchId ? <SpacesContent branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Gender options for STAFF_CHANGE ---- */

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "UNISEX", label: "Unisex" },
] as const;

/* ---- Detail summary builder ---- */

function detailSummary(type: OtSpaceType, details: any): string {
  if (!details || typeof details !== "object") return "\u2014";
  const parts: string[] = [];
  switch (type) {
    case "THEATRE":
      return "Configure in Theatres page";
    case "RECOVERY_BAY":
      if (details.trolleyCount) parts.push(`${details.trolleyCount} trolleys`);
      if (details.monitorCount) parts.push(`${details.monitorCount} monitors`);
      if (details.nurseToPatientRatio) parts.push(`Nurse:Pt ${details.nurseToPatientRatio}`);
      break;
    case "PREOP_HOLDING":
      if (details.capacity) parts.push(`Cap: ${details.capacity}`);
      if (details.idVerificationStation) parts.push("ID Verify");
      if (details.consentStation) parts.push("Consent Stn");
      break;
    case "INDUCTION_ROOM":
      if (details.anesthesiaMachine) parts.push("Anesth Machine");
      if (details.monitors) parts.push(`${details.monitors} monitors`);
      if (details.crashCart) parts.push("Crash Cart");
      break;
    case "SCRUB_ROOM":
      if (details.stationCount) parts.push(`${details.stationCount} stations`);
      if (details.sensorTaps) parts.push("Sensor Taps");
      if (details.timerDisplay) parts.push("Timer");
      break;
    case "STERILE_STORE":
      if (details.area) parts.push(`${details.area} sqm`);
      if (details.tempMonitoring) parts.push("Temp Mon");
      if (details.cssdLinkage) parts.push("CSSD");
      break;
    case "ANESTHESIA_STORE":
      if (details.narcoticsSafe) parts.push("Narcotics Safe");
      if (details.drugFridge) parts.push("Drug Fridge");
      if (details.pharmacyLink) parts.push(`Pharmacy: ${details.pharmacyLink}`);
      break;
    case "STAFF_CHANGE":
      if (details.gender) parts.push(humanize(details.gender));
      if (details.lockerCount) parts.push(`${details.lockerCount} lockers`);
      if (details.shower) parts.push("Shower");
      break;
    case "OTHER":
      if (details.notes) parts.push(details.notes.slice(0, 50));
      break;
  }
  return parts.length ? parts.join(", ") : "\u2014";
}

/* =========================================================
   Main Content
   ========================================================= */

function SpacesContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPerm(user, "ot.suite.create");
  const canUpdate = hasPerm(user, "ot.suite.update");
  const canDelete = hasPerm(user, "ot.suite.delete");

  /* ---- State ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [spaces, setSpaces] = React.useState<OtSpaceRow[]>([]);
  const [q, setQ] = React.useState("");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-spaces" });

  /* Drawer / dialog state */
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<OtSpaceRow | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OtSpaceRow | null>(null);

  /* ---- Load data ---- */
  const qs = `?branchId=${encodeURIComponent(branchId)}`;

  const loadData = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const [suiteRes, spacesRes] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
        apiFetch<OtSpaceRow[]>(`/api/infrastructure/ot/suites/${suiteId}/spaces${qs}`),
      ]);
      if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
      else setError("Failed to load suite information.");
      if (spacesRes.status === "fulfilled") setSpaces(Array.isArray(spacesRes.value) ? spacesRes.value : []);
      else if (!error) setError("Failed to load spaces.");
      if (showToast) toast({ title: "Spaces refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, qs, toast, error]);

  React.useEffect(() => { void loadData(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [branchId, suiteId]);

  /* ---- Derived stats ---- */
  const totalSpaces = spaces.length;
  const activeSpaces = spaces.filter((s) => s.isActive).length;
  const theatreCount = spaces.filter((s) => s.type === "THEATRE").length;
  const recoveryCount = spaces.filter((s) => s.type === "RECOVERY_BAY").length;
  const otherCount = totalSpaces - theatreCount - recoveryCount;

  /* ---- Search ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return spaces;
    return spaces.filter((sp) => {
      const typeLabel = SPACE_TYPES.find((t) => t.value === sp.type)?.label ?? sp.type;
      const hay = `${sp.code} ${sp.name} ${typeLabel}`.toLowerCase();
      return hay.includes(s);
    });
  }, [spaces, q]);

  /* ---- Handlers ---- */
  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(row: OtSpaceRow) {
    setEditing(row);
    setDrawerOpen(true);
  }

  function openDelete(row: OtSpaceRow) {
    setDeleteTarget(row);
    setDeleteOpen(true);
  }

  /* ---- Theatre spaces for multi-select in Pre-Op / Induction / Scrub ---- */
  const theatreSpaces = React.useMemo(
    () => spaces.filter((s) => s.type === "THEATRE"),
    [spaces],
  );

  return (
    <div className="grid gap-6">
      {/* Suite context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* Header */}
      <OtPageHeader
        icon={<BedDouble className="h-5 w-5 text-zc-accent" />}
        title="Spaces"
        description="Configure all areas within the OT suite: theatres, recovery bays, pre-op holding, induction rooms, scrub rooms, stores, and more."
        loading={loading}
        onRefresh={() => void loadData(true)}
        canCreate={canCreate}
        createLabel="Add Space"
        onCreate={openCreate}
      />

      {/* Error */}
      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Stats overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">Space inventory across the suite.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <StatBox label="Total Spaces" value={loading ? "\u2014" : totalSpaces} color="blue" detail={<>Active: <span className="font-semibold tabular-nums">{activeSpaces}</span></>} />
            <StatBox label="Theatres" value={loading ? "\u2014" : theatreCount} color="indigo" />
            <StatBox label="Recovery Bays" value={loading ? "\u2014" : recoveryCount} color="emerald" />
            <StatBox label="Other Spaces" value={loading ? "\u2014" : otherCount} color="amber" />
            <StatBox label="Space Types" value={loading ? "\u2014" : new Set(spaces.map((s) => s.type)).size} color="violet" detail="distinct types" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search by code, name, or type..."
        filteredCount={filtered.length}
        totalCount={spaces.length}
      />

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Spaces</CardTitle>
          <CardDescription className="text-sm">Full list of configured spaces in this OT suite.</CardDescription>
        </CardHeader>
        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Details</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <EmptyRow colSpan={6} loading={loading} message="No spaces found. Add your first space to get started." />
              ) : (
                filtered.map((sp) => {
                  const typeLabel = SPACE_TYPES.find((t) => t.value === sp.type)?.label ?? humanize(sp.type);
                  return (
                    <tr key={sp.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <CodeBadge>{sp.code}</CodeBadge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-zc-text">{sp.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", spaceTypeBadge(sp.type))}>
                          {typeLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[260px] truncate text-xs text-zc-muted">
                          {sp.type === "THEATRE" ? (
                            <Link
                              href={`/infrastructure/ot/${suiteId}/theatres` as any}
                              className="text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                            >
                              Configure in Theatres page
                            </Link>
                          ) : (
                            detailSummary(sp.type, sp.details)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill active={sp.isActive} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canUpdate ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(sp)}
                              title="Edit space"
                              aria-label="Edit space"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[rgb(var(--zc-danger))]"
                              onClick={() => openDelete(sp)}
                              title="Delete space"
                              aria-label="Delete space"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Setting up spaces"
        description="Create Theatre spaces first, then configure recovery bays, pre-op holding, induction rooms, scrub rooms, and storage areas. Theatre engineering specs are configured on the dedicated Theatres page."
      />

      {/* ---- Space Drawer (Create / Edit) ---- */}
      <SpaceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        branchId={branchId}
        suiteId={suiteId}
        editing={editing}
        theatreSpaces={theatreSpaces}
        onSaved={() => void loadData(false)}
      />

      {/* ---- Delete Confirmation ---- */}
      <DeleteSpaceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        branchId={branchId}
        suiteId={suiteId}
        space={deleteTarget}
        onDeleted={() => void loadData(false)}
      />
    </div>
  );
}

/* =========================================================
   Space Drawer — Create / Edit
   ========================================================= */

type SpaceForm = {
  code: string;
  name: string;
  type: OtSpaceType | "";
  isActive: boolean;
  notes: string;
  /* type-specific details */
  details: Record<string, any>;
};

const EMPTY_FORM: SpaceForm = {
  code: "",
  name: "",
  type: "",
  isActive: true,
  notes: "",
  details: {},
};

function formFromRow(row: OtSpaceRow): SpaceForm {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    isActive: row.isActive,
    notes: row.notes ?? "",
    details: typeof row.details === "object" && row.details ? { ...row.details } : {},
  };
}

function SpaceDrawer({
  open,
  onOpenChange,
  branchId,
  suiteId,
  editing,
  theatreSpaces,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  suiteId: string;
  editing: OtSpaceRow | null;
  theatreSpaces: OtSpaceRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState<SpaceForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  /* Reset form on open */
  React.useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromRow(editing) : EMPTY_FORM);
    setErr(null);
  }, [open, editing]);

  /* Field updater helpers */
  function setField<K extends keyof SpaceForm>(k: K, v: SpaceForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function setDetail(k: string, v: any) {
    setForm((p) => ({ ...p, details: { ...p.details, [k]: v } }));
  }

  function numDetail(k: string): string {
    const v = form.details[k];
    return v != null ? String(v) : "";
  }

  function boolDetail(k: string): boolean {
    return Boolean(form.details[k]);
  }

  function strDetail(k: string): string {
    return form.details[k] ?? "";
  }

  function arrDetail(k: string): string[] {
    const v = form.details[k];
    return Array.isArray(v) ? v : [];
  }

  /* Handle type change: reset details */
  function handleTypeChange(v: string) {
    setForm((p) => ({ ...p, type: v as OtSpaceType, details: {} }));
  }

  /* Multi-select toggle for attachedTheatreIds */
  function toggleTheatreId(id: string) {
    const current = arrDetail("attachedTheatreIds");
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setDetail("attachedTheatreIds", next);
  }

  /* Save */
  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      setErr("Code and Name are required.");
      return;
    }
    if (!form.type) {
      setErr("Space type is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const qs = `?branchId=${encodeURIComponent(branchId)}`;
      const body: any = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        isActive: form.isActive,
        notes: form.notes.trim() || null,
        details: form.type === "THEATRE" ? {} : form.details,
      };

      if (editing) {
        await apiFetch(`/api/infrastructure/ot/spaces/${editing.id}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast({ title: "Space updated", description: `${body.name} has been updated.` });
      } else {
        await apiFetch(`/api/infrastructure/ot/suites/${suiteId}/spaces${qs}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "Space created", description: `${body.name} has been added to the suite.` });
      }
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Failed to save space.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Space" : "Add Space"}
          description={editing ? `Editing ${editing.name} (${editing.code})` : "Configure a new space in this OT suite."}
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-6 px-1">
          <ErrorAlert message={err} />

          {/* ---- Common fields ---- */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Basic Information</div>
            <Separator className="mt-2 mb-4" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Space Code" required>
                <Input
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value.toUpperCase())}
                  placeholder="e.g. TH-01, RB-01"
                  maxLength={20}
                  disabled={!!editing}
                />
              </Field>
              <Field label="Space Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Theatre 1, Recovery Bay A"
                  maxLength={120}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Space Type" required>
                <Select value={form.type || "none"} onValueChange={(v) => v !== "none" && handleTypeChange(v)} disabled={!!editing}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select space type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    <SelectItem value="none" disabled>Select space type</SelectItem>
                    {SPACE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {editing ? (
                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                  <div className="text-sm font-semibold text-zc-text">Active</div>
                  <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} />
                </div>
              ) : null}
            </div>
          </div>

          {/* ---- Type-specific fields ---- */}
          {form.type && form.type !== "THEATRE" ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                {SPACE_TYPES.find((t) => t.value === form.type)?.label ?? "Type"} Configuration
              </div>
              <Separator className="mt-2 mb-4" />
              <TypeSpecificFields
                type={form.type as OtSpaceType}
                numDetail={numDetail}
                boolDetail={boolDetail}
                strDetail={strDetail}
                arrDetail={arrDetail}
                setDetail={setDetail}
                toggleTheatreId={toggleTheatreId}
                theatreSpaces={theatreSpaces}
              />
            </div>
          ) : null}

          {/* Theatre hint */}
          {form.type === "THEATRE" ? (
            <div className="rounded-xl border border-indigo-200/50 bg-indigo-50/30 p-4 text-sm text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/10 dark:text-indigo-300">
              Theatre engineering specs (area, gas pipelines, specialties, scheduling) are configured on the{" "}
              <Link href={`/infrastructure/ot/${editing?.suiteId ?? ""}/theatres` as any} className="underline font-semibold hover:text-indigo-500">
                Theatres page
              </Link>{" "}
              after creating this space.
            </div>
          ) : null}

          {/* Notes */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes</div>
            <Separator className="mt-2 mb-4" />
            <Field label="Notes">
              <Input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Optional notes about this space..."
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="mt-4 border-t border-zc-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Save Changes" : "Create Space"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Type-Specific Form Fields
   ========================================================= */

function TypeSpecificFields({
  type,
  numDetail,
  boolDetail,
  strDetail,
  arrDetail,
  setDetail,
  toggleTheatreId,
  theatreSpaces,
}: {
  type: OtSpaceType;
  numDetail: (k: string) => string;
  boolDetail: (k: string) => boolean;
  strDetail: (k: string) => string;
  arrDetail: (k: string) => string[];
  setDetail: (k: string, v: any) => void;
  toggleTheatreId: (id: string) => void;
  theatreSpaces: OtSpaceRow[];
}) {
  switch (type) {
    /* ---- Recovery Bay ---- */
    case "RECOVERY_BAY":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Trolley Count">
              <Input type="number" min={0} value={numDetail("trolleyCount")} onChange={(e) => setDetail("trolleyCount", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
            <Field label="Monitor Count">
              <Input type="number" min={0} value={numDetail("monitorCount")} onChange={(e) => setDetail("monitorCount", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="O2 Points">
              <Input type="number" min={0} value={numDetail("o2Points")} onChange={(e) => setDetail("o2Points", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
            <Field label="Suction Points">
              <Input type="number" min={0} value={numDetail("suctionPoints")} onChange={(e) => setDetail("suctionPoints", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Recovery Duration Minor (min)">
              <Input type="number" min={0} value={numDetail("recoveryDurationMinor")} onChange={(e) => setDetail("recoveryDurationMinor", parseInt(e.target.value) || null)} placeholder="30" />
            </Field>
            <Field label="Recovery Duration Major (min)">
              <Input type="number" min={0} value={numDetail("recoveryDurationMajor")} onChange={(e) => setDetail("recoveryDurationMajor", parseInt(e.target.value) || null)} placeholder="60" />
            </Field>
            <Field label="Recovery Duration Complex (min)">
              <Input type="number" min={0} value={numDetail("recoveryDurationComplex")} onChange={(e) => setDetail("recoveryDurationComplex", parseInt(e.target.value) || null)} placeholder="120" />
            </Field>
          </div>
          <Field label="Nurse-to-Patient Ratio" hint="e.g. 1:3">
            <Input value={strDetail("nurseToPatientRatio")} onChange={(e) => setDetail("nurseToPatientRatio", e.target.value)} placeholder="1:3" />
          </Field>
        </div>
      );

    /* ---- Pre-Op Holding ---- */
    case "PREOP_HOLDING":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Capacity">
              <Input type="number" min={0} value={numDetail("capacity")} onChange={(e) => setDetail("capacity", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
            <Field label="Holding Duration (min)">
              <Input type="number" min={0} value={numDetail("holdingDurationMin")} onChange={(e) => setDetail("holdingDurationMin", parseInt(e.target.value) || null)} placeholder="30" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="ID Verification Station" checked={boolDetail("idVerificationStation")} onChange={(v) => setDetail("idVerificationStation", v)} />
            <SwitchRow label="Consent Station" checked={boolDetail("consentStation")} onChange={(v) => setDetail("consentStation", v)} />
          </div>
          <TheatreMultiSelect
            label="Attached Theatres"
            selected={arrDetail("attachedTheatreIds")}
            theatres={theatreSpaces}
            onToggle={toggleTheatreId}
          />
        </div>
      );

    /* ---- Induction Room ---- */
    case "INDUCTION_ROOM":
      return (
        <div className="grid gap-4">
          <TheatreMultiSelect
            label="Attached Theatres"
            selected={arrDetail("attachedTheatreIds")}
            theatres={theatreSpaces}
            onToggle={toggleTheatreId}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Anesthesia Machine" checked={boolDetail("anesthesiaMachine")} onChange={(v) => setDetail("anesthesiaMachine", v)} />
            <Field label="Monitors">
              <Input type="number" min={0} value={numDetail("monitors")} onChange={(e) => setDetail("monitors", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
          </div>
          <SwitchRow label="Crash Cart" checked={boolDetail("crashCart")} onChange={(v) => setDetail("crashCart", v)} />
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mt-2">Gas Pipelines</div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="O2 Pipeline" checked={boolDetail("gasPipelineO2")} onChange={(v) => setDetail("gasPipelineO2", v)} />
            <SwitchRow label="N2O Pipeline" checked={boolDetail("gasPipelineN2O")} onChange={(v) => setDetail("gasPipelineN2O", v)} />
            <SwitchRow label="Air Pipeline" checked={boolDetail("gasPipelineAir")} onChange={(v) => setDetail("gasPipelineAir", v)} />
            <SwitchRow label="Vacuum Pipeline" checked={boolDetail("gasPipelineVacuum")} onChange={(v) => setDetail("gasPipelineVacuum", v)} />
          </div>
        </div>
      );

    /* ---- Scrub Room ---- */
    case "SCRUB_ROOM":
      return (
        <div className="grid gap-4">
          <Field label="Station Count">
            <Input type="number" min={0} value={numDetail("stationCount")} onChange={(e) => setDetail("stationCount", parseInt(e.target.value) || null)} placeholder="0" />
          </Field>
          <TheatreMultiSelect
            label="Attached Theatres"
            selected={arrDetail("attachedTheatreIds")}
            theatres={theatreSpaces}
            onToggle={toggleTheatreId}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Sensor Taps" checked={boolDetail("sensorTaps")} onChange={(v) => setDetail("sensorTaps", v)} />
            <SwitchRow label="Timer Display" checked={boolDetail("timerDisplay")} onChange={(v) => setDetail("timerDisplay", v)} />
          </div>
        </div>
      );

    /* ---- Sterile Store ---- */
    case "STERILE_STORE":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Area (sqm)">
              <Input type="number" min={0} step="0.1" value={numDetail("area")} onChange={(e) => setDetail("area", parseFloat(e.target.value) || null)} placeholder="0" />
            </Field>
            <Field label="Shelving Capacity">
              <Input type="number" min={0} value={numDetail("shelvingCapacity")} onChange={(e) => setDetail("shelvingCapacity", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Temperature Monitoring" checked={boolDetail("tempMonitoring")} onChange={(v) => setDetail("tempMonitoring", v)} />
            <SwitchRow label="Humidity Monitoring" checked={boolDetail("humidityMonitoring")} onChange={(v) => setDetail("humidityMonitoring", v)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Autoclave Link" checked={boolDetail("autoclaveLink")} onChange={(v) => setDetail("autoclaveLink", v)} />
            <SwitchRow label="CSSD Linkage" checked={boolDetail("cssdLinkage")} onChange={(v) => setDetail("cssdLinkage", v)} />
          </div>
        </div>
      );

    /* ---- Anesthesia Store ---- */
    case "ANESTHESIA_STORE":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Narcotics Safe" checked={boolDetail("narcoticsSafe")} onChange={(v) => setDetail("narcoticsSafe", v)} />
            <SwitchRow label="Drug Fridge" checked={boolDetail("drugFridge")} onChange={(v) => setDetail("drugFridge", v)} />
          </div>
          <Field label="Pharmacy Link" hint="Store ID or name">
            <Input value={strDetail("pharmacyLink")} onChange={(e) => setDetail("pharmacyLink", e.target.value)} placeholder="e.g. PHARM-MAIN" />
          </Field>
        </div>
      );

    /* ---- Staff Changing Room ---- */
    case "STAFF_CHANGE":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Gender" required>
              <Select value={strDetail("gender") || "none"} onValueChange={(v) => v !== "none" && setDetail("gender", v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select gender</SelectItem>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Locker Count">
              <Input type="number" min={0} value={numDetail("lockerCount")} onChange={(e) => setDetail("lockerCount", parseInt(e.target.value) || null)} placeholder="0" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow label="Shower Available" checked={boolDetail("shower")} onChange={(v) => setDetail("shower", v)} />
            <SwitchRow label="Shoe Change Required" checked={boolDetail("shoeChange")} onChange={(v) => setDetail("shoeChange", v)} />
          </div>
        </div>
      );

    /* ---- Other ---- */
    case "OTHER":
      return (
        <Field label="Notes">
          <Input value={strDetail("notes")} onChange={(e) => setDetail("notes", e.target.value)} placeholder="Describe this space..." />
        </Field>
      );

    default:
      return null;
  }
}

/* =========================================================
   Small reusable helpers
   ========================================================= */

/** Switch row: label + switch in a bordered panel */
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
      <div className="text-sm font-semibold text-zc-text">{label}</div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Multi-select for attached theatres with chip-style toggles */
function TheatreMultiSelect({
  label,
  selected,
  theatres,
  onToggle,
}: {
  label: string;
  selected: string[];
  theatres: OtSpaceRow[];
  onToggle: (id: string) => void;
}) {
  if (!theatres.length) {
    return (
      <Field label={label} hint="Create theatre spaces first">
        <div className="rounded-xl border border-dashed border-zc-border p-3 text-sm text-zc-muted">
          No theatre spaces available. Create theatre spaces first.
        </div>
      </Field>
    );
  }

  return (
    <Field label={label} hint={`${selected.length} selected`}>
      <div className="flex flex-wrap gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
        {theatres.map((t) => {
          const isSelected = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "border-zc-border bg-zc-card text-zc-muted hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/20",
              )}
            >
              {t.name} ({t.code})
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/* =========================================================
   Delete Confirmation Dialog
   ========================================================= */

function DeleteSpaceDialog({
  open,
  onOpenChange,
  branchId,
  suiteId,
  space,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  suiteId: string;
  space: OtSpaceRow | null;
  onDeleted: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!space) return;
    setDeleting(true);
    try {
      const qs = `?branchId=${encodeURIComponent(branchId)}`;
      await apiFetch(`/api/infrastructure/ot/spaces/${space.id}${qs}`, {
        method: "DELETE",
      });
      toast({ title: "Space deleted", description: `${space.name} has been removed.` });
      onOpenChange(false);
      await onDeleted();
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Could not delete space.",
        variant: "destructive" as any,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{space?.name}</strong> ({space?.code})?
            {space?.type === "THEATRE"
              ? " This will also remove the associated theatre configuration."
              : " This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
