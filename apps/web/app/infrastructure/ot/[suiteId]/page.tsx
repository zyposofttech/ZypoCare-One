"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { IconPlus } from "@/components/icons";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck,
  Hospital, Loader2, Pencil, Plus, RefreshCw, Shield,
  Stethoscope, Trash2, Users, Warehouse, Calendar, DollarSign,
  Activity, FileCheck, Settings2, ChevronRight, X,
} from "lucide-react";

// ---- Helpers ----

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

function statusBadge(status?: string | null) {
  const s = (status || "DRAFT").toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (s === "READY") return <Badge variant="success">Ready</Badge>;
  if (s === "MAINTENANCE") return <Badge variant="warning">Maintenance</Badge>;
  if (s === "ARCHIVED") return <Badge variant="secondary">Archived</Badge>;
  if (s === "BOOKED" || s === "IN_USE") return <Badge variant="info">{s.replace("_", " ")}</Badge>;
  return <Badge variant="accent">Draft</Badge>;
}

function readinessBadge(score?: number | null) {
  if (score == null) return <Badge variant="secondary">Not Validated</Badge>;
  if (score >= 100) return <Badge variant="success">{score}%</Badge>;
  if (score >= 70) return <Badge variant="warning">{score}%</Badge>;
  return <Badge variant="destructive">{score}%</Badge>;
}

const SPACE_TYPES = [
  { value: "THEATRE", label: "Theatre" },
  { value: "RECOVERY_BAY", label: "Recovery Bay" },
  { value: "PREOP_HOLDING", label: "Pre-Op Holding" },
  { value: "INDUCTION_ROOM", label: "Induction Room" },
  { value: "SCRUB_ROOM", label: "Scrub Room" },
  { value: "STERILE_STORE", label: "Sterile Store" },
  { value: "ANESTHESIA_STORE", label: "Anesthesia Store" },
  { value: "EQUIPMENT_STORE", label: "Equipment Store" },
  { value: "STAFF_CHANGE", label: "Staff Changing" },
  { value: "OTHER", label: "Other" },
];

const EQUIPMENT_CATEGORIES = [
  "ANESTHESIA_MACHINE", "AIRWAY_MANAGEMENT", "VENTILATION_RESPIRATORY",
  "PATIENT_MONITORING", "HEMODYNAMIC_MONITORING", "SURGICAL_INSTRUMENTS",
  "OR_FURNITURE", "OR_LIGHTING", "ELECTROSURGERY_ENERGY", "ENDOSCOPY_LAPAROSCOPY",
  "IMAGING_INTRAOP", "STERILIZATION_CSSD", "DISINFECTION_CLEANING",
  "STERILE_STORAGE_PACKAGING", "MEDICAL_GASES", "SUCTION_SYSTEMS",
  "POWER_BACKUP", "PATIENT_WARMING", "DVT_PROPHYLAXIS", "SAFETY_EMERGENCY",
  "RECOVERY_PACU_EQUIPMENT", "IT_AV_EQUIPMENT", "CONSUMABLES_DISPOSABLES", "OTHER",
];

const STAFF_ROLES = [
  "OT_IN_CHARGE", "OT_TECHNICIAN", "SCRUB_NURSE", "CIRCULATING_NURSE",
  "RECOVERY_NURSE", "OT_ATTENDANT", "HOUSEKEEPING", "ANESTHESIA_TECHNICIAN",
];

const SURGERY_CATEGORIES = ["MINOR", "MAJOR", "COMPLEX", "DAYCARE"];

const ZONE_TYPES = ["UNRESTRICTED", "SEMI_RESTRICTED", "RESTRICTED"];

const CHARGE_COMPONENT_TYPES = [
  "THEATRE_CHARGE", "ANESTHESIA_CHARGE", "SURGEON_FEE",
  "ASSISTANT_SURGEON_FEE", "MATERIAL_CHARGE", "IMPLANT_CHARGE", "MONITORING_CHARGE",
];

const CHARGE_MODELS = ["PER_HOUR", "PER_SLAB", "FLAT"];

const CHECKLIST_PHASES = ["SIGN_IN", "TIME_OUT", "SIGN_OUT", "PRE_OP", "SPECIALTY"];

const COMPLIANCE_CONFIG_TYPES = [
  "WHO_CHECKLIST", "INFECTION_ZONE", "FUMIGATION",
  "BIOMEDICAL_WASTE", "FIRE_SAFETY", "SSI_SURVEILLANCE",
];

function spaceTypeLabel(type: string) {
  return SPACE_TYPES.find((t) => t.value === type)?.label ?? type;
}

function spaceTypeBadge(type: string) {
  if (type === "THEATRE") return <Badge variant="info">Theatre</Badge>;
  if (type === "RECOVERY_BAY") return <Badge variant="accent">Recovery</Badge>;
  if (type === "SCRUB_ROOM" || type === "PREOP_HOLDING" || type === "INDUCTION_ROOM") return <Badge variant="warning">{spaceTypeLabel(type)}</Badge>;
  return <Badge variant="secondary">{spaceTypeLabel(type)}</Badge>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{title}</div>
  );
}

function StatCard({ label, value, color, onClick }: { label: string; value: string | number; color: string; onClick?: () => void }) {
  const cls = `rounded-xl border border-${color}-200 bg-${color}-50/50 p-3 dark:border-${color}-900/50 dark:bg-${color}-900/10`;
  return (
    <div className={cn(cls, onClick && "cursor-pointer hover:ring-1 hover:ring-offset-1")} onClick={onClick}>
      <div className={`text-xs font-medium text-${color}-600 dark:text-${color}-400`}>{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums text-${color}-700 dark:text-${color}-300`}>{value}</div>
    </div>
  );
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-zc-muted">{msg}</td>
    </tr>
  );
}

// ---- Main Component ----

export default function OtSuiteDetailPage({ params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const canUpdate = hasPerm(user, "ot.suite.update");
  const canCreateSpace = hasPerm(user, "ot.space.create");
  const canCreateEquip = hasPerm(user, "ot.equipment.create");

  const [tab, setTab] = React.useState("overview");
  const [loading, setLoading] = React.useState(false);
  const [suite, setSuite] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Tab-level data caches
  const [staffData, setStaffData] = React.useState<any>(null);
  const [storeData, setStoreData] = React.useState<any>(null);
  const [schedulingData, setSchedulingData] = React.useState<any>(null);
  const [billingData, setBillingData] = React.useState<any>(null);
  const [complianceData, setComplianceData] = React.useState<any>(null);
  const [validationData, setValidationData] = React.useState<any>(null);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerMode, setDrawerMode] = React.useState<string>("");
  const [drawerForm, setDrawerForm] = React.useState<any>({});
  const [saving, setSaving] = React.useState(false);

  // ---- Fetch suite ----
  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(`/api/infrastructure/ot/suites/${suiteId}`);
      setSuite(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load OT Suite");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void refresh(); }, [suiteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Tab data loaders ----
  async function loadStaffData() {
    try {
      const [assignments, surgeonPriv, anesthetistPriv, zones, staffingRules, gaps] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/assignments`),
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/surgeon-privileges`),
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/anesthetist-privileges`),
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/zone-access`),
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/min-staffing-rules`),
        apiFetch(`/api/infrastructure/ot/staff/suites/${suiteId}/privilege-gaps`),
      ]);
      setStaffData({ assignments, surgeonPriv, anesthetistPriv, zones, staffingRules, gaps });
    } catch { /* silent */ }
  }

  async function loadStoreData() {
    try {
      const [storeLinks, consumables, implantRules, parLevels] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/store/suites/${suiteId}/store-links`),
        apiFetch(`/api/infrastructure/ot/store/suites/${suiteId}/consumable-templates`),
        apiFetch(`/api/infrastructure/ot/store/suites/${suiteId}/implant-rules`),
        apiFetch(`/api/infrastructure/ot/store/suites/${suiteId}/par-levels`),
      ]);
      setStoreData({ storeLinks, consumables, implantRules, parLevels });
    } catch { /* silent */ }
  }

  async function loadSchedulingData() {
    try {
      const [hours, emergency, surgeryDefaults, cancellation, booking, targets, recovery, notifications] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/operating-hours`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/emergency-policy`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/surgery-defaults`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/cancellation-policy`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/booking-approval`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/utilization-targets`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/recovery-protocols`),
        apiFetch(`/api/infrastructure/ot/scheduling/suites/${suiteId}/notification-rules`),
      ]);
      setSchedulingData({ hours, emergency, surgeryDefaults, cancellation, booking, targets, recovery, notifications });
    } catch { /* silent */ }
  }

  async function loadBillingData() {
    try {
      const [serviceLinks, chargeComponents, completeness] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/billing/suites/${suiteId}/service-links`),
        apiFetch(`/api/infrastructure/ot/billing/suites/${suiteId}/charge-components`),
        apiFetch(`/api/infrastructure/ot/billing/suites/${suiteId}/billing-completeness`),
      ]);
      setBillingData({ serviceLinks, chargeComponents, completeness });
    } catch { /* silent */ }
  }

  async function loadComplianceData() {
    try {
      const [checklists, configs, nabh] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/compliance/suites/${suiteId}/checklist-templates`),
        apiFetch(`/api/infrastructure/ot/compliance/suites/${suiteId}/compliance-configs`),
        apiFetch(`/api/infrastructure/ot/compliance/suites/${suiteId}/nabh-validation`),
      ]);
      setComplianceData({ checklists, configs, nabh });
    } catch { /* silent */ }
  }

  async function loadValidationData() {
    try {
      const [goLive, reviewHistory] = await Promise.all([
        apiFetch(`/api/infrastructure/ot/validation/suites/${suiteId}/go-live`),
        apiFetch(`/api/infrastructure/ot/validation/suites/${suiteId}/review-history`),
      ]);
      setValidationData({ goLive, reviewHistory });
    } catch { /* silent */ }
  }

  // Lazy load tab data
  React.useEffect(() => {
    if (tab === "staff" && !staffData) void loadStaffData();
    if (tab === "store" && !storeData) void loadStoreData();
    if (tab === "scheduling" && !schedulingData) void loadSchedulingData();
    if (tab === "billing" && !billingData) void loadBillingData();
    if (tab === "compliance" && !complianceData) void loadComplianceData();
    if (tab === "validation" && !validationData) void loadValidationData();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Generic drawer save ----
  async function handleDrawerSave() {
    setSaving(true);
    try {
      const { _url, _method, _refresh, ...body } = drawerForm;
      await apiFetch(_url, { method: _method || "POST", body: JSON.stringify(body) });
      toast({ title: "Saved", description: "Changes saved successfully." });
      setDrawerOpen(false);
      // Refresh relevant data
      if (_refresh === "suite") await refresh();
      if (_refresh === "staff") { setStaffData(null); await loadStaffData(); }
      if (_refresh === "store") { setStoreData(null); await loadStoreData(); }
      if (_refresh === "scheduling") { setSchedulingData(null); await loadSchedulingData(); }
      if (_refresh === "billing") { setBillingData(null); await loadBillingData(); }
      if (_refresh === "compliance") { setComplianceData(null); await loadComplianceData(); }
      if (_refresh === "validation") { setValidationData(null); await loadValidationData(); }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(url: string, refreshKey: string) {
    try {
      await apiFetch(url, { method: "DELETE" });
      toast({ title: "Deleted", description: "Item removed." });
      if (refreshKey === "suite") await refresh();
      if (refreshKey === "staff") { setStaffData(null); await loadStaffData(); }
      if (refreshKey === "store") { setStoreData(null); await loadStoreData(); }
      if (refreshKey === "billing") { setBillingData(null); await loadBillingData(); }
      if (refreshKey === "compliance") { setComplianceData(null); await loadComplianceData(); }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    }
  }

  // ---- Quick actions ----
  async function handleSubmitReview() {
    try {
      await apiFetch(`/api/infrastructure/ot/validation/suites/${suiteId}/submit-review`, { method: "POST" });
      toast({ title: "Submitted for Review" });
      await refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e?.message || "Unknown error" });
    }
  }

  async function handleActivate() {
    try {
      await apiFetch(`/api/infrastructure/ot/validation/suites/${suiteId}/activate`, { method: "POST" });
      toast({ title: "Suite Activated", description: "OT Suite is now active." });
      await refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Activation failed", description: e?.message || "Unknown error" });
    }
  }

  if (!suite && loading) {
    return (
      <AppShell title="OT Suite">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
      </AppShell>
    );
  }

  if (err || !suite) {
    return (
      <AppShell title="OT Suite">
        <div className="grid gap-4 py-10 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-[rgb(var(--zc-danger))]" />
          <div className="text-sm text-zc-muted">{err || "Suite not found"}</div>
          <Button variant="outline" onClick={() => router.push("/infrastructure/ot")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to OT Suites
          </Button>
        </div>
      </AppShell>
    );
  }

  const spaces = (suite.spaces ?? []).filter((s: any) => s.isActive);
  const theatres = spaces.filter((s: any) => s.type === "THEATRE" && s.theatre);
  const recoveryBays = spaces.filter((s: any) => s.type === "RECOVERY_BAY");
  const equipment = (suite.equipment ?? []).filter((e: any) => e.isActive);

  // ---- Render ----
  return (
    <AppShell title={suite.name}>
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/infrastructure/ot")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Hospital className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tracking-tight">{suite.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{suite.code}</Badge>
                {statusBadge(suite.status)}
                {readinessBadge(suite.lastValidationScore)}
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Suite configuration — manage theatres, staff, scheduling, billing, and compliance
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
            </Button>
            {suite.status === "draft" && canUpdate ? (
              <Button variant="outline" className="gap-2" onClick={handleSubmitReview}>
                <FileCheck className="h-4 w-4" /> Submit for Review
              </Button>
            ) : null}
            {canUpdate ? (
              <Button variant="primary" className="gap-2" onClick={handleActivate}>
                <CheckCircle2 className="h-4 w-4" /> Activate
              </Button>
            ) : null}
          </div>
        </div>

        {/* Progress Bar */}
        {suite.lastValidationScore != null ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zc-muted">
              <span>Setup Progress</span>
              <span className="font-semibold tabular-nums">{suite.lastValidationScore}%</span>
            </div>
            <div className="h-2 rounded-full bg-zc-panel/30">
              <div
                className={cn("h-2 rounded-full transition-all", suite.lastValidationScore >= 100 ? "bg-emerald-500" : suite.lastValidationScore >= 70 ? "bg-amber-500" : "bg-red-500")}
                style={{ width: `${Math.min(100, suite.lastValidationScore)}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="spaces" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Spaces</TabsTrigger>
            <TabsTrigger value="theatres" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" />Theatres</TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1.5"><Warehouse className="h-3.5 w-3.5" />Equipment</TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5"><Users className="h-3.5 w-3.5" />Staff & Access</TabsTrigger>
            <TabsTrigger value="store" className="gap-1.5"><Warehouse className="h-3.5 w-3.5" />Store</TabsTrigger>
            <TabsTrigger value="scheduling" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Scheduling</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Billing</TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Compliance</TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" />Validation</TabsTrigger>
          </TabsList>

          {/* ======== TAB 1: OVERVIEW ======== */}
          <TabsContent value="overview" className="grid gap-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10" onClick={() => setTab("spaces")}>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Spaces</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">{spaces.length}</div>
              </div>
              <div className="cursor-pointer rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10" onClick={() => setTab("theatres")}>
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Theatres</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-sky-700 dark:text-sky-300">{theatres.length}</div>
              </div>
              <div className="cursor-pointer rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10" onClick={() => setTab("equipment")}>
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Equipment</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-violet-700 dark:text-violet-300">{equipment.length}</div>
              </div>
              <div className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10" onClick={() => setTab("validation")}>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Readiness</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{suite.lastValidationScore != null ? `${suite.lastValidationScore}%` : "—"}</div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-zc-muted">Status</span>{statusBadge(suite.status)}</div>
                <div className="flex justify-between"><span className="text-zc-muted">Review Status</span><span>{suite.reviewStatus ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-zc-muted">Activated At</span><span>{suite.activatedAt ? new Date(suite.activatedAt).toLocaleDateString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-zc-muted">Recovery Bays</span><span className="tabular-nums">{recoveryBays.length}</span></div>
                <div className="flex justify-between"><span className="text-zc-muted">Created</span><span>{suite.createdAt ? new Date(suite.createdAt).toLocaleDateString() : "—"}</span></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== TAB 2: SPACES ======== */}
          <TabsContent value="spaces" className="grid gap-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Spaces ({spaces.length})</div>
              {canCreateSpace ? (
                <Button variant="primary" className="gap-2" onClick={() => {
                  setDrawerMode("add-space");
                  setDrawerForm({ _url: `/api/infrastructure/ot/suites/${suiteId}/spaces`, _method: "POST", _refresh: "suite", code: "", name: "", type: "THEATRE", notes: "", createDefaultTable: true });
                  setDrawerOpen(true);
                }}>
                  <Plus className="h-4 w-4" /> Add Space
                </Button>
              ) : null}
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Code</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Details</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!spaces.length ? <EmptyRow cols={5} msg="No spaces configured. Add theatres, recovery bays, and support rooms." /> : spaces.map((s: any) => (
                      <tr key={s.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{s.code}</td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3">{spaceTypeBadge(s.type)}</td>
                        <td className="px-4 py-3 text-xs text-zc-muted">
                          {s.type === "THEATRE" && s.theatre ? `${s.theatre.tables?.filter((t: any) => t.isActive)?.length ?? 0} tables` : null}
                          {s.type === "RECOVERY_BAY" && s.recoveryBay ? `${s.recoveryBay.bedCount} beds, ${s.recoveryBay.monitorCount} monitors` : null}
                          {s.notes || ""}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/spaces/${s.id}`, "suite")}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ======== TAB 3: THEATRES ======== */}
          <TabsContent value="theatres" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Theatres ({theatres.length})</div>
            {!theatres.length ? (
              <Card><CardContent className="py-8 text-center text-sm text-zc-muted">No theatres configured. Add a Theatre space first.</CardContent></Card>
            ) : theatres.map((space: any) => {
              const th = space.theatre;
              return (
                <Card key={space.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{space.name} <Badge variant="outline" className="ml-2 font-mono text-xs">{space.code}</Badge></CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setDrawerMode("theatre-engineering");
                          setDrawerForm({ _url: `/api/infrastructure/ot/theatres/${th.id}/engineering-specs`, _method: "PATCH", _refresh: "suite", area: th.area ?? "", ceilingHeight: th.ceilingHeight ?? "", gasO2: th.gasO2, gasN2O: th.gasN2O, gasAir: th.gasAir, gasVacuum: th.gasVacuum, tempMin: th.tempMin ?? "", tempMax: th.tempMax ?? "", luxLevel: th.luxLevel ?? "", isoClass: th.isoClass ?? "" });
                          setDrawerOpen(true);
                        }}>Engineering</Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setDrawerMode("theatre-specialties");
                          setDrawerForm({ _url: `/api/infrastructure/ot/theatres/${th.id}/specialties`, _method: "PATCH", _refresh: "suite", specialtyCodes: (th.specialtyCodes ?? []).join(", ") });
                          setDrawerOpen(true);
                        }}>Specialties</Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setDrawerMode("theatre-scheduling");
                          setDrawerForm({ _url: `/api/infrastructure/ot/theatres/${th.id}/scheduling-params`, _method: "PATCH", _refresh: "suite", turnaroundTimeMin: th.turnaroundTimeMin, cleaningTimeMin: th.cleaningTimeMin, maxCasesPerDay: th.maxCasesPerDay, defaultSlotMinor: th.defaultSlotMinor, defaultSlotMajor: th.defaultSlotMajor, defaultSlotComplex: th.defaultSlotComplex, isEmergencyEligible: th.isEmergencyEligible });
                          setDrawerOpen(true);
                        }}>Scheduling</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div><span className="text-zc-muted">Type:</span> {th.theatreType}</div>
                      <div><span className="text-zc-muted">Airflow:</span> {th.airflow}</div>
                      <div><span className="text-zc-muted">Pressure:</span> {th.pressure}</div>
                      <div><span className="text-zc-muted">ISO Class:</span> {th.isoClass || "—"}</div>
                      <div><span className="text-zc-muted">Area:</span> {th.area ? `${th.area} sqm` : "—"}</div>
                      <div><span className="text-zc-muted">Specialties:</span> {(th.specialtyCodes ?? []).join(", ") || "—"}</div>
                      <div><span className="text-zc-muted">Turnaround:</span> {th.turnaroundTimeMin}min</div>
                      <div><span className="text-zc-muted">Max Cases/Day:</span> {th.maxCasesPerDay}</div>
                      <div><span className="text-zc-muted">Emergency:</span> {th.isEmergencyEligible ? "Yes" : "No"}</div>
                    </div>
                    {/* Tables sub-section */}
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-zc-muted">Tables ({(th.tables ?? []).filter((t: any) => t.isActive).length})</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(th.tables ?? []).filter((t: any) => t.isActive).map((t: any) => (
                          <Badge key={t.id} variant={t.isPrimary ? "info" : "outline"}>{t.code} — {t.name}{t.isPrimary ? " (Primary)" : ""}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ======== TAB 4: EQUIPMENT ======== */}
          <TabsContent value="equipment" className="grid gap-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Equipment ({equipment.length})</div>
              {canCreateEquip ? (
                <Button variant="primary" className="gap-2" onClick={() => {
                  setDrawerMode("add-equipment");
                  setDrawerForm({ _url: `/api/infrastructure/ot/suites/${suiteId}/equipment`, _method: "POST", _refresh: "suite", name: "", category: "OTHER", qty: 1, spaceId: "", manufacturer: "", model: "", serialNo: "" });
                  setDrawerOpen(true);
                }}>
                  <Plus className="h-4 w-4" /> Add Equipment
                </Button>
              ) : null}
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold">Space</th>
                      <th className="px-4 py-3 text-left font-semibold">Manufacturer</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!equipment.length ? <EmptyRow cols={6} msg="No equipment linked. Add equipment to theatres and spaces." /> : equipment.map((e: any) => {
                      const spaceName = spaces.find((s: any) => s.id === e.spaceId)?.name ?? "—";
                      return (
                        <tr key={e.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                          <td className="px-4 py-3 font-medium">{e.name}</td>
                          <td className="px-4 py-3 text-xs">{e.category.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-center tabular-nums">{e.qty}</td>
                          <td className="px-4 py-3 text-xs text-zc-muted">{spaceName}</td>
                          <td className="px-4 py-3 text-xs text-zc-muted">{e.manufacturer || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/equipment/${e.id}`, "suite")}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ======== TAB 5: STAFF & ACCESS ======== */}
          <TabsContent value="staff" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Staff & Access</div>

            {/* Privilege Gaps Alert */}
            {staffData?.gaps?.hasGaps ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>{staffData.gaps.gaps.length} privilege gap(s) detected — some theatres lack surgeon/anesthetist privileges.</div>
              </div>
            ) : null}

            {/* Staff Assignments */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Staff Assignments</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-staff");
                  setDrawerForm({ _url: `/api/infrastructure/ot/staff/suites/${suiteId}/assignments`, _method: "POST", _refresh: "staff", staffId: "", role: "OT_TECHNICIAN", defaultShift: "" });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Staff ID</th><th className="px-4 py-2 text-left font-semibold">Role</th><th className="px-4 py-2 text-left font-semibold">Shift</th><th className="px-4 py-2 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {!(staffData?.assignments as any[])?.length ? <EmptyRow cols={4} msg="No staff assigned." /> : (staffData.assignments as any[]).map((a: any) => (
                      <tr key={a.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-2 font-mono text-xs">{a.staffId}</td>
                        <td className="px-4 py-2 text-xs">{a.role.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 text-xs text-zc-muted">{a.defaultShift || "—"}</td>
                        <td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/staff/assignments/${a.id}`, "staff")}><Trash2 className="h-3 w-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Surgeon Privileges */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Surgeon Privileges</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-surgeon");
                  setDrawerForm({ _url: `/api/infrastructure/ot/staff/suites/${suiteId}/surgeon-privileges`, _method: "POST", _refresh: "staff", staffId: "", specialtyCode: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Surgeon</th><th className="px-4 py-2 text-left font-semibold">Specialty</th><th className="px-4 py-2 text-left font-semibold">From</th><th className="px-4 py-2 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {!(staffData?.surgeonPriv as any[])?.length ? <EmptyRow cols={4} msg="No surgeon privileges configured." /> : (staffData.surgeonPriv as any[]).map((p: any) => (
                      <tr key={p.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-2 font-mono text-xs">{p.staffId}</td>
                        <td className="px-4 py-2 text-xs">{p.specialtyCode}</td>
                        <td className="px-4 py-2 text-xs text-zc-muted">{new Date(p.effectiveFrom).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/staff/surgeon-privileges/${p.id}`, "staff")}><Trash2 className="h-3 w-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Anesthetist Privileges */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Anesthetist Privileges</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-anesthetist");
                  setDrawerForm({ _url: `/api/infrastructure/ot/staff/suites/${suiteId}/anesthetist-privileges`, _method: "POST", _refresh: "staff", staffId: "", concurrentCaseLimit: 1, effectiveFrom: new Date().toISOString().slice(0, 10) });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Anesthetist</th><th className="px-4 py-2 text-center font-semibold">Concurrent Limit</th><th className="px-4 py-2 text-left font-semibold">From</th><th className="px-4 py-2 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {!(staffData?.anesthetistPriv as any[])?.length ? <EmptyRow cols={4} msg="No anesthetist privileges configured." /> : (staffData.anesthetistPriv as any[]).map((p: any) => (
                      <tr key={p.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-2 font-mono text-xs">{p.staffId}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{p.concurrentCaseLimit}</td>
                        <td className="px-4 py-2 text-xs text-zc-muted">{new Date(p.effectiveFrom).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/staff/anesthetist-privileges/${p.id}`, "staff")}><Trash2 className="h-3 w-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Min Staffing Rules */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Min Staffing Rules</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-staffing-rule");
                  setDrawerForm({ _url: `/api/infrastructure/ot/staff/suites/${suiteId}/min-staffing-rules`, _method: "POST", _refresh: "staff", surgeryCategory: "MAJOR", minSurgeons: 1, minAnesthetists: 1, minScrubNurses: 1, minCirculatingNurses: 1 });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Category</th><th className="px-4 py-2 text-center font-semibold">Surgeons</th><th className="px-4 py-2 text-center font-semibold">Anesthetists</th><th className="px-4 py-2 text-center font-semibold">Scrub Nurses</th><th className="px-4 py-2 text-center font-semibold">Circulating</th></tr></thead>
                  <tbody>
                    {!(staffData?.staffingRules as any[])?.length ? <EmptyRow cols={5} msg="No staffing rules defined." /> : (staffData.staffingRules as any[]).map((r: any) => (
                      <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-2 text-xs font-medium">{r.surgeryCategory}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{r.minSurgeons}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{r.minAnesthetists}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{r.minScrubNurses}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{r.minCirculatingNurses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ======== TAB 6: STORE & CONSUMABLES ======== */}
          <TabsContent value="store" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Store & Consumables</div>

            {/* Store Links */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Store Links</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-store-link");
                  setDrawerForm({ _url: `/api/infrastructure/ot/store/suites/${suiteId}/store-links`, _method: "POST", _refresh: "store", pharmacyStoreId: "", linkType: "OT_STORE" });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Link Store</Button>
              </CardHeader>
              <CardContent>
                {!(storeData?.storeLinks as any[])?.length ? (
                  <div className="text-sm text-zc-muted">No stores linked. Link an OT pharmacy store to enable consumable management.</div>
                ) : (storeData.storeLinks as any[]).map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-zc-border p-3 mb-2">
                    <div><Badge variant="info">{l.linkType.replace(/_/g, " ")}</Badge> <span className="ml-2 text-sm font-mono">{l.pharmacyStoreId}</span></div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/store/store-links/${l.id}`, "store")}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Implant Rules */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Implant Tracking Rules</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-implant-rule");
                  setDrawerForm({ _url: `/api/infrastructure/ot/store/suites/${suiteId}/implant-rules`, _method: "POST", _refresh: "store", category: "ORTHOPEDIC", mandatoryBarcodeScan: true, mandatoryBatchSerial: true, mandatoryManufacturer: true, mandatoryPatientConsent: true });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
              </CardHeader>
              <CardContent className="grid gap-2">
                {!(storeData?.implantRules as any[])?.length ? <div className="text-sm text-zc-muted">No implant tracking rules configured.</div> : (storeData.implantRules as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-zc-border p-3">
                    <div className="text-sm"><Badge variant="outline">{r.category}</Badge> <span className="ml-2 text-xs text-zc-muted">Barcode: {r.mandatoryBarcodeScan ? "Yes" : "No"} | Batch: {r.mandatoryBatchSerial ? "Yes" : "No"}</span></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Par Levels */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Par Levels</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-par-level");
                  setDrawerForm({ _url: `/api/infrastructure/ot/store/suites/${suiteId}/par-levels`, _method: "POST", _refresh: "store", itemName: "", minStock: 0, reorderLevel: 0, reorderQty: 1, maxStock: 0 });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Item</th><th className="px-4 py-2 text-center font-semibold">Min</th><th className="px-4 py-2 text-center font-semibold">Reorder</th><th className="px-4 py-2 text-center font-semibold">Max</th></tr></thead>
                  <tbody>
                    {!(storeData?.parLevels as any[])?.length ? <EmptyRow cols={4} msg="No par levels configured." /> : (storeData.parLevels as any[]).map((p: any) => (
                      <tr key={p.id} className="border-t border-zc-border"><td className="px-4 py-2">{p.itemName}</td><td className="px-4 py-2 text-center tabular-nums">{p.minStock}</td><td className="px-4 py-2 text-center tabular-nums">{p.reorderLevel}</td><td className="px-4 py-2 text-center tabular-nums">{p.maxStock}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ======== TAB 7: SCHEDULING ======== */}
          <TabsContent value="scheduling" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Scheduling & Policies</div>

            {/* Surgery Defaults */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Surgery Category Defaults</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-surgery-default");
                  setDrawerForm({ _url: `/api/infrastructure/ot/scheduling/suites/${suiteId}/surgery-defaults`, _method: "POST", _refresh: "scheduling", category: "MAJOR", minDurationMin: 30, defaultDurationMin: 60, maxDurationMin: 120 });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Category</th><th className="px-4 py-2 text-center font-semibold">Min (min)</th><th className="px-4 py-2 text-center font-semibold">Default</th><th className="px-4 py-2 text-center font-semibold">Max</th><th className="px-4 py-2 text-center font-semibold">ICU</th><th className="px-4 py-2 text-center font-semibold">Blood</th></tr></thead>
                  <tbody>
                    {!(schedulingData?.surgeryDefaults as any[])?.length ? <EmptyRow cols={6} msg="No surgery defaults configured." /> : (schedulingData.surgeryDefaults as any[]).map((d: any) => (
                      <tr key={d.id} className="border-t border-zc-border"><td className="px-4 py-2">{d.category}</td><td className="px-4 py-2 text-center tabular-nums">{d.minDurationMin}</td><td className="px-4 py-2 text-center tabular-nums">{d.defaultDurationMin}</td><td className="px-4 py-2 text-center tabular-nums">{d.maxDurationMin}</td><td className="px-4 py-2 text-center">{d.requiresIcuBooking ? "Yes" : "—"}</td><td className="px-4 py-2 text-center">{d.requiresBloodReservation ? "Yes" : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Emergency Policy */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Emergency Policy</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  const ep = schedulingData?.emergency;
                  setDrawerMode("emergency-policy");
                  setDrawerForm({ _url: `/api/infrastructure/ot/scheduling/suites/${suiteId}/emergency-policy`, _method: "POST", _refresh: "scheduling", hasDedicatedEmergencyOt: ep?.hasDedicatedEmergencyOt ?? false, availability: ep?.availability ?? "24x7", escalationRule: ep?.escalationRule ?? "QUEUE_WITH_ETA" });
                  setDrawerOpen(true);
                }}><Pencil className="h-3.5 w-3.5" /> Configure</Button>
              </CardHeader>
              <CardContent className="text-sm">
                {schedulingData?.emergency ? (
                  <div className="grid gap-1 text-xs"><div><span className="text-zc-muted">Dedicated Emergency OT:</span> {schedulingData.emergency.hasDedicatedEmergencyOt ? "Yes" : "No"}</div><div><span className="text-zc-muted">Availability:</span> {schedulingData.emergency.availability}</div><div><span className="text-zc-muted">Escalation:</span> {schedulingData.emergency.escalationRule}</div></div>
                ) : <div className="text-zc-muted">Not configured</div>}
              </CardContent>
            </Card>

            {/* Cancellation & Booking */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Cancellation Policy</CardTitle></CardHeader>
                <CardContent className="text-xs">
                  {schedulingData?.cancellation ? (
                    <div className="grid gap-1"><div><span className="text-zc-muted">Notice:</span> {schedulingData.cancellation.minNoticeHours}h</div><div><span className="text-zc-muted">Max Reschedules:</span> {schedulingData.cancellation.maxReschedulesPerCase}</div></div>
                  ) : <div className="text-zc-muted">Not configured</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Booking Approval</CardTitle></CardHeader>
                <CardContent className="text-xs">
                  {schedulingData?.booking ? (
                    <div className="grid gap-1"><div><span className="text-zc-muted">Default:</span> {schedulingData.booking.defaultMode}</div><div><span className="text-zc-muted">Major:</span> {schedulingData.booking.majorMode}</div><div><span className="text-zc-muted">Emergency:</span> {schedulingData.booking.emergencyMode}</div></div>
                  ) : <div className="text-zc-muted">Not configured</div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== TAB 8: SERVICES & BILLING ======== */}
          <TabsContent value="billing" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Services & Billing</div>

            {/* Billing Completeness */}
            {billingData?.completeness ? (
              <div className={cn("rounded-xl border p-3", billingData.completeness.isComplete ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10" : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10")}>
                <div className={cn("text-xs font-medium", billingData.completeness.isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  Billing Completeness: {billingData.completeness.isComplete ? "Complete" : "Incomplete"}
                </div>
                {billingData.completeness.missingComponentTypes?.length ? (
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">Missing: {billingData.completeness.missingComponentTypes.join(", ")}</div>
                ) : null}
              </div>
            ) : null}

            {/* Service Links */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Linked Services</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-service-link");
                  setDrawerForm({ _url: `/api/infrastructure/ot/billing/suites/${suiteId}/service-links`, _method: "POST", _refresh: "billing", serviceItemId: "", specialtyCode: "", surgeryCategory: "MAJOR" });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Link Service</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Service</th><th className="px-4 py-2 text-left font-semibold">Specialty</th><th className="px-4 py-2 text-left font-semibold">Category</th><th className="px-4 py-2 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {!(billingData?.serviceLinks as any[])?.length ? <EmptyRow cols={4} msg="No services linked." /> : (billingData.serviceLinks as any[]).map((l: any) => (
                      <tr key={l.id} className="border-t border-zc-border"><td className="px-4 py-2 font-mono text-xs">{l.serviceItemId}</td><td className="px-4 py-2 text-xs">{l.specialtyCode}</td><td className="px-4 py-2 text-xs">{l.surgeryCategory}</td><td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/billing/service-links/${l.id}`, "billing")}><Trash2 className="h-3 w-3" /></Button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Charge Components */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Charge Components</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-charge");
                  setDrawerForm({ _url: `/api/infrastructure/ot/billing/suites/${suiteId}/charge-components`, _method: "POST", _refresh: "billing", componentType: "THEATRE_CHARGE", chargeModel: "PER_HOUR", defaultRate: 0 });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Component</th><th className="px-4 py-2 text-left font-semibold">Model</th><th className="px-4 py-2 text-right font-semibold">Rate</th><th className="px-4 py-2 text-center font-semibold">GST</th></tr></thead>
                  <tbody>
                    {!(billingData?.chargeComponents as any[])?.length ? <EmptyRow cols={4} msg="No charge components configured." /> : (billingData.chargeComponents as any[]).map((c: any) => (
                      <tr key={c.id} className="border-t border-zc-border"><td className="px-4 py-2 text-xs">{c.componentType.replace(/_/g, " ")}</td><td className="px-4 py-2 text-xs">{c.chargeModel}</td><td className="px-4 py-2 text-right tabular-nums">{c.defaultRate ?? "—"}</td><td className="px-4 py-2 text-center">{c.gstApplicable ? "Yes" : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ======== TAB 9: COMPLIANCE ======== */}
          <TabsContent value="compliance" className="grid gap-4 pt-4">
            <div className="text-lg font-semibold">Compliance & Safety</div>

            {/* NABH Validation */}
            {complianceData?.nabh ? (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">NABH Validation ({complianceData.nabh.passed}/{complianceData.nabh.total})</CardTitle></CardHeader>
                <CardContent className="grid gap-1">
                  {(complianceData.nabh.checks as any[]).map((c: any) => (
                    <div key={c.key} className="flex items-center gap-2 text-sm">
                      {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={c.ok ? "" : "text-zc-muted"}>{c.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Checklist Templates */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Checklist Templates</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-checklist");
                  setDrawerForm({ _url: `/api/infrastructure/ot/compliance/suites/${suiteId}/checklist-templates`, _method: "POST", _refresh: "compliance", name: "", phase: "SIGN_IN", templateType: "WHO", items: "[]" });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Name</th><th className="px-4 py-2 text-left font-semibold">Phase</th><th className="px-4 py-2 text-left font-semibold">Type</th><th className="px-4 py-2 text-center font-semibold">Version</th><th className="px-4 py-2 text-right font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {!(complianceData?.checklists as any[])?.length ? <EmptyRow cols={5} msg="No checklist templates." /> : (complianceData.checklists as any[]).map((c: any) => (
                      <tr key={c.id} className="border-t border-zc-border"><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2"><Badge variant="outline">{c.phase}</Badge></td><td className="px-4 py-2 text-xs">{c.templateType}</td><td className="px-4 py-2 text-center tabular-nums">v{c.version}</td><td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-[rgb(var(--zc-danger))]" onClick={() => handleDelete(`/api/infrastructure/ot/compliance/checklist-templates/${c.id}`, "compliance")}><Trash2 className="h-3 w-3" /></Button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Compliance Configs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Compliance Configurations</CardTitle>
                <Button variant="primary" size="sm" className="gap-1" onClick={() => {
                  setDrawerMode("add-compliance-config");
                  setDrawerForm({ _url: `/api/infrastructure/ot/compliance/suites/${suiteId}/compliance-configs`, _method: "POST", _refresh: "compliance", configType: "WHO_CHECKLIST", config: "{}" });
                  setDrawerOpen(true);
                }}><Plus className="h-3.5 w-3.5" /> Add</Button>
              </CardHeader>
              <CardContent className="grid gap-2">
                {COMPLIANCE_CONFIG_TYPES.map((type) => {
                  const config = (complianceData?.configs as any[])?.find((c: any) => c.configType === type);
                  return (
                    <div key={type} className="flex items-center justify-between rounded-lg border border-zc-border p-2">
                      <div className="flex items-center gap-2">
                        {config ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-zc-muted" />}
                        <span className="text-sm">{type.replace(/_/g, " ")}</span>
                      </div>
                      <Badge variant={config ? "success" : "secondary"}>{config ? "Configured" : "Not Set"}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== TAB 10: VALIDATION & ACTIVATION ======== */}
          <TabsContent value="validation" className="grid gap-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Validation & Activation</div>
              <Button variant="outline" className="gap-2" onClick={() => { setValidationData(null); void loadValidationData(); }}>
                <RefreshCw className="h-4 w-4" /> Run Validation
              </Button>
            </div>

            {/* Go-Live Checks */}
            {validationData?.goLive ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Go-Live Validator</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={validationData.goLive.isReadyForGoLive ? "success" : "destructive"}>
                        {validationData.goLive.isReadyForGoLive ? "READY" : "NOT READY"}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">{validationData.goLive.score}%</span>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {validationData.goLive.passedChecks}/{validationData.goLive.totalChecks} checks passed | {validationData.goLive.blockersFailed} blockers | {validationData.goLive.warningsFailed} warnings
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1">
                  {(validationData.goLive.checks as any[]).map((c: any) => (
                    <div key={c.key} className="flex items-center gap-2 text-sm">
                      {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : c.severity === "BLOCKER" ? <X className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      <span className={c.ok ? "" : c.severity === "BLOCKER" ? "font-medium text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                        {c.label}
                      </span>
                      {c.severity === "BLOCKER" && !c.ok ? <Badge variant="destructive" className="ml-1 text-[10px]">BLOCKER</Badge> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="py-8 text-center text-sm text-zc-muted">Click "Run Validation" to check go-live readiness.</CardContent></Card>
            )}

            {/* Review History */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3"><CardTitle className="text-base">Review History</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted"><tr><th className="px-4 py-2 text-left font-semibold">Date</th><th className="px-4 py-2 text-left font-semibold">Reviewer</th><th className="px-4 py-2 text-left font-semibold">Action</th><th className="px-4 py-2 text-left font-semibold">Comments</th></tr></thead>
                  <tbody>
                    {!(validationData?.reviewHistory as any[])?.length ? <EmptyRow cols={4} msg="No review history." /> : (validationData.reviewHistory as any[]).map((r: any) => (
                      <tr key={r.id} className="border-t border-zc-border">
                        <td className="px-4 py-2 text-xs">{new Date(r.reviewedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.reviewerId}</td>
                        <td className="px-4 py-2"><Badge variant={r.action === "APPROVED" ? "success" : r.action === "REJECTED" ? "destructive" : "warning"}>{r.action}</Badge></td>
                        <td className="px-4 py-2 text-xs text-zc-muted">{r.comments || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {suite.status === "draft" ? (
                <Button variant="outline" className="gap-2" onClick={handleSubmitReview}>
                  <FileCheck className="h-4 w-4" /> Submit for Review
                </Button>
              ) : null}
              {canUpdate ? (
                <Button variant="primary" className="gap-2" onClick={handleActivate}>
                  <CheckCircle2 className="h-4 w-4" /> Activate Suite
                </Button>
              ) : null}
              {canUpdate && suite.status === "active" ? (
                <Button variant="destructive" className="gap-2" onClick={async () => {
                  try {
                    await apiFetch(`/api/infrastructure/ot/validation/suites/${suiteId}/decommission`, { method: "POST", body: JSON.stringify({ type: "TEMPORARY", reason: "Maintenance" }) });
                    toast({ title: "Decommissioned" });
                    await refresh();
                  } catch (e: any) { toast({ variant: "destructive", title: "Failed", description: e?.message }); }
                }}>
                  Decommission (Temporary)
                </Button>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ======== GENERIC DRAWER ======== */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle>{drawerMode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 p-6">
            {/* Dynamic form based on drawerMode */}
            {drawerMode === "add-space" ? (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={drawerForm.code ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={20} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={drawerForm.name ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, name: e.target.value }))} maxLength={120} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={drawerForm.type} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SPACE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={drawerForm.notes ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </>) : null}

            {drawerMode === "add-equipment" ? (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={drawerForm.name ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={drawerForm.category} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Qty</Label><Input type="number" value={drawerForm.qty ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, qty: parseInt(e.target.value) || 1 }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Manufacturer</Label><Input value={drawerForm.manufacturer ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, manufacturer: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Model</Label><Input value={drawerForm.model ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, model: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Assign to Space</Label><Select value={drawerForm.spaceId || ""} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, spaceId: v }))}><SelectTrigger><SelectValue placeholder="(unassigned)" /></SelectTrigger><SelectContent>{spaces.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            </>) : null}

            {drawerMode === "theatre-engineering" ? (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Area (sqm)</Label><Input type="number" value={drawerForm.area ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, area: parseFloat(e.target.value) || undefined }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Ceiling Height (m)</Label><Input type="number" value={drawerForm.ceilingHeight ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, ceilingHeight: parseFloat(e.target.value) || undefined }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Switch checked={drawerForm.gasO2 ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, gasO2: v }))} /><Label className="text-xs">O2 Pipeline</Label></div>
                <div className="flex items-center gap-2"><Switch checked={drawerForm.gasN2O ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, gasN2O: v }))} /><Label className="text-xs">N2O Pipeline</Label></div>
                <div className="flex items-center gap-2"><Switch checked={drawerForm.gasAir ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, gasAir: v }))} /><Label className="text-xs">Air Pipeline</Label></div>
                <div className="flex items-center gap-2"><Switch checked={drawerForm.gasVacuum ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, gasVacuum: v }))} /><Label className="text-xs">Vacuum</Label></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Temp Min (C)</Label><Input type="number" value={drawerForm.tempMin ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, tempMin: parseFloat(e.target.value) || undefined }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Temp Max (C)</Label><Input type="number" value={drawerForm.tempMax ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, tempMax: parseFloat(e.target.value) || undefined }))} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">ISO Class</Label><Input value={drawerForm.isoClass ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, isoClass: e.target.value }))} placeholder="e.g. ISO 5" /></div>
            </>) : null}

            {drawerMode === "theatre-specialties" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Specialty Codes (comma-separated)</Label><Input value={drawerForm.specialtyCodes ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, specialtyCodes: e.target.value }))} placeholder="e.g. ORTHO, CARDIO, GENERAL" /></div>
            </>) : null}

            {drawerMode === "theatre-scheduling" ? (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Turnaround (min)</Label><Input type="number" value={drawerForm.turnaroundTimeMin ?? 30} onChange={(e) => setDrawerForm((p: any) => ({ ...p, turnaroundTimeMin: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Cleaning (min)</Label><Input type="number" value={drawerForm.cleaningTimeMin ?? 15} onChange={(e) => setDrawerForm((p: any) => ({ ...p, cleaningTimeMin: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Max Cases/Day</Label><Input type="number" value={drawerForm.maxCasesPerDay ?? 8} onChange={(e) => setDrawerForm((p: any) => ({ ...p, maxCasesPerDay: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Minor Slot (min)</Label><Input type="number" value={drawerForm.defaultSlotMinor ?? 60} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultSlotMinor: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Major Slot (min)</Label><Input type="number" value={drawerForm.defaultSlotMajor ?? 120} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultSlotMajor: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Complex Slot (min)</Label><Input type="number" value={drawerForm.defaultSlotComplex ?? 180} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultSlotComplex: parseInt(e.target.value) }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={drawerForm.isEmergencyEligible ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, isEmergencyEligible: v }))} /><Label className="text-xs">Emergency Eligible</Label></div>
            </>) : null}

            {drawerMode === "add-staff" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Staff ID *</Label><Input value={drawerForm.staffId ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, staffId: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Role</Label><Select value={drawerForm.role} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Default Shift</Label><Input value={drawerForm.defaultShift ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultShift: e.target.value }))} placeholder="e.g. MORNING" /></div>
            </>) : null}

            {drawerMode === "add-surgeon" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Surgeon Staff ID *</Label><Input value={drawerForm.staffId ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, staffId: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Specialty Code *</Label><Input value={drawerForm.specialtyCode ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, specialtyCode: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Effective From</Label><Input type="date" value={drawerForm.effectiveFrom ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, effectiveFrom: e.target.value }))} /></div>
            </>) : null}

            {drawerMode === "add-anesthetist" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Anesthetist Staff ID *</Label><Input value={drawerForm.staffId ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, staffId: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Concurrent Case Limit</Label><Input type="number" value={drawerForm.concurrentCaseLimit ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, concurrentCaseLimit: parseInt(e.target.value) || 1 }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Effective From</Label><Input type="date" value={drawerForm.effectiveFrom ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, effectiveFrom: e.target.value }))} /></div>
            </>) : null}

            {drawerMode === "add-staffing-rule" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Surgery Category</Label><Select value={drawerForm.surgeryCategory} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, surgeryCategory: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SURGERY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Min Surgeons</Label><Input type="number" value={drawerForm.minSurgeons ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minSurgeons: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Min Anesthetists</Label><Input type="number" value={drawerForm.minAnesthetists ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minAnesthetists: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Min Scrub Nurses</Label><Input type="number" value={drawerForm.minScrubNurses ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minScrubNurses: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Min Circulating Nurses</Label><Input type="number" value={drawerForm.minCirculatingNurses ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minCirculatingNurses: parseInt(e.target.value) }))} /></div>
              </div>
            </>) : null}

            {drawerMode === "add-store-link" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Pharmacy Store ID *</Label><Input value={drawerForm.pharmacyStoreId ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, pharmacyStoreId: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Link Type</Label><Select value={drawerForm.linkType} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, linkType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OT_STORE">OT Store</SelectItem><SelectItem value="ANESTHESIA_STORE">Anesthesia Store</SelectItem><SelectItem value="NARCOTICS_VAULT">Narcotics Vault</SelectItem></SelectContent></Select></div>
            </>) : null}

            {drawerMode === "add-implant-rule" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={drawerForm.category} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ORTHOPEDIC">Orthopedic</SelectItem><SelectItem value="CARDIAC">Cardiac</SelectItem><SelectItem value="OPHTHALMIC">Ophthalmic</SelectItem><SelectItem value="GENERAL">General</SelectItem></SelectContent></Select></div>
              <div className="flex items-center gap-2"><Switch checked={drawerForm.mandatoryBarcodeScan ?? true} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, mandatoryBarcodeScan: v }))} /><Label className="text-xs">Mandatory Barcode Scan</Label></div>
              <div className="flex items-center gap-2"><Switch checked={drawerForm.mandatoryBatchSerial ?? true} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, mandatoryBatchSerial: v }))} /><Label className="text-xs">Mandatory Batch/Serial</Label></div>
              <div className="flex items-center gap-2"><Switch checked={drawerForm.mandatoryPatientConsent ?? true} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, mandatoryPatientConsent: v }))} /><Label className="text-xs">Mandatory Patient Consent</Label></div>
            </>) : null}

            {drawerMode === "add-par-level" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Item Name *</Label><Input value={drawerForm.itemName ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, itemName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Min Stock</Label><Input type="number" value={drawerForm.minStock ?? 0} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minStock: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reorder Level</Label><Input type="number" value={drawerForm.reorderLevel ?? 0} onChange={(e) => setDrawerForm((p: any) => ({ ...p, reorderLevel: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reorder Qty</Label><Input type="number" value={drawerForm.reorderQty ?? 1} onChange={(e) => setDrawerForm((p: any) => ({ ...p, reorderQty: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Max Stock</Label><Input type="number" value={drawerForm.maxStock ?? 0} onChange={(e) => setDrawerForm((p: any) => ({ ...p, maxStock: parseInt(e.target.value) }))} /></div>
              </div>
            </>) : null}

            {drawerMode === "add-surgery-default" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={drawerForm.category} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SURGERY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Min (min)</Label><Input type="number" value={drawerForm.minDurationMin ?? 30} onChange={(e) => setDrawerForm((p: any) => ({ ...p, minDurationMin: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Default (min)</Label><Input type="number" value={drawerForm.defaultDurationMin ?? 60} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultDurationMin: parseInt(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Max (min)</Label><Input type="number" value={drawerForm.maxDurationMin ?? 120} onChange={(e) => setDrawerForm((p: any) => ({ ...p, maxDurationMin: parseInt(e.target.value) }))} /></div>
              </div>
            </>) : null}

            {drawerMode === "emergency-policy" ? (<>
              <div className="flex items-center gap-2"><Switch checked={drawerForm.hasDedicatedEmergencyOt ?? false} onCheckedChange={(v) => setDrawerForm((p: any) => ({ ...p, hasDedicatedEmergencyOt: v }))} /><Label className="text-xs">Dedicated Emergency OT</Label></div>
              <div className="space-y-1.5"><Label className="text-xs">Availability</Label><Input value={drawerForm.availability ?? "24x7"} onChange={(e) => setDrawerForm((p: any) => ({ ...p, availability: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Escalation Rule</Label><Input value={drawerForm.escalationRule ?? "QUEUE_WITH_ETA"} onChange={(e) => setDrawerForm((p: any) => ({ ...p, escalationRule: e.target.value }))} /></div>
            </>) : null}

            {drawerMode === "add-service-link" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Service Item ID *</Label><Input value={drawerForm.serviceItemId ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, serviceItemId: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Specialty Code *</Label><Input value={drawerForm.specialtyCode ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, specialtyCode: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Surgery Category</Label><Select value={drawerForm.surgeryCategory} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, surgeryCategory: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SURGERY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </>) : null}

            {drawerMode === "add-charge" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Component Type</Label><Select value={drawerForm.componentType} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, componentType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHARGE_COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Charge Model</Label><Select value={drawerForm.chargeModel} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, chargeModel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHARGE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Default Rate</Label><Input type="number" value={drawerForm.defaultRate ?? 0} onChange={(e) => setDrawerForm((p: any) => ({ ...p, defaultRate: parseFloat(e.target.value) }))} /></div>
            </>) : null}

            {drawerMode === "add-checklist" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={drawerForm.name ?? ""} onChange={(e) => setDrawerForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Phase</Label><Select value={drawerForm.phase} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, phase: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHECKLIST_PHASES.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={drawerForm.templateType} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, templateType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WHO">WHO</SelectItem><SelectItem value="PRE_OP">Pre-Op</SelectItem><SelectItem value="CONSENT">Consent</SelectItem><SelectItem value="SPECIALTY">Specialty</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Items (JSON)</Label><Textarea value={drawerForm.items ?? "[]"} onChange={(e) => setDrawerForm((p: any) => ({ ...p, items: e.target.value }))} rows={4} placeholder='[{"label":"...", "type":"YES_NO", "required":true}]' /></div>
            </>) : null}

            {drawerMode === "add-compliance-config" ? (<>
              <div className="space-y-1.5"><Label className="text-xs">Config Type</Label><Select value={drawerForm.configType} onValueChange={(v) => setDrawerForm((p: any) => ({ ...p, configType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMPLIANCE_CONFIG_TYPES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Configuration (JSON)</Label><Textarea value={drawerForm.config ?? "{}"} onChange={(e) => setDrawerForm((p: any) => ({ ...p, config: e.target.value }))} rows={6} /></div>
            </>) : null}
          </div>

          <DialogFooter className="border-t border-zc-border px-6 py-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={() => {
              // Transform special fields before saving
              const payload = { ...drawerForm };
              if (drawerMode === "theatre-specialties" && typeof payload.specialtyCodes === "string") {
                payload.specialtyCodes = payload.specialtyCodes.split(",").map((s: string) => s.trim()).filter(Boolean);
              }
              if (drawerMode === "add-checklist" && typeof payload.items === "string") {
                try { payload.items = JSON.parse(payload.items); } catch { /* keep as string — server will reject */ }
              }
              if (drawerMode === "add-compliance-config" && typeof payload.config === "string") {
                try { payload.config = JSON.parse(payload.config); } catch { /* keep as string */ }
              }
              setDrawerForm(payload);
              void handleDrawerSave();
            }} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
