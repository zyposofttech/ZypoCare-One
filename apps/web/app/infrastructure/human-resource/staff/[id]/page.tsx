"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

// ---------------- Types ----------------

type BranchRow = { id: string; code: string; name: string };

type StaffAssignmentLite = {
  id: string;
  staffId: string;
  branchId: string;
  designation?: string | null;
  branchEmpCode?: string | null;
  assignmentType?: string | null;

  isPrimary: boolean;
  status?: string | null;

  requiresApproval?: boolean;
  approvalStatus?: string | null; // PENDING/APPROVED/REJECTED
  approvalNotes?: string | null;

  effectiveFrom: string;
  effectiveTo?: string | null;
};

type StaffCredentialLite = {
  id: string;
  staffId: string;

  type: string;
  authority?: string | null;
  registrationNumber?: string | null;

  validFrom?: string | null;
  validTo?: string | null;

  status?: string | null; // VALID/EXPIRING_SOON/EXPIRED
  verificationStatus?: string | null;

  isCritical?: boolean;
  documentUrl?: string | null;
};

type StaffDetail = {
  id: string;
  empCode: string;
  name: string;
  designation: string;

  category: string;
  engagementType: string;

  status: string;
  isActive: boolean;

  phone?: string | null;
  email?: string | null;

  hprId?: string | null;
  hprVerified?: boolean | null;

  user?: { id: string; email?: string | null; isActive: boolean } | null;

  assignments: StaffAssignmentLite[];
  credentials?: StaffCredentialLite[];

  personalDetails?: Record<string, any> | null;
  contactDetails?: Record<string, any> | null;
  employmentDetails?: Record<string, any> | null;
  medicalDetails?: Record<string, any> | null;
  systemAccess?: Record<string, any> | null;

  createdAt: string;
  updatedAt: string;
};

// ---------------- UI helpers (same vibe as Branches page) ----------------

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

function statusPill(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "SUSPENDED")
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  if (s === "OFFBOARDED")
    return "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function approvalPill(s?: string | null) {
  const v = String(s || "").toUpperCase();
  if (v === "APPROVED")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (v === "PENDING")
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  if (v === "REJECTED")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function credentialPill(s?: string | null) {
  const v = String(s || "").toUpperCase();
  if (v === "VALID")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (v === "EXPIRING_SOON")
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  if (v === "EXPIRED")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet: "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber: "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  indigo: "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  cyan: "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zc-panel/20", className)} />;
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof pillTones;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTones[tone])}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function InfoTile({
  label,
  value,
  className,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "indigo" | "emerald" | "cyan" | "zinc" | "sky" | "violet" | "amber";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
      : tone === "emerald"
        ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
        : tone === "cyan"
          ? "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/35 dark:bg-cyan-900/15"
          : "border-zc-border bg-zc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
        {icon ? <span className="text-zc-muted">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function fmtDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function pickPrimary(assignments: StaffAssignmentLite[] | undefined) {
  const a = assignments || [];
  return a.find((x) => x.isPrimary) ?? a[0] ?? null;
}

async function apiFetchWithFallback<T>(primary: string, fallback: string, opts?: Parameters<typeof apiFetch<T>>[1]): Promise<T> {
  try {
    return await apiFetch<T>(primary, opts);
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : undefined;
    if (status === 404) return await apiFetch<T>(fallback, opts);
    throw e;
  }
}

// ---------------- Page ----------------

export default function HrStaffProfilePage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "STAFF_READ");
  const canUpdate = hasPerm(user, "STAFF_UPDATE");
  const canAssignCreate = hasPerm(user, "STAFF_ASSIGNMENT_CREATE");
  const canAssignApprove = hasPerm(user, "STAFF_ASSIGNMENT_UPDATE");
  const canCredCreate = hasPerm(user, "STAFF_CREDENTIAL_CREATE");
  const canCredUpdate = hasPerm(user, "STAFF_CREDENTIAL_UPDATE");

  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [staff, setStaff] = React.useState<StaffDetail | null>(null);
  const [branches, setBranches] = React.useState<BranchRow[]>([]);

  const [tab, setTab] = React.useState("overview");

  // Drawer: Edit Staff
  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDesignation, setEditDesignation] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("CLINICAL");
  const [editEngagementType, setEditEngagementType] = React.useState("EMPLOYEE");
  const [editStatus, setEditStatus] = React.useState("ACTIVE");

  // Drawer: Add Assignment
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignBranchId, setAssignBranchId] = React.useState<string>(effectiveBranchId || "");
  const [assignType, setAssignType] = React.useState("SECONDARY");
  const [assignDesignation, setAssignDesignation] = React.useState("");
  const [assignEmpCode, setAssignEmpCode] = React.useState("");
  const [assignNotes, setAssignNotes] = React.useState("");

  // Drawer: Add Credential
  const [credOpen, setCredOpen] = React.useState(false);
  const [credType, setCredType] = React.useState("LICENSE");
  const [credAuthority, setCredAuthority] = React.useState("");
  const [credRegNo, setCredRegNo] = React.useState("");
  const [credValidFrom, setCredValidFrom] = React.useState("");
  const [credValidTo, setCredValidTo] = React.useState("");
  const [credIsCritical, setCredIsCritical] = React.useState<"yes" | "no">("yes");
  const [credDocUrl, setCredDocUrl] = React.useState("");

  // Confirm: deactivate/reactivate
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [toggleAction, setToggleAction] = React.useState<"suspend" | "reactivate">("suspend");

  const branchLabelById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of branches) map[b.id] = `${b.code} · ${b.name}`;
    return map;
  }, [branches]);

  const credentials = staff?.credentials ?? [];
  const primaryAssign = pickPrimary(staff?.assignments);
  const primaryBranchLabel = primaryAssign?.branchId ? branchLabelById[primaryAssign.branchId] : undefined;

  const assignmentCount = staff?.assignments?.length ?? 0;
  const pendingAssignments =
    (staff?.assignments ?? []).filter((a) => a.requiresApproval && String(a.approvalStatus || "").toUpperCase() === "PENDING").length;

  const credentialCount = credentials.length;
  const credentialExpiring = credentials.filter((c) => String(c.status || "").toUpperCase() === "EXPIRING_SOON").length;
  const credentialExpired = credentials.filter((c) => String(c.status || "").toUpperCase() === "EXPIRED").length;

  const linkedUser = !!staff?.user;
  const linkedUserActive = !!staff?.user?.isActive;

  async function loadBranches() {
    try {
      const data = (await apiFetch<BranchRow[]>("/api/branches")) || [];
      setBranches([...data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch {
      // non-blocking
    }
  }

  async function refresh(showToast = false) {
    if (!canRead) return;
    setErr(null);
    setLoading(true);
    try {
      await loadBranches();

      const primaryUrl = `/api/infrastructure/human-resource/staff/${id}`;
      const legacyUrl = `/api/infrastructure/staff/${id}`;

      const row = await apiFetchWithFallback<StaffDetail>(primaryUrl, legacyUrl, { branch: "none" });
      setStaff(row);

      // prime edit fields
      setEditName(row.name || "");
      setEditDesignation(row.designation || "");
      setEditEmail((row.email as any) ?? "");
      setEditPhone((row.phone as any) ?? "");
      setEditCategory(String(row.category || "CLINICAL"));
      setEditEngagementType(String(row.engagementType || "EMPLOYEE"));
      setEditStatus(String(row.status || "ACTIVE"));

      if (showToast) toast({ title: "Staff refreshed", variant: "success" as any });
    } catch (e: any) {
      const msg = e?.message || "Failed to load staff";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdit() {
    if (!staff?.id) return;
    if (!canUpdate) return;

    setBusy(true);
    setErr(null);
    try {
      const payload: any = {
        name: editName.trim() || undefined,
        designation: editDesignation.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        category: editCategory,
        engagementType: editEngagementType,
        status: editStatus,
      };

      const primaryUrl = `/api/infrastructure/human-resource/staff/${staff.id}`;
      const legacyUrl = `/api/infrastructure/staff/${staff.id}`;

      await apiFetchWithFallback(primaryUrl, legacyUrl, { method: "PATCH", body: payload, branch: "none" });
      toast({ title: "Staff updated", variant: "success" as any });
      setEditOpen(false);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActiveConfirm() {
    if (!staff?.id) return;
    if (!canUpdate) return;

    setBusy(true);
    setErr(null);
    try {
      const action = toggleAction; // suspend/reactivate
      const primaryUrl = `/api/infrastructure/human-resource/staff/${staff.id}/${action}`;
      const legacyUrl = `/api/infrastructure/staff/${staff.id}/${action}`;
      await apiFetchWithFallback(primaryUrl, legacyUrl, { method: "PATCH", body: {} as any, branch: "none" });

      toast({
        title: action === "reactivate" ? "Staff reactivated" : "Staff deactivated",
        description: staff.name,
        variant: "success" as any,
      });
      setToggleOpen(false);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  async function approveAssignment(assignmentId: string) {
    setBusy(true);
    try {
      const primary = `/api/infrastructure/human-resource/staff/assignments/${assignmentId}/approve`;
      const legacy = `/api/infrastructure/staff/assignments/${assignmentId}/approve`;
      await apiFetchWithFallback(primary, legacy, { method: "POST", body: {} as any, branch: "none" });
      toast({ title: "Assignment approved", variant: "success" as any });
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approve failed", description: e?.message || "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function rejectAssignment(assignmentId: string, notes: string) {
    setBusy(true);
    try {
      const body = { approvalNotes: notes };
      const primary = `/api/infrastructure/human-resource/staff/assignments/${assignmentId}/reject`;
      const legacy = `/api/infrastructure/staff/assignments/${assignmentId}/reject`;
      await apiFetchWithFallback(primary, legacy, { method: "POST", body: body as any, branch: "none" });
      toast({ title: "Assignment rejected", variant: "success" as any });
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reject failed", description: e?.message || "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function createAssignment() {
    if (!staff?.id) return;
    if (!assignBranchId) {
      toast({ variant: "destructive", title: "Select branch" });
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        branchId: assignBranchId,
        assignmentType: assignType,
        designation: assignDesignation || undefined,
        branchEmpCode: assignEmpCode || undefined,
        approvalNotes: assignNotes || undefined,
      };

      const primary = `/api/infrastructure/human-resource/staff/${staff.id}/assignments`;
      const legacy = `/api/infrastructure/staff/${staff.id}/assignments`;
      await apiFetchWithFallback(primary, legacy, { method: "POST", body: payload, branch: "none" });

      toast({ title: "Assignment added", variant: "success" as any });
      setAssignOpen(false);
      setAssignDesignation("");
      setAssignEmpCode("");
      setAssignNotes("");
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add assignment failed", description: e?.message || "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function addCredential() {
    if (!staff?.id) return;

    setBusy(true);
    try {
      const payload: any = {
        type: credType,
        issuingAuthority: credAuthority || undefined,
        registrationNumber: credRegNo || undefined,
        validFrom: credValidFrom || undefined,
        validTo: credValidTo || undefined,
        isCritical: credIsCritical === "yes",
        documentUrl: credDocUrl || undefined,
      };

      const primary = `/api/infrastructure/human-resource/staff/${staff.id}/credentials`;
      const legacy = `/api/infrastructure/staff/${staff.id}/credentials`;
      await apiFetchWithFallback(primary, legacy, { method: "POST", body: payload, branch: "none" });

      toast({ title: "Credential added", variant: "success" as any });
      setCredOpen(false);
      setCredAuthority("");
      setCredRegNo("");
      setCredValidFrom("");
      setCredValidTo("");
      setCredDocUrl("");
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add credential failed", description: e?.message || "Error" });
    } finally {
      setBusy(false);
    }
  }

  const isInactive = String(staff?.status || "").toUpperCase() !== "ACTIVE" || staff?.isActive === false;
  const staffStatus = String(staff?.status || "-").toUpperCase();
  const categoryLabel = String(staff?.category || "-").replaceAll("_", " ");
  const engagementLabel = String(staff?.engagementType || "-").replaceAll("_", " ");

  return (
    <AppShell title="Infrastructure - Staff">
      <RequirePerm perm="STAFF_READ">
        <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="outline" className="h-10" asChild>
                <Link href="/infrastructure/human-resource/staff">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-zc-border bg-zc-panel/40">
                <User className="h-5 w-5 text-zc-accent" />
              </div>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/infrastructure/human-resource/staff" className="hover:underline">
                    Staff Directory
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Profile</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-9 w-64" /> : staff?.name ?? "Staff"}
                </div>

                {!loading && staff ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                    <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                      {staff.empCode || "-"}
                    </span>
                    <span className="text-zc-muted/60">/</span>
                    <span>{staff.designation || "-"}</span>
                    <span className="text-zc-muted/60">/</span>
                    <span>{primaryBranchLabel || "-"}</span>
                    <span className="text-zc-muted/60">/</span>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", statusPill(staff?.status || ""))}>
                      {staffStatus}
                    </span>
                    <span className="text-zc-muted/60">/</span>
                    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                      {categoryLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                      {engagementLabel}
                    </span>
                    {staff?.hprId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                        <BadgeCheck className="h-3.5 w-3.5 text-zc-accent" />
                        HPR: {staff.hprId}
                      </span>
                    ) : null}
                  </div>
                ) : loading ? (
                  <div className="mt-2 flex gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => void refresh(true)} disabled={loading || !canRead}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>

              <Button
                variant="secondary"
                className="gap-2"
                disabled={!canUpdate || !staff}
                onClick={() => setEditOpen(true)}
                title={!canUpdate ? "No permission" : undefined}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              <Button
                variant={isInactive ? "success" : "secondary"}
                className="gap-2"
                disabled={!canUpdate || !staff || String(staff.status || "").toUpperCase() === "OFFBOARDED"}
                onClick={() => {
                  setToggleAction(isInactive ? "reactivate" : "suspend");
                  setToggleOpen(true);
                }}
                title={
                  !canUpdate
                    ? "No permission"
                    : String(staff?.status || "").toUpperCase() === "OFFBOARDED"
                      ? "Offboarded staff cannot be reactivated here"
                      : undefined
                }
              >
                <Ban className="h-4 w-4" />
                {isInactive ? "Reactivate" : "Deactivate"}
              </Button>
            </div>
          </div>

          {err ? (
            <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}
        </div>

        {/* Snapshot */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Snapshot</CardTitle>
                <CardDescription>Status, identifiers, and access readiness.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MetricPill label="Assignments" value={assignmentCount} tone="sky" />
                <MetricPill label="Credentials" value={credentialCount} tone="violet" />
                <MetricPill label="Pending" value={pendingAssignments} tone="amber" />
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pb-6 pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <InfoTile
                label="Staff ID"
                icon={<User className="h-4 w-4" />}
                tone="zinc"
                value={<span className="font-mono text-xs break-all">{staff?.id ?? "-"}</span>}
              />
              <InfoTile
                label="Emp Code"
                icon={<FileText className="h-4 w-4" />}
                tone="indigo"
                value={<span className="font-mono text-sm font-semibold">{staff?.empCode ?? "-"}</span>}
              />
              <InfoTile
                label="Designation"
                icon={<User className="h-4 w-4" />}
                tone="emerald"
                value={<span className="text-sm font-semibold">{staff?.designation ?? "-"}</span>}
              />
              <InfoTile
                label="Primary Branch"
                icon={<FileText className="h-4 w-4" />}
                tone="cyan"
                value={<span className="text-sm">{primaryBranchLabel ?? "-"}</span>}
              />
              <InfoTile
                label="Status"
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="amber"
                value={
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", statusPill(staff?.status || ""))}>
                    {staffStatus}
                  </span>
                }
              />
              <InfoTile
                label="Category"
                icon={<BadgeCheck className="h-4 w-4" />}
                tone="violet"
                value={<span className="text-sm">{categoryLabel}</span>}
              />
              <InfoTile
                label="Engagement"
                icon={<ShieldCheck className="h-4 w-4" />}
                tone="sky"
                value={<span className="text-sm">{engagementLabel}</span>}
              />
              <InfoTile
                label="Updated At"
                icon={<ClipboardList className="h-4 w-4" />}
                tone="zinc"
                value={<span className="text-sm">{fmtDateTime(staff?.updatedAt)}</span>}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs Card */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Staff Details</CardTitle>
                <CardDescription>Overview, assignments, credentials, access and audit.</CardDescription>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="h-auto w-full flex-wrap rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="assignments"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger
                    value="credentials"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Credentials
                  </TabsTrigger>
                  <TabsTrigger
                    value="access"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    System Access
                  </TabsTrigger>
                  <TabsTrigger
                    value="roles"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Roles
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Audit
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <Separator />

          <CardContent className="pb-6">
            <Tabs value={tab}>

              {/* Overview tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-zc-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Contact</CardTitle>
                      <CardDescription>Email/phone information.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Email</span>
                        <span className="font-semibold text-zc-text">{staff?.email || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Phone</span>
                        <span className="font-semibold text-zc-text">{staff?.phone || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-zc-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Primary Assignment</CardTitle>
                      <CardDescription>Home branch mapping.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Branch</span>
                        <span className="font-semibold text-zc-text">{primaryBranchLabel || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Designation</span>
                        <span className="font-semibold text-zc-text">{primaryAssign?.designation || staff?.designation || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Branch Emp Code</span>
                        <span className="font-semibold text-zc-text">{primaryAssign?.branchEmpCode || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-zc-border lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Onboarding Data (JSON)</CardTitle>
                      <CardDescription>We’ll convert this to step-wise forms in onboarding pages.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-xs">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                        <div className="mb-2 font-semibold text-zc-text">personalDetails</div>
                        <pre className="whitespace-pre-wrap break-words text-[11px] text-zc-muted">{JSON.stringify(staff?.personalDetails ?? null, null, 2)}</pre>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                        <div className="mb-2 font-semibold text-zc-text">employmentDetails</div>
                        <pre className="whitespace-pre-wrap break-words text-[11px] text-zc-muted">{JSON.stringify(staff?.employmentDetails ?? null, null, 2)}</pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Assignments tab */}
              <TabsContent value="assignments" className="mt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <User className="h-4 w-4 text-zc-accent" />
                    Branch Assignments
                  </div>

                  <Button className="gap-2" onClick={() => setAssignOpen(true)} disabled={!canAssignCreate || !staff}>
                    <Plus className="h-4 w-4" />
                    Add Assignment
                  </Button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {!staff?.assignments?.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                            {loading ? "Loading…" : "No assignments found."}
                          </TableCell>
                        </TableRow>
                      ) : null}

                      {(staff?.assignments || []).map((a) => {
                        const approval = a.requiresApproval ? (a.approvalStatus || "PENDING") : "APPROVED";
                        return (
                          <TableRow key={a.id} className="hover:bg-zc-panel/20">
                            <TableCell>
                              <div className="font-semibold text-zc-text">{branchLabelById[a.branchId] || a.branchId}</div>
                              <div className="mt-0.5 text-xs text-zc-muted">
                                {a.isPrimary ? "Primary" : "Secondary"} • {a.designation || "-"}
                              </div>
                            </TableCell>
                            <TableCell>{a.assignmentType || "-"}</TableCell>
                            <TableCell>{a.status || "-"}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", approvalPill(approval))}>
                                {String(approval).toUpperCase()}
                              </span>
                              {a.approvalNotes ? <div className="mt-1 text-xs text-zc-muted line-clamp-2">{a.approvalNotes}</div> : null}
                            </TableCell>
                            <TableCell className="text-right">
                              {a.requiresApproval && String(a.approvalStatus || "").toUpperCase() === "PENDING" ? (
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" className="gap-2" disabled={!canAssignApprove || busy} onClick={() => void approveAssignment(a.id)}>
                                    <Check className="h-4 w-4" />
                                    Approve
                                  </Button>
                                  <RejectBtn disabled={!canAssignApprove || busy} onReject={(notes) => void rejectAssignment(a.id, notes)} />
                                </div>
                              ) : (
                                <span className="text-xs text-zc-muted">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Credentials tab */}
              <TabsContent value="credentials" className="mt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <ShieldCheck className="h-4 w-4 text-zc-accent" />
                    Credentials & Licenses
                  </div>

                  <Button className="gap-2" onClick={() => setCredOpen(true)} disabled={!canCredCreate || !staff}>
                    <Plus className="h-4 w-4" />
                    Add Credential
                  </Button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credential</TableHead>
                        <TableHead>Authority</TableHead>
                        <TableHead>Validity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {!credentials.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                            {loading ? "Loading…" : "No credentials found."}
                          </TableCell>
                        </TableRow>
                      ) : null}

                      {credentials.map((c) => (
                        <TableRow key={c.id} className="hover:bg-zc-panel/20">
                          <TableCell>
                            <div className="font-semibold text-zc-text">{String(c.type || "-").replaceAll("_", " ")}</div>
                            <div className="mt-0.5 text-xs text-zc-muted">{c.registrationNumber || "-"}</div>
                          </TableCell>
                          <TableCell>{c.authority || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {c.validFrom ? String(c.validFrom).slice(0, 10) : "-"} → {c.validTo ? String(c.validTo).slice(0, 10) : "-"}
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", credentialPill(c.status))}>
                              {String(c.status || "-").replaceAll("_", " ")}
                            </span>
                            <div className="mt-1 text-[11px] text-zc-muted">{c.isCritical ? "Critical" : "Non-critical"}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {c.documentUrl ? (
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                  <a href={c.documentUrl} target="_blank" rel="noreferrer">
                                    <FileText className="h-4 w-4" />
                                    Document
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-zc-muted">—</span>
                              )}
                              <Button variant="outline" size="sm" className="gap-2" disabled={!canCredUpdate}>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* System Access */}
              <TabsContent value="access" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-zc-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Linked User</CardTitle>
                      <CardDescription>Staff ↔ User linkage for system access.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Linked</span>
                        <span className="font-semibold text-zc-text">{linkedUser ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">User Email</span>
                        <span className="font-semibold text-zc-text">{staff?.user?.email || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">User Status</span>
                        <span className="font-semibold text-zc-text">{linkedUser ? (linkedUserActive ? "Active" : "Inactive") : "-"}</span>
                      </div>

                      <Separator />

                      <div className="text-sm text-zc-muted">
                        Provisioning + role binding UI will be wired after onboarding steps are implemented.
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-zc-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">ABDM / HPR</CardTitle>
                      <CardDescription>Doctor verification status.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">HPR ID</span>
                        <span className="font-semibold text-zc-text">{staff?.hprId || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Verified</span>
                        <span className="font-semibold text-zc-text">{staff?.hprVerified ? "Yes" : "No"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Roles */}
              <TabsContent value="roles" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Role Bindings</CardTitle>
                    <CardDescription>Per-branch role template bindings (coming next).</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-zc-muted">We’ll wire this after onboarding + access provisioning pages.</CardContent>
                </Card>
              </TabsContent>

              {/* Audit */}
              <TabsContent value="audit" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Audit Trail</CardTitle>
                    <CardDescription>Lifecycle and workflow events (coming next).</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-zc-muted">We’ll wire staff audit events after we finalize onboarding flows.</CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Drawer */}
        <Dialog open={editOpen} onOpenChange={(v) => (!v ? setEditOpen(false) : null)}>
          <DialogContent className={drawerClassName("max-w-2xl")}>
            <DialogHeader>
              <DialogTitle>Edit Staff</DialogTitle>
              <DialogDescription>Update key staff master fields. (No delete; use Deactivate/Reactivate.)</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Designation</Label>
                  <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLINICAL">Clinical</SelectItem>
                      <SelectItem value="NON_CLINICAL">Non-Clinical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Engagement Type</Label>
                  <Select value={editEngagementType} onValueChange={setEditEngagementType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="grid gap-2 md:col-span-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="OFFBOARDED">Offboarded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void saveEdit()} disabled={busy || !canUpdate}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Assignment Drawer */}
        <Dialog open={assignOpen} onOpenChange={(v) => (!v ? setAssignOpen(false) : null)}>
          <DialogContent className={drawerClassName("max-w-2xl")}>
            <DialogHeader>
              <DialogTitle>Add Branch Assignment</DialogTitle>
              <DialogDescription>Secondary branch assignments may require approval.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select value={assignBranchId} onValueChange={setAssignBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Assignment Type</Label>
                <Select value={assignType} onValueChange={setAssignType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">Primary</SelectItem>
                    <SelectItem value="SECONDARY">Secondary</SelectItem>
                    <SelectItem value="VISITING">Visiting</SelectItem>
                    <SelectItem value="ROTATION">Rotation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Designation (optional)</Label>
                <Input value={assignDesignation} onChange={(e) => setAssignDesignation(e.target.value)} placeholder="e.g., Consultant Cardiologist" />
              </div>

              <div className="grid gap-2">
                <Label>Branch Emp Code (optional)</Label>
                <Input value={assignEmpCode} onChange={(e) => setAssignEmpCode(e.target.value)} placeholder="e.g., BR-EMP-1021" />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Assignment remarks…" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void createAssignment()} disabled={busy || !canAssignCreate}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Credential Drawer */}
        <Dialog open={credOpen} onOpenChange={(v) => (!v ? setCredOpen(false) : null)}>
          <DialogContent className={drawerClassName("max-w-2xl")}>
            <DialogHeader>
              <DialogTitle>Add Credential</DialogTitle>
              <DialogDescription>Add license/degree/certification with validity & authority.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={credType} onValueChange={setCredType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LICENSE">License</SelectItem>
                    <SelectItem value="REGISTRATION">Registration</SelectItem>
                    <SelectItem value="DEGREE">Degree</SelectItem>
                    <SelectItem value="CERTIFICATION">Certification</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Critical?</Label>
                <Select value={credIsCritical} onValueChange={(v) => setCredIsCritical(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes (enforce expiry)</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Authority / Issuer</Label>
                <Input value={credAuthority} onChange={(e) => setCredAuthority(e.target.value)} placeholder="e.g., Karnataka Medical Council" />
              </div>

              <div className="grid gap-2">
                <Label>Registration No</Label>
                <Input value={credRegNo} onChange={(e) => setCredRegNo(e.target.value)} placeholder="e.g., KMC-12345" />
              </div>

              <div className="grid gap-2">
                <Label>Valid From</Label>
                <Input type="date" value={credValidFrom} onChange={(e) => setCredValidFrom(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Valid To</Label>
                <Input type="date" value={credValidTo} onChange={(e) => setCredValidTo(e.target.value)} />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label>Document URL (optional)</Label>
                <Input value={credDocUrl} onChange={(e) => setCredDocUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCredOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void addCredential()} disabled={busy || !canCredCreate}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toggle Active Confirm Drawer */}
        <Dialog open={toggleOpen} onOpenChange={(v) => (!v ? setToggleOpen(false) : null)}>
          <DialogContent className={drawerClassName("max-w-2xl")}>
            <DialogHeader>
              <DialogTitle>{toggleAction === "reactivate" ? "Reactivate Staff" : "Deactivate Staff"}</DialogTitle>
              <DialogDescription>
                This is a soft action. No data is deleted. You can reactivate later (except offboarded).
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
              <div className="text-sm font-semibold text-zc-text">
                {staff?.name || "Staff"} <span className="font-mono text-xs text-zc-muted">({staff?.empCode || "-"})</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusPill(staff?.status || ""))}>
                  {String(staff?.status || "-").toUpperCase()}
                </span>
                <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                  Assignments: {assignmentCount}
                </span>
                <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                  Credentials: {credentialCount}
                </span>
              </div>

              <div className="mt-4 text-sm text-zc-muted">
                Tip: Use Deactivate for temporary suspension. Use Offboarding workflow for separation (handled later).
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setToggleOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant={toggleAction === "reactivate" ? "success" : "secondary"} onClick={() => void toggleActiveConfirm()} disabled={busy || !canUpdate}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {toggleAction === "reactivate" ? "Reactivate" : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePerm>
    </AppShell>
  );
}

// ---------------- Inline reject modal (kept consistent) ----------------

function RejectBtn({ disabled, onReject }: { disabled: boolean; onReject: (notes: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2" disabled={disabled} onClick={() => setOpen(true)}>
        <X className="h-4 w-4" />
        Reject
      </Button>

      <DialogContent className={drawerClassName("max-w-xl")}>
        <DialogHeader>
          <DialogTitle>Reject Assignment</DialogTitle>
          <DialogDescription>Provide a clear reason. This will be stored in approval notes.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>Reason</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter rejection notes…" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const v = notes.trim();
              if (!v) return;
              onReject(v);
              setNotes("");
              setOpen(false);
            }}
            disabled={!notes.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
