"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  FileText,
  Plus,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";

import type {
  OtChecklistTemplateRow,
  OtComplianceConfigRow,
  OtNabhCheckRow,
  OtSuiteRow,
} from "../../_shared/types";
import {
  NoBranchGuard,
  OtPageHeader,
  SuiteContextBar,
  ErrorAlert,
  OnboardingCallout,
  SectionHeader,
  EmptyRow,
  Field,
  ModalHeader,
  drawerClassName,
} from "../../_shared/components";
import { COMPLIANCE_CONFIG_TYPES, CHECKLIST_PHASES } from "../../_shared/constants";
import { humanize, parseJsonSafe, safeArray } from "../../_shared/utils";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 09 — Compliance & Safety Page
   OTS-052 through OTS-058
   ========================================================= */

const API = "/api/infrastructure/ot/compliance";

type ChecklistItem = { label: string; required: boolean; helpText?: string };

const EMPTY_TEMPLATE: Omit<OtChecklistTemplateRow, "id" | "suiteId" | "isActive"> = {
  name: "",
  phase: "SIGN_IN",
  templateType: "WHO",
  items: [],
  version: 1,
  isSystem: false,
};

export default function CompliancePage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Compliance & Safety">
      <RequirePerm perm="ot.compliance.read">
        {branchId ? <ComplianceContent branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Main Content ---- */

function ComplianceContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const canWrite = hasPerm(useAuthStore.getState(), "ot.compliance.write");

  /* ---- State ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [nabhChecks, setNabhChecks] = React.useState<OtNabhCheckRow[]>([]);
  const [templates, setTemplates] = React.useState<OtChecklistTemplateRow[]>([]);
  const [configs, setConfigs] = React.useState<OtComplianceConfigRow[]>([]);

  /* Drawers */
  const [templateDrawerOpen, setTemplateDrawerOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<OtChecklistTemplateRow | null>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState<OtComplianceConfigRow | null>(null);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-compliance" });

  /* ---- Fetch ---- */
  const qs = `?branchId=${encodeURIComponent(branchId)}`;

  const loadAll = React.useCallback(
    async (showToast = false) => {
      setError(null);
      setLoading(true);
      try {
        const [suiteRes, nabhRes, templatesRes, configsRes] = await Promise.allSettled([
          apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
          apiFetch<OtNabhCheckRow[]>(`${API}/suites/${suiteId}/nabh-validation${qs}`),
          apiFetch<OtChecklistTemplateRow[]>(`${API}/suites/${suiteId}/checklist-templates${qs}`),
          apiFetch<OtComplianceConfigRow[]>(`${API}/suites/${suiteId}/compliance-configs${qs}`),
        ]);

        if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
        else setError("Failed to load suite context.");

        setNabhChecks(nabhRes.status === "fulfilled" ? safeArray(nabhRes.value) : []);
        setTemplates(templatesRes.status === "fulfilled" ? safeArray(templatesRes.value) : []);
        setConfigs(configsRes.status === "fulfilled" ? safeArray(configsRes.value) : []);

        if (showToast) toast({ title: "Compliance data refreshed" });
      } catch (e: any) {
        setError(e?.message || "Failed to load compliance data.");
      } finally {
        setLoading(false);
      }
    },
    [branchId, suiteId, qs, toast],
  );

  React.useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  /* ---- Template CRUD ---- */
  const handleSaveTemplate = async (data: Record<string, any>) => {
    try {
      if (editingTemplate) {
        await apiFetch(`${API}/checklist-templates/${editingTemplate.id}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast({ title: "Checklist template updated" });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/checklist-templates${qs}`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Checklist template created" });
      }
      setTemplateDrawerOpen(false);
      setEditingTemplate(null);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Save failed", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this checklist template?")) return;
    try {
      await apiFetch(`${API}/checklist-templates/${id}${qs}`, { method: "DELETE" });
      toast({ title: "Template deleted" });
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Delete failed", variant: "destructive" });
    }
  };

  /* ---- Config CRUD ---- */
  const handleSaveConfig = async (data: Record<string, any>) => {
    try {
      if (editingConfig) {
        await apiFetch(`${API}/compliance-configs/${editingConfig.id}${qs}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast({ title: "Compliance config updated" });
      } else {
        await apiFetch(`${API}/suites/${suiteId}/compliance-configs${qs}`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Compliance config created" });
      }
      setConfigDrawerOpen(false);
      setEditingConfig(null);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Save failed", variant: "destructive" });
    }
  };

  /* ---- Helpers ---- */
  const nabhSummary = React.useMemo(() => {
    const total = nabhChecks.length;
    const compliant = nabhChecks.filter((c) => c.status === "COMPLIANT").length;
    const partial = nabhChecks.filter((c) => c.status === "PARTIAL").length;
    const nonCompliant = nabhChecks.filter((c) => c.status === "NON_COMPLIANT").length;
    return { total, compliant, partial, nonCompliant };
  }, [nabhChecks]);

  const configTypeMap = React.useMemo(() => {
    const map: Record<string, OtComplianceConfigRow> = {};
    configs.forEach((c) => {
      map[c.configType] = c;
    });
    return map;
  }, [configs]);

  /* ---- Render ---- */
  return (
    <div className="grid gap-6">
      {/* Suite Context Bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* Page Header */}
      <OtPageHeader
        icon={<Shield className="h-5 w-5 text-zc-accent" />}
        title="Compliance & Safety"
        description="WHO checklists, NABH validation, infection control, and regulatory compliance configuration."
        loading={loading}
        onRefresh={() => void loadAll(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* ============================================
          1. NABH Validation Panel (OTS-057)
          ============================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            NABH Validation
          </CardTitle>
          <CardDescription className="text-sm">
            9-point compliance check against NABH OT standards. Auto-computed from suite configuration.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-zc-muted">Loading NABH checks...</div>
          ) : nabhChecks.length === 0 ? (
            <div className="py-8 text-center text-sm text-zc-muted">
              No NABH validation data available. Complete suite setup to generate checks.
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div className="mb-4 flex flex-wrap gap-3">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  Compliant: {nabhSummary.compliant}
                </Badge>
                <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                  Partial: {nabhSummary.partial}
                </Badge>
                <Badge variant="outline" className="border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                  Non-Compliant: {nabhSummary.nonCompliant}
                </Badge>
              </div>

              {/* Check rows */}
              <div className="grid gap-2">
                {nabhChecks.map((check) => (
                  <div
                    key={check.code}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3",
                      check.status === "COMPLIANT" && "border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10",
                      check.status === "PARTIAL" && "border-amber-200/50 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10",
                      check.status === "NON_COMPLIANT" && "border-rose-200/50 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-900/10",
                    )}
                  >
                    {check.status === "COMPLIANT" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : check.status === "PARTIAL" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zc-text">{check.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {check.clause}
                        </Badge>
                      </div>
                      {check.detail ? (
                        <div className="mt-0.5 text-xs text-zc-muted">{check.detail}</div>
                      ) : null}
                    </div>
                    <NabhStatusBadge status={check.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ============================================
          2. WHO Checklist Config (OTS-052)
          ============================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            WHO Surgical Safety Checklist
          </CardTitle>
          <CardDescription className="text-sm">
            Three-phase checklist enforcement: Sign In, Time Out, Sign Out. Configure standard and hospital-specific items.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <WhoChecklistSummary
            templates={templates.filter((t) => t.templateType === "WHO")}
            whoConfig={configTypeMap["WHO_CHECKLIST"] ?? null}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* ============================================
          3. Checklist Templates Table
          ============================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Checklist Templates</CardTitle>
              <CardDescription className="text-sm">
                Manage checklist templates across all phases and types.
              </CardDescription>
            </div>
            {canWrite ? (
              <Button
                variant="primary"
                className="gap-2 px-4"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateDrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Phase</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">Version</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">System</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zc-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={7} loading />
                ) : templates.length === 0 ? (
                  <EmptyRow colSpan={7} message="No checklist templates configured yet." />
                ) : (
                  templates.map((t) => {
                    const items = safeArray<ChecklistItem>(parseJsonSafe(t.items, []));
                    return (
                      <tr key={t.id} className="border-b border-zc-border/50 hover:bg-zc-panel/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-zc-text">{t.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {humanize(t.phase)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-zc-muted">{t.templateType}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-zc-muted">v{t.version}</td>
                        <td className="px-4 py-3 text-center">
                          {t.isSystem ? (
                            <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-[10px] text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                              System
                            </Badge>
                          ) : (
                            <span className="text-xs text-zc-muted">Custom</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">{items.length}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canWrite ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setEditingTemplate(t);
                                    setTemplateDrawerOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                {!t.isSystem ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                                    onClick={() => void handleDeleteTemplate(t.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============================================
          4. Compliance Config Cards (OTS-053 through OTS-058)
          ============================================ */}
      <SectionHeader title="Compliance Configurations" count={configs.length}>
        {canWrite ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditingConfig(null);
              setConfigDrawerOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Config
          </Button>
        ) : null}
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COMPLIANCE_CONFIG_TYPES.map((ct) => {
          const cfg = configTypeMap[ct.value];
          return (
            <ComplianceConfigCard
              key={ct.value}
              label={ct.label}
              configType={ct.value}
              config={cfg ?? null}
              canWrite={canWrite}
              onEdit={() => {
                if (cfg) {
                  setEditingConfig(cfg);
                  setConfigDrawerOpen(true);
                } else {
                  setEditingConfig(null);
                  setConfigDrawerOpen(true);
                }
              }}
            />
          );
        })}
      </div>

      {/* ============================================
          5. Onboarding Callout
          ============================================ */}
      <OnboardingCallout
        title="Compliance & Safety Setup"
        description="Configure WHO surgical safety checklists, NABH compliance checks, infection control zones, fumigation schedules, biomedical waste protocols, and fire safety policies. All configs feed into the NABH validation score."
      />

      {/* ---- Template Drawer ---- */}
      <Dialog open={templateDrawerOpen} onOpenChange={(v) => { setTemplateDrawerOpen(v); if (!v) setEditingTemplate(null); }}>
        <DialogContent className={drawerClassName()}>
          <TemplateDrawer
            editing={editingTemplate}
            onSave={handleSaveTemplate}
            onClose={() => { setTemplateDrawerOpen(false); setEditingTemplate(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* ---- Config Drawer ---- */}
      <Dialog open={configDrawerOpen} onOpenChange={(v) => { setConfigDrawerOpen(v); if (!v) setEditingConfig(null); }}>
        <DialogContent className={drawerClassName()}>
          <ConfigDrawer
            editing={editingConfig}
            onSave={handleSaveConfig}
            onClose={() => { setConfigDrawerOpen(false); setEditingConfig(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
   Sub-components
   ========================================================= */

/* ---- NABH Status Badge ---- */
function NabhStatusBadge({ status }: { status: OtNabhCheckRow["status"] }) {
  if (status === "COMPLIANT") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        Compliant
      </span>
    );
  }
  if (status === "PARTIAL") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50/70 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
      Non-Compliant
    </span>
  );
}

/* ---- WHO Checklist Summary ---- */
function WhoChecklistSummary({
  templates,
  whoConfig,
  loading,
}: {
  templates: OtChecklistTemplateRow[];
  whoConfig: OtComplianceConfigRow | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="py-6 text-center text-sm text-zc-muted">Loading WHO checklist data...</div>;
  }

  const phases = ["SIGN_IN", "TIME_OUT", "SIGN_OUT"] as const;
  const configJson = parseJsonSafe<Record<string, any>>(whoConfig?.config, {});

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {phases.map((phase) => {
        const phaseTemplates = templates.filter((t) => t.phase === phase);
        const totalItems = phaseTemplates.reduce((sum, t) => {
          const items = safeArray(parseJsonSafe(t.items, []));
          return sum + items.length;
        }, 0);
        const enforcement = configJson[phase]?.enforcement ?? "MANDATORY";
        const phaseLabel = CHECKLIST_PHASES.find((p) => p.value === phase)?.label ?? humanize(phase);

        return (
          <div
            key={phase}
            className="rounded-xl border border-zc-border bg-zc-panel/15 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zc-text">{phaseLabel}</div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  enforcement === "MANDATORY"
                    ? "border-rose-200 text-rose-700 dark:border-rose-900/40 dark:text-rose-300"
                    : enforcement === "RECOMMENDED"
                      ? "border-amber-200 text-amber-700 dark:border-amber-900/40 dark:text-amber-300"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
                )}
              >
                {humanize(enforcement)}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-zc-muted">Templates</div>
                <div className="mt-0.5 text-sm font-semibold text-zc-text">{phaseTemplates.length}</div>
              </div>
              <div>
                <div className="text-zc-muted">Total Items</div>
                <div className="mt-0.5 text-sm font-semibold text-zc-text">{totalItems}</div>
              </div>
            </div>
            {phaseTemplates.length > 0 ? (
              <div className="mt-3 space-y-1">
                {phaseTemplates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-zc-muted">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="truncate">{t.name}</span>
                    {t.isSystem ? (
                      <Badge variant="outline" className="text-[9px] ml-auto">Sys</Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-zc-muted italic">No templates for this phase.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Compliance Config Card ---- */
function ComplianceConfigCard({
  label,
  configType,
  config,
  canWrite,
  onEdit,
}: {
  label: string;
  configType: string;
  config: OtComplianceConfigRow | null;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const configJson = config ? parseJsonSafe<Record<string, any>>(config.config, {}) : null;
  const keys = configJson ? Object.keys(configJson).slice(0, 4) : [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-elev-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zc-text">{label}</div>
            <div className="mt-0.5 text-xs text-zc-muted">{humanize(configType)}</div>
          </div>
          {config ? (
            config.isActive ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-[10px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-[10px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                Inactive
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="text-[10px] text-zc-muted">
              Not Configured
            </Badge>
          )}
        </div>

        {/* Config summary */}
        {configJson && keys.length > 0 ? (
          <div className="mt-3 space-y-1">
            {keys.map((key) => {
              const val = configJson[key];
              const display = typeof val === "object" ? JSON.stringify(val).slice(0, 40) + (JSON.stringify(val).length > 40 ? "..." : "") : String(val);
              return (
                <div key={key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zc-muted truncate">{humanize(key)}</span>
                  <span className="font-mono text-zc-text truncate max-w-[120px]">{display}</span>
                </div>
              );
            })}
            {Object.keys(configJson).length > 4 ? (
              <div className="text-xs text-zc-muted italic">+{Object.keys(configJson).length - 4} more fields</div>
            ) : null}
          </div>
        ) : !config ? (
          <div className="mt-3 text-xs text-zc-muted italic">No configuration set. Click edit to configure.</div>
        ) : null}

        {/* Audit dates */}
        {config?.lastAuditAt || config?.nextAuditDue ? (
          <div className="mt-3 flex gap-3 text-[11px] text-zc-muted">
            {config.lastAuditAt ? (
              <span>Last audit: {new Date(config.lastAuditAt).toLocaleDateString()}</span>
            ) : null}
            {config.nextAuditDue ? (
              <span>Next due: {new Date(config.nextAuditDue).toLocaleDateString()}</span>
            ) : null}
          </div>
        ) : null}

        {canWrite ? (
          <Button variant="outline" size="sm" className="mt-3 w-full gap-2" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
            {config ? "Edit Config" : "Configure"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ---- Template Drawer ---- */
function TemplateDrawer({
  editing,
  onSave,
  onClose,
}: {
  editing: OtChecklistTemplateRow | null;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(editing?.name ?? "");
  const [phase, setPhase] = React.useState(editing?.phase ?? "SIGN_IN");
  const [templateType, setTemplateType] = React.useState(editing?.templateType ?? "WHO");
  const [version, setVersion] = React.useState(editing?.version ?? 1);
  const [isSystem, setIsSystem] = React.useState(editing?.isSystem ?? false);
  const [items, setItems] = React.useState<ChecklistItem[]>(
    safeArray<ChecklistItem>(parseJsonSafe(editing?.items, [])),
  );
  const [newItemLabel, setNewItemLabel] = React.useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (items.length === 0) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phase,
        templateType,
        items: JSON.stringify(items),
        version,
        ...(editing ? {} : { isSystem }),
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!newItemLabel.trim()) return;
    setItems((prev) => [...prev, { label: newItemLabel.trim(), required: true }]);
    setNewItemLabel("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleRequired = (idx: number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, required: !item.required } : item)));
  };

  return (
    <div className="grid gap-6 p-6">
      <ModalHeader
        title={editing ? "Edit Checklist Template" : "Add Checklist Template"}
        description="Define checklist items for a specific surgical safety phase."
        onClose={onClose}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WHO Sign-In Standard" />
        </Field>
        <Field label="Phase" required>
          <Select value={phase} onValueChange={(v) => setPhase(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHECKLIST_PHASES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Template Type" required>
          <Input value={templateType} onChange={(e) => setTemplateType(e.target.value)} placeholder="WHO" />
        </Field>
        <Field label="Version">
          <Input type="number" value={version} onChange={(e) => setVersion(Number(e.target.value) || 1)} min={1} />
        </Field>
      </div>

      {/* Items builder */}
      <div className="grid gap-3">
        <Field label="Checklist Items" required hint={`${items.length} item(s)`}>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-zc-border bg-zc-panel/10 px-3 py-2">
                <span className="flex-1 text-sm text-zc-text">{item.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-6 px-2 text-[10px]", item.required ? "text-rose-600" : "text-zc-muted")}
                  onClick={() => toggleRequired(idx)}
                >
                  {item.required ? "Required" : "Optional"}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-500" onClick={() => removeItem(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Field>
        <div className="flex gap-2">
          <Input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="New checklist item label..."
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          />
          <Button variant="outline" className="shrink-0 gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving || !name.trim() || items.length === 0}>
          {saving ? "Saving..." : editing ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </div>
  );
}

/* ---- Config Drawer ---- */
function ConfigDrawer({
  editing,
  onSave,
  onClose,
}: {
  editing: OtComplianceConfigRow | null;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [configType, setConfigType] = React.useState(editing?.configType ?? "WHO_CHECKLIST");
  const [configJson, setConfigJson] = React.useState(
    editing?.config ? (typeof editing.config === "string" ? editing.config : JSON.stringify(editing.config, null, 2)) : "{\n  \n}",
  );
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [lastAuditAt, setLastAuditAt] = React.useState(editing?.lastAuditAt?.slice(0, 10) ?? "");
  const [nextAuditDue, setNextAuditDue] = React.useState(editing?.nextAuditDue?.slice(0, 10) ?? "");

  const validateJson = (val: string) => {
    try {
      JSON.parse(val);
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateJson(configJson)) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        config: JSON.parse(configJson),
      };
      if (!editing) {
        payload.configType = configType;
      }
      if (lastAuditAt) payload.lastAuditAt = new Date(lastAuditAt).toISOString();
      if (nextAuditDue) payload.nextAuditDue = new Date(nextAuditDue).toISOString();
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 p-6">
      <ModalHeader
        title={editing ? "Edit Compliance Config" : "Add Compliance Config"}
        description="Configure compliance parameters as JSON."
        onClose={onClose}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Config Type" required>
          <Select value={configType} onValueChange={(v) => setConfigType(v as any)} disabled={!!editing}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMPLIANCE_CONFIG_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div /> {/* spacer */}
        <Field label="Last Audit Date">
          <Input type="date" value={lastAuditAt} onChange={(e) => setLastAuditAt(e.target.value)} />
        </Field>
        <Field label="Next Audit Due">
          <Input type="date" value={nextAuditDue} onChange={(e) => setNextAuditDue(e.target.value)} />
        </Field>
      </div>

      <Field label="Configuration (JSON)" required error={jsonError}>
        <Textarea
          value={configJson}
          onChange={(e) => {
            setConfigJson(e.target.value);
            if (jsonError) validateJson(e.target.value);
          }}
          onBlur={() => validateJson(configJson)}
          rows={12}
          className="font-mono text-xs"
          placeholder='{ "key": "value" }'
        />
      </Field>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving || !!jsonError}>
          {saving ? "Saving..." : editing ? "Update Config" : "Create Config"}
        </Button>
      </div>
    </div>
  );
}
