"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

type BranchPolicyRow = {
  code: string;
  name: string;
  type: string;
  effectiveScope: "GLOBAL" | "BRANCH_OVERRIDE";
  effectiveVersion: number | null;
  effectiveAt: string | null;
  overrideState: "NONE" | "DRAFT" | "PENDING_APPROVAL" | "ACTIVE";
  overrideVersion: number | null;
};

function typeLabel(t: string) {
  switch (t) {
    case "RETENTION":
      return "Retention";
    case "CONSENT_DEFAULTS":
      return "Consent";
    case "AUDIT":
      return "Audit";
    case "EXPORTS":
      return "Exports";
    case "BREAK_GLASS":
      return "Break-glass";
    default:
      return t;
  }
}

function overrideBadge(state: BranchPolicyRow["overrideState"]) {
  if (state === "ACTIVE") return <Badge variant="success">Override active</Badge>;
  if (state === "PENDING_APPROVAL") return <Badge variant="warning">Pending approval</Badge>;
  if (state === "DRAFT") return <Badge variant="info">Draft</Badge>;
  return <Badge variant="neutral">None</Badge>;
}

export default function BranchPolicyOverridesPage() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<BranchPolicyRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchPolicyRow[]>("/api/governance/branch-policies");
      setRows(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load branch policies");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.name + " " + r.code + " " + r.type).toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <AppShell title="Policy Overrides">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Policy Overrides</CardTitle>
              <CardDescription>
                Propose branch-specific overrides (own branch only). Submissions require Super Admin approval.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href="/admin">
                <Button variant="outline">Back</Button>
              </Link>
              <Button variant="outline" onClick={refresh} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {err ? (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          ) : null}

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search policies" />
            <div className="text-xs text-zc-muted md:ml-auto">{filtered.length} shown</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zc-muted">
                <tr className="border-b border-zc-border">
                  <th className="py-2">Policy</th>
                  <th>Type</th>
                  <th>Effective</th>
                  <th>Override</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.code} className="border-b border-zc-border">
                    <td className="py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-zc-muted">{r.code}</div>
                    </td>
                    <td>{typeLabel(r.type)}</td>
                    <td>
                      <div className="flex flex-col">
                        <span>
                          {r.effectiveVersion ? `v${r.effectiveVersion}` : "-"}{" "}
                          <span className="text-xs text-zc-muted">
                            ({r.effectiveScope === "BRANCH_OVERRIDE" ? "Branch override" : "Global"})
                          </span>
                        </span>
                        <span className="text-xs text-zc-muted">
                          {r.effectiveAt ? new Date(r.effectiveAt).toLocaleString() : "-"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {overrideBadge(r.overrideState)}
                        {r.overrideVersion ? <span className="text-xs text-zc-muted">v{r.overrideVersion}</span> : null}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Link href={`/admin/policy/policies/${encodeURIComponent(r.code)}`}>
                        <Button variant="outline">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}

                {!filtered.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zc-muted">
                      No policies found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-zc-muted">
            Note: overrides are restricted to your own branch by the backend; you cannot create/edit another branch’s override.
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
