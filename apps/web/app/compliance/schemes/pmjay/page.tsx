"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import { ArrowLeft, ArrowUpRight, Link2, Link2Off, Loader2, Lock, Plus, RefreshCw, Settings, ShieldCheck } from "lucide-react";

/* --------------------------------- Constants ----------------------------- */

const SCHEME = "PMJAY" as const;

/* --------------------------------- Types --------------------------------- */

type Empanelment = { id: string; scheme: string; empanelmentNumber: string; shaCode: string; state: string; status: "ACTIVE" | "PENDING" | "EXPIRED"; createdAt: string; updatedAt: string; govSchemeConfigId?: string | null; lastSyncedAt?: string | null };
type RateCard = { id: string; version: string; effectiveFrom: string; effectiveTo: string | null; status: "DRAFT" | "ACTIVE" | "FROZEN"; itemCount: number };
type SyncResult = { empanelmentId: string; govSchemeConfigId: string; created: boolean; syncedFields: string[]; rateCardSynced: boolean; rateCardItemCount: number; syncedAt: string };

/* --------------------------------- Helpers -------------------------------- */

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE": return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "DRAFT": case "PENDING": return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "FROZEN": return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
    case "EXPIRED": return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default: return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

/* --------------------------------- Page ---------------------------------- */

export default function PmjayPage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [empanelment, setEmpanelment] = React.useState<Empanelment | null>(null);
  const [empLoading, setEmpLoading] = React.useState(true);
  const [rateCards, setRateCards] = React.useState<RateCard[]>([]);
  const [rcLoading, setRcLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [form, setForm] = React.useState({ empanelmentNumber: "", shaCode: "", state: "", status: "ACTIVE" as string });

  const fetchEmpanelment = React.useCallback(async () => {
    if (!activeBranchId) return; setEmpLoading(true);
    try { const res = await apiFetch<{ items: Empanelment[] } | Empanelment[]>(`/api/compliance/schemes/empanelments?branchId=${activeBranchId}&scheme=${SCHEME}`); const emp = Array.isArray(res) ? res[0] ?? null : (res?.items?.[0] ?? null); setEmpanelment(emp); if (emp) setForm({ empanelmentNumber: emp.empanelmentNumber || "", shaCode: emp.shaCode || "", state: emp.state || "", status: emp.status || "ACTIVE" }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setEmpLoading(false); }
  }, [activeBranchId]);

  const fetchRateCards = React.useCallback(async () => {
    if (!activeBranchId) return; setRcLoading(true);
    try { const res = await apiFetch<{ items: RateCard[] } | RateCard[]>(`/api/compliance/schemes/rate-cards?branchId=${activeBranchId}&scheme=${SCHEME}`); setRateCards(Array.isArray(res) ? res : (res?.items ?? [])); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setRcLoading(false); }
  }, [activeBranchId]);

  React.useEffect(() => { fetchEmpanelment(); fetchRateCards(); }, [fetchEmpanelment, fetchRateCards]);

  const handleSave = async () => {
    if (!form.empanelmentNumber.trim()) { toast({ title: "Validation", description: "Empanelment number is required.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = empanelment ? "PATCH" : "POST";
      const url = empanelment ? `/api/compliance/schemes/empanelments/${empanelment.id}` : `/api/compliance/schemes/empanelments`;
      await apiFetch(url, { method, body: { scheme: SCHEME, empanelmentNumber: form.empanelmentNumber.trim(), shaCode: form.shaCode.trim(), state: form.state.trim(), status: form.status, branchId: activeBranchId } });
      toast({ title: "Success", description: `${SCHEME} empanelment ${empanelment ? "updated" : "created"}.` });
      setDialogOpen(false); fetchEmpanelment();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleNewRateCard = async () => {
    if (!activeBranchId) return;
    try { const res = await apiFetch<RateCard & { id: string }>(`/api/compliance/schemes/rate-cards`, { method: "POST", body: { scheme: SCHEME, branchId: activeBranchId } }); toast({ title: "Success", description: "New rate card created." }); fetchRateCards(); if (res?.id) router.push(`/compliance/schemes/rate-cards/${res.id}`); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleFreeze = async (rcId: string) => {
    try { await apiFetch(`/api/compliance/schemes/rate-cards/${rcId}/freeze`, { method: "POST", body: {} }); toast({ title: "Success", description: "Rate card frozen." }); fetchRateCards(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handlePushToInfra = async () => {
    if (!empanelment) return;
    setSyncing(true);
    try {
      const res = await apiFetch<SyncResult>(`/api/compliance/schemes/sync/push/${empanelment.id}`, { method: "POST" });
      toast({
        title: "Synced to Operations",
        description: `${res.created ? "Created new" : "Updated existing"} infrastructure config.${res.rateCardSynced ? ` ${res.rateCardItemCount} rate-card items synced.` : ""}`,
      });
      fetchEmpanelment();
    } catch (e: any) { toast({ title: "Sync Failed", description: e.message, variant: "destructive" }); }
    finally { setSyncing(false); }
  };

  const handleUnlink = async () => {
    if (!empanelment) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/compliance/schemes/sync/unlink/${empanelment.id}`, { method: "POST" });
      toast({ title: "Unlinked", description: "Empanelment unlinked from infrastructure config." });
      fetchEmpanelment();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSyncing(false); }
  };

  return (
    <AppShell title={`${SCHEME} Configuration`}>
      <RequirePerm perm="COMPLIANCE_SCHEME_EMPANEL">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/compliance/schemes")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30"><ShieldCheck className="h-5 w-5 text-zc-accent" /></span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">{SCHEME} Configuration</div>
              <div className="mt-1 text-sm text-zc-muted">Manage empanelment details and rate cards for {SCHEME}.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-schemes-pmjay" />
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-schemes-pmjay" />

        {/* ── Empanelment ────────────────────────────────────────────── */}
        {empLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zc-muted" /></div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20"><ShieldCheck className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" /></span>
                  <div><CardTitle className="text-base">Empanelment Details</CardTitle><CardDescription>{empanelment ? `#${empanelment.empanelmentNumber}` : "No empanelment configured"}</CardDescription></div>
                </div>
                <div className="flex items-center gap-2">
                  {empanelment && <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(empanelment.status))}>{empanelment.status}</span>}
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}><Settings className="h-4 w-4 mr-1.5" />{empanelment ? "Edit" : "Configure"}</Button>
                </div>
              </div>
            </CardHeader>
            {empanelment && (<><Separator /><CardContent className="pt-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm"><div><span className="text-zc-muted text-xs">Empanelment No.</span><div className="font-medium">{empanelment.empanelmentNumber}</div></div><div><span className="text-zc-muted text-xs">SHA Code</span><div className="font-medium">{empanelment.shaCode || "-"}</div></div><div><span className="text-zc-muted text-xs">State</span><div className="font-medium">{empanelment.state || "-"}</div></div></div></CardContent></>)}
          </Card>
        )}

        {/* ── Sync to Operations ────────────────────────────────────── */}
        {empanelment && (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl border", empanelment.govSchemeConfigId ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20" : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20")}>
                    {empanelment.govSchemeConfigId ? <Link2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" /> : <Link2Off className="h-4.5 w-4.5 text-gray-400" />}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Operations Link</div>
                    <div className="text-xs text-zc-muted">
                      {empanelment.govSchemeConfigId
                        ? `Linked to infrastructure config \u2022 Last synced ${empanelment.lastSyncedAt ? formatDate(empanelment.lastSyncedAt) : "N/A"}`
                        : "Not linked to infrastructure. Push to create/update operational config."}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {empanelment.govSchemeConfigId && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleUnlink} disabled={syncing}>
                      <Link2Off className="h-3.5 w-3.5 mr-1" />Unlink
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={handlePushToInfra} disabled={syncing} className="gap-1.5">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {empanelment.govSchemeConfigId ? "Re-sync" : "Push to Operations"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Rate Cards ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Rate Cards</div>
          <Button variant="primary" className="px-5 gap-2" size="sm" onClick={handleNewRateCard}><Plus className="h-4 w-4" />New Rate Card</Button>
        </div>

        {rcLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zc-muted" /></div>
        ) : rateCards.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-zc-muted text-sm">No rate cards found. Create one to get started.</CardContent></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-3 text-left font-semibold">Version</th><th className="px-4 py-3 text-left font-semibold">Effective From</th><th className="px-4 py-3 text-left font-semibold">Effective To</th><th className="px-4 py-3 text-left font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Items</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody>
                  {rateCards.map((rc) => (
                    <tr key={rc.id} className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer" onClick={() => router.push(`/compliance/schemes/rate-cards/${rc.id}`)}>
                      <td className="px-4 py-3 font-medium">{rc.version}</td>
                      <td className="px-4 py-3">{formatDate(rc.effectiveFrom)}</td>
                      <td className="px-4 py-3">{formatDate(rc.effectiveTo)}</td>
                      <td className="px-4 py-3"><span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(rc.status))}>{rc.status}</span></td>
                      <td className="px-4 py-3 text-right">{rc.itemCount}</td>
                      <td className="px-4 py-3 text-right">{(rc.status === "DRAFT" || rc.status === "ACTIVE") && (<Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleFreeze(rc.id); }}><Lock className="h-3.5 w-3.5 mr-1" />Freeze</Button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Empanelment Dialog ──────────────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{empanelment ? "Edit" : "Configure"} {SCHEME} Empanelment</DialogTitle><DialogDescription>Enter empanelment details for {SCHEME}.</DialogDescription></DialogHeader>
            <div className="grid gap-4 mt-4">
              <div className="grid gap-2"><Label htmlFor="empanelmentNumber">Empanelment Number *</Label><Input id="empanelmentNumber" value={form.empanelmentNumber} onChange={(e) => setForm((f) => ({ ...f, empanelmentNumber: e.target.value }))} placeholder="e.g. IN-KA-12345" /></div>
              <div className="grid gap-2"><Label htmlFor="shaCode">SHA Code</Label><Input id="shaCode" value={form.shaCode} onChange={(e) => setForm((f) => ({ ...f, shaCode: e.target.value }))} placeholder="e.g. SHA-KA" /></div>
              <div className="grid gap-2"><Label htmlFor="state">State</Label><Input id="state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="e.g. Karnataka" /></div>
              <div className="grid gap-2"><Label htmlFor="status">Status</Label><Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="EXPIRED">Expired</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{empanelment ? "Update" : "Create"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
