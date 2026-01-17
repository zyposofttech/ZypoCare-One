"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { LocationNodePicker } from "@/components/infrastructure/LocationNodePicker";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { AlertTriangle, Building2, FilterX, Loader2, Plus, RefreshCw, Settings2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };
type DepartmentRow = { id: string; code: string; name: string };
type UnitTypeCatalogRow = { id: string; code: string; name: string; usesRoomsDefault?: boolean };

type BranchUnitTypeRow =
  | string
  | {
      unitTypeId: string;
      isEnabled: boolean;
    };

type UnitRow = {
  id: string;
  branchId: string;
  departmentId: string;
  unitTypeId: string;
  code: string;
  name: string;
  usesRooms: boolean;
  isActive: boolean;

  department?: { id: string; code: string; name: string };
  unitType?: { id: string; code: string; name: string };
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_KEY = "zc.superadmin.infrastructure.branchId";

function readLS(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
  if (!rows?.length) return [];
  if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
  return (rows as any[])
    .filter((r) => r?.unitTypeId && r?.isEnabled === true)
    .map((r) => String(r.unitTypeId));
}

function branchOneLineLabel(b: BranchRow) {
  return `${b.name} (${b.code}) • ${b.city}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

/* -------------------------------------------------------------------------- */
/*                                 ModalShell                                 */
/*  Matches the modal styling pattern used in your Branch-style pages.         */
/* -------------------------------------------------------------------------- */

function ModalShell({
  title,
  description,
  children,
  onClose,
  maxW = "max-w-2xl",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxW?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full rounded-2xl border border-zc-border bg-zc-card shadow-elev-2 animate-in zoom-in-95 duration-200",
          maxW,
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>

        <Separator />

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function SuperAdminUnitsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [unitTypesCatalog, setUnitTypesCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledUnitTypeIds, setEnabledUnitTypeIds] = React.useState<Set<string>>(new Set());

  const [units, setUnits] = React.useState<UnitRow[]>([]);

  // Filters
  const [filterDept, setFilterDept] = React.useState<string | undefined>(undefined);
  const [filterUT, setFilterUT] = React.useState<string | undefined>(undefined);
  const [filterLocationNodeId, setFilterLocationNodeId] = React.useState<string | undefined>(undefined);
  const [q, setQ] = React.useState("");

  // Create modal (branch-style modal)
  const [openCreate, setOpenCreate] = React.useState(false);
  const [createErr, setCreateErr] = React.useState<string | null>(null);

  const [cDeptId, setCDeptId] = React.useState<string | undefined>(undefined);
  const [cUnitTypeId, setCUnitTypeId] = React.useState<string | undefined>(undefined);
  const [cLocationNodeId, setCLocationNodeId] = React.useState<string | undefined>(undefined);
  const [cCode, setCCode] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cUsesRooms, setCUsesRooms] = React.useState(true);
  const [cIsActive, setCIsActive] = React.useState(true);

  const selectTriggerCls = "h-11 w-full min-w-0 overflow-hidden rounded-xl border-zc-border bg-zc-card";
  const selectContentMaxW = "max-w-[min(560px,calc(100vw-2rem))]";

  const enabledUnitTypes = React.useMemo(() => {
    return unitTypesCatalog.filter((ut) => enabledUnitTypeIds.has(ut.id));
  }, [unitTypesCatalog, enabledUnitTypeIds]);

  const hasActiveFilters = Boolean(filterDept || filterUT || filterLocationNodeId || q.trim());
  const activeFilterCount = React.useMemo(() => {
    return [filterDept, filterUT, filterLocationNodeId, q.trim() ? "q" : ""].filter(Boolean).length;
  }, [filterDept, filterUT, filterLocationNodeId, q]);

  function clearFilters() {
    setFilterDept(undefined);
    setFilterUT(undefined);
    setFilterLocationNodeId(undefined);
    setQ("");
  }

  function resetCreateForm() {
    setCreateErr(null);
    setCDeptId(undefined);
    setCUnitTypeId(undefined);
    setCLocationNodeId(undefined);
    setCCode("");
    setCName("");
    setCUsesRooms(true);
    setCIsActive(true);
  }

  // ESC close + body scroll lock (modal behavior consistent across app)
  React.useEffect(() => {
    if (!openCreate) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenCreate(false);
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openCreate]);

  async function loadBranches() {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    setBranches(rows || []);

    const stored = readLS(LS_KEY);
    const first = rows?.[0]?.id;
    const next = (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_KEY, next);
  }

  async function loadUnitTypesCatalog() {
    const rows = await apiFetch<UnitTypeCatalogRow[]>("/api/infrastructure/unit-types/catalog");
    setUnitTypesCatalog(rows || []);
  }

  async function loadBranchEnablement(bid: string) {
    const rows = await apiFetch<BranchUnitTypeRow[]>(
      `/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`,
    );
    setEnabledUnitTypeIds(new Set(normalizeEnabledIds(rows || [])));
  }

  async function loadDepartments(bid: string) {
    const rows = await apiFetch<DepartmentRow[]>(
      `/api/infrastructure/departments?branchId=${encodeURIComponent(bid)}`,
    );
    setDepartments(rows || []);
  }

  async function loadUnits(bid: string) {
    const params = new URLSearchParams();
    params.set("branchId", bid);
    if (filterDept) params.set("departmentId", filterDept);
    if (filterUT) params.set("unitTypeId", filterUT);
    if (filterLocationNodeId) params.set("locationNodeId", filterLocationNodeId);
    if (q.trim()) params.set("q", q.trim());

    const rows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?${params.toString()}`);
    setUnits(rows || []);
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      await loadUnitTypesCatalog();
      if (branchId) {
        await Promise.all([loadDepartments(branchId), loadBranchEnablement(branchId), loadUnits(branchId)]);
      }
      if (showToast) toast({ title: "Refreshed", description: "Loaded latest units data." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed.";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        await Promise.all([loadDepartments(branchId), loadBranchEnablement(branchId), loadUnits(branchId)]);
      } catch (e: any) {
        setErr(e?.message || "Unable to load branch data.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await loadUnits(branchId);
        } catch (e: any) {
          setErr(e?.message || "Unable to load units.");
        }
      })();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDept, filterUT, filterLocationNodeId, q]);

  async function createUnit() {
    if (!branchId) return;

    setCreateErr(null);

    if (!cDeptId) return setCreateErr("Department is required.");
    if (!cUnitTypeId) return setCreateErr("Unit Type is required.");
    if (!cLocationNodeId) return setCreateErr("Location is required (Zone recommended, or Floor).");
    if (!cCode.trim()) return setCreateErr("Code is required.");
    if (!cName.trim()) return setCreateErr("Name is required.");

    setBusy(true);
    setErr(null);

    try {
      await apiFetch(`/api/infrastructure/units?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({
          departmentId: cDeptId,
          unitTypeId: cUnitTypeId,
          locationNodeId: cLocationNodeId,
          code: cCode.trim(),
          name: cName.trim(),
          usesRooms: cUsesRooms,
          isActive: cIsActive,
        }),
      });

      toast({ title: "Created", description: "Unit created successfully." });
      setOpenCreate(false);
      resetCreateForm();
      await loadUnits(branchId);
    } catch (e: any) {
      const msg = e?.message || "Unit creation failed.";
      setErr(msg);
      setCreateErr(msg);
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Units">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-zc-muted">
              <Link href="/superadmin/infrastructure" className="hover:underline">
                Infrastructure
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <span className="text-zc-text">Units</span>
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">Units / Wards</div>
            <div className="mt-2 text-sm text-zc-muted">
              Create and manage Units per branch. Unit Type must be enabled in Unit Type Enablement.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void refreshAll(true)}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>

            <Button
              variant="primary"
              className="gap-2"
              disabled={!branchId}
              onClick={() => {
                setCreateErr(null);
                setOpenCreate(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Unit
            </Button>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zc-accent" />
              Units
            </CardTitle>
            <CardDescription>Filter, open details, and configure rooms/resources.</CardDescription>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {loading ? (
              <div className="grid gap-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Filters panel */}
                <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-zc-text">
                        Filters{" "}
                        <span className="ml-2 text-xs font-normal text-zc-muted">
                          {hasActiveFilters ? `${activeFilterCount} active` : "none"}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        className="h-9 gap-2 rounded-xl"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters || busy}
                        title="Clear Department / Unit Type / Location / Search"
                      >
                        <FilterX className="h-4 w-4" />
                        Clear filters
                      </Button>
                    </div>

                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-12">
                      {/* Branch */}
                      <div className="grid gap-2 min-w-0 xl:col-span-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch</div>

                        <Select
                          value={branchId ?? ""}
                          onValueChange={(v) => {
                            setBranchId(v);
                            writeLS(LS_KEY, v);
                            setFilterDept(undefined);
                            setFilterUT(undefined);
                            setFilterLocationNodeId(undefined);
                            setQ("");
                          }}
                        >
                          <SelectTrigger className={selectTriggerCls}>
                            <SelectValue className="truncate" placeholder="Select branch…" />
                          </SelectTrigger>

                          <SelectContent align="start" className={selectContentMaxW}>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                <span className="block max-w-full truncate" title={branchOneLineLabel(b)}>
                                  {branchOneLineLabel(b)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Department */}
                      <div className="grid gap-2 min-w-0 xl:col-span-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Department</div>
                        <Select value={filterDept ?? ""} onValueChange={(v) => setFilterDept(v || undefined)}>
                          <SelectTrigger className={selectTriggerCls}>
                            <SelectValue className="truncate" placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent className={selectContentMaxW} align="start">
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                <span className="block max-w-full truncate" title={`${d.name} (${d.code})`}>
                                  {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Unit Type */}
                      <div className="grid gap-2 min-w-0 xl:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Unit Type</div>
                        <Select value={filterUT ?? ""} onValueChange={(v) => setFilterUT(v || undefined)}>
                          <SelectTrigger className={selectTriggerCls}>
                            <SelectValue className="truncate" placeholder="All unit types" />
                          </SelectTrigger>

                          <SelectContent
                            position="popper"
                            align="start"
                            side="bottom"
                            sideOffset={8}
                            className={cn(selectContentMaxW, "max-h-[320px] overflow-y-auto overflow-x-hidden")}
                          >
                            {unitTypesCatalog.map((ut) => (
                              <SelectItem key={ut.id} value={ut.id}>
                                <span className="block max-w-full truncate" title={`${ut.name} (${ut.code})`}>
                                  {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location */}
                      <div className="grid gap-2 min-w-0 xl:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Location</div>
                        <LocationNodePicker
                          branchId={branchId}
                          value={filterLocationNodeId}
                          onValueChange={setFilterLocationNodeId}
                          placeholder="All locations"
                        />
                      </div>

                      {/* Search */}
                      <div className="grid gap-2 min-w-0 xl:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Search</div>
                        <Input
                          className="h-11 w-full rounded-xl"
                          placeholder="Search code/name…"
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs text-zc-muted">
                        Showing <span className="text-zc-text font-medium">{units.length}</span> unit(s). Filters update
                        automatically.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-zc-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs uppercase tracking-wide text-zc-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Code</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-left">Unit Type</th>
                        <th className="px-3 py-2 text-left">Uses Rooms</th>
                        <th className="px-3 py-2 text-left">Active</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-zc-muted">
                            No units found.
                          </td>
                        </tr>
                      ) : (
                        units.map((u) => (
                          <tr key={u.id} className="border-t border-zc-border">
                            <td className="px-3 py-2 font-mono text-xs">{u.code}</td>
                            <td className="px-3 py-2">{u.name}</td>
                            <td className="px-3 py-2">{u.department?.name || <span className="text-zc-muted">—</span>}</td>
                            <td className="px-3 py-2">{u.unitType?.name || <span className="text-zc-muted">—</span>}</td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs">{String(!!u.usesRooms)}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-xs",
                                  u.isActive
                                    ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                    : "border-zc-border bg-zc-panel/20 text-zc-muted",
                                )}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button asChild variant="primary" className="gap-2">
                                <Link href={`/superadmin/infrastructure/units/${encodeURIComponent(u.id)}`}>
                                  <Settings2 className="h-4 w-4" />
                                  Configure
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-zc-muted">
                  Tip: Ensure Unit Types are enabled before creating units. Open each unit to configure Rooms/Resources.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------- Create Modal ------------------------------ */}
      {openCreate ? (
        <ModalShell
          title="Create Unit"
          description="Create a Unit/Ward under a Department and tag it to a Zone (recommended) or Floor."
          onClose={() => {
            setOpenCreate(false);
            resetCreateForm();
          }}
          maxW="max-w-2xl"
        >
          {createErr ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{createErr}</div>
            </div>
          ) : null}

          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 min-w-0">
                <Label>Department</Label>
                <Select value={cDeptId ?? ""} onValueChange={(v) => setCDeptId(v || undefined)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue className="truncate" placeholder="Select department…" />
                  </SelectTrigger>
                  <SelectContent className={selectContentMaxW} align="start">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="block max-w-full truncate" title={`${d.name} (${d.code})`}>
                          {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 min-w-0">
                <Label>Unit Type (Enabled only)</Label>
                <Select
                  value={cUnitTypeId ?? ""}
                  onValueChange={(v) => {
                    const next = v || undefined;
                    setCUnitTypeId(next);

                    const ut = enabledUnitTypes.find((x) => x.id === next);
                    if (ut?.usesRoomsDefault != null) setCUsesRooms(Boolean(ut.usesRoomsDefault));
                  }}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue className="truncate" placeholder="Select unit type…" />
                  </SelectTrigger>

                  <SelectContent
                    position="popper"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className={cn(selectContentMaxW, "max-h-[320px] overflow-y-auto overflow-x-hidden")}
                  >
                    {enabledUnitTypes.map((ut) => (
                      <SelectItem key={ut.id} value={ut.id}>
                        <span className="block max-w-full truncate" title={`${ut.name} (${ut.code})`}>
                          {ut.name} <span className="font-mono text-xs text-zc-muted">({ut.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {enabledUnitTypes.length === 0 ? (
                  <div className="text-xs text-amber-700 dark:text-amber-200">
                    No unit types enabled for this branch. Enable types first in Unit Types.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 min-w-0">
              <Label>Location (Zone / Floor)</Label>
              <LocationNodePicker
                branchId={branchId}
                value={cLocationNodeId}
                onValueChange={setCLocationNodeId}
                placeholder="Select Zone (recommended) or Floor…"
              />
              <p className="text-[11px] text-zc-muted">
                Tagging at Zone level is recommended for accurate room/resource mapping and reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 min-w-0">
                <Label>Code</Label>
                <Input
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value)}
                  placeholder="e.g. WARD01"
                  className="font-mono h-11 rounded-xl"
                />
                <p className="text-[11px] text-zc-muted">Use a stable code; uniqueness is per-branch.</p>
              </div>

              <div className="grid gap-2 min-w-0">
                <Label>Name</Label>
                <Input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g. General Ward - A"
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-zc-muted">Friendly display name for staff dashboards.</p>
              </div>
            </div>

            <Separator className="my-1" />

            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Uses Rooms</div>
                  <div className="text-xs text-zc-muted">
                    If off, unit becomes open-bay: rooms are disabled and resources are created directly under unit.
                  </div>
                </div>
                <Switch checked={cUsesRooms} onCheckedChange={setCUsesRooms} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Active</div>
                  <div className="text-xs text-zc-muted">Inactive units block active rooms/resources.</div>
                </div>
                <Switch checked={cIsActive} onCheckedChange={setCIsActive} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenCreate(false);
                  resetCreateForm();
                }}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void createUnit()}
                disabled={busy || enabledUnitTypes.length === 0}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Unit
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </AppShell>
  );
}
