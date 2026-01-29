"use client";

import * as React from "react";
import {
  BookCopy,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Wrench,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

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
  isOrderable?: boolean;
};

type CatalogueItemRow = {
  id: string;
  catalogueId: string;
  serviceItemId: string;
  sortOrder?: number | null;
  isVisible?: boolean | null;
  overrides?: any;
  serviceItem?: ServiceItemRow | null;
};

type ServiceCatalogueRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  status?: "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED" | string | null;
  version?: number | null;
  scope?: string | null;
  channel?: string | null;
  context?: string | null;
  payerGroup?: string | null;
  departmentId?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items?: CatalogueItemRow[];
};

type CatalogueVersionRow = {
  id: string;
  catalogueId: string;
  version: number;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
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
  } catch {
    // ignore
  }
}

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") return;
    usp.set(k, String(v));
  });
  return usp.toString();
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

function statusPill(status?: string | null) {
  const s = (status || "UNKNOWN").toUpperCase();
  if (s === "PUBLISHED") return <Badge variant="success">PUBLISHED</Badge>;
  if (s === "APPROVED") return <Badge variant="info">APPROVED</Badge>;
  if (s === "RETIRED") return <Badge variant="destructive">RETIRED</Badge>;
  if (s === "IN_REVIEW") return <Badge variant="warning">IN REVIEW</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
}

const STATUS_OPTIONS = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "RETIRED"] as const;

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ServiceCataloguePage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [catalogues, setCatalogues] = React.useState<ServiceCatalogueRow[]>([]);

  // Create/Edit dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceCatalogueRow | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [channel, setChannel] = React.useState("DEFAULT");
  const [context, setContext] = React.useState("none");
  const [payerGroup, setPayerGroup] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [status, setStatus] = React.useState<string>("DRAFT");

  // Items dialog state
  const [itemsOpen, setItemsOpen] = React.useState(false);
  const [activeCatalogue, setActiveCatalogue] = React.useState<ServiceCatalogueRow | null>(null);
  const [items, setItems] = React.useState<CatalogueItemRow[]>([]);
  const [svcQuery, setSvcQuery] = React.useState("");
  const [svcOptions, setSvcOptions] = React.useState<ServiceItemRow[]>([]);
  const [svcPickId, setSvcPickId] = React.useState<string | undefined>(undefined);
  const [itemSortOrder, setItemSortOrder] = React.useState<number>(1);
  const [itemVisible, setItemVisible] = React.useState(true);
  const [itemOverridesText, setItemOverridesText] = React.useState("");

  // Versions dialog
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<CatalogueVersionRow[]>([]);

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = readLS(LS_BRANCH);
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;
    if (next) writeLS(LS_BRANCH, next);
    setBranchId(next || "");
    return next;
  }

  async function loadCatalogues(bid?: string) {
    const b = bid || branchId;
    if (!b) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ServiceCatalogueRow[]>(
        `/api/infrastructure/service-catalogues?${buildQS({
          branchId: b,
          q: q.trim() || undefined,
          status: statusFilter,
        })}`,
      );
      setCatalogues(data || []);
    } catch (e: any) {
      const msg = e?.message || "Failed to load catalogues";
      setErr(msg);
      setCatalogues([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogueItems(id: string) {
    const c = await apiFetch<ServiceCatalogueRow>(`/api/infrastructure/service-catalogues/${id}`);
    const its = c?.items || [];
    setItems(its);
    return its;
  }

  async function searchServiceItems(bid: string, query: string) {
    const data = await apiFetch<ServiceItemRow[]>(
      `/api/infrastructure/services?${buildQS({ branchId: bid, q: query || undefined })}`,
    );
    setSvcOptions(data || []);
  }

  async function onRefresh() {
    setBusy(true);
    try {
      await loadCatalogues();
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
        toast({ title: "Branches failed", description: e?.message || "Unknown error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    void loadCatalogues(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      loadCatalogues(branchId).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId || !itemsOpen) return;
      searchServiceItems(branchId, svcQuery).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcQuery, branchId, itemsOpen]);

  function openCreate() {
    setEditing(null);
    setCode("");
    setName("");
    setDesc("");
    setChannel("DEFAULT");
    setContext("none");
    setPayerGroup("");
    setScope("");
    setStatus("DRAFT");
    setCreateOpen(true);
  }

  function openEdit(row: ServiceCatalogueRow) {
    setEditing(row);
    setCode(row.code || "");
    setName(row.name || "");
    setDesc(row.description || "");
    setChannel(row.channel || "DEFAULT");
    setContext(row.context || "none");
    setPayerGroup(row.payerGroup || "");
    setScope(row.scope || "");
    setStatus(String(row.status || "DRAFT"));
    setCreateOpen(true);
  }

  async function saveCatalogue() {
    if (!branchId) return;
    if (!code.trim() || !name.trim()) {
      toast({ title: "Code and name are required", variant: "destructive" });
      return;
    }

    const payload: any = {
      code: code.trim(),
      name: name.trim(),
      description: desc.trim() || null,
      channel: channel || null,
      context: context === "none" ? null : context,
      payerGroup: payerGroup.trim() || null,
      scope: scope.trim() || null,
      status: status || null,
    };

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/service-catalogues/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Catalogue updated" });
      } else {
        await apiFetch(`/api/infrastructure/service-catalogues?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Catalogue created" });
      }
      setCreateOpen(false);
      await loadCatalogues(branchId);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function workflow(row: ServiceCatalogueRow, action: "submit" | "approve" | "publish" | "retire") {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${row.id}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast({ title: `Workflow: ${action} done` });
      await loadCatalogues(branchId);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openItems(row: ServiceCatalogueRow) {
    setActiveCatalogue(row);
    setItemsOpen(true);
    setItems([]);
    setSvcQuery("");
    setSvcPickId(undefined);
    setItemVisible(true);
    setItemOverridesText("");

    try {
      const its = await loadCatalogueItems(row.id);
      setItemSortOrder((its?.length || 0) + 1);
    } catch (e: any) {
      toast({ title: "Failed to load items", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  async function upsertItem() {
    if (!activeCatalogue) return;
    if (!svcPickId) {
      toast({ title: "Select a service item", variant: "destructive" });
      return;
    }

    let overrides: any = undefined;
    const raw = itemOverridesText?.trim();
    if (raw) {
      try {
        overrides = JSON.parse(raw);
      } catch {
        toast({ title: "Overrides must be valid JSON", variant: "destructive" });
        return;
      }
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${activeCatalogue.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: svcPickId,
          sortOrder: itemSortOrder,
          isVisible: itemVisible,
          overrides: overrides ?? undefined,
        }),
      });
      toast({ title: "Item added/updated" });

      const its = await loadCatalogueItems(activeCatalogue.id);
      setSvcPickId(undefined);
      setItemOverridesText("");
      setItemSortOrder((its?.length || 0) + 1);
      setItemVisible(true);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(serviceItemId: string) {
    if (!activeCatalogue) return;
    if (!confirm("Remove this item from catalogue?")) return;

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${activeCatalogue.id}/items/${serviceItemId}`, {
        method: "DELETE",
      });
      toast({ title: "Item removed" });
      const its = await loadCatalogueItems(activeCatalogue.id);
      setItemSortOrder((its?.length || 0) + 1);
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openVersions(row: ServiceCatalogueRow) {
    setVersionsOpen(true);
    setVersions([]);
    try {
      const v = await apiFetch<CatalogueVersionRow[]>(`/api/infrastructure/service-catalogues/${row.id}/versions`);
      setVersions(v || []);
    } catch (e: any) {
      toast({ title: "Failed to load versions", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  const metrics = React.useMemo(() => {
    const total = catalogues.length;
    const published = catalogues.filter((c) => (c.status || "").toUpperCase() === "PUBLISHED").length;
    const inReview = catalogues.filter((c) => (c.status || "").toUpperCase() === "IN_REVIEW").length;
    const retired = catalogues.filter((c) => (c.status || "").toUpperCase() === "RETIRED").length;
    return { total, published, inReview, retired };
  }, [catalogues]);

  return (
    <AppShell title="Infrastructure - Service Catalogue">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <BookCopy className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Catalogue</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create catalogues, add services, publish versions, and control visibility/order.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={onRefresh} disabled={busy || loading}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={busy || loading}>
              <Plus className="h-4 w-4" />
              New Catalogue
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-rose-200/60 dark:border-rose-900/40">
            <CardHeader className="py-4">
              <div className="text-sm text-rose-700 dark:text-rose-200">{err}</div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Select a branch, search catalogues, and review status coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select
                value={branchId}
                onValueChange={(v) => {
                  setBranchId(v);
                  writeLS(LS_BRANCH, v);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} - {b.name}
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
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Published</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{metrics.published}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">In review</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.inReview}</div>
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
                  placeholder="Search by code or name..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-[220px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{catalogues.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage */}
        <Card>
          <CardHeader className="py-4">
            <div>
              <CardTitle className="text-base">Manage Catalogues</CardTitle>
              <CardDescription>Versions, workflows, and service list configuration.</CardDescription>
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
                    <TableHead className="w-[110px]">Version</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-zc-muted">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : catalogues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                        No catalogues yet. Create one to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    catalogues.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          {c.description ? (
                            <div className="mt-0.5 line-clamp-1 text-xs text-zc-muted">{c.description}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{statusPill(c.status ?? null)}</TableCell>
                        <TableCell className="font-mono text-xs">{c.version ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px]">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Settings2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openItems(c)}>Manage items</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openVersions(c)}>Versions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => workflow(c, "submit")}>Submit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => workflow(c, "approve")}>Approve</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => workflow(c, "publish")}>Publish</DropdownMenuItem>
                              <DropdownMenuItem className="text-zc-danger focus:text-zc-danger" onClick={() => workflow(c, "retire")}>
                                Retire
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          <DialogContent className={drawerClassName("max-w-[760px]")}>
            <ModalHeader
              title={editing ? "Edit Catalogue" : "Create Catalogue"}
              description="Catalogues group services for specific channels and contexts (OPD/IPD/ER picklists)."
              icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input className="mt-1 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAB_OPD" />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="OPD Lab Orderables" />
              </div>

              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea className="mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Used by doctors for OPD ordering..." />
              </div>

              <div>
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="DEFAULT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">DEFAULT</SelectItem>
                    <SelectItem value="QUICK_ORDER">QUICK_ORDER</SelectItem>
                    <SelectItem value="ORDER_SET">ORDER_SET</SelectItem>
                    <SelectItem value="OT_PICKLIST">OT_PICKLIST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Care Context</Label>
                <Select value={context} onValueChange={setContext}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="OPD">OPD</SelectItem>
                    <SelectItem value="IPD">IPD</SelectItem>
                    <SelectItem value="ER">ER</SelectItem>
                    <SelectItem value="OT">OT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Payer Group (optional)</Label>
                <Input className="mt-1" value={payerGroup} onChange={(e) => setPayerGroup(e.target.value)} placeholder="CASH / INSURANCE / CORPORATE / SCHEME" />
              </div>

              <div className="md:col-span-2">
                <Label>Scope (optional)</Label>
                <Input className="mt-1" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="LAB / RADIOLOGY" />
              </div>

              <div className="md:col-span-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="DRAFT" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void saveCatalogue()} disabled={busy}>
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

        {/* Items drawer */}
        <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
          <DialogContent className={drawerClassName("p-0")}>
            <div className="p-6">
              <ModalHeader
                title="Manage Catalogue Items"
                description="Add ServiceItems into this catalogue with optional overrides (JSON) and ordering/visibility."
                icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                    <div className="text-sm font-semibold">Add / Update Item</div>
                    <div className="mt-2 space-y-3">
                      <div>
                        <Label>Search ServiceItems</Label>
                        <Input
                          className="mt-1"
                          value={svcQuery}
                          onChange={(e) => setSvcQuery(e.target.value)}
                          placeholder="Type to search..."
                        />
                      </div>

                      <div>
                        <Label>Select Service</Label>
                        <Select value={svcPickId} onValueChange={setSvcPickId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select service item" />
                          </SelectTrigger>
                          <SelectContent>
                            {svcOptions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-zc-muted">No results</div>
                            ) : (
                              svcOptions.slice(0, 50).map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.code} - {s.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Sort Order</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            value={itemSortOrder}
                            onChange={(e) => setItemSortOrder(Number(e.target.value || 0))}
                          />
                        </div>

                        <div className="flex items-end justify-between rounded-lg border border-zc-border bg-zc-card p-3">
                          <div>
                            <div className="text-xs font-medium">Visible</div>
                            <div className="text-xs text-zc-muted">Shown in ordering UI</div>
                          </div>
                          <Switch checked={itemVisible} onCheckedChange={setItemVisible} />
                        </div>
                      </div>

                      <div>
                        <Label>Overrides (JSON)</Label>
                        <Textarea
                          className="mt-1 font-mono text-xs"
                          rows={5}
                          value={itemOverridesText}
                          onChange={(e) => setItemOverridesText(e.target.value)}
                          placeholder='{"tatMinutes": 120, "notes": "Fast track"}'
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button onClick={upsertItem} disabled={busy || !svcPickId}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add / Update
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead className="w-[120px]">Visible</TableHead>
                          <TableHead className="w-[120px]">Sort</TableHead>
                          <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-zc-muted">
                              No items in this catalogue yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((it) => (
                            <TableRow key={it.serviceItemId}>
                              <TableCell>
                                <div className="text-xs font-mono text-zc-muted">{it.serviceItem?.code || it.serviceItemId}</div>
                                <div className="text-sm">{it.serviceItem?.name || "Service item"}</div>
                              </TableCell>
                              <TableCell>{it.isVisible ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                              <TableCell className="text-xs font-mono">{it.sortOrder ?? "-"}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => removeItem(it.serviceItemId)} disabled={busy}>
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Versions */}
        <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
          <DialogContent className={drawerClassName("max-w-[920px]")}>
            <ModalHeader
              title="Catalogue Versions"
              description="Review published and historical versions for this catalogue."
              icon={<BookCopy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-zc-muted">
                        No versions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">v{v.version}</TableCell>
                        <TableCell>{statusPill(v.status)}</TableCell>
                        <TableCell className="text-xs">{v.effectiveFrom || "-"}</TableCell>
                        <TableCell className="text-xs">{v.effectiveTo || "-"}</TableCell>
                        <TableCell className="text-xs">{v.createdAt || "-"}</TableCell>
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
