"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Copy,
  FileText,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";

// ---------------- Types ----------------

type BranchRow = { id: string; code: string; name: string };

type StaffCredentialLite = {
  id: string;
  type: string;
  authority?: string | null;
  registrationNumber?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status?: string | null;
  verificationStatus?: string | null;
  isCritical?: boolean;
};

type StaffAssignmentLite = {
  id: string;
  branchId: string;
  facilityId?: string | null;
  departmentId?: string | null;
  specialtyId?: string | null;
  designation?: string | null;
  branchEmpCode?: string | null;
  assignmentType?: string | null;
  status?: string | null;
  isPrimary: boolean;
  requiresApproval?: boolean;
  approvalStatus?: string | null;
  approvalNotes?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

type StaffIdentifierLite = {
  id: string;
  type: string;
  valueLast4?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  createdAt?: string;
};

type StaffDocumentLite = {
  id: string;
  type?: string | null;
  title?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSizeBytes?: number | null;
  verificationStatus?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

type RoleBindingLite = {
  id: string;
  isPrimary?: boolean;
  branch?: { id: string; code: string; name: string } | null;
  roleVersion?: { roleTemplate?: { code?: string; name?: string } | null } | null;
  staffAssignment?: { id: string; isPrimary: boolean; status?: string | null; effectiveFrom: string; effectiveTo?: string | null } | null;
};

type StaffDetail = {
  id: string;
  empCode?: string | null;
  staffNo?: string | null;
  name: string;
  designation?: string | null;
  category?: string | null;
  engagementType?: string | null;
  status?: string | null;
  onboardingStatus?: string | null;
  isActive?: boolean;
  phone?: string | null;
  email?: string | null;
  hprId?: string | null;
  homeBranchId?: string | null;
  notes?: string | null;

  user?: { id: string; email?: string | null; role?: string | null; isActive: boolean; source?: string | null; branchId?: string | null } | null;
  roleBindings?: RoleBindingLite[];

  assignments?: StaffAssignmentLite[];
  credentials?: StaffCredentialLite[];
  identifiers?: StaffIdentifierLite[];
  documents?: StaffDocumentLite[];
  onboardingItems?: any[];
  privilegeGrants?: any[];
  providerProfiles?: any[];
  complianceAssignments?: any[];

  personalDetails?: Record<string, any> | null;
  contactDetails?: Record<string, any> | null;
  employmentDetails?: Record<string, any> | null;
  medicalDetails?: Record<string, any> | null;
  systemAccess?: Record<string, any> | null;

  createdAt?: string;
  updatedAt?: string;
};

// ---------------- UI helpers (same vibe as your sample Branch details page) ----------------

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

function valOrDash(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : "-";
}

function fmtDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function computeAge(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "-";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={onCopy}
      className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-zc-muted hover:bg-zc-panel hover:text-zc-text transition-colors"
      title="Copy"
      type="button"
    >
      {copied ? (
        <span className="text-emerald-600 dark:text-emerald-300">✓</span>
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
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

function pill(cls: string) {
  return cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", cls);
}

function statusPill(status?: string | null) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return pillTones.emerald;
  if (s === "SUSPENDED") return pillTones.amber;
  if (s === "OFFBOARDED") return pillTones.zinc;
  return pillTones.zinc;
}

function onboardingPill(s?: string | null) {
  const v = String(s || "").toUpperCase();
  if (v === "ACTIVE") return pillTones.emerald;
  if (v === "IN_REVIEW") return pillTones.amber;
  if (v === "DRAFT") return pillTones.zinc;
  return pillTones.zinc;
}

function yesNo(v: any) {
  return v === true ? "Yes" : v === false ? "No" : "-";
}

function toStrArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") {
    // allow comma separated
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
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
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [tab, setTab] = React.useState<
    "overview" | "personal" | "employment" | "medical" | "credentials" | "assignments" | "identity" | "access" | "documents" | "audit"
  >("overview");

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState<StaffDetail | null>(null);
  const [branches, setBranches] = React.useState<BranchRow[]>([]);

  const branchLabelById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of branches) map[b.id] = `${b.code} · ${b.name}`;
    return map;
  }, [branches]);

  const pd = (staff?.personalDetails ?? (staff as any)?.personal_details ?? null) as Record<string, any> | null;
  const cd = (staff?.contactDetails ?? (staff as any)?.contact_details ?? null) as Record<string, any> | null;
  const ed = (staff?.employmentDetails ?? (staff as any)?.employment_details ?? null) as Record<string, any> | null;
  const md = (staff?.medicalDetails ?? (staff as any)?.medical_details ?? null) as Record<string, any> | null;
  const sa = (staff?.systemAccess ?? (staff as any)?.system_access ?? null) as Record<string, any> | null;

  const assignments = staff?.assignments ?? [];
  const credentials = staff?.credentials ?? [];
  const identifiers = staff?.identifiers ?? [];
  const documents = staff?.documents ?? [];
  const roleBindings = staff?.roleBindings ?? [];

  const primaryAssign = React.useMemo(() => {
    if (!assignments?.length) return null;
    const p = assignments.find((a) => a.isPrimary);
    return p ?? assignments[0];
  }, [assignments]);

  const primaryBranchLabel = primaryAssign?.branchId ? branchLabelById[primaryAssign.branchId] : undefined;

  async function loadBranches() {
    try {
      const data = (await apiFetch<BranchRow[]>("/api/branches")) || [];
      setBranches([...data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch {
      // non-blocking
    }
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const primaryUrl = `/api/infrastructure/human-resource/staff/${id}`;
      const legacyUrl = `/api/infrastructure/staff/${id}`;
      const data = await apiFetchWithFallback<StaffDetail>(primaryUrl, legacyUrl);
      setStaff(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : e?.message || "Failed to load staff";
      setErr(msg);
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadBranches();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const staffStatus = String(staff?.status || "-").toUpperCase();
  const onboarding = String(staff?.onboardingStatus || "-").toUpperCase();
  const categoryLabel = String(staff?.category || "-").replaceAll("_", " ");
  const engagementLabel = String(staff?.engagementType || "-").replaceAll("_", " ");

  const nameDisplay = loading ? "" : staff?.name || "Staff";
  const codeDisplay = !loading ? valOrDash(staff?.empCode || staff?.staffNo) : "";

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
                    {loading ? <Skeleton className="h-9 w-64" /> : nameDisplay}
                  </div>

                  {!loading && staff ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                      <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                        {codeDisplay}
                      </span>
                      <span className="text-zc-muted/60">|</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {primaryBranchLabel || "No primary branch"}
                      </span>
                      <span className="text-zc-muted/60">|</span>
                      <span className={pill(statusPill(staffStatus))}>{staffStatus}</span>
                      <span className="text-zc-muted/60">|</span>
                      <span className={pill(onboardingPill(onboarding))}>Onboarding: {onboarding}</span>
                    </div>
                  ) : loading ? (
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-10" onClick={() => load()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">
                  <div className="font-semibold">Could not load staff</div>
                  <div className="text-xs opacity-90 break-words">{err}</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Top summary tiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot</CardTitle>
              <CardDescription>Quick view of the key staff attributes.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : staff ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoTile
                    label="Staff ID"
                    icon={<Layers className="h-4 w-4" />}
                    tone="indigo"
                    value={
                      <div className="flex items-center">
                        <span className="font-mono text-xs break-all">{staff.id}</span>
                        <CopyButton text={staff.id} />
                      </div>
                    }
                  />
                  <InfoTile
                    label="Category"
                    icon={<ClipboardList className="h-4 w-4" />}
                    tone="emerald"
                    value={<span className="text-sm font-semibold">{valOrDash(categoryLabel)}</span>}
                  />
                  <InfoTile
                    label="Engagement"
                    icon={<ClipboardList className="h-4 w-4" />}
                    tone="zinc"
                    value={<span className="text-sm font-semibold">{valOrDash(engagementLabel)}</span>}
                  />
                  <InfoTile
                    label="Contact"
                    icon={<ShieldCheck className="h-4 w-4" />}
                    tone="amber"
                    value={
                      <div className="text-sm text-zc-text">
                        <div className="font-semibold">{valOrDash(staff.phone)}</div>
                        <div className="text-xs text-zc-muted mt-1">{valOrDash(staff.email)}</div>
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="text-sm text-zc-muted">No data.</div>
              )}
            </CardContent>
          </Card>

          {/* Tabs container */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Staff Profile</CardTitle>
                  <CardDescription>All onboarding blocks in a clean view (no JSON).</CardDescription>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1 flex flex-wrap">
                    <TabsTrigger value="overview" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="personal" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Personal
                    </TabsTrigger>
                    <TabsTrigger value="employment" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Employment
                    </TabsTrigger>
                    <TabsTrigger value="medical" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Health & Medical
                    </TabsTrigger>
                    <TabsTrigger value="credentials" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Credentials
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Assignments
                    </TabsTrigger>
                    <TabsTrigger value="identity" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Identity
                    </TabsTrigger>
                    <TabsTrigger value="access" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      System Access
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white">
                      Audit
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <Tabs value={tab}>
                {/* Overview */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Core Details</CardTitle>
                        <CardDescription>Master record identity + onboarding status.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Skeleton className="h-14" />
                              <Skeleton className="h-14" />
                            </div>
                            <Skeleton className="h-20" />
                          </div>
                        ) : staff ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">Identity</div>
                            <InfoTile label="Name" value={<span className="text-sm font-semibold">{valOrDash(staff.name)}</span>} />
                            <InfoTile label="Designation" value={<span className="text-sm font-semibold">{valOrDash(staff.designation)}</span>} />

                            <InfoTile
                              label="Employee Code"
                              value={
                                <div className="flex items-center">
                                  <span className="font-mono text-sm font-semibold">{valOrDash(staff.empCode)}</span>
                                  {staff.empCode ? <CopyButton text={String(staff.empCode)} /> : null}
                                </div>
                              }
                              icon={<Layers className="h-4 w-4" />}
                              tone="indigo"
                            />

                            <InfoTile label="Staff No" value={<span className="text-sm font-semibold">{valOrDash(staff.staffNo)}</span>} tone="zinc" />

                            <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">Onboarding</div>
                            <InfoTile label="Status" value={<span className={pill(statusPill(staff.status))}>{valOrDash(staff.status)}</span>} tone="emerald" />
                            <InfoTile
                              label="Onboarding"
                              value={<span className={pill(onboardingPill(staff.onboardingStatus))}>{valOrDash(staff.onboardingStatus)}</span>}
                              tone="amber"
                            />
                            <InfoTile
                              label="Primary Branch"
                              value={<span className="text-sm font-semibold">{valOrDash(primaryBranchLabel)}</span>}
                              icon={<MapPin className="h-4 w-4" />}
                              tone="indigo"
                              className="md:col-span-2"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-zc-muted">No data.</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Contact</CardTitle>
                        <CardDescription>From staff master + contact block.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : staff ? (
                          <div className="grid gap-4">
                            <InfoTile label="Phone" value={<span className="text-sm font-semibold">{valOrDash(staff.phone ?? cd?.mobile_primary)}</span>} />
                            <InfoTile label="Email" value={<span className="text-sm font-semibold">{valOrDash(staff.email ?? cd?.email_official)}</span>} />
                            <InfoTile
                              label="HPR ID"
                              icon={<ShieldCheck className="h-4 w-4" />}
                              tone="indigo"
                              value={<span className="font-mono text-sm font-semibold">{valOrDash(staff.hprId)}</span>}
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-zc-muted">No data.</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Personal */}
                <TabsContent value="personal" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Personal Details</CardTitle>
                        <CardDescription>Name, demographics, and consent.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoTile label="Title" value={<span className="text-sm font-semibold">{valOrDash(pd?.title)}</span>} />
                            <InfoTile label="Display Name" value={<span className="text-sm font-semibold">{valOrDash(pd?.display_name)}</span>} />

                            <InfoTile label="First Name" value={<span className="text-sm font-semibold">{valOrDash(pd?.first_name)}</span>} />
                            <InfoTile label="Middle Name" value={<span className="text-sm font-semibold">{valOrDash(pd?.middle_name)}</span>} />
                            <InfoTile label="Last Name" value={<span className="text-sm font-semibold">{valOrDash(pd?.last_name)}</span>} />
                            <InfoTile
                              label="DOB"
                              value={
                                <div className="text-sm text-zc-text">
                                  <div className="font-semibold">{valOrDash(pd?.date_of_birth)}</div>
                                  <div className="mt-1 text-xs text-zc-muted">Age: {computeAge(pd?.date_of_birth)}</div>
                                </div>
                              }
                              tone="zinc"
                            />

                            <InfoTile label="Gender" value={<span className="text-sm font-semibold">{valOrDash(pd?.gender)}</span>} />
                            <InfoTile label="Blood Group" value={<span className="text-sm font-semibold">{valOrDash(pd?.blood_group)}</span>} />
                            <InfoTile label="Marital Status" value={<span className="text-sm font-semibold">{valOrDash(pd?.marital_status)}</span>} />
                            <InfoTile
                              label="Identity Consent"
                              value={<span className="text-sm font-semibold">{yesNo(pd?.identity_consent_acknowledged)}</span>}
                              tone="amber"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Contact & Address</CardTitle>
                        <CardDescription>Phone, emails, address and emergency contact.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-24" />
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            <InfoTile label="Mobile (Primary)" value={<span className="font-mono text-sm font-semibold">{valOrDash(cd?.mobile_primary)}</span>} />
                            <InfoTile label="Mobile (Secondary)" value={<span className="font-mono text-sm font-semibold">{valOrDash(cd?.mobile_secondary)}</span>} />
                            <InfoTile label="Email (Official)" value={<span className="text-sm font-semibold">{valOrDash(cd?.email_official)}</span>} />
                            <InfoTile label="Email (Personal)" value={<span className="text-sm font-semibold">{valOrDash(cd?.email_personal)}</span>} />

                            <InfoTile
                              label="Current Address"
                              icon={<MapPin className="h-4 w-4" />}
                              tone="indigo"
                              value={<div className="text-sm text-zc-text whitespace-pre-line">{valOrDash(cd?.current_address)}</div>}
                            />

                            <InfoTile
                              label="Permanent Address"
                              icon={<MapPin className="h-4 w-4" />}
                              tone="zinc"
                              value={<div className="text-sm text-zc-text whitespace-pre-line">{valOrDash(cd?.permanent_address)}</div>}
                            />

                            <InfoTile
                              label="Emergency Contact"
                              value={
                                <div className="text-sm text-zc-text">
                                  <div className="font-semibold">{valOrDash(cd?.emergency_contact?.name)}</div>
                                  <div className="text-xs text-zc-muted">Relation: {valOrDash(cd?.emergency_contact?.relation)}</div>
                                  <div className="text-xs text-zc-muted">Phone: {valOrDash(cd?.emergency_contact?.phone)}</div>
                                </div>
                              }
                              tone="amber"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Employment */}
                <TabsContent value="employment" className="mt-0">
                  <div className="grid gap-4">
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle>Employment</CardTitle>
                        <CardDescription>Role, department, engagement and professional profile.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="grid gap-4 md:grid-cols-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-3">
                            <InfoTile label="Staff Category" value={<span className="text-sm font-semibold">{valOrDash(ed?.staff_category)}</span>} tone="emerald" />
                            <InfoTile label="Engagement" value={<span className="text-sm font-semibold">{valOrDash(ed?.engagement_type)}</span>} tone="zinc" />
                            <InfoTile label="Employment Status" value={<span className="text-sm font-semibold">{valOrDash(ed?.employment_status)}</span>} tone="zinc" />
                            <InfoTile label="Date of Joining" value={<span className="text-sm font-semibold">{valOrDash(ed?.date_of_joining)}</span>} tone="indigo" />
                            <InfoTile label="Designation" value={<span className="text-sm font-semibold">{valOrDash(ed?.designation)}</span>} />
                            <InfoTile label="Department" value={<span className="text-sm font-semibold">{valOrDash(ed?.department)}</span>} />
                            <InfoTile label="Reporting Manager" value={<span className="text-sm font-semibold">{valOrDash(ed?.reporting_manager)}</span>} />

                            <InfoTile
                              label="Professional Track"
                              value={<span className="text-sm font-semibold">{valOrDash(ed?.professional_details?.track)}</span>}
                              tone="amber"
                            />

                            <InfoTile
                              label="Primary Specialty"
                              value={<span className="text-sm font-semibold">{valOrDash(ed?.professional_details?.primary_specialty)}</span>}
                              tone="zinc"
                            />

                            <InfoTile
                              label="Secondary Specialties"
                              value={
                                <div className="flex flex-wrap gap-2">
                                  {toStrArray(ed?.professional_details?.secondary_specialties).length ? (
                                    toStrArray(ed?.professional_details?.secondary_specialties).map((s) => (
                                      <Badge key={s} variant="secondary" className="rounded-full">
                                        {s}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-zc-muted">-</span>
                                  )}
                                </div>
                              }
                              tone="zinc"
                              className="md:col-span-3"
                            />

                            <InfoTile
                              label="Experience"
                              value={<span className="text-sm font-semibold">{valOrDash(ed?.professional_details?.years_experience)}</span>}
                              tone="zinc"
                            />
                            <InfoTile
                              label="Qualifications"
                              value={<span className="text-sm font-semibold">{valOrDash(ed?.professional_details?.qualifications)}</span>}
                              tone="zinc"
                            />

                            <InfoTile
                              label="Languages"
                              value={
                                <div className="flex flex-wrap gap-2">
                                  {toStrArray(ed?.professional_details?.languages).length ? (
                                    toStrArray(ed?.professional_details?.languages).map((s) => (
                                      <Badge key={s} variant="secondary" className="rounded-full">
                                        {s}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-zc-muted">-</span>
                                  )}
                                </div>
                              }
                              tone="zinc"
                              className="md:col-span-3"
                            />

                            <InfoTile
                              label="Profile Summary"
                              value={<div className="text-sm text-zc-text whitespace-pre-line">{valOrDash(ed?.professional_details?.profile_summary)}</div>}
                              className="md:col-span-3"
                              tone="indigo"
                            />

                            <InfoTile
                              label="Notes"
                              value={<div className="text-sm text-zc-text whitespace-pre-line">{valOrDash(ed?.notes)}</div>}
                              className="md:col-span-3"
                              tone="zinc"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Medical */}
                <TabsContent value="medical" className="mt-0">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Health & Medical</CardTitle>
                      <CardDescription>Clinical licensing, privileges, and health info (if applicable).</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <Skeleton className="h-14" />
                          <Skeleton className="h-14" />
                          <Skeleton className="h-14" />
                        </div>
                      ) : !md || Object.keys(md || {}).length === 0 ? (
                        <div className="text-sm text-zc-muted">No medical/health block saved for this staff.</div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                          <InfoTile label="License No." value={<span className="font-mono text-sm font-semibold">{valOrDash(md?.license_number)}</span>} tone="emerald" />
                          <InfoTile label="Issuing Council" value={<span className="text-sm font-semibold">{valOrDash(md?.issuing_council)}</span>} tone="zinc" />
                          <InfoTile label="Specialization" value={<span className="text-sm font-semibold">{valOrDash(md?.specialization)}</span>} tone="indigo" />
                          <InfoTile label="Qualification" value={<span className="text-sm font-semibold">{valOrDash(md?.qualification)}</span>} tone="zinc" />
                          <InfoTile
                            label="Clinical Privileges"
                            value={
                              <div className="flex flex-wrap gap-2">
                                {toStrArray(md?.clinical_privileges).length ? (
                                  toStrArray(md?.clinical_privileges).map((s) => (
                                    <Badge key={s} variant="secondary" className="rounded-full">
                                      {s}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-zc-muted">-</span>
                                )}
                              </div>
                            }
                            className="md:col-span-3"
                            tone="amber"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Credentials */}
                <TabsContent value="credentials" className="mt-0">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Credentials</CardTitle>
                      <CardDescription>Registrations and licenses attached to staff.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <Skeleton className="h-40" />
                      ) : !credentials.length ? (
                        <div className="text-sm text-zc-muted">No credentials.</div>
                      ) : (
                        <div className="rounded-xl border border-zc-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-zc-panel/30">
                                <TableHead>Type</TableHead>
                                <TableHead>Authority</TableHead>
                                <TableHead>Reg. No</TableHead>
                                <TableHead>Valid From</TableHead>
                                <TableHead>Valid To</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {credentials.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell className="font-semibold">{valOrDash(c.type)}</TableCell>
                                  <TableCell>{valOrDash(c.authority)}</TableCell>
                                  <TableCell className="font-mono">{valOrDash(c.registrationNumber)}</TableCell>
                                  <TableCell>{fmtDate(c.validFrom)}</TableCell>
                                  <TableCell>{fmtDate(c.validTo)}</TableCell>
                                  <TableCell>
                                    <span className={pill(pillTones.zinc)}>{valOrDash(c.status)}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Assignments */}
                <TabsContent value="assignments" className="mt-0">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Assignments</CardTitle>
                      <CardDescription>Branch and department postings for this staff.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <Skeleton className="h-40" />
                      ) : !assignments.length ? (
                        <div className="text-sm text-zc-muted">No assignments.</div>
                      ) : (
                        <div className="rounded-xl border border-zc-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-zc-panel/30">
                                <TableHead>Branch</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Emp Code</TableHead>
                                <TableHead>Primary</TableHead>
                                <TableHead>Effective</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignments.map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell className="font-semibold">{valOrDash(branchLabelById[a.branchId] || a.branchId)}</TableCell>
                                  <TableCell>{valOrDash(a.assignmentType)}</TableCell>
                                  <TableCell>{valOrDash(a.designation)}</TableCell>
                                  <TableCell className="font-mono">{valOrDash(a.branchEmpCode)}</TableCell>
                                  <TableCell>{a.isPrimary ? <span className={pill(pillTones.emerald)}>Yes</span> : <span className={pill(pillTones.zinc)}>No</span>}</TableCell>
                                  <TableCell>
                                    <div className="text-xs text-zc-muted">
                                      <div>
                                        <span className="text-zc-text">From:</span> {fmtDate(a.effectiveFrom)}
                                      </div>
                                      <div>
                                        <span className="text-zc-text">To:</span> {fmtDate(a.effectiveTo)}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{valOrDash(a.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Identity */}
                <TabsContent value="identity" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Identifiers (DPDP-safe)</CardTitle>
                        <CardDescription>Only type + last4 are stored. Raw values are never stored.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <Skeleton className="h-40" />
                        ) : !identifiers.length ? (
                          <div className="text-sm text-zc-muted">No identifiers.</div>
                        ) : (
                          <div className="rounded-xl border border-zc-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-zc-panel/30">
                                  <TableHead>Type</TableHead>
                                  <TableHead>Last 4</TableHead>
                                  <TableHead>Issued By</TableHead>
                                  <TableHead>Issued At</TableHead>
                                  <TableHead>Added</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {identifiers.map((i) => (
                                  <TableRow key={i.id}>
                                    <TableCell className="font-semibold">{valOrDash(i.type)}</TableCell>
                                    <TableCell className="font-mono">{i.valueLast4 ? `••••${i.valueLast4}` : "-"}</TableCell>
                                    <TableCell>{valOrDash(i.issuedBy)}</TableCell>
                                    <TableCell>{fmtDate(i.issuedAt || null)}</TableCell>
                                    <TableCell className="text-xs text-zc-muted">{fmtDateTime(i.createdAt || null)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Consent Flags</CardTitle>
                        <CardDescription>From onboarding personal/identity step.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            <InfoTile label="Identity Consent" value={<span className="text-sm font-semibold">{yesNo(pd?.identity_consent_acknowledged)}</span>} tone="amber" />
                            <InfoTile label="USG Authorized" value={<span className="text-sm font-semibold">{yesNo((staff as any)?.usgAuthorized ?? md?.usg_authorized)}</span>} tone="indigo" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* System Access */}
                <TabsContent value="access" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-1 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Linked User</CardTitle>
                        <CardDescription>Staff ↔ IAM linkage for system access.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            <InfoTile label="Linked" value={<span className="text-sm font-semibold">{staff?.user ? "Yes" : "No"}</span>} tone={staff?.user ? "emerald" : "zinc"} />
                            <InfoTile label="User Email" value={<span className="text-sm font-semibold">{valOrDash(staff?.user?.email)}</span>} />
                            <InfoTile label="User Active" value={<span className="text-sm font-semibold">{staff?.user ? yesNo(staff.user.isActive) : "-"}</span>} tone={staff?.user?.isActive ? "emerald" : "amber"} />
                            <InfoTile label="Login Enabled" value={<span className="text-sm font-semibold">{yesNo(sa?.is_login_enabled)}</span>} />
                            <InfoTile label="Role ID" value={<span className="font-mono text-sm font-semibold">{valOrDash(sa?.role_id)}</span>} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Role Bindings</CardTitle>
                        <CardDescription>Branch-scoped RBAC bindings for the linked user.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <Skeleton className="h-40" />
                        ) : !roleBindings.length ? (
                          <div className="text-sm text-zc-muted">No role bindings.</div>
                        ) : (
                          <div className="rounded-xl border border-zc-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-zc-panel/30">
                                  <TableHead>Branch</TableHead>
                                  <TableHead>Role Template</TableHead>
                                  <TableHead>Primary</TableHead>
                                  <TableHead>Assignment</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {roleBindings.map((rb) => (
                                  <TableRow key={rb.id}>
                                    <TableCell className="font-semibold">
                                      {rb.branch ? `${rb.branch.code} · ${rb.branch.name}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                      {valOrDash(rb.roleVersion?.roleTemplate?.code || rb.roleVersion?.roleTemplate?.name)}
                                    </TableCell>
                                    <TableCell>{rb.isPrimary ? <span className={pill(pillTones.emerald)}>Yes</span> : <span className={pill(pillTones.zinc)}>No</span>}</TableCell>
                                    <TableCell className="text-xs text-zc-muted">
                                      {rb.staffAssignment ? (
                                        <div>
                                          <div>
                                            <span className="text-zc-text">From:</span> {fmtDate(rb.staffAssignment.effectiveFrom)}
                                          </div>
                                          <div>
                                            <span className="text-zc-text">To:</span> {fmtDate(rb.staffAssignment.effectiveTo || null)}
                                          </div>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Documents */}
                <TabsContent value="documents" className="mt-0">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Documents</CardTitle>
                      <CardDescription>Profile photo, signatures, and credential evidence.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <Skeleton className="h-40" />
                      ) : !documents.length ? (
                        <div className="text-sm text-zc-muted">No documents.</div>
                      ) : (
                        <div className="rounded-xl border border-zc-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-zc-panel/30">
                                <TableHead>Type</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Verification</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {documents.map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell className="font-semibold">{valOrDash(d.type)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-zc-muted" />
                                      <div className="min-w-0">
                                        <div className="truncate">{valOrDash(d.title || d.fileName)}</div>
                                        {d.fileUrl ? (
                                          <a className="text-xs text-indigo-600 hover:underline" href={d.fileUrl} target="_blank" rel="noreferrer">
                                            Open
                                          </a>
                                        ) : null}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{valOrDash(d.verificationStatus)}</TableCell>
                                  <TableCell>{d.isActive === false ? <span className={pill(pillTones.zinc)}>No</span> : <span className={pill(pillTones.emerald)}>Yes</span>}</TableCell>
                                  <TableCell className="text-xs text-zc-muted">{fmtDateTime(d.createdAt || null)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Audit */}
                <TabsContent value="audit" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-1 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Audit Meta</CardTitle>
                        <CardDescription>Timestamps and quick facts.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            <InfoTile label="Created" value={<span className="text-sm font-semibold">{fmtDateTime(staff?.createdAt || null)}</span>} />
                            <InfoTile label="Updated" value={<span className="text-sm font-semibold">{fmtDateTime(staff?.updatedAt || null)}</span>} />
                            <InfoTile label="Legacy Notes JSON" value={<span className="text-sm font-semibold">{yesNo((staff as any)?.legacyStructuredInNotes)}</span>} tone="zinc" />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 overflow-hidden">
                      <CardHeader>
                        <CardTitle>Onboarding Items</CardTitle>
                        <CardDescription>Audit trail of onboarding checklist items.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {loading ? (
                          <Skeleton className="h-40" />
                        ) : !(staff?.onboardingItems?.length) ? (
                          <div className="text-sm text-zc-muted">No onboarding items recorded.</div>
                        ) : (
                          <div className="rounded-xl border border-zc-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-zc-panel/30">
                                  <TableHead>Code</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Notes</TableHead>
                                  <TableHead>At</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(staff.onboardingItems || []).map((x: any, idx: number) => (
                                  <TableRow key={x?.id ?? idx}>
                                    <TableCell className="font-mono">{valOrDash(x?.code)}</TableCell>
                                    <TableCell>{valOrDash(x?.status)}</TableCell>
                                    <TableCell className="text-xs text-zc-muted">{valOrDash(x?.notes)}</TableCell>
                                    <TableCell className="text-xs text-zc-muted">{fmtDateTime(x?.createdAt || x?.updatedAt || null)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
