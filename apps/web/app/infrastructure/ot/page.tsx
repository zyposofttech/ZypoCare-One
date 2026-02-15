"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

import { IconPlus, IconSearch } from "@/components/icons";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Hospital,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

// ---- Types ----

type OtSuiteStatus = "DRAFT" | "READY" | "ACTIVE" | "BOOKED" | "IN_USE" | "MAINTENANCE" | "ARCHIVED";

type OtSuite = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  status: OtSuiteStatus;
  locationNodeId?: string | null;
  config?: any;
  isActive?: boolean;
  reviewStatus?: string | null;
  lastValidationScore?: number | null;
  activatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  spaces?: any[];
  equipment?: any[];
};

type SuiteForm = {
  code: string;
  name: string;
  locationNodeId: string;
  template: string;
  notes: string;
};

// ---- Helpers ----

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

function statusBadge(status?: OtSuiteStatus | string | null) {
  const s = (status || "DRAFT").toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (s === "READY") return <Badge variant="success">Ready</Badge>;
  if (s === "MAINTENANCE") return <Badge variant="warning">Maintenance</Badge>;
  if (s === "ARCHIVED") return <Badge variant="secondary">Archived</Badge>;
  if (s === "BOOKED" || s === "IN_USE") return <Badge variant="info">{s.replace("_", " ")}</Badge>;
  return <Badge variant="accent">Draft</Badge>;
}

function readinessBadge(score?: number | null) {
  if (score == null) return <Badge variant="secondary">Not Validated</Badge>;
  if (score >= 100) return <Badge variant="success">{score}%</Badge>;
  if (score >= 70) return <Badge variant="warning">{score}%</Badge>;
  return <Badge variant="destructive">{score}%</Badge>;
}

const EMPTY_FORM: SuiteForm = { code: "", name: "", locationNodeId: "", template: "", notes: "" };

// ---- Component ----

export default function OtSetupPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const canRead = hasPerm(user, "ot.suite.read");
  const canCreate = hasPerm(user, "ot.suite.create");
  const canUpdate = hasPerm(user, "ot.suite.update");
  const canDelete = hasPerm(user, "ot.suite.delete");

  const { branchId } = useBranchContext();
  const activeBranch = useActiveBranchStore((s) => s.branch);

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<OtSuite[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<OtSuite | null>(null);

  const [form, setForm] = React.useState<SuiteForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  // AI page-level insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-setup" });

  // ---- Derived data ----
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.code} ${r.name} ${r.status}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const totalTheatres = React.useMemo(() => rows.reduce((acc, r) => acc + (r.spaces?.filter((s: any) => s.type === "THEATRE" && s.isActive)?.length ?? 0), 0), [rows]);
  const totalEquipment = React.useMemo(() => rows.reduce((acc, r) => acc + (r.equipment?.length ?? 0), 0), [rows]);
  const avgReadiness = React.useMemo(() => {
    const scored = rows.filter((r) => r.lastValidationScore != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((acc, r) => acc + (r.lastValidationScore ?? 0), 0) / scored.length);
  }, [rows]);

  // ---- API ----

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const qs = branchId ? `?branchId=${branchId}` : "";
      const data = await apiFetch<OtSuite[]>(`/api/infrastructure/ot/suites${qs}`);
      const sorted = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
      setRows(sorted);
      if (showToast) toast({ title: "OT Suites refreshed", description: `Loaded ${sorted.length} suites.` });
    } catch (e: any) {
      const msg = e?.message || "Failed to load OT suites";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function handleCreate() {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Code and Name are required." });
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        branchId: branchId || undefined,
        locationNodeId: form.locationNodeId || undefined,
        config: form.notes ? { notes: form.notes } : undefined,
      };
      await apiFetch("/api/infrastructure/ot/suites", { method: "POST", body: JSON.stringify(body) });
      toast({ title: "OT Suite created", description: `${body.name} has been created.` });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim() || undefined,
        locationNodeId: form.locationNodeId || undefined,
        config: form.notes ? { notes: form.notes } : undefined,
      };
      await apiFetch(`/api/infrastructure/ot/suites/${selected.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast({ title: "OT Suite updated", description: `${form.name || selected.name} updated.` });
      setEditOpen(false);
      setSelected(null);
      setForm(EMPTY_FORM);
      await refresh(false);
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
      await apiFetch(`/api/infrastructure/ot/suites/${selected.id}`, { method: "DELETE" });
      toast({ title: "OT Suite archived", description: `${selected.name} has been archived.` });
      setDeleteOpen(false);
      setSelected(null);
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Archive failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(suite: OtSuite) {
    setSelected(suite);
    setForm({
      code: suite.code,
      name: suite.name,
      locationNodeId: suite.locationNodeId ?? "",
      template: "",
      notes: (suite.config as any)?.notes ?? "",
    });
    setEditOpen(true);
  }

  function openDelete(suite: OtSuite) {
    setSelected(suite);
    setDeleteOpen(true);
  }

  // ---- Suggest code ----
  async function suggestCode() {
    try {
      const qs = branchId ? `?branchId=${branchId}` : "";
      const res = await apiFetch<{ code: string }>(`/api/infrastructure/ot/suites/suggest-code${qs}`);
      if (res?.code) setForm((p) => ({ ...p, code: res.code }));
    } catch { /* silent */ }
  }

  // ---- Render ----

  return (
    <AppShell title="OT Setup">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Hospital className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Operation Theatre Setup</div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure OT infrastructure — suites, theatres, spaces, equipment, scheduling, and compliance.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2 px-5" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button
                variant="primary"
                className="gap-2 px-5"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  void suggestCode();
                  setCreateOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                Create OT Suite
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              {activeBranch ? `Showing OT suites for ${activeBranch.name}` : "Select a branch to scope results, or view all."}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Suites</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Active Theatres</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{totalTheatres}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Total Equipment</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{totalEquipment}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Avg Readiness</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {avgReadiness != null ? `${avgReadiness}%` : "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Search by code, name, status..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
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

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">OT Suite Registry</CardTitle>
            <CardDescription className="text-sm">
              Click a suite to configure theatres, scheduling, staff, billing, compliance and more.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Theatres</th>
                  <th className="px-4 py-3 text-center font-semibold">Spaces</th>
                  <th className="px-4 py-3 text-center font-semibold">Equipment</th>
                  <th className="px-4 py-3 text-center font-semibold">Readiness</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zc-muted">
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                        </span>
                      ) : rows.length === 0 ? (
                        "No OT suites configured yet. Create one to get started."
                      ) : (
                        "No matching suites found."
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((suite) => {
                    const theatreCount = suite.spaces?.filter((s: any) => s.type === "THEATRE" && s.isActive)?.length ?? 0;
                    const spaceCount = suite.spaces?.filter((s: any) => s.isActive)?.length ?? 0;
                    const equipCount = suite.equipment?.length ?? 0;

                    return (
                      <tr
                        key={suite.id}
                        className="group cursor-pointer border-t border-zc-border transition-colors hover:bg-zc-panel/20"
                        onClick={() => router.push(`/infrastructure/ot/${suite.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{suite.code}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{suite.name}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-zc-muted opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(suite.status)}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{theatreCount}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{spaceCount}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{equipCount}</td>
                        <td className="px-4 py-3 text-center">{readinessBadge(suite.lastValidationScore)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canUpdate ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(suite)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-[rgb(var(--zc-danger))]" onClick={() => openDelete(suite)}>
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

        {/* Guidance Callout */}
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-medium">Getting Started with OT Setup</div>
          <div className="mt-1 text-xs text-zc-muted">
            Create an OT Suite to represent your operation theatre complex. Then click into it to configure
            spaces (theatres, recovery bays, scrub rooms), link equipment, assign staff, set scheduling rules,
            configure billing components, and run the Go-Live Validation checklist before activating.
          </div>
        </div>
      </div>

      {/* ---- Create Suite Drawer ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>Create OT Suite</DialogTitle>
            <DialogDescription>
              Set up a new operation theatre complex. After creation, click into it to configure spaces, staff, and policies.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            {/* Basics */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Basics</div>
              <Separator className="mt-2 mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Suite Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. OTC01"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Suite Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Main OT Complex"
                    maxLength={120}
                  />
                </div>
              </div>
            </div>

            {/* Template */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Template</div>
              <Separator className="mt-2 mb-4" />
              <div className="space-y-1.5">
                <Label className="text-xs">Apply Template</Label>
                <Select value={form.template} onValueChange={(v) => setForm((p) => ({ ...p, template: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small Hospital (2 OTs, 4 Recovery)</SelectItem>
                    <SelectItem value="medium">Medium Hospital (5 OTs, 8 Recovery)</SelectItem>
                    <SelectItem value="large">Large Hospital (10 OTs, 16 Recovery)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zc-muted">Pre-populates spaces and equipment after creation.</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes</div>
              <Separator className="mt-2 mb-4" />
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes about this OT complex..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Suite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Suite Drawer ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>Edit OT Suite</DialogTitle>
            <DialogDescription>
              Update suite details. For full configuration (theatres, staff, compliance), click into the suite detail page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Suite Details</div>
              <Separator className="mt-2 mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Suite Code</Label>
                  <Input value={form.code} disabled className="opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Suite Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    maxLength={120}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes</div>
              <Separator className="mt-2 mb-4" />
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive OT Suite</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <strong>{selected?.name}</strong> ({selected?.code})?
              This will soft-delete the suite and all its spaces/equipment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
