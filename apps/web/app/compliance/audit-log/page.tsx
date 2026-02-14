"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { IconClipboard } from "@/components/icons";
import {
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  ScrollText,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type AuditLogEntry = {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string;
  actorName?: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

type AuditLogResponse = {
  items: AuditLogEntry[];
  nextCursor: string | null;
  take: number;
};

/* ----------------------------- Constants ----------------------------- */

const ENTITY_TYPES = [
  "ALL",
  "WORKSPACE",
  "EVIDENCE",
  "APPROVAL",
  "ABDM_CONFIG",
  "HFR_PROFILE",
  "HPR_LINK",
  "EMPANELMENT",
  "RATE_CARD",
  "MAPPING",
  "NABH_ITEM",
  "AUDIT_CYCLE",
  "FINDING",
  "CAPA",
] as const;

type EntityTypeFilter = (typeof ENTITY_TYPES)[number];

/* ----------------------------- Helpers ----------------------------- */

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function fmtRelativeTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function fmtFullDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(date);
}

function entityTypeBadgeClasses(type: string): string {
  switch (type) {
    case "WORKSPACE":
      return "border-purple-200/70 bg-purple-50/70 text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-400";
    case "EVIDENCE":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400";
    case "APPROVAL":
      return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400";
    case "ABDM_CONFIG":
    case "HFR_PROFILE":
    case "HPR_LINK":
      return "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-900/20 dark:text-cyan-400";
    case "NABH_ITEM":
    case "AUDIT_CYCLE":
    case "FINDING":
    case "CAPA":
      return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400";
    default:
      return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300";
  }
}

/* ----------------------------- JSON Diff Viewer ----------------------------- */

function JsonDiffViewer({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const allKeys = React.useMemo(() => {
    const keys = new Set<string>();
    if (before) Object.keys(before).forEach((k) => keys.add(k));
    if (after) Object.keys(after).forEach((k) => keys.add(k));
    return Array.from(keys).sort();
  }, [before, after]);

  if (!before && !after) {
    return <p className="text-sm text-zc-muted">No change data available.</p>;
  }

  return (
    <div className="max-h-96 space-y-3 overflow-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
            Before
          </h4>
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900 dark:bg-red-950/20">
            {before ? JSON.stringify(before, null, 2) : "null"}
          </pre>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
            After
          </h4>
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-green-200 bg-green-50 p-3 text-xs dark:border-green-900 dark:bg-green-950/20">
            {after ? JSON.stringify(after, null, 2) : "null"}
          </pre>
        </div>
      </div>

      {/* Field-level diff */}
      {allKeys.length > 0 && (before || after) && (
        <div className="overflow-hidden rounded-xl border border-zc-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zc-border bg-zc-panel/20">
                <th className="px-3 py-2 text-left font-semibold text-zc-muted">
                  Field
                </th>
                <th className="px-3 py-2 text-left font-semibold text-red-600">
                  Before
                </th>
                <th className="px-3 py-2 text-left font-semibold text-green-600">
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key) => {
                const bVal = before
                  ? JSON.stringify(before[key] ?? null)
                  : "null";
                const aVal = after
                  ? JSON.stringify(after[key] ?? null)
                  : "null";
                const changed = bVal !== aVal;

                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-t border-zc-border",
                      changed
                        ? "bg-amber-50/50 dark:bg-amber-950/10"
                        : "hover:bg-zc-panel/20",
                    )}
                  >
                    <td className="px-3 py-1.5 font-mono font-medium">
                      {key}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 font-mono",
                        changed ? "text-red-600" : "text-zc-muted",
                      )}
                    >
                      {bVal}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 font-mono",
                        changed ? "text-green-600" : "text-zc-muted",
                      )}
                    >
                      {aVal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function AuditLogPage() {
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  // Data
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] =
    React.useState<EntityTypeFilter>("ALL");
  const [actionFilter, setActionFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Changes dialog
  const [diffOpen, setDiffOpen] = React.useState(false);
  const [diffBefore, setDiffBefore] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [diffAfter, setDiffAfter] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [diffAction, setDiffAction] = React.useState("");

  /* ---- Fetch ---- */

  const fetchLogs = React.useCallback(
    async (cursor?: string | null) => {
      if (!activeBranchId) return;

      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const qs = new URLSearchParams();
        qs.set("branchId", activeBranchId);
        qs.set("take", "50");

        if (cursor) qs.set("cursor", cursor);
        if (entityTypeFilter !== "ALL")
          qs.set("entityType", entityTypeFilter);
        if (actionFilter.trim()) qs.set("action", actionFilter.trim());
        if (dateFrom) qs.set("from", dateFrom);
        if (dateTo) qs.set("to", dateTo);

        const res = await apiFetch<AuditLogResponse>(
          `/api/compliance/audit-logs?${qs.toString()}`,
        );

        if (cursor) {
          setEntries((prev) => [...prev, ...(res.items || [])]);
        } else {
          setEntries(res.items || []);
        }
        setNextCursor(res.nextCursor);
      } catch (e) {
        toast({
          title: "Error loading audit logs",
          description: errorMessage(e, "Failed to load audit log entries"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeBranchId, entityTypeFilter, actionFilter, dateFrom, dateTo],
  );

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ---- Handlers ---- */

  function handleApplyFilters() {
    setEntries([]);
    setNextCursor(null);
    fetchLogs();
  }

  function handleLoadMore() {
    if (nextCursor) fetchLogs(nextCursor);
  }

  function openDiff(entry: AuditLogEntry) {
    setDiffBefore(entry.before);
    setDiffAfter(entry.after);
    setDiffAction(`${entry.action} on ${entry.entityType}`);
    setDiffOpen(true);
  }

  /* ---- Render ---- */

  return (
    <AppShell title="Compliance Audit Log">
      <RequirePerm perm="COMPLIANCE_AUDIT_LOG_READ">
      <div className="grid gap-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconClipboard className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Audit Log
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Immutable compliance audit trail. All changes to compliance data
                are recorded here.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* ---- Filters ---- */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-zc-muted">Entity Type</Label>
              <Select
                value={entityTypeFilter}
                onValueChange={(v) =>
                  setEntityTypeFilter(v as EntityTypeFilter)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "ALL" ? "All Entity Types" : t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zc-muted">Action</Label>
              <Input
                placeholder="Search by action..."
                className="w-48"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zc-muted">From Date</Label>
              <Input
                type="date"
                className="w-40"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zc-muted">To Date</Label>
              <Input
                type="date"
                className="w-40"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <Button size="sm" onClick={handleApplyFilters}>
              <Filter className="mr-1.5 h-4 w-4" />
              Apply
            </Button>
          </div>
        </div>

        {/* ---- Table ---- */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zc-panel/20">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zc-muted">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zc-muted">
                        Entity Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zc-muted">
                        Entity ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zc-muted">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zc-muted">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zc-muted">
                        Changes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-zc-muted"
                        >
                          <ScrollText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                          No audit log entries found.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-t border-zc-border hover:bg-zc-panel/20"
                        >
                          <td className="px-4 py-3">
                            <div
                              className="flex items-center gap-1.5 cursor-help"
                              title={fmtFullDateTime(entry.createdAt)}
                            >
                              <Clock className="h-3.5 w-3.5 shrink-0 text-zc-muted" />
                              <span className="text-sm">
                                {fmtRelativeTime(entry.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                entityTypeBadgeClasses(entry.entityType),
                              )}
                            >
                              {entry.entityType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs">
                              {entry.entityId.length > 12
                                ? entry.entityId.slice(0, 12) + "..."
                                : entry.entityId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium">
                              {entry.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm">
                              {entry.actorName ||
                                entry.actorUserId.slice(0, 8) + "..."}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDiff(entry)}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load More */}
              {nextCursor && (
                <div className="flex justify-center border-t border-zc-border py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="mr-1.5 h-4 w-4" />
                    )}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ---- Changes Diff Dialog ---- */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Details</DialogTitle>
            <DialogDescription>{diffAction}</DialogDescription>
          </DialogHeader>

          <JsonDiffViewer before={diffBefore} after={diffAfter} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
