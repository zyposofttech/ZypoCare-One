"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type WorkspaceStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type WorkspaceDetail = {
  id: string;
  name: string;
  type: "ORG_TEMPLATE" | "BRANCH";
  status: WorkspaceStatus;
  orgId: string;
  branchId: string | null;
  readinessScore: number | null;
  lastComputedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    hprLinks?: number;
    empanelments?: number;
    nabhItems?: number;
    evidence?: number;
    approvals?: number;
    abdmFacilities?: number;
    schemeConfigs?: number;
  };
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/* ----------------------------- Page ----------------------------- */

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const id = params.id as string;

  const [ws, setWs] = React.useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Status change busy
  const [statusBusy, setStatusBusy] = React.useState(false);

  /* ---- Fetch ---- */

  const refresh = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<WorkspaceDetail>(
        `/api/compliance/workspaces/${id}`,
      );
      setWs(data);
    } catch (e) {
      const msg = errorMessage(e, "Failed to load workspace");
      setErr(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---- Edit ---- */

  function openEdit() {
    if (!ws) return;
    setEditName(ws.name);
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editName.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/compliance/workspaces/${id}`, {
        method: "PATCH",
        body: { name: editName.trim() },
      });
      toast({ title: "Workspace updated" });
      setEditOpen(false);
      refresh();
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to update workspace"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Status Change ---- */

  async function handleStatusChange(newStatus: WorkspaceStatus) {
    setStatusBusy(true);
    try {
      await apiFetch(`/api/compliance/workspaces/${id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      toast({ title: `Workspace ${newStatus.toLowerCase()}` });
      refresh();
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to change status"), variant: "destructive" });
    } finally {
      setStatusBusy(false);
    }
  }

  /* ---- Status badge ---- */

  function statusBadge(status: WorkspaceStatus) {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            ACTIVE
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
            DRAFT
          </span>
        );
    }
  }

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <AppShell title="Workspace Detail">
        <RequirePerm perm="COMPLIANCE_WORKSPACE_READ">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!ws) {
    return (
      <AppShell title="Workspace Detail">
        <RequirePerm perm="COMPLIANCE_WORKSPACE_READ">
        <div className="grid gap-6">
          {err ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{err}</div>
            </div>
          ) : (
            <div className="py-24 text-center text-sm text-zc-muted">Workspace not found.</div>
          )}
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  const counts = ws._count ?? {};

  const statItems = [
    { label: "HPR Links", value: counts.hprLinks ?? 0, color: "blue" },
    { label: "Empanelments", value: counts.empanelments ?? 0, color: "emerald" },
    { label: "NABH Items", value: counts.nabhItems ?? 0, color: "violet" },
    { label: "Evidence", value: counts.evidence ?? 0, color: "amber" },
    { label: "Approvals", value: counts.approvals ?? 0, color: "rose" },
    { label: "ABDM Facilities", value: counts.abdmFacilities ?? 0, color: "sky" },
    { label: "Scheme Configs", value: counts.schemeConfigs ?? 0, color: "emerald" },
  ] as const;

  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400",
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400",
    violet: "border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-900/10 text-violet-600 dark:text-violet-400",
    amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400",
    rose: "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400",
    sky: "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-900/10 text-sky-600 dark:text-sky-400",
  };

  const valuColorMap: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    violet: "text-violet-700 dark:text-violet-300",
    amber: "text-amber-700 dark:text-amber-300",
    rose: "text-rose-700 dark:text-rose-300",
    sky: "text-sky-700 dark:text-sky-300",
  };

  return (
    <AppShell title={`Workspace: ${ws.name}`}>
      <RequirePerm perm="COMPLIANCE_WORKSPACE_READ">
      <div className="grid gap-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => router.push("/compliance/workspaces")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FolderOpen className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-3xl font-semibold tracking-tight">{ws.name}</div>
                {statusBadge(ws.status)}
              </div>
              <div className="mt-1 text-sm text-zc-muted">{ws.type} workspace</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" className="px-5 gap-2" onClick={openEdit}>
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            {ws.status === "DRAFT" && (
              <Button variant="primary" className="px-5 gap-2" onClick={() => handleStatusChange("ACTIVE")} disabled={statusBusy}>
                {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Activate
              </Button>
            )}
            {ws.status === "ACTIVE" && (
              <Button variant="destructive" className="px-5 gap-2" onClick={() => handleStatusChange("ARCHIVED")} disabled={statusBusy}>
                {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Archive
              </Button>
            )}
            <Button variant="outline" className="px-5 gap-2" asChild>
              <Link href="/compliance/validator">
                <ShieldCheck className="h-4 w-4" />
                Run Validator
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Detail Card ── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workspace Information</CardTitle>
            <CardDescription className="text-sm">Configuration and metadata for this workspace.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <div className="text-xs font-medium text-zc-muted">Name</div>
                <div className="mt-0.5 text-sm font-medium text-zc-text">{ws.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zc-muted">Type</div>
                <div className="mt-0.5">
                  <span className="inline-flex items-center rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                    {ws.type}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-zc-muted">Status</div>
                <div className="mt-0.5">{statusBadge(ws.status)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zc-muted">Branch</div>
                <div className="mt-0.5 text-sm font-mono text-zc-text">
                  {ws.branchId ? ws.branchId.slice(0, 12) + "..." : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-zc-muted">Readiness Score</div>
                <div className="mt-0.5 text-sm font-semibold text-zc-text">
                  {ws.readinessScore != null ? `${ws.readinessScore}%` : "Not computed"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-zc-muted">Last Computed</div>
                <div className="mt-0.5 text-sm text-zc-text">{fmtDateTime(ws.lastComputedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {statItems.map((stat) => (
            <div key={stat.label} className={cn("rounded-xl border p-3", colorMap[stat.color])}>
              <div className="text-xs font-medium">{stat.label}</div>
              <div className={cn("mt-1 text-lg font-bold", valuColorMap[stat.color])}>{stat.value}</div>
            </div>
          ))}
        </div>

        <Separator />

        {/* ── Navigation Links ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/compliance/abdm?workspaceId=${ws.id}`} className="group">
            <Card className="overflow-hidden transition hover:border-blue-300 dark:hover:border-blue-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-900/20">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">ABDM Configuration</CardTitle>
                    <CardDescription>HFR, HPR, ABHA setup</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/compliance/schemes?workspaceId=${ws.id}`} className="group">
            <Card className="overflow-hidden transition hover:border-emerald-300 dark:hover:border-emerald-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Government Schemes</CardTitle>
                    <CardDescription>PMJAY, CGHS, ECHS</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/compliance/nabh?workspaceId=${ws.id}`} className="group">
            <Card className="overflow-hidden transition hover:border-violet-300 dark:hover:border-violet-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-200 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-900/20">
                    <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">NABH Readiness</CardTitle>
                    <CardDescription>6th Edition checklist</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/compliance/evidence?workspaceId=${ws.id}`} className="group">
            <Card className="overflow-hidden transition hover:border-amber-300 dark:hover:border-amber-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Evidence Vault</CardTitle>
                    <CardDescription>Documents &amp; uploads</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* ── Info Callout ── */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="text-sm font-semibold text-zc-text">Workspace Compliance</div>
          <div className="mt-1 text-sm text-zc-muted">
            Navigate to each section above to configure compliance items for this workspace. Run the Validator to compute readiness scores and identify gaps.
          </div>
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>Update workspace details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
