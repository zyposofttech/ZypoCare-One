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

import { ClipboardList, Plus, RefreshCw, Search, Settings2, Trash2, Wrench } from "lucide-react";

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

type OrderSetRow = {
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

type OrderSetItemRow = {
  id: string;
  orderSetId: string;
  serviceItemId: string;
  quantity?: number | null;
  sortOrder?: number | null;
  serviceItem?: ServiceItemRow | null;
};

type OrderSetVersionRow = {
  id: string;
  orderSetId: string;
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

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
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

function ModalHeader({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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

export default function OrderSetsPage() {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [orderSets, setOrderSets] = React.useState<OrderSetRow[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<OrderSetRow | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  // Items drawer
  const [itemsOpen, setItemsOpen] = React.useState(false);
  const [activeSet, setActiveSet] = React.useState<OrderSetRow | null>(null);
  const [items, setItems] = React.useState<OrderSetItemRow[]>([]);

  const [svcQuery, setSvcQuery] = React.useState("");
  const [svcOptions, setSvcOptions] = React.useState<ServiceItemRow[]>([]);
  const [svcPickId, setSvcPickId] = React.useState<string | undefined>(undefined);
  const [qty, setQty] = React.useState<number>(1);
  const [sortOrder, setSortOrder] = React.useState<number>(1);

  // Versions
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<OrderSetVersionRow[]>([]);

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = readLS(LS_BRANCH);
    const first = list[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_BRANCH, next);
  }

  async function loadOrderSets(bid?: string) {
    const b = bid || branchId;
    if (!b) return;

    const qs = buildQS({ branchId: b, q, includeInactive: includeInactive ? "1" : undefined });
    const data = await apiFetch<OrderSetRow[]>(`/api/infrastructure/order-sets?${qs}`);
    setOrderSets(data || []);
  }

  async function loadItems(setId: string) {
    try {
      const os = await apiFetch<any>(`/api/infrastructure/order-sets/${setId}`);
      const list: OrderSetItemRow[] = os?.items || os?.OrderSetItem || [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      const list = await apiFetch<OrderSetItemRow[]>(`/api/infrastructure/order-sets/${setId}/items`);
      setItems(list || []);
    }
  }

  async function searchServices(bid: string, query: string) {
    const qs = buildQS({ branchId: bid, q: query || undefined, includeInactive: "1" });
    const rows = await apiFetch<ServiceItemRow[]>(`/api/infrastructure/services?${qs}`);
    setSvcOptions(rows || []);
  }

  async function onRefresh() {
    setErr(null);
    setBusy(true);
    try {
      await loadOrderSets();
    } catch (e: any) {
      setErr(e?.message || "Failed to load order sets");
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
      loadOrderSets(branchId).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, includeInactive]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      searchServices(branchId, svcQuery).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [svcQuery, branchId]);

  function openCreate() {
    setEditing(null);
    setCode("");
    setName("");
    setDesc("");
    setCreateOpen(true);
  }

  function openEdit(row: OrderSetRow) {
    setEditing(row);
    setCode(row.code || "");
    setName(row.name || "");
    setDesc(row.description || "");
    setCreateOpen(true);
  }

  async function saveOrderSet() {
    if (!branchId) return;
    if (!code.trim() || !name.trim()) {
      toast({ title: "Code and name are required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/order-sets/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            description: desc?.trim() ? desc.trim() : null,
          }),
        });
        toast({ title: "Order set updated" });
      } else {
        await apiFetch(`/api/infrastructure/order-sets`, {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: code.trim(),
            name: name.trim(),
            description: desc?.trim() ? desc.trim() : null,
          }),
        });
        toast({ title: "Order set created" });
      }

      setCreateOpen(false);
      await loadOrderSets(branchId);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: OrderSetRow, next: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });
      toast({ title: next ? "Activated" : "Deactivated" });
      await loadOrderSets(branchId);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function workflow(row: OrderSetRow, action: "submit" | "approve" | "publish" | "retire") {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${row.id}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast({ title: `Workflow: ${action} done` });
      await loadOrderSets(branchId);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openItems(row: OrderSetRow) {
    setActiveSet(row);
    setItemsOpen(true);
    setItems([]);
    setSvcQuery("");
    setSvcPickId(undefined);
    setQty(1);
    setSortOrder((items?.length || 0) + 1);

    try {
      await loadItems(row.id);
    } catch (e: any) {
      toast({ title: "Failed to load items", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  async function upsertItem() {
    if (!activeSet) return;
    if (!svcPickId) {
      toast({ title: "Select a service item", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${activeSet.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: svcPickId,
          quantity: qty,
          sortOrder,
        }),
      });
      toast({ title: "Item added/updated" });
      await loadItems(activeSet.id);

      // reset quick add
      setSvcPickId(undefined);
      setQty(1);
      setSortOrder((items?.length || 0) + 1);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(serviceItemId: string) {
    if (!activeSet) return;
    if (!confirm("Remove this item from order set?")) return;

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${activeSet.id}/items`, {
        method: "DELETE",
        body: JSON.stringify({ serviceItemId }),
      });
      toast({ title: "Item removed" });
      await loadItems(activeSet.id);
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openVersions(row: OrderSetRow) {
    setVersionsOpen(true);
    setVersions([]);
    try {
      const v = await apiFetch<OrderSetVersionRow[]>(`/api/infrastructure/order-sets/${row.id}/versions`);
      setVersions(v || []);
    } catch (e: any) {
      toast({ title: "Failed to load versions", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  /* --------------------------------- Render -------------------------------- */

  return (
    <AppShell title="Order Sets">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200/60 bg-indigo-50/60 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/20 dark:text-indigo-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Order Sets</CardTitle>
                <CardDescription className="mt-1">
                  Configure protocol-driven order bundles and quick picklists.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onRefresh} disabled={busy || loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={openCreate} disabled={busy || loading}>
                <Plus className="mr-2 h-4 w-4" />
                New Order Set
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {err ? (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/70 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <Label>Branch</Label>
                <Select
                  value={branchId}
                  onValueChange={(v) => {
                    setBranchId(v);
                    writeLS(LS_BRANCH, v);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6">
                <Label>Search</Label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zc-muted" />
                    <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code/name…" />
                  </div>
                  <Button variant="outline" onClick={() => setQ("")}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="md:col-span-3">
                <Label>Include inactive</Label>
                <div className="mt-2 flex items-center justify-between rounded-xl border p-3">
                  <div className="text-sm text-zc-muted">Show inactive</div>
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                </div>
              </div>
            </div>

            <Separator />

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[160px]">Status</TableHead>
                      <TableHead className="w-[130px]">Active</TableHead>
                      <TableHead className="w-[380px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderSets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                          No order sets yet. Create one to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderSets.map((os) => (
                        <TableRow key={os.id}>
                          <TableCell className="font-mono text-xs">{os.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{os.name}</div>
                            {os.description ? (
                              <div className="mt-0.5 line-clamp-1 text-xs text-zc-muted">{os.description}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>{statusPill(os.lifecycleStatus, os.isActive)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={os.isActive !== false} onCheckedChange={(v) => toggleActive(os, v)} disabled={busy} />
                              <span className="text-xs text-zc-muted">{os.isActive === false ? "No" : "Yes"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(os)} disabled={busy}>
                                <Settings2 className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openItems(os)} disabled={busy}>
                                Manage items
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openVersions(os)} disabled={busy}>
                                Versions
                              </Button>

                              <Button size="sm" variant="outline" onClick={() => workflow(os, "submit")} disabled={busy}>
                                Submit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => workflow(os, "approve")} disabled={busy}>
                                Approve
                              </Button>
                              <Button size="sm" onClick={() => workflow(os, "publish")} disabled={busy}>
                                Publish
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => workflow(os, "retire")} disabled={busy}>
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
            )}
          </CardContent>
        </Card>

        {/* Create / Edit */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-[720px]">
            <ModalHeader title={editing ? "Edit Order Set" : "Create Order Set"} description="Order sets provide quick ordering sets for specific contexts (ER, OPD, Protocols)." />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input className="mt-1 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ER_CHEST_PAIN" />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="ER Chest Pain Protocol" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea className="mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ECG + Troponin + CXR + IV line…" />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={saveOrderSet} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Items Drawer */}
        <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
          <DialogContent className={drawerClassName()}>
            <div className="p-4">
              <ModalHeader title={`Manage Items — ${activeSet?.code ?? ""}`} description="Add/remove services with quantity and order." />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">Add item</div>

                    <div className="mt-4">
                      <Label>Search service</Label>
                      <div className="relative mt-1">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zc-muted" />
                        <Input className="pl-8" value={svcQuery} onChange={(e) => setSvcQuery(e.target.value)} placeholder="Search service items…" />
                      </div>
                      <Select value={svcPickId} onValueChange={setSvcPickId}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Pick a service item" />
                        </SelectTrigger>
                        <SelectContent>
                          {svcOptions.slice(0, 80).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.code} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <Label>Quantity</Label>
                        <Input className="mt-1" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value || "1"))} />
                      </div>
                      <div>
                        <Label>Sort order</Label>
                        <Input className="mt-1" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value || "1"))} />
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
                  <div className="rounded-xl border">
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-semibold">Items</div>
                        <div className="text-xs text-zc-muted">Total: {items.length}</div>
                      </div>
                      <Badge variant="secondary" className="gap-2">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {activeSet?.code}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="max-h-[70vh] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead className="w-[90px]">Qty</TableHead>
                            <TableHead className="w-[90px]">Order</TableHead>
                            <TableHead className="w-[70px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                                No items yet. Add one from the left.
                              </TableCell>
                            </TableRow>
                          ) : (
                            items
                              .slice()
                              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                              .map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell>
                                    <div className="font-mono text-xs text-zc-muted">{it.serviceItem?.code || it.serviceItemId}</div>
                                    <div className="font-medium">{it.serviceItem?.name || "Service item"}</div>
                                  </TableCell>
                                  <TableCell className="text-sm">{it.quantity ?? 1}</TableCell>
                                  <TableCell className="text-sm">{it.sortOrder ?? ""}</TableCell>
                                  <TableCell className="text-right">
                                    <Button size="icon" variant="ghost" onClick={() => removeItem(it.serviceItemId)} disabled={busy} title="Remove">
                                      <Trash2 className="h-4 w-4 text-rose-600" />
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

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setItemsOpen(false)} disabled={busy}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Versions */}
        <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
          <DialogContent className="max-w-[820px]">
            <ModalHeader title="Order Set Versions" description="Versions are created on publish for auditability." />
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
