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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { Plus } from "lucide-react";

import type {
  DiagnosticPackRow,
  DiagnosticPackVersionRow,
  FlatLocationNode,
  LabType,
  PackVersionStatus,
} from "../_shared/types";

import {
  LAB_TYPE_OPTIONS,
  SERVICE_POINT_TYPES,
  DIAG_KINDS,
  TEMPLATE_KINDS,
  MODALITIES,
} from "../_shared/constants";

import {
  safeArray,
  normalizeCode,
  flattenLocationTree,
  normalizeLocationTree,
  validateCode,
  validateName,
  toFloat,
  toInt,
  asRecord,
} from "../_shared/utils";

import {
  Field,
  ModalHeader,
  drawerClassName,
} from "../_shared/components";

/* =========================================================
   SAMPLE_PACK_PAYLOAD
   ========================================================= */

const SAMPLE_PACK_PAYLOAD = {
  servicePoints: [
    { code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true },
  ],
  sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
  categories: [{ code: "BIOCHEM", name: "Biochemistry", sectionCode: "LAB", sortOrder: 10 }],
  specimens: [{ code: "SERUM", name: "Serum", container: "Vacutainer" }],
  items: [
    {
      code: "GLU",
      name: "Glucose (Fasting)",
      kind: "LAB",
      sectionCode: "LAB",
      categoryCode: "BIOCHEM",
      specimenCode: "SERUM",
      tatMinsRoutine: 60,
      isPanel: false,
    },
  ],
  parameters: [
    { itemCode: "GLU", code: "GLU", name: "Glucose", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
  ],
  ranges: [
    { itemCode: "GLU", parameterCode: "GLU", low: 70, high: 100, textRange: "Normal" },
  ],
  templates: [
    { itemCode: "GLU", kind: "LAB_REPORT", name: "Lab report", body: "Result: {{value}}" },
  ],
  capabilities: [
    { servicePointCode: "LAB", itemCode: "GLU", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
  ],
};

/* =========================================================
   PackDialog
   ========================================================= */

function PackDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DiagnosticPackRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [labType, setLabType] = React.useState<LabType | "none">("none");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setLabType((editing?.labType as LabType) ?? "none");
    setDescription(editing?.description ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Pack");
    const nameErr = validateName(name, "Pack");
    if (!editing && codeErr) {
      setErr(codeErr);
      return;
    }
    if (nameErr) {
      setErr(nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            labType: labType === "none" ? null : labType,
            description: description.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/packs", {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(code),
            name: name.trim(),
            labType: labType === "none" ? undefined : labType,
            description: description.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Pack updated" : "Pack created" });
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
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Pack" : "Create Pack"}
          description="Pack metadata stored in the backend."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BASIC_DIAGNOSTICS" disabled={!!editing} />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Basic Diagnostics Pack" />
          </Field>
          <Field label="Lab type">
            <Select value={labType} onValueChange={(v) => setLabType(v as LabType | "none")}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select lab type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lab type</SelectItem>
                {LAB_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
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
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   PackVersionDialog
   ========================================================= */

function PackVersionDialog({
  open,
  onOpenChange,
  packId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packId: string;
  editing: DiagnosticPackVersionRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [version, setVersion] = React.useState("");
  const [status, setStatus] = React.useState<PackVersionStatus>("DRAFT");
  const [notes, setNotes] = React.useState("");
  const [mode, setMode] = React.useState<"guided" | "json">("guided");
  const [payloadText, setPayloadText] = React.useState("");
  const [builder, setBuilder] = React.useState<any>({
    servicePoints: [],
    sections: [],
    categories: [],
    specimens: [],
    items: [],
    templates: [],
    capabilities: [],
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function normalizePayload(input: any) {
    const p = input ?? {};
    return {
      servicePoints: safeArray<any>(p.servicePoints).map((sp) => ({
        code: sp.code ?? "",
        name: sp.name ?? "",
        type: sp.type ?? "OTHER",
        requiresPlacement: sp.requiresPlacement !== false,
      })),
      sections: safeArray<any>(p.sections).map((s) => ({
        code: s.code ?? "",
        name: s.name ?? "",
      })),
      categories: safeArray<any>(p.categories).map((c) => ({
        code: c.code ?? "",
        name: c.name ?? "",
        sectionCode: c.sectionCode ?? "",
      })),
      specimens: safeArray<any>(p.specimens).map((s) => ({
        code: s.code ?? "",
        name: s.name ?? "",
        container: s.container ?? "",
        minVolumeMl: s.minVolumeMl != null ? String(s.minVolumeMl) : "",
        handlingNotes: s.handlingNotes ?? "",
      })),
      items: safeArray<any>(p.items).map((i) => ({
        code: i.code ?? "",
        name: i.name ?? "",
        kind: i.kind ?? "LAB",
        sectionCode: i.sectionCode ?? "",
        categoryCode: i.categoryCode ?? "",
        specimenCode: i.specimenCode ?? "",
        isPanel: Boolean(i.isPanel),
        requiresAppointment: Boolean(i.requiresAppointment),
        consentRequired: Boolean(i.consentRequired),
        preparationText: i.preparationText ?? "",
      })),
      templates: safeArray<any>(p.templates).map((t) => ({
        itemCode: t.itemCode ?? "",
        kind: t.kind ?? "IMAGING_REPORT",
        name: t.name ?? "",
        body: t.body ?? "",
      })),
      capabilities: safeArray<any>(p.capabilities).map((c) => ({
        servicePointCode: c.servicePointCode ?? "",
        itemCode: c.itemCode ?? "",
        modality: c.modality ?? "",
        defaultDurationMins: c.defaultDurationMins != null ? String(c.defaultDurationMins) : "",
        isPrimary: Boolean(c.isPrimary),
      })),
    };
  }

  function buildPayloadFromBuilder(b: any) {
    const payload: any = {};
    const servicePoints = safeArray<any>(b.servicePoints)
      .filter((sp) => sp.code || sp.name)
      .map((sp) => ({
        code: sp.code,
        name: sp.name,
        type: sp.type || "OTHER",
        requiresPlacement: sp.requiresPlacement !== false,
      }));
    if (servicePoints.length) payload.servicePoints = servicePoints;

    const sections = safeArray<any>(b.sections)
      .filter((s) => s.code || s.name)
      .map((s) => ({ code: s.code, name: s.name }));
    if (sections.length) payload.sections = sections;

    const categories = safeArray<any>(b.categories)
      .filter((c) => c.code || c.name)
      .map((c) => ({ code: c.code, name: c.name, sectionCode: c.sectionCode }));
    if (categories.length) payload.categories = categories;

    const specimens = safeArray<any>(b.specimens)
      .filter((s) => s.code || s.name)
      .map((s) => ({
        code: s.code,
        name: s.name,
        container: s.container?.trim() || undefined,
        minVolumeMl: toFloat(s.minVolumeMl) ?? undefined,
        handlingNotes: s.handlingNotes?.trim() || undefined,
      }));
    if (specimens.length) payload.specimens = specimens;

    const items = safeArray<any>(b.items)
      .filter((i) => i.code || i.name)
      .map((i) => ({
        code: i.code,
        name: i.name,
        kind: i.kind || "LAB",
        sectionCode: i.sectionCode,
        categoryCode: i.categoryCode || undefined,
        specimenCode: i.specimenCode || undefined,
        isPanel: Boolean(i.isPanel),
        requiresAppointment: Boolean(i.requiresAppointment),
        consentRequired: Boolean(i.consentRequired),
        preparationText: i.preparationText?.trim() || undefined,
      }));
    if (items.length) payload.items = items;

    const templates = safeArray<any>(b.templates)
      .filter((t) => t.itemCode && (t.name || t.body))
      .map((t) => ({
        itemCode: t.itemCode,
        kind: t.kind || "IMAGING_REPORT",
        name: t.name,
        body: t.body,
      }));
    if (templates.length) payload.templates = templates;

    const capabilities = safeArray<any>(b.capabilities)
      .filter((c) => c.servicePointCode && c.itemCode)
      .map((c) => ({
        servicePointCode: c.servicePointCode,
        itemCode: c.itemCode,
        modality: c.modality || undefined,
        defaultDurationMins: toInt(c.defaultDurationMins) ?? undefined,
        isPrimary: Boolean(c.isPrimary),
      }));
    if (capabilities.length) payload.capabilities = capabilities;

    return payload;
  }

  function addRow(key: string, row: any) {
    setBuilder((prev: any) => ({ ...prev, [key]: [...safeArray(prev[key]), row] }));
  }

  function updateRow(key: string, index: number, patch: any) {
    setBuilder((prev: any) => {
      const list = [...safeArray(prev[key])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [key]: list };
    });
  }

  function removeRow(key: string, index: number) {
    setBuilder((prev: any) => {
      const list = [...safeArray(prev[key])].filter((_: any, i: number) => i !== index);
      return { ...prev, [key]: list };
    });
  }

  React.useEffect(() => {
    if (!open) return;
    setVersion(editing?.version != null ? String(editing.version) : "");
    setStatus(editing?.status ?? "DRAFT");
    setNotes(editing?.notes ?? "");
    const initialPayload = editing?.payload ?? SAMPLE_PACK_PAYLOAD;
    setPayloadText(JSON.stringify(initialPayload, null, 2));
    setBuilder(normalizePayload(initialPayload));
    setMode("guided");
    setErr(null);
  }, [open, editing]);

  async function save() {
    if (!packId && !editing) {
      setErr("Select a pack first");
      return;
    }
    let payload: any;
    if (mode === "json") {
      try {
        payload = JSON.parse(payloadText);
      } catch {
        setErr("Payload JSON is invalid");
        return;
      }
    } else {
      let base: any = {};
      try {
        base = JSON.parse(payloadText);
      } catch {
        base = {};
      }
      const guided = buildPayloadFromBuilder(builder);
      payload = { ...asRecord(base), ...guided };
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/packs/versions/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            status,
            notes: notes.trim() || null,
            payload,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(packId)}/versions`, {
          method: "POST",
          body: JSON.stringify({
            version: version.trim() ? Number.parseInt(version, 10) : undefined,
            status,
            notes: notes.trim() || undefined,
            payload,
          }),
        });
      }
      toast({ title: editing ? "Version updated" : "Version created" });
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
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Pack Version" : "Create Pack Version"}
          description="Versions are immutable snapshots you can apply to branches."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Version">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Auto" disabled={!!editing} />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as PackVersionStatus)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="RETIRED">RETIRED</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zc-text">Payload Builder</div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "guided" ? "primary" : "outline"} onClick={() => setMode("guided")}>
                Guided
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "json" ? "primary" : "outline"}
                onClick={() => {
                  let base: any = {};
                  try {
                    base = JSON.parse(payloadText);
                  } catch {
                    base = {};
                  }
                  const guided = buildPayloadFromBuilder(builder);
                  setPayloadText(JSON.stringify({ ...base, ...guided }, null, 2));
                  setMode("json");
                }}
              >
                JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const payload = SAMPLE_PACK_PAYLOAD;
                  setBuilder(normalizePayload(payload));
                  setPayloadText(JSON.stringify(payload, null, 2));
                }}
              >
                Load Sample
              </Button>
            </div>
          </div>

          {mode === "json" ? (
            <Field label="Payload (JSON)">
              <Textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={16} />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      const payload = JSON.parse(payloadText);
                      setBuilder(normalizePayload(payload));
                      setMode("guided");
                      setErr(null);
                    } catch {
                      setErr("Payload JSON is invalid");
                    }
                  }}
                >
                  Apply JSON to form
                </Button>
              </div>
            </Field>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Service Points</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("servicePoints", { code: "", name: "", type: "OTHER", requiresPlacement: true })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.servicePoints.length === 0 ? (
                  <div className="text-sm text-zc-muted">No service points.</div>
                ) : (
                  builder.servicePoints.map((sp: any, idx: number) => (
                    <div key={`sp-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input value={sp.code} onChange={(e) => updateRow("servicePoints", idx, { code: e.target.value })} placeholder="CODE" />
                        <Input value={sp.name} onChange={(e) => updateRow("servicePoints", idx, { name: e.target.value })} placeholder="Name" />
                        <Select value={sp.type} onValueChange={(v) => updateRow("servicePoints", idx, { type: v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr,140px]">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Placement required</div>
                          <Switch checked={sp.requiresPlacement !== false} onCheckedChange={(v) => updateRow("servicePoints", idx, { requiresPlacement: Boolean(v) })} />
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => removeRow("servicePoints", idx)}>Remove</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Sections</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("sections", { code: "", name: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.sections.length === 0 ? (
                  <div className="text-sm text-zc-muted">No sections.</div>
                ) : (
                  builder.sections.map((s: any, idx: number) => (
                    <div key={`sec-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-3">
                      <Input value={s.code} onChange={(e) => updateRow("sections", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={s.name} onChange={(e) => updateRow("sections", idx, { name: e.target.value })} placeholder="Name" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("sections", idx)}>Remove</Button>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Categories</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("categories", { code: "", name: "", sectionCode: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.categories.length === 0 ? (
                  <div className="text-sm text-zc-muted">No categories.</div>
                ) : (
                  builder.categories.map((c: any, idx: number) => (
                    <div key={`cat-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-4">
                      <Input value={c.code} onChange={(e) => updateRow("categories", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={c.name} onChange={(e) => updateRow("categories", idx, { name: e.target.value })} placeholder="Name" />
                      <Input value={c.sectionCode} onChange={(e) => updateRow("categories", idx, { sectionCode: e.target.value })} placeholder="Section code" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("categories", idx)}>Remove</Button>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Specimens</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("specimens", { code: "", name: "", container: "", minVolumeMl: "", handlingNotes: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.specimens.length === 0 ? (
                  <div className="text-sm text-zc-muted">No specimens.</div>
                ) : (
                  builder.specimens.map((s: any, idx: number) => (
                    <div key={`spm-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-5">
                      <Input value={s.code} onChange={(e) => updateRow("specimens", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={s.name} onChange={(e) => updateRow("specimens", idx, { name: e.target.value })} placeholder="Name" />
                      <Input value={s.container} onChange={(e) => updateRow("specimens", idx, { container: e.target.value })} placeholder="Container" />
                      <Input value={s.minVolumeMl} onChange={(e) => updateRow("specimens", idx, { minVolumeMl: e.target.value })} placeholder="Min volume (ml)" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("specimens", idx)}>Remove</Button>
                      <div className="md:col-span-5">
                        <Input value={s.handlingNotes} onChange={(e) => updateRow("specimens", idx, { handlingNotes: e.target.value })} placeholder="Handling notes" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Items</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("items", { code: "", name: "", kind: "LAB", sectionCode: "", categoryCode: "", specimenCode: "", isPanel: false, requiresAppointment: false, consentRequired: false, preparationText: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.items.length === 0 ? (
                  <div className="text-sm text-zc-muted">No items.</div>
                ) : (
                  builder.items.map((i: any, idx: number) => (
                    <div key={`item-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={i.code} onChange={(e) => updateRow("items", idx, { code: e.target.value })} placeholder="CODE" />
                        <Input value={i.name} onChange={(e) => updateRow("items", idx, { name: e.target.value })} placeholder="Name" />
                        <Select value={i.kind} onValueChange={(v) => updateRow("items", idx, { kind: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIAG_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={i.sectionCode} onChange={(e) => updateRow("items", idx, { sectionCode: e.target.value })} placeholder="Section code" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={i.categoryCode} onChange={(e) => updateRow("items", idx, { categoryCode: e.target.value })} placeholder="Category code" />
                        <Input value={i.specimenCode} onChange={(e) => updateRow("items", idx, { specimenCode: e.target.value })} placeholder="Specimen code" />
                        <Input value={i.preparationText} onChange={(e) => updateRow("items", idx, { preparationText: e.target.value })} placeholder="Preparation text" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("items", idx)}>Remove</Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Panel</div>
                          <Switch checked={Boolean(i.isPanel)} onCheckedChange={(v) => updateRow("items", idx, { isPanel: Boolean(v) })} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Requires appointment</div>
                          <Switch checked={Boolean(i.requiresAppointment)} onCheckedChange={(v) => updateRow("items", idx, { requiresAppointment: Boolean(v) })} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Consent required</div>
                          <Switch checked={Boolean(i.consentRequired)} onCheckedChange={(v) => updateRow("items", idx, { consentRequired: Boolean(v) })} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Templates</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("templates", { itemCode: "", kind: "IMAGING_REPORT", name: "", body: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.templates.length === 0 ? (
                  <div className="text-sm text-zc-muted">No templates.</div>
                ) : (
                  builder.templates.map((t: any, idx: number) => (
                    <div key={`tmpl-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={t.itemCode} onChange={(e) => updateRow("templates", idx, { itemCode: e.target.value })} placeholder="Item code" />
                        <Select value={t.kind} onValueChange={(v) => updateRow("templates", idx, { kind: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={t.name} onChange={(e) => updateRow("templates", idx, { name: e.target.value })} placeholder="Template name" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("templates", idx)}>Remove</Button>
                      </div>
                      <Textarea value={t.body} onChange={(e) => updateRow("templates", idx, { body: e.target.value })} rows={4} placeholder="Template body" />
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Capabilities</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("capabilities", { servicePointCode: "", itemCode: "", modality: "", defaultDurationMins: "", isPrimary: false })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.capabilities.length === 0 ? (
                  <div className="text-sm text-zc-muted">No capabilities.</div>
                ) : (
                  builder.capabilities.map((c: any, idx: number) => (
                    <div key={`cap-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-5">
                        <Input value={c.servicePointCode} onChange={(e) => updateRow("capabilities", idx, { servicePointCode: e.target.value })} placeholder="Service point code" />
                        <Input value={c.itemCode} onChange={(e) => updateRow("capabilities", idx, { itemCode: e.target.value })} placeholder="Item code" />
                        <Select value={c.modality || "none"} onValueChange={(v) => updateRow("capabilities", idx, { modality: v === "none" ? null : v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Modality" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={c.defaultDurationMins} onChange={(e) => updateRow("capabilities", idx, { defaultDurationMins: e.target.value })} placeholder="Duration (mins)" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("capabilities", idx)}>Remove</Button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                        <div className="text-xs font-semibold text-zc-muted">Primary</div>
                        <Switch checked={Boolean(c.isPrimary)} onCheckedChange={(v) => updateRow("capabilities", idx, { isPrimary: Boolean(v) })} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-xs text-zc-muted">
                Use JSON mode for advanced fields (parameters, ranges, or panel composition).
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   PacksContent (inner component, replaces old PacksTab)
   ========================================================= */

function PacksContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [packs, setPacks] = React.useState<DiagnosticPackRow[]>([]);
  const [packId, setPackId] = React.useState("");
  const [versions, setVersions] = React.useState<DiagnosticPackVersionRow[]>([]);
  const [versionId, setVersionId] = React.useState("");
  const [locations, setLocations] = React.useState<FlatLocationNode[]>([]);
  const [placements, setPlacements] = React.useState<Record<string, string>>({});
  const [applying, setApplying] = React.useState(false);
  const [labType, setLabType] = React.useState<LabType>("LAB_CORE");
  const [quickLocationId, setQuickLocationId] = React.useState("");
  const [showQuickSetup, setShowQuickSetup] = React.useState(false);

  const [packDialogOpen, setPackDialogOpen] = React.useState(false);
  const [editingPack, setEditingPack] = React.useState<DiagnosticPackRow | null>(null);

  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [editingVersion, setEditingVersion] = React.useState<DiagnosticPackVersionRow | null>(null);

  async function loadPacks() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticPackRow[]>("/api/infrastructure/diagnostics/packs");
      setPacks(safeArray(rows));
      if (!packId && rows?.[0]?.id) setPackId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load packs");
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(id: string) {
    if (!id) {
      setVersions([]);
      setVersionId("");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticPackVersionRow[]>(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(id)}/versions`);
      const list = safeArray(rows);
      setVersions(list);
      const active = list.find((v) => v.status === "ACTIVE") || list[0];
      setVersionId(active?.id ?? "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const locTree = await apiFetch<any>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`);
      setLocations(flattenLocationTree(normalizeLocationTree(locTree)));
    } catch (e: any) {
      setErr(e?.message || "Failed to load locations");
    }
  }

  React.useEffect(() => {
    void loadPacks();
    void loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadVersions(packId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  const selectedPack = packs.find((p) => p.id === packId) || null;
  const selectedVersion = versions.find((v) => v.id === versionId) || null;
  const labTypePacks = packs.filter((p) => (p.labType || "OTHER") === labType);
  const payload = selectedVersion?.payload || {};
  const servicePoints = safeArray<any>(payload.servicePoints).map((sp: any) => ({
    code: normalizeCode(sp.code),
    name: String(sp.name || sp.code || "").trim(),
    requiresPlacement: sp.requiresPlacement !== false,
  }));

  React.useEffect(() => {
    if (!labTypePacks.length) return;
    if (!labTypePacks.some((p) => p.id === packId)) {
      setPackId(labTypePacks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labType, packs]);

  async function applyPack() {
    if (!selectedVersion) return;
    const missing = servicePoints.filter((sp) => sp.requiresPlacement && !placements[sp.code]);
    if (missing.length) {
      setErr(`Missing placements: ${missing.map((m) => m.code).join(", ")}`);
      return;
    }
    setApplying(true);
    setErr(null);
    try {
      await apiFetch("/api/infrastructure/diagnostics/packs/apply", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          packVersionId: selectedVersion.id,
          placements: servicePoints
            .filter((sp) => sp.requiresPlacement)
            .map((sp) => ({ servicePointCode: sp.code, locationNodeId: placements[sp.code] })),
        }),
      });
      toast({ title: "Pack applied", description: "Diagnostics configuration imported." });
    } catch (e: any) {
      setErr(e?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  async function applyQuickSetup() {
    if (!selectedVersion) {
      setErr("Select a template version");
      return;
    }
    if (!quickLocationId) {
      setErr("Select a location");
      return;
    }
    const nextPlacements: Record<string, string> = {};
    servicePoints.filter((sp) => sp.requiresPlacement).forEach((sp) => {
      nextPlacements[sp.code] = quickLocationId;
    });
    if (!Object.keys(nextPlacements).length) {
      setErr("Selected template has no service points");
      return;
    }
    setPlacements(nextPlacements);
    setApplying(true);
    setErr(null);
    try {
      await apiFetch("/api/infrastructure/diagnostics/packs/apply", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          packVersionId: selectedVersion.id,
          placements: Object.entries(nextPlacements).map(([servicePointCode, locationNodeId]) => ({
            servicePointCode,
            locationNodeId,
          })),
        }),
      });
      toast({ title: "Template applied", description: "Lab setup imported." });
    } catch (e: any) {
      setErr(e?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Diagnostic Packs</CardTitle>
        <CardDescription>Backend-stored packs with versioning. Import, edit, and apply to a branch.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-zc-text">Quick setup</div>
          <Button variant="outline" size="sm" onClick={() => setShowQuickSetup((s) => !s)}>
            {showQuickSetup ? "Hide Quick Setup" : "Show Quick Setup"}
          </Button>
        </div>

        {showQuickSetup ? (
          <div className="mb-4 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="text-sm font-semibold text-zc-text">Lab Type Setup</div>
            <div className="mt-1 text-xs text-zc-muted">
              Step 1: choose a lab type and location. Step 2: select a predefined template. Step 3: apply.
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Lab type" required>
                <Select value={labType} onValueChange={(v) => setLabType(v as LabType)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAB_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location" required>
                <Select value={quickLocationId} onValueChange={setQuickLocationId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Template" required>
                <Select value={packId} onValueChange={setPackId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {labTypePacks.length === 0 ? (
                      <SelectItem value="none" disabled>No templates for this lab type</SelectItem>
                    ) : (
                      labTypePacks.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={applyQuickSetup} disabled={applying || !selectedVersion || !quickLocationId || !labTypePacks.length}>
                Apply template
              </Button>
              <div className="text-xs text-zc-muted">Uses the active version of the selected template.</div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="rounded-xl border border-zc-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Packs</div>
              <Button size="sm" onClick={() => { setEditingPack(null); setPackDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
            <div className="grid gap-2">
              {packs.length === 0 ? (
                <div className="text-sm text-zc-muted">No packs yet.</div>
              ) : (
                packs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackId(p.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition",
                      packId === p.id
                        ? "border-zc-accent bg-zc-accent shadow-sm"
                        : "border-zc-border bg-zc-card hover:bg-zc-panel/20"
                    )}
                  >
                    <div className={cn("text-sm font-semibold", packId === p.id ? "text-white" : "text-zc-text")}>{p.name}</div>
                    <div className={cn("text-xs", packId === p.id ? "text-white/85" : "text-zc-muted")}>
                      {p.code}{p.labType ? ` - ${p.labType}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-zc-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">{selectedPack?.name || "Select a pack"}</div>
                  <div className="text-xs text-zc-muted">{selectedPack?.description || "Create or select a pack to manage versions."}</div>
                </div>
                {selectedPack ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingPack(selectedPack); setPackDialogOpen(true); }}>
                      Edit pack
                    </Button>
                    <Button size="sm" onClick={() => { setEditingVersion(null); setVersionDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Version
                    </Button>
                  </div>
                ) : null}
              </div>

              <Separator className="my-3" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Version">
                  <Select value={versionId} onValueChange={setVersionId} disabled={!selectedPack || loading}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select version" /></SelectTrigger>
                    <SelectContent className="max-h-[280px] overflow-y-auto">
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version} • {v.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { if (selectedVersion) { setEditingVersion(selectedVersion); setVersionDialogOpen(true); } }} disabled={!selectedVersion}>
                    Edit version
                  </Button>
                  <Button onClick={applyPack} disabled={!selectedVersion || applying}>
                    Apply pack
                  </Button>
                </div>
              </div>

              {selectedVersion ? (
                <div className="mt-4 grid gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Placements</div>
                  {servicePoints.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zc-border p-3 text-sm text-zc-muted">No service points in payload.</div>
                  ) : (
                    servicePoints.map((sp) => (
                      <Field key={sp.code} label={`Placement for ${sp.name} (${sp.code})`} required>
                        <Select
                          value={placements[sp.code] || ""}
                          onValueChange={(v) => setPlacements((prev) => ({ ...prev, [sp.code]: v }))}
                        >
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent className="max-h-[280px] overflow-y-auto">
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <PackDialog
          open={packDialogOpen}
          onOpenChange={setPackDialogOpen}
          editing={editingPack}
          onSaved={() => { void loadPacks(); }}
        />
        <PackVersionDialog
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          packId={packId}
          editing={editingVersion}
          onSaved={() => { if (packId) void loadVersions(packId); }}
        />
      </CardContent>
    </Card>
  );
}

/* =========================================================
   Page (default export)
   ========================================================= */

export default function DiagnosticsPacksPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Quick Start">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <PacksContent branchId={branchId} />
      </RequirePerm>
    </AppShell>
  );
}
