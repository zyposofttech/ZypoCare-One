"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Link2,
  Link2Off,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";

/* ---------- Constants ---------- */

const SCHEME = "CGHS" as const;

/* ---------- Types ---------- */

type Empanelment = { id: string; scheme: string; empanelmentNumber: string; cityCategory: string; status: "ACTIVE" | "PENDING" | "EXPIRED"; createdAt: string; updatedAt: string; govSchemeConfigId?: string | null; lastSyncedAt?: string | null };
type RateCard = { id: string; version: string; effectiveFrom: string; effectiveTo: string | null; status: "DRAFT" | "ACTIVE" | "FROZEN"; itemCount: number };
type SyncResult = { empanelmentId: string; govSchemeConfigId: string; created: boolean; syncedFields: string[]; rateCardSynced: boolean; rateCardItemCount: number; syncedAt: string };

/* ---------- Helpers ---------- */

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE": return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200";
    case "PENDING": return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "EXPIRED": return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "DRAFT": return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "FROZEN": return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
    default: return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

/* ---------- Component ---------- */

export default function CghsPage() {
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
  const [form, setForm] = React.useState({ empanelmentNumber: "", cityCategory: "", status: "ACTIVE" as string });

  const fetchEmpanelment = React.useCallback(async () => {
    if (!activeBranchId) return;
    setEmpLoading(true);
    try {
      const res = await apiFetch<{ items: Empanelment[] } | Empanelment[]>(`/api/compliance/schemes/empanelments?branchId=${activeBranchId}&scheme=${SCHEME}`);
      const emp = Array.isArray(res) ? res[0] ?? null : (res?.items?.[0] ?? null);
      setEmpanelment(emp);
      if (emp) setForm({ empanelmentNumber: emp.empanelmentNumber || "", cityCategory: emp.cityCategory || "", status: emp.status || "ACTIVE" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setEmpLoading(false); }
  }, [activeBranchId]);

  const fetchRateCards = React.useCallback(async () => {
    if (!activeBranchId) return;
    setRcLoading(true);
    try {
      const res = await apiFetch<{ items: RateCard[] } | RateCard[]>(`/api/compliance/schemes/rate-cards?branchId=${activeBranchId}&scheme=${SCHEME}`);
      setRateCards(Array.isArray(res) ? res : (res?.items ?? []));
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setRcLoading(false); }
  }, [activeBranchId]);

  React.useEffect(() => { fetchEmpanelment(); fetchRateCards(); }, [fetchEmpanelment, fetchRateCards]);

  const handleSave = async () => {
    if (!form.empanelmentNumber.trim()) { toast({ title: "Validation", description: "Empanelment number is required.", variant: "destructive" }); return; }
    if (!form.cityCategory) { toast({ title: "Validation", description: "City category is required for CGHS.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = empanelment ? "PATCH" : "POST";
      const url = empanelment ? `/api/compliance/schemes/empanelments/${empanelment.id}` : `/api/compliance/schemes/empanelments`;
      await apiFetch(url, { method, body: { scheme: SCHEME, empanelmentNumber: form.empanelmentNumber.trim(), cityCategory: form.cityCategory, status: form.status, branchId: activeBranchId } });
      toast({ title: "Success", description: `${SCHEME} empanelment ${empanelment ? "updated" : "created"}.` });
      setDialogOpen(false); fetchEmpanelment();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleNewRateCard = async () => {
    if (!activeBranchId) return;
    try {
      const res = await apiFetch<RateCard & { id: string }>(`/api/compliance/schemes/rate-cards`, { method: "POST", body: { scheme: SCHEME, branchId: activeBranchId } });
      toast({ title: "Success", description: "New rate card created." }); fetchRateCards();
      if (res?.id) router.push(`/compliance/schemes/rate-cards/${res.id}`);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
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
      toast({ title: "Synced to Operations", description: `${res.created ? "Created new" : "Updated existing"} infrastructure config.${res.rateCardSynced ? ` ${res.rateCardItemCount} rate-card items synced.` : ""}` });
      fetchEmpanelment();
    } catch (e: any) { toast({ title: "Sync Failed", description: e.message, variant: "destructive" }); } finally { setSyncing(false); }
  };

  const handleUnlink = async () => {
    if (!empanelment) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/compliance/schemes/sync/unlink/${empanelment.id}`, { method: "POST" });
      toast({ title: "Unlinked", description: "Empanelment unlinked from infrastructure config." });
      fetchEmpanelment();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setSyncing(false); }
  };

  return (
    <AppShell title="CGHS Configuration">
      <RequirePerm perm="COMPLIANCE_SCHEME_EMPANEL">
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/compliance/schemes"><Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-zc-border"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30"><FileText className="h-5 w-5 text-zc-accent" /></span>
            <div className="min-w-0"><div className="text-3xl font-semibold tracking-tight">CGHS Empanelment</div><div className="mt-1 text-sm text-zc-muted">Central Government Health Scheme empanelment details and rate cards.</div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {empanelment && <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(empanelment.status))}>{empanelment.status}</span>}
            <Button variant="outline" className="gap-2" onClick={() => { fetchEmpanelment(); fetchRateCards(); }} disabled={empLoading || rcLoading}><RefreshCw className={empLoading || rcLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</Button>
          </div>
        </div>

        {empLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zc-muted" /></div> : (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20"><FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /></span><div><CardTitle className="text-base">Empanelment Details</CardTitle><CardDescription>{empanelment ? `#${empanelment.empanelmentNumber}` : "No empanelment configured"}</CardDescription></div></div><Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}><Settings className="h-3.5 w-3.5" />{empanelment ? "Edit" : "Configure"}</Button></div></CardHeader>
            {empanelment && <><Separator /><CardContent className="pt-4"><div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10"><div className="text-xs font-medium text-blue-600 dark:text-blue-400">Empanelment No.</div><div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{empanelment.empanelmentNumber}</div></div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10"><div className="text-xs font-medium text-purple-600 dark:text-purple-400">City Category</div><div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">{empanelment.cityCategory || "-"}</div></div>
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10"><div className="text-xs font-medium text-green-600 dark:text-green-400">Status</div><div className="mt-1 text-lg font-bold text-green-700 dark:text-green-300">{empanelment.status}</div></div>
            </div></CardContent></>}
          </Card>
        )}

        {/* ── Sync to Operations ── */}
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
                        ? `Linked to infrastructure config \u2022 Last synced ${empanelment.lastSyncedAt ? fmtDate(empanelment.lastSyncedAt) : "N/A"}`
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
                  <Button size="sm" onClick={handlePushToInfra} disabled={syncing} className="gap-1.5">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {empanelment.govSchemeConfigId ? "Re-sync" : "Push to Operations"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base">Rate Cards</CardTitle><CardDescription>{rateCards.length} rate card(s)</CardDescription></div><Button variant="primary" size="sm" className="gap-1.5" onClick={handleNewRateCard}><Plus className="h-3.5 w-3.5" />New Rate Card</Button></div></CardHeader>
          <Separator />
          {rcLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zc-muted" /></div> : rateCards.length === 0 ? <CardContent className="py-10 text-center text-sm text-zc-muted">No rate cards found. Create one to get started.</CardContent> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-3 text-left font-semibold">Version</th><th className="px-4 py-3 text-left font-semibold">Effective From</th><th className="px-4 py-3 text-left font-semibold">Effective To</th><th className="px-4 py-3 text-left font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Items</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody>
              {rateCards.map((rc) => <tr key={rc.id} className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer" onClick={() => router.push(`/compliance/schemes/rate-cards/${rc.id}`)}><td className="px-4 py-3 font-medium text-zc-text">{rc.version}</td><td className="px-4 py-3 text-zc-muted">{fmtDate(rc.effectiveFrom)}</td><td className="px-4 py-3 text-zc-muted">{fmtDate(rc.effectiveTo)}</td><td className="px-4 py-3"><span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(rc.status))}>{rc.status}</span></td><td className="px-4 py-3 text-right tabular-nums">{rc.itemCount}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>{(rc.status === "DRAFT" || rc.status === "ACTIVE") && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleFreeze(rc.id)}><Lock className="h-3 w-3" />Freeze</Button>}<Link href={`/compliance/schemes/rate-cards/${rc.id}`}><Button variant="outline" size="sm" className="gap-1.5">View <ArrowRight className="h-3 w-3" /></Button></Link></div></td></tr>)}
            </tbody></table></div>
          )}
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{empanelment ? "Edit" : "Configure"} CGHS Empanelment</DialogTitle><DialogDescription>Enter empanelment details for CGHS.</DialogDescription></DialogHeader>
            <Separator />
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label htmlFor="empanelmentNumber">Empanelment Number *</Label><Input id="empanelmentNumber" value={form.empanelmentNumber} onChange={(e) => setForm((f) => ({ ...f, empanelmentNumber: e.target.value }))} placeholder="e.g. CGHS-BLR-001" disabled={saving} /></div>
              <div className="space-y-2"><Label>City Category *</Label><Select value={form.cityCategory} onValueChange={(v) => setForm((f) => ({ ...f, cityCategory: v }))} disabled={saving}><SelectTrigger><SelectValue placeholder="Select city category" /></SelectTrigger><SelectContent><SelectItem value="A">Category A</SelectItem><SelectItem value="B">Category B</SelectItem><SelectItem value="C">Category C</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} disabled={saving}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="EXPIRED">Expired</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button variant="primary" onClick={handleSave} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{empanelment ? "Update" : "Create"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
