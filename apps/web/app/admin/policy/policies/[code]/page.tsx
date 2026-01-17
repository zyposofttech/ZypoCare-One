"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";

type PolicyVersion = {
  id: string;
  version: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "ACTIVE" | "REJECTED" | "RETIRED";
  scope: "GLOBAL" | "BRANCH_OVERRIDE";
  branchId: string | null;
  effectiveAt: string;
  notes: string | null;
  payload: any;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  createdByName: string | null;
  approvedByName: string | null;
};

type BranchPolicyDetail = {
  code: string;
  name: string;
  description: string | null;
  type: string;
  effective: PolicyVersion | null;
  globalActive: PolicyVersion | null;
  overrideActive: PolicyVersion | null;
  overrideDraft: PolicyVersion | null;
  overrideHistory: PolicyVersion[];
};

function statusBadge(s: PolicyVersion["status"]) {
  if (s === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (s === "PENDING_APPROVAL") return <Badge variant="warning">Pending approval</Badge>;
  if (s === "DRAFT") return <Badge variant="info">Draft</Badge>;
  if (s === "APPROVED") return <Badge variant="info">Approved (scheduled)</Badge>;
  if (s === "RETIRED") return <Badge variant="neutral">Retired</Badge>;
  if (s === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
  return <Badge variant="neutral">{s}</Badge>;
}

function pretty(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function isoToDatetimeLocal(iso: string) {
  try {
    const dt = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function BranchPolicyDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);

  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<BranchPolicyDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Draft editing state (override draft only)
  const [draftJson, setDraftJson] = React.useState<string>("{}");
  const [draftNotes, setDraftNotes] = React.useState<string>("");
  const [draftEffective, setDraftEffective] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const overrideDraft = detail?.overrideDraft ?? null;
  const overrideActive = detail?.overrideActive ?? null;
  const globalActive = detail?.globalActive ?? null;
  const effective = detail?.effective ?? null;

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const d = await apiFetch<BranchPolicyDetail>(`/api/governance/branch-policies/${encodeURIComponent(code)}`);
      setDetail(d);
    } catch (e: any) {
      setErr(e?.message || "Failed to load policy");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  React.useEffect(() => {
    if (!overrideDraft) return;
    setDraftJson(pretty(overrideDraft.payload ?? {}));
    setDraftNotes(overrideDraft.notes ?? "");
    setDraftEffective(isoToDatetimeLocal(overrideDraft.effectiveAt));
  }, [overrideDraft?.id]);

  async function createOverrideDraft() {
    setErr(null);
    try {
      await apiFetch(`/api/governance/branch-policies/${encodeURIComponent(code)}/override-drafts`, {
        method: "POST",
      });
      notify.success("Override draft created", "Edit the payload and submit for Super Admin approval.");
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "Failed to create override draft";
      setErr(msg);
      notify.error("Create draft failed", msg);
    }
  }

  async function saveDraft() {
    if (!overrideDraft) return;
    if (overrideDraft.status !== "DRAFT") {
      notify.warning("Not editable", "Only DRAFT override versions can be edited.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const payload = JSON.parse(draftJson || "{}");
      const effectiveAt = draftEffective ? new Date(draftEffective).toISOString() : overrideDraft.effectiveAt;

      await apiFetch(`/api/governance/policy-versions/${overrideDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          payload,
          notes: draftNotes || null,
          effectiveAt,
        }),
      });

      notify.success("Draft saved", "Override draft saved successfully.");
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "Failed to save draft";
      setErr(msg);
      notify.error("Save failed", msg);
    } finally {
      setSaving(false);
    }
  }

  async function submitDraft() {
    if (!overrideDraft) return;
    if (overrideDraft.status !== "DRAFT") {
      notify.warning("Cannot submit", "Only DRAFT versions can be submitted.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      // persist edits first
      await saveDraft();
      await apiFetch(`/api/governance/policy-versions/${overrideDraft.id}/submit`, { method: "POST" });
      notify.success("Submitted for approval", "Super Admin will review and approve/reject this override.");
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "Submit failed";
      setErr(msg);
      notify.error("Submit failed", msg);
    } finally {
      setSaving(false);
    }
  }

  const pendingOverride = detail?.overrideHistory?.find((v) => v.status === "PENDING_APPROVAL") || null;

  return (
    <AppShell title="Policy Overrides">
      <div className="grid gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">{detail?.name || code}</div>
            <div className="mt-1 text-sm text-zc-muted">
              {detail?.description || "Branch override proposals require Super Admin approval."}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/policy">
              <Button variant="outline">Back</Button>
            </Link>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}

        {/* Effective policy */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Effective policy (for this branch)</CardTitle>
                <CardDescription>
                  This is what is currently enforced for your branch: branch override (if active) else global baseline.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {effective ? statusBadge(effective.status) : <Badge variant="warning">No effective version</Badge>}
                {effective ? (
                  <Badge variant={effective.scope === "BRANCH_OVERRIDE" ? "success" : "info"}>
                    {effective.scope === "BRANCH_OVERRIDE" ? "Branch override" : "Global"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {effective ? (
              <>
                <div className="text-xs text-zc-muted">
                  Version v{effective.version} · Effective: {new Date(effective.effectiveAt).toLocaleString()}
                </div>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-zc-border bg-white/40 p-3 text-xs">
                  {pretty(effective.payload)}
                </pre>
              </>
            ) : (
              <div className="rounded-xl border border-zc-border bg-zc-card p-4 text-sm text-zc-muted">
                No effective policy found for this branch.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Global baseline */}
          <Card>
            <CardHeader>
              <CardTitle>Global baseline</CardTitle>
              <CardDescription>The current approved global policy applicable to your branch.</CardDescription>
            </CardHeader>
            <CardContent>
              {globalActive ? (
                <>
                  <div className="flex items-center gap-2">
                    {statusBadge(globalActive.status)}
                    <Badge variant="info">v{globalActive.version}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    Effective: {new Date(globalActive.effectiveAt).toLocaleString()}
                  </div>
                  <pre className="mt-3 max-h-[260px] overflow-auto rounded-lg border border-zc-border bg-white/40 p-3 text-xs">
                    {pretty(globalActive.payload)}
                  </pre>
                </>
              ) : (
                <div className="rounded-xl border border-zc-border bg-zc-card p-4 text-sm text-zc-muted">
                  No approved global baseline found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current override */}
          <Card>
            <CardHeader>
              <CardTitle>Branch override</CardTitle>
              <CardDescription>
                Active override for your branch (if any). You can propose a new override via a draft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overrideActive ? (
                <>
                  <div className="flex items-center gap-2">
                    {statusBadge(overrideActive.status)}
                    <Badge variant="success">v{overrideActive.version}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    Effective: {new Date(overrideActive.effectiveAt).toLocaleString()}
                  </div>
                  <pre className="mt-3 max-h-[260px] overflow-auto rounded-lg border border-zc-border bg-white/40 p-3 text-xs">
                    {pretty(overrideActive.payload)}
                  </pre>
                </>
              ) : (
                <div className="rounded-xl border border-zc-border bg-zc-card p-4 text-sm text-zc-muted">
                  No active override for this branch.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Override draft editor */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Propose override</CardTitle>
                <CardDescription>
                  Create a draft override for your own branch, then submit for Super Admin maker-checker approval.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!overrideDraft ? (
                  <Button onClick={createOverrideDraft} disabled={saving}>
                    Create Override Draft
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {overrideDraft ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1 rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Draft metadata</div>
                    <Badge variant="info">v{overrideDraft.version}</Badge>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-1">
                      <Label>Effective date/time</Label>
                      <Input
                        type="datetime-local"
                        value={draftEffective}
                        onChange={(e) => setDraftEffective(e.target.value)}
                      />
                      <div className="text-xs text-zc-muted">Use effective-dating for scheduled activation.</div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Notes (optional)</Label>
                      <Textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Button variant="outline" onClick={saveDraft} disabled={saving || overrideDraft.status !== "DRAFT"}>
                      Save Draft
                    </Button>
                    <Button onClick={submitDraft} disabled={saving || overrideDraft.status !== "DRAFT"}>
                      Submit for approval
                    </Button>
                    {overrideDraft.status !== "DRAFT" ? (
                      <div className="text-xs text-zc-muted">
                        This draft is not editable because it is {overrideDraft.status.replaceAll("_", " ")}.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="md:col-span-2 rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Override payload (JSON)</div>
                    <div className="flex items-center gap-2">{statusBadge(overrideDraft.status)}</div>
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    Edit the override payload as JSON. When approved, it will supersede global policy for your branch.
                  </div>
                  <div className="mt-3">
                    <Textarea
                      value={draftJson}
                      onChange={(e) => setDraftJson(e.target.value)}
                      className="min-h-[420px] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : pendingOverride ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Pending approval</Badge>
                  <span className="font-semibold">An override submission is awaiting Super Admin review.</span>
                </div>
                <div className="mt-2 text-xs text-zc-muted">
                  Version v{pendingOverride.version} · Effective: {new Date(pendingOverride.effectiveAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-zc-border bg-zc-card p-4 text-sm text-zc-muted">
                No override draft exists. Click “Create Override Draft” to propose a branch-specific override.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Override history */}
        <Card>
          <CardHeader>
            <CardTitle>Override history</CardTitle>
            <CardDescription>All override versions for your branch (latest first).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-zc-muted">
                  <tr className="border-b border-zc-border">
                    <th className="py-2">Version</th>
                    <th>Status</th>
                    <th>Effective</th>
                    <th>Maker</th>
                    <th>Checker</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.overrideHistory ?? []).map((v) => (
                    <tr key={v.id} className="border-b border-zc-border">
                      <td className="py-2 font-medium">v{v.version}</td>
                      <td>{statusBadge(v.status)}</td>
                      <td>{new Date(v.effectiveAt).toLocaleString()}</td>
                      <td>{v.createdByName || "-"}</td>
                      <td>{v.approvedByName || "-"}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className="rounded-md border border-zc-border bg-zc-card px-3 py-1 text-sm hover:bg-[rgb(var(--zc-hover-rgb)/0.06)]"
                          onClick={() => {
                            notify.info(`Override v${v.version}`, `Status: ${v.status.replaceAll("_", " ")}`);
                            window.navigator.clipboard
                              ?.writeText(pretty(v.payload))
                              .then(() => notify.success("Copied", "Override payload JSON copied to clipboard"))
                              .catch(() => {});
                          }}
                        >
                          Copy JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!detail?.overrideHistory?.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zc-muted">
                        No override versions yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}