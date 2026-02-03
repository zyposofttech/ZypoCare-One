"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useRouter } from "next/navigation";

import { AlertTriangle, FileText, Loader2, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconChevronRight, IconPlus, IconSearch, IconShield } from "@/components/icons";

// Optional: template helpers (powers presets + friendly payload editing)
import { POLICY_TEMPLATES, getTemplateById } from "@/modules/governance/policy-templates";

type BranchLite = { id: string; code: string; name: string; city?: string };

type PolicyRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  activeVersion: number | null;
  activeEffectiveAt: string | null;
  pendingCount: number;
  updatedAt: string | null;
};

type EffectiveRow = {
  code: string;
  branchId: string | null;
  effective: null | {
    scope: "GLOBAL" | "BRANCH_OVERRIDE";
    versionId: string;
    version: number;
    effectiveAt: string;
  };
};

type CreatePolicyForm = {
  templateId: string; // PolicyTemplateId | "CUSTOM"
  code: string;
  name: string;
  type: string;
  description: string;
  notes: string;
  effectiveAt: string; // datetime-local
  applyToAllBranches: boolean;
  branchIds: string[];
  payloadJson: string;
  submitNow: boolean;
};

function normalizeCode(s: string) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

function toDateTimeLocal(iso: string) {
  // iso -> yyyy-MM-ddTHH:mm
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function badgeTone(label: string) {
  const l = (label || "").toUpperCase();
  if (l.includes("PENDING")) return "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200";
  if (l.includes("ACTIVE")) return "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (l.includes("DRAFT")) return "border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
  return "border-zc-border bg-zc-panel/20 text-zc-muted";
}

function Pill({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone ?? badgeTone(label),
      )}
    >
      {label}
    </span>
  );
}

function deriveStatus(p: PolicyRow) {
  if (p.pendingCount > 0) return "PENDING_APPROVAL";
  if (p.activeVersion != null) return "ACTIVE";
  return "NO_BASELINE";
}

export default function PoliciesList() {
  const { toast } = useToast();
  const router = useRouter();

  const [branches, setBranches] = React.useState<BranchLite[]>([]);
  // "" means global-only (no branch overrides)
  const [branchId, setBranchId] = React.useState<string>("");

  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<PolicyRow[]>([]);
  const [effectiveByCode, setEffectiveByCode] = React.useState<Record<string, EffectiveRow["effective"]>>({});

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const branchSelectValue = branchId || "__GLOBAL__";

  async function loadBranches() {
    // Resilient: prefer governance endpoint, but fall back to core branches (older stacks)
    try {
      const b = await apiFetch<BranchLite[]>("/api/governance/branches");
      if (Array.isArray(b)) return setBranches(b);
    } catch {
      // ignore
    }
    try {
      const b = await apiFetch<BranchLite[]>("/api/branches");
      if (Array.isArray(b)) return setBranches(b);
    } catch {
      // ignore
    }
    setBranches([]);
  }

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [policies, effective] = await Promise.all([
        apiFetch<PolicyRow[]>("/api/governance/policies"),
        apiFetch<EffectiveRow[]>(`/api/governance/effective-policies${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`),
      ]);

      const effMap: Record<string, EffectiveRow["effective"]> = {};
      for (const r of effective ?? []) effMap[String(r.code || "").toUpperCase()] = r.effective;

      setEffectiveByCode(effMap);
      setRows(policies ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load policies");
      setRows([]);
      setEffectiveByCode({});
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadBranches();
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows ?? [];
    if (!s) return list;
    return list.filter((p) => {
      const hay = `${p.code} ${p.name} ${p.type}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const totals = React.useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.pendingCount > 0).length;
    const active = rows.filter((r) => r.activeVersion != null).length;
    return { total, pending, active };
  }, [rows]);

  return (
    <AppShell title="Policy Governance">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconShield className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Policies</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create, review and manage global policy baselines. Choose a branch to preview effective enforcement.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5" onClick={() => void refresh()}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button asChild variant="outline" className="px-5">
              <Link href="/policy/presets">
                Presets <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="primary" className="px-5" onClick={() => setCreateOpen(true)}>
              <IconPlus className="h-4 w-4" />
              Create Policy
            </Button>
          </div>
        </div>

        {/* Summary + controls */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              {branchId
                ? `Viewing effective enforcement for ${branches.find((b) => b.id === branchId)?.name ?? "selected branch"}.`
                : "Viewing Global baseline only (no branch overrides)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Policies</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totals.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Baselines</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{totals.active}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Pending Approvals</div>
                <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{totals.pending}</div>
              </div>

            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code, name, type…"
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label className="text-sm text-zc-muted">Branch preview</Label>
                <Select
                  value={branchSelectValue}
                  onValueChange={(value) => setBranchId(value === "__GLOBAL__" ? "" : value)}
                >
                  <SelectTrigger className="h-10 w-full min-w-[260px] rounded-xl border-zc-border bg-zc-card text-sm">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="__GLOBAL__">Global baseline (no overrides)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Policy Catalog</CardTitle>
            <CardDescription className="text-sm">Click a row to open details. Drafts and approvals are tracked per policy.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Policy</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Effective</th>
                  <th className="px-4 py-3 text-left font-semibold">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading policies…" : "No policies found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((p) => {
                  const status = deriveStatus(p);
                  const eff = effectiveByCode[String(p.code || "").toUpperCase()] ?? null;
                  const scopeLabel = eff?.scope ? (eff.scope === "BRANCH_OVERRIDE" ? "Override" : "Global") : "—";
                  const effVersion = eff?.version != null ? `v${eff.version}` : p.activeVersion != null ? `v${p.activeVersion}` : "—";
                  const effAt = eff?.effectiveAt ?? p.activeEffectiveAt;

                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t border-zc-border hover:bg-zc-panel/20"
                      onClick={() => {
                        router.push(`/policy/policies/${encodeURIComponent(p.id)}`);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{p.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-zc-muted">{p.code}</div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{p.type}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill label={status} />
                          {p.pendingCount > 0 ? <Pill label={`${p.pendingCount} pending`} tone={badgeTone("PENDING")} /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill label={scopeLabel} tone={scopeLabel === "Override" ? badgeTone("DRAFT") : badgeTone("ACTIVE")} />
                          <span className="text-xs text-zc-muted">{effVersion}</span>
                        </div>
                        {effAt ? <div className="mt-1 text-xs text-zc-muted">{new Date(effAt).toLocaleString()}</div> : <div className="mt-1 text-xs text-zc-muted">—</div>}
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="outline" className="px-3" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/policy/policies/${encodeURIComponent(p.id)}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {createOpen ? (
          <CreatePolicyModal
            branches={branches}
            onClose={() => setCreateOpen(false)}
            onCreated={async (createdId) => {
              setCreateOpen(false);
              await refresh();
              if (createdId) router.push(`/policy/policies/${encodeURIComponent(createdId)}`);
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function CreatePolicyModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: BranchLite[];
  onClose: () => void;
  onCreated: (createdId?: string) => void | Promise<void>;
}) {
  const { toast } = useToast();

  const templates = React.useMemo(() => {
    return [
      { id: "CUSTOM", name: "Custom Policy", description: "Create a new policy definition and draft payload." },
      ...POLICY_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description })),
    ];
  }, []);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CreatePolicyForm>(() => {
    const firstTpl = POLICY_TEMPLATES[0];
    const nowIso = new Date().toISOString();
    const dt = toDateTimeLocal(nowIso);

    return {
      templateId: firstTpl?.id ?? "CUSTOM",
      code: firstTpl?.code ?? "",
      name: firstTpl?.name ?? "",
      type: firstTpl?.type ?? "",
      description: firstTpl?.description ?? "",
      notes: "",
      effectiveAt: dt,
      applyToAllBranches: true,
      branchIds: [],
      payloadJson: JSON.stringify(firstTpl?.defaults ?? {}, null, 2),
      submitNow: false,
    };
  });

  React.useEffect(() => {
    if (form.templateId === "CUSTOM") return;
    const tpl = getTemplateById(form.templateId as any);
    if (!tpl) return;
    setForm((prev) => ({
      ...prev,
      code: tpl.code,
      name: tpl.name,
      type: tpl.type,
      description: tpl.description,
      payloadJson: JSON.stringify(tpl.buildPayload(tpl.defaults as any), null, 2),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.templateId]);

  async function onSave() {
    setError(null);

    const code = normalizeCode(form.code);
    if (!code) return setError("Policy code is required");
    if (!form.name.trim()) return setError("Policy name is required");
    if (!form.type.trim()) return setError("Policy type is required");

    let payload: any = {};
    try {
      payload = form.payloadJson?.trim() ? JSON.parse(form.payloadJson) : {};
    } catch {
      return setError("Payload must be valid JSON");
    }

    const effectiveAtIso = form.effectiveAt ? new Date(form.effectiveAt).toISOString() : new Date().toISOString();

    setSaving(true);
    try {
      // 1) Ensure definition exists
      let defId: string | null = null;
      try {
        const created = await apiFetch<{ id: string }>(`/api/governance/policies`, {
          method: "POST",
          body: JSON.stringify({
            code,
            name: form.name.trim(),
            type: String(form.type || "").trim().toUpperCase(),
            description: form.description?.trim() || null,
          }),
        });
        defId = created?.id ?? null;
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (!msg.toLowerCase().includes("already exists")) throw e;
        const existing = await apiFetch<{ id: string }>(`/api/governance/policies/${encodeURIComponent(code)}`);
        defId = existing?.id ?? null;
      }

      // 2) Ensure global draft exists
      const d = await apiFetch<{ id: string }>(`/api/governance/policies/${encodeURIComponent(code)}/drafts`, {
        method: "POST",
      });

      // 3) Update payload + rollout
      await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(d.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          payload,
          notes: form.notes?.trim() || null,
          effectiveAt: effectiveAtIso,
          applyToAllBranches: !!form.applyToAllBranches,
          branchIds: form.applyToAllBranches ? [] : form.branchIds,
        }),
      });

      // 4) Optional submit
      if (form.submitNow) {
        await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(d.id)}/submit`, {
          method: "POST",
        });
      }

      toast({
        title: form.submitNow ? "Draft submitted" : "Draft saved",
        description: `${code} is ready${form.submitNow ? " for approval" : " as a draft"}.`,
        variant: form.submitNow ? "info" : "success",
      } as any);

      await onCreated(defId ?? undefined);
    } catch (e: any) {
      setError(e?.message || "Failed to create policy");
      toast({ title: "Create failed", description: e?.message || "Failed to create policy", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        // FIX 1: Use 'flex flex-col' instead of block + overflow-hidden.
        // This ensures the header/footer stick to top/bottom and the body takes remaining space.
        className={cn(
          "flex flex-col gap-0 p-0", 
          "w-[calc(100vw-1.5rem)] sm:w-full",
          "sm:max-w-[920px]",
          "max-h-[90vh]", 
          "border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header - Flex None (Natural Height) */}
        <div className="flex-none p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Create Policy
            </DialogTitle>
            <DialogDescription>
              Create a policy definition and save the first Global draft. You can submit for approvals when ready.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator />

        {/* Scrollable Body - Flex 1 (Takes remaining space) */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-5">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{error}</div>
              </div>
            ) : null}

            {/* FIX 2: Top Grid Alignment */}
            <div className="grid gap-4 md:grid-cols-3 items-start">
              
              {/* Column 1: Template */}
              <div className="grid gap-2">
                <Label>Template</Label>
                <select
                  value={form.templateId}
                  onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-zc-border bg-zc-card px-3 text-sm text-zc-text"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-zc-muted min-h-[1rem]">
                  {templates.find((t) => t.id === form.templateId)?.description ?? ""}
                </div>
              </div>

              {/* Column 2: Code */}
              <div className="grid gap-2">
                <Label>Policy Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: normalizeCode(e.target.value) }))}
                  placeholder="RETENTION_CLINICAL_RECORDS"
                />
                <div className="text-xs text-zc-muted min-h-[1rem]">Allowed: A–Z, 0–9, underscore. Max 64 chars.</div>
              </div>

              {/* Column 3: Type */}
              <div className="grid gap-2">
                <Label>Policy Type</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: String(e.target.value || "").toUpperCase() }))}
                  placeholder="RETENTION"
                />
                {/* Added min-h-[1rem] empty div here to align with other columns that have helper text */}
                <div className="min-h-[1rem]" /> 
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Policy Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Clinical Records Retention"
                />
              </div>

              <div className="grid gap-2">
                <Label>Effective At</Label>
                <Input
                  type="datetime-local"
                  value={form.effectiveAt}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description…"
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Change notes for reviewers…"
              />
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rollout</CardTitle>
                <CardDescription className="text-xs">
                  Choose where this Global baseline should apply when approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.applyToAllBranches}
                    onChange={(e) => setForm((p) => ({ ...p, applyToAllBranches: e.target.checked, branchIds: [] }))}
                  />
                  Apply to all branches
                </label>

                {!form.applyToAllBranches ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {branches.map((b) => {
                      const checked = form.branchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-start gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(form.branchIds);
                              if (e.target.checked) next.add(b.id);
                              else next.delete(b.id);
                              setForm((p) => ({ ...p, branchIds: Array.from(next) }));
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zc-text">{b.name}</div>
                            <div className="text-xs text-zc-muted">
                              {b.city ?? ""} {b.code ? `• ${b.code}` : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-2">
              <Label>Draft Payload (JSON)</Label>
              <Textarea
                value={form.payloadJson}
                onChange={(e) => setForm((p) => ({ ...p, payloadJson: e.target.value }))}
                className="min-h-[160px] sm:min-h-[220px] font-mono text-xs"
              />
              <div className="text-xs text-zc-muted">
                Tip: If you selected a template, this is pre-filled. You can still modify it.
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer - Flex None */}
        <div className="flex-none">
          <Separator />
          <DialogFooter className="p-4 sm:p-6">
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-zc-muted">
                <input
                  type="checkbox"
                  checked={form.submitNow}
                  onChange={(e) => setForm((p) => ({ ...p, submitNow: e.target.checked }))}
                />
                Submit after saving
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void onSave()} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Save Draft
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
