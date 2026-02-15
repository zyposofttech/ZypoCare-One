"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconPlus } from "@/components/icons";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

import type {
  OtStaffAssignmentRow,
  OtSurgeonPrivilegeRow,
  OtAnesthetistPrivilegeRow,
  OtZoneAccessRuleRow,
  OtMinStaffingRuleRow,
  OtPrivilegeGap,
  OtSuiteRow,
  OtSpaceRow,
} from "../../_shared/types";

import {
  SuiteContextBar,
  OtPageHeader,
  ErrorAlert,
  EmptyRow,
  SectionHeader,
  StatusPill,
  drawerClassName,
} from "../../_shared/components";

import { STAFF_ROLES, SURGERY_CATEGORIES, ZONE_TYPES } from "../../_shared/constants";
import { humanize } from "../../_shared/utils";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 05 — Staff & Access Control Page
   OTS-027 through OTS-033
   ========================================================= */

type DrawerMode =
  | { kind: "closed" }
  | { kind: "add-assignment" }
  | { kind: "edit-assignment"; row: OtStaffAssignmentRow }
  | { kind: "add-surgeon-privilege" }
  | { kind: "add-anesthetist-privilege" }
  | { kind: "add-zone-access" }
  | { kind: "add-staffing-rule" }
  | { kind: "edit-staffing-rule"; row: OtMinStaffingRuleRow };

export default function StaffAccessPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Staff & Access Control">
      <RequirePerm perm="ot.staff.read">
        {branchId ? <Content branchId={branchId} params={props.params} /> : (
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div className="text-base font-semibold text-zc-text">No Branch Selected</div>
              <div className="max-w-sm text-sm text-zc-muted">
                Please select a branch from the header to view and manage staff configuration.
              </div>
            </CardContent>
          </Card>
        )}
      </RequirePerm>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

function Content({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canCreate = hasPerm(user, "ot.staff.create");
  const canUpdate = hasPerm(user, "ot.staff.update");
  const canDelete = hasPerm(user, "ot.staff.delete");

  /* ---- state ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [spaces, setSpaces] = React.useState<OtSpaceRow[]>([]);

  const [assignments, setAssignments] = React.useState<OtStaffAssignmentRow[]>([]);
  const [surgeonPrivs, setSurgeonPrivs] = React.useState<OtSurgeonPrivilegeRow[]>([]);
  const [anesPrivs, setAnesPrivs] = React.useState<OtAnesthetistPrivilegeRow[]>([]);
  const [zoneRules, setZoneRules] = React.useState<OtZoneAccessRuleRow[]>([]);
  const [staffingRules, setStaffingRules] = React.useState<OtMinStaffingRuleRow[]>([]);
  const [privilegeGaps, setPrivilegeGaps] = React.useState<OtPrivilegeGap[]>([]);

  const [drawer, setDrawer] = React.useState<DrawerMode>({ kind: "closed" });

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-staff-access" });

  /* ---- form state ---- */
  const [fAssign, setFAssign] = React.useState({ staffId: "", role: "" as string, defaultShift: "", isActive: true });
  const [fSurgPriv, setFSurgPriv] = React.useState({ staffId: "", specialtyCode: "", theatreSpaceId: "", effectiveFrom: "", effectiveTo: "" });
  const [fAnesPriv, setFAnesPriv] = React.useState({ staffId: "", theatreSpaceId: "", concurrentCaseLimit: "1", effectiveFrom: "", effectiveTo: "" });
  const [fZone, setFZone] = React.useState({ spaceId: "", zone: "" as string, allowedRoles: [] as string[] });
  const [fStaffing, setFStaffing] = React.useState({
    theatreSpaceId: "", surgeryCategory: "" as string,
    minSurgeons: "1", minAnesthetists: "1", minScrubNurses: "1",
    minCirculatingNurses: "1", minOtTechnicians: "0", minAnesthesiaTechnicians: "0",
  });

  const qs = `?branchId=${encodeURIComponent(branchId)}`;
  const base = `/api/infrastructure/ot`;

  /* ---- load ---- */
  const load = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const [suiteRes, spacesRes, assignRes, surgRes, anesRes, zoneRes, staffRes, gapsRes] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`${base}/suites/${suiteId}${qs}`),
        apiFetch<OtSpaceRow[]>(`${base}/suites/${suiteId}/spaces${qs}`),
        apiFetch<OtStaffAssignmentRow[]>(`${base}/staff/suites/${suiteId}/assignments${qs}`),
        apiFetch<OtSurgeonPrivilegeRow[]>(`${base}/staff/suites/${suiteId}/surgeon-privileges${qs}`),
        apiFetch<OtAnesthetistPrivilegeRow[]>(`${base}/staff/suites/${suiteId}/anesthetist-privileges${qs}`),
        apiFetch<OtZoneAccessRuleRow[]>(`${base}/staff/suites/${suiteId}/zone-access${qs}`),
        apiFetch<OtMinStaffingRuleRow[]>(`${base}/staff/suites/${suiteId}/min-staffing-rules${qs}`),
        apiFetch<OtPrivilegeGap[]>(`${base}/staff/suites/${suiteId}/privilege-gaps${qs}`),
      ]);

      if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
      else setError("Failed to load suite.");

      setSpaces(spacesRes.status === "fulfilled" ? (Array.isArray(spacesRes.value) ? spacesRes.value : []) : []);
      setAssignments(assignRes.status === "fulfilled" ? (Array.isArray(assignRes.value) ? assignRes.value : []) : []);
      setSurgeonPrivs(surgRes.status === "fulfilled" ? (Array.isArray(surgRes.value) ? surgRes.value : []) : []);
      setAnesPrivs(anesRes.status === "fulfilled" ? (Array.isArray(anesRes.value) ? anesRes.value : []) : []);
      setZoneRules(zoneRes.status === "fulfilled" ? (Array.isArray(zoneRes.value) ? zoneRes.value : []) : []);
      setStaffingRules(staffRes.status === "fulfilled" ? (Array.isArray(staffRes.value) ? staffRes.value : []) : []);
      setPrivilegeGaps(gapsRes.status === "fulfilled" ? (Array.isArray(gapsRes.value) ? gapsRes.value : []) : []);

      if (showToast) toast({ title: "Staff data refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load staff data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, toast, base, qs]);

  React.useEffect(() => { void load(false); }, [load]);

  const theatreSpaces = React.useMemo(() => spaces.filter((s) => s.type === "THEATRE"), [spaces]);

  /* ---- helper: find label ---- */
  function roleLabel(v: string) {
    return STAFF_ROLES.find((r) => r.value === v)?.label ?? humanize(v);
  }
  function categoryLabel(v: string) {
    return SURGERY_CATEGORIES.find((c) => c.value === v)?.label ?? humanize(v);
  }
  function zoneLabel(v: string) {
    return ZONE_TYPES.find((z) => z.value === v)?.label ?? humanize(v);
  }
  function spaceName(id: string | null | undefined) {
    if (!id) return "All Theatres";
    return spaces.find((s) => s.id === id)?.name ?? id;
  }

  /* =============================================================== */
  /*  CRUD handlers                                                  */
  /* =============================================================== */

  async function saveAssignment() {
    if (!fAssign.staffId || !fAssign.role) {
      toast({ variant: "destructive", title: "Validation", description: "Staff ID and Role are required." });
      return;
    }
    setSaving(true);
    try {
      const isEdit = drawer.kind === "edit-assignment";
      const body: any = { staffId: fAssign.staffId, role: fAssign.role, defaultShift: fAssign.defaultShift || undefined };
      if (isEdit) {
        const row = (drawer as { kind: "edit-assignment"; row: OtStaffAssignmentRow }).row;
        body.isActive = fAssign.isActive;
        await apiFetch(`${base}/staff/assignments/${row.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "Assignment updated" });
      } else {
        await apiFetch(`${base}/staff/suites/${suiteId}/assignments`, { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Assignment created" });
      }
      setDrawer({ kind: "closed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(id: string) {
    setSaving(true);
    try {
      await apiFetch(`${base}/staff/assignments/${id}`, { method: "DELETE" });
      toast({ title: "Assignment removed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveSurgeonPrivilege() {
    if (!fSurgPriv.staffId || !fSurgPriv.specialtyCode || !fSurgPriv.effectiveFrom) {
      toast({ variant: "destructive", title: "Validation", description: "Staff ID, Specialty, and Effective From are required." });
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        staffId: fSurgPriv.staffId,
        specialtyCode: fSurgPriv.specialtyCode,
        effectiveFrom: fSurgPriv.effectiveFrom,
        effectiveTo: fSurgPriv.effectiveTo || undefined,
        theatreSpaceId: fSurgPriv.theatreSpaceId || undefined,
      };
      await apiFetch(`${base}/staff/suites/${suiteId}/surgeon-privileges`, { method: "POST", body: JSON.stringify(body) });
      toast({ title: "Surgeon privilege granted" });
      setDrawer({ kind: "closed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSurgeonPrivilege(id: string) {
    setSaving(true);
    try {
      await apiFetch(`${base}/staff/surgeon-privileges/${id}`, { method: "DELETE" });
      toast({ title: "Surgeon privilege revoked" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveAnesthetistPrivilege() {
    if (!fAnesPriv.staffId || !fAnesPriv.effectiveFrom) {
      toast({ variant: "destructive", title: "Validation", description: "Staff ID and Effective From are required." });
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        staffId: fAnesPriv.staffId,
        effectiveFrom: fAnesPriv.effectiveFrom,
        effectiveTo: fAnesPriv.effectiveTo || undefined,
        theatreSpaceId: fAnesPriv.theatreSpaceId || undefined,
        concurrentCaseLimit: parseInt(fAnesPriv.concurrentCaseLimit) || undefined,
      };
      await apiFetch(`${base}/staff/suites/${suiteId}/anesthetist-privileges`, { method: "POST", body: JSON.stringify(body) });
      toast({ title: "Anesthetist privilege granted" });
      setDrawer({ kind: "closed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnesthetistPrivilege(id: string) {
    setSaving(true);
    try {
      await apiFetch(`${base}/staff/anesthetist-privileges/${id}`, { method: "DELETE" });
      toast({ title: "Anesthetist privilege revoked" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveZoneAccess() {
    if (!fZone.spaceId || !fZone.zone || fZone.allowedRoles.length === 0) {
      toast({ variant: "destructive", title: "Validation", description: "Space, Zone, and at least one allowed role are required." });
      return;
    }
    setSaving(true);
    try {
      const body = { spaceId: fZone.spaceId, zone: fZone.zone, allowedRoles: fZone.allowedRoles };
      await apiFetch(`${base}/staff/suites/${suiteId}/zone-access`, { method: "POST", body: JSON.stringify(body) });
      toast({ title: "Zone access rule created" });
      setDrawer({ kind: "closed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveStaffingRule() {
    if (!fStaffing.surgeryCategory) {
      toast({ variant: "destructive", title: "Validation", description: "Surgery category is required." });
      return;
    }
    setSaving(true);
    try {
      const isEdit = drawer.kind === "edit-staffing-rule";
      const body: any = {
        theatreSpaceId: fStaffing.theatreSpaceId || undefined,
        surgeryCategory: fStaffing.surgeryCategory,
        minSurgeons: parseInt(fStaffing.minSurgeons) || 0,
        minAnesthetists: parseInt(fStaffing.minAnesthetists) || 0,
        minScrubNurses: parseInt(fStaffing.minScrubNurses) || 0,
        minCirculatingNurses: parseInt(fStaffing.minCirculatingNurses) || 0,
        minOtTechnicians: parseInt(fStaffing.minOtTechnicians) || 0,
        minAnesthesiaTechnicians: parseInt(fStaffing.minAnesthesiaTechnicians) || 0,
      };
      if (isEdit) {
        const row = (drawer as { kind: "edit-staffing-rule"; row: OtMinStaffingRuleRow }).row;
        await apiFetch(`${base}/staff/suites/${suiteId}/min-staffing-rules`, { method: "POST", body: JSON.stringify({ ...body, id: row.id }) });
      } else {
        await apiFetch(`${base}/staff/suites/${suiteId}/min-staffing-rules`, { method: "POST", body: JSON.stringify(body) });
      }
      toast({ title: isEdit ? "Staffing rule updated" : "Staffing rule created" });
      setDrawer({ kind: "closed" });
      await load(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  /* ---- drawer openers ---- */
  function openAddAssignment() {
    setFAssign({ staffId: "", role: "", defaultShift: "", isActive: true });
    setDrawer({ kind: "add-assignment" });
  }
  function openEditAssignment(row: OtStaffAssignmentRow) {
    setFAssign({ staffId: row.staffId, role: row.role, defaultShift: row.defaultShift ?? "", isActive: row.isActive });
    setDrawer({ kind: "edit-assignment", row });
  }
  function openAddSurgeonPrivilege() {
    setFSurgPriv({ staffId: "", specialtyCode: "", theatreSpaceId: "", effectiveFrom: "", effectiveTo: "" });
    setDrawer({ kind: "add-surgeon-privilege" });
  }
  function openAddAnesthetistPrivilege() {
    setFAnesPriv({ staffId: "", theatreSpaceId: "", concurrentCaseLimit: "1", effectiveFrom: "", effectiveTo: "" });
    setDrawer({ kind: "add-anesthetist-privilege" });
  }
  function openAddZoneAccess() {
    setFZone({ spaceId: "", zone: "", allowedRoles: [] });
    setDrawer({ kind: "add-zone-access" });
  }
  function openAddStaffingRule() {
    setFStaffing({ theatreSpaceId: "", surgeryCategory: "", minSurgeons: "1", minAnesthetists: "1", minScrubNurses: "1", minCirculatingNurses: "1", minOtTechnicians: "0", minAnesthesiaTechnicians: "0" });
    setDrawer({ kind: "add-staffing-rule" });
  }
  function openEditStaffingRule(row: OtMinStaffingRuleRow) {
    setFStaffing({
      theatreSpaceId: row.theatreSpaceId ?? "",
      surgeryCategory: row.surgeryCategory,
      minSurgeons: String(row.minSurgeons),
      minAnesthetists: String(row.minAnesthetists),
      minScrubNurses: String(row.minScrubNurses),
      minCirculatingNurses: String(row.minCirculatingNurses),
      minOtTechnicians: String(row.minOtTechnicians),
      minAnesthesiaTechnicians: String(row.minAnesthesiaTechnicians),
    });
    setDrawer({ kind: "edit-staffing-rule", row });
  }

  function toggleZoneRole(role: string) {
    setFZone((p) => ({
      ...p,
      allowedRoles: p.allowedRoles.includes(role)
        ? p.allowedRoles.filter((r) => r !== role)
        : [...p.allowedRoles, role],
    }));
  }

  /* =============================================================== */
  /*  Render                                                         */
  /* =============================================================== */

  return (
    <div className="grid gap-6">
      {/* 1. Suite context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* 2. Page header */}
      <OtPageHeader
        icon={<Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        title="Staff & Access Control"
        description="Manage staff assignments, surgeon and anesthetist privileges, zone access policies, and minimum staffing rules."
        loading={loading}
        onRefresh={() => void load(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* 3. AI Privilege Gaps alert banner (OTS-032) */}
      {privilegeGaps.length > 0 && (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Privilege Gaps Detected ({privilegeGaps.length})
              </div>
              <div className="mt-1 space-y-1">
                {privilegeGaps.slice(0, 5).map((gap, i) => (
                  <div key={i} className="text-xs text-amber-700 dark:text-amber-300">
                    <span className="font-medium">{gap.theatreName}</span> — {gap.specialty}: missing {gap.missingRole}.{" "}
                    <span className="italic">{gap.suggestion}</span>
                  </div>
                ))}
                {privilegeGaps.length > 5 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    and {privilegeGaps.length - 5} more...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Staff Assignments (OTS-027) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Staff Assignments" count={assignments.length}>
            {canCreate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddAssignment}>
                <IconPlus className="h-3.5 w-3.5" /> Add Assignment
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Staff ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Default Shift</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <EmptyRow colSpan={5} loading={loading} message="No staff assignments configured." />
                ) : (
                  assignments.map((row) => (
                    <tr key={row.id} className="border-b border-zc-border/50 hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.staffId}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{roleLabel(row.role)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-zc-muted">{row.defaultShift || "\u2014"}</td>
                      <td className="px-4 py-2.5"><StatusPill active={row.isActive} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAssignment(row)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => deleteAssignment(row.id)} disabled={saving}>
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* 5. Surgeon Privileges (OTS-028) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Surgeon Privileges" count={surgeonPrivs.length}>
            {canCreate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddSurgeonPrivilege}>
                <IconPlus className="h-3.5 w-3.5" /> Add Privilege
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Surgeon</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Specialty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Theatres</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">To</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {surgeonPrivs.length === 0 ? (
                  <EmptyRow colSpan={6} loading={loading} message="No surgeon privileges configured." />
                ) : (
                  surgeonPrivs.map((row) => (
                    <tr key={row.id} className="border-b border-zc-border/50 hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.staffId}</td>
                      <td className="px-4 py-2.5">{row.specialtyCode}</td>
                      <td className="px-4 py-2.5 text-zc-muted">{spaceName(row.theatreSpaceId)}</td>
                      <td className="px-4 py-2.5 text-zc-muted">{row.effectiveFrom?.slice(0, 10) ?? "\u2014"}</td>
                      <td className="px-4 py-2.5 text-zc-muted">{row.effectiveTo?.slice(0, 10) ?? "\u2014"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => deleteSurgeonPrivilege(row.id)} disabled={saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. Anesthetist Privileges (OTS-029) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Anesthetist Privileges" count={anesPrivs.length}>
            {canCreate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddAnesthetistPrivilege}>
                <IconPlus className="h-3.5 w-3.5" /> Add Privilege
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Anesthetist</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Theatres</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Concurrent Limit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">To</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {anesPrivs.length === 0 ? (
                  <EmptyRow colSpan={6} loading={loading} message="No anesthetist privileges configured." />
                ) : (
                  anesPrivs.map((row) => (
                    <tr key={row.id} className="border-b border-zc-border/50 hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.staffId}</td>
                      <td className="px-4 py-2.5 text-zc-muted">{spaceName(row.theatreSpaceId)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{row.concurrentCaseLimit ?? 1}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-zc-muted">{row.effectiveFrom?.slice(0, 10) ?? "\u2014"}</td>
                      <td className="px-4 py-2.5 text-zc-muted">{row.effectiveTo?.slice(0, 10) ?? "\u2014"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => deleteAnesthetistPrivilege(row.id)} disabled={saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 7. Zone Access Configuration (OTS-030) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Zone Access Configuration" count={zoneRules.length}>
            {canCreate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddZoneAccess}>
                <IconPlus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Space</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Zone</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Allowed Roles</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {zoneRules.length === 0 ? (
                  <EmptyRow colSpan={4} loading={loading} message="No zone access rules configured." />
                ) : (
                  zoneRules.map((row) => (
                    <tr key={row.id} className="border-b border-zc-border/50 hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-2.5">{row.space?.name ?? spaceName(row.spaceId)}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", row.zone === "RESTRICTED"
                            ? "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200"
                            : row.zone === "SEMI_RESTRICTED"
                              ? "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                              : "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                          )}
                        >
                          {zoneLabel(row.zone)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(row.allowedRoles ?? []).map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px]">{roleLabel(r)}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><StatusPill active={row.isActive} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 8. Minimum Staffing Rules (OTS-031) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Minimum Staffing Rules" count={staffingRules.length}>
            {canCreate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddStaffingRule}>
                <IconPlus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Theatre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zc-muted">Surgery Category</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">Surgeons</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">Anesthetists</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">Scrub Nurses</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">Circ. Nurses</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">OT Techs</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zc-muted">Anes. Techs</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffingRules.length === 0 ? (
                  <EmptyRow colSpan={9} loading={loading} message="No minimum staffing rules configured." />
                ) : (
                  staffingRules.map((row) => (
                    <tr key={row.id} className="border-b border-zc-border/50 hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-2.5 text-zc-muted">{spaceName(row.theatreSpaceId)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{categoryLabel(row.surgeryCategory)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minSurgeons}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minAnesthetists}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minScrubNurses}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minCirculatingNurses}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minOtTechnicians}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.minAnesthesiaTechnicians}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditStaffingRule(row)}>
                              <Pencil className="h-3.5 w-3.5" />
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

      {/* ============================================================= */}
      {/*  DRAWERS                                                      */}
      {/* ============================================================= */}

      {/* ---- Staff Assignment Drawer (Add / Edit) ---- */}
      <Dialog open={drawer.kind === "add-assignment" || drawer.kind === "edit-assignment"} onOpenChange={(o) => !o && setDrawer({ kind: "closed" })}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>{drawer.kind === "edit-assignment" ? "Edit Staff Assignment" : "Add Staff Assignment"}</DialogTitle>
            <DialogDescription>
              Assign a staff member to this OT suite with a specific role and shift.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Staff ID *</Label>
                <Input
                  value={fAssign.staffId}
                  onChange={(e) => setFAssign((p) => ({ ...p, staffId: e.target.value }))}
                  placeholder="Enter staff ID"
                  disabled={drawer.kind === "edit-assignment"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role *</Label>
                <Select value={fAssign.role} onValueChange={(v) => setFAssign((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Shift</Label>
                <Input
                  value={fAssign.defaultShift}
                  onChange={(e) => setFAssign((p) => ({ ...p, defaultShift: e.target.value }))}
                  placeholder="e.g. Morning, Evening, Night"
                />
              </div>
              {drawer.kind === "edit-assignment" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={fAssign.isActive ? "active" : "inactive"} onValueChange={(v) => setFAssign((p) => ({ ...p, isActive: v === "active" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawer({ kind: "closed" })} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveAssignment} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {drawer.kind === "edit-assignment" ? "Update Assignment" : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Surgeon Privilege Drawer ---- */}
      <Dialog open={drawer.kind === "add-surgeon-privilege"} onOpenChange={(o) => !o && setDrawer({ kind: "closed" })}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>Add Surgeon Privilege</DialogTitle>
            <DialogDescription>
              Grant a surgeon privileges to operate in this suite for a specific specialty.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Surgeon Staff ID *</Label>
                <Input
                  value={fSurgPriv.staffId}
                  onChange={(e) => setFSurgPriv((p) => ({ ...p, staffId: e.target.value }))}
                  placeholder="Enter staff ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Specialty Code *</Label>
                <Input
                  value={fSurgPriv.specialtyCode}
                  onChange={(e) => setFSurgPriv((p) => ({ ...p, specialtyCode: e.target.value }))}
                  placeholder="e.g. ORTHO, CARDIAC"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Theatre (optional)</Label>
                <Select value={fSurgPriv.theatreSpaceId} onValueChange={(v) => setFSurgPriv((p) => ({ ...p, theatreSpaceId: v === "__all__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="All Theatres" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Theatres</SelectItem>
                    {theatreSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From *</Label>
                <Input
                  type="date"
                  value={fSurgPriv.effectiveFrom}
                  onChange={(e) => setFSurgPriv((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To</Label>
                <Input
                  type="date"
                  value={fSurgPriv.effectiveTo}
                  onChange={(e) => setFSurgPriv((p) => ({ ...p, effectiveTo: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawer({ kind: "closed" })} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveSurgeonPrivilege} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Grant Privilege
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Anesthetist Privilege Drawer ---- */}
      <Dialog open={drawer.kind === "add-anesthetist-privilege"} onOpenChange={(o) => !o && setDrawer({ kind: "closed" })}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>Add Anesthetist Privilege</DialogTitle>
            <DialogDescription>
              Grant an anesthetist privileges to work in this suite with an optional concurrent case limit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Anesthetist Staff ID *</Label>
                <Input
                  value={fAnesPriv.staffId}
                  onChange={(e) => setFAnesPriv((p) => ({ ...p, staffId: e.target.value }))}
                  placeholder="Enter staff ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Concurrent Case Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={fAnesPriv.concurrentCaseLimit}
                  onChange={(e) => setFAnesPriv((p) => ({ ...p, concurrentCaseLimit: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Theatre (optional)</Label>
                <Select value={fAnesPriv.theatreSpaceId} onValueChange={(v) => setFAnesPriv((p) => ({ ...p, theatreSpaceId: v === "__all__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="All Theatres" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Theatres</SelectItem>
                    {theatreSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From *</Label>
                <Input
                  type="date"
                  value={fAnesPriv.effectiveFrom}
                  onChange={(e) => setFAnesPriv((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To</Label>
                <Input
                  type="date"
                  value={fAnesPriv.effectiveTo}
                  onChange={(e) => setFAnesPriv((p) => ({ ...p, effectiveTo: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawer({ kind: "closed" })} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveAnesthetistPrivilege} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Grant Privilege
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Zone Access Drawer ---- */}
      <Dialog open={drawer.kind === "add-zone-access"} onOpenChange={(o) => !o && setDrawer({ kind: "closed" })}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>Add Zone Access Rule</DialogTitle>
            <DialogDescription>
              Define which roles may access a specific infection-control zone within a space.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Space *</Label>
                <Select value={fZone.spaceId} onValueChange={(v) => setFZone((p) => ({ ...p, spaceId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select space" /></SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({humanize(s.type)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Zone *</Label>
                <Select value={fZone.zone} onValueChange={(v) => setFZone((p) => ({ ...p, zone: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map((z) => (
                      <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Allowed Roles *</Label>
              <p className="mb-2 text-[11px] text-zc-muted">Select roles that may enter this zone.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STAFF_ROLES.map((r) => {
                  const checked = fZone.allowedRoles.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        checked
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "border-zc-border bg-zc-card text-zc-muted hover:bg-zc-panel/30",
                      )}
                      onClick={() => toggleZoneRole(r.value)}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawer({ kind: "closed" })} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveZoneAccess} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Min Staffing Rule Drawer (Add / Edit) ---- */}
      <Dialog open={drawer.kind === "add-staffing-rule" || drawer.kind === "edit-staffing-rule"} onOpenChange={(o) => !o && setDrawer({ kind: "closed" })}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>{drawer.kind === "edit-staffing-rule" ? "Edit Staffing Rule" : "Add Minimum Staffing Rule"}</DialogTitle>
            <DialogDescription>
              Define minimum staffing requirements per surgery category to ensure patient safety.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Surgery Category *</Label>
                <Select value={fStaffing.surgeryCategory} onValueChange={(v) => setFStaffing((p) => ({ ...p, surgeryCategory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {SURGERY_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Theatre (optional)</Label>
                <Select value={fStaffing.theatreSpaceId} onValueChange={(v) => setFStaffing((p) => ({ ...p, theatreSpaceId: v === "__all__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="All Theatres" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Theatres</SelectItem>
                    {theatreSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zc-muted">Minimum Staff Counts</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Surgeons</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minSurgeons} onChange={(e) => setFStaffing((p) => ({ ...p, minSurgeons: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Anesthetists</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minAnesthetists} onChange={(e) => setFStaffing((p) => ({ ...p, minAnesthetists: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Scrub Nurses</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minScrubNurses} onChange={(e) => setFStaffing((p) => ({ ...p, minScrubNurses: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Circulating Nurses</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minCirculatingNurses} onChange={(e) => setFStaffing((p) => ({ ...p, minCirculatingNurses: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">OT Technicians</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minOtTechnicians} onChange={(e) => setFStaffing((p) => ({ ...p, minOtTechnicians: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Anesthesia Technicians</Label>
                  <Input type="number" min={0} max={20} value={fStaffing.minAnesthesiaTechnicians} onChange={(e) => setFStaffing((p) => ({ ...p, minAnesthesiaTechnicians: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawer({ kind: "closed" })} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveStaffingRule} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {drawer.kind === "edit-staffing-rule" ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
