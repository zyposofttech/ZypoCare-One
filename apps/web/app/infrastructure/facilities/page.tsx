"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import{
  AlertTriangle,
  Building2,
  Check,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Save,
  Shield,
  Stethoscope,
  Wrench,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

type FacilityCatalog = {
  id: string;
  code: string;
  name: string;
  category: FacilityCategory;
  isActive: boolean;
  sortOrder: number;
};

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type BranchFacility = {
  id: string;
  branchId: string;
  facilityId: string;
  enabledAt: string;
  facility: Pick<FacilityCatalog, "id" | "code" | "name" | "category">;
};

/* ----------------------------- UI Helpers (same style as your reference page.tsx) ----------------------------- */

type Tone = "indigo" | "emerald" | "amber" | "rose";

function summaryCardClass(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-200";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200";
  }
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-200";
  }
  return "border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:text-indigo-200";
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function groupFacilities(items: FacilityCatalog[]) {
  const groups: Record<FacilityCategory, FacilityCatalog[]> = { CLINICAL: [], SERVICE: [], SUPPORT: [] };
  for (const f of items) groups[f.category]?.push(f);
  for (const k of Object.keys(groups) as FacilityCategory[]) {
    groups[k] = groups[k]
      .slice()
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
  }
  return groups;
}

function toggleAllInCategory(args: {
  categoryItems: FacilityCatalog[];
  enabledIds: string[];
  setEnabledIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const activeIds = args.categoryItems.filter((f) => f.isActive).map((f) => f.id);
  const enabledSet = new Set(args.enabledIds);
  const allSelected = activeIds.length > 0 && activeIds.every((id) => enabledSet.has(id));

  args.setEnabledIds((prev) => {
    const s = new Set(prev);
    if (allSelected) for (const id of activeIds) s.delete(id);
    else for (const id of activeIds) s.add(id);
    return Array.from(s);
  });

  return !allSelected;
}

/* ----------------------------- Page ----------------------------- */

function uniqSorted(ids: string[]) {
  return Array.from(new Set(ids)).sort();
}

function sameSet(a: string[], b: string[]) {
  const aa = uniqSorted(a);
  const bb = uniqSorted(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

function scoreLabel(score: number): { label: string; tone: Tone } {
  if (score >= 90) return { label: "Go-Live Ready", tone: "emerald" };
  if (score >= 70) return { label: "Nearly Ready", tone: "indigo" };
  if (score >= 45) return { label: "Needs Setup", tone: "amber" };
  return { label: "Blocked", tone: "rose" };
}

export default function InfrastructureFacilitiesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const sp = useSearchParams();
  const qpBranchId = sp.get("branchId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>();

  const [catalog, setCatalog] = React.useState<FacilityCatalog[]>([]);
  const [enabledIds, setEnabledIds] = React.useState<string[]>([]);
  const [savedEnabledIds, setSavedEnabledIds] = React.useState<string[]>([]);

  const [q, setQ] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<FacilityCategory>("CLINICAL");
  const [showFilters, setShowFilters] = React.useState(false);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [enabledFilter, setEnabledFilter] = React.useState<"all" | "enabled" | "disabled">("all");

  const dirty = !sameSet(savedEnabledIds, enabledIds);

  const visibleCatalog = React.useMemo(
    () => (includeInactive ? catalog : catalog.filter((x) => x.isActive)),
    [catalog, includeInactive],
  );

  const groups = React.useMemo(() => groupFacilities(visibleCatalog), [visibleCatalog]);

  const filteredByCategory = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const enabledSet = new Set(enabledIds);
    const out: Record<FacilityCategory, FacilityCatalog[]> = { CLINICAL: [], SERVICE: [], SUPPORT: [] };
    (Object.keys(out) as FacilityCategory[]).forEach((cat) => {
      let list = groups[cat] || [];
      if (qq) list = list.filter((x) => x.name.toLowerCase().includes(qq) || x.code.toLowerCase().includes(qq));
      if (enabledFilter === "enabled") list = list.filter((x) => enabledSet.has(x.id));
      if (enabledFilter === "disabled") list = list.filter((x) => !enabledSet.has(x.id));
      out[cat] = list;
    });
    return out;
  }, [groups, q, enabledFilter, enabledIds]);

  const activeIds = React.useMemo(() => new Set(catalog.filter((x) => x.isActive).map((x) => x.id)), [catalog]);
  const enabledCount = enabledIds.filter((id) => activeIds.has(id)).length;
  const totalActive = activeIds.size;

  // Simple readiness score: % of active facilities enabled for this branch.
  const readinessScore = totalActive === 0 ? 0 : Math.round((enabledCount / totalActive) * 100);
  const readiness = scoreLabel(readinessScore);

  async function loadBranches() {
    const rows = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(rows);

    const stored = (effectiveBranchId || null);
    const first = rows[0]?.id;

    const next =
      (qpBranchId && rows.some((b) => b.id === qpBranchId) ? qpBranchId : undefined) ||
      (stored && rows.some((b) => b.id === stored) ? stored : undefined) ||
      first ||
      undefined;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next);
  }

  async function loadData(bid: string) {
    const [cat, enabled] = await Promise.all([
      apiFetch<FacilityCatalog[]>("/api/facilities/master?includeInactive=true"),
      apiFetch<BranchFacility[]>(`/api/branches/${encodeURIComponent(bid)}/facilities`),
    ]);

    const c = (cat || []).slice();
    setCatalog(c);

    const e = (enabled || []).map((x) => x.facilityId);
    const norm = uniqSorted(e);
    setEnabledIds(norm);
    setSavedEnabledIds(norm);
  }

  async function refresh() {
    if (!branchId) return;
    setErr(null);
    setBusy(true);
    setLoading(true);
    try {
      await loadData(branchId);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load";
      setErr(msg);
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function save() {
    if (!branchId) return;
    setBusy(true);
    try {
      const payload = uniqSorted(enabledIds.filter((id) => activeIds.has(id)));

      await apiFetch(`/api/branches/${encodeURIComponent(branchId)}/facilities`, {
        method: "PUT",
        body: JSON.stringify({ facilityIds: payload }),
      });

      setSavedEnabledIds(payload);
      setEnabledIds(payload);
      toast({ title: "Saved", description: "Facility enablement updated for branch." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Failed to save", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function toggleOne(id: string) {
    setEnabledIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  }

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBranches();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    if (isGlobalScope) setActiveBranchId(branchId || null);
void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <AppShell title="Infrastructure - Facilities">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Building2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Facilities</div>
              <div className="mt-1 text-sm text-zc-muted">
                Enable facilities per branch. Departments can only be created under enabled facilities.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refresh()}
              disabled={loading || busy || !branchId}
            >
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={() => void save()}
              disabled={loading || busy || !branchId || !dirty}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load facilities</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Enable facilities per branch. Departments can only be created under enabled facilities.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select
                value={branchId || ""}
                onValueChange={(v) => {
                  setBranchId(v);
                  if (isGlobalScope) setActiveBranchId(v || null);
}}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Enabled</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{enabledCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active in Catalog</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{totalActive}</div>
              </div>
              <div className={cn("rounded-xl border p-3", summaryCardClass(readiness.tone))}>
                <div className="text-xs font-medium">Readiness</div>
                <div className="mt-1 text-lg font-bold">{readinessScore}%</div>
                <div className="text-xs">{readiness.label}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code or name..."
                  className="pl-10"
                  disabled={!branchId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Disabled in catalog</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters((s) => !s)}
                  disabled={!branchId}
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                  <Filter className="h-4 w-4 text-zc-accent" />
                  Filters
                </div>

                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="text-xs text-zc-muted">Category</Label>
                    <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as FacilityCategory)} disabled={!branchId}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLINICAL">CLINICAL</SelectItem>
                        <SelectItem value="SERVICE">SERVICE</SelectItem>
                        <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-4">
                    <Label className="text-xs text-zc-muted">State</Label>
                    <Select
                      value={enabledFilter}
                      onValueChange={(v) => setEnabledFilter(v as "all" | "enabled" | "disabled")}
                      disabled={!branchId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="secondary">Category: {activeCategory}</Badge>
              <Badge variant="secondary">Enabled: {enabledCount}</Badge>
              {dirty ? <Badge variant="warning">Unsaved</Badge> : <Badge variant="ok">Saved</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Facility Workspace</CardTitle>
                <CardDescription>Enable or disable facilities for the selected branch.</CardDescription>
              </div>

              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as FacilityCategory)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="CLINICAL"
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Stethoscope className="h-4 w-4" />
                    CLINICAL
                  </TabsTrigger>
                  <TabsTrigger
                    value="SERVICE"
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Wrench className="h-4 w-4" />
                    SERVICE
                  </TabsTrigger>
                  <TabsTrigger
                    value="SUPPORT"
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    SUPPORT
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeCategory}>
              {(["CLINICAL", "SERVICE", "SUPPORT"] as FacilityCategory[]).map((cat) => {
                const list = filteredByCategory[cat] || [];
                return (
                  <TabsContent key={cat} value={cat} className="mt-0">
                    <div className="rounded-xl border border-zc-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[140px]">Category</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[120px]">Enabled</TableHead>
                            <TableHead className="w-[120px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={6}>
                                  <Skeleton className="h-6 w-full" />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : !branchId ? (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                  <AlertTriangle className="h-4 w-4 text-zc-warn" />
                                  Select a branch first.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : list.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                  <Layers className="h-4 w-4" />
                                  No facilities found.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            list.map((f) => {
                              const enabled = enabledIds.includes(f.id);
                              const disabled = !f.isActive;
                              return (
                                <TableRow key={f.id} className={disabled ? "opacity-70" : ""}>
                                  <TableCell className="font-mono text-xs font-semibold text-zc-text">{f.code}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold text-zc-text">{f.name}</span>
                                      <span className="text-xs text-zc-muted">Sort: {f.sortOrder ?? "--"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{f.category}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {f.isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    {enabled ? <Badge variant="ok">ENABLED</Badge> : <Badge variant="secondary">DISABLED</Badge>}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant={enabled ? "outline" : "primary"}
                                      size="sm"
                                      onClick={() => toggleOne(f.id)}
                                      disabled={disabled || busy}
                                    >
                                      {enabled ? "Disable" : "Enable"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>

                      <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-zc-muted">
                          Showing <span className="font-semibold text-zc-text">{list.length}</span> of{" "}
                          <span className="font-semibold text-zc-text">{(groups[cat] || []).length}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              toggleAllInCategory({
                                categoryItems: groups[cat] || [],
                                enabledIds,
                                setEnabledIds,
                              })
                            }
                            disabled={!branchId || busy || loading}
                          >
                            <Check className="h-4 w-4" />
                            Toggle all (active)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
