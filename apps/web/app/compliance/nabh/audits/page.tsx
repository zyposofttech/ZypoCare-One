"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type AuditType = "INTERNAL" | "EXTERNAL" | "PRE_ASSESSMENT" | "FINAL_ASSESSMENT";
type AuditStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

type AuditCycle = {
  id: string;
  name: string;
  type: AuditType;
  status: AuditStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  leadAuditorName: string | null;
  findingsCount: number;
  createdAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function typeLabel(type: AuditType): string {
  return type.replace(/_/g, " ");
}

function TypeBadge({ type }: { type: AuditType }) {
  const map: Record<AuditType, string> = {
    INTERNAL:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    EXTERNAL:
      "border-purple-200/70 bg-purple-50/70 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/30 dark:text-purple-300",
    PRE_ASSESSMENT:
      "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300",
    FINAL_ASSESSMENT:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[type])}>
      {typeLabel(type)}
    </span>
  );
}

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const map: Record<AuditStatus, string> = {
    PLANNED:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
    CLOSED:
      "border-slate-200/70 bg-slate-50/70 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[status])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function AuditCyclesPage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [audits, setAudits] = React.useState<AuditCycle[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchAudits = React.useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    try {
      const data = await apiFetch<AuditCycle[] | { items: AuditCycle[] }>(
        `/api/compliance/nabh/audits?branchId=${activeBranchId}`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setAudits(rows);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load audit cycles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return (
    <AppShell
      title="NABH Audit Cycles"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Audit Cycles</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage internal and external NABH audit cycles.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAudits}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Link href="/compliance/nabh/audits/new">
              <Button size="sm" variant="primary">
                <Plus className="h-4 w-4 mr-1.5" />
                New Audit
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Audit Cycles</CardTitle>
          </CardHeader>
          <Separator />
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center text-zc-muted py-12">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No audit cycles found.</p>
              <p className="text-xs mt-1">
                Create your first audit cycle to begin tracking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Audit Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                    <th className="px-4 py-3 text-left font-semibold">End Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Lead Auditor</th>
                    <th className="px-4 py-3 text-center font-semibold">Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr
                      key={audit.id}
                      className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/compliance/nabh/audits/${audit.id}`)
                      }
                    >
                      <td className="px-4 py-3 font-medium">
                        {audit.name}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={audit.type} />
                      </td>
                      <td className="px-4 py-3">
                        <AuditStatusBadge status={audit.status} />
                      </td>
                      <td className="px-4 py-3">{fmtDate(audit.plannedStartDate)}</td>
                      <td className="px-4 py-3">{fmtDate(audit.plannedEndDate)}</td>
                      <td className="px-4 py-3">
                        {audit.leadAuditorName ?? (
                          <span className="text-zc-muted text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300">
                          {audit.findingsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
