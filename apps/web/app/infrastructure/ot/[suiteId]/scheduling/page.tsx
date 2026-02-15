"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { IconPlus } from "@/components/icons";
import { Calendar, Pencil, Trash2 } from "lucide-react";

import type {
  OtSuiteRow,
  OtSurgeryDefaultRow,
  OtSchedulingRuleRow,
  OtEmergencyPolicyRow,
  OtCancellationPolicyRow,
  OtBookingApprovalRow,
  OtUtilizationTargetRow,
  OtRecoveryProtocolRow,
  OtNotificationRuleRow,
  OtSurgeryCategory,
  OtBookingApprovalMode,
} from "../../_shared/types";

import {
  SuiteContextBar,
  OtPageHeader,
  Field,
  StatBox,
  EmptyRow,
  ErrorAlert,
  ModalHeader,
  drawerClassName,
  NoBranchGuard,
  SectionHeader,
} from "../../_shared/components";

import {
  SURGERY_CATEGORIES,
  SESSION_TYPES,
  BOOKING_APPROVAL_MODES,
  DAY_NAMES,
  UTILIZATION_METRICS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CHANNELS,
} from "../../_shared/constants";

import { humanize, formatDuration } from "../../_shared/utils";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 07 — Scheduling Rules & Policies
   OTS-039 through OTS-046
   ========================================================= */

const API = "/api/infrastructure/ot/scheduling";

export default function SchedulingPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();
  return (
    <AppShell title="Scheduling Rules & Policies">
      <RequirePerm perm="ot.scheduling.read">
        {branchId ? <Content branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Main content ---- */

function Content({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const canWrite = hasPerm(useAuthStore.getState(), "ot.scheduling.write");
  const qs = `?branchId=${encodeURIComponent(branchId)}`;

  /* ---- state ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);

  const [surgeryDefaults, setSurgeryDefaults] = React.useState<OtSurgeryDefaultRow[]>([]);
  const [operatingHours, setOperatingHours] = React.useState<OtSchedulingRuleRow[]>([]);
  const [emergencyPolicy, setEmergencyPolicy] = React.useState<OtEmergencyPolicyRow | null>(null);
  const [cancellationPolicy, setCancellationPolicy] = React.useState<OtCancellationPolicyRow | null>(null);
  const [bookingApproval, setBookingApproval] = React.useState<OtBookingApprovalRow | null>(null);
  const [utilTargets, setUtilTargets] = React.useState<OtUtilizationTargetRow[]>([]);
  const [recoveryProtocols, setRecoveryProtocols] = React.useState<OtRecoveryProtocolRow[]>([]);
  const [notifRules, setNotifRules] = React.useState<OtNotificationRuleRow[]>([]);

  /* ---- drawer state ---- */
  type DrawerKind =
    | { kind: "surgeryDefault"; row?: OtSurgeryDefaultRow }
    | { kind: "operatingHour"; row?: OtSchedulingRuleRow }
    | { kind: "emergencyPolicy" }
    | { kind: "cancellationPolicy" }
    | { kind: "bookingApproval" }
    | { kind: "utilTarget"; row?: OtUtilizationTargetRow }
    | { kind: "recoveryProtocol"; row?: OtRecoveryProtocolRow }
    | { kind: "notifRule"; row?: OtNotificationRuleRow }
    | null;
  const [drawer, setDrawer] = React.useState<DrawerKind>(null);
  const [saving, setSaving] = React.useState(false);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-scheduling" });

  /* ---- load ---- */
  const load = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const base = `${API}/suites/${suiteId}`;
      const [suiteRes, sdRes, ohRes, epRes, cpRes, baRes, utRes, rpRes, nrRes] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
        apiFetch<OtSurgeryDefaultRow[]>(`${base}/surgery-defaults${qs}`),
        apiFetch<OtSchedulingRuleRow[]>(`${base}/operating-hours${qs}`),
        apiFetch<OtEmergencyPolicyRow>(`${base}/emergency-policy${qs}`),
        apiFetch<OtCancellationPolicyRow>(`${base}/cancellation-policy${qs}`),
        apiFetch<OtBookingApprovalRow>(`${base}/booking-approval${qs}`),
        apiFetch<OtUtilizationTargetRow[]>(`${base}/utilization-targets${qs}`),
        apiFetch<OtRecoveryProtocolRow[]>(`${base}/recovery-protocols${qs}`),
        apiFetch<OtNotificationRuleRow[]>(`${base}/notification-rules${qs}`),
      ]);

      if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
      else setError("Failed to load suite.");

      setSurgeryDefaults(sdRes.status === "fulfilled" ? safe(sdRes.value) : []);
      setOperatingHours(ohRes.status === "fulfilled" ? safe(ohRes.value) : []);
      setEmergencyPolicy(epRes.status === "fulfilled" && epRes.value && typeof epRes.value === "object" && "id" in epRes.value ? epRes.value : null);
      setCancellationPolicy(cpRes.status === "fulfilled" && cpRes.value && typeof cpRes.value === "object" && "id" in cpRes.value ? cpRes.value : null);
      setBookingApproval(baRes.status === "fulfilled" && baRes.value && typeof baRes.value === "object" && "id" in baRes.value ? baRes.value : null);
      setUtilTargets(utRes.status === "fulfilled" ? safe(utRes.value) : []);
      setRecoveryProtocols(rpRes.status === "fulfilled" ? safe(rpRes.value) : []);
      setNotifRules(nrRes.status === "fulfilled" ? safe(nrRes.value) : []);

      if (showToast) toast({ title: "Scheduling data refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load scheduling data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, qs, toast]);

  React.useEffect(() => { void load(false); }, [load]);

  /* ---- CRUD helpers ---- */
  async function saveSurgeryDefault(data: Record<string, any>, editId?: string) {
    setSaving(true);
    try {
      if (editId) {
        await apiFetch(`${API}/suites/${suiteId}/surgery-defaults${qs}`, { method: "POST", body: { ...data, id: editId } });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/surgery-defaults${qs}`, { method: "POST", body: data });
      }
      toast({ title: editId ? "Surgery default updated" : "Surgery default created" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveOperatingHour(data: Record<string, any>, editId?: string) {
    setSaving(true);
    try {
      if (editId) {
        await apiFetch(`${API}/operating-hours/${editId}${qs}`, { method: "PATCH", body: data });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/operating-hours${qs}`, { method: "POST", body: data });
      }
      toast({ title: editId ? "Operating hour updated" : "Operating hour created" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deleteOperatingHour(id: string) {
    try {
      await apiFetch(`${API}/operating-hours/${id}${qs}`, { method: "DELETE" });
      toast({ title: "Operating hour deleted" });
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
  }

  async function saveEmergencyPolicy(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/emergency-policy${qs}`, { method: "POST", body: data });
      toast({ title: "Emergency policy saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveCancellationPolicy(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/cancellation-policy${qs}`, { method: "POST", body: data });
      toast({ title: "Cancellation policy saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveBookingApproval(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/booking-approval${qs}`, { method: "POST", body: data });
      toast({ title: "Booking approval config saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveUtilTarget(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/utilization-targets${qs}`, { method: "POST", body: data });
      toast({ title: "Utilization target saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveRecoveryProtocol(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/recovery-protocols${qs}`, { method: "POST", body: data });
      toast({ title: "Recovery protocol saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function saveNotifRule(data: Record<string, any>) {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/notification-rules${qs}`, { method: "POST", body: data });
      toast({ title: "Notification rule saved" });
      setDrawer(null);
      void load();
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  /* ---- render ---- */
  return (
    <div className="grid gap-6">
      {/* 1. Context bar */}
      <SuiteContextBar suiteId={suiteId} suiteName={suite?.name} suiteCode={suite?.code} suiteStatus={suite?.status} />

      {/* 2. Page header */}
      <OtPageHeader
        icon={<Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        title="Scheduling Rules & Policies"
        description="Operating hours, surgery defaults, cancellation, booking approval, utilization targets, recovery protocols, and notifications."
        loading={loading}
        onRefresh={() => void load(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Stat overview */}
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatBox label="Surgery Defaults" value={surgeryDefaults.length} color="blue" />
        <StatBox label="Operating Hours" value={operatingHours.length} color="indigo" />
        <StatBox label="Emergency Policy" value={emergencyPolicy ? "Set" : "Not Set"} color="rose" />
        <StatBox label="Cancel Policy" value={cancellationPolicy ? "Set" : "Not Set"} color="amber" />
        <StatBox label="Booking Approval" value={bookingApproval ? "Set" : "Not Set"} color="violet" />
        <StatBox label="Util Targets" value={utilTargets.length} color="emerald" />
        <StatBox label="Recovery Protocols" value={recoveryProtocols.length} color="sky" />
        <StatBox label="Notif Rules" value={notifRules.length} color="blue" />
      </div>

      {/* 3. Surgery Category Defaults (OTS-039) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Surgery Category Defaults</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "surgeryDefault" })}>
              <IconPlus className="h-3.5 w-3.5" /> Add Default
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30 text-xs uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Min</th>
                  <th className="px-4 py-3 text-right font-semibold">Default</th>
                  <th className="px-4 py-3 text-right font-semibold">Max</th>
                  <th className="px-4 py-3 text-center font-semibold">ICU</th>
                  <th className="px-4 py-3 text-center font-semibold">Blood</th>
                  {canWrite && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {surgeryDefaults.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 7 : 6} loading={loading} message="No surgery defaults configured." />
                ) : (
                  surgeryDefaults.map((r) => (
                    <tr key={r.id} className="hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{humanize(r.category)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatDuration(r.minDurationMin)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatDuration(r.defaultDurationMin)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatDuration(r.maxDurationMin)}</td>
                      <td className="px-4 py-3 text-center">{r.requiresIcuBooking ? <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700">Yes</Badge> : <span className="text-zc-muted">No</span>}</td>
                      <td className="px-4 py-3 text-center">{r.requiresBloodReservation ? <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700">Yes</Badge> : <span className="text-zc-muted">No</span>}</td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: "surgeryDefault", row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Operating Hours (OTS-017 scheduling overview) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Operating Hours</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "operatingHour" })}>
              <IconPlus className="h-3.5 w-3.5" /> Add Slot
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30 text-xs uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3 text-left font-semibold">Day</th>
                  <th className="px-4 py-3 text-left font-semibold">Start</th>
                  <th className="px-4 py-3 text-left font-semibold">End</th>
                  <th className="px-4 py-3 text-left font-semibold">Session</th>
                  <th className="px-4 py-3 text-left font-semibold">Lunch</th>
                  <th className="px-4 py-3 text-left font-semibold">Specialty</th>
                  {canWrite && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {operatingHours.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 7 : 6} loading={loading} message="No operating hours configured." />
                ) : (
                  operatingHours.map((r) => (
                    <tr key={r.id} className="hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{DAY_NAMES[r.dayOfWeek] ?? r.dayOfWeek}</td>
                      <td className="px-4 py-3 tabular-nums">{r.startTime}</td>
                      <td className="px-4 py-3 tabular-nums">{r.endTime}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{humanize(r.sessionType)}</Badge></td>
                      <td className="px-4 py-3 tabular-nums text-zc-muted">{r.lunchStart && r.lunchEnd ? `${r.lunchStart} - ${r.lunchEnd}` : "\u2014"}</td>
                      <td className="px-4 py-3">{r.specialtyCode ? humanize(r.specialtyCode) : "\u2014"}</td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: "operatingHour", row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => void deleteOperatingHour(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Emergency Policy (OTS-019) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Emergency Policy</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "emergencyPolicy" })}>
              <Pencil className="h-3.5 w-3.5" /> {emergencyPolicy ? "Edit" : "Configure"}
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {emergencyPolicy ? (
            <div className="grid gap-4 md:grid-cols-3">
              <InfoItem label="Dedicated Emergency OT" value={emergencyPolicy.hasDedicatedEmergencyOt ? "Yes" : "No"} />
              <InfoItem label="Availability" value={humanize(emergencyPolicy.availability)} />
              <InfoItem label="Escalation Rule" value={emergencyPolicy.escalationRule} />
            </div>
          ) : (
            <p className="text-sm text-zc-muted">{loading ? "Loading..." : "Emergency policy not configured yet."}</p>
          )}
        </CardContent>
      </Card>

      {/* 6. Cancellation Policy (OTS-041) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Cancellation Policy</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "cancellationPolicy" })}>
              <Pencil className="h-3.5 w-3.5" /> {cancellationPolicy ? "Edit" : "Configure"}
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {cancellationPolicy ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="Min Notice (hrs)" value={String(cancellationPolicy.minNoticeHours)} />
              <InfoItem label="Authority" value={cancellationPolicy.cancellationAuthority.map(humanize).join(", ")} />
              <InfoItem label="Mandatory Reason" value={cancellationPolicy.mandatoryReasonRequired ? "Yes" : "No"} />
              <InfoItem label="Max Reschedules / Case" value={String(cancellationPolicy.maxReschedulesPerCase)} />
              <InfoItem label="Priority Boost on Reschedule" value={cancellationPolicy.priorityBoostOnReschedule ? "Yes" : "No"} />
              <InfoItem label="Auto-Notify Patient" value={cancellationPolicy.autoNotifyPatient ? "Yes" : "No"} />
            </div>
          ) : (
            <p className="text-sm text-zc-muted">{loading ? "Loading..." : "Cancellation policy not configured yet."}</p>
          )}
        </CardContent>
      </Card>

      {/* 7. Booking Approval Config (OTS-042) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Booking Approval Configuration</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "bookingApproval" })}>
              <Pencil className="h-3.5 w-3.5" /> {bookingApproval ? "Edit" : "Configure"}
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {bookingApproval ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              <InfoItem label="Default Mode" value={humanize(bookingApproval.defaultMode)} />
              <InfoItem label="Minor" value={bookingApproval.minorMode ? humanize(bookingApproval.minorMode) : "Default"} />
              <InfoItem label="Major" value={bookingApproval.majorMode ? humanize(bookingApproval.majorMode) : "Default"} />
              <InfoItem label="Complex" value={bookingApproval.complexMode ? humanize(bookingApproval.complexMode) : "Default"} />
              <InfoItem label="Emergency" value={bookingApproval.emergencyMode ? humanize(bookingApproval.emergencyMode) : "Default"} />
              {bookingApproval.approvalTimeoutHours != null && (
                <InfoItem label="Timeout (hrs)" value={String(bookingApproval.approvalTimeoutHours)} />
              )}
            </div>
          ) : (
            <p className="text-sm text-zc-muted">{loading ? "Loading..." : "Booking approval not configured yet."}</p>
          )}
        </CardContent>
      </Card>

      {/* 8. Utilization Targets (OTS-043) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Utilization Targets</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "utilTarget" })}>
              <IconPlus className="h-3.5 w-3.5" /> Add Target
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30 text-xs uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3 text-left font-semibold">Metric</th>
                  <th className="px-4 py-3 text-right font-semibold">Target</th>
                  <th className="px-4 py-3 text-right font-semibold">Alert Low</th>
                  <th className="px-4 py-3 text-right font-semibold">Alert High</th>
                  {canWrite && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {utilTargets.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 5 : 4} loading={loading} message="No utilization targets configured." />
                ) : (
                  utilTargets.map((r) => {
                    const metric = UTILIZATION_METRICS.find((m) => m.code === r.metricCode);
                    return (
                      <tr key={r.id} className="hover:bg-zc-panel/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{metric?.label ?? humanize(r.metricCode)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.targetValue}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zc-muted">{r.alertThresholdLow ?? "\u2014"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zc-muted">{r.alertThresholdHigh ?? "\u2014"}</td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: "utilTarget", row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 9. Recovery Protocols (OTS-044) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Recovery Protocols</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "recoveryProtocol" })}>
              <IconPlus className="h-3.5 w-3.5" /> Add Protocol
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30 text-xs uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Monitor Freq</th>
                  <th className="px-4 py-3 text-right font-semibold">Min Recovery</th>
                  <th className="px-4 py-3 text-right font-semibold">Discharge Score</th>
                  <th className="px-4 py-3 text-left font-semibold">Sign-off Role</th>
                  {canWrite && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {recoveryProtocols.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 6 : 5} loading={loading} message="No recovery protocols configured." />
                ) : (
                  recoveryProtocols.map((r) => (
                    <tr key={r.id} className="hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{humanize(r.surgeryCategory)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.monitoringFrequencyMin ? `${r.monitoringFrequencyMin}m` : "\u2014"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatDuration(r.minRecoveryDurationMin)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.dischargeScoreThreshold ?? "\u2014"}</td>
                      <td className="px-4 py-3">{r.dischargeSignOffRole ? humanize(r.dischargeSignOffRole) : "\u2014"}</td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: "recoveryProtocol", row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 10. Notification Rules (OTS-046) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Notification Rules</CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawer({ kind: "notifRule" })}>
              <IconPlus className="h-3.5 w-3.5" /> Add Rule
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30 text-xs uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3 text-left font-semibold">Event</th>
                  <th className="px-4 py-3 text-left font-semibold">Channels</th>
                  <th className="px-4 py-3 text-left font-semibold">Recipients</th>
                  <th className="px-4 py-3 text-left font-semibold">Timing</th>
                  {canWrite && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {notifRules.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 5 : 4} loading={loading} message="No notification rules configured." />
                ) : (
                  notifRules.map((r) => (
                    <tr key={r.id} className="hover:bg-zc-panel/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{humanize(r.eventType)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.channels.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.recipientRoles.map(humanize).join(", ")}</td>
                      <td className="px-4 py-3">{r.timing}</td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: "notifRule", row: r })}><Pencil className="h-3.5 w-3.5" /></Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---- Drawers ---- */}
      <Dialog open={drawer !== null} onOpenChange={(o) => { if (!o) setDrawer(null); }}>
        <DialogContent className={drawerClassName()}>
          {drawer?.kind === "surgeryDefault" && <SurgeryDefaultForm row={drawer.row} saving={saving} onSave={saveSurgeryDefault} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "operatingHour" && <OperatingHourForm row={drawer.row} saving={saving} onSave={saveOperatingHour} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "emergencyPolicy" && <EmergencyPolicyForm row={emergencyPolicy} saving={saving} onSave={saveEmergencyPolicy} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "cancellationPolicy" && <CancellationPolicyForm row={cancellationPolicy} saving={saving} onSave={saveCancellationPolicy} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "bookingApproval" && <BookingApprovalForm row={bookingApproval} saving={saving} onSave={saveBookingApproval} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "utilTarget" && <UtilTargetForm row={drawer.row} saving={saving} onSave={saveUtilTarget} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "recoveryProtocol" && <RecoveryProtocolForm row={drawer.row} saving={saving} onSave={saveRecoveryProtocol} onClose={() => setDrawer(null)} />}
          {drawer?.kind === "notifRule" && <NotifRuleForm row={drawer.row} saving={saving} onSave={saveNotifRule} onClose={() => setDrawer(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
   Drawer forms
   ========================================================= */

/* ---- Surgery Default Form (OTS-039) ---- */
function SurgeryDefaultForm({ row, saving, onSave, onClose }: { row?: OtSurgeryDefaultRow; saving: boolean; onSave: (d: any, id?: string) => void; onClose: () => void }) {
  const [category, setCategory] = React.useState<OtSurgeryCategory>(row?.category ?? "MINOR");
  const [minDur, setMinDur] = React.useState(String(row?.minDurationMin ?? ""));
  const [defDur, setDefDur] = React.useState(String(row?.defaultDurationMin ?? ""));
  const [maxDur, setMaxDur] = React.useState(String(row?.maxDurationMin ?? ""));
  const [icu, setIcu] = React.useState(row?.requiresIcuBooking ?? false);
  const [blood, setBlood] = React.useState(row?.requiresBloodReservation ?? false);

  return (
    <div className="grid gap-5">
      <ModalHeader title={row ? "Edit Surgery Default" : "Add Surgery Default"} onClose={onClose} />
      <Field label="Category" required>
        <Select value={category} onValueChange={(v) => setCategory(v as OtSurgeryCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SURGERY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Min Duration (min)" required><Input type="number" value={minDur} onChange={(e) => setMinDur(e.target.value)} /></Field>
        <Field label="Default Duration (min)" required><Input type="number" value={defDur} onChange={(e) => setDefDur(e.target.value)} /></Field>
        <Field label="Max Duration (min)" required><Input type="number" value={maxDur} onChange={(e) => setMaxDur(e.target.value)} /></Field>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><Switch checked={icu} onCheckedChange={setIcu} /> Requires ICU Booking</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={blood} onCheckedChange={setBlood} /> Requires Blood Reservation</label>
      </div>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || !minDur || !defDur || !maxDur} onClick={() => onSave({ category, minDurationMin: +minDur, defaultDurationMin: +defDur, maxDurationMin: +maxDur, requiresIcuBooking: icu, requiresBloodReservation: blood }, row?.id)}>
          {saving ? "Saving..." : row ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Operating Hour Form ---- */
function OperatingHourForm({ row, saving, onSave, onClose }: { row?: OtSchedulingRuleRow; saving: boolean; onSave: (d: any, id?: string) => void; onClose: () => void }) {
  const [dayOfWeek, setDayOfWeek] = React.useState(String(row?.dayOfWeek ?? "1"));
  const [startTime, setStartTime] = React.useState(row?.startTime ?? "08:00");
  const [endTime, setEndTime] = React.useState(row?.endTime ?? "17:00");
  const [sessionType, setSessionType] = React.useState(row?.sessionType ?? "ELECTIVE");
  const [lunchStart, setLunchStart] = React.useState(row?.lunchStart ?? "");
  const [lunchEnd, setLunchEnd] = React.useState(row?.lunchEnd ?? "");
  const [specialtyCode, setSpecialtyCode] = React.useState(row?.specialtyCode ?? "");

  return (
    <div className="grid gap-5">
      <ModalHeader title={row ? "Edit Operating Hour" : "Add Operating Hour"} onClose={onClose} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Day of Week" required>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Session Type" required>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SESSION_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Start Time" required><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
        <Field label="End Time" required><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Lunch Start"><Input type="time" value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} /></Field>
        <Field label="Lunch End"><Input type="time" value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} /></Field>
      </div>
      <Field label="Specialty Code" hint="Optional"><Input value={specialtyCode} onChange={(e) => setSpecialtyCode(e.target.value)} placeholder="e.g. ORTHO" /></Field>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || !startTime || !endTime} onClick={() => onSave({
          dayOfWeek: +dayOfWeek, startTime, endTime, sessionType,
          ...(lunchStart ? { lunchStart } : {}), ...(lunchEnd ? { lunchEnd } : {}),
          ...(specialtyCode ? { specialtyCode } : {}),
        }, row?.id)}>
          {saving ? "Saving..." : row ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Emergency Policy Form (OTS-019) ---- */
function EmergencyPolicyForm({ row, saving, onSave, onClose }: { row: OtEmergencyPolicyRow | null; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [dedicated, setDedicated] = React.useState(row?.hasDedicatedEmergencyOt ?? false);
  const [availability, setAvailability] = React.useState(row?.availability ?? "24X7");
  const [escalation, setEscalation] = React.useState(row?.escalationRule ?? "");

  return (
    <div className="grid gap-5">
      <ModalHeader title="Emergency Policy" onClose={onClose} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={dedicated} onCheckedChange={setDedicated} /> Has Dedicated Emergency OT</label>
      <Field label="Availability" required><Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. 24X7, BUSINESS_HOURS" /></Field>
      <Field label="Escalation Rule" required><Input value={escalation} onChange={(e) => setEscalation(e.target.value)} placeholder="e.g. Notify HOD within 15 min" /></Field>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || !availability || !escalation} onClick={() => onSave({ hasDedicatedEmergencyOt: dedicated, availability, escalationRule: escalation })}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Cancellation Policy Form (OTS-041) ---- */
function CancellationPolicyForm({ row, saving, onSave, onClose }: { row: OtCancellationPolicyRow | null; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [minNotice, setMinNotice] = React.useState(String(row?.minNoticeHours ?? "24"));
  const [authority, setAuthority] = React.useState(row?.cancellationAuthority?.join(", ") ?? "SURGEON, OT_IN_CHARGE");
  const [mandatoryReason, setMandatoryReason] = React.useState(row?.mandatoryReasonRequired ?? true);
  const [maxReschedules, setMaxReschedules] = React.useState(String(row?.maxReschedulesPerCase ?? "3"));
  const [priorityBoost, setPriorityBoost] = React.useState(row?.priorityBoostOnReschedule ?? false);
  const [autoNotify, setAutoNotify] = React.useState(row?.autoNotifyPatient ?? true);

  return (
    <div className="grid gap-5">
      <ModalHeader title="Cancellation Policy" onClose={onClose} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Min Notice Hours" required><Input type="number" value={minNotice} onChange={(e) => setMinNotice(e.target.value)} /></Field>
        <Field label="Max Reschedules per Case" required><Input type="number" value={maxReschedules} onChange={(e) => setMaxReschedules(e.target.value)} /></Field>
      </div>
      <Field label="Cancellation Authority" required hint="Comma-separated roles">
        <Input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="SURGEON, HOD, OT_IN_CHARGE" />
      </Field>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><Switch checked={mandatoryReason} onCheckedChange={setMandatoryReason} /> Mandatory Reason Required</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={priorityBoost} onCheckedChange={setPriorityBoost} /> Priority Boost on Reschedule</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={autoNotify} onCheckedChange={setAutoNotify} /> Auto-Notify Patient</label>
      </div>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || !minNotice} onClick={() => onSave({
          minNoticeHours: +minNotice,
          cancellationAuthority: authority.split(",").map((s) => s.trim()).filter(Boolean),
          mandatoryReasonRequired: mandatoryReason,
          maxReschedulesPerCase: +maxReschedules,
          priorityBoostOnReschedule: priorityBoost,
          autoNotifyPatient: autoNotify,
        })}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Booking Approval Form (OTS-042) ---- */
function BookingApprovalForm({ row, saving, onSave, onClose }: { row: OtBookingApprovalRow | null; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [defaultMode, setDefaultMode] = React.useState<OtBookingApprovalMode>(row?.defaultMode ?? "DIRECT");
  const [minorMode, setMinorMode] = React.useState<OtBookingApprovalMode>(row?.minorMode ?? "DIRECT");
  const [majorMode, setMajorMode] = React.useState<OtBookingApprovalMode>(row?.majorMode ?? "APPROVAL_REQUIRED");
  const [complexMode, setComplexMode] = React.useState<OtBookingApprovalMode>(row?.complexMode ?? "APPROVAL_REQUIRED");
  const [emergencyMode, setEmergencyMode] = React.useState<OtBookingApprovalMode>(row?.emergencyMode ?? "DIRECT");
  const [timeout, setTimeout] = React.useState(String(row?.approvalTimeoutHours ?? "24"));

  const modeSelect = (label: string, value: OtBookingApprovalMode, onChange: (v: OtBookingApprovalMode) => void) => (
    <Field label={label}>
      <Select value={value} onValueChange={(v) => onChange(v as OtBookingApprovalMode)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{BOOKING_APPROVAL_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );

  return (
    <div className="grid gap-5">
      <ModalHeader title="Booking Approval Configuration" onClose={onClose} />
      <div className="grid gap-4 md:grid-cols-2">
        {modeSelect("Default Mode", defaultMode, setDefaultMode)}
        <Field label="Approval Timeout (hrs)"><Input type="number" value={timeout} onChange={(e) => setTimeout(e.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modeSelect("Minor", minorMode, setMinorMode)}
        {modeSelect("Major", majorMode, setMajorMode)}
        {modeSelect("Complex", complexMode, setComplexMode)}
        {modeSelect("Emergency", emergencyMode, setEmergencyMode)}
      </div>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving} onClick={() => onSave({ defaultMode, minorMode, majorMode, complexMode, emergencyMode, approvalTimeoutHours: +timeout })}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Utilization Target Form (OTS-043) ---- */
function UtilTargetForm({ row, saving, onSave, onClose }: { row?: OtUtilizationTargetRow; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [metricCode, setMetricCode] = React.useState(row?.metricCode ?? UTILIZATION_METRICS[0].code);
  const [target, setTarget] = React.useState(String(row?.targetValue ?? ""));
  const [low, setLow] = React.useState(String(row?.alertThresholdLow ?? ""));
  const [high, setHigh] = React.useState(String(row?.alertThresholdHigh ?? ""));

  return (
    <div className="grid gap-5">
      <ModalHeader title={row ? "Edit Utilization Target" : "Add Utilization Target"} onClose={onClose} />
      <Field label="Metric" required>
        <Select value={metricCode} onValueChange={setMetricCode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{UTILIZATION_METRICS.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Target Value" required><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label="Alert Low"><Input type="number" value={low} onChange={(e) => setLow(e.target.value)} /></Field>
        <Field label="Alert High"><Input type="number" value={high} onChange={(e) => setHigh(e.target.value)} /></Field>
      </div>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || !target} onClick={() => onSave({
          metricCode, targetValue: +target,
          ...(low ? { alertThresholdLow: +low } : {}),
          ...(high ? { alertThresholdHigh: +high } : {}),
        })}>
          {saving ? "Saving..." : row ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Recovery Protocol Form (OTS-044) ---- */
function RecoveryProtocolForm({ row, saving, onSave, onClose }: { row?: OtRecoveryProtocolRow; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [category, setCategory] = React.useState<OtSurgeryCategory>(row?.surgeryCategory ?? "MINOR");
  const [monitorFreq, setMonitorFreq] = React.useState(String(row?.monitoringFrequencyMin ?? ""));
  const [minRecovery, setMinRecovery] = React.useState(String(row?.minRecoveryDurationMin ?? ""));
  const [dischargeScore, setDischargeScore] = React.useState(String(row?.dischargeScoreThreshold ?? ""));
  const [signOffRole, setSignOffRole] = React.useState(row?.dischargeSignOffRole ?? "");

  return (
    <div className="grid gap-5">
      <ModalHeader title={row ? "Edit Recovery Protocol" : "Add Recovery Protocol"} onClose={onClose} />
      <Field label="Surgery Category" required>
        <Select value={category} onValueChange={(v) => setCategory(v as OtSurgeryCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SURGERY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Monitoring Frequency (min)"><Input type="number" value={monitorFreq} onChange={(e) => setMonitorFreq(e.target.value)} /></Field>
        <Field label="Min Recovery Duration (min)"><Input type="number" value={minRecovery} onChange={(e) => setMinRecovery(e.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Discharge Score Threshold"><Input type="number" value={dischargeScore} onChange={(e) => setDischargeScore(e.target.value)} /></Field>
        <Field label="Discharge Sign-off Role"><Input value={signOffRole} onChange={(e) => setSignOffRole(e.target.value)} placeholder="e.g. RECOVERY_NURSE" /></Field>
      </div>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving} onClick={() => onSave({
          surgeryCategory: category,
          ...(monitorFreq ? { monitoringFrequencyMin: +monitorFreq } : {}),
          ...(minRecovery ? { minRecoveryDurationMin: +minRecovery } : {}),
          ...(dischargeScore ? { dischargeScoreThreshold: +dischargeScore } : {}),
          ...(signOffRole ? { dischargeSignOffRole: signOffRole } : {}),
        })}>
          {saving ? "Saving..." : row ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Notification Rule Form (OTS-046) ---- */
function NotifRuleForm({ row, saving, onSave, onClose }: { row?: OtNotificationRuleRow; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [eventType, setEventType] = React.useState(row?.eventType ?? NOTIFICATION_EVENT_TYPES[0]);
  const [channels, setChannels] = React.useState<string[]>(row?.channels ?? []);
  const [recipients, setRecipients] = React.useState(row?.recipientRoles?.join(", ") ?? "");
  const [timing, setTiming] = React.useState(row?.timing ?? "IMMEDIATE");

  const toggleChannel = (ch: string) => {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  return (
    <div className="grid gap-5">
      <ModalHeader title={row ? "Edit Notification Rule" : "Add Notification Rule"} onClose={onClose} />
      <Field label="Event Type" required>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{NOTIFICATION_EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{humanize(e)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Channels" required>
        <div className="flex flex-wrap gap-3">
          {NOTIFICATION_CHANNELS.map((ch) => (
            <label key={ch} className="flex items-center gap-2 text-sm">
              <Switch checked={channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
              {ch}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Recipient Roles" required hint="Comma-separated">
        <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="SURGEON, OT_IN_CHARGE, ANESTHETIST" />
      </Field>
      <Field label="Timing" required>
        <Input value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="IMMEDIATE, BEFORE_30_MIN, etc." />
      </Field>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving || channels.length === 0 || !recipients || !timing} onClick={() => onSave({
          eventType,
          channels,
          recipientRoles: recipients.split(",").map((s) => s.trim()).filter(Boolean),
          timing,
        })}>
          {saving ? "Saving..." : row ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* =========================================================
   Small helpers
   ========================================================= */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{label}</div>
      <div className="mt-1 text-sm text-zc-text">{value}</div>
    </div>
  );
}

function safe<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}
