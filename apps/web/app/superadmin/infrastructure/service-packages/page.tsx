"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { Package, Plus, RefreshCw, Search, Settings2, Trash2, Wrench } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category?: string | null;
  isActive?: boolean;
};

type DiagnosticItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive?: boolean;
};

type ServicePackageRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  lifecycleStatus?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type PackageComponentRow = {
  id: string;
  packageId: string;
  componentType?: "SERVICE_ITEM" | "DIAGNOSTIC_ITEM" | string;
  serviceItemId?: string | null;
  diagnosticItemId?: string | null;
  quantity?: number | null;
  included?: boolean | null;
  condition?: any; // JSON
  serviceItem?: ServiceItemRow | null;
  diagnosticItem?: DiagnosticItemRow | null;
};

type PackageVersionRow = {
  id: string;
  packageId: string;
  versionNo?: number;
  note?: string | null;
  createdAt?: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_BRANCH = "zc.superadmin.infrastructure.branchId";

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
  } catch {}
}

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function summaryBadgeClass(tone: "sky" | "emerald" | "rose" | "amber") {
  if (tone === "sky") return "border-sky-200 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/10 dark:text-sky-200";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-200";
  if (tone === "amber") return "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200";
  return "border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-200";
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
  icon,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            {icon}
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <Separator className="my-4" />
    </>
  );
}

function statusPill(status?: string | null, active?: boolean) {
  const s = (status || "UNKNOWN").toUpperCase();
  const a = active !== false;
  const tone =
    s === "PUBLISHED" ? "emerald" : s === "APPROVED" ? "sky" : s === "RETIRED" ? "rose" : "amber";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs", summaryBadgeClass(tone))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", a ? "bg-emerald-500" : "bg-zinc-400")} />
      {s}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ServicePackagesPage() {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [packages, setPackages] = React.useState<ServicePackageRow[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServicePackageRow | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  // Components drawer
  const [compOpen, setCompOpen] = React.useState(false);
  const [activePkg, setActivePkg] = React.useState<ServicePackageRow | null>(null);
  const [components, setComponents] = React.useState<PackageComponentRow[]>([]);

  const [compType, setCompType] = React.useState<"SERVICE_ITEM" | "DIAGNOSTIC_ITEM">("SERVICE_ITEM");
  const [svcQuery, setSvcQuery] = React.useState("");
  const [svcOptions, setSvcOptions] = React.useState<ServiceItemRow[]>([]);
  const [svcPickId, setSvcPickId] = React.useState<string | undefined>(undefined);

  const [diagQuery, setDiagQuery] = React.useState("");
  const [diagOptions, setDiagOptions] = React.useState<DiagnosticItemRow[]>([]);
  const [diagPickId, setDiagPickId] = React.useState<string | undefined>(undefined);

  const [qty, setQty] = React.useState<number>(1);
  const [included, setIncluded] = React.useState(true);
  const [conditionText, setConditionText] = React.useState("");

  // Versions
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<PackageVersionRow[]>([]);

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = readLS(LS_BRANCH);
    const first = list[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_BRANCH, next);
  }

  async function loadPackages(bid?: string) {
    const b = bid || branchId;
    if (!b) return;

    const qs = buildQS({ branchId: b, q, includeInactive: includeInactive ? "1" : undefined });
    const data = await apiFetch<ServicePackageRow[]>(`/api/infrastructure/service-packages?${qs}`);
    setPackages(data || []);
  }

  async function loadComponents(pkgId: string) {
    try {
      const p = await apiFetch<any>(`/api/infrastructure/service-packages/${pkgId}`);
      const list: PackageComponentRow[] = p?.components || p?.ServicePackageComponent || [];
      setComponents(Array.isArray(list) ? list : []);
    } catch {
      const list = await apiFetch<PackageComponentRow[]>(`/api/infrastructure/service-packages/${pkgId}/components`);
      setComponents(list || []);
    }
  }

  async function searchServices(bid: string, query: string) {
    const qs = buildQS({ branchId: bid, q: query || undefined, includeInactive: "1" });
    const rows = await apiFetch<ServiceItemRow[]>(`/api/infrastructure/services?${qs}`);
    setSvcOptions(rows || []);
  }

  async function searchDiagnostics(bid: string, query: string) {
    // If you do not have this endpoint, you can remove DIAGNOSTIC_ITEM from UI.
    const qs = buildQS({ branchId: bid, q: query || undefined, includeInactive: "1" });
    const rows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostic-items?${qs}`);
    setDiagOptions(rows || []);
  }

  async function onRefresh() {
    setErr(null);
    setBusy(true);
    try {
      await loadPackages();
    } catch (e: any) {
      setErr(e?.message || "Failed to load packages");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        await loadBranches();
      } catch (e: any) {
        setErr(e?.message || "Failed to load branches");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    writeLS(LS_BRANCH, branchId);
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      loadPackages(branchId).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, includeInactive]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      if (compType === "SERVICE_ITEM") searchServices(branchId, svcQuery).catch(() => {});
      else searchDiagnostics(branchId, diagQuery).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [svcQuery, diagQuery, compType, branchId]);

  function openCreate() {
    setEditing(null);
    setCode("");
    setName("");
    setDesc("");
    setCreateOpen(true);
  }

  function openEdit(row: ServicePackageRow) {
    setEditing(row);
    setCode(row.code || "");
    setName(row.name || "");
    setDesc(row.description || "");
    setCreateOpen(true);
  }

  async function savePackage() {
    if (!branchId) return;
    if (!code.trim() || !name.trim()) {
      toast({ title: "Code and name are required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/service-packages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            description: desc?.trim() ? desc.trim() : null,
          }),
        });
        toast({ title: "Package updated" });
      } else {
        await apiFetch("/api/infrastructure/service-packages", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: code.trim(),
            name: name.trim(),
            description: desc?.trim() ? desc.trim() : null,
          }),
        });
        toast({ title: "Package created" });
      }

      setCreateOpen(false);
      await loadPackages(branchId);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: ServicePackageRow, next: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });
      toast({ title: next ? "Activated" : "Deactivated" });
      await loadPackages(branchId);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function workflow(row: ServicePackageRow, action: "submit" | "approve" | "publish" | "retire") {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${row.id}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast({ title: `Workflow: ${action} done` });
      await loadPackages(branchId);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openComponents(row: ServicePackageRow) {
    setActivePkg(row);
    setCompOpen(true);
    setComponents([]);
    setCompType("SERVICE_ITEM");
    setSvcQuery("");
    setSvcPickId(undefined);
    setDiagQuery("");
    setDiagPickId(undefined);
    setQty(1);
    setIncluded(true);
    setConditionText("");

    try {
      await loadComponents(row.id);
    } catch (e: any) {
      toast({ title: "Failed to load components", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  async function upsertComponent() {
    if (!activePkg) return;

    if (compType === "SERVICE_ITEM" && !svcPickId) {
      toast({ title: "Pick a service item", variant: "destructive" });
      return;
    }
    if (compType === "DIAGNOSTIC_ITEM" && !diagPickId) {
      toast({ title: "Pick a diagnostic item", variant: "destructive" });
      return;
    }

    let condition: any = undefined;
    const raw = conditionText?.trim();
    if (raw) {
      try {
        condition = JSON.parse(raw);
      } catch {
        toast({ title: "Condition must be valid JSON", variant: "destructive" });
        return;
      }
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${activePkg.id}/components`, {
        method: "POST",
        body: JSON.stringify({
          componentType: compType,
          serviceItemId: compType === "SERVICE_ITEM" ? svcPickId : null,
          diagnosticItemId: compType === "DIAGNOSTIC_ITEM" ? diagPickId : null,
          quantity: qty,
          included,
          condition: condition ?? undefined,
        }),
      });
      toast({ title: "Component added/updated" });
      await loadComponents(activePkg.id);

      // reset quick add
      setSvcPickId(undefined);
      setDiagPickId(undefined);
      setQty(1);
      setIncluded(true);
      setConditionText("");
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeComponent(compId: string) {
    if (!activePkg) return;
    if (!confirm("Remove this component?")) return;

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${activePkg.id}/components`, {
        method: "DELETE",
        body: JSON.stringify({ id: compId }),
      });
      toast({ title: "Component removed" });
      await loadComponents(activePkg.id);
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openVersions(row: ServicePackageRow) {
    setVersionsOpen(true);
    setVersions([]);
    try {
      const v = await apiFetch<PackageVersionRow[]>(`/api/infrastructure/service-packages/${row.id}/versions`);
      setVersions(v || []);
    } catch (e: any) {
      toast({ title: "Failed to load versions", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  const metrics = React.useMemo(() => {
    const total = packages.length;
    const active = packages.filter((p) => p.isActive !== false).length;
    const published = packages.filter((p) => (p.lifecycleStatus || "").toUpperCase() === "PUBLISHED").length;
    const retired = packages.filter((p) => (p.lifecycleStatus || "").toUpperCase() === "RETIRED").length;
    return { total, active, published, retired };
  }, [packages]);

  const mustSelectBranch = !branchId;

  return (
    <AppShell title="Infrastructure - Service Packages">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Package className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Packages</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define bundles and manage included components with publishable versions.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={onRefresh} disabled={busy || loading}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch || busy || loading}>
              <Plus className="h-4 w-4" />
              New Package
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">Select a branch, search packages, and review status coverage.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={(v) => setBranchId(v)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code}){b.city ? ` - ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{metrics.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{metrics.active}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Published</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{metrics.published}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Retired</div>
                <div className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{metrics.retired}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  className="pl-10"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code/name..."
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{packages.length}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(!!v)} disabled={mustSelectBranch} />
                  <span className="text-sm text-zc-muted">Include inactive</span>
                </div>
              </div>
            </div>

            {err ? (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/60 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                {err}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Manage */}
        <Card>
          <CardHeader className="py-4">
            <div>
              <CardTitle className="text-base">Manage Service Packages</CardTitle>
              <CardDescription>Define bundles and manage included components with publishable versions.</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[130px]">Active</TableHead>
                    <TableHead className="w-[360px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-zc-muted">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : packages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                        No packages yet. Create one to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packages.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.description ? <div className="mt-0.5 line-clamp-1 text-xs text-zc-muted">{p.description}</div> : null}
                        </TableCell>
                        <TableCell>{statusPill(p.lifecycleStatus, p.isActive)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={p.isActive !== false} onCheckedChange={(v) => toggleActive(p, v)} disabled={busy} />
                            <span className="text-xs text-zc-muted">{p.isActive === false ? "No" : "Yes"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)} disabled={busy}>
                              <Settings2 className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openComponents(p)} disabled={busy}>
                              Manage components
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openVersions(p)} disabled={busy}>
                              Versions
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => workflow(p, "submit")} disabled={busy}>
                              Submit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => workflow(p, "approve")} disabled={busy}>
                              Approve
                            </Button>
                            <Button size="sm" onClick={() => workflow(p, "publish")} disabled={busy}>
                              Publish
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => workflow(p, "retire")} disabled={busy}>
                              Retire
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create / Edit */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className={drawerClassName("max-w-[820px]")}>
            <ModalHeader
              title={editing ? "Edit Package" : "Create Package"}
              description="Packages bundle multiple services into one orderable/chargeable definition."
              icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input className="mt-1 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PKG_DELIVERY" />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Delivery Package" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea className="mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Includes OT charges, nursing, lab panels..." />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={savePackage} disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Components Drawer */}
        <Dialog open={compOpen} onOpenChange={setCompOpen}>
          <DialogContent className={drawerClassName()}>
            <div className="p-4">
              <ModalHeader
                title={`Manage Components - ${activePkg?.code ?? ""}`}
                description="Add service items / diagnostic items, quantities, inclusion rules and conditions."
                icon={<Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">Add component</div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Use JSON condition for rules (age {">"} 60 add, etc.)
                    </div>

                    <div className="mt-4">
                      <Label>Component type</Label>
                      <Select value={compType} onValueChange={(v) => setCompType(v as any)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SERVICE_ITEM">Service item</SelectItem>
                          <SelectItem value="DIAGNOSTIC_ITEM">Diagnostic item</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {compType === "SERVICE_ITEM" ? (
                      <>
                        <div className="mt-4">
                          <Label>Search service</Label>
                          <div className="relative mt-1">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zc-muted" />
                            <Input className="pl-8" value={svcQuery} onChange={(e) => setSvcQuery(e.target.value)} placeholder="Search service items..." />
                          </div>
                          <Select value={svcPickId} onValueChange={setSvcPickId}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Pick a service item" />
                            </SelectTrigger>
                            <SelectContent>
                              {svcOptions.slice(0, 80).map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.code} - {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-4">
                          <Label>Search diagnostic item</Label>
                          <div className="relative mt-1">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zc-muted" />
                            <Input className="pl-8" value={diagQuery} onChange={(e) => setDiagQuery(e.target.value)} placeholder="Search diagnostic items..." />
                          </div>
                          <Select value={diagPickId} onValueChange={setDiagPickId}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Pick a diagnostic item" />
                            </SelectTrigger>
                            <SelectContent>
                              {diagOptions.slice(0, 80).map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.code} - {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <Label>Quantity</Label>
                        <Input className="mt-1" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value || "1"))} />
                      </div>
                      <div className="flex items-end justify-between rounded-xl border p-3">
                        <div>
                          <div className="text-sm font-medium">Included</div>
                          <div className="text-xs text-zc-muted">Included by default</div>
                        </div>
                        <Switch checked={included} onCheckedChange={setIncluded} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Condition (JSON)</Label>
                        <Textarea
                          className="mt-1 font-mono text-xs"
                          value={conditionText}
                          onChange={(e) => setConditionText(e.target.value)}
                          placeholder='{"if": {"ageGte": 60}, "then": {"include": true}}'
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button onClick={upsertComponent} disabled={busy || (compType === "SERVICE_ITEM" ? !svcPickId : !diagPickId)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add / Update
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="rounded-xl border">
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-semibold">Components</div>
                        <div className="text-xs text-zc-muted">Total: {components.length}</div>
                      </div>
                      <Badge variant="secondary" className="gap-2">
                        <Package className="h-3.5 w-3.5" />
                        {activePkg?.code}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="max-h-[70vh] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-[90px]">Qty</TableHead>
                            <TableHead className="w-[110px]">Included</TableHead>
                            <TableHead className="w-[70px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {components.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                                No components yet. Add one from the left.
                              </TableCell>
                            </TableRow>
                          ) : (
                            components.map((c) => {
                              const label =
                                c.componentType === "DIAGNOSTIC_ITEM"
                                  ? `${c.diagnosticItem?.code || c.diagnosticItemId} - ${c.diagnosticItem?.name || "Diagnostic"}`
                                  : `${c.serviceItem?.code || c.serviceItemId} - ${c.serviceItem?.name || "Service"}`;

                              return (
                                <TableRow key={c.id}>
                                  <TableCell>
                                    <div className="text-xs font-mono text-zc-muted">{c.componentType}</div>
                                    <div className="font-medium">{label}</div>
                                  </TableCell>
                                  <TableCell className="text-sm">{c.quantity ?? 1}</TableCell>
                                  <TableCell>
                                    <Badge variant={c.included === false ? "secondary" : "default"}>
                                      {c.included === false ? "No" : "Yes"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button size="icon" variant="ghost" onClick={() => removeComponent(c.id)} disabled={busy} title="Remove">
                                      <Trash2 className="h-4 w-4 text-rose-600" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-indigo-200/70 bg-indigo-50/70 p-3 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/10 dark:text-indigo-200">
                    If your backend does not expose <span className="font-mono">/api/infrastructure/diagnostic-items</span>, keep components as Service Items only.
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCompOpen(false)} disabled={busy}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Versions */}
        <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
          <DialogContent className={drawerClassName("max-w-[820px]")}>
            <ModalHeader
              title="Package Versions"
              description="Versions are created on publish for auditability."
              icon={<Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Version</TableHead>
                    <TableHead>Created at</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-zc-muted">
                        No versions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.versionNo ?? "-"}</TableCell>
                        <TableCell className="text-sm">{v.createdAt ? new Date(v.createdAt).toLocaleString() : "-"}</TableCell>
                        <TableCell className="text-sm">{v.note ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setVersionsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
