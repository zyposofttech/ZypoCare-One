"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Unlink,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type Evidence = {
  id: string;
  workspaceId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  title: string;
  description: string | null;
  status: "ACTIVE" | "EXPIRED" | "ARCHIVED";
  expiresAt: string | null;
  uploadedByStaffId: string;
  uploadedByStaff?: { id: string; firstName: string; lastName: string };
  tags: string[];
  links: Array<{
    id: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          ACTIVE
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          EXPIRED
        </span>
      );
    case "ARCHIVED":
      return (
        <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
          ARCHIVED
        </span>
      );
    default:
      return null;
  }
}

/* ----------------------------- Page ----------------------------- */

export default function EvidenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [evidence, setEvidence] = React.useState<Evidence | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editStatus, setEditStatus] = React.useState("");
  const [editExpiresAt, setEditExpiresAt] = React.useState("");
  const [editTags, setEditTags] = React.useState("");

  const evidenceId = params.id as string;

  /* ---- Fetch ---- */

  const load = React.useCallback(async () => {
    if (!activeBranchId || !evidenceId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<Evidence>(
        `/api/compliance/evidence/${evidenceId}?branchId=${activeBranchId}`,
      );
      setEvidence(res);
      setEditTitle(res.title);
      setEditDescription(res.description ?? "");
      setEditStatus(res.status);
      setEditExpiresAt(res.expiresAt ? res.expiresAt.split("T")[0] : "");
      setEditTags((res.tags ?? []).join(", "));
    } catch (e: any) {
      setErr(e.message ?? "Failed to load evidence");
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, evidenceId]);

  React.useEffect(() => {
    load();
  }, [load]);

  /* ---- Save ---- */

  const handleSave = async () => {
    if (!evidence) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/evidence/${evidence.id}`, {
        method: "PATCH",
        body: {
          title: editTitle,
          description: editDescription || null,
          status: editStatus,
          expiresAt: editExpiresAt || null,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      toast({ title: "Saved", description: "Evidence updated." });
      setEditing(false);
      load();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Unlink ---- */

  const handleUnlink = async (linkId: string) => {
    try {
      await apiFetch(`/api/compliance/evidence/${evidenceId}/unlink`, {
        method: "POST",
        body: { linkId },
      });
      toast({ title: "Unlinked", description: "Evidence link removed." });
      load();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <AppShell title="Evidence Detail">
        <RequirePerm perm="COMPLIANCE_EVIDENCE_READ">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  /* ---- Not found / error state ---- */

  if (!evidence) {
    return (
      <AppShell title="Evidence Detail">
        <RequirePerm perm="COMPLIANCE_EVIDENCE_READ">
        <div className="grid gap-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/compliance/evidence")}
              title="Back to Evidence"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-3xl font-semibold tracking-tight">
              Evidence Detail
            </div>
          </div>
          {err ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{err}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
              <p className="py-12 text-center text-sm text-zc-muted">
                Evidence not found.
              </p>
            </div>
          )}
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  /* ---- Main render ---- */

  return (
    <AppShell title="Evidence Detail">
      <RequirePerm perm="COMPLIANCE_EVIDENCE_READ">
      <div className="grid gap-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/compliance/evidence")}
              title="Back to Evidence"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FileText className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-3xl font-semibold tracking-tight">
                  {evidence.title}
                </div>
                {statusBadge(evidence.status)}
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                {evidence.fileName}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ---- Main Content (left 2/3) ---- */}
          <div className="grid gap-6 lg:col-span-2">
            {/* Info / Edit Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Evidence Information
                </CardTitle>
                <CardDescription className="text-sm">
                  Document details and metadata.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {editing ? (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={editStatus}
                          onValueChange={setEditStatus}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Expires At</Label>
                        <Input
                          type="date"
                          value={editExpiresAt}
                          onChange={(e) => setEditExpiresAt(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="nabh, chapter-1, infection-control"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-1 h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {evidence.description && (
                      <div className="text-sm text-zc-muted">
                        {evidence.description}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-zc-muted">
                          MIME Type
                        </div>
                        <div className="mt-0.5 text-sm">
                          {evidence.mimeType}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zc-muted">
                          Size
                        </div>
                        <div className="mt-0.5 text-sm">
                          {formatBytes(evidence.fileSizeBytes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zc-muted">
                          Uploaded by
                        </div>
                        <div className="mt-0.5 text-sm">
                          {evidence.uploadedByStaff
                            ? `${evidence.uploadedByStaff.firstName} ${evidence.uploadedByStaff.lastName}`
                            : evidence.uploadedByStaffId}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-zc-muted">
                          <Calendar className="h-3 w-3" /> Uploaded
                        </div>
                        <div className="mt-0.5 text-sm">
                          {fmtDate(evidence.createdAt)}
                        </div>
                      </div>
                      {evidence.expiresAt && (
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Calendar className="h-3 w-3" /> Expires
                          </div>
                          <div className="mt-0.5 text-sm">
                            {fmtDate(evidence.expiresAt)}
                          </div>
                        </div>
                      )}
                    </div>
                    {evidence.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {evidence.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---- Linked Entities ---- */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" /> Linked Entities
                </CardTitle>
                <CardDescription className="text-sm">
                  Entities this evidence is linked to.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {!evidence.links?.length ? (
                  <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
                    <p className="py-4 text-center text-sm text-zc-muted">
                      No linked entities yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {evidence.links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between rounded-xl border border-zc-border p-3 hover:bg-zc-panel/20"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                            {link.targetType}
                          </span>
                          <span className="font-mono text-xs">
                            {link.targetId.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-zc-muted">
                            {fmtDate(link.createdAt)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(link.id)}
                          title="Unlink"
                        >
                          <Unlink className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---- Sidebar (right 1/3) ---- */}
          <div className="grid content-start gap-6">
            {/* File Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">File Preview</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="flex flex-col items-center gap-4 pt-4">
                {evidence.mimeType.startsWith("image/") ? (
                  <img
                    src={`/api/compliance/evidence/${evidence.id}/file`}
                    alt={evidence.title}
                    className="max-w-full rounded-xl border border-zc-border"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <FileText className="h-12 w-12 text-zc-muted" />
                    <p className="text-sm text-zc-muted">
                      Preview not available
                    </p>
                  </div>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/api/compliance/evidence/${evidence.id}/file`}
                    download={evidence.fileName}
                  >
                    <Download className="mr-1 h-4 w-4" /> Download
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="grid gap-3 pt-4 text-sm">
                <div>
                  <div className="text-xs font-medium text-zc-muted">ID</div>
                  <div className="mt-0.5 font-mono text-xs">{evidence.id}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zc-muted">
                    Workspace
                  </div>
                  <div className="mt-0.5 font-mono text-xs">
                    {evidence.workspaceId.slice(0, 8)}...
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zc-muted">
                    Last Updated
                  </div>
                  <div className="mt-0.5 text-sm">
                    {fmtDateTime(evidence.updatedAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
