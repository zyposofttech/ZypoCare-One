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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { Pencil, Plus } from "lucide-react";

import type {
  DiagnosticItemRow,
  ParameterRow,
  RangeRow,
  ResultDataType,
  DiagnosticRangeSource,
} from "../_shared/types";
import { RESULT_TYPES } from "../_shared/constants";
import {
  safeArray,
  normalizeCode,
  validateCode,
  validateName,
  toInt,
  toFloat,
} from "../_shared/utils";
import {
  Field,
  ToneBadge,
  ModalHeader,
  modalClassName,
  toneForResultDataType,
} from "../_shared/components";

/* =========================================================
   ParameterDialog
   ========================================================= */

function ParameterDialog({
  open,
  onOpenChange,
  branchId,
  testId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  testId: string;
  editing: ParameterRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [dataType, setDataType] = React.useState<ResultDataType>("NUMERIC");
  const [unit, setUnit] = React.useState("");
  const [precision, setPrecision] = React.useState("");
  const [allowedText, setAllowedText] = React.useState("");
  const [isDerived, setIsDerived] = React.useState(false);
  const [formula, setFormula] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setDataType(editing?.dataType ?? "NUMERIC");
    setUnit(editing?.unit ?? "");
    setPrecision(editing?.precision != null ? String(editing.precision) : "");
    setAllowedText(editing?.allowedText ?? "");
    setIsDerived(editing?.isDerived ?? false);
    setFormula(editing?.formula ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Parameter");
    const nameErr = validateName(name, "Parameter");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/parameters/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            dataType,
            unit: unit.trim() || null,
            precision: toInt(precision) ?? null,
            allowedText: allowedText.trim() || null,
            isDerived,
            formula: formula.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(testId)}/parameters?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(code),
            name: name.trim(),
            dataType,
            unit: unit.trim() || undefined,
            precision: toInt(precision) ?? undefined,
            allowedText: allowedText.trim() || undefined,
            isDerived,
            formula: formula.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Parameter updated" : "Parameter created" });
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
          title={editing ? "Edit Parameter" : "Add Parameter"}
          description="Define result data type and validation details."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HGB" />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hemoglobin" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Data type" required>
              <Select value={dataType} onValueChange={(v) => setDataType(v as ResultDataType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unit">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g/dL" />
            </Field>
            <Field label="Precision">
              <Input value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <Field label="Allowed text (for choice)">
            <Input value={allowedText} onChange={(e) => setAllowedText(e.target.value)} placeholder="Low,Normal,High" />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-sm font-semibold text-zc-text">Derived (calculated)</div>
            <Switch checked={isDerived} onCheckedChange={setIsDerived} />
          </div>
          {isDerived ? (
            <Field label="Formula" hint="e.g. MCV = RBC_HCT / RBC_COUNT * 10">
              <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="param1 / param2 * 10" />
            </Field>
          ) : null}
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
          <Button onClick={save} disabled={saving || !testId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   RangeDialog
   ========================================================= */

function RangeDialog({
  open,
  onOpenChange,
  branchId,
  parameterId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  parameterId: string;
  editing: RangeRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [sex, setSex] = React.useState("");
  const [ageMinDays, setAgeMinDays] = React.useState("");
  const [ageMaxDays, setAgeMaxDays] = React.useState("");
  const [low, setLow] = React.useState("");
  const [high, setHigh] = React.useState("");
  const [textRange, setTextRange] = React.useState("");
  const [source, setSource] = React.useState<DiagnosticRangeSource | "none">("none");
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSex(editing?.sex ?? "");
    setAgeMinDays(editing?.ageMinDays != null ? String(editing.ageMinDays) : "");
    setAgeMaxDays(editing?.ageMaxDays != null ? String(editing.ageMaxDays) : "");
    setLow(editing?.low != null ? String(editing.low) : "");
    setHigh(editing?.high != null ? String(editing.high) : "");
    setTextRange(editing?.textRange ?? "");
    setSource(editing?.source ?? "none");
    setNotes(editing?.notes ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    if (!parameterId) return;
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/ranges/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            sex: sex.trim() || null,
            ageMinDays: toInt(ageMinDays),
            ageMaxDays: toInt(ageMaxDays),
            low: toFloat(low),
            high: toFloat(high),
            textRange: textRange.trim() || null,
            source: source === "none" ? null : source,
            notes: notes.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/parameters/${encodeURIComponent(parameterId)}/ranges?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            sex: sex.trim() || undefined,
            ageMinDays: toInt(ageMinDays) ?? undefined,
            ageMaxDays: toInt(ageMaxDays) ?? undefined,
            low: toFloat(low) ?? undefined,
            high: toFloat(high) ?? undefined,
            textRange: textRange.trim() || undefined,
            source: source === "none" ? undefined : source,
            notes: notes.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Range updated" : "Range added" });
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
          title={editing ? "Edit Range" : "Add Range"}
          description="Reference ranges for numeric or text results."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sex">
              <Input value={sex} onChange={(e) => setSex(e.target.value)} placeholder="M/F/Other" />
            </Field>
            <Field label="Text range">
              <Input value={textRange} onChange={(e) => setTextRange(e.target.value)} placeholder="Normal" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Age min (days)">
              <Input value={ageMinDays} onChange={(e) => setAgeMinDays(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Age max (days)">
              <Input value={ageMaxDays} onChange={(e) => setAgeMaxDays(e.target.value)} placeholder="365" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Low">
              <Input value={low} onChange={(e) => setLow(e.target.value)} placeholder="0" />
            </Field>
            <Field label="High">
              <Input value={high} onChange={(e) => setHigh(e.target.value)} placeholder="10" />
            </Field>
          </div>
          <Field label="Source">
            <Select value={source} onValueChange={(v) => setSource(v as DiagnosticRangeSource | "none")}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                <SelectItem value="HOSPITAL_DEFINED">Hospital Defined</SelectItem>
                <SelectItem value="LITERATURE">Literature</SelectItem>
                <SelectItem value="REGULATORY_BODY">Regulatory Body</SelectItem>
                <SelectItem value="CONSENSUS_GUIDELINE">Consensus Guideline</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reference notes or citations..." rows={2} />
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
          <Button onClick={save} disabled={saving || !parameterId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Lab Parameters Content
   ========================================================= */

function LabParamsContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [tests, setTests] = React.useState<DiagnosticItemRow[]>([]);
  const [testId, setTestId] = React.useState("");
  const [parameters, setParameters] = React.useState<ParameterRow[]>([]);
  const [paramDialogOpen, setParamDialogOpen] = React.useState(false);
  const [rangeDialogOpen, setRangeDialogOpen] = React.useState(false);
  const [editingParam, setEditingParam] = React.useState<ParameterRow | null>(null);
  const [editingRange, setEditingRange] = React.useState<RangeRow | null>(null);
  const [rangeParamId, setRangeParamId] = React.useState("");

  async function loadTests() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}&kind=LAB`);
      setTests(safeArray(rows).filter((r) => !r.isPanel));
      if (!testId && rows?.[0]?.id) setTestId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  }

  async function loadParameters(id: string) {
    if (!id) {
      setParameters([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<ParameterRow[]>(`/api/infrastructure/diagnostics/items/${encodeURIComponent(id)}/parameters?branchId=${encodeURIComponent(branchId)}`);
      setParameters(safeArray(rows));
    } catch (e: any) {
      setErr(e?.message || "Failed to load parameters");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadParameters(testId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lab Parameters</CardTitle>
        <CardDescription>Define parameters and reference ranges for lab tests.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}
        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Lab test">
              <Select value={testId} onValueChange={setTestId} disabled={loading}>
                <SelectTrigger className="h-10 w-[320px]"><SelectValue placeholder="Select test" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={() => { setEditingParam(null); setParamDialogOpen(true); }} disabled={!testId}>
              <Plus className="mr-2 h-4 w-4" /> Parameter
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          {parameters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No parameters configured.</div>
          ) : (
            parameters.map((p) => (
              <div key={p.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneBadge tone="violet" className="font-mono">{p.code}</ToneBadge>
                      <div className="text-sm font-semibold text-zc-text">{p.name}</div>
                      <ToneBadge tone={toneForResultDataType(p.dataType)}>{p.dataType}</ToneBadge>
                      {!p.isActive ? <ToneBadge tone="rose">INACTIVE</ToneBadge> : null}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Unit: <span className="font-mono">{p.unit || "-"}</span> | Precision: <span className="font-mono">{p.precision ?? "-"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingParam(p); setParamDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setRangeParamId(p.id); setEditingRange(null); setRangeDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Range
                    </Button>
                  </div>
                </div>
                {p.ranges?.length ? (
                  <div className="mt-3 grid gap-2">
                    {p.ranges.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zc-border bg-white/50 p-2 text-xs">
                        <div className="text-zc-muted">
                          Sex: <span className="font-mono">{r.sex || "-"}</span> | Age: <span className="font-mono">{r.ageMinDays ?? "-"}</span> - <span className="font-mono">{r.ageMaxDays ?? "-"}</span> days
                        </div>
                        <div className="text-zc-muted">
                          Low: <span className="font-mono">{r.low ?? "-"}</span> | High: <span className="font-mono">{r.high ?? "-"}</span> | Text: <span className="font-mono">{r.textRange || "-"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setRangeParamId(p.id); setEditingRange(r); setRangeDialogOpen(true); }}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/infrastructure/diagnostics/ranges/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                                toast({ title: "Range removed" });
                                await loadParameters(testId);
                              } catch (e: any) {
                                toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        <ParameterDialog
          open={paramDialogOpen}
          onOpenChange={setParamDialogOpen}
          branchId={branchId}
          testId={testId}
          editing={editingParam}
          onSaved={() => loadParameters(testId)}
        />
        <RangeDialog
          open={rangeDialogOpen}
          onOpenChange={setRangeDialogOpen}
          branchId={branchId}
          parameterId={rangeParamId}
          editing={editingRange}
          onSaved={() => loadParameters(testId)}
        />
      </CardContent>
    </Card>
  );
}

/* =========================================================
   Page (default export)
   ========================================================= */

export default function ResultSchemaPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Result Schema">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <LabParamsContent branchId={branchId} />
      </RequirePerm>
    </AppShell>
  );
}
