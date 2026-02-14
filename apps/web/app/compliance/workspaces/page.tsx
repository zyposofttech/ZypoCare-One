"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { RequirePerm } from "@/components/RequirePerm";
import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  Building2,
  Loader2,
  Pencil,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type WorkspaceType = "ORG_TEMPLATE" | "BRANCH";
type WorkspaceStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type WorkspaceRow = {
  id: string;
  name: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  orgId: string;
  branchId: string | null;
  readinessScore?: number | null;
  lastComputedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string } | null;
};

type WorkspaceForm = {
  name: string;
  type: WorkspaceType;
  orgId: string;
  branchId: string;
  status: WorkspaceStatus;
};

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function shortId(value?: string | null) {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

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

function typeBadge(type: WorkspaceType) {
  if (type === "ORG_TEMPLATE") {
    return (
      <span className="inline-flex items-center rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
        TEMPLATE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50/70 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
      BRANCH
    </span>
  );
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function ToggleStatusConfirmDialog({
  open,
  workspace,
  action,
  onClose,
  onChanged,
  canUpdate,
  deniedMessage,
}: {
  open: boolean;
  workspace: WorkspaceRow | null;
  action: "activate" | "archive";
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  canUpdate: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [gaps, setGaps] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setGaps([]);
      setBusy(false);
    }
  }, [open]);

  const nextStatus: WorkspaceStatus = action === "activate" ? "ACTIVE" : "ARCHIVED";
  const title = nextStatus === "ACTIVE" ? "Activate Workspace" : "Archive Workspace";
  const description =
    nextStatus === "ACTIVE"
      ? "This will mark the workspace as active and enforce readiness checks."
      : "This will archive the workspace. It stays available for history but is no longer active.";

  async function onConfirm() {
    if (!canUpdate) return setErr(deniedMessage);
    if (!workspace?.id) return;
    setErr(null);
    setGaps([]);
    setBusy(true);
    try {
      await apiFetch(`/api/compliance/workspaces/${workspace.id}`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      toast({
        title,
        description: `${nextStatus === "ACTIVE" ? "Activated" : "Archived"} "${workspace.name}"`,
        variant: "success",
      });
      await onChanged();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        const data: any = e.data;
        setErr(typeof data?.message === "string" ? data.message : e.message || "Update failed");
        if (Array.isArray(data?.gaps)) setGaps(data.gaps);
      } else {
        setErr(errorMessage(e, "Update failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open || !workspace) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className={drawerClassName("max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">
              <div>{err}</div>
              {gaps.length ? (
                <div className="mt-2 space-y-1 text-xs text-[rgb(var(--zc-danger))]">
                  {gaps.map((gap) => (
                    <div key={gap}>- {gap}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            {workspace.name}{" "}
            <span className="font-mono text-xs text-zc-muted">({workspace.type})</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {typeBadge(workspace.type)}
            {statusBadge(workspace.status)}
          </div>
          <div className="mt-4 text-sm text-zc-muted">
            Keep workspaces in DRAFT until all compliance modules are configured and verified.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={nextStatus === "ACTIVE" ? "success" : "secondary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Updating..." : nextStatus === "ACTIVE" ? "Activate" : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceEditorModal({
  mode,
  open,
  initial,
  defaultBranchId,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: WorkspaceRow | null;
  defaultBranchId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<WorkspaceForm>({
    name: "",
    type: "BRANCH",
    orgId: "",
    branchId: "",
    status: "DRAFT",
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "create") {
      setForm({
        name: "",
        type: "BRANCH",
        orgId: "",
        branchId: defaultBranchId ?? "",
        status: "DRAFT",
      });
      return;
    }

    setForm({
      name: initial?.name ?? "",
      type: initial?.type ?? "BRANCH",
      orgId: initial?.orgId ?? "",
      branchId: initial?.branchId ?? "",
      status: initial?.status ?? "DRAFT",
    });
  }, [open, mode, initial, defaultBranchId]);

  function set<K extends keyof WorkspaceForm>(key: K, value: WorkspaceForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!form.name.trim()) return setErr("Workspace name is required");

    if (mode === "create") {
      if (form.type === "ORG_TEMPLATE" && !form.orgId.trim()) {
        return setErr("Org ID is required for templates");
      }
      if (form.type === "BRANCH" && !form.branchId.trim()) {
        return setErr("Branch ID is required for branch workspaces");
      }
    }

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/compliance/workspaces", {
          method: "POST",
          body: {
            name: form.name.trim(),
            type: form.type,
            ...(form.orgId.trim() ? { orgId: form.orgId.trim() } : {}),
            ...(form.type === "BRANCH" ? { branchId: form.branchId.trim() } : {}),
          },
        });
        toast({ title: "Workspace created", variant: "success" });
      } else {
        if (!initial?.id) throw new Error("Missing workspace id");
        await apiFetch(`/api/compliance/workspaces/${initial.id}`, {
          method: "PATCH",
          body: {
            name: form.name.trim(),
            status: form.status,
          },
        });
        toast({ title: "Workspace updated", variant: "success" });
      }
      onClose();
      await onSaved();
    } catch (e) {
      setErr(errorMessage(e, mode === "create" ? "Failed to create workspace" : "Failed to update workspace"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent className={drawerClassName("max-w-3xl")} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Create Workspace" : "Edit Workspace"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a compliance workspace and configure modules before activation."
              : "Update workspace name or status."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Basics</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Workspace Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Main Hospital Compliance"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((s) => ({
                      ...s,
                      type: v as WorkspaceType,
                      branchId: v === "BRANCH" ? s.branchId : "",
                    }))
                  }
                  disabled={mode === "edit" || busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORG_TEMPLATE">ORG_TEMPLATE</SelectItem>
                    <SelectItem value="BRANCH">BRANCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === "edit" ? (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as WorkspaceStatus)}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Input value="DRAFT (auto)" disabled />
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Ownership</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Org ID</Label>
                <Input
                  value={form.orgId}
                  onChange={(e) => set("orgId", e.target.value)}
                  placeholder="Organization ID"
                  disabled={mode === "edit"}
                />
                <p className="text-[11px] text-zc-muted">
                  Required for templates. Optional for branch workspaces if branch ID is provided.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Branch ID</Label>
                <Input
                  value={form.branchId}
                  onChange={(e) => set("branchId", e.target.value)}
                  placeholder="Branch ID"
                  disabled={mode === "edit" || form.type !== "BRANCH"}
                />
                <p className="text-[11px] text-zc-muted">Required for BRANCH type workspaces.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onSubmit()} disabled={busy || !canSubmit} title={!canSubmit ? deniedMessage : undefined} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create Workspace" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeBranchId } = useBranchContext();

  const canCreate = hasPerm(user, "COMPLIANCE_WORKSPACE_CREATE");
  const canUpdate = hasPerm(user, "COMPLIANCE_WORKSPACE_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<WorkspaceRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [toggleAction, setToggleAction] = React.useState<"activate" | "archive">("archive");
  const [selected, setSelected] = React.useState<WorkspaceRow | null>(null);

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "compliance-workspaces" });

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r) => {
      const hay = `${r.name} ${r.type} ${r.status} ${r.orgId ?? ""} ${r.branch?.name ?? ""} ${r.branch?.code ?? ""} ${r.branchId ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const refresh = React.useCallback(async (showToast = false) => {
    setErr(null);
    setLoading(true);
    try {
      const qs = activeBranchId ? `?branchId=${activeBranchId}` : "";
      const data = await apiFetch<WorkspaceRow[] | { items: WorkspaceRow[] }>(`/api/compliance/workspaces${qs}`);
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      const sorted = [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Workspaces refreshed", description: `Loaded ${sorted.length} workspaces.` });
      }
    } catch (e) {
      const msg = errorMessage(e, "Failed to load workspaces");
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, toast]);

  React.useEffect(() => {
    void refresh(false);
  }, [refresh]);

  React.useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get("create") !== "1") return;
    if (!canCreate) return;
    setCreateOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    const qs = params.toString();
    router.replace(qs ? `/compliance/workspaces?${qs}` : "/compliance/workspaces" as any);
  }, [searchParams, router, canCreate]);

  const totalCount = rows.length;
  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  const inactiveCount = Math.max(0, rows.length - activeCount);
  const templateCount = rows.filter((r) => r.type === "ORG_TEMPLATE").length;
  const branchCount = rows.filter((r) => r.type === "BRANCH").length;

  return (
    <AppShell title="Compliance Workspaces">
      <RequirePerm perm="COMPLIANCE_WORKSPACE_READ">
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconBuilding className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Compliance Workspaces</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage compliance workspaces for ABDM, Government Schemes, NABH and Go-Live readiness.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Workspace
              </Button>
            ) : null}
          </div>
        </div>

        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search workspaces and open details. Use Activate to mark compliance readiness after setup.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Workspaces</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalCount}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive: <span className="font-semibold tabular-nums">{inactiveCount}</span>
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Branch Workspaces</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{branchCount}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Templates</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{templateCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by name, type, status, org or branch..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
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

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workspace Registry</CardTitle>
            <CardDescription className="text-sm">
              Track org templates and branch workspaces across compliance modules.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Workspace</th>
                  <th className="px-4 py-3 text-left font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold">Updated</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading workspaces..." : "No workspaces found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {row.type}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{row.name}</div>
                      {row.orgId ? (
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={row.orgId}>
                          {row.orgId}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      {row.branch ? (
                        <div>
                          <div className="font-semibold text-zc-text">{row.branch.name}</div>
                          <div className="mt-0.5 text-xs text-zc-muted">{row.branch.code}</div>
                        </div>
                      ) : (
                        <span className="text-zc-muted">-</span>
                      )}
                      {row.branchId ? (
                        <div className="mt-1 text-[11px] text-zc-muted font-mono">{shortId(row.branchId)}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{fmtDate(row.updatedAt || row.createdAt)}</td>

                    <td className="px-4 py-3">{statusBadge(row.status)}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/compliance/workspaces/${row.id}`} title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>

                        {canUpdate ? (
                          <>
                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => {
                                setSelected(row);
                                setEditOpen(true);
                              }}
                              title="Edit workspace"
                              aria-label="Edit workspace"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant={row.status === "ACTIVE" ? "secondary" : "warning"}
                              size="icon"
                              onClick={() => {
                                setSelected(row);
                                setToggleAction(row.status === "ACTIVE" ? "archive" : "activate");
                                setToggleOpen(true);
                              }}
                              title={row.status === "ACTIVE" ? "Archive workspace" : "Activate workspace"}
                              aria-label={row.status === "ACTIVE" ? "Archive workspace" : "Activate workspace"}
                            >
                              {row.status === "ACTIVE" ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Recommended setup order</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Create Workspace, 2) Configure ABDM, Schemes and NABH modules, then 3) Activate when ready.
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorkspaceEditorModal
        mode="create"
        open={createOpen}
        initial={null}
        defaultBranchId={activeBranchId}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: COMPLIANCE_WORKSPACE_CREATE"
      />

      <WorkspaceEditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: COMPLIANCE_WORKSPACE_UPDATE"
      />

      <ToggleStatusConfirmDialog
        open={toggleOpen}
        workspace={selected}
        action={toggleAction}
        onClose={() => setToggleOpen(false)}
        onChanged={() => refresh(false)}
        canUpdate={canUpdate}
        deniedMessage="Missing permission: COMPLIANCE_WORKSPACE_UPDATE"
      />
      </RequirePerm>
    </AppShell>
  );
}
