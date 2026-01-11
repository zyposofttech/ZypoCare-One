"use client";

import * as React from "react";

import { FileText, Loader2, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

import {
  POLICY_TEMPLATES,
  PolicyTemplateId,
  getTemplateById,
  RetentionClinicalRecordsValues,
  ConsentDefaultsValues,
  AuditLoggingValues,
  ExportGuardrailsValues,
  BreakGlassValues,
} from "./policy-templates";

function normalizeCode(s: string) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

function safeNum(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
        active
          ? "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200"
          : "border-xc-border bg-xc-panel/20 text-xc-muted",
      )}
    >
      {label}
    </span>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-xc-border bg-xc-panel/10 p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-xc-text">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-xc-muted">{hint}</div> : null}
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function RetentionEditor({
  value,
  onChange,
}: {
  value: RetentionClinicalRecordsValues;
  onChange: (v: RetentionClinicalRecordsValues) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>OPD Retention (years)</Label>
          <Input type="number" min={0} value={value.opdYears} onChange={(e) => onChange({ ...value, opdYears: safeNum(e.target.value, 5) })} />
        </div>
        <div className="grid gap-2">
          <Label>IPD Retention (years)</Label>
          <Input type="number" min={0} value={value.ipdYears} onChange={(e) => onChange({ ...value, ipdYears: safeNum(e.target.value, 10) })} />
        </div>
        <div className="grid gap-2">
          <Label>Lab Retention (years)</Label>
          <Input type="number" min={0} value={value.labYears} onChange={(e) => onChange({ ...value, labYears: safeNum(e.target.value, 2) })} />
        </div>
        <div className="grid gap-2">
          <Label>Imaging Retention (years)</Label>
          <Input type="number" min={0} value={value.imagingYears} onChange={(e) => onChange({ ...value, imagingYears: safeNum(e.target.value, 5) })} />
        </div>
      </div>

      <ToggleRow
        label="Medico-legal hold"
        hint="When enabled, records under medico-legal hold must be retained for at least the minimum period."
        checked={value.medicoLegalHoldEnabled}
        onChange={(x) => onChange({ ...value, medicoLegalHoldEnabled: x })}
      />

      <div className="grid gap-2 sm:max-w-[320px]">
        <Label>Medico-legal minimum (years)</Label>
        <Input
          type="number"
          min={0}
          value={value.medicoLegalMinYears}
          onChange={(e) => onChange({ ...value, medicoLegalMinYears: safeNum(e.target.value, 10) })}
          disabled={!value.medicoLegalHoldEnabled}
        />
      </div>
    </div>
  );
}

function ConsentEditor({ value, onChange }: { value: ConsentDefaultsValues; onChange: (v: ConsentDefaultsValues) => void }) {
  const has = (k: any) => (value.defaultScope || []).includes(k);
  const toggle = (k: any) => {
    const set = new Set(value.defaultScope || []);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    onChange({ ...value, defaultScope: Array.from(set) as any });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Default Consent Status</Label>
        <select
          className="h-10 w-full rounded-md border border-xc-border bg-xc-card px-3 text-sm"
          value={value.defaultStatus}
          onChange={(e) => onChange({ ...value, defaultStatus: (e.target.value as any) || "GRANTED" })}
        >
          <option value="GRANTED">GRANTED</option>
          <option value="WITHDRAWN">WITHDRAWN</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label>Default Consent Scope</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <ToggleRow label="VIEW" checked={has("VIEW")} onChange={() => toggle("VIEW")} />
          <ToggleRow label="STORE" checked={has("STORE")} onChange={() => toggle("STORE")} />
          <ToggleRow label="SHARE" checked={has("SHARE")} onChange={() => toggle("SHARE")} />
        </div>
      </div>

      <ToggleRow
        label="Share to patient portal"
        hint="When enabled, suitable disclosures can be visible in the patient portal (subject to role-based access)."
        checked={value.shareToPatientPortal}
        onChange={(x) => onChange({ ...value, shareToPatientPortal: x })}
      />

      <ToggleRow
        label="SMS consent required"
        hint="Require explicit consent before sending SMS communications."
        checked={value.smsConsentRequired}
        onChange={(x) => onChange({ ...value, smsConsentRequired: x })}
      />
    </div>
  );
}

function AuditEditor({ value, onChange }: { value: AuditLoggingValues; onChange: (v: AuditLoggingValues) => void }) {
  return (
    <div className="grid gap-4">
      <ToggleRow label="Enable audit logging" checked={value.enabled} onChange={(x) => onChange({ ...value, enabled: x })} />
      <div className="grid gap-2 sm:grid-cols-3">
        <ToggleRow label="Log PHI access" checked={value.logPHIAccess} onChange={(x) => onChange({ ...value, logPHIAccess: x })} />
        <ToggleRow label="Log exports" checked={value.logExports} onChange={(x) => onChange({ ...value, logExports: x })} />
        <ToggleRow label="Log break-glass" checked={value.logBreakGlass} onChange={(x) => onChange({ ...value, logBreakGlass: x })} />
      </div>
      <div className="grid gap-2 sm:max-w-[360px]">
        <Label>Retention (days)</Label>
        <Input type="number" min={0} value={value.retentionDays} onChange={(e) => onChange({ ...value, retentionDays: safeNum(e.target.value, 2555) })} />
      </div>
    </div>
  );
}

function ExportEditor({ value, onChange }: { value: ExportGuardrailsValues; onChange: (v: ExportGuardrailsValues) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Max rows per export</Label>
          <Input type="number" min={0} value={value.maxRows} onChange={(e) => onChange({ ...value, maxRows: safeNum(e.target.value, 50000) })} />
          <div className="text-xs text-xc-muted">Use 0 to block exports entirely.</div>
        </div>
        <div className="grid gap-2">
          <Label>Approval required above (rows)</Label>
          <Input
            type="number"
            min={0}
            value={value.approvalRequiredAboveRows}
            onChange={(e) => onChange({ ...value, approvalRequiredAboveRows: safeNum(e.target.value, 10000) })}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleRow label="Require export reason" checked={value.requireReason} onChange={(x) => onChange({ ...value, requireReason: x })} />
        <ToggleRow label="Watermark exports" checked={value.watermark} onChange={(x) => onChange({ ...value, watermark: x })} />
      </div>

      <ToggleRow
        label="Allow PHI export"
        hint="If disabled, exports must exclude PHI (recommended for baseline)."
        checked={value.allowPHIExport}
        onChange={(x) => onChange({ ...value, allowPHIExport: x })}
      />
    </div>
  );
}

function BreakGlassEditor({ value, onChange }: { value: BreakGlassValues; onChange: (v: BreakGlassValues) => void }) {
  return (
    <div className="grid gap-4">
      <ToggleRow label="Enable break-glass" checked={value.enabled} onChange={(x) => onChange({ ...value, enabled: x })} />
      <ToggleRow
        label="Justification required"
        hint="Staff must enter a justification before emergency access is granted."
        checked={value.requireJustification}
        onChange={(x) => onChange({ ...value, requireJustification: x })}
      />
      <ToggleRow label="Notify security" checked={value.notifySecurity} onChange={(x) => onChange({ ...value, notifySecurity: x })} />
      <div className="grid gap-2 sm:max-w-[360px]">
        <Label>Auto-expire (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={value.autoExpireMinutes}
          onChange={(e) => onChange({ ...value, autoExpireMinutes: safeNum(e.target.value, 60) })}
        />
      </div>
    </div>
  );
}

function TemplateEditor({
  templateId,
  value,
  onChange,
}: {
  templateId: PolicyTemplateId;
  value: any;
  onChange: (next: any) => void;
}) {
  if (templateId === "RETENTION_CLINICAL_RECORDS") return <RetentionEditor value={value as any} onChange={onChange} />;
  if (templateId === "CONSENT_DEFAULTS") return <ConsentEditor value={value as any} onChange={onChange} />;
  if (templateId === "AUDIT_LOGGING") return <AuditEditor value={value as any} onChange={onChange} />;
  if (templateId === "EXPORT_GUARDRAILS") return <ExportEditor value={value as any} onChange={onChange} />;
  return <BreakGlassEditor value={value as any} onChange={onChange} />;
}

function toIso(dtLocal: string): string | null {
  const v = (dtLocal || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function PolicyWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = React.useState<PolicyTemplateId>("EXPORT_GUARDRAILS");

  const tpl = getTemplateById(templateId)!;

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [effectiveAtLocal, setEffectiveAtLocal] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [values, setValues] = React.useState<any>(tpl.defaults);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setErr(null);
    setBusy(false);
    setTemplateId("EXPORT_GUARDRAILS");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = getTemplateById(templateId)!;
    setValues(t.defaults);
    setName(t.name);
    setCode(t.code);
    setDescription(t.description);
    setEffectiveAtLocal("");
    setNotes("");
  }, [templateId, open]);

  async function createPolicyAndDraft() {
    setErr(null);

    const finalCode = normalizeCode(code || tpl.code);
    if (!finalCode) {
      setErr("Policy code is required.");
      return;
    }
    if (!name.trim()) {
      setErr("Policy name is required.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/governance/policies", {
        method: "POST",
        body: JSON.stringify({
          code: finalCode,
          name: name.trim(),
          type: tpl.type,
          description: description.trim() || null,
        }),
      });

      const draft = await apiFetch<{ id: string }>(`/api/governance/policies/${encodeURIComponent(finalCode)}/drafts`, {
        method: "POST",
      });

      const payload = tpl.buildPayload(values);
      await apiFetch(`/api/governance/policy-versions/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          payload,
          notes: notes.trim() || null,
          effectiveAt: toIso(effectiveAtLocal),
          applyToAllBranches: true,
          branchIds: [],
        }),
      });

      toast({ title: "Policy created", description: "Draft created. Open the policy to review and submit for approval." });
      await onCreated();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Create failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Create failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  const summary = tpl.summarize(values);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[860px] border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Create Policy
          </DialogTitle>
          <DialogDescription>Step-by-step policy setup with an initial draft version.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="flex flex-wrap gap-2">
          <StepPill active={step === 1} label="1. Choose template" />
          <StepPill active={step === 2} label="2. Configure" />
          <StepPill active={step === 3} label="3. Review" />
        </div>

        {err ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="mt-4">
          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {POLICY_TEMPLATES.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "text-left",
                      "rounded-2xl border p-4 transition",
                      active
                        ? "border-indigo-300 bg-indigo-50/40 dark:border-indigo-800/60 dark:bg-indigo-950/20"
                        : "border-xc-border bg-xc-panel/10 hover:bg-xc-panel/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-xc-muted">{t.category}</div>
                        <div className="mt-1 text-sm font-semibold text-xc-text">{t.name}</div>
                        <div className="mt-1 text-sm text-xc-muted">{t.description}</div>
                        <div className="mt-3 font-mono text-xs text-xc-muted">Code: {t.code}</div>
                      </div>
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200">
                          <Sparkles className="h-3.5 w-3.5" /> Selected
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-sm">Basics</CardTitle>
                  <CardDescription>These fields help users understand the policy.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Policy Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Export Guardrails" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Policy Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={tpl.code} className="font-mono" />
                    <div className="text-xs text-xc-muted">Code is normalized to UPPERCASE_WITH_UNDERSCORES.</div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description (optional)</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why this policy exists…" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-sm">Template Settings</CardTitle>
                  <CardDescription>Adjust the policy settings using the layman fields.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateEditor templateId={templateId} value={values} onChange={setValues} />
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-sm">Draft Metadata</CardTitle>
                  <CardDescription>Optional metadata to attach to the initial draft.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2 sm:max-w-[420px]">
                    <Label>Effective At (optional)</Label>
                    <Input type="datetime-local" value={effectiveAtLocal} onChange={(e) => setEffectiveAtLocal(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Draft Notes (optional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this draft is being created…" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-sm">Review</CardTitle>
                  <CardDescription>Confirm the basics and settings before creating.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                      <div className="text-xs text-xc-muted">Policy</div>
                      <div className="mt-1 text-sm font-semibold text-xc-text">{name || tpl.name}</div>
                      <div className="mt-1 font-mono text-xs text-xc-muted">{normalizeCode(code || tpl.code)}</div>
                    </div>
                    <div className="rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                      <div className="text-xs text-xc-muted">Type</div>
                      <div className="mt-1 text-sm font-semibold text-xc-text">{tpl.type}</div>
                      <div className="mt-1 text-xs text-xc-muted">Template: {tpl.name}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-2">
                    <div className="text-xs text-xc-muted">Summary</div>
                    <ul className="list-disc pl-5 text-sm text-xc-text">
                      {summary.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>

          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep((s) => (s === 2 ? 1 : 2))} disabled={busy}>
              Back
            </Button>
          ) : null}

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              disabled={busy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => void createPolicyAndDraft()}
              disabled={busy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Policy
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
