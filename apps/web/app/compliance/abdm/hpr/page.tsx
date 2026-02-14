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
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import { AlertTriangle, ArrowLeft, Filter, Loader2, Plus, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type RegistrationStatus = "UNVERIFIED" | "VERIFIED" | "EXPIRED" | "MISMATCH";
type HprCategory = "DOCTOR" | "NURSE" | "ALLIED" | "PHARMACIST";

type HprLink = {
  id: string; workspaceId: string; staffId: string; staffName: string;
  hprId: string; category: HprCategory; registrationStatus: RegistrationStatus;
  verifiedAt?: string | null; createdAt: string; updatedAt: string;
};

type Workspace = { id: string; name: string; branchId: string };

/* --------------------------------- Helpers -------------------------------- */

function statusBadgeClass(status: RegistrationStatus) {
  const map: Record<RegistrationStatus, string> = {
    UNVERIFIED: "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
    VERIFIED: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    EXPIRED: "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
    MISMATCH: "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
  };
  return map[status] ?? map.UNVERIFIED;
}

function statusLabel(status: RegistrationStatus) {
  const map: Record<RegistrationStatus, string> = { UNVERIFIED: "Unverified", VERIFIED: "Verified", EXPIRED: "Expired", MISMATCH: "Mismatch" };
  return map[status] ?? "Unverified";
}

function categoryLabel(cat: HprCategory) {
  const labels: Record<HprCategory, string> = { DOCTOR: "Doctor", NURSE: "Nurse", ALLIED: "Allied Health", PHARMACIST: "Pharmacist" };
  return labels[cat] ?? cat;
}

/* --------------------------------- Page ---------------------------------- */

export default function HprLinkagePage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [links, setLinks] = React.useState<HprLink[]>([]);
  const [filteredLinks, setFilteredLinks] = React.useState<HprLink[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<RegistrationStatus | "ALL">("ALL");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [fStaffId, setFStaffId] = React.useState("");
  const [fHprId, setFHprId] = React.useState("");
  const [fCategory, setFCategory] = React.useState<HprCategory>("DOCTOR");
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);

  const totalCount = links.length;
  const verifiedCount = links.filter((l) => l.registrationStatus === "VERIFIED").length;
  const unverifiedCount = links.filter((l) => l.registrationStatus === "UNVERIFIED").length;
  const issueCount = links.filter((l) => l.registrationStatus === "EXPIRED" || l.registrationStatus === "MISMATCH").length;

  React.useEffect(() => {
    if (statusFilter === "ALL") setFilteredLinks(links);
    else setFilteredLinks(links.filter((l) => l.registrationStatus === statusFilter));
  }, [links, statusFilter]);

  const fetchLinks = React.useCallback(async (wsId: string) => {
    setLoading(true);
    try { const data = await apiFetch<HprLink[]>(`/api/compliance/abdm/hpr?workspaceId=${wsId}`); setLinks(Array.isArray(data) ? data : []); }
    catch { setLinks([]); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    (async () => {
      try {
        const data = await apiFetch<Workspace[] | { items: Workspace[] }>(`/api/compliance/workspaces?branchId=${activeBranchId}`);
        const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
        const ws = workspaces[0];
        if (ws) { setWorkspaceId(ws.id); await fetchLinks(ws.id); }
        else { setWorkspaceId(null); setLinks([]); setLoading(false); }
      } catch (e: any) { toast({ title: "Error", description: e.message ?? "Failed to load workspace", variant: "destructive" }); setLoading(false); }
    })();
  }, [activeBranchId]);

  function openLinkDialog() { setFStaffId(""); setFHprId(""); setFCategory("DOCTOR"); setDialogOpen(true); }

  async function handleCreateLink() {
    if (!workspaceId) return;
    if (!fStaffId.trim()) { toast({ title: "Validation Error", description: "Staff ID is required.", variant: "destructive" }); return; }
    if (!fHprId.trim()) { toast({ title: "Validation Error", description: "HPR ID is required.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/abdm/hpr`, { method: "POST", body: { workspaceId, staffId: fStaffId.trim(), hprId: fHprId.trim(), category: fCategory } });
      toast({ title: "Link Created", description: "HPR professional link created successfully." });
      setDialogOpen(false); await fetchLinks(workspaceId);
    } catch (e: any) { toast({ title: "Creation Failed", description: e.message ?? "Failed to create HPR link.", variant: "destructive" }); } finally { setSaving(false); }
  }

  async function handleVerify(linkId: string) {
    setVerifyingId(linkId);
    try {
      await apiFetch(`/api/compliance/abdm/hpr/${linkId}/verify`, { method: "POST", body: {} });
      toast({ title: "Verification Initiated", description: "HPR verification request submitted." });
      if (workspaceId) await fetchLinks(workspaceId);
    } catch (e: any) { toast({ title: "Verification Failed", description: e.message ?? "Failed to verify HPR link.", variant: "destructive" }); } finally { setVerifyingId(null); }
  }

  return (
    <AppShell title="HPR Professional Linkage">
      <RequirePerm perm="COMPLIANCE_ABDM_HPR_UPDATE">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/compliance/abdm")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30"><UserCheck className="h-5 w-5 text-zc-accent" /></span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">HPR Professional Linkage</div>
              <div className="mt-1 text-sm text-zc-muted">Link staff members to the Health Professional Registry for ABDM compliance.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-abdm-hpr" />
            <Button variant="outline" className="px-5 gap-2" onClick={() => { if (workspaceId) fetchLinks(workspaceId); }} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh
            </Button>
            <Button variant="primary" className="px-5 gap-2" onClick={openLinkDialog} disabled={loading || !workspaceId}>
              <Plus className="h-4 w-4" />Link Staff
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-abdm-hpr" />

        {/* ── Guard states ───────────────────────────────────────────── */}
        {!activeBranchId ? (
          <Card><CardContent className="py-10 text-center text-sm text-zc-muted"><AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />Select a branch to manage HPR links.</CardContent></Card>
        ) : !workspaceId && !loading ? (
          <Card><CardContent className="py-10 text-center text-sm text-zc-muted"><AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />No compliance workspace found for this branch. Create one in{" "}<Link href="/compliance/workspaces" className="text-zc-accent hover:underline">Workspaces</Link>{" "}first.</CardContent></Card>
        ) : (
          <>
            {/* ── Stat boxes ─────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Links</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{verifiedCount}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Unverified</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{unverifiedCount}</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Issues</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{issueCount}</div>
              </div>
            </div>

            {/* ── Table ───────────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">Professional Links</CardTitle>
                    <CardDescription>Showing {filteredLinks.length} of {totalCount} links</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-zc-muted" />
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RegistrationStatus | "ALL")}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="MISMATCH">Mismatch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <Separator />

              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zc-muted" /></div>
              ) : filteredLinks.length === 0 ? (
                <CardContent className="py-10 text-center text-sm text-zc-muted">
                  <UserCheck className="mx-auto mb-2 h-8 w-8 text-zc-muted/50" />
                  {totalCount === 0 ? 'No HPR links found. Click "Link Staff" to get started.' : "No links match the selected filter."}
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Staff Name</th>
                        <th className="px-4 py-3 text-left font-semibold">HPR ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Category</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLinks.map((link) => (
                        <tr key={link.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                          <td className="px-4 py-3">
                            <div><p className="font-medium">{link.staffName}</p><p className="text-xs text-zc-muted font-mono">{link.staffId}</p></div>
                          </td>
                          <td className="px-4 py-3"><span className="font-mono text-sm">{link.hprId}</span></td>
                          <td className="px-4 py-3">{categoryLabel(link.category)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(link.registrationStatus))}>
                              {statusLabel(link.registrationStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleVerify(link.id)} disabled={verifyingId === link.id || link.registrationStatus === "VERIFIED"}>
                              {verifyingId === link.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3 w-3" />}
                              Verify
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Link Staff Dialog ──────────────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(v) => (!saving ? setDialogOpen(v) : null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Staff to HPR</DialogTitle>
              <DialogDescription>Associate a staff member with their Health Professional Registry ID.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="staffId">Staff ID</Label><Input id="staffId" value={fStaffId} onChange={(e) => setFStaffId(e.target.value)} placeholder="Enter staff ID" disabled={saving} /></div>
              <div className="grid gap-2"><Label htmlFor="hprId">HPR ID</Label><Input id="hprId" value={fHprId} onChange={(e) => setFHprId(e.target.value)} placeholder="Enter HPR ID" disabled={saving} /></div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={fCategory} onValueChange={(v) => setFCategory(v as HprCategory)} disabled={saving}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctor</SelectItem><SelectItem value="NURSE">Nurse</SelectItem>
                    <SelectItem value="ALLIED">Allied Health</SelectItem><SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateLink} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                Create Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
