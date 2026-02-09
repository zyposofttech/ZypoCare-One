"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { AppLink as Link } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

import { IconChevronRight, IconUsers, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, RefreshCw, UserPlus } from "lucide-react";

// ---------------- Types ----------------

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type StaffAssignmentLite = {
  id: string;
  branchId: string;
  departmentId?: string | null;
  facilityId?: string | null;
  unitId?: string | null;
  specialtyId?: string | null;
  designation?: string | null;
  branchEmpCode?: string | null;
  assignmentType?: string | null;
  status?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isPrimary: boolean;
};

type StaffListItem = {
  id: string;
  empCode: string;
  name: string;
  designation: string;
  category: string;
  engagementType: string;
  status: string;
  phone?: string | null;
  email?: string | null;
  hprId?: string | null;
  homeBranchId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email?: string | null; isActive: boolean; source?: string | null } | null;
  assignments: StaffAssignmentLite[];
};

type StaffListResponse = {
  items: StaffListItem[];
  nextCursor: string | null;
  take: number;
};

// ---------------- UI helpers ----------------

const ALL = "__ALL__";

function statusBadge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") {
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  }
  if (s === "SUSPENDED") {
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  }
  if (s === "OFFBOARDED") {
    return "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200";
  }
  return "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200";
}

function sysAccessBadge(userLinked: boolean, active: boolean) {
  if (!userLinked) {
    return "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200";
  }
  return active
    ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
    : "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
}

function pickPrimary(assignments: StaffAssignmentLite[] | undefined) {
  const a = assignments || [];
  return a.find((x) => x.isPrimary) ?? a[0] ?? null;
}

async function apiFetchWithFallback<T>(
  primary: string,
  fallback: string,
  opts?: Parameters<typeof apiFetch<T>>[1]
): Promise<T> {
  try {
    return await apiFetch<T>(primary, opts);
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : undefined;
    if (status === 404) return await apiFetch<T>(fallback, opts);
    throw e;
  }
}

// ---------------- Page ----------------

export default function HrStaffDirectoryPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const sp = useSearchParams();

  const canRead = hasPerm(user, "STAFF_READ");
  const canCreate = hasPerm(user, "STAFF_CREATE");

  // Branch context (same pattern as other infra pages)
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const qpBranchId = sp.get("branchId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);

  // Filters
  const [q, setQ] = React.useState("");
  const [branchId, setBranchId] = React.useState<string>(ALL);
  const [status, setStatus] = React.useState<string>(ALL);
  const [category, setCategory] = React.useState<string>(ALL);
  const [engagementType, setEngagementType] = React.useState<string>(ALL);

  // List
  const [items, setItems] = React.useState<StaffListItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  const branchLabelById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of branches) map[b.id] = `${b.code} · ${b.name}`;
    return map;
  }, [branches]);

  const filteredCountLabel = React.useMemo(() => {
    return `${items.length}${nextCursor ? "+" : ""}`;
  }, [items.length, nextCursor]);

  React.useEffect(() => {
    // Default branch filter:
    // - Global scope: allow ALL
    // - Branch scope: lock to effective branch
    if (qpBranchId) {
      setBranchId(qpBranchId);
      return;
    }
    if (branchCtx.scope === "BRANCH" && effectiveBranchId) {
      setBranchId(effectiveBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpBranchId, branchCtx.scope, effectiveBranchId]);

  async function loadBranches() {
    try {
      const data = (await apiFetch<BranchRow[]>("/api/branches")) || [];
      const sorted = [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setBranches(sorted);
    } catch {
      // Non-blocking for this page.
    }
  }

  function buildListUrl(cursor?: string | null) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (branchId !== ALL) params.set("branchId", branchId);
    if (status !== ALL) params.set("status", status);
    if (category !== ALL) params.set("category", category);
    if (engagementType !== ALL) params.set("engagementType", engagementType);
    if (cursor) params.set("cursor", cursor);
    params.set("take", "25");
    return `?${params.toString()}`;
  }

  async function refresh(showToast = false) {
    if (!canRead) return;
    setErr(null);
    setLoading(true);
    try {
      await loadBranches();

      // Prefer new HR route; fall back to legacy infra staff route.
      const url = "/api/infrastructure/human-resource/staff" + buildListUrl(null);
      const legacy = "/api/infrastructure/staff" + buildListUrl(null);

      const res = await apiFetchWithFallback<StaffListResponse>(url, legacy, { branch: "none" });
      setItems(res?.items ?? []);
      setNextCursor(res?.nextCursor ?? null);

      if (showToast) {
        toast({ title: "Staff refreshed", description: `Loaded ${(res?.items ?? []).length} staff rows.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load staff";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!canRead) return;
    if (!nextCursor) return;
    setBusy(true);
    try {
      const url = "/api/infrastructure/human-resource/staff" + buildListUrl(nextCursor);
      const legacy = "/api/infrastructure/staff" + buildListUrl(nextCursor);

      const res = await apiFetchWithFallback<StaffListResponse>(url, legacy, { branch: "none" });
      setItems((prev) => [...prev, ...(res?.items ?? [])]);
      setNextCursor(res?.nextCursor ?? null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load more failed", description: e?.message || "Failed" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change (debounced)
  React.useEffect(() => {
    if (!canRead) return;
    const t = setTimeout(() => {
      void refresh(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, branchId, status, category, engagementType]);

  const activeCount = items.filter((r) => String(r.status).toUpperCase() === "ACTIVE").length;
  const inactiveCount = Math.max(0, items.length - activeCount);

  return (
    <AppShell title="Staff Directory">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconUsers className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Staff Directory</div>
              <div className="mt-1 text-sm text-zc-muted">
                Enterprise staff registry (global) with branch-scoped filters, assignments, credentials and system access linkage.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading || !canRead}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button asChild variant="primary" className="px-5 gap-2" disabled={!canCreate}>
              <Link href="/infrastructure/human-resource/staff/onboarding/start">
                <UserPlus className="h-4 w-4" />
                Start Onboarding
              </Link>
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">Search staff and open profiles. Use onboarding wizard for new staff creation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Shown in table</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{filteredCountLabel}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">Count reflects current filters.</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Active</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{activeCount}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Not Active</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{inactiveCount}</div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="relative w-full lg:col-span-1">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by emp code, name, phone, email, HPR…"
                  className="pl-10"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
                <Select value={branchId} onValueChange={setBranchId} disabled={branchCtx.scope === "BRANCH"}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="OFFBOARDED">Offboarded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Categories</SelectItem>
                    <SelectItem value="CLINICAL">Clinical</SelectItem>
                    <SelectItem value="NON_CLINICAL">Non-Clinical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={engagementType} onValueChange={setEngagementType}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Types</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="VISITING">Visiting</SelectItem>
                    <SelectItem value="LOCUM">Locum</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="TRAINEE">Trainee</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
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
            <CardTitle className="text-base">Staff Registry</CardTitle>
            <CardDescription className="text-sm">Open a staff profile to manage assignments, credentials, documents and system access.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Staff</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Primary Assignment</th>
                  <th className="px-4 py-3 text-left font-semibold">System Access</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!items.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading staff…" : canRead ? "No staff found." : "No permission to view staff."}
                    </td>
                  </tr>
                ) : null}

                {items.map((s) => {
                  const primary = pickPrimary(s.assignments);
                  const primaryBranch = primary?.branchId ? branchLabelById[primary.branchId] : undefined;
                  const sysLinked = !!s.user;
                  const sysActive = !!s.user?.isActive;

                  return (
                    <tr key={s.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">{s.empCode}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{s.name}</div>
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={s.designation || ""}>
                          {s.designation || "-"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadge(s.status))}>
                            {String(s.status || "-").toUpperCase()}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-zc-muted">Category</div>
                        <div className="mt-0.5 font-semibold text-zc-text">{String(s.category || "-").replaceAll("_", " ")}</div>
                        <div className="mt-2 text-xs text-zc-muted">Engagement</div>
                        <div className="mt-0.5 font-semibold text-zc-text">{String(s.engagementType || "-").replaceAll("_", " ")}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-zc-muted">Branch</div>
                        <div className="mt-0.5 font-semibold text-zc-text truncate" title={primaryBranch || ""}>
                          {primaryBranch || "-"}
                        </div>
                        {primary?.designation ? (
                          <div className="mt-1 text-xs text-zc-muted truncate" title={primary.designation}>
                            {primary.designation}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", sysAccessBadge(sysLinked, sysActive))}>
                          {sysLinked ? (sysActive ? "Linked" : "Linked (Inactive)") : "Not linked"}
                        </span>
                        {s.user?.email ? <div className="mt-1 text-xs text-zc-muted truncate" title={s.user.email}>{s.user.email}</div> : null}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="success" size="icon">
                            <Link href={`/infrastructure/human-resource/staff/${s.id}` as any} title="View profile" aria-label="View profile">
                              <IconChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {nextCursor ? (
            <div className="flex items-center justify-center border-t border-zc-border p-4">
              <Button variant="outline" className="gap-2" onClick={() => void loadMore()} disabled={busy || loading}>
                <IconPlus className="h-4 w-4" />
                {busy ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
