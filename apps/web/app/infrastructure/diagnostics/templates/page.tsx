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
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { Plus, RefreshCw, Pencil, Search, Trash2 } from "lucide-react";

import type { DiagnosticItemRow, TemplateRow, TemplateKind } from "../_shared/types";
import { TEMPLATE_KINDS } from "../_shared/constants";
import { safeArray, validateName } from "../_shared/utils";
import { Field, ModalHeader, modalClassName } from "../_shared/components";

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
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
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
   TemplatesPage
   ========================================================= */

function TemplatesContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [itemId, setItemId] = React.useState("");
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<TemplateRow | null>(null);

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

  React.useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadTemplates(itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Templates</CardTitle>
        <CardDescription>Report templates for lab or imaging items.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}
        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Item">
              <Select value={itemId} onValueChange={setItemId} disabled={loading}>
                <SelectTrigger className="h-10 w-[320px]"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={() => { setEditingTemplate(null); setDialogOpen(true); }} disabled={!itemId}>
              <Plus className="mr-2 h-4 w-4" /> Template
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No templates available.</div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zc-text">{t.name}</div>
                    <div className="text-xs text-zc-muted">{t.kind}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(t); setDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(t.id)}`, { method: "DELETE" });
                          toast({ title: "Template deactivated" });
                          await loadTemplates(itemId);
                        } catch (e: any) {
                          toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-zc-muted whitespace-pre-wrap">{t.body}</div>
              </div>
            ))
          )}
        </div>
        <TemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          branchId={branchId}
          itemId={itemId}
          editing={editingTemplate}
          onSaved={() => loadTemplates(itemId)}
        />
      </CardContent>
    </Card>
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
        <TemplatesContent branchId={branchId} />
      </RequirePerm>
    </AppShell>
  );
}
