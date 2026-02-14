"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import { IconChevronRight, IconSearch } from "@/components/icons";
import {
  AlertTriangle,
  FileText,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type EvidenceStatus = "ACTIVE" | "ARCHIVED";

type EvidenceRow = {
  id: string;
  workspaceId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  expiresAt: string | null;
  status: EvidenceStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    links?: number;
  };
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function fmtFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
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

/* ----------------------------- Page ----------------------------- */

export default function EvidenceVaultPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const urlWorkspaceId = searchParams.get("workspaceId") ?? "";

  const [workspaceId, setWorkspaceId] = React.useState(urlWorkspaceId);
  const [rows, setRows] = React.useState<EvidenceRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [expiringSoonOnly, setExpiringSoonOnly] = React.useState(false);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [fTitle, setFTitle] = React.useState("");
  const [fTags, setFTags] = React.useState("");
  const [fExpiresAt, setFExpiresAt] = React.useState("");
  const [fFile, setFFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* ---- Auto-resolve workspace from branch ---- */

  React.useEffect(() => {
    if (workspaceId || !activeBranchId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<any[] | { items: any[] }>(
          `/api/compliance/workspaces?branchId=${activeBranchId}`,
        );
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        if (!cancelled && items[0]?.id) setWorkspaceId(items[0].id);
      } catch {
        // workspace resolution failed; user can enter manually
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBranchId, workspaceId]);

  /* ---- Derived ---- */

  const filteredRows = React.useMemo(() => {
    let result = rows;

    if (expiringSoonOnly) {
      result = result.filter((r) => isExpiringSoon(r.expiresAt));
    }

    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(lower) ||
          r.fileName.toLowerCase().includes(lower) ||
          r.tags.some((t) => t.toLowerCase().includes(lower)),
      );
    }

    return result;
  }, [rows, expiringSoonOnly, q]);

  const totalCount = rows.length;
  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  const expiringSoonCount = rows.filter((r) => isExpiringSoon(r.expiresAt)).length;
  const archivedCount = rows.filter((r) => r.status === "ARCHIVED").length;

  /* ---- Fetch ---- */

  const refresh = React.useCallback(
    async (showToast = false) => {
      if (!workspaceId) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams();
        qs.set("workspaceId", workspaceId);
        if (statusFilter !== "ALL") qs.set("status", statusFilter);

        const data = await apiFetch<EvidenceRow[] | { items: EvidenceRow[] }>(
          `/api/compliance/evidence?${qs.toString()}`,
        );
        const nextRows = Array.isArray(data) ? data : (data?.items ?? []);
        setRows(nextRows);

        if (showToast) {
          toast({
            title: "Evidence refreshed",
            description: `Loaded ${nextRows.length} evidence documents.`,
          });
        }
      } catch (e) {
        const msg = errorMessage(e, "Failed to load evidence");
        setErr(msg);
        toast({ title: "Error loading evidence", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, statusFilter, toast],
  );

  React.useEffect(() => {
    if (workspaceId) void refresh();
  }, [refresh, workspaceId]);

  React.useEffect(() => {
    if (urlWorkspaceId && urlWorkspaceId !== workspaceId) {
      setWorkspaceId(urlWorkspaceId);
    }
  }, [urlWorkspaceId, workspaceId]);

  /* ---- Upload ---- */

  function openUpload() {
    setFTitle("");
    setFTags("");
    setFExpiresAt("");
    setFFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadOpen(true);
  }

  async function handleUpload() {
    if (!fFile) {
      toast({ title: "Validation", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    if (!fTitle.trim()) {
      toast({ title: "Validation", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!workspaceId) {
      toast({ title: "Validation", description: "Workspace ID is required", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fFile);
      formData.append("title", fTitle.trim());
      formData.append("workspaceId", workspaceId);

      const tags = fTags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        formData.append("tags", JSON.stringify(tags));
      }
      if (fExpiresAt) {
        formData.append("expiresAt", fExpiresAt);
      }

      await apiFetch("/api/compliance/evidence", {
        method: "POST",
        body: formData,
      });

      toast({ title: "Evidence uploaded successfully" });
      setUploadOpen(false);
      void refresh(false);
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to upload evidence"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  /* ---- Link/Unlink ---- */

  async function handleLink(evidenceId: string) {
    try {
      await apiFetch(`/api/compliance/evidence/${evidenceId}/link`, {
        method: "POST",
        body: { workspaceId },
      });
      toast({ title: "Evidence linked" });
      void refresh(false);
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to link evidence"), variant: "destructive" });
    }
  }

  async function handleUnlink(evidenceId: string) {
    try {
      await apiFetch(`/api/compliance/evidence/${evidenceId}/unlink`, {
        method: "POST",
        body: { workspaceId },
      });
      toast({ title: "Evidence unlinked" });
      void refresh(false);
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to unlink evidence"), variant: "destructive" });
    }
  }

  /* ---- Status badge ---- */

  function statusBadge(status: EvidenceStatus, expiresAt: string | null) {
    if (isExpiringSoon(expiresAt)) {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          EXPIRING
        </span>
      );
    }

    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          ACTIVE
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
        ARCHIVED
      </span>
    );
  }

  /* ---- Render ---- */

  return (
    <AppShell title="Evidence Vault">
      <RequirePerm perm="COMPLIANCE_EVIDENCE_READ">
        <div className="grid gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <FileText className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Evidence Vault</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Upload, organize, and manage compliance evidence documents for active workspace.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CompliancePageHead pageId="compliance-evidence" />
              <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openUpload} disabled={!workspaceId}>
                <Upload className="h-4 w-4" />
                Upload Evidence
              </Button>
            </div>
          </div>

          {/* AI Insights */}
          <CompliancePageInsights pageId="compliance-evidence" />

          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">
                Search and filter evidence documents by status, expiry, and tags.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Evidence</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalCount}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">All documents</div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</div>
                  <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Currently valid</div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                  <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Expiring Soon</div>
                  <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{expiringSoonCount}</div>
                  <div className="mt-1 text-[11px] text-rose-700/80 dark:text-rose-300/80">Within 30 days</div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Archived</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{archivedCount}</div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">No longer active</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="ev-ws" className="text-xs text-zc-muted">Workspace ID</Label>
                  <Input
                    id="ev-ws"
                    placeholder="Enter workspace ID"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zc-muted">Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ALL" | "ACTIVE" | "ARCHIVED")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant={expiringSoonOnly ? "info" : "outline"}
                    className="gap-2 w-full lg:w-auto"
                    onClick={() => setExpiringSoonOnly((v) => !v)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Expiring Soon
                  </Button>
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
                    placeholder="Search title, filename, or tags..."
                    className="pl-10"
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span> of{" "}
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
              <CardTitle className="text-base">Evidence Registry</CardTitle>
              <CardDescription className="text-sm">All evidence files linked to the selected workspace.</CardDescription>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">File</th>
                    <th className="px-4 py-3 text-left font-semibold">Size</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Expires</th>
                    <th className="px-4 py-3 text-left font-semibold">Tags</th>
                    <th className="px-4 py-3 text-center font-semibold">Links</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!workspaceId ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                        Enter a workspace ID to view evidence.
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-zc-muted" />
                      </td>
                    </tr>
                  ) : !filteredRows.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                        No evidence found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zc-text">{row.title}</div>
                          <div className="mt-0.5 text-xs text-zc-muted">Created {fmtDate(row.createdAt)}</div>
                        </td>

                        <td className="px-4 py-3 max-w-[220px] truncate font-mono text-xs text-zc-muted">{row.fileName}</td>
                        <td className="px-4 py-3 text-xs text-zc-muted">{fmtFileSize(row.sizeBytes)}</td>

                        <td className="px-4 py-3">{statusBadge(row.status, row.expiresAt)}</td>

                        <td className="px-4 py-3">
                          <span className={cn("text-sm", isExpiringSoon(row.expiresAt) && "font-medium text-amber-600 dark:text-amber-400")}>
                            {fmtDate(row.expiresAt)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.tags.length > 0 ? (
                              row.tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zc-muted">-</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center text-zc-muted">{row._count?.links ?? 0}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="info"
                              size="icon"
                              className="h-7 w-7"
                              title="Link"
                              onClick={() => handleLink(row.id)}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              title="Unlink"
                              onClick={() => handleUnlink(row.id)}
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                            </Button>

                            <Button asChild variant="success" size="icon" className="h-7 w-7">
                              <Link href={`/compliance/evidence/${row.id}`} title="View Detail">
                                <IconChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Recommended flow</div>
                <div className="mt-1 text-sm text-zc-muted">
                  1) Upload evidence with tags and expiry, then 2) link evidence to relevant items, then 3) monitor expiring documents for timely renewal.
                </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={uploadOpen}
          onOpenChange={(v) => {
            if (!uploading) setUploadOpen(v);
          }}
        >
          <DialogContent className={drawerClassName("max-w-[820px]")} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Upload Evidence
              </DialogTitle>
              <DialogDescription>
                Upload a compliance evidence file and attach metadata for tracking.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            <div className="grid gap-6">
              <div className="grid gap-3">
                <div className="text-sm font-semibold text-zc-text">Document</div>

                <div className="grid gap-2">
                  <Label htmlFor="ev-file">File</Label>
                  <Input
                    id="ev-file"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setFFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ev-title">Title</Label>
                  <Input
                    id="ev-title"
                    placeholder="e.g. Fire Safety Certificate"
                    value={fTitle}
                    onChange={(e) => setFTitle(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="text-sm font-semibold text-zc-text">Metadata</div>

                <div className="grid gap-2">
                  <Label htmlFor="ev-tags">Tags (comma-separated)</Label>
                  <Input
                    id="ev-tags"
                    placeholder="e.g. fire-safety, certificate, nabh"
                    value={fTags}
                    onChange={(e) => setFTags(e.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="ev-expires">Expiry Date</Label>
                  <Input
                    id="ev-expires"
                    type="date"
                    value={fExpiresAt}
                    onChange={(e) => setFExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleUpload()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Evidence
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
