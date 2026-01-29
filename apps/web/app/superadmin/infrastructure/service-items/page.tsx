"use client";

import * as React from "react";
import {
  ClipboardList,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type ChargeMasterItemRow = {
  id: string;
  branchId?: string;
  code: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  isActive?: boolean;
};

type ServiceChargeMappingRow = {
  id: string;
  serviceItemId: string;
  chargeMasterItemId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  chargeMasterItem?: ChargeMasterItemRow | null;
};

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category: string;
  unit?: string | null;
  isOrderable: boolean;
  isActive: boolean;
  mappings?: ServiceChargeMappingRow[];
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_BRANCH_KEY = "zc.superadmin.infrastructure.branchId";

function qs(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s) return;
    usp.set(k, s);
  });
  return usp.toString();
}

function activeMapping(mappings?: ServiceChargeMappingRow[]) {
  if (!mappings || mappings.length === 0) return null;
  return mappings.find((m) => !m.effectiveTo) ?? mappings[0];
}

function dtLocalNow() {
  const now = new Date();
  // convert to local datetime-local string: YYYY-MM-DDTHH:mm
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDT(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
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

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function ServiceItemsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [qText, setQText] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const [rows, setRows] = React.useState<ServiceItemRow[]>([]);

  // Create/Edit dialog state
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceItemRow | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fUnit, setFUnit] = React.useState("");
  const [fOrderable, setFOrderable] = React.useState(true);
  const [fActive, setFActive] = React.useState(true);
  const [fChargeMasterCode, setFChargeMasterCode] = React.useState(""); // create-only

  // Mapping dialog state
  const [mapOpen, setMapOpen] = React.useState(false);
  const [mapSvc, setMapSvc] = React.useState<ServiceItemRow | null>(null);
  const [effectiveFromLocal, setEffectiveFromLocal] = React.useState(dtLocalNow());
  const [replaceOpenMapping, setReplaceOpenMapping] = React.useState(true);

  const [cmQ, setCmQ] = React.useState("");
  const [cmRows, setCmRows] = React.useState<ChargeMasterItemRow[]>([]);
  const [cmPickId, setCmPickId] = React.useState<string | undefined>(undefined);

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = typeof window !== "undefined" ? localStorage.getItem(LS_BRANCH_KEY) : null;
    const first = list[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next && typeof window !== "undefined") localStorage.setItem(LS_BRANCH_KEY, next);
  }

  async function loadServices(bid?: string) {
    const b = bid || branchId;
    if (!b) return;

    const query = qs({
      branchId: b,
      q: qText || undefined,
      includeInactive: includeInactive ? "true" : undefined, // backend checks includeInactive === "true"
    });

    const data = await apiFetch<ServiceItemRow[]>(`/api/infrastructure/services?${query}`);
    setRows(data || []);
  }

  async function searchChargeMaster(bid: string, query: string) {
    const queryString = qs({ branchId: bid, q: query || undefined });
    const data = await apiFetch<ChargeMasterItemRow[]>(`/api/infrastructure/charge-master?${queryString}`);
    setCmRows(data || []);
  }

  async function refresh() {
    setBusy(true);
    try {
      await loadServices();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBranches();
      } catch (e: any) {
        toast({ variant: "destructive", title: "Branches failed", description: e?.message || "Unknown error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    if (typeof window !== "undefined") localStorage.setItem(LS_BRANCH_KEY, branchId);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      loadServices(branchId).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qText, includeInactive, branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      if (!mapOpen) return;
      searchChargeMaster(branchId, cmQ).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmQ, branchId, mapOpen]);

  function openCreate() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFCategory("");
    setFUnit("");
    setFOrderable(true);
    setFActive(true);
    setFChargeMasterCode("");
    setEditorOpen(true);
  }

  function openEdit(r: ServiceItemRow) {
    setEditing(r);
    setFCode(r.code || "");
    setFName(r.name || "");
    setFCategory(r.category || "");
    setFUnit(r.unit || "");
    setFOrderable(!!r.isOrderable);
    setFActive(!!r.isActive);
    setFChargeMasterCode(""); // backend supports chargeMasterCode only on create
    setEditorOpen(true);
  }

  async function saveServiceItem() {
    if (!branchId) {
      toast({ variant: "destructive", title: "Select branch", description: "Branch scope is required." });
      return;
    }

    if (!fCode.trim() || !fName.trim() || !fCategory.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Code, name and category are required." });
      return;
    }

    const payload: any = {
      code: fCode.trim(),
      name: fName.trim(),
      category: fCategory.trim(),
      unit: fUnit.trim() ? fUnit.trim() : null,
      isOrderable: !!fOrderable,
      isActive: !!fActive,
    };

    if (!editing && fChargeMasterCode.trim()) payload.chargeMasterCode = fChargeMasterCode.trim();

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/services/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Service item updated" });
      } else {
        const query = qs({ branchId });
        await apiFetch(`/api/infrastructure/services?${query}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Service item created" });
      }

      setEditorOpen(false);
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: ServiceItemRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/services/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      toast({ title: r.isActive ? "Service deactivated" : "Service activated" });
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleOrderable(r: ServiceItemRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/services/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isOrderable: !r.isOrderable }),
      });
      toast({ title: r.isOrderable ? "Marked non-orderable" : "Marked orderable" });
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  function openMapping(r: ServiceItemRow) {
    setMapSvc(r);
    setMapOpen(true);
    setEffectiveFromLocal(dtLocalNow());
    setReplaceOpenMapping(true);
    setCmQ("");
    setCmRows([]);
    setCmPickId(undefined);
  }

  async function closeActiveMappingIfNeeded(serviceItemId: string, effectiveToIso: string) {
    // backend patch adds this endpoint
    try {
      await apiFetch(`/api/infrastructure/services/mapping/close`, {
        method: "POST",
        body: JSON.stringify({ serviceItemId, effectiveTo: effectiveToIso }),
      });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 404) {
        throw new Error("Missing backend endpoint: POST /infrastructure/services/mapping/close");
      }
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("no active mapping")) return;
      throw e;
    }
  }

  async function saveMapping() {
    if (!branchId || !mapSvc) return;
    if (!cmPickId) {
      toast({ variant: "destructive", title: "Select charge master item", description: "Pick a charge master item to map." });
      return;
    }

    const effectiveFromIso = toIsoFromDateTimeLocal(effectiveFromLocal);

    setBusy(true);
    try {
      if (replaceOpenMapping) {
        await closeActiveMappingIfNeeded(mapSvc.id, effectiveFromIso);
      }

      await apiFetch(`/api/infrastructure/services/mapping`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: mapSvc.id,
          chargeMasterItemId: cmPickId,
          effectiveFrom: effectiveFromIso,
          effectiveTo: null,
        }),
      });

      toast({ title: "Charge mapping saved" });
      setMapOpen(false);
      await loadServices(branchId);
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      if (String(msg).includes("Missing backend endpoint")) {
        toast({
          variant: "destructive",
          title: "Backend change needed",
          description: "Your backend blocks overlapping mappings. Apply the backend patch below (close mapping endpoint).",
        });
      } else if (String(msg).toLowerCase().includes("overlapping")) {
        toast({
          variant: "destructive",
          title: "Mapping overlaps",
          description: "Backend blocks overlap. Enable \"Replace current mapping\" (or close effectiveTo) and try again.",
        });
      } else {
        toast({ variant: "destructive", title: "Mapping failed", description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  const metrics = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const orderable = rows.filter((r) => r.isOrderable).length;
    const missingMapping = rows.filter((r) => !activeMapping(r.mappings) || !!activeMapping(r.mappings)?.effectiveTo).length;
    return { total, active, orderable, missingMapping };
  }, [rows]);

  return (
    <AppShell title="Infrastructure - Service Items">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardList className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Items</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define orderable services (Lab/Radiology/Procedures) and map them to Charge Master.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh()} disabled={busy || loading}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={!branchId || busy || loading}>
              <Plus className="h-4 w-4" />
              New Service
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Select a branch, search services, and review ordering/mapping coverage.
            </CardDescription>
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
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Orderable</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{metrics.orderable}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing mapping</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.missingMapping}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  className="pl-10"
                  placeholder="Search code/name/category..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  disabled={!branchId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(!!v)} disabled={!branchId} />
                  <span className="text-sm text-zc-muted">Include inactive</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage */}
        <Card>
          <CardHeader className="py-4">
            <div>
              <CardTitle className="text-base">Manage Service Items</CardTitle>
              <CardDescription>Update service details and charge master mapping.</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Category</TableHead>
                    <TableHead className="w-[120px]">Flags</TableHead>
                    <TableHead className="w-[240px]">Charge Mapping</TableHead>
                    <TableHead className="w-[260px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-zc-muted">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-zc-muted">
                        No service items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const m = activeMapping(r.mappings);
                      const mappedOk = !!m && !m.effectiveTo;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-zc-muted">{r.unit ? `Unit: ${r.unit}` : "-"}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.category}</TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {r.isActive ? (
                                <Badge className="w-fit bg-emerald-600 text-white">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Inactive
                                </Badge>
                              )}
                              {r.isOrderable ? (
                                <Badge className="w-fit bg-sky-600 text-white">Orderable</Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Not orderable
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {mappedOk ? (
                              <div>
                                <div className="text-xs font-mono text-zc-muted">
                                  {m?.chargeMasterItem?.code || m?.chargeMasterItemId}
                                </div>
                                <div className="text-sm">{m?.chargeMasterItem?.name || "Charge master"}</div>
                                <div className="text-xs text-zc-muted">From: {formatDT(m?.effectiveFrom)}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-amber-700 dark:text-amber-300">
                                Not mapped
                                <div className="text-xs text-zc-muted">Map to Charge Master</div>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMapping(r)}>
                                  <LinkIcon className="mr-2 h-4 w-4" />
                                  Map to charge master
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void toggleOrderable(r)}>
                                  {r.isOrderable ? (
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                  )}
                                  {r.isOrderable ? "Mark non-orderable" : "Mark orderable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void toggleActive(r)}>
                                  {r.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ----------------------------- Create/Edit ----------------------------- */}
        <Dialog open={editorOpen} onOpenChange={(v) => setEditorOpen(v)}>
          <DialogContent className={drawerClassName("max-w-[820px]")}>
            <ModalHeader
              title={editing ? "Edit Service Item" : "Create Service Item"}
              description={
                "Backend endpoints: GET/POST /infrastructure/services and PATCH /infrastructure/services/:id"
              }
              icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input className="mt-1 font-mono" value={fCode} onChange={(e) => setFCode(e.target.value)} placeholder="LAB-CBC" />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Complete Blood Count" />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  className="mt-1"
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  placeholder="LAB / RADIOLOGY / PROCEDURE"
                />
              </div>
              <div>
                <Label>Unit (optional)</Label>
                <Input className="mt-1" value={fUnit} onChange={(e) => setFUnit(e.target.value)} placeholder="Per test / Per study" />
              </div>

              <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Orderable</div>
                    <div className="text-xs text-zc-muted">Visible in ordering UIs</div>
                  </div>
                  <Switch checked={fOrderable} onCheckedChange={(v) => setFOrderable(!!v)} />
                </div>
              </div>

              <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-zc-muted">Hidden when inactive</div>
                  </div>
                  <Switch checked={fActive} onCheckedChange={(v) => setFActive(!!v)} />
                </div>
              </div>

              {!editing ? (
                <div className="md:col-span-2">
                  <Label>Charge Master Code (optional at create)</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={fChargeMasterCode}
                    onChange={(e) => setFChargeMasterCode(e.target.value)}
                    placeholder="CM-LAB-CBC"
                  />
                  <div className="mt-1 text-xs text-zc-muted">
                    If skipped, backend creates a Fix-It task: <span className="font-mono">SERVICE_CHARGE_MAPPING_MISSING</span>.
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void saveServiceItem()} disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* -------------------------------- Mapping ------------------------------ */}
        <Dialog open={mapOpen} onOpenChange={(v) => setMapOpen(v)}>
          <DialogContent className={drawerClassName("max-w-[980px]")}>
            <ModalHeader
              title="Charge Mapping"
              description={
                "Backend blocks overlapping mappings - this UI closes the current mapping first when \"Replace current mapping\" is enabled."
              }
              icon={<LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-5 space-y-3">
                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="text-sm font-semibold">Service</div>
                  <div className="mt-2">
                    <div className="font-mono text-xs text-zc-muted">{mapSvc?.code}</div>
                    <div className="text-base font-medium">{mapSvc?.name}</div>
                    <div className="text-xs text-zc-muted">
                      {mapSvc?.category}{mapSvc?.unit ? ` - ${mapSvc.unit}` : ""}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="text-sm font-semibold">Current mapping</div>
                  {mapSvc
                    ? (() => {
                        const m = activeMapping(mapSvc.mappings);
                        if (!m) {
                          return <div className="mt-2 text-sm text-zc-muted">No mappings yet.</div>;
                        }
                        return (
                          <div className="mt-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                            <div className="font-mono text-xs text-zc-muted">{m.chargeMasterItem?.code || m.chargeMasterItemId}</div>
                            <div className="text-sm font-medium">{m.chargeMasterItem?.name || "Charge master"}</div>
                            <div className="mt-1 text-xs text-zc-muted">
                              From: {formatDT(m.effectiveFrom)} - To: {formatDT(m.effectiveTo)}
                            </div>
                            {!m.effectiveTo ? (
                              <Badge className="mt-2 bg-emerald-600 text-white">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="mt-2">
                                Closed
                              </Badge>
                            )}
                          </div>
                        );
                      })()
                    : null}
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <Label>New mapping effective from</Label>
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={effectiveFromLocal}
                    onChange={(e) => setEffectiveFromLocal(e.target.value)}
                  />
                  <div className="mt-1 text-xs text-zc-muted">
                    This time is used to close the current mapping (effectiveTo) when Replace is enabled.
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Replace current mapping</div>
                      <div className="text-xs text-zc-muted">Auto-close open mapping to avoid overlap</div>
                    </div>
                    <Switch checked={replaceOpenMapping} onCheckedChange={(v) => setReplaceOpenMapping(!!v)} />
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">Pick Charge Master</div>
                      <div className="text-xs text-zc-muted">Search by code/name (branch-scoped).</div>
                    </div>
                    {cmPickId ? <Badge className="bg-zc-primary text-white">Selected</Badge> : <Badge variant="secondary">Not selected</Badge>}
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                    <Input className="pl-9" value={cmQ} onChange={(e) => setCmQ(e.target.value)} placeholder="Search charge master..." />
                  </div>

                  <div className="mt-3 max-h-[380px] overflow-auto rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[110px]">Unit</TableHead>
                          <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cmRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-zc-muted">
                              No results.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cmRows.slice(0, 80).map((cm) => {
                            const picked = cmPickId === cm.id;
                            return (
                              <TableRow key={cm.id} className={picked ? "bg-zc-panel/20" : undefined}>
                                <TableCell className="font-mono text-xs">{cm.code}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{cm.name}</div>
                                  {cm.category ? <div className="text-xs text-zc-muted">{cm.category}</div> : null}
                                </TableCell>
                                <TableCell className="text-xs text-zc-muted">{cm.unit || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant={picked ? "primary" : "outline"} onClick={() => setCmPickId(cm.id)}>
                                    {picked ? "Selected" : "Select"}
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
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setMapOpen(false)} disabled={busy}>
                Close
              </Button>
              <Button onClick={() => void saveMapping()} disabled={busy || !mapSvc || !cmPickId}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save Mapping"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
