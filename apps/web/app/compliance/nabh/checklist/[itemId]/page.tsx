"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type ItemStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "VERIFIED"
  | "NON_COMPLIANT";

type RiskLevel = "CRITICAL" | "MAJOR" | "MINOR";

type NabhItemDetail = {
  id: string;
  workspaceId: string;
  chapter: string;
  standardCode: string;
  meCode: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  riskLevel: RiskLevel;
  evidenceRequired: boolean;
  ownerStaffId: string | null;
  owner?: { id: string; name: string } | null;
  dueDate: string | null;
  notes: string | null;
  verifiedAt: string | null;
  verifiedByStaffId: string | null;
  verifiedBy?: { id: string; name: string } | null;
  workspace?: { id: string; name: string; branchId: string } | null;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

function statusLabel(status: ItemStatus): string {
  return status.replace(/_/g, " ");
}

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNextStatuses(current: ItemStatus): ItemStatus[] {
  switch (current) {
    case "NOT_STARTED":
      return ["IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["IMPLEMENTED", "NON_COMPLIANT"];
    case "IMPLEMENTED":
      return ["IN_PROGRESS"]; // Verify via separate button
    case "VERIFIED":
      return ["IN_PROGRESS"];
    case "NON_COMPLIANT":
      return ["IN_PROGRESS"];
    default:
      return [];
  }
}

function statusIcon(status: ItemStatus) {
  switch (status) {
    case "VERIFIED":
      return <ShieldCheck className="h-4 w-4 text-green-600" />;
    case "IMPLEMENTED":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "NON_COMPLIANT":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, string> = {
    VERIFIED:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
    IMPLEMENTED:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    NOT_STARTED:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    NON_COMPLIANT:
      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[status],
      )}
    >
      {statusIcon(status)}
      {statusLabel(status)}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    CRITICAL:
      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300",
    MAJOR:
      "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300",
    MINOR:
      "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-800/50 dark:bg-sky-900/30 dark:text-sky-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[level],
      )}
    >
      {level}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function NabhItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const itemId = params.itemId as string;

  const [item, setItem] = React.useState<NabhItemDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  // Notes
  const [notes, setNotes] = React.useState("");
  const [notesDirty, setNotesDirty] = React.useState(false);

  /* ---- Fetch ---- */

  const fetchItem = React.useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const data = await apiFetch<NabhItemDetail>(
        `/api/compliance/nabh/items/${itemId}`,
      );
      setItem(data);
      setNotes(data.notes ?? "");
      setNotesDirty(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load item details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  React.useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  /* ---- Status Update ---- */

  async function updateStatus(newStatus: ItemStatus) {
    if (!item) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/items/${item.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      toast({ title: `Status updated to ${statusLabel(newStatus)}` });
      fetchItem();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Save Notes ---- */

  async function saveNotes() {
    if (!item) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/items/${item.id}`, {
        method: "PATCH",
        body: { notes },
      });
      toast({ title: "Notes saved" });
      setNotesDirty(false);
      fetchItem();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Verify ---- */

  async function handleVerify() {
    if (!item) return;
    setVerifying(true);
    try {
      await apiFetch(`/api/compliance/nabh/items/${item.id}/verify`, {
        method: "POST",
      });
      toast({ title: "Item verified successfully" });
      fetchItem();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to verify item",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="NABH Item Detail">
        <RequirePerm perm="COMPLIANCE_NABH_ITEM_UPDATE">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell title="NABH Item Detail">
        <RequirePerm perm="COMPLIANCE_NABH_ITEM_UPDATE">
          <div className="text-center py-24">
            <p className="text-zc-muted">Item not found.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/compliance/nabh/checklist")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Checklist
            </Button>
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  const nextStatuses = getNextStatuses(item.status);
  const isVerified = !!item.verifiedAt;
  const canVerify = item.status === "IMPLEMENTED" && !isVerified;

  return (
    <AppShell
      title={`NABH - ${item.standardCode}`}
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Checklist", href: "/compliance/nabh/checklist" },
        { label: `${item.standardCode} / ${item.meCode}` },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_ITEM_UPDATE">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/compliance/nabh/checklist")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ClipboardCheck className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">
                  {item.standardCode}
                  <span className="text-lg font-normal text-zc-muted ml-2">{item.meCode}</span>
                </div>
                <div className="mt-1 text-sm text-zc-muted">{item.chapter}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchItem}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
              {canVerify && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                  )}
                  Verify
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 grid gap-6">
              {/* Title & Description */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Standard Details</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <Label className="text-xs text-zc-muted">Title</Label>
                    <p className="text-sm mt-1 font-medium">{item.title}</p>
                  </div>

                  {item.description && (
                    <div>
                      <Label className="text-xs text-zc-muted">Description</Label>
                      <p className="text-sm mt-1">{item.description}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div>
                      <Label className="text-xs text-zc-muted">Evidence Required</Label>
                      <p className="text-sm mt-1">
                        {item.evidenceRequired ? (
                          <span className="text-amber-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-zc-muted">No</span>
                        )}
                      </p>
                    </div>
                    {item.dueDate && (
                      <div>
                        <Label className="text-xs text-zc-muted">Due Date</Label>
                        <p className="text-sm mt-1">{fmtDate(item.dueDate)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status Workflow */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status Workflow</CardTitle>
                  <CardDescription>
                    Transition the item status through the compliance workflow.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-zc-muted">Current:</span>
                    <StatusBadge status={item.status} />
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200/70 bg-green-50/70 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                  </div>

                  {nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-zc-muted self-center">
                        Move to:
                      </span>
                      {nextStatuses.map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus(s)}
                          disabled={saving}
                        >
                          {statusIcon(s)}
                          <span className="ml-1.5">{statusLabel(s)}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Implementation Notes</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5 space-y-3">
                  <Textarea
                    placeholder="Add implementation notes, observations, or action items..."
                    rows={5}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setNotesDirty(true);
                    }}
                  />
                  {notesDirty && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={saveNotes}
                        disabled={saving}
                      >
                        {saving && (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        )}
                        Save Notes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="grid gap-4 content-start">
              <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Details</h3>

                <div>
                  <Label className="text-xs text-zc-muted">Standard Code</Label>
                  <p className="text-sm mt-1 font-mono">{item.standardCode}</p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">ME Code</Label>
                  <p className="text-sm mt-1 font-mono">{item.meCode}</p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Risk Level</Label>
                  <div className="mt-1">
                    <RiskBadge level={item.riskLevel} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Chapter</Label>
                  <p className="text-sm mt-1">{item.chapter}</p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Assigned To</Label>
                  <p className="text-sm mt-1">
                    {item.owner?.name ?? (
                      <span className="text-zc-muted">Unassigned</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Verification Status</Label>
                  <p className="text-sm mt-1">
                    {isVerified ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" />
                        Verified on {fmtDate(item.verifiedAt)}
                        {item.verifiedBy?.name && (
                          <span className="text-zc-muted ml-1">by {item.verifiedBy.name}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-zc-muted">Not verified</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Workspace</Label>
                  <p className="text-sm mt-1">
                    {item.workspace?.name ?? item.workspaceId}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-zc-muted">Last Updated</Label>
                  <p className="text-sm mt-1">{fmtDate(item.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
