"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconClipboard } from "@/components/icons";
import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";

import type { DiagnosticItemRow, TemplateRow, TemplateKind } from "../_shared/types";
import { TEMPLATE_KINDS } from "../_shared/constants";
import { safeArray, validateName } from "../_shared/utils";
import {
  Field,
  ModalHeader,
  NoBranchGuard,
  modalClassName,
  ToneBadge,
  PageHeader,
  ErrorAlert,
  StatusPill,
  StatBox,
  SearchBar,
  OnboardingCallout,
} from "../_shared/components";

/* =========================================================
   TemplateDialog
   ========================================================= */

function TemplateDialog({
  open,
  onOpenChange,
  branchId,
  itemId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  itemId: string;
  editing: TemplateRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<TemplateKind>("IMAGING_REPORT");
  const [body, setBody] = React.useState("");
  const [hospitalName, setHospitalName] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [nablNumber, setNablNumber] = React.useState("");
  const [regNumber, setRegNumber] = React.useState("");
  const [footerText, setFooterText] = React.useState("");
  const [signatureRolesText, setSignatureRolesText] = React.useState("");
  const [groupBy, setGroupBy] = React.useState("section");
  const [showUnits, setShowUnits] = React.useState(true);
  const [showRanges, setShowRanges] = React.useState(true);
  const [showFlags, setShowFlags] = React.useState(true);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "IMAGING_REPORT");
    setBody(editing?.body ?? "");
    const hc = editing?.headerConfig && typeof editing.headerConfig === "object" ? editing.headerConfig as any : {};
    setHospitalName(hc.hospitalName ?? "");
    setLogoUrl(hc.logoUrl ?? "");
    setNablNumber(hc.nablNumber ?? "");
    setRegNumber(hc.regNumber ?? "");
    setFooterText(editing?.footerConfig ? (typeof editing.footerConfig === "string" ? editing.footerConfig : JSON.stringify(editing.footerConfig)) : "");
    setSignatureRolesText(Array.isArray(editing?.signatureRoles) ? (editing.signatureRoles as string[]).join(", ") : "");
    const pl = editing?.parameterLayout && typeof editing.parameterLayout === "object" ? editing.parameterLayout as any : {};
    setGroupBy(pl.groupBy ?? "section");
    setShowUnits(pl.showUnits ?? true);
    setShowRanges(pl.showRanges ?? true);
    setShowFlags(pl.showFlags ?? true);
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const nameErr = validateName(name, "Template");
    if (nameErr) {
      setErr(nameErr);
      return;
    }
    if (!body.trim()) {
      setErr("Template body is required");
      return;
    }
    const sigRoles = signatureRolesText.trim()
      ? signatureRolesText.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const headerConfig = (hospitalName.trim() || logoUrl.trim() || nablNumber.trim() || regNumber.trim())
      ? { hospitalName: hospitalName.trim() || undefined, logoUrl: logoUrl.trim() || undefined, nablNumber: nablNumber.trim() || undefined, regNumber: regNumber.trim() || undefined }
      : null;
    const parameterLayout = { groupBy, showUnits, showRanges, showFlags };

    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            name: name.trim(),
            kind,
            body: body.trim(),
            headerConfig,
            footerConfig: footerText.trim() || null,
            signatureRoles: sigRoles,
            parameterLayout,
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(itemId)}/templates?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            kind,
            body: body.trim(),
            headerConfig: headerConfig || undefined,
            footerConfig: footerText.trim() || undefined,
            signatureRoles: sigRoles,
            parameterLayout,
          }),
        });
      }
      toast({ title: editing ? "Template updated" : "Template created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Template" : "Create Template"}
          description="Plain text report template (MVP)."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          <ErrorAlert message={err} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Imaging report" />
            </Field>
            <Field label="Kind" required>
              <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Body" required>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Template body..." />
          </Field>
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Header Configuration</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Hospital Name">
                <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="City General Hospital" />
              </Field>
              <Field label="Logo URL">
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="NABL Number">
                <Input value={nablNumber} onChange={(e) => setNablNumber(e.target.value)} placeholder="MC-XXXX" />
              </Field>
              <Field label="Registration Number">
                <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="REG-XXXX" />
              </Field>
            </div>
          </div>
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Parameter Layout</div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Group By">
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section">Section</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="specimen">Specimen</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox checked={showUnits} onCheckedChange={(v) => setShowUnits(Boolean(v))} />
                <span className="text-sm">Show Units</span>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox checked={showRanges} onCheckedChange={(v) => setShowRanges(Boolean(v))} />
                <span className="text-sm">Show Ranges</span>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox checked={showFlags} onCheckedChange={(v) => setShowFlags(Boolean(v))} />
                <span className="text-sm">Show Flags</span>
              </div>
            </div>
          </div>
          <Field label="Footer" hint="Report footer text/config">
            <Textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={2} placeholder="Disclaimer, page numbers..." />
          </Field>
          <Field label="Signature Roles" hint="Comma-separated, e.g. Pathologist, Lab Director">
            <Input value={signatureRolesText} onChange={(e) => setSignatureRolesText(e.target.value)} placeholder="Pathologist, Lab Director" />
          </Field>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !itemId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   TemplatesContent
   ========================================================= */

function TemplatesContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPerm(user, "INFRA_DIAGNOSTICS_CREATE");
  const canUpdate = hasPerm(user, "INFRA_DIAGNOSTICS_UPDATE");
  const canDelete = hasPerm(user, "INFRA_DIAGNOSTICS_DELETE");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [itemId, setItemId] = React.useState("");
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [q, setQ] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<TemplateRow | null>(null);

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-templates" });

  async function loadItems() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`);
      setItems(safeArray(rows));
      if (!itemId && rows?.[0]?.id) setItemId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates(id: string) {
    if (!id) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<TemplateRow[]>(`/api/infrastructure/diagnostics/items/${encodeURIComponent(id)}/templates?branchId=${encodeURIComponent(branchId)}`);
      setTemplates(safeArray(rows));
    } catch (e: any) {
      setErr(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function refreshAll() {
    void loadItems();
    void loadTemplates(itemId);
  }

  React.useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadTemplates(itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const activeCount = templates.filter((t) => t.isActive ?? true).length;
  const inactiveCount = templates.length - activeCount;

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter((t) => {
      const hay = `${t.name} ${t.kind}`.toLowerCase();
      return hay.includes(s);
    });
  }, [templates, q]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconClipboard className="h-5 w-5 text-zc-accent" />}
        title="Report Templates"
        description="Manage report templates for lab and imaging diagnostic items."
        loading={loading}
        onRefresh={refreshAll}
        canCreate={canCreate}
        createLabel="Create Template"
        onCreate={() => { setEditingTemplate(null); setDialogOpen(true); }}
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">
            Select a diagnostic item and manage its report templates. Create, edit and deactivate templates.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <StatBox label="Total Templates" value={templates.length} color="blue" />
            <StatBox label="Active" value={activeCount} color="emerald" />
            <StatBox label="Inactive" value={inactiveCount} color="amber" />
          </div>

          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <Field label="Item">
              <Select value={itemId} onValueChange={setItemId} disabled={loading}>
                <SelectTrigger className="h-10 w-full lg:w-[400px]"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search templates by name or kind..."
            filteredCount={filtered.length}
            totalCount={templates.length}
          />

          <ErrorAlert message={err} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Templates</CardTitle>
          <CardDescription className="text-sm">Report templates for the selected diagnostic item.</CardDescription>
        </CardHeader>
        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Kind</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zc-muted">
                    {loading ? "Loading templates..." : "No templates available."}
                  </td>
                </tr>
              ) : null}

              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zc-text">{t.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <ToneBadge tone="sky">{t.kind}</ToneBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={t.isActive ?? true} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate ? (
                        <Button
                          variant="info"
                          size="icon"
                          onClick={() => { setEditingTemplate(t); setDialogOpen(true); }}
                          title="Edit template"
                          aria-label="Edit template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}

                      {canDelete ? (
                        (t.isActive ?? true) ? (
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(t.id)}`, { method: "DELETE" });
                                toast({ title: "Deactivated", description: "Template marked inactive." });
                                await loadTemplates(itemId);
                              } catch (e: any) {
                                toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                              }
                            }}
                            title="Deactivate template"
                            aria-label="Deactivate template"
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="icon"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(t.id)}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ branchId, isActive: true }),
                                });
                                toast({ title: "Activated", description: "Template is active again." });
                                await loadTemplates(itemId);
                              } catch (e: any) {
                                toast({ title: "Activate failed", description: e?.message || "Error", variant: "destructive" as any });
                              }
                            }}
                            title="Reactivate template"
                            aria-label="Reactivate template"
                          >
                            <ToggleRight className="h-4 w-4" />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Template setup guide"
        description="1) Select a diagnostic item from the dropdown above, 2) Create report templates for lab results or imaging reports, 3) Configure header, footer, and parameter layout settings within each template."
      />

      {/* Dialog */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branchId={branchId}
        itemId={itemId}
        editing={editingTemplate}
        onSaved={() => loadTemplates(itemId)}
      />
    </div>
  );
}

/* =========================================================
   Page (default export)
   ========================================================= */

export default function ReportTemplatesPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Report Templates">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <TemplatesContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}
