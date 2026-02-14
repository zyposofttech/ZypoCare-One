"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type DocLink = {
  id: string;
  entityType: string;
  entityId: string;
  isRequired: boolean;
};

type DocRow = {
  id: string;
  branchId: string;
  title: string;
  fileUrl: string;
  fileMime?: string;
  fileSizeBytes?: number;
  checksum?: string;
  docRole: string;
  version: number;
  uploadedAt: string;
  uploadedByUserId?: string;
  verifiedAt?: string;
  verifiedByUserId?: string;
  tags: string[];
  links?: DocLink[];
  createdAt: string;
  updatedAt: string;
};

type DocFormData = {
  title: string;
  fileUrl: string;
  fileMime: string;
  fileSizeBytes: string;
  checksum: string;
  docRole: string;
  tags: string;
};

type LinkFormData = {
  entityType: string;
  entityId: string;
  isRequired: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

const DOC_ROLES = [
  "PREAUTH_FORM",
  "DISCHARGE_SUMMARY",
  "CLAIM_FORM",
  "INVESTIGATION_REPORT",
  "PRESCRIPTION",
  "POLICY_DOCUMENT",
  "ID_PROOF",
  "MEDICAL_CERTIFICATE",
  "BILL_INVOICE",
  "CONSENT_FORM",
  "OTHER",
] as const;

function docRoleBadge(role: string) {
  switch (role) {
    case "PREAUTH_FORM":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pre-Auth Form</Badge>;
    case "DISCHARGE_SUMMARY":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Discharge Summary</Badge>;
    case "CLAIM_FORM":
      return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Claim Form</Badge>;
    case "INVESTIGATION_REPORT":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Investigation</Badge>;
    case "PRESCRIPTION":
      return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">Prescription</Badge>;
    case "POLICY_DOCUMENT":
      return <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">Policy Doc</Badge>;
    case "ID_PROOF":
      return <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">ID Proof</Badge>;
    case "MEDICAL_CERTIFICATE":
      return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Medical Cert</Badge>;
    case "BILL_INVOICE":
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Bill/Invoice</Badge>;
    case "CONSENT_FORM":
      return <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300">Consent Form</Badge>;
    default:
      return <Badge variant="secondary">{role.replace(/_/g, " ")}</Badge>;
  }
}

function fmtDate(v?: string | null) {
  if (!v) return "\u2014";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

function fmtFileSize(bytes?: number | null): string {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[900px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function emptyDocForm(): DocFormData {
  return {
    title: "",
    fileUrl: "",
    fileMime: "",
    fileSizeBytes: "",
    checksum: "",
    docRole: "CLAIM_FORM",
    tags: "",
  };
}

function emptyLinkForm(): LinkFormData {
  return {
    entityType: "INSURANCE_CASE",
    entityId: "",
    isRequired: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function InsuranceDocumentsPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");
  const [rows, setRows] = React.useState<DocRow[]>([]);
  const [q, setQ] = React.useState("");

  // Create/Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = React.useState<DocRow | null>(null);

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<DocRow | null>(null);

  // Link document dialog
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkDoc, setLinkDoc] = React.useState<DocRow | null>(null);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-insurance-documents",
    enabled: !!branchId,
  });

  /* ---- Data loading ---- */

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);
    const stored = effectiveBranchId || null;
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;
    if (next) if (isGlobalScope) setActiveBranchId(next || null);
    setBranchId(next || "");
    return next;
  }

  async function loadDocuments(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        includeRefs: "true",
        includeLinks: "true",
      });
      const res = await apiFetch<any>(`/api/billing/insurance-documents?${qs}`);
      const list: DocRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Documents refreshed" });
    } catch (e: any) {
      const msg = e?.message || "Failed to load insurance documents";
      setErr(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    setErr(null);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }
      await loadDocuments(false, bid);
      if (showToast) toast({ title: "Ready" });
    } catch (e: any) {
      setErr(e?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { void refreshAll(false); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (branchId) void loadDocuments(false); }, [branchId]);
  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadDocuments(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
    setQ("");
    void loadDocuments(false, nextId);
  }

  /* ---- Actions ---- */

  function openCreate() {
    setEditMode("create");
    setEditingRow(null);
    setEditOpen(true);
  }

  function openEdit(row: DocRow) {
    setEditMode("edit");
    setEditingRow(row);
    setEditOpen(true);
  }

  function openDetail(row: DocRow) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  function openLinkDialog(row: DocRow) {
    setLinkDoc(row);
    setLinkOpen(true);
  }

  async function verifyDocument(row: DocRow) {
    if (!row?.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/billing/insurance-documents/${encodeURIComponent(row.id)}/verify`, {
        method: "POST",
      });
      toast({ title: "Verified", description: "Document has been verified." });
      await loadDocuments(false);
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const verified = rows.filter((r) => !!r.verifiedAt).length;
    const pending = total - verified;

    // Role breakdown
    const roleMap = new Map<string, number>();
    rows.forEach((r) => {
      roleMap.set(r.docRole, (roleMap.get(r.docRole) || 0) + 1);
    });
    const roleBreakdown = Array.from(roleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, verified, pending, roleBreakdown };
  }, [rows]);

  /* ---- Render ---- */

  return (
    <AppShell title="Billing - Insurance Documents">
      <RequirePerm perm="BILLING_DOCUMENT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <FileCheck2 className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Insurance Documents</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Upload, verify, and link insurance documents to cases, claims, and policies.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={!branchId || busy || loading}>
                <Plus className="h-4 w-4" />
                New Document
              </Button>
            </div>
          </div>

          {err && (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load documents</CardTitle>
                    <CardDescription className="mt-1">{err}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select value={branchId || ""} onValueChange={onBranchChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    {branches.filter((b) => b.id).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Documents</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.verified}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Pending Verification</div>
                  <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.pending}</div>
                </div>
              </div>

              {/* Role breakdown */}
              {stats.roleBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-zc-muted mr-1 self-center">By Role:</span>
                  {stats.roleBreakdown.map(([role, count]) => (
                    <div key={role} className="flex items-center gap-1">
                      {docRoleBadge(role)}
                      <span className="text-xs font-semibold text-zc-text">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents by title or tag..." className="pl-10" disabled={!branchId} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[130px]">Role</TableHead>
                      <TableHead className="w-[60px]">Version</TableHead>
                      <TableHead className="w-[100px]">Uploaded At</TableHead>
                      <TableHead className="w-[80px]">Verified</TableHead>
                      <TableHead className="w-[60px]">Links</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <FileText className="h-4 w-4" /> No insurance documents found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-zc-panel/20" onClick={() => openDetail(r)}>
                          <TableCell>
                            <div className="font-semibold text-zc-text">{r.title}</div>
                            {r.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {r.tags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                                {r.tags.length > 3 && (
                                  <span className="text-[10px] text-zc-muted">+{r.tags.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{docRoleBadge(r.docRole)}</TableCell>
                          <TableCell className="text-center font-mono text-sm">v{r.version}</TableCell>
                          <TableCell className="text-xs">{fmtDate(r.uploadedAt)}</TableCell>
                          <TableCell className="text-center">
                            {r.verifiedAt ? (
                              <CheckCircle2 className="inline h-4 w-4 text-emerald-500" />
                            ) : (
                              <Badge variant="warning" className="text-[10px]">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono">
                            {r.links?.length ?? 0}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[200px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetail(r)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                {!r.verifiedAt && (
                                  <DropdownMenuItem onClick={() => verifyDocument(r)}>
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Verify
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openLinkDialog(r)}>
                                  <Link2 className="mr-2 h-4 w-4" /> Link to Entity
                                </DropdownMenuItem>
                                {r.fileUrl && (
                                  <DropdownMenuItem onClick={() => window.open(r.fileUrl, "_blank")}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> View File
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-zc-border p-4">
                  <div className="text-sm text-zc-muted">
                    Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <DocumentEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={editMode}
          branchId={branchId}
          editing={editingRow}
          onSaved={async () => {
            toast({ title: "Saved", description: "Document saved successfully." });
            await loadDocuments(false);
          }}
        />

        {/* Detail Viewer */}
        <DocumentDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          doc={detailRow}
        />

        {/* Link Dialog */}
        <LinkDocumentDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          doc={linkDoc}
          onLinked={async () => {
            toast({ title: "Linked", description: "Document linked successfully." });
            await loadDocuments(false);
          }}
        />
      </RequirePerm>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Create/Edit Dialog                               */
/* -------------------------------------------------------------------------- */

function DocumentEditModal({
  open,
  onOpenChange,
  mode,
  branchId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  editing: DocRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<DocFormData>(emptyDocForm());

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        title: editing.title || "",
        fileUrl: editing.fileUrl || "",
        fileMime: editing.fileMime || "",
        fileSizeBytes: editing.fileSizeBytes != null ? String(editing.fileSizeBytes) : "",
        checksum: editing.checksum || "",
        docRole: editing.docRole || "CLAIM_FORM",
        tags: (editing.tags || []).join(", "),
      });
    } else {
      setForm(emptyDocForm());
    }
  }, [open, mode, editing]);

  function patch(p: Partial<DocFormData>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function toNumOrNull(v: string): number | null {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    if (!branchId) return;
    if (!form.title.trim()) {
      toast({ title: "Missing fields", description: "Title is required." });
      return;
    }
    if (!form.fileUrl.trim()) {
      toast({ title: "Missing fields", description: "File URL is required." });
      return;
    }
    if (!form.docRole) {
      toast({ title: "Missing fields", description: "Document Role is required." });
      return;
    }

    const tags = form.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: any = {
      branchId,
      title: form.title.trim(),
      fileUrl: form.fileUrl.trim(),
      fileMime: form.fileMime.trim() || null,
      fileSizeBytes: toNumOrNull(form.fileSizeBytes),
      checksum: form.checksum.trim() || null,
      docRole: form.docRole,
      tags,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/billing/insurance-documents`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiFetch(`/api/billing/insurance-documents/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Insurance Document" : "Edit Insurance Document"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new insurance document with file details and metadata."
              : `Editing document: ${editing?.title || ""}`}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto px-1">
          <div className="grid gap-5">
            {/* Row 1: Title */}
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g., Pre-Auth Form - Patient XYZ" />
            </div>

            {/* Row 2: File URL + Doc Role */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>File URL *</Label>
                <Input value={form.fileUrl} onChange={(e) => patch({ fileUrl: e.target.value })} placeholder="https://storage.example.com/doc.pdf" />
              </div>
              <div className="grid gap-2">
                <Label>Document Role *</Label>
                <Select value={form.docRole} onValueChange={(v) => patch({ docRole: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {DOC_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: MIME + File Size + Checksum */}
            <div className="rounded-xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-900/50 dark:bg-slate-900/10">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">File Metadata</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-xs">MIME Type</Label>
                  <Input value={form.fileMime} onChange={(e) => patch({ fileMime: e.target.value })} placeholder="e.g., application/pdf" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">File Size (bytes)</Label>
                  <Input type="number" min={0} value={form.fileSizeBytes} onChange={(e) => patch({ fileSizeBytes: e.target.value })} placeholder="e.g., 1048576" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Checksum</Label>
                  <Input value={form.checksum} onChange={(e) => patch({ checksum: e.target.value })} placeholder="SHA-256 hash" className="font-mono text-xs" />
                </div>
              </div>
            </div>

            {/* Row 4: Tags */}
            <div className="grid gap-2">
              <Label>Tags</Label>
              <Input value={form.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder="Comma-separated, e.g., urgent, cardiology, follow-up" />
              <span className="text-xs text-zc-muted">Separate tags with commas.</span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create Document" : "Update Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Detail Viewer Dialog                             */
/* -------------------------------------------------------------------------- */

function DocumentDetailDialog({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: DocRow | null;
}) {
  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-zc-accent" />
            Document Details
          </DialogTitle>
          <DialogDescription>
            {doc.title}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto grid gap-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {docRoleBadge(doc.docRole)}
            <Badge variant="secondary">v{doc.version}</Badge>
            {doc.verifiedAt ? (
              <Badge variant="ok">Verified</Badge>
            ) : (
              <Badge variant="warning">Pending Verification</Badge>
            )}
          </div>

          {/* Title + File */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Title</div>
              <div className="font-semibold">{doc.title}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">File URL</div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all">
                {doc.fileUrl}
              </a>
            </div>
          </div>

          {/* File metadata */}
          <div className="rounded-xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-900/50 dark:bg-slate-900/10">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">File Metadata</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-zc-muted">MIME Type</div>
                <div className="font-semibold text-sm">{doc.fileMime || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">File Size</div>
                <div className="font-semibold">{fmtFileSize(doc.fileSizeBytes)}</div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Checksum</div>
                <div className="font-semibold font-mono text-xs break-all">{doc.checksum || "\u2014"}</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div>
              <div className="text-xs text-zc-muted mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-zc-muted">Uploaded At</div>
              <div className="font-semibold">{fmtDate(doc.uploadedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Verified At</div>
              <div className="font-semibold">{doc.verifiedAt ? fmtDate(doc.verifiedAt) : "\u2014"}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Created At</div>
              <div className="font-semibold">{fmtDate(doc.createdAt)}</div>
            </div>
          </div>

          {/* Linked entities */}
          {(doc.links?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-indigo-200/50 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-900/10">
              <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                Linked Entities ({doc.links!.length})
              </div>
              <div className="grid gap-2">
                {doc.links!.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-card p-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-zc-muted" />
                      <span className="text-sm font-medium">{link.entityType.replace(/_/g, " ")}</span>
                      <span className="text-xs text-zc-muted font-mono">{link.entityId.slice(0, 12)}...</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {link.isRequired && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          {doc.fileUrl && (
            <Button variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")} className="gap-2">
              <ExternalLink className="h-4 w-4" /> View File
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Link Document Dialog                              */
/* -------------------------------------------------------------------------- */

function LinkDocumentDialog({
  open,
  onOpenChange,
  doc,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: DocRow | null;
  onLinked: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<LinkFormData>(emptyLinkForm());

  React.useEffect(() => {
    if (open) {
      setForm(emptyLinkForm());
    }
  }, [open]);

  function patch(p: Partial<LinkFormData>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!doc?.id) return;
    if (!form.entityId.trim()) {
      toast({ title: "Missing fields", description: "Entity ID is required." });
      return;
    }

    const payload = {
      entityType: form.entityType,
      entityId: form.entityId.trim(),
      isRequired: form.isRequired,
    };

    setSaving(true);
    try {
      await apiFetch(`/api/billing/insurance-documents/${encodeURIComponent(doc.id)}/links`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onOpenChange(false);
      onLinked();
    } catch (e: any) {
      toast({ title: "Link failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Link Document to Entity
          </DialogTitle>
          <DialogDescription>
            Link &quot;{doc.title}&quot; to an insurance case, pre-auth, claim, or patient policy.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>Entity Type *</Label>
            <Select value={form.entityType} onValueChange={(v) => patch({ entityType: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INSURANCE_CASE">Insurance Case</SelectItem>
                <SelectItem value="PREAUTH">Pre-Authorization</SelectItem>
                <SelectItem value="CLAIM">Claim</SelectItem>
                <SelectItem value="PATIENT_POLICY">Patient Policy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Entity ID *</Label>
            <Input value={form.entityId} onChange={(e) => patch({ entityId: e.target.value })} placeholder="Enter the entity ID to link" />
          </div>

          <div className="grid gap-2">
            <Label>Required</Label>
            <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2 h-10">
              <Switch checked={form.isRequired} onCheckedChange={(v) => patch({ isRequired: v })} />
              <span className="text-sm">{form.isRequired ? "Required document" : "Optional document"}</span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Link Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
