"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Tags,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type SpecialtyKind = "SPECIALTY" | "SUPER_SPECIALTY";

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type SpecialtyRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  kind: SpecialtyKind;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  departments?: Array<{
    departmentId: string;
    isPrimary: boolean;
    department: { id: string; code: string; name: string; isActive: boolean };
  }>;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function kindLabel(k: SpecialtyKind) {
  return k === "SUPER_SPECIALTY" ? "Super-specialty" : "Specialty";
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/* ----------------------------- Page ----------------------------- */

export default function SpecialtiesPage() {
  const { toast } = useToast();
  const { scope, branchId, isReady, reason } = useBranchContext();

  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [rows, setRows] = React.useState<SpecialtyRow[]>([]);
  const [allRows, setAllRows] = React.useState<SpecialtyRow[]>([]);

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<SpecialtyKind>("SPECIALTY");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [showUsage, setShowUsage] = React.useState(true);

  // Editor
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SpecialtyRow | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fKind, setFKind] = React.useState<SpecialtyKind>("SPECIALTY");
  const [fActive, setFActive] = React.useState(true);

  const activeCount = allRows.filter((r) => r.isActive).length;
  const inactiveCount = allRows.filter((r) => !r.isActive).length;
  const specialtyCount = allRows.filter((r) => r.kind === "SPECIALTY").length;
  const superCount = allRows.filter((r) => r.kind === "SUPER_SPECIALTY").length;

  async function loadBranch(bid: string) {
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(bid)}`);
      setBranch(b);
    } catch {
      setBranch(null);
    }
  }

  async function loadSpecialties(bid: string) {
    setErr(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("branchId", bid);
      if (includeInactive) params.set("includeInactive", "true");
      if (showUsage) params.set("includeMappings", "true");
      if (q.trim()) params.set("q", q.trim());

      const data = await apiFetch<SpecialtyRow[]>(`/api/specialties?${params.toString()}`);
      let list = Array.isArray(data) ? data : [];
      setAllRows(list);
      list = list.filter((s) => s.kind === kind);
      setRows(list);
    } catch (e: any) {
      setAllRows([]);
      setRows([]);
      setErr(errorMessage(e, "Failed to load specialties"));
    } finally {
      setLoading(false);
    }
  }

  const refreshAll = React.useCallback(async () => {
    if (!branchId) return;
    await Promise.all([loadBranch(branchId), loadSpecialties(branchId)]);
  }, [branchId, includeInactive, showUsage, q, kind]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    void loadBranch(branchId);
    void loadSpecialties(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId, includeInactive, showUsage, q, kind]);

  function openCreate() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFKind("SPECIALTY");
    setFActive(true);
    setOpen(true);
  }

  function openEdit(r: SpecialtyRow) {
    setEditing(r);
    setFCode(r.code);
    setFName(r.name);
    setFKind(r.kind);
    setFActive(r.isActive);
    setOpen(true);
  }

  async function save() {
    if (!branchId) return;

    const code = fCode.trim().toUpperCase();
    const name = fName.trim();

    if (!editing && !code) {
      toast({ title: "Missing code", description: "Specialty code is required.", variant: "destructive" });
      return;
    }
    if (!name) {
      toast({ title: "Missing name", description: "Specialty name is required.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/specialties/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: {
            name,
            kind: fKind,
            isActive: fActive,
          },
        });
        toast({ title: "Specialty updated", description: "Changes saved successfully.", duration: 1600 });
      } else {
        await apiFetch(`/api/specialties`, {
          method: "POST",
          body: {
            branchId,
            code,
            name,
            kind: fKind,
            isActive: fActive,
          },
        });
        toast({ title: "Specialty created", description: "Specialty added successfully.", duration: 1600 });
      }

      setOpen(false);
      await loadSpecialties(branchId);
    } catch (e: any) {
      toast({ title: "Save failed", description: errorMessage(e, "Failed to save specialty"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: SpecialtyRow) {
    if (!branchId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/specialties/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        body: { isActive: !r.isActive },
      });
      toast({ title: r.isActive ? "Deactivated" : "Activated", description: `${r.name}`, duration: 1400 });
      await loadSpecialties(branchId);
    } catch (e: any) {
      toast({ title: "Update failed", description: errorMessage(e, "Failed to update status"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Specialties">
      <RequirePerm perm="SPECIALTY_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Tags className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Specialties</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Pre-loaded MCI-recognized specialties + super-specialties. Departments tag one or more specialties during configuration.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage specialties."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll()} disabled={loading || busy || !branchId}>
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={loading || busy || !branchId}>
                <Plus className="h-4 w-4" />
                New Specialty
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Search and filter specialties in the active branch.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Specialties</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{allRows.length}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive:{" "}
                    <span className="font-semibold tabular-nums">{inactiveCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Specialties</div>
                  <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{specialtyCount}</div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Super-specialties</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{superCount}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by code or name..."
                    className="pl-10"
                    disabled={!branchId}
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span> specialties
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px]">
                  <Label className="text-xs text-zc-muted">Kind</Label>
                  <Tabs value={kind} onValueChange={(v) => setKind(v as SpecialtyKind)}>
                    <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                      <TabsTrigger
                        value="SPECIALTY"
                        className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        <Tags className="mr-2 h-4 w-4" />
                        Specialty
                      </TabsTrigger>
                      <TabsTrigger
                        value="SUPER_SPECIALTY"
                        className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Super-specialty
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Include inactive</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={showUsage} onCheckedChange={setShowUsage} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Show usage</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setQ("");
                    setKind("SPECIALTY");
                    setIncludeInactive(false);
                    setShowUsage(true);
                  }}
                  disabled={!branchId}
                >
                  <Filter className="h-4 w-4" />
                  Reset
                </Button>

                {branch ? (
                  <span className="text-xs text-zc-muted">
                    Branch: <span className="font-semibold text-zc-text">{branch.code}</span>
                  </span>
                ) : null}
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
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Specialty Directory</CardTitle>
                  <CardDescription className="text-sm">Master list used to tag departments.</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                    {showUsage ? "Usage ON" : "Usage OFF"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Specialty</th>
                    <th className="px-4 py-3 text-left font-semibold">Kind</th>
                    <th className="px-4 py-3 text-left font-semibold">Used in</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        Loading specialties...
                      </td>
                    </tr>
                  ) : !branchId ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          Select a branch first.
                        </span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          No specialties found.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const usageCount = showUsage ? (r.departments?.length ?? 0) : 0;
                      const primaryDept = showUsage ? r.departments?.find((d) => d.isPrimary)?.department : null;

                      return (
                        <tr key={r.id} className={cn("border-t border-zc-border hover:bg-zc-panel/20", !r.isActive && "opacity-70")}>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                              {r.code}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-zc-text">{r.name}</div>
                            {showUsage && primaryDept ? (
                              <div className="mt-0.5 text-xs text-zc-muted">
                                Primary in: <span className="font-mono">{primaryDept.code}</span> - {primaryDept.name}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                              {kindLabel(r.kind)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">
                            {showUsage ? (
                              <span className="font-mono text-xs text-zc-text">{usageCount}</span>
                            ) : (
                              <span className="text-zc-muted">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {r.isActive ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                INACTIVE
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">{fmtDateTime(r.updatedAt)}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => openEdit(r)}
                                title="Edit specialty"
                                aria-label="Edit specialty"
                                disabled={!branchId || busy}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={r.isActive ? "secondary" : "success"}
                                size="icon"
                                onClick={() => void toggleActive(r)}
                                title={r.isActive ? "Deactivate specialty" : "Activate specialty"}
                                aria-label={r.isActive ? "Deactivate specialty" : "Activate specialty"}
                                disabled={!branchId || busy}
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : r.isActive ? (
                                  <ToggleLeft className="h-4 w-4" />
                                ) : (
                                  <ToggleRight className="h-4 w-4" />
                                )}
                              </Button>
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

          {/* Editor */}
          <Dialog open={open} onOpenChange={(v) => (!busy ? setOpen(v) : null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Specialty" : "New Specialty"}</DialogTitle>
                <DialogDescription>Specialties are used to tag departments. Seeded items can be edited/disabled as needed.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label>Code</Label>
                    <Input
                      value={fCode}
                      onChange={(e) => setFCode(e.target.value)}
                      placeholder="e.g. CARDIO"
                      className="h-11 rounded-xl border-zc-border bg-zc-card font-mono"
                      disabled={!!editing || busy}
                    />
                    <div className="mt-1 text-xs text-zc-muted">Unique within branch. Uppercase letters/numbers/_</div>
                  </div>

                  <div className="md:col-span-8">
                    <Label>Name</Label>
                    <Input
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className="h-11 rounded-xl border-zc-border bg-zc-card"
                      disabled={busy}
                    />
                  </div>

                  <div className="md:col-span-6">
                    <Label>Kind</Label>
                    <Select value={fKind} onValueChange={(v) => setFKind(v as SpecialtyKind)} disabled={busy}>
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SPECIALTY">Specialty</SelectItem>
                        <SelectItem value="SUPER_SPECIALTY">Super-specialty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-6">
                    <Label>Status</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Switch checked={fActive} onCheckedChange={setFActive} disabled={busy} />
                      <span className="text-sm text-zc-muted">{fActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void save()} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
