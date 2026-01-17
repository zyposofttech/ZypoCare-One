"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, RefreshCw, Save, Layers, Building2 } from "lucide-react";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;
};

type UnitTypeCatalogRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  usesRoomsDefault?: boolean;
  schedulableByDefault?: boolean;
  isActive?: boolean;
};

type BranchUnitTypeRow =
  | string
  | {
      id?: string;
      unitTypeId: string;
      isEnabled: boolean;
    };

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

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export default function SuperAdminUnitTypeEnablementPage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [catalog, setCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledSet, setEnabledSet] = React.useState<Set<string>>(new Set());
  const [initialEnabledSet, setInitialEnabledSet] = React.useState<Set<string>>(new Set());

  const [q, setQ] = React.useState("");

  const hasChanges = React.useMemo(() => {
    if (enabledSet.size !== initialEnabledSet.size) return true;
    for (const id of enabledSet) if (!initialEnabledSet.has(id)) return true;
    return false;
  }, [enabledSet, initialEnabledSet]);

  async function loadBranches() {
    setErr(null);
    try {
      const rows = await apiFetch<BranchRow[]>("/api/branches");
      setBranches(rows || []);

      const stored = readLS(LS_KEY);
      const first = rows?.[0]?.id;

      const next =
        (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

      setBranchId(next);
      if (next) writeLS(LS_KEY, next);
    } catch (e: any) {
      setErr(e?.message || "Unable to load branches.");
    }
  }

  async function loadCatalog() {
    try {
      const rows = await apiFetch<UnitTypeCatalogRow[]>("/api/infrastructure/unit-types/catalog");
      setCatalog(rows || []);
    } catch (e: any) {
      throw new Error(e?.message || "Unable to load unit type catalog.");
    }
  }

  function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
    if (!rows) return [];
    // If API returns array of string ids
    if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
    // If API returns objects {unitTypeId,isEnabled}
    return (rows as any[])
      .filter((r) => r?.unitTypeId && r?.isEnabled === true)
      .map((r) => String(r.unitTypeId));
  }

  async function loadBranchEnabledTypes(bid: string) {
    try {
      const rows = await apiFetch<BranchUnitTypeRow[]>(
        `/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`
      );
      const ids = normalizeEnabledIds(rows || []);
      const set = new Set(ids);
      setEnabledSet(set);
      setInitialEnabledSet(new Set(ids));
    } catch (e: any) {
      throw new Error(e?.message || "Unable to load branch unit type enablement.");
    }
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      await loadCatalog();
      if (branchId) await loadBranchEnabledTypes(branchId);
      if (showToast) toast({ title: "Refreshed", description: "Loaded latest data." });
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
        await loadBranchEnabledTypes(branchId);
      } catch (e: any) {
        setErr(e?.message || "Unable to load enablement.");
      } finally {
        setBusy(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalog;
    return catalog.filter((r) => {
      const hay = `${r.code} ${r.name} ${r.description || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [catalog, q]);

  function toggle(id: string) {
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setEnabledSet(new Set(catalog.map((c) => c.id)));
  }

  function deselectAll() {
    setEnabledSet(new Set());
  }

  async function save() {
    if (!branchId) return;
    setBusy(true);
    setErr(null);

    try {
      const unitTypeIds = Array.from(enabledSet);

      await apiFetch(`/api/infrastructure/branches/${encodeURIComponent(branchId)}/unit-types`, {
        method: "PUT",
        body: JSON.stringify({ unitTypeIds }),
      });

      setInitialEnabledSet(new Set(unitTypeIds));
      toast({ title: "Saved", description: "Unit type enablement updated successfully." });
    } catch (e: any) {
      const msg = e?.message || "Save failed.";
      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  const selectedBranch = React.useMemo(
    () => branches.find((b) => b.id === branchId) || null,
    [branches, branchId]
  );

  return (
    <AppShell title="Infrastructure • Unit Types">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-zc-muted">
              <Link href="/superadmin/infrastructure" className="hover:underline">
                Infrastructure
              </Link>
              <span className="mx-2 text-zc-muted/60">/</span>
              <span className="text-zc-text">Unit Types</span>
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">Unit Type Enablement</div>
            <div className="mt-2 text-sm text-zc-muted">
              Enable/disable unit types per branch. Only enabled unit types can be used while creating Units/Wards.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void refreshAll(true)}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>
            <Button className="gap-2" disabled={busy || !branchId || !hasChanges} onClick={() => void save()}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Branch selector */}
          <Card className="lg:col-span-1 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-zc-accent" />
                Branch
              </CardTitle>
              <CardDescription>Select the branch to configure.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-11 w-full rounded-xl" />
              ) : (
                <div className="grid gap-3">
                  <Select
                    value={branchId}
                    onValueChange={(v) => {
                      setBranchId(v);
                      writeLS(LS_KEY, v);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                      <SelectValue placeholder="Select a branch…" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>{" "}
                          <span className="text-xs text-zc-muted">• {b.city}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedBranch ? (
                    <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-3 text-sm">
                      <div className="font-semibold text-zc-text">{selectedBranch.name}</div>
                      <div className="mt-1 text-zc-muted">
                        <span className="font-mono">{selectedBranch.code}</span> • {selectedBranch.city}
                      </div>
                      <div className="mt-2 text-xs text-zc-muted">
                        Enabled types: <span className="font-semibold tabular-nums">{enabledSet.size}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={selectAll} disabled={busy || catalog.length === 0}>
                      Select all
                    </Button>
                    <Button type="button" variant="outline" onClick={deselectAll} disabled={busy}>
                      Deselect all
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Catalog */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-zc-accent" />
                Catalog
              </CardTitle>
              <CardDescription>Search and toggle which unit types are enabled for the selected branch.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-3">
                <input
                  className="h-11 w-full rounded-xl border border-zc-border bg-zc-card px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Search unit types (code/name)…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="text-xs text-zc-muted tabular-nums whitespace-nowrap">
                  {enabledSet.size}/{catalog.length} enabled
                </div>
              </div>

              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                  No unit types match your search.
                </div>
              ) : (
                <div className="grid gap-2">
                  {filtered.map((ut) => {
                    const checked = enabledSet.has(ut.id);
                    return (
                      <div
                        key={ut.id}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-3",
                          checked ? "ring-1 ring-indigo-500/20" : ""
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-zc-text">
                              {ut.name}{" "}
                              <span className="ml-1 font-mono text-xs text-zc-muted">({ut.code})</span>
                            </div>
                            {checked ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] text-zc-muted">
                                Disabled
                              </span>
                            )}
                          </div>
                          {ut.description ? (
                            <div className="mt-1 text-sm text-zc-muted">{ut.description}</div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zc-muted">
                            <span className="rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5">
                              usesRoomsDefault: <span className="font-mono">{String(!!ut.usesRoomsDefault)}</span>
                            </span>
                            <span className="rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5">
                              schedulableByDefault:{" "}
                              <span className="font-mono">{String(!!ut.schedulableByDefault)}</span>
                            </span>
                          </div>
                        </div>

                        <label className="inline-flex items-center gap-2 select-none">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-zc-border"
                            checked={checked}
                            onChange={() => toggle(ut.id)}
                            disabled={busy || !branchId}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
