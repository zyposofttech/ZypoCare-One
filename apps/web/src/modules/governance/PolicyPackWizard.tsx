"use client";

import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

import type { PolicyPack } from "./policy-packs";
import { getTemplateById, type PolicyTemplateId } from "./policy-templates";

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

function safeNum(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/** Editors */
function ExportReportsEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="grid gap-3">
      <ToggleRow
        label="Allow Exports"
        hint="If disabled, export buttons will be hidden/blocked."
        checked={!!value.enabled}
        onChange={(x) => onChange({ ...value, enabled: x })}
      />
      <ToggleRow
        label="Require Reason"
        hint="Users must enter a short reason before exporting."
        checked={!!value.requireReason}
        onChange={(x) => onChange({ ...value, requireReason: x })}
      />

      <div className="grid gap-2">
        <Label>Maximum rows per export</Label>
        <Input
          type="number"
          min={0}
          value={value.maxRows ?? 0}
          onChange={(e) => onChange({ ...value, maxRows: safeNum(e.target.value, 1000) })}
        />
        <div className="text-xs text-xc-muted">Example: 1000. Use 0 for unlimited (not recommended).</div>
      </div>

      <div className="grid gap-2">
        <Label>Allowed formats</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow label="CSV" checked={!!value.allowCsv} onChange={(x) => onChange({ ...value, allowCsv: x })} />
          <ToggleRow label="PDF" checked={!!value.allowPdf} onChange={(x) => onChange({ ...value, allowPdf: x })} />
        </div>
      </div>
    </div>
  );
}

function BreakGlassEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="grid gap-3">
      <ToggleRow
        label="Enable Emergency Access"
        hint="Allows temporary emergency access where normally restricted."
        checked={!!value.enabled}
        onChange={(x) => onChange({ ...value, enabled: x })}
      />
      <ToggleRow
        label="Reason is Mandatory"
        hint="Staff must enter the reason for emergency access."
        checked={!!value.requireReason}
        onChange={(x) => onChange({ ...value, requireReason: x })}
      />

      <div className="grid gap-2">
        <Label>Emergency access duration (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={value.sessionMinutes ?? 0}
          onChange={(e) => onChange({ ...value, sessionMinutes: safeNum(e.target.value, 30) })}
        />
        <div className="text-xs text-xc-muted">Example: 30 minutes.</div>
      </div>

      <div className="grid gap-2">
        <Label>Notification email (optional)</Label>
        <Input
          value={value.notifyEmail || ""}
          onChange={(e) => onChange({ ...value, notifyEmail: e.target.value })}
          placeholder="compliance@excelcare.local"
        />
        <div className="text-xs text-xc-muted">If set, system can notify for each break-glass event.</div>
      </div>
    </div>
  );
}

function AuditRetentionEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="grid gap-3">
      <ToggleRow
        label="Enable audit retention policy"
        checked={!!value.enabled}
        onChange={(x) => onChange({ ...value, enabled: x })}
      />
      <div className="grid gap-2">
        <Label>Retain audit logs for (days)</Label>
        <Input
          type="number"
          min={30}
          value={value.retentionDays ?? 0}
          onChange={(e) => onChange({ ...value, retentionDays: safeNum(e.target.value, 365) })}
        />
        <div className="text-xs text-xc-muted">Example: 365 days (1 year).</div>
      </div>
    </div>
  );
}

function DataRetentionEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="grid gap-3">
      <ToggleRow
        label="Enable data retention policy"
        checked={!!value.enabled}
        onChange={(x) => onChange({ ...value, enabled: x })}
      />

      <div className="grid gap-2">
        <Label>Patient data retention (days)</Label>
        <Input
          type="number"
          min={0}
          value={value.patientDataDays ?? 0}
          onChange={(e) => onChange({ ...value, patientDataDays: safeNum(e.target.value, 3650) })}
        />
        <div className="text-xs text-xc-muted">Example: 3650 days (10 years).</div>
      </div>

      <div className="grid gap-2">
        <Label>Billing data retention (days)</Label>
        <Input
          type="number"
          min={0}
          value={value.billingDays ?? 0}
          onChange={(e) => onChange({ ...value, billingDays: safeNum(e.target.value, 3650) })}
        />
        <div className="text-xs text-xc-muted">Example: 3650 days (10 years).</div>
      </div>
    </div>
  );
}

function EditorForTemplate({
  templateId,
  value,
  onChange,
}: {
  templateId: PolicyTemplateId;
  value: any;
  onChange: (v: any) => void;
}) {
  if (templateId === "EXPORT_REPORTS") return <ExportReportsEditor value={value} onChange={onChange} />;
  if (templateId === "BREAK_GLASS") return <BreakGlassEditor value={value} onChange={onChange} />;
  if (templateId === "AUDIT_RETENTION") return <AuditRetentionEditor value={value} onChange={onChange} />;
  if (templateId === "DATA_RETENTION") return <DataRetentionEditor value={value} onChange={onChange} />;
  return <div className="text-sm text-xc-muted">Editor not available for this template.</div>;
}

/** Used to recover existing draft if needed */
type PolicyDetail = {
  code: string;
  name: string;
  type: string;
  draft: { id: string } | null;
};

async function ensurePolicyExists(code: string, name: string, type: string, description: string | null) {
  try {
    await apiFetch(`/api/governance/policies/${encodeURIComponent(code)}`);
    return;
  } catch {
    await apiFetch(`/api/governance/policies`, {
      method: "POST",
      body: JSON.stringify({ code, name, type, description }),
    });
  }
}

async function ensureDraftId(code: string): Promise<string> {
  try {
    const draft = await apiFetch<{ id: string }>(
      `/api/governance/policies/${encodeURIComponent(code)}/drafts`,
      { method: "POST" },
    );
    return draft.id;
  } catch {
    const d = await apiFetch<PolicyDetail>(`/api/governance/policies/${encodeURIComponent(code)}`);
    if (!d?.draft?.id) throw new Error("Draft already exists but could not be loaded.");
    return d.draft.id;
  }
}

export function PolicyPackWizard({
  open,
  pack,
  onClose,
  onInstalled,
}: {
  open: boolean;
  pack: PolicyPack | null;
  onClose: () => void;
  onInstalled: () => Promise<void> | void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [valuesById, setValuesById] = React.useState<Record<string, any>>({});
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const [installNote, setInstallNote] = React.useState<string>("");

  React.useEffect(() => {
    if (!open || !pack) return;

    setStep(1);
    setBusy(false);
    setErr(null);
    setInstallNote("");

    const nextSelected: Record<string, boolean> = {};
    const nextValues: Record<string, any> = {};
    for (const item of pack.items) {
      const key = item.templateId;
      nextSelected[key] = true; // default: all selected
      const tpl = getTemplateById(item.templateId);
      nextValues[key] = item.valuesOverride ?? (tpl?.defaults ?? {});
    }

    setSelected(nextSelected);
    setValuesById(nextValues);
    setActiveId(pack.items[0]?.templateId ?? null);
  }, [open, pack]);

  if (!pack) return null;

  const chosenItems = pack.items.filter((it) => selected[it.templateId]);
  const chosenCount = chosenItems.length;

  async function installAsDrafts() {
    setErr(null);

    if (!chosenCount) {
      setErr("Please select at least one policy.");
      return;
    }

    setBusy(true);
    try {
      for (const item of chosenItems) {
        const tpl = getTemplateById(item.templateId);
        if (!tpl) continue;

        await ensurePolicyExists(tpl.code, tpl.name, item.templateId, tpl.description ?? null);

        const draftId = await ensureDraftId(tpl.code);

        const payload = tpl.buildPayload(valuesById[item.templateId]);
        const note = [installNote.trim(), item.note?.trim()].filter(Boolean).join(" • ") || null;

        await apiFetch(`/api/governance/policy-versions/${draftId}`, {
          method: "PATCH",
          body: JSON.stringify({
            payload,
            notes: note,
            effectiveAt: null,
            applyToAllBranches: true,
            branchIds: [],
          }),
        });
      }

      toast({
        title: "Pack installed as Drafts",
        description: `Created/updated ${chosenCount} draft policy versions. You can review and submit later.`,
      });

      await onInstalled();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Install failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Install failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  const footerPrimary =
    step === 1 ? "Next" : step === 2 ? "Review" : "Install as Drafts";

  async function onPrimary() {
    if (step === 1) return setStep(2);
    if (step === 2) return setStep(3);
    return installAsDrafts();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={[
          // Responsive sizing (prevents overflow on small screens)
          "w-[calc(100vw-1.25rem)] sm:w-full",
          "sm:max-w-3xl lg:max-w-5xl",
          "max-h-[calc(100dvh-1.25rem)]",
          "overflow-hidden p-0",
          // Visual style
          "rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10 bg-xc-card",
        ].join(" ")}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex max-h-[calc(100dvh-1.25rem)] flex-col">
          {/* Header */}
          <div className="shrink-0 px-5 py-4 sm:px-6 sm:py-5">
            <div className="text-lg font-semibold text-xc-text">{pack.name}</div>
            <div className="mt-1 text-sm text-xc-muted">{pack.description}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <StepPill active={step === 1} label="1. Select" />
              <StepPill active={step === 2} label="2. Customize" />
              <StepPill active={step === 3} label="3. Review" />
            </div>

            {err ? (
              <div className="mt-4 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
                {err}
              </div>
            ) : null}
          </div>

          <Separator className="bg-xc-border" />

          {/* Body (scrolls) */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* LEFT */}
              <div className="min-w-0">
                {step === 1 ? (
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold text-xc-text">Policies in this pack</div>
                    {pack.items.map((it) => {
                      const tpl = getTemplateById(it.templateId);
                      const checked = !!selected[it.templateId];

                      return (
                        <button
                          key={it.templateId}
                          type="button"
                          onClick={() => setActiveId(it.templateId)}
                          className={cn(
                            "w-full text-left rounded-2xl border p-4 transition",
                            activeId === it.templateId
                              ? "border-indigo-200/70 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20"
                              : "border-xc-border bg-xc-panel/10 hover:bg-xc-panel/20",
                          )}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-xc-text">{tpl?.name || it.templateId}</div>
                              <div className="mt-0.5 text-xs text-xc-muted">{tpl?.description || ""}</div>
                              <div className="mt-1 font-mono text-xs text-xc-muted">Code: {tpl?.code || "—"}</div>
                              {it.note ? <div className="mt-1 text-xs text-xc-muted">Preset: {it.note}</div> : null}
                            </div>

                            <label className="inline-flex items-center gap-2 self-start">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked;
                                  setSelected((s) => ({ ...s, [it.templateId]: next }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-xc-muted">Include</span>
                            </label>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : step === 2 ? (
                  <div className="grid gap-4">
                    <div className="text-sm font-semibold text-xc-text">Customize selected policies</div>

                    {!chosenCount ? (
                      <div className="rounded-2xl border border-xc-border bg-xc-panel/10 p-6 text-sm text-xc-muted">
                        No policies selected. Go back and select at least one policy.
                      </div>
                    ) : null}

                    {chosenItems.map((it) => {
                      const tpl = getTemplateById(it.templateId);
                      const v = valuesById[it.templateId] ?? {};

                      return (
                        <Card key={it.templateId} className="p-0">
                          <div className="p-5">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-semibold text-xc-text">{tpl?.name || it.templateId}</div>
                              <div className="text-xs text-xc-muted">{tpl?.description || ""}</div>
                              <div className="mt-1 font-mono text-xs text-xc-muted">Code: {tpl?.code || "—"}</div>
                            </div>

                            <Separator className="my-4" />

                            <EditorForTemplate
                              templateId={it.templateId as PolicyTemplateId}
                              value={v}
                              onChange={(next) => setValuesById((s) => ({ ...s, [it.templateId]: next }))}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold text-xc-text">Review</div>
                    <div className="rounded-2xl border border-xc-border bg-xc-panel/10 p-5 text-sm text-xc-muted">
                      This will create/update <span className="font-semibold text-xc-text">{chosenCount}</span> policies as <span className="font-semibold text-xc-text">Drafts</span> (Option A).
                      After install, open each policy and submit for approvals when ready.
                    </div>

                    <div className="grid gap-2">
                      {chosenItems.map((it) => {
                        const tpl = getTemplateById(it.templateId);
                        return (
                          <div key={it.templateId} className="rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                            <div className="text-sm font-semibold text-xc-text">{tpl?.name || it.templateId}</div>
                            <div className="mt-0.5 font-mono text-xs text-xc-muted">Code: {tpl?.code || "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT (sticky on lg) */}
              <div className="min-w-0 lg:sticky lg:top-0">
                <Card className="p-0">
                  <div className="p-5">
                    <div className="text-sm font-semibold text-xc-text">Summary</div>
                    <div className="mt-1 text-sm text-xc-muted">
                      Selected: <span className="font-semibold text-xc-text tabular-nums">{chosenCount}</span> /{" "}
                      <span className="tabular-nums">{pack.items.length}</span>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-2">
                      <Label>Install note (optional)</Label>
                      <Textarea
                        value={installNote}
                        onChange={(e) => setInstallNote(e.target.value)}
                        placeholder="Example: Baseline pack installed for ExcelCare Hospital (drafts)."
                        className="min-h-[90px]"
                      />
                      <div className="text-xs text-xc-muted">
                        This note will be attached to each draft version created by this pack.
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="rounded-2xl border border-xc-border bg-xc-panel/10 p-4 text-sm text-xc-muted">
                      Install mode: <span className="font-semibold text-xc-text">Drafts only</span> (Option A)
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-xc-border bg-xc-card/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
                  disabled={busy || step === 1}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>

                <Button
                  variant="primary"
                  onClick={() => void onPrimary()}
                  disabled={busy || (step !== 1 && !chosenCount)}
                  className="w-full sm:w-auto"
                >
                  {busy && step === 3 ? "Installing..." : footerPrimary}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
