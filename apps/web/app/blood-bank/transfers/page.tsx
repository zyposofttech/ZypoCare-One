"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Plus, RefreshCw, Eye, Send, Truck, Inbox, XCircle } from "lucide-react";

type Branch = { id: string; code?: string; name?: string; city?: string; isActive?: boolean };

type BloodUnitLite = {
  id: string;
  unitNumber: string;
  bloodGroup: string;
  componentType: string;
  status: string;
  expiryDate?: string | null;
};

type Transfer = {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: "REQUESTED" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
  requestedAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  courierName?: string | null;
  transportBoxTempC?: number | null;
  fromBranch?: Branch;
  toBranch?: Branch;
  items: Array<{ bloodUnit: BloodUnitLite }>;
  requestedByUser?: { id: string; name: string } | null;
  dispatchedByUser?: { id: string; name: string } | null;
  receivedByUser?: { id: string; name: string } | null;
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusBadge(status: Transfer["status"]) {
  const map: Record<string, { label: string; cls: string }> = {
    REQUESTED: { label: "Requested", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    DISPATCHED: { label: "Dispatched", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    RECEIVED: { label: "Received", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    CANCELLED: { label: "Cancelled", cls: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge className={cn("border", m.cls)} variant="outline">{m.label}</Badge>;
}

export default function BloodBankTransfersPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();

  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const [selected, setSelected] = useState<Transfer | null>(null);
  const [toBranchId, setToBranchId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [availableUnits, setAvailableUnits] = useState<BloodUnitLite[]>([]);
  const [unitQ, setUnitQ] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  const [courierName, setCourierName] = useState("");
  const [tempC, setTempC] = useState<string>("");

  const loadBranches = async () => {
    try {
      const data = await apiFetch<Branch[]>("/api/branches?mode=selector&onlyActive=true");
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  const loadTransfers = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const qs = new URLSearchParams({
        branchId,
        dir,
        ...(status ? { status } : {}),
        take: "100",
      });
      const data = await apiFetch<Transfer[]>(`/api/blood-bank/transfers?${qs.toString()}`);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Failed to load transfers", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUnits = async () => {
    if (!branchId) return;
    try {
      const data = await apiFetch<BloodUnitLite[]>(
        `/api/blood-bank/inventory/units?branchId=${branchId}&status=AVAILABLE&take=200`,
      );
      setAvailableUnits(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Failed to load inventory", description: e?.message ?? "", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, dir, status]);

  const otherBranches = useMemo(() => {
    return branches.filter((b) => b.id !== branchId && b.isActive !== false);
  }, [branches, branchId]);

  const filteredUnits = useMemo(() => {
    const q = unitQ.trim().toLowerCase();
    if (!q) return availableUnits;
    return availableUnits.filter((u) =>
      [u.unitNumber, u.bloodGroup, u.componentType].some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [availableUnits, unitQ]);

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCreate = async () => {
    setToBranchId("");
    setNotes("");
    setUnitQ("");
    setSelectedUnitIds([]);
    setCreateOpen(true);
    await loadAvailableUnits();
  };

  const createTransfer = async () => {
    if (!branchId) return;
    if (!toBranchId) {
      toast({ title: "Select destination branch", variant: "destructive" });
      return;
    }
    if (!selectedUnitIds.length) {
      toast({ title: "Select at least one unit", variant: "destructive" });
      return;
    }
    try {
      setBusyId("__create__");
      await apiFetch(`/api/blood-bank/transfers`, {
        method: "POST",
        body: JSON.stringify({ branchId, toBranchId, unitIds: selectedUnitIds, notes: notes || undefined }),
      });
      toast({ title: "Transfer requested" });
      setCreateOpen(false);
      await loadTransfers();
    } catch (e: any) {
      toast({ title: "Failed to create transfer", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openView = async (t: Transfer) => {
    setSelected(t);
    setViewOpen(true);
  };

  const openDispatch = (t: Transfer) => {
    setSelected(t);
    setCourierName("");
    setTempC("");
    setDispatchOpen(true);
  };

  const dispatchTransfer = async () => {
    if (!selected) return;
    try {
      setBusyId(selected.id);
      await apiFetch(`/api/blood-bank/transfers/${selected.id}/dispatch`, {
        method: "POST",
        body: JSON.stringify({
          courierName: courierName || undefined,
          transportBoxTempC: tempC ? Number(tempC) : undefined,
        }),
      });
      toast({ title: "Transfer dispatched" });
      setDispatchOpen(false);
      await loadTransfers();
    } catch (e: any) {
      toast({ title: "Failed to dispatch", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const receiveTransfer = async (t: Transfer) => {
    try {
      setBusyId(t.id);
      await apiFetch(`/api/blood-bank/transfers/${t.id}/receive`, { method: "POST" });
      toast({ title: "Transfer received" });
      await loadTransfers();
    } catch (e: any) {
      toast({ title: "Failed to receive", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const cancelTransfer = async (t: Transfer) => {
    try {
      setBusyId(t.id);
      await apiFetch(`/api/blood-bank/transfers/${t.id}/cancel`, { method: "POST" });
      toast({ title: "Transfer cancelled" });
      await loadTransfers();
    } catch (e: any) {
      toast({ title: "Failed to cancel", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Blood Bank Transfers">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
            <p className="text-muted-foreground">Inter-branch blood unit transfers with lifecycle: Requested → Dispatched → Received.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTransfers} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New transfer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Transfers
            </CardTitle>
            <CardDescription>Filtered for the active branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={dir} onValueChange={(v) => setDir(v as any)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="out">Outgoing</SelectItem>
                    <SelectItem value="in">Incoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="REQUESTED">Requested</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">From</th>
                    <th className="p-2">To</th>
                    <th className="p-2">Units</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Requested</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        {loading ? "Loading…" : "No transfers found"}
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="p-2">
                          <div className="font-medium">{t.fromBranch?.name ?? t.fromBranchId}</div>
                          <div className="text-xs text-muted-foreground">{t.fromBranch?.city ?? ""}</div>
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{t.toBranch?.name ?? t.toBranchId}</div>
                          <div className="text-xs text-muted-foreground">{t.toBranch?.city ?? ""}</div>
                        </td>
                        <td className="p-2">{t.items?.length ?? 0}</td>
                        <td className="p-2">{statusBadge(t.status)}</td>
                        <td className="p-2">{fmtDate(t.requestedAt)}</td>
                        <td className="p-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openView(t)}>
                              <Eye className="h-4 w-4" />
                            </Button>

                            {t.status === "REQUESTED" && t.fromBranchId === branchId && (
                              <>
                                <Button size="sm" onClick={() => openDispatch(t)} disabled={busyId === t.id}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Dispatch
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => cancelTransfer(t)}
                                  disabled={busyId === t.id}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </Button>
                              </>
                            )}

                            {t.status === "DISPATCHED" && t.toBranchId === branchId && (
                              <Button size="sm" onClick={() => receiveTransfer(t)} disabled={busyId === t.id}>
                                <Inbox className="mr-2 h-4 w-4" />
                                Receive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>New transfer</DialogTitle>
              <DialogDescription>Select destination branch and the units to transfer.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                <div className="space-y-2">
                  <Label>To branch</Label>
                  <Select value={toBranchId} onValueChange={setToBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name ?? b.code ?? b.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason / remarks…" />
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">Selected units</div>
                  <div className="text-muted-foreground">{selectedUnitIds.length} selected</div>
                </div>
              </div>

              <div className="space-y-3 lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium">Available inventory</div>
                    <div className="text-xs text-muted-foreground">Only AVAILABLE units (max 200 shown).</div>
                  </div>
                  <div className="w-[240px]">
                    <Input value={unitQ} onChange={(e) => setUnitQ(e.target.value)} placeholder="Search unit / group / component" />
                  </div>
                </div>
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr>
                        <th className="p-2 w-10"></th>
                        <th className="p-2 text-left">Unit</th>
                        <th className="p-2 text-left">Group</th>
                        <th className="p-2 text-left">Component</th>
                        <th className="p-2 text-left">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground">
                            No units
                          </td>
                        </tr>
                      ) : (
                        filteredUnits.map((u) => (
                          <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedUnitIds.includes(u.id)}
                                onChange={() => toggleUnit(u.id)}
                              />
                            </td>
                            <td className="p-2 font-medium">{u.unitNumber}</td>
                            <td className="p-2">{u.bloodGroup}</td>
                            <td className="p-2">{u.componentType}</td>
                            <td className="p-2">{u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Close
              </Button>
              <Button onClick={createTransfer} disabled={busyId === "__create__"}>
                <Send className="mr-2 h-4 w-4" />
                Request transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dispatch */}
        <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dispatch transfer</DialogTitle>
              <DialogDescription>Add optional dispatch details (courier, temperature).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Courier name (optional)</Label>
                <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Courier / person" />
              </div>
              <div className="space-y-2">
                <Label>Transport box temperature °C (optional)</Label>
                <Input value={tempC} onChange={(e) => setTempC(e.target.value)} placeholder="e.g., 4" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDispatchOpen(false)}>
                Cancel
              </Button>
              <Button onClick={dispatchTransfer} disabled={!selected || busyId === selected?.id}>
                <Truck className="mr-2 h-4 w-4" />
                Dispatch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Transfer details</DialogTitle>
              <DialogDescription>Review transfer lifecycle and items.</DialogDescription>
            </DialogHeader>
            {!selected ? (
              <div className="text-sm text-muted-foreground">No selection</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">ID</div>
                    <div className="font-medium">{selected.id}</div>
                  </div>
                  {statusBadge(selected.status)}
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">From</div>
                    <div className="text-sm font-medium">{selected.fromBranch?.name ?? selected.fromBranchId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">To</div>
                    <div className="text-sm font-medium">{selected.toBranch?.name ?? selected.toBranchId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Requested</div>
                    <div className="text-sm">{fmtDate(selected.requestedAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Dispatched</div>
                    <div className="text-sm">{fmtDate(selected.dispatchedAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Received</div>
                    <div className="text-sm">{fmtDate(selected.receivedAt)}</div>
                  </div>
                </div>
                {selected.notes ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">Notes</div>
                    <div className="text-muted-foreground">{selected.notes}</div>
                  </div>
                ) : null}

                <div className="rounded-md border overflow-hidden">
                  <div className="p-3 border-b font-medium">Units ({selected.items?.length ?? 0})</div>
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr>
                          <th className="p-2 text-left">Unit</th>
                          <th className="p-2 text-left">Group</th>
                          <th className="p-2 text-left">Component</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.items ?? []).map((it) => (
                          <tr key={it.bloodUnit.id} className="border-b last:border-0">
                            <td className="p-2 font-medium">{it.bloodUnit.unitNumber}</td>
                            <td className="p-2">{it.bloodUnit.bloodGroup}</td>
                            <td className="p-2">{it.bloodUnit.componentType}</td>
                            <td className="p-2">{it.bloodUnit.status}</td>
                            <td className="p-2">{it.bloodUnit.expiryDate ? new Date(it.bloodUnit.expiryDate).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
