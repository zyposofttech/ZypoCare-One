"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { IconPlus } from "@/components/icons";
import {
  Loader2,
  Pencil,
  Trash2,
  Warehouse,
  Link2,
  Unlink,
  Package,
  ScanBarcode,
  BarChart3,
} from "lucide-react";

import type {
  OtSuiteRow,
  OtStoreLinkRow,
  OtConsumableTemplateRow,
  OtImplantRuleRow,
  OtParLevelRow,
  OtImplantCategory,
  OtSurgeryCategory,
} from "../../_shared/types";
import { SURGERY_CATEGORIES, IMPLANT_CATEGORIES } from "../../_shared/constants";
import { humanize } from "../../_shared/utils";
import {
  NoBranchGuard,
  OtPageHeader,
  SuiteContextBar,
  EmptyRow,
  ErrorAlert,
  StatusPill,
  Field,
  drawerClassName,
  ModalHeader,
} from "../../_shared/components";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 06 — OT Store & Consumables (OTS-034 .. OTS-038)
   ========================================================= */

const API = "/api/infrastructure/ot/store";
const LINK_TYPES = [
  { value: "OT_STORE", label: "OT Store" },
  { value: "ANESTHESIA_STORE", label: "Anesthesia Store" },
  { value: "NARCOTICS_VAULT", label: "Narcotics Vault" },
] as const;

export default function StoreConsumablesPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Store & Consumables">
      <RequirePerm perm="ot.store.read">
        {branchId ? <Content branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   Main Content
   ========================================================= */

function Content({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const canWrite = hasPerm(useAuthStore.getState(), "ot.store.write");

  /* ---- State ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);

  const [storeLinks, setStoreLinks] = React.useState<OtStoreLinkRow[]>([]);
  const [templates, setTemplates] = React.useState<OtConsumableTemplateRow[]>([]);
  const [implantRules, setImplantRules] = React.useState<OtImplantRuleRow[]>([]);
  const [parLevels, setParLevels] = React.useState<OtParLevelRow[]>([]);

  /* Drawers */
  const [linkDrawerOpen, setLinkDrawerOpen] = React.useState(false);
  const [templateDrawerOpen, setTemplateDrawerOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<OtConsumableTemplateRow | null>(null);
  const [implantDrawerOpen, setImplantDrawerOpen] = React.useState(false);
  const [parDrawerOpen, setParDrawerOpen] = React.useState(false);
  const [editingPar, setEditingPar] = React.useState<OtParLevelRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-store-consumables" });

  /* ---- Load ---- */
  const qs = `?branchId=${encodeURIComponent(branchId)}`;

  const load = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const [suiteRes, linksRes, templatesRes, rulesRes, parsRes] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
        apiFetch<OtStoreLinkRow[]>(`${API}/suites/${suiteId}/store-links${qs}`),
        apiFetch<OtConsumableTemplateRow[]>(`${API}/suites/${suiteId}/consumable-templates${qs}`),
        apiFetch<OtImplantRuleRow[]>(`${API}/suites/${suiteId}/implant-rules${qs}`),
        apiFetch<OtParLevelRow[]>(`${API}/suites/${suiteId}/par-levels${qs}`),
      ]);
      if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
      else setError("Failed to load suite details.");
      setStoreLinks(linksRes.status === "fulfilled" ? (Array.isArray(linksRes.value) ? linksRes.value : []) : []);
      setTemplates(templatesRes.status === "fulfilled" ? (Array.isArray(templatesRes.value) ? templatesRes.value : []) : []);
      setImplantRules(rulesRes.status === "fulfilled" ? (Array.isArray(rulesRes.value) ? rulesRes.value : []) : []);
      setParLevels(parsRes.status === "fulfilled" ? (Array.isArray(parsRes.value) ? parsRes.value : []) : []);
      if (showToast) toast({ title: "Data refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load store & consumables data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, qs, toast]);

  React.useEffect(() => { void load(false); }, [load]);

  /* ---- Handlers: Store Links (OTS-034) ---- */
  const handleCreateLink = async (pharmacyStoreId: string, linkType: string) => {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/store-links${qs}`, {
        method: "POST",
        body: JSON.stringify({ pharmacyStoreId, linkType }),
      });
      toast({ title: "Store linked successfully" });
      setLinkDrawerOpen(false);
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to link store", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Unlink this store? This cannot be undone.")) return;
    try {
      await apiFetch(`${API}/store-links/${id}${qs}`, { method: "DELETE" });
      toast({ title: "Store unlinked" });
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to unlink", variant: "destructive" });
    }
  };

  /* ---- Handlers: Consumable Templates (OTS-035) ---- */
  const handleSaveTemplate = async (data: {
    name: string;
    surgeryCategory: OtSurgeryCategory;
    specialtyCode?: string;
    items: any;
    isActive?: boolean;
  }) => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await apiFetch(`${API}/consumable-templates/${editingTemplate.id}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast({ title: "Template updated" });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/consumable-templates${qs}`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Template created" });
      }
      setTemplateDrawerOpen(false);
      setEditingTemplate(null);
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this consumable template?")) return;
    try {
      await apiFetch(`${API}/consumable-templates/${id}${qs}`, { method: "DELETE" });
      toast({ title: "Template deleted" });
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete template", variant: "destructive" });
    }
  };

  /* ---- Handlers: Implant Rules (OTS-036) ---- */
  const handleCreateImplantRule = async (data: {
    category: OtImplantCategory;
    mandatoryBarcodeScan: boolean;
    mandatoryBatchSerial: boolean;
    mandatoryManufacturer: boolean;
    mandatoryPatientConsent: boolean;
  }) => {
    setSaving(true);
    try {
      await apiFetch(`${API}/suites/${suiteId}/implant-rules${qs}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast({ title: "Implant tracking rule created" });
      setImplantDrawerOpen(false);
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create rule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Handlers: Par Levels (OTS-037) ---- */
  const handleSavePar = async (data: {
    itemName: string;
    drugMasterId?: string;
    minStock: number;
    reorderLevel: number;
    reorderQty: number;
    maxStock: number;
    isNeverOutOfStock?: boolean;
    isActive?: boolean;
  }) => {
    setSaving(true);
    try {
      if (editingPar) {
        await apiFetch(`${API}/par-levels/${editingPar.id}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast({ title: "Par level updated" });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/par-levels${qs}`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Par level created" });
      }
      setParDrawerOpen(false);
      setEditingPar(null);
      void load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save par level", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Render ---- */
  return (
    <div className="grid gap-6">
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      <OtPageHeader
        icon={<Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        title="OT Store & Consumables"
        description="Manage pharmacy store links, consumable templates, implant tracking rules, and par levels."
        loading={loading}
        onRefresh={() => void load(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* ============ OTS-034: Store Links ============ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Pharmacy Store Links
            </CardTitle>
            {canWrite ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setLinkDrawerOpen(true)}>
                <IconPlus className="h-3.5 w-3.5" />
                Link Store
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {storeLinks.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Unlink className="h-8 w-8 text-zc-muted" />
              <div className="text-sm font-medium text-zc-text">No Store Linked</div>
              <div className="text-xs text-zc-muted">Link a pharmacy store to enable consumable and drug dispensing for this OT suite.</div>
            </div>
          ) : (
            <div className="divide-y divide-zc-border">
              {storeLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200 text-[10px]">
                      LINKED
                    </Badge>
                    <span className="text-sm font-medium text-zc-text">{humanize(link.linkType)}</span>
                    <span className="font-mono text-xs text-zc-muted">{link.pharmacyStoreId}</span>
                  </div>
                  {canWrite ? (
                    <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDeleteLink(link.id)}>
                      <Unlink className="mr-1 h-3.5 w-3.5" />
                      Unlink
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ OTS-035: Consumable Templates ============ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Consumable Templates
              <Badge variant="outline" className="text-[10px]">{templates.length}</Badge>
            </CardTitle>
            {canWrite ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditingTemplate(null); setTemplateDrawerOpen(true); }}>
                <IconPlus className="h-3.5 w-3.5" />
                Add Template
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Surgery Category</th>
                  <th className="px-4 py-2.5">Specialty</th>
                  <th className="px-4 py-2.5 text-center">Items</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  {canWrite ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {loading || templates.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 6 : 5} loading={loading} message="No consumable templates configured." />
                ) : (
                  templates.map((t) => {
                    const itemCount = Array.isArray(t.items) ? t.items.length : 0;
                    return (
                      <tr key={t.id} className="hover:bg-zc-panel/10 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-zc-text">{t.name}</td>
                        <td className="px-4 py-2.5">{humanize(t.surgeryCategory)}</td>
                        <td className="px-4 py-2.5 text-zc-muted">{t.specialtyCode || "\u2014"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">{itemCount}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center"><StatusPill active={t.isActive} /></td>
                        {canWrite ? (
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingTemplate(t); setTemplateDrawerOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => handleDeleteTemplate(t.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============ OTS-036: Implant Tracking Rules ============ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanBarcode className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Implant Tracking Rules
              <Badge variant="outline" className="text-[10px]">{implantRules.length}</Badge>
            </CardTitle>
            {canWrite ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setImplantDrawerOpen(true)}>
                <IconPlus className="h-3.5 w-3.5" />
                Add Rule
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-center">Barcode Scan</th>
                  <th className="px-4 py-2.5 text-center">Batch/Serial</th>
                  <th className="px-4 py-2.5 text-center">Manufacturer</th>
                  <th className="px-4 py-2.5 text-center">Patient Consent</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {loading || implantRules.length === 0 ? (
                  <EmptyRow colSpan={6} loading={loading} message="No implant tracking rules configured." />
                ) : (
                  implantRules.map((r) => (
                    <tr key={r.id} className="hover:bg-zc-panel/10 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-zc-text">{humanize(r.category)}</td>
                      <td className="px-4 py-2.5 text-center"><BoolBadge value={r.mandatoryBarcodeScan} /></td>
                      <td className="px-4 py-2.5 text-center"><BoolBadge value={r.mandatoryBatchSerial} /></td>
                      <td className="px-4 py-2.5 text-center"><BoolBadge value={r.mandatoryManufacturer} /></td>
                      <td className="px-4 py-2.5 text-center"><BoolBadge value={r.mandatoryPatientConsent} /></td>
                      <td className="px-4 py-2.5 text-center"><StatusPill active={r.isActive} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============ OTS-037: Par Levels ============ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Par Levels
              <Badge variant="outline" className="text-[10px]">{parLevels.length}</Badge>
            </CardTitle>
            {canWrite ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditingPar(null); setParDrawerOpen(true); }}>
                <IconPlus className="h-3.5 w-3.5" />
                Add Par Level
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Min Stock</th>
                  <th className="px-4 py-2.5 text-right">Reorder Level</th>
                  <th className="px-4 py-2.5 text-right">Reorder Qty</th>
                  <th className="px-4 py-2.5 text-right">Max Stock</th>
                  <th className="px-4 py-2.5 text-center">Never OOS</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  {canWrite ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {loading || parLevels.length === 0 ? (
                  <EmptyRow colSpan={canWrite ? 8 : 7} loading={loading} message="No par levels configured." />
                ) : (
                  parLevels.map((p) => (
                    <tr key={p.id} className="hover:bg-zc-panel/10 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-zc-text">{p.itemName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.minStock}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.reorderLevel}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.reorderQty}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.maxStock}</td>
                      <td className="px-4 py-2.5 text-center"><BoolBadge value={p.isNeverOutOfStock} /></td>
                      <td className="px-4 py-2.5 text-center"><StatusPill active={p.isActive} /></td>
                      {canWrite ? (
                        <td className="px-4 py-2.5 text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingPar(p); setParDrawerOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============ Drawers ============ */}

      {/* Store Link Drawer (OTS-034) */}
      <StoreLinkDrawer
        open={linkDrawerOpen}
        onOpenChange={setLinkDrawerOpen}
        saving={saving}
        onSave={handleCreateLink}
      />

      {/* Consumable Template Drawer (OTS-035) */}
      <ConsumableTemplateDrawer
        open={templateDrawerOpen}
        onOpenChange={(v) => { setTemplateDrawerOpen(v); if (!v) setEditingTemplate(null); }}
        editing={editingTemplate}
        saving={saving}
        onSave={handleSaveTemplate}
      />

      {/* Implant Rule Drawer (OTS-036) */}
      <ImplantRuleDrawer
        open={implantDrawerOpen}
        onOpenChange={setImplantDrawerOpen}
        existingCategories={implantRules.map((r) => r.category)}
        saving={saving}
        onSave={handleCreateImplantRule}
      />

      {/* Par Level Drawer (OTS-037) */}
      <ParLevelDrawer
        open={parDrawerOpen}
        onOpenChange={(v) => { setParDrawerOpen(v); if (!v) setEditingPar(null); }}
        editing={editingPar}
        saving={saving}
        onSave={handleSavePar}
      />
    </div>
  );
}

/* =========================================================
   Bool Badge helper
   ========================================================= */

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      YES
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
      NO
    </span>
  );
}

/* =========================================================
   Store Link Drawer (OTS-034)
   ========================================================= */

function StoreLinkDrawer({
  open,
  onOpenChange,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saving: boolean;
  onSave: (pharmacyStoreId: string, linkType: string) => void;
}) {
  const [storeId, setStoreId] = React.useState("");
  const [linkType, setLinkType] = React.useState("OT_STORE");

  React.useEffect(() => {
    if (open) { setStoreId(""); setLinkType("OT_STORE"); }
  }, [open]);

  const valid = storeId.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader title="Link Pharmacy Store" description="Connect a pharmacy store to this OT suite for consumable and drug management." onClose={() => onOpenChange(false)} />
        <div className="grid gap-6 p-6">
          <Field label="Pharmacy Store ID" required>
            <Input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Enter pharmacy store ID" />
          </Field>
          <Field label="Link Type" required>
            <Select value={linkType} onValueChange={setLinkType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="border-t border-zc-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(storeId.trim(), linkType)} disabled={saving || !valid}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Link Store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Consumable Template Drawer (OTS-035)
   ========================================================= */

type TemplateItem = { name: string; qty: number; unit: string };

function ConsumableTemplateDrawer({
  open,
  onOpenChange,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OtConsumableTemplateRow | null;
  saving: boolean;
  onSave: (data: { name: string; surgeryCategory: OtSurgeryCategory; specialtyCode?: string; items: any; isActive?: boolean }) => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<OtSurgeryCategory>("MINOR");
  const [specialty, setSpecialty] = React.useState("");
  const [items, setItems] = React.useState<TemplateItem[]>([]);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setCategory(editing.surgeryCategory);
        setSpecialty(editing.specialtyCode ?? "");
        setItems(Array.isArray(editing.items) ? editing.items : []);
        setIsActive(editing.isActive);
      } else {
        setName(""); setCategory("MINOR"); setSpecialty(""); setItems([]); setIsActive(true);
      }
    }
  }, [open, editing]);

  const addItem = () => setItems((prev) => [...prev, { name: "", qty: 1, unit: "pcs" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof TemplateItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const valid = name.trim().length > 0 && items.length > 0 && items.every((it) => it.name.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Consumable Template" : "Add Consumable Template"}
          description="Define a reusable list of consumables needed for a surgery category."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Template Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Major Ortho Kit" maxLength={120} />
            </Field>
            <Field label="Surgery Category" required>
              <Select value={category} onValueChange={(v) => setCategory(v as OtSurgeryCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SURGERY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Specialty Code" hint="Optional">
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. ORTHO" maxLength={20} />
            </Field>
            {editing ? (
              <Field label="Status">
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm text-zc-muted">{isActive ? "Active" : "Inactive"}</span>
                </div>
              </Field>
            ) : null}
          </div>

          {/* Items list builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Items <span className="ml-1 text-rose-600">*</span>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
                <IconPlus className="h-3 w-3" /> Add Item
              </Button>
            </div>
            <Separator className="mb-3" />
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-zc-muted">No items added yet. Click &quot;Add Item&quot; to start building the template.</div>
            ) : (
              <div className="grid gap-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-zc-border bg-zc-panel/10 p-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      placeholder="Item name"
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 0)}
                      className="w-20 text-sm text-center"
                      min={1}
                    />
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      placeholder="Unit"
                      className="w-20 text-sm"
                    />
                    <Button variant="ghost" size="sm" className="text-rose-600 shrink-0" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="border-t border-zc-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !valid}
            onClick={() =>
              onSave({
                name: name.trim(),
                surgeryCategory: category,
                specialtyCode: specialty.trim() || undefined,
                items,
                ...(editing ? { isActive } : {}),
              })
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Implant Rule Drawer (OTS-036)
   ========================================================= */

function ImplantRuleDrawer({
  open,
  onOpenChange,
  existingCategories,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingCategories: OtImplantCategory[];
  saving: boolean;
  onSave: (data: {
    category: OtImplantCategory;
    mandatoryBarcodeScan: boolean;
    mandatoryBatchSerial: boolean;
    mandatoryManufacturer: boolean;
    mandatoryPatientConsent: boolean;
  }) => void;
}) {
  const [category, setCategory] = React.useState<OtImplantCategory>("ORTHOPEDIC");
  const [barcode, setBarcode] = React.useState(true);
  const [batchSerial, setBatchSerial] = React.useState(true);
  const [manufacturer, setManufacturer] = React.useState(false);
  const [consent, setConsent] = React.useState(true);

  const availableCategories = IMPLANT_CATEGORIES.filter((c) => !existingCategories.includes(c.value));

  React.useEffect(() => {
    if (open) {
      setBarcode(true); setBatchSerial(true); setManufacturer(false); setConsent(true);
      if (availableCategories.length > 0) setCategory(availableCategories[0].value);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = availableCategories.some((c) => c.value === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title="Add Implant Tracking Rule"
          description="Define mandatory tracking requirements for each implant category."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-6 p-6">
          <Field label="Implant Category" required>
            {availableCategories.length === 0 ? (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                All implant categories already have rules configured.
              </div>
            ) : (
              <Select value={category} onValueChange={(v) => setCategory(v as OtImplantCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Separator />

          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Mandatory Requirements</div>
            <ToggleRow label="Barcode Scan" description="Require barcode scan before implant usage" checked={barcode} onChange={setBarcode} />
            <ToggleRow label="Batch / Serial Number" description="Require batch and serial number capture" checked={batchSerial} onChange={setBatchSerial} />
            <ToggleRow label="Manufacturer" description="Require manufacturer name to be recorded" checked={manufacturer} onChange={setManufacturer} />
            <ToggleRow label="Patient Consent" description="Require documented patient consent for implant" checked={consent} onChange={setConsent} />
          </div>
        </div>
        <DialogFooter className="border-t border-zc-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !valid}
            onClick={() =>
              onSave({
                category,
                mandatoryBarcodeScan: barcode,
                mandatoryBatchSerial: batchSerial,
                mandatoryManufacturer: manufacturer,
                mandatoryPatientConsent: consent,
              })
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Par Level Drawer (OTS-037)
   ========================================================= */

function ParLevelDrawer({
  open,
  onOpenChange,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OtParLevelRow | null;
  saving: boolean;
  onSave: (data: {
    itemName: string;
    drugMasterId?: string;
    minStock: number;
    reorderLevel: number;
    reorderQty: number;
    maxStock: number;
    isNeverOutOfStock?: boolean;
    isActive?: boolean;
  }) => void;
}) {
  const [itemName, setItemName] = React.useState("");
  const [drugMasterId, setDrugMasterId] = React.useState("");
  const [minStock, setMinStock] = React.useState(0);
  const [reorderLevel, setReorderLevel] = React.useState(0);
  const [reorderQty, setReorderQty] = React.useState(0);
  const [maxStock, setMaxStock] = React.useState(0);
  const [neverOos, setNeverOos] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setItemName(editing.itemName);
        setDrugMasterId(editing.drugMasterId ?? "");
        setMinStock(editing.minStock);
        setReorderLevel(editing.reorderLevel);
        setReorderQty(editing.reorderQty);
        setMaxStock(editing.maxStock);
        setNeverOos(editing.isNeverOutOfStock);
        setIsActive(editing.isActive);
      } else {
        setItemName(""); setDrugMasterId(""); setMinStock(0); setReorderLevel(0);
        setReorderQty(0); setMaxStock(0); setNeverOos(false); setIsActive(true);
      }
    }
  }, [open, editing]);

  const valid = itemName.trim().length > 0 && minStock >= 0 && reorderLevel >= 0 && reorderQty > 0 && maxStock > 0 && maxStock >= minStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Par Level" : "Add Par Level"}
          description="Set minimum stock, reorder thresholds, and maximum stock for an OT consumable item."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Item Name" required>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Surgical Gloves (Size 7)" maxLength={150} />
            </Field>
            <Field label="Drug Master ID" hint="Optional">
              <Input value={drugMasterId} onChange={(e) => setDrugMasterId(e.target.value)} placeholder="Link to drug master record" />
            </Field>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Min Stock" required>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(parseInt(e.target.value) || 0)} min={0} />
            </Field>
            <Field label="Reorder Level" required>
              <Input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)} min={0} />
            </Field>
            <Field label="Reorder Qty" required>
              <Input type="number" value={reorderQty} onChange={(e) => setReorderQty(parseInt(e.target.value) || 0)} min={1} />
            </Field>
            <Field label="Max Stock" required>
              <Input type="number" value={maxStock} onChange={(e) => setMaxStock(parseInt(e.target.value) || 0)} min={1} />
            </Field>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ToggleRow label="Never Out of Stock" description="Flag this item as critical — triggers urgent alerts when low" checked={neverOos} onChange={setNeverOos} />
            {editing ? (
              <ToggleRow label="Active" description="Deactivate to stop monitoring this item" checked={isActive} onChange={setIsActive} />
            ) : null}
          </div>
        </div>
        <DialogFooter className="border-t border-zc-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !valid}
            onClick={() =>
              onSave({
                itemName: itemName.trim(),
                drugMasterId: drugMasterId.trim() || undefined,
                minStock,
                reorderLevel,
                reorderQty,
                maxStock,
                isNeverOutOfStock: neverOos,
                ...(editing ? { isActive } : {}),
              })
            }
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Update Par Level" : "Create Par Level"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Toggle Row helper
   ========================================================= */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-panel/10 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zc-text">{label}</div>
        <div className="text-xs text-zc-muted">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
