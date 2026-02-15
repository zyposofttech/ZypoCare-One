"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import {
  DollarSign,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { IconPlus } from "@/components/icons";

import {
  SuiteContextBar,
  OtPageHeader,
  Field,
  StatBox,
  EmptyRow,
  SearchBar,
  ErrorAlert,
  ModalHeader,
  drawerClassName,
  OnboardingCallout,
  SectionHeader,
} from "../../_shared/components";

import type {
  OtServiceLinkRow,
  OtChargeComponentRow,
  OtBillingCompletenessRow,
  OtSuiteRow,
} from "../../_shared/types";

import {
  CHARGE_COMPONENT_TYPES,
  CHARGE_MODELS,
  SURGERY_CATEGORIES,
} from "../../_shared/constants";

import { THEATRE_TYPES } from "../../_shared/constants";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 08 — Services & Billing Page
   OTS-047 Service Links
   OTS-048 Charge Components
   OTS-051 Billing Completeness
   ========================================================= */

const API = "/api/infrastructure/ot/billing";

/* ---- Form defaults ---- */

type ServiceLinkForm = {
  serviceItemId: string;
  specialtyCode: string;
  surgeryCategory: string;
  defaultTheatreType: string;
  requiredEquipmentCategories: string;
  snomedCode: string;
  icd10PcsCode: string;
};

const EMPTY_SL_FORM: ServiceLinkForm = {
  serviceItemId: "",
  specialtyCode: "",
  surgeryCategory: "",
  defaultTheatreType: "",
  requiredEquipmentCategories: "",
  snomedCode: "",
  icd10PcsCode: "",
};

type ChargeComponentForm = {
  componentType: string;
  chargeModel: string;
  serviceItemId: string;
  glCode: string;
  gstApplicable: boolean;
  defaultRate: string;
  isActive: boolean;
};

const EMPTY_CC_FORM: ChargeComponentForm = {
  componentType: "",
  chargeModel: "",
  serviceItemId: "",
  glCode: "",
  gstApplicable: false,
  defaultRate: "",
  isActive: true,
};

/* =========================================================
   Page export
   ========================================================= */

export default function BillingPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Services & Billing">
      <RequirePerm perm="ot.billing.read">
        {branchId ? <BillingContent branchId={branchId} params={props.params} /> : (
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-900/20">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-base font-semibold text-zc-text">No Branch Selected</div>
              <div className="max-w-sm text-sm text-zc-muted">
                Please select a branch from the header to view billing configuration.
              </div>
            </CardContent>
          </Card>
        )}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   Content
   ========================================================= */

function BillingContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canWrite = hasPerm(user, "ot.billing.write");

  /* ---- State ---- */
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [serviceLinks, setServiceLinks] = React.useState<OtServiceLinkRow[]>([]);
  const [chargeComponents, setChargeComponents] = React.useState<OtChargeComponentRow[]>([]);
  const [completeness, setCompleteness] = React.useState<OtBillingCompletenessRow | null>(null);

  const [slSearch, setSlSearch] = React.useState("");
  const [ccSearch, setCcSearch] = React.useState("");

  // Drawers
  const [slDrawerOpen, setSlDrawerOpen] = React.useState(false);
  const [slForm, setSlForm] = React.useState<ServiceLinkForm>(EMPTY_SL_FORM);

  const [ccDrawerOpen, setCcDrawerOpen] = React.useState(false);
  const [ccEditId, setCcEditId] = React.useState<string | null>(null);
  const [ccForm, setCcForm] = React.useState<ChargeComponentForm>(EMPTY_CC_FORM);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-billing" });

  /* ---- Data loading ---- */
  const qs = `?branchId=${encodeURIComponent(branchId)}`;

  const loadAll = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const [suiteRes, slRes, ccRes, compRes] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
        apiFetch<OtServiceLinkRow[]>(`${API}/suites/${suiteId}/service-links${qs}`),
        apiFetch<OtChargeComponentRow[]>(`${API}/suites/${suiteId}/charge-components${qs}`),
        apiFetch<OtBillingCompletenessRow>(`${API}/suites/${suiteId}/billing-completeness${qs}`),
      ]);

      if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
      else setError("Failed to load suite context.");

      setServiceLinks(slRes.status === "fulfilled" ? (Array.isArray(slRes.value) ? slRes.value : []) : []);
      setChargeComponents(ccRes.status === "fulfilled" ? (Array.isArray(ccRes.value) ? ccRes.value : []) : []);
      setCompleteness(compRes.status === "fulfilled" ? compRes.value : null);

      if (showToast) toast({ title: "Billing data refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, qs, toast]);

  React.useEffect(() => { void loadAll(false); }, [loadAll]);

  /* ---- Filtered lists ---- */
  const filteredSL = React.useMemo(() => {
    if (!slSearch.trim()) return serviceLinks;
    const lower = slSearch.toLowerCase();
    return serviceLinks.filter((r) =>
      r.serviceItemId.toLowerCase().includes(lower) ||
      r.specialtyCode.toLowerCase().includes(lower) ||
      r.surgeryCategory.toLowerCase().includes(lower) ||
      (r.snomedCode ?? "").toLowerCase().includes(lower) ||
      (r.icd10PcsCode ?? "").toLowerCase().includes(lower),
    );
  }, [serviceLinks, slSearch]);

  const filteredCC = React.useMemo(() => {
    if (!ccSearch.trim()) return chargeComponents;
    const lower = ccSearch.toLowerCase();
    return chargeComponents.filter((r) =>
      r.componentType.toLowerCase().includes(lower) ||
      r.chargeModel.toLowerCase().includes(lower) ||
      (r.serviceItemId ?? "").toLowerCase().includes(lower) ||
      (r.glCode ?? "").toLowerCase().includes(lower),
    );
  }, [chargeComponents, ccSearch]);

  /* ---- Service Link CRUD (OTS-047) ---- */
  function openAddServiceLink() {
    setSlForm(EMPTY_SL_FORM);
    setSlDrawerOpen(true);
  }

  async function handleCreateServiceLink() {
    setBusy(true);
    try {
      const payload: any = {
        serviceItemId: slForm.serviceItemId,
        specialtyCode: slForm.specialtyCode,
        surgeryCategory: slForm.surgeryCategory,
        defaultTheatreType: slForm.defaultTheatreType || undefined,
        requiredEquipmentCategories: slForm.requiredEquipmentCategories
          ? slForm.requiredEquipmentCategories.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        snomedCode: slForm.snomedCode || undefined,
        icd10PcsCode: slForm.icd10PcsCode || undefined,
      };
      await apiFetch(`${API}/suites/${suiteId}/service-links${qs}`, {
        method: "POST",
        body: JSON.stringify(payload),
      } as any);
      toast({ title: "Service link created" });
      setSlDrawerOpen(false);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create service link.", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteServiceLink(id: string) {
    if (!confirm("Remove this service link?")) return;
    setBusy(true);
    try {
      await apiFetch(`${API}/service-links/${id}${qs}`, { method: "DELETE" } as any);
      toast({ title: "Service link removed" });
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Delete failed.", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Charge Component CRUD (OTS-048) ---- */
  function openAddChargeComponent() {
    setCcEditId(null);
    setCcForm(EMPTY_CC_FORM);
    setCcDrawerOpen(true);
  }

  function openEditChargeComponent(row: OtChargeComponentRow) {
    setCcEditId(row.id);
    setCcForm({
      componentType: row.componentType,
      chargeModel: row.chargeModel,
      serviceItemId: row.serviceItemId ?? "",
      glCode: row.glCode ?? "",
      gstApplicable: row.gstApplicable,
      defaultRate: row.defaultRate != null ? String(row.defaultRate) : "",
      isActive: row.isActive,
    });
    setCcDrawerOpen(true);
  }

  async function handleSaveChargeComponent() {
    setBusy(true);
    try {
      if (ccEditId) {
        const payload: any = {
          chargeModel: ccForm.chargeModel || undefined,
          serviceItemId: ccForm.serviceItemId || undefined,
          glCode: ccForm.glCode || undefined,
          gstApplicable: ccForm.gstApplicable,
          defaultRate: ccForm.defaultRate ? Number(ccForm.defaultRate) : undefined,
          isActive: ccForm.isActive,
        };
        await apiFetch(`${API}/charge-components/${ccEditId}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        } as any);
        toast({ title: "Charge component updated" });
      } else {
        const payload: any = {
          componentType: ccForm.componentType,
          chargeModel: ccForm.chargeModel,
          serviceItemId: ccForm.serviceItemId || undefined,
          glCode: ccForm.glCode || undefined,
          gstApplicable: ccForm.gstApplicable,
          defaultRate: ccForm.defaultRate ? Number(ccForm.defaultRate) : undefined,
        };
        await apiFetch(`${API}/suites/${suiteId}/charge-components${qs}`, {
          method: "POST",
          body: JSON.stringify(payload),
        } as any);
        toast({ title: "Charge component created" });
      }
      setCcDrawerOpen(false);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Save failed.", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Helpers ---- */
  function labelFor<T extends string>(list: Array<{ value: T; label: string }>, val: string): string {
    return list.find((x) => x.value === val)?.label ?? val.replace(/_/g, " ");
  }

  const pct = completeness?.completenessPercent ?? 0;
  const barColor = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";

  /* ---- Render ---- */
  return (
    <div className="grid gap-6">
      {/* Context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* Header */}
      <OtPageHeader
        icon={<DollarSign className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        title="Services & Billing"
        description="Link surgical services, configure charge components, and track billing completeness."
        loading={loading}
        onRefresh={() => void loadAll(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* ============================================================
         Billing Completeness Panel (OTS-051)
         ============================================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Billing Completeness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-zc-muted">
              <span>Completeness</span>
              <span className="font-semibold text-zc-text">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zc-panel/40">
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          {/* Stat boxes */}
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox
              label="Total Services"
              value={completeness?.totalServices ?? 0}
              color="blue"
            />
            <StatBox
              label="With Charges"
              value={completeness?.servicesWithCharges ?? 0}
              color="emerald"
            />
            <StatBox
              label="No Charges"
              value={completeness?.servicesWithoutCharges?.length ?? 0}
              color="rose"
              detail="Critical — needs attention"
            />
            <StatBox
              label="Partial"
              value={completeness?.partialServices?.length ?? 0}
              color="amber"
              detail="Missing some components"
            />
          </div>

          {/* Service names with no charges */}
          {completeness && completeness.servicesWithoutCharges.length > 0 ? (
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/30 p-3 dark:border-rose-900/40 dark:bg-rose-900/10">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Services with no charges configured
              </div>
              <div className="flex flex-wrap gap-1.5">
                {completeness.servicesWithoutCharges.map((s) => (
                  <Badge key={s} variant="outline" className="border-rose-300 text-[10px] text-rose-700 dark:border-rose-800 dark:text-rose-300">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Partial services */}
          {completeness && completeness.partialServices.length > 0 ? (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Services with partial charge configuration
              </div>
              <div className="flex flex-wrap gap-1.5">
                {completeness.partialServices.map((s) => (
                  <Badge key={s} variant="outline" className="border-amber-300 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-300">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ============================================================
         Linked Services Table (OTS-047)
         ============================================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <SectionHeader title="Linked Services" count={serviceLinks.length}>
            {canWrite ? (
              <Button variant="primary" size="sm" className="gap-1.5" onClick={openAddServiceLink}>
                <IconPlus className="h-3.5 w-3.5" />
                Add Service Link
              </Button>
            ) : null}
          </SectionHeader>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SearchBar
            value={slSearch}
            onChange={setSlSearch}
            placeholder="Search by service, specialty, category, SNOMED, ICD-10..."
            filteredCount={filteredSL.length}
            totalCount={serviceLinks.length}
          />

          <div className="overflow-x-auto rounded-xl border border-zc-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20">
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Service Item</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Specialty</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Theatre Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Equip. Req</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">SNOMED</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">ICD-10</th>
                  <th className="px-4 py-3 text-right font-medium text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={8} loading />
                ) : filteredSL.length === 0 ? (
                  <EmptyRow colSpan={8} message="No linked services yet." />
                ) : (
                  filteredSL.map((r) => (
                    <tr key={r.id} className="border-b border-zc-border transition-colors hover:bg-zc-panel/10">
                      <td className="px-4 py-3 font-medium text-zc-text">{r.serviceItemId}</td>
                      <td className="px-4 py-3 text-zc-text">{r.specialtyCode}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {labelFor(SURGERY_CATEGORIES, r.surgeryCategory)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zc-text">
                        {r.defaultTheatreType ? labelFor(THEATRE_TYPES, r.defaultTheatreType) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-zc-text">
                        {r.requiredEquipmentCategories?.length
                          ? r.requiredEquipmentCategories.join(", ")
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zc-muted">{r.snomedCode ?? "\u2014"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zc-muted">{r.icd10PcsCode ?? "\u2014"}</td>
                      <td className="px-4 py-3 text-right">
                        {canWrite ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                            onClick={() => handleDeleteServiceLink(r.id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
         Charge Components Table (OTS-048)
         ============================================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <SectionHeader title="Charge Components" count={chargeComponents.length}>
            {canWrite ? (
              <Button variant="primary" size="sm" className="gap-1.5" onClick={openAddChargeComponent}>
                <IconPlus className="h-3.5 w-3.5" />
                Add Charge Component
              </Button>
            ) : null}
          </SectionHeader>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SearchBar
            value={ccSearch}
            onChange={setCcSearch}
            placeholder="Search by type, model, service, GL code..."
            filteredCount={filteredCC.length}
            totalCount={chargeComponents.length}
          />

          <div className="overflow-x-auto rounded-xl border border-zc-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20">
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Component Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Charge Model</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">Service Item</th>
                  <th className="px-4 py-3 text-left font-medium text-zc-muted">GL Code</th>
                  <th className="px-4 py-3 text-center font-medium text-zc-muted">GST</th>
                  <th className="px-4 py-3 text-right font-medium text-zc-muted">Default Rate</th>
                  <th className="px-4 py-3 text-center font-medium text-zc-muted">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={8} loading />
                ) : filteredCC.length === 0 ? (
                  <EmptyRow colSpan={8} message="No charge components configured." />
                ) : (
                  filteredCC.map((r) => (
                    <tr key={r.id} className="border-b border-zc-border transition-colors hover:bg-zc-panel/10">
                      <td className="px-4 py-3 font-medium text-zc-text">
                        {labelFor(CHARGE_COMPONENT_TYPES, r.componentType)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {labelFor(CHARGE_MODELS, r.chargeModel)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zc-text">{r.serviceItemId ?? "\u2014"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zc-muted">{r.glCode ?? "\u2014"}</td>
                      <td className="px-4 py-3 text-center">
                        {r.gstApplicable ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-xs text-zc-muted">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zc-text">
                        {r.defaultRate != null ? `\u20B9${Number(r.defaultRate).toFixed(2)}` : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.isActive ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openEditChargeComponent(r)}
                            disabled={busy}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Billing Setup Guide"
        description="Step 1: Link surgical services to the OT suite. Step 2: Configure charge components for each billing line. Step 3: Verify billing completeness reaches 100% before go-live."
      />

      {/* ============================================================
         Add Service Link Drawer (OTS-047)
         ============================================================ */}
      <Dialog
        open={slDrawerOpen}
        onOpenChange={(v) => { if (!v) setSlDrawerOpen(false); else setSlDrawerOpen(true); }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader
            title="Add Service Link"
            description="Link a surgical service to this OT suite with specialty and coding information."
            onClose={() => setSlDrawerOpen(false)}
          />

          <div className="grid gap-6">
            {/* Service & Specialty */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service Item ID" required>
                <Input
                  value={slForm.serviceItemId}
                  onChange={(e) => setSlForm((f) => ({ ...f, serviceItemId: e.target.value }))}
                  placeholder="e.g. SRV-OT-001"
                />
              </Field>
              <Field label="Specialty Code" required>
                <Input
                  value={slForm.specialtyCode}
                  onChange={(e) => setSlForm((f) => ({ ...f, specialtyCode: e.target.value }))}
                  placeholder="e.g. ORTHO"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Surgery Category" required>
                <Select
                  value={slForm.surgeryCategory}
                  onValueChange={(v) => setSlForm((f) => ({ ...f, surgeryCategory: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SURGERY_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default Theatre Type">
                <Select
                  value={slForm.defaultTheatreType}
                  onValueChange={(v) => setSlForm((f) => ({ ...f, defaultTheatreType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {THEATRE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />

            <Field label="Required Equipment Categories" hint="Comma-separated">
              <Input
                value={slForm.requiredEquipmentCategories}
                onChange={(e) => setSlForm((f) => ({ ...f, requiredEquipmentCategories: e.target.value }))}
                placeholder="e.g. LAPAROSCOPY_TOWER, C_ARM"
              />
            </Field>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SNOMED Code">
                <Input
                  value={slForm.snomedCode}
                  onChange={(e) => setSlForm((f) => ({ ...f, snomedCode: e.target.value }))}
                  placeholder="e.g. 387713003"
                />
              </Field>
              <Field label="ICD-10 PCS Code">
                <Input
                  value={slForm.icd10PcsCode}
                  onChange={(e) => setSlForm((f) => ({ ...f, icd10PcsCode: e.target.value }))}
                  placeholder="e.g. 0SB00ZZ"
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setSlDrawerOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateServiceLink}
                disabled={busy || !slForm.serviceItemId || !slForm.specialtyCode || !slForm.surgeryCategory}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconPlus className="h-4 w-4" />}
                {busy ? "Saving..." : "Create Service Link"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
         Add / Edit Charge Component Drawer (OTS-048)
         ============================================================ */}
      <Dialog
        open={ccDrawerOpen}
        onOpenChange={(v) => {
          if (!v) { setCcDrawerOpen(false); setCcEditId(null); setCcForm(EMPTY_CC_FORM); }
          else setCcDrawerOpen(true);
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader
            title={ccEditId ? "Edit Charge Component" : "Add Charge Component"}
            description={ccEditId ? "Update charge component configuration." : "Define a new billing charge component for this OT suite."}
            onClose={() => setCcDrawerOpen(false)}
          />

          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Component Type" required>
                <Select
                  value={ccForm.componentType}
                  onValueChange={(v) => setCcForm((f) => ({ ...f, componentType: v }))}
                  disabled={!!ccEditId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARGE_COMPONENT_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Charge Model" required>
                <Select
                  value={ccForm.chargeModel}
                  onValueChange={(v) => setCcForm((f) => ({ ...f, chargeModel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARGE_MODELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service Item ID">
                <Input
                  value={ccForm.serviceItemId}
                  onChange={(e) => setCcForm((f) => ({ ...f, serviceItemId: e.target.value }))}
                  placeholder="e.g. SRV-OT-001 (optional)"
                />
              </Field>
              <Field label="GL Code">
                <Input
                  value={ccForm.glCode}
                  onChange={(e) => setCcForm((f) => ({ ...f, glCode: e.target.value }))}
                  placeholder="e.g. 4010-OT-01 (optional)"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default Rate">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={ccForm.defaultRate}
                  onChange={(e) => setCcForm((f) => ({ ...f, defaultRate: e.target.value }))}
                  placeholder="e.g. 5000.00"
                />
              </Field>
              <div className="grid gap-4">
                <Field label="GST Applicable">
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      checked={ccForm.gstApplicable}
                      onCheckedChange={(v) => setCcForm((f) => ({ ...f, gstApplicable: v }))}
                    />
                    <span className="text-sm text-zc-muted">{ccForm.gstApplicable ? "Yes" : "No"}</span>
                  </div>
                </Field>
              </div>
            </div>

            {/* Active toggle (only for edit) */}
            {ccEditId ? (
              <>
                <Separator />
                <Field label="Active Status">
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      checked={ccForm.isActive}
                      onCheckedChange={(v) => setCcForm((f) => ({ ...f, isActive: v }))}
                    />
                    <span className="text-sm text-zc-muted">{ccForm.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setCcDrawerOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChargeComponent}
                disabled={busy || !ccForm.componentType || !ccForm.chargeModel}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving..." : ccEditId ? "Update Component" : "Create Component"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
