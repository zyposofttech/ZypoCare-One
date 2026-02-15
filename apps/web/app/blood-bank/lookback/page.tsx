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
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/utils";
import { Search, Plus, RefreshCw, Eye, RefreshCcw, CheckCircle2 } from "lucide-react";

type Donor = { id: string; donorNumber?: string; name?: string; bloodGroup?: string; status?: string };

type LookbackCase = {
  id: string;
  branchId: string;
  caseNumber: string;
  triggerType: "TTI_REACTIVE" | "DONOR_SELF_REPORT" | "RECIPIENT_REACTION" | "OTHER";
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  donorId: string;
  donor?: Donor;
  computedData?: any;
  openedByUser?: { id: string; name: string } | null;
  closedByUser?: { id: string; name: string } | null;
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusBadge(status: LookbackCase["status"]) {
  return status === "OPEN" ? (
    <Badge className={cn("border bg-amber-50 text-amber-700 border-amber-200")} variant="outline">
      Open
    </Badge>
  ) : (
    <Badge className={cn("border bg-emerald-50 text-emerald-700 border-emerald-200")} variant="outline">
      Closed
    </Badge>
  );
}

const TRIGGERS = [
  { value: "TTI_REACTIVE", label: "TTI Reactive" },
  { value: "DONOR_SELF_REPORT", label: "Donor Self-Report" },
  { value: "RECIPIENT_REACTION", label: "Recipient Reaction" },
  { value: "OTHER", label: "Other" },
] as const;

export default function BloodBankLookbackPage() {
  const { toast } = useToast();
  const { selectedBranch } = useBranchContext();
  const branchId = selectedBranch?.id;

  const [cases, setCases] = useState<LookbackCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<LookbackCase | null>(null);

  const [triggerType, setTriggerType] = useState<(typeof TRIGGERS)[number]["value"]>("TTI_REACTIVE");
  const [donorQ, setDonorQ] = useState("");
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [donorId, setDonorId] = useState("");
  const [notes, setNotes] = useState("");

  const loadCases = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const data = await apiFetch<LookbackCase[]>(`/api/blood-bank/lookback?branchId=${branchId}&take=100`);
      setCases(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Failed to load lookback cases", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const searchDonors = async (q: string) => {
    if (!branchId) return;
    const s = q.trim();
    if (!s) {
      setDonorOptions([]);
      return;
    }
    try {
      const data = await apiFetch<Donor[]>(`/api/blood-bank/donors?branchId=${branchId}&q=${encodeURIComponent(s)}&take=20`);
      setDonorOptions(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  const openCreate = () => {
    setTriggerType("TTI_REACTIVE");
    setDonorQ("");
    setDonorOptions([]);
    setDonorId("");
    setNotes("");
    setCreateOpen(true);
  };

  const createCase = async () => {
    if (!branchId) return;
    if (!donorId) {
      toast({ title: "Select a donor", variant: "destructive" });
      return;
    }
    try {
      setBusyId("__create__");
      const created = await apiFetch<LookbackCase>(`/api/blood-bank/lookback`, {
        method: "POST",
        body: JSON.stringify({ branchId, triggerType, donorId, notes: notes || undefined }),
      });
      toast({ title: "Lookback case opened", description: created.caseNumber });
      setCreateOpen(false);
      await loadCases();
    } catch (e: any) {
      toast({ title: "Failed to open case", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openView = async (id: string) => {
    try {
      setBusyId(id);
      const c = await apiFetch<LookbackCase>(`/api/blood-bank/lookback/${id}`);
      setSelected(c);
      setViewOpen(true);
    } catch (e: any) {
      toast({ title: "Failed to load case", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const refreshCase = async (id: string) => {
    try {
      setBusyId(id);
      await apiFetch(`/api/blood-bank/lookback/${id}/refresh`, { method: "POST" });
      toast({ title: "Case refreshed" });
      await loadCases();
      if (selected?.id === id) {
        const c = await apiFetch<LookbackCase>(`/api/blood-bank/lookback/${id}`);
        setSelected(c);
      }
    } catch (e: any) {
      toast({ title: "Failed to refresh", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const closeCase = async (id: string) => {
    try {
      setBusyId(id);
      await apiFetch(`/api/blood-bank/lookback/${id}/close`, { method: "POST" });
      toast({ title: "Case closed" });
      await loadCases();
      if (selected?.id === id) {
        const c = await apiFetch<LookbackCase>(`/api/blood-bank/lookback/${id}`);
        setSelected(c);
      }
    } catch (e: any) {
      toast({ title: "Failed to close", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const dataSummary = useMemo(() => {
    const s = selected?.computedData?.summary;
    if (!s) return null;
    return {
      totalUnits: s.totalUnits ?? 0,
      issuedCount: s.issuedCount ?? 0,
      transfusedCount: s.transfusedCount ?? 0,
      reactionCount: s.reactionCount ?? 0,
    };
  }, [selected]);

  const impactedUnits = useMemo(() => {
    const arr = selected?.computedData?.impactedUnits;
    return Array.isArray(arr) ? arr : [];
  }, [selected]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lookback</h1>
            <p className="text-muted-foreground">Donor lookback workflow to quarantine and trace potentially affected units.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCases} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Open case
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cases</CardTitle>
            <CardDescription>All lookback cases for the active branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Case</th>
                    <th className="p-2">Donor</th>
                    <th className="p-2">Trigger</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Opened</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        {loading ? "Loading…" : "No cases"}
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-2">
                          <div className="font-medium">{c.caseNumber}</div>
                          <div className="text-xs text-muted-foreground">{c.id.slice(0, 8)}…</div>
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{c.donor?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.donor?.donorNumber ?? ""} {c.donor?.bloodGroup ? `• ${c.donor.bloodGroup}` : ""}
                          </div>
                        </td>
                        <td className="p-2">{TRIGGERS.find((t) => t.value === c.triggerType)?.label ?? c.triggerType}</td>
                        <td className="p-2">{statusBadge(c.status)}</td>
                        <td className="p-2">{fmtDate(c.openedAt)}</td>
                        <td className="p-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openView(c.id)} disabled={busyId === c.id}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => refreshCase(c.id)}
                              disabled={busyId === c.id}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                            {c.status === "OPEN" && (
                              <Button size="sm" onClick={() => closeCase(c.id)} disabled={busyId === c.id}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Close
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Open lookback case</DialogTitle>
              <DialogDescription>When opened, available units from this donor will be quarantined automatically.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger type</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Donor</Label>
                <div className="flex gap-2">
                  <Input
                    value={donorQ}
                    onChange={(e) => setDonorQ(e.target.value)}
                    placeholder="Search donor (name / donor number)"
                  />
                  <Button variant="outline" onClick={() => searchDonors(donorQ)}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={donorId} onValueChange={setDonorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {donorOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {(d.name ?? "Unnamed") + (d.donorNumber ? ` • ${d.donorNumber}` : "") + (d.bloodGroup ? ` • ${d.bloodGroup}` : "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context / remarks…" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createCase} disabled={busyId === "__create__"}>
                <Plus className="mr-2 h-4 w-4" />
                Open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Lookback case</DialogTitle>
              <DialogDescription>Impacted units are computed from donor-linked inventory and issue history.</DialogDescription>
            </DialogHeader>

            {!selected ? (
              <div className="text-sm text-muted-foreground">No selection</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-lg">{selected.caseNumber}</div>
                    <div className="text-xs text-muted-foreground">{selected.id}</div>
                    <div className="text-sm text-muted-foreground">
                      Donor: <span className="font-medium text-foreground">{selected.donor?.name ?? selected.donorId}</span>
                      {selected.donor?.donorNumber ? ` • ${selected.donor.donorNumber}` : ""}
                      {selected.donor?.bloodGroup ? ` • ${selected.donor.bloodGroup}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(selected.status)}
                    <Button size="sm" variant="outline" onClick={() => refreshCase(selected.id)} disabled={busyId === selected.id}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    {selected.status === "OPEN" && (
                      <Button size="sm" onClick={() => closeCase(selected.id)} disabled={busyId === selected.id}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Close
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {dataSummary ? (
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Units</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-bold">{dataSummary.totalUnits}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Issued</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-bold">{dataSummary.issuedCount}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Transfused</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-bold">{dataSummary.transfusedCount}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Reactions</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-bold">{dataSummary.reactionCount}</CardContent>
                    </Card>
                  </div>
                ) : null}

                <div className="rounded-md border overflow-hidden">
                  <div className="p-3 border-b font-medium">Impacted units ({impactedUnits.length})</div>
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left">
                          <th className="p-2">Unit</th>
                          <th className="p-2">Group</th>
                          <th className="p-2">Component</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Expiry</th>
                          <th className="p-2">Issue</th>
                          <th className="p-2">Transfusion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impactedUnits.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-muted-foreground">
                              No units
                            </td>
                          </tr>
                        ) : (
                          impactedUnits.map((u: any) => (
                            <tr key={u.id} className="border-b last:border-0">
                              <td className="p-2 font-medium">{u.unitNumber}</td>
                              <td className="p-2">{u.bloodGroup}</td>
                              <td className="p-2">{u.componentType}</td>
                              <td className="p-2">{u.status}</td>
                              <td className="p-2">{u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : "—"}</td>
                              <td className="p-2">
                                {u.issued ? (
                                  <div>
                                    <div className="font-medium">{u.issued.issueNumber ?? "Issued"}</div>
                                    <div className="text-xs text-muted-foreground">{fmtDate(u.issued.issuedAt)}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-2">
                                {u.transfusion ? (
                                  <div>
                                    <div className="font-medium">{u.transfusion.hasReaction ? "Reaction" : "No reaction"}</div>
                                    <div className="text-xs text-muted-foreground">{fmtDate(u.transfusion.startedAt)}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selected.notes ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">Notes</div>
                    <div className="text-muted-foreground">{selected.notes}</div>
                  </div>
                ) : null}
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
