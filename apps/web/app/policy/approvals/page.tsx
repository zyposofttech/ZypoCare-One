"use client";

import * as React from "react";

import { AppLink as Link } from "@/components/app-link";

import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconChevronRight, IconShield } from "@/components/icons";

type BranchLite = { id: string; code: string; name: string; city?: string };

type ApprovalRow = {
  id: string;
  policyId: string;
  policyCode: string;
  policyName: string | null;
  version: number;
  scope: "GLOBAL" | "BRANCH_OVERRIDE";
  status: "PENDING_APPROVAL";
  submittedAt: string;
  effectiveAt: string;
  createdByName: string | null;
  notes: string | null;
  applyToAllBranches: boolean;
  branchIds: string[];
  branchName: string | null;
};

function Pill({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone ?? "border-zc-border bg-zc-panel/20 text-zc-muted",
      )}
    >
      {label}
    </span>
  );
}

function tonePending() {
  return "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200";
}

function toneGood() {
  return "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
}

function toneDanger() {
  return "border-[rgb(var(--zc-danger-rgb)/0.45)] bg-[rgb(var(--zc-danger-rgb)/0.10)] text-[rgb(var(--zc-danger))]";
}

async function fetchBranches(): Promise<BranchLite[]> {
  // Resilient: prefer governance endpoint, but fall back to core branches (older stacks)
  try {
    const b = await apiFetch<BranchLite[]>("/api/governance/branches");
    if (Array.isArray(b)) return b;
  } catch {
    // ignore
  }
  try {
    const b = await apiFetch<BranchLite[]>("/api/branches");
    if (Array.isArray(b)) return b;
  } catch {
    // ignore
  }
  return [];
}

export default function SuperAdminPolicyApprovalsPage() {
  const { toast } = useToast();

  const [branches, setBranches] = React.useState<BranchLite[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<ApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [actionRow, setActionRow] = React.useState<ApprovalRow | null>(null);
  const [actionMode, setActionMode] = React.useState<"approve" | "reject" | null>(null);
  const branchSelectValue = branchId || "__ALL__";

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<ApprovalRow[]>(`/api/governance/approvals`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load approvals (is core-api running?)");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      setBranches(await fetchBranches());
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (branchId) {
        const inScope =
          r.applyToAllBranches ||
          (Array.isArray(r.branchIds) && r.branchIds.includes(branchId));
        if (!inScope) return false;
      }

      if (!s) return true;
      const hay = `${r.policyCode} ${r.policyName ?? ""} ${r.scope} ${r.createdByName ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, branchId]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const global = rows.filter((r) => r.scope === "GLOBAL").length;
    const override = rows.filter((r) => r.scope === "BRANCH_OVERRIDE").length;
    return { total, global, override };
  }, [rows]);

  return (
    <AppShell title="Policy Governance">
      <RequirePerm perm="GOV_POLICY_APPROVE">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconShield className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Approvals</div>
              <div className="mt-1 text-sm text-zc-muted">
                Review submitted policy changes (maker-checker). Approve or reject with an audit note.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="px-5">
              <Link href="/policy/policies">
                Policies <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="px-5" onClick={() => void refresh()}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary + filters */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Queue Overview</CardTitle>
            <CardDescription className="text-sm">
              Showing <span className="font-semibold text-zc-text tabular-nums">{filtered.length}</span> of{" "}
              <span className="font-semibold text-zc-text tabular-nums">{stats.total}</span> pending requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
               <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Global</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.global}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Overrides</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.override}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Pending</div>
                <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{stats.total}</div>
              </div>
              
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code, name, maker…" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label className="text-sm text-zc-muted">Branch</Label>
                <Select
                  value={branchSelectValue}
                  onValueChange={(value) => setBranchId(value === "__ALL__" ? "" : value)}
                >
                  <SelectTrigger className="h-10 w-full min-w-[220px] rounded-xl border-zc-border bg-zc-card text-sm">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="__ALL__">All branches</SelectItem>
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
              <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", toneDanger())}>
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Requests</CardTitle>
            <CardDescription className="text-sm">Approve or reject. Rejection requires a reason.</CardDescription>
          </CardHeader>
          <Separator className="bg-zc-border" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Policy</th>
                  <th className="px-4 py-3 text-left font-semibold">Scope</th>
                  <th className="px-4 py-3 text-left font-semibold">Target</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-left font-semibold">Maker</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading approvals…" : "No approval requests."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => {
                  const target =
                    r.applyToAllBranches
                      ? "All branches"
                      : r.scope === "BRANCH_OVERRIDE"
                        ? r.branchName ?? "Branch override"
                        : `${r.branchIds?.length ?? 0} branch(es)`;

                  return (
                    <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <Link
                          href={`/policy/policies/${encodeURIComponent(r.policyId)}`}
                          className="font-semibold text-zc-text hover:underline"
                        >
                          {r.policyName ?? r.policyCode}
                        </Link>
                        <div className="mt-0.5 font-mono text-xs text-zc-muted">{r.policyCode} • v{r.version}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill
                            label={r.scope === "GLOBAL" ? "Global" : "Override"}
                            tone={r.scope === "GLOBAL" ? toneGood() : "border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200"}
                          />
                          <Pill label={r.status} tone={tonePending()} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{target}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.createdByName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="px-4"
                            onClick={() => {
                              setActionRow(r);
                              setActionMode("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            className="px-4"
                            onClick={() => {
                              setActionRow(r);
                              setActionMode("approve");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {actionRow && actionMode ? (
          <ApprovalActionDialog
            mode={actionMode}
            row={actionRow}
            onClose={() => {
              setActionRow(null);
              setActionMode(null);
            }}
            onDone={async () => {
              toast({
                title: actionMode === "approve" ? "Approved" : "Rejected",
                description: "Approval queue updated.",
              });
              setActionRow(null);
              setActionMode(null);
              await refresh();
            }}
          />
        ) : null}
      </div>
          </RequirePerm>
</AppShell>
  );
}

function ApprovalActionDialog({
  mode,
  row,
  onClose,
  onDone,
}: {
  mode: "approve" | "reject";
  row: ApprovalRow;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { toast } = useToast();

  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit() {
    setErr(null);

    if (mode === "reject" && !note.trim()) {
      setErr("Rejection reason is required.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "approve") {
        await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(row.id)}/approve`, {
          method: "POST",
          body: JSON.stringify({ note: note.trim() || null }),
        });
      } else {
        await apiFetch(`/api/governance/policy-versions/${encodeURIComponent(row.id)}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: note.trim() }),
        });
      }

      await onDone();
    } catch (e: any) {
      const msg = e?.message || "Action failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={[
          "sm:max-w-[620px]",
          "border-indigo-200/50 dark:border-indigo-900/40",
          "bg-white/95 dark:bg-zinc-950/95 backdrop-blur",
          "p-0 rounded-2xl overflow-hidden",
        ].join(" ")}
      >
        <div className="px-6 py-5 border-b border-indigo-200/50 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === "approve" ? "Approve request" : "Reject request"}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {row.policyCode} • v{row.version} • {row.scope === "GLOBAL" ? "Global" : "Override"}
          </div>
        </div>

        <div className="px-6 py-5 grid gap-4">
          {err ? (
            <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", toneDanger())}>
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label className="text-sm">
              {mode === "approve" ? "Approval note (optional)" : "Rejection reason"}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "approve" ? "Write a short note for audit trail…" : "Why is this rejected?"}
              className="min-h-[140px]"
            />
            {mode === "reject" ? (
              <div className="text-xs text-zc-muted">Required. This is stored on the version as rejectionReason.</div>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-indigo-200/50 dark:border-indigo-900/40 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end bg-white/80 dark:bg-zinc-950/80">
          <Button variant="outline" onClick={onClose} disabled={busy} className="px-5">
            Cancel
          </Button>
          <Button
            variant={mode === "approve" ? "primary" : "destructive"}
            onClick={() => void submit()}
            disabled={busy}
            className="px-5"
          >
            {busy ? "Saving…" : mode === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
