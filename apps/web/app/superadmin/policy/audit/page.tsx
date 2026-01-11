"use client";

import * as React from "react";

import Link from "next/link";

import { AlertTriangle, RefreshCw, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconChevronRight, IconShield } from "@/components/icons";

type BranchLite = { id: string; code: string; name: string; city?: string };

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityId: string | null;
  branchName: string | null;
  actorName: string | null;
  actorEmail: string | null;
  meta: any;
};

function toneDanger() {
  return "border-[rgb(var(--xc-danger-rgb)/0.45)] bg-[rgb(var(--xc-danger-rgb)/0.10)] text-[rgb(var(--xc-danger))]";
}

async function fetchBranches(): Promise<BranchLite[]> {
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

function metaText(meta: any): string {
  try {
    return meta ? JSON.stringify(meta) : "";
  } catch {
    return String(meta ?? "");
  }
}

export default function SuperAdminPolicyAuditPage() {
  const [branches, setBranches] = React.useState<BranchLite[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<AuditRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<AuditRow[]>("/api/governance/audit");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load audit");
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

    return rows.filter((r) => {
      if (branchId) {
        // For audit we only have branchName, not id; best-effort match
        const b = branches.find((x) => x.id === branchId);
        if (b && r.branchName && r.branchName !== b.name) return false;
        if (b && !r.branchName) return false;
      }

      if (!s) return true;

      const hay = [
        r.action,
        r.actorName ?? "",
        r.actorEmail ?? "",
        r.branchName ?? "",
        metaText(r.meta),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [rows, q, branchId, branches]);

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
              <div className="text-3xl font-semibold tracking-tight">Audit</div>
              <div className="mt-1 text-sm text-xc-muted">
                Immutable trace of policy edits, submissions, approvals, and override activity.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="px-5">
              <Link href="/superadmin/policy/policies">
                Policies <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="px-5" onClick={() => void refresh()}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search + filters */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Search & Filter</CardTitle>
            <CardDescription className="text-sm">
              Showing <span className="font-semibold text-xc-text tabular-nums">{filtered.length}</span> of{" "}
              <span className="font-semibold text-xc-text tabular-nums">{rows.length}</span> events.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audit…" className="pl-9" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label className="text-sm text-xc-muted">Branch</Label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-10 rounded-lg border border-xc-border bg-xc-card px-3 text-sm text-xc-text"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
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
            <CardTitle className="text-base">Audit Events</CardTitle>
            <CardDescription className="text-sm">Most recent events first (up to 200).</CardDescription>
          </CardHeader>
          <Separator className="bg-xc-border" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-xc-panel/20 text-xs text-xc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3 text-left font-semibold">Actor</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-xc-muted">
                      {loading ? "Loading audit…" : "No audit events."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => {
                  const who = r.actorName
                    ? `${r.actorName}${r.actorEmail ? ` (${r.actorEmail})` : ""}`
                    : r.actorEmail ?? "—";

                  // Common meta shape: { policyCode, scope, version, ... }
                  const meta = r.meta ?? null;
                  const policyCode = meta?.policyCode || meta?.code || null;
                  const scope = meta?.scope || null;
                  const version = meta?.version ?? null;

                  const details = [
                    policyCode ? `Policy: ${policyCode}` : null,
                    scope ? `Scope: ${scope}` : null,
                    version != null ? `Version: ${version}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <tr key={r.id} className="border-t border-xc-border hover:bg-xc-panel/20">
                      <td className="px-4 py-3 text-xc-muted">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xc-muted">{who}</td>
                      <td className="px-4 py-3 font-semibold text-xc-text">{r.action}</td>
                      <td className="px-4 py-3 text-xc-muted">{r.branchName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {details ? (
                          <div className="text-xs text-xc-muted">{details}</div>
                        ) : (
                          <div className="text-xs text-xc-muted">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
