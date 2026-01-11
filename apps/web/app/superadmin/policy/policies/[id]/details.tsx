"use client";

import * as React from "react";
import Link from "next/link";

import { AlertTriangle, ArrowLeft, FileText, Loader2, Pencil, RefreshCw, Send } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconChevronRight, IconShield } from "@/components/icons";

import { POLICY_TEMPLATES } from "@/modules/governance/policy-templates";

type BranchLite = { id: string; code: string; name: string; city?: string };

type PolicyVersion = {
  id: string;
  version: number;
  status: string;
  scope: "GLOBAL" | "BRANCH_OVERRIDE";
  branchId: string | null;
  effectiveAt: string;
  notes: string | null;
  payload: any;
  applyToAllBranches: boolean;
  branchIds: string[];
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  createdByName: string | null;
  approvedByName: string | null;
};

type PolicyDetailGlobal = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  active: PolicyVersion | null;
  draft: PolicyVersion | null;
  history: PolicyVersion[];
};

type PolicyEffective = {
  code: string;
  name: string;
  type: string;
  description: string | null;
  branchId: string | null;
  effective: null | {
    scope: "GLOBAL" | "BRANCH_OVERRIDE";
    versionId: string;
    version: number;
    effectiveAt: string;
    payload: any;
  };
};

function toDateTimeLocal(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function safeNum(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function Pill({ label, tone }: { label: string; tone?: string }) {
  const l = String(label || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";
  const cls =
    tone ??
    (l.includes("PENDING")
      ? "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
      : l.includes("ACTIVE")
        ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200"
        : l.includes("DRAFT")
          ? "border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200"
          : "border-xc-border bg-xc-panel/20 text-xc-muted");
  return <span className={cn(base, cls)}>{label}</span>;
}

export default function PolicyDetails({ id }: { id: string }) {
  const { toast } = useToast();

  const [branches, setBranches] = React.useState<BranchLite[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [detail, setDetail] = React.useState<PolicyDetailGlobal | null>(null);
  const [effective, setEffective] = React.useState<PolicyEffective | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);

  const code = detail?.code ?? "";

  async function loadBranches() {
    try {
      // Governance branch list respects role scoping (superadmin: all branches; others: their branch).
      const b = await apiFetch<BranchLite[]>("/api/governance/branches");
      setBranches(b ?? []);
    } catch {
      // Fallback for older deployments where governance branch endpoint might not exist.
      try {
        const b2 = await apiFetch<BranchLite[]>("/api/branches");
        setBranches(b2 ?? []);
      } catch {
        setBranches([]);
      }
    }
  }

  async function refreshDetail() {
    setErr(null);
    setLoading(true);
    try {
      const g = await apiFetch<PolicyDetailGlobal>(`/api/governance/policies/id/${encodeURIComponent(id)}`);
      setDetail(g);
      await refreshEffective(g.code);
    } catch (e: any) {
      setErr(e?.message || "Failed to load policy detail");
      setDetail(null);
      setEffective(null);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await refreshDetail();
  }

  async function refreshEffective(code: string) {
    try {
      const e = await apiFetch<PolicyEffective>(
        `/api/governance/policies/${encodeURIComponent(code)}/effective${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`,
      );
      setEffective(e);
    } catch {
      setEffective(null);
    }
  }

  React.useEffect(() => {
    void loadBranches();
    void refreshDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  React.useEffect(() => {
    if (detail?.code) void refreshEffective(detail.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, detail?.code]);

  async function createDraft() {
    setErr(null);
    setLoading(true);
    try {
      if (!code) throw new Error("Policy code not loaded yet");
      await apiFetch(`/api/governance/policies/${encodeURIComponent(code)}/drafts`, { method: "POST" });
      toast({ title: "Draft created", description: "A new draft is ready to edit." });
      await refresh();
      setEditOpen(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to create draft");
    } finally {
      setLoading(false);
    }
  }

  async function submitDraft(versionId: string) {
    setErr(null);
    setLoading(true);
    try {
      await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(versionId)}/submit`, { method: "POST" });
      toast({ title: "Submitted", description: "Draft submitted for approval." });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to submit draft");
    } finally {
      setLoading(false);
    }
  }

  const policyName = detail?.name ?? code;

  return (
    <AppShell title="Policy Governance">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-xc-border bg-xc-panel/30">
              <IconShield className="h-5 w-5 text-xc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">{policyName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-xc-muted">
                <span className="font-mono text-xs">{code}</span>
                {detail?.type ? (
                  <>
                    <span className="text-xc-muted/60">•</span>
                    <span>{detail.type}</span>
                  </>
                ) : null}
              </div>
              {detail?.description ? <div className="mt-2 text-sm text-xc-muted">{detail.description}</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5" onClick={() => void refresh()}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button asChild variant="outline" className="px-5">
              <Link href="/superadmin/policy/policies">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>

            <Button asChild variant="outline" className="px-5">
              <Link href="/superadmin/policy/approvals">
                Approvals <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Effective preview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Effective Enforcement Preview</CardTitle>
            <CardDescription className="text-sm">
              Select a branch to preview global baseline + any approved branch override.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-xc-muted">Branch</Label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-10 rounded-lg border border-xc-border bg-xc-card px-3 text-sm text-xc-text"
                >
                  <option value="">Global baseline (no overrides)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {effective?.effective ? (
                  <>
                    <Pill label={effective.effective.scope === "BRANCH_OVERRIDE" ? "Override" : "Global"} />
                    <Pill label={`v${effective.effective.version}`} />
                    <span className="text-xs text-xc-muted">Effective: {new Date(effective.effective.effectiveAt).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-sm text-xc-muted">No effective policy found.</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-xc-border bg-xc-panel/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted/80">Effective Payload</div>
              <pre className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-xc-border bg-xc-panel/20 p-4 text-xs text-xc-text">
                {JSON.stringify(effective?.effective?.payload ?? null, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Baseline lifecycle */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Baseline</CardTitle>
              <CardDescription className="text-sm">Currently enforced global baseline (if any).</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-4 pt-4">
              {!detail?.active ? (
                <div className="text-sm text-xc-muted">No active baseline yet.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill label={detail.active.status} />
                    <Pill label={`v${detail.active.version}`} />
                    <Pill label={detail.active.applyToAllBranches ? "All branches" : `${detail.active.branchIds.length} branches`} />
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-xc-muted">Effective</span><span className="text-xc-text">{new Date(detail.active.effectiveAt).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-xc-muted">Approved by</span><span className="text-xc-text">{detail.active.approvedByName ?? "—"}</span></div>
                  </div>
                  <details className="rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-xc-text">View payload</summary>
                    <pre className="mt-3 max-h-[240px] overflow-auto rounded-xl border border-xc-border bg-xc-panel/20 p-3 text-xs text-xc-text">
                      {JSON.stringify(detail.active.payload ?? null, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Draft</CardTitle>
              <CardDescription className="text-sm">Edit the next baseline draft and submit for approval.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="grid gap-4 pt-4">
              {!detail?.draft ? (
                <>
                  <div className="text-sm text-xc-muted">No draft exists.</div>
                  <Button variant="primary" className="w-fit" onClick={() => void createDraft()}>
                    <FileText className="h-4 w-4" />
                    Create Draft
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill label={detail.draft.status} />
                    <Pill label={`v${detail.draft.version}`} />
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-xc-muted">Effective</span><span className="text-xc-text">{new Date(detail.draft.effectiveAt).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-xc-muted">Created by</span><span className="text-xc-text">{detail.draft.createdByName ?? "—"}</span></div>
                  </div>

                  {detail.draft.notes ? (
                    <div className="rounded-xl border border-xc-border bg-xc-panel/10 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted/80">Notes</div>
                      <div className="mt-2 text-xc-text whitespace-pre-wrap">{detail.draft.notes}</div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4" />
                      Edit Draft
                    </Button>
                    <Button variant="primary" onClick={() => void submitDraft(detail.draft!.id)}>
                      <Send className="h-4 w-4" />
                      Submit
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Version History</CardTitle>
            <CardDescription className="text-sm">Recent versions (global scope). Most recent first.</CardDescription>
          </CardHeader>
          <Separator />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-xc-panel/20 text-xs text-xc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Effective</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {!detail?.history?.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-xc-muted">
                      {loading ? "Loading…" : "No history yet."}
                    </td>
                  </tr>
                ) : null}
                {(detail?.history ?? []).map((v) => (
                  <tr key={v.id} className="border-t border-xc-border">
                    <td className="px-4 py-3 font-semibold text-xc-text">v{v.version}</td>
                    <td className="px-4 py-3"><Pill label={v.status} /></td>
                    <td className="px-4 py-3 text-xc-muted">{new Date(v.effectiveAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xc-muted">{new Date(v.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xc-muted">{v.createdByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {editOpen && detail?.draft ? (
          <EditDraftModal
            code={detail.code}
            name={detail.name}
            draft={detail.draft}
            branches={branches}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await refresh();
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function EditDraftModal({
  code,
  name,
  draft,
  branches,
  onClose,
  onSaved,
}: {
  code: string;
  name: string;
  draft: PolicyVersion;
  branches: BranchLite[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const tpl = React.useMemo(() => POLICY_TEMPLATES.find((t) => String(t.code).toUpperCase() === String(code).toUpperCase()) ?? null, [code]);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [notes, setNotes] = React.useState(draft.notes ?? "");
  const [effectiveAt, setEffectiveAt] = React.useState(toDateTimeLocal(draft.effectiveAt));
  const [applyAll, setApplyAll] = React.useState<boolean>(draft.applyToAllBranches ?? true);
  const [branchIds, setBranchIds] = React.useState<string[]>(draft.branchIds ?? []);

  const [mode, setMode] = React.useState<"FORM" | "JSON">(tpl ? "FORM" : "JSON");

  const [formValues, setFormValues] = React.useState<any>(() => {
    try {
      return tpl ? tpl.fromPayload(draft.payload) : null;
    } catch {
      return tpl ? (tpl.defaults as any) : null;
    }
  });

  const [payloadJson, setPayloadJson] = React.useState<string>(() => JSON.stringify(draft.payload ?? {}, null, 2));

  function toggleBranch(id: string, checked: boolean) {
    const next = new Set(branchIds);
    if (checked) next.add(id);
    else next.delete(id);
    setBranchIds(Array.from(next));
  }

  async function save(submitAfter: boolean) {
    setError(null);

    const effectiveAtIso = effectiveAt ? new Date(effectiveAt).toISOString() : new Date().toISOString();

    let payload: any;
    try {
      if (mode === "FORM" && tpl) payload = tpl.buildPayload(formValues);
      else payload = payloadJson?.trim() ? JSON.parse(payloadJson) : {};
    } catch {
      return setError("Payload must be valid (form inputs or JSON)");
    }

    setSaving(true);
    try {
      await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(draft.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          payload,
          notes: notes.trim() || null,
          effectiveAt: effectiveAtIso,
          applyToAllBranches: !!applyAll,
          branchIds: applyAll ? [] : branchIds,
        }),
      });

      if (submitAfter) {
        await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(draft.id)}/submit`, { method: "POST" });
      }

      toast({
        title: submitAfter ? "Submitted" : "Saved",
        description: submitAfter ? "Draft submitted for approval." : "Draft saved successfully.",
      });

      await onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-[900px] border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Edit Draft — {name}
          </DialogTitle>
          <DialogDescription>Update payload, rollout scope and effective date. Submit when ready for approval.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-5">
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{error}</div>
            </div>
          ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Effective At</Label>
            <Input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Editor</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="h-10 rounded-lg border border-xc-border bg-xc-card px-3 text-sm text-xc-text"
            >
              <option value="JSON">JSON</option>
              <option value="FORM" disabled={!tpl}>
                Form (template)
              </option>
            </select>
            {!tpl ? <div className="text-xs text-xc-muted">No template found for {code}. JSON editor is available.</div> : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain what changed and why…" />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rollout</CardTitle>
            <CardDescription className="text-xs">Choose where this Global baseline applies when approved.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(e) => {
                  setApplyAll(e.target.checked);
                  if (e.target.checked) setBranchIds([]);
                }}
              />
              Apply to all branches
            </label>

            {!applyAll ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-start gap-2 rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={branchIds.includes(b.id)}
                      onChange={(e) => toggleBranch(b.id, e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-xc-text">{b.name}</div>
                      <div className="text-xs text-xc-muted">{b.city ?? ""} {b.code ? `• ${b.code}` : ""}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {mode === "FORM" && tpl ? (
          <TemplateForm templateCode={tpl.code} value={formValues} onChange={setFormValues} />
        ) : (
          <div className="grid gap-2">
            <Label>Payload (JSON)</Label>
            <Textarea className="min-h-[260px] font-mono text-xs" value={payloadJson} onChange={(e) => setPayloadJson(e.target.value)} />
          </div>
        )}
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void save(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="primary" onClick={() => void save(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save & Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateForm({
  templateCode,
  value,
  onChange,
}: {
  templateCode: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const code = String(templateCode).toUpperCase();

  if (code === "RETENTION_CLINICAL_RECORDS") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Clinical Records Retention</CardTitle>
          <CardDescription className="text-xs">Configure retention years and medico-legal hold.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>OPD years</Label>
              <Input type="number" min={0} value={value.opdYears ?? 5} onChange={(e) => onChange({ ...value, opdYears: safeNum(e.target.value, 5) })} />
            </div>
            <div className="grid gap-2">
              <Label>IPD years</Label>
              <Input type="number" min={0} value={value.ipdYears ?? 10} onChange={(e) => onChange({ ...value, ipdYears: safeNum(e.target.value, 10) })} />
            </div>
            <div className="grid gap-2">
              <Label>Lab years</Label>
              <Input type="number" min={0} value={value.labYears ?? 2} onChange={(e) => onChange({ ...value, labYears: safeNum(e.target.value, 2) })} />
            </div>
            <div className="grid gap-2">
              <Label>Imaging years</Label>
              <Input type="number" min={0} value={value.imagingYears ?? 5} onChange={(e) => onChange({ ...value, imagingYears: safeNum(e.target.value, 5) })} />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!value.medicoLegalHoldEnabled}
              onChange={(e) => onChange({ ...value, medicoLegalHoldEnabled: e.target.checked })}
            />
            Medico-legal hold enabled
          </label>

          <div className="grid gap-2 sm:max-w-[320px]">
            <Label>Medico-legal minimum years</Label>
            <Input
              type="number"
              min={0}
              disabled={!value.medicoLegalHoldEnabled}
              value={value.medicoLegalMinYears ?? 10}
              onChange={(e) => onChange({ ...value, medicoLegalMinYears: safeNum(e.target.value, 10) })}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (code === "CONSENT_DEFAULTS") {
    const scope = new Set<string>(Array.isArray(value.defaultScope) ? value.defaultScope : ["VIEW", "STORE"]);
    const toggle = (k: string) => {
      const next = new Set(scope);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      onChange({ ...value, defaultScope: Array.from(next) });
    };

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Consent Defaults</CardTitle>
          <CardDescription className="text-xs">Default posture for disclosures and patient portal sharing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Default status</Label>
            <select
              className="h-10 w-full rounded-lg border border-xc-border bg-xc-card px-3 text-sm"
              value={value.defaultStatus ?? "GRANTED"}
              onChange={(e) => onChange({ ...value, defaultStatus: e.target.value })}
            >
              <option value="GRANTED">GRANTED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label>Default scope</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["VIEW", "STORE", "SHARE"] as const).map((k) => (
                <label key={k} className="flex items-start gap-2 rounded-xl border border-xc-border bg-xc-panel/10 p-3">
                  <input type="checkbox" className="mt-1" checked={scope.has(k)} onChange={() => toggle(k)} />
                  <div className="text-sm font-semibold text-xc-text">{k}</div>
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.shareToPatientPortal} onChange={(e) => onChange({ ...value, shareToPatientPortal: e.target.checked })} />
            Share to patient portal
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.smsConsentRequired} onChange={(e) => onChange({ ...value, smsConsentRequired: e.target.checked })} />
            SMS consent required
          </label>
        </CardContent>
      </Card>
    );
  }

  if (code === "AUDIT_LOGGING") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Audit Logging</CardTitle>
          <CardDescription className="text-xs">Audit ledger granularity and retention.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
            Enable audit logging
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!value.logPHIAccess} onChange={(e) => onChange({ ...value, logPHIAccess: e.target.checked })} />
              Log PHI access
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!value.logExports} onChange={(e) => onChange({ ...value, logExports: e.target.checked })} />
              Log exports
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!value.logBreakGlass} onChange={(e) => onChange({ ...value, logBreakGlass: e.target.checked })} />
              Log break-glass
            </label>
          </div>

          <div className="grid gap-2 sm:max-w-[360px]">
            <Label>Retention days</Label>
            <Input type="number" min={0} value={value.retentionDays ?? 2555} onChange={(e) => onChange({ ...value, retentionDays: safeNum(e.target.value, 2555) })} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (code === "EXPORT_GUARDRAILS") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Export Guardrails</CardTitle>
          <CardDescription className="text-xs">Controls for exports including thresholds and justification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Max rows</Label>
              <Input type="number" min={0} value={value.maxRows ?? 50000} onChange={(e) => onChange({ ...value, maxRows: safeNum(e.target.value, 50000) })} />
            </div>
            <div className="grid gap-2">
              <Label>Approval required above</Label>
              <Input type="number" min={0} value={value.approvalRequiredAboveRows ?? 10000} onChange={(e) => onChange({ ...value, approvalRequiredAboveRows: safeNum(e.target.value, 10000) })} />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.requireReason} onChange={(e) => onChange({ ...value, requireReason: e.target.checked })} />
            Require export reason
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.watermark} onChange={(e) => onChange({ ...value, watermark: e.target.checked })} />
            Watermark exports
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.allowPHIExport} onChange={(e) => onChange({ ...value, allowPHIExport: e.target.checked })} />
            Allow PHI export
          </label>
        </CardContent>
      </Card>
    );
  }

  if (code === "BREAK_GLASS") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Break-Glass</CardTitle>
          <CardDescription className="text-xs">Emergency access controls.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
            Enable break-glass
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.requireJustification} onChange={(e) => onChange({ ...value, requireJustification: e.target.checked })} />
            Justification required
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!value.notifySecurity} onChange={(e) => onChange({ ...value, notifySecurity: e.target.checked })} />
            Notify security
          </label>

          <div className="grid gap-2 sm:max-w-[360px]">
            <Label>Auto-expire minutes</Label>
            <Input type="number" min={1} value={value.autoExpireMinutes ?? 60} onChange={(e) => onChange({ ...value, autoExpireMinutes: safeNum(e.target.value, 60) })} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-2">
      <Label>Template editor</Label>
      <div className="rounded-xl border border-xc-border bg-xc-panel/10 p-4 text-sm text-xc-muted">
        No form editor available for this template. Use JSON editor.
      </div>
    </div>
  );
}
