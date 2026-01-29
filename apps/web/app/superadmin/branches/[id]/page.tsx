"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";
import type { AppHref } from "@/lib/linking";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { IconBuilding, IconChevronRight } from "@/components/icons";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Layers,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wand2,
} from "lucide-react";

// ---------------- Types ----------------

type BranchCounts = Record<string, number | undefined>;

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;

  gstNumber?: string | null;

  address?: string | null;
  contactPhone1?: string | null;
  contactPhone2?: string | null;
  contactEmail?: string | null;

  createdAt?: string;
  updatedAt?: string;

  _count?: BranchCounts;

  // fallback if API sends direct counts
  facilitiesCount?: number;
  departmentsCount?: number;
  specialtiesCount?: number;
};

type BranchForm = {
  name: string;
  city: string;
  gstNumber: string;
  address: string;
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
};

// ---------------- Utilities ----------------

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
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

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function valOrDash(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countOf(row: BranchRow | null, kind: "facilities" | "departments" | "specialties") {
  if (!row) return 0;

  // direct counts if API supplies them
  if (kind === "facilities" && row.facilitiesCount != null) return safeNum(row.facilitiesCount);
  if (kind === "departments" && row.departmentsCount != null) return safeNum(row.departmentsCount);
  if (kind === "specialties" && row.specialtiesCount != null) return safeNum(row.specialtiesCount);

  const c = row._count || {};

  // facilities count varies by schema naming
  if (kind === "facilities") {
    return safeNum(
      c.facilities ??
        c.branchFacilities ??
        c.branchFacility ??
        c.facilityLinks ??
        c.facilitySetup ??
        c.facilitySetupLinks,
    );
  }

  if (kind === "departments") return safeNum(c.departments ?? c.department);
  if (kind === "specialties") return safeNum(c.specialties ?? c.specialty);

  return 0;
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

function readinessFlag(ok: boolean, note?: string) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Pending{note ? ` • ${note}` : ""}
    </span>
  );
}

function normalizeGSTIN(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateGSTIN(gstin: string): string | null {
  const v = normalizeGSTIN(gstin);
  if (!v) return "GST Number (GSTIN) is required";
  if (v.length !== 15) return "GSTIN must be exactly 15 characters";
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!re.test(v)) return "Please enter a valid GSTIN (example: 29ABCDE1234F1Z5)";
  return null;
}

// ---------------- Small Components ----------------

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
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
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
  tone?: "indigo" | "emerald" | "cyan" | "zinc";
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

function ModuleCard({
  title,
  description,
  count,
  icon,
  href,
  tone = "zinc",
}: {
  title: string;
  description: string;
  count?: number;
  icon: React.ReactNode;
  href: string;
  tone?: keyof typeof pillTones;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all",
        "hover:bg-zc-panel/35 hover:shadow-elev-2 hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {title}
              </div>
              <div className="mt-1 text-sm text-zc-muted">{description}</div>
            </div>
          </div>

          {typeof count === "number" ? (
            <div className="mt-3">
              <MetricPill label="Records" value={count} tone={tone} />
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
          <IconChevronRight className="h-4 w-4 text-zc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

// ---------------- Modals ----------------

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-200/40 bg-zc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

function EditBranchModal({
  open,
  branch,
  onClose,
  onSaved,
}: {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BranchForm>({
    name: "",
    city: "",
    gstNumber: "",
    address: "",
    contactPhone1: "",
    contactPhone2: "",
    contactEmail: "",
  });

  React.useEffect(() => {
    if (!open || !branch) return;
    setErr(null);
    setBusy(false);
    setForm({
      name: branch.name ?? "",
      city: branch.city ?? "",
      gstNumber: branch.gstNumber ?? "",
      address: branch.address ?? "",
      contactPhone1: branch.contactPhone1 ?? "",
      contactPhone2: branch.contactPhone2 ?? "",
      contactEmail: branch.contactEmail ?? "",
    });
  }, [open, branch]);

  function cleanOptional(s: string) {
    const v = s.trim();
    return v ? v : "";
  }

  async function onSubmit() {
    if (!branch?.id) return;
    setErr(null);

    if (!form.name.trim()) return setErr("Branch name is required");
    if (!form.city.trim()) return setErr("City is required");

    const gstErr = validateGSTIN(form.gstNumber);
    if (gstErr) return setErr(gstErr);

    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          gstNumber: normalizeGSTIN(form.gstNumber),
          address: cleanOptional(form.address),
          contactPhone1: cleanOptional(form.contactPhone1),
          contactPhone2: cleanOptional(form.contactPhone2),
          contactEmail: cleanOptional(form.contactEmail),
        }),
      });

      toast({
        title: "Branch Updated",
        description: `Updated "${form.name.trim()}"`,
      });

      onClose();
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Edit Branch
          </DialogTitle>
          <DialogDescription>Update GSTIN, address & contact details. Branch code is immutable.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch code</div>
              <Input value={branch.code} disabled className="mt-1 font-mono" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">City</div>
              <Input
                value={form.city}
                onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch name</div>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">GST Number (GSTIN)</div>
            <Input
              value={form.gstNumber}
              onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value.toUpperCase() }))}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
              className="mt-1 font-mono"
            />
            <div className="mt-1 text-xs text-zc-muted">Used in Accounting, invoices, statutory reporting.</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Address</div>
            <textarea
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Address line for this campus"
              className={cn(
                "mt-1 min-h-[90px] w-full rounded-lg border border-zc-border bg-transparent px-3 py-2 text-sm text-zc-text outline-none",
                "focus-visible:ring-2 focus-visible:ring-zc-ring",
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Contact phone 1</div>
              <Input
                value={form.contactPhone1}
                onChange={(e) => setForm((s) => ({ ...s, contactPhone1: e.target.value }))}
                placeholder="+91 9XXXXXXXXX"
                className="mt-1"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Contact phone 2</div>
              <Input
                value={form.contactPhone2}
                onChange={(e) => setForm((s) => ({ ...s, contactPhone2: e.target.value }))}
                placeholder="Optional alternate number"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Contact email</div>
            <Input
              value={form.contactEmail}
              onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
              placeholder="branch@zypocare.local"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmModal({
  open,
  branch,
  onClose,
  onDeleted,
}: {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  const deps =
    countOf(branch, "facilities") + countOf(branch, "departments") + countOf(branch, "specialties");

  async function onConfirm() {
    if (!branch?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, { method: "DELETE" });

      toast({
        title: "Branch Deleted",
        description: `Deleted "${branch.name}"`,
      });

      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <ModalShell
      title="Delete Branch"
      description="Deletion is allowed only when there is no Facilities/Departments/Specialties setup for this branch."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {branch.name} <span className="text-zc-muted">({branch.code})</span>
        </div>
        <div className="mt-2 text-sm text-zc-muted">City: {branch.city}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MetricPill label="Facilities" value={countOf(branch, "facilities")} tone="sky" />
          <MetricPill label="Departments" value={countOf(branch, "departments")} tone="emerald" />
          <MetricPill label="Specialties" value={countOf(branch, "specialties")} tone="violet" />
        </div>

        {deps > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
            <div className="min-w-0">
              This branch already has setup data. Delete is blocked. Use governance/retirement instead.
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy || deps > 0}>
          {deps > 0 ? "Cannot Delete (Has Setup)" : busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

// ---------------- Page ----------------

export default function BranchDetailPage() {
  const { toast } = useToast();

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    (user as any)?.roleCode === "SUPER_ADMIN" ||
    (Array.isArray((user as any)?.roles) && (user as any).roles.includes("SUPER_ADMIN"));

  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [row, setRow] = React.useState<BranchRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "setup">("overview");

  const facilitySetupHref = `/superadmin/branches/${encodeURIComponent(id)}/facility-setup`;
  const policyOverridesHref = `/admin/policy-overrides?branchId=${encodeURIComponent(id)}`;
  const policiesHref = `/superadmin/policy/policies`;
  const approvalsHref = `/superadmin/policy/approvals`;
  const auditHref = `/superadmin/policy/audit`;

  async function refresh(showToast = false) {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(id)}`);
      setRow(data);

      if (showToast) {
        toast({
          title: "Branch refreshed",
          description: "Loaded latest branch details.",
          duration: 1800,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load branch";
      setErr(msg);
      setRow(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const facilities = countOf(row, "facilities");
  const departments = countOf(row, "departments");
  const specialties = countOf(row, "specialties");

  const readyFacilities = facilities > 0;
  const readyDepartments = departments > 0;
  const readySpecialties = specialties > 0;

  // We can’t know mapping completeness from branch counts alone; this is a safe minimum signal.
  const readyMapping = readyDepartments && readySpecialties;

  return (
    <AppShell title="Branch Dashboard">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-10" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/superadmin/branches" className="hover:underline">
                    Branches
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Details</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-9 w-64" /> : row?.name}
                </div>

                {!loading && row ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                    <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                      {row.code}
                    </span>
                    <span className="text-zc-muted/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {row.city}
                    </span>
                    <span className="text-zc-muted/60">•</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                        readyFacilities || readyDepartments || readySpecialties ? pillTones.emerald : pillTones.zinc,
                      )}
                    >
                      {readyFacilities || readyDepartments || readySpecialties ? "Configured" : "New"}
                    </span>
                  </div>
                ) : loading ? (
                  <div className="mt-2 flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ) : null}
              </div>
            </div>

            {/* {!loading && row ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <MetricPill label="Facilities" value={facilities} tone="sky" />
                <MetricPill label="Departments" value={departments} tone="emerald" />
                <MetricPill label="Specialties" value={specialties} tone="violet" />
              </div>
            ) : null} */}

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </Button>

            {isSuperAdmin ? (
              <Button asChild className="gap-2">
                <Link href={facilitySetupHref}>
                  <Wand2 className="h-4 w-4" />
                  Facility Setup
                </Link>
              </Button>
            ) : null}

            {isSuperAdmin && !loading && row ? (
              <>
                <Button variant="secondary" className="gap-2" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" className="gap-2" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Snapshot */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Snapshot</CardTitle>
                <CardDescription>Status, setup counts, and identifiers.</CardDescription>
              </div>
              {!loading && row ? (
                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Facilities" value={facilities} tone="sky" />
                  <MetricPill label="Departments" value={departments} tone="emerald" />
                  <MetricPill label="Specialties" value={specialties} tone="violet" />
                </div>
              ) : (
                <div className="text-sm text-zc-muted">--</div>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pb-6 pt-6">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : row ? (
              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile
                  label="Branch ID"
                  icon={<ClipboardList className="h-4 w-4" />}
                  tone="zinc"
                  value={
                    <div className="flex items-center">
                      <span className="font-mono text-xs break-all">{row.id}</span>
                      <CopyButton text={row.id} />
                    </div>
                  }
                />
                <InfoTile
                  label="Code"
                  icon={<Layers className="h-4 w-4" />}
                  tone="indigo"
                  value={<span className="font-mono text-sm font-semibold">{row.code}</span>}
                />
                <InfoTile
                  label="GSTIN"
                  icon={<Building2 className="h-4 w-4" />}
                  tone="emerald"
                  value={
                    <div className="flex items-center">
                      <span className="font-mono text-sm font-semibold">{valOrDash(row.gstNumber)}</span>
                      {row.gstNumber ? <CopyButton text={row.gstNumber} /> : null}
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="text-sm text-zc-muted">No data.</div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Branch Details</CardTitle>
                <CardDescription>Overview, setup readiness, and governance shortcuts.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="setup"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Setup
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="overview" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Branch Profile</CardTitle>
                      <CardDescription>Accounting and operational identity for this campus.</CardDescription>
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
                      ) : row ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <InfoTile label="Name" value={<span className="text-sm font-semibold">{row.name}</span>} />
                          <InfoTile label="City" value={<span className="text-sm font-semibold">{row.city}</span>} />

                          <InfoTile
                            label="GSTIN"
                            value={<span className="font-mono text-sm font-semibold">{valOrDash(row.gstNumber)}</span>}
                            className="md:col-span-2"
                            icon={<Building2 className="h-4 w-4" />}
                            tone="emerald"
                          />

                          <InfoTile
                            label="Address"
                            value={<div className="text-sm text-zc-text">{valOrDash(row.address)}</div>}
                            className="md:col-span-2"
                            icon={<MapPin className="h-4 w-4" />}
                            tone="indigo"
                          />

                          <InfoTile
                            label="Contact Phones"
                            value={
                              <div className="text-sm text-zc-text">
                                <div>{valOrDash(row.contactPhone1)}</div>
                                {row.contactPhone2?.trim() ? <div className="text-zc-muted">{row.contactPhone2}</div> : null}
                                {!row.contactPhone1?.trim() && !row.contactPhone2?.trim() ? <span>--</span> : null}
                              </div>
                            }
                            tone="cyan"
                          />

                          <InfoTile
                            label="Contact Email"
                            value={<div className="text-sm text-zc-text">{valOrDash(row.contactEmail)}</div>}
                            tone="zinc"
                          />

                          <InfoTile label="Created At" value={<span className="text-sm text-zc-text">{fmtDate(row.createdAt)}</span>} />
                          <InfoTile label="Updated At" value={<span className="text-sm text-zc-text">{fmtDate(row.updatedAt)}</span>} />
                        </div>
                      ) : (
                        <div className="text-sm text-zc-muted">No data.</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Setup Health</CardTitle>
                      <CardDescription className="text-xs">Super Admin setup readiness for this branch.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Facilities</span>
                        {readinessFlag(readyFacilities)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Departments</span>
                        {readinessFlag(readyDepartments)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Specialties Catalog</span>
                        {readinessFlag(readySpecialties)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Dept - Specialty Mapping</span>
                        {readinessFlag(readyMapping, "Review in Setup")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="setup" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="overflow-hidden lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Branch Setup</CardTitle>
                      <CardDescription>Super Admin configuration (before Branch Admin onboarding).</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 grid gap-3">
                      <ModuleCard
                        title="Facility Setup"
                        description="Facilities -> Departments -> Specialties -> Mapping"
                        count={undefined}
                        icon={<Wand2 className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref}
                        tone="zinc"
                      />
                      <ModuleCard
                        title="Facilities Enabled"
                        description="Branch facility catalog (enabled)"
                        count={facilities}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref}
                        tone="sky"
                      />
                      <ModuleCard
                        title="Departments"
                        description="Departments created under facilities"
                        count={departments}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref}
                        tone="emerald"
                      />
                      <ModuleCard
                        title="Specialties Catalog"
                        description="Branch-level specialties (master list)"
                        count={specialties}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref}
                        tone="violet"
                      />
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Governance</CardTitle>
                      <CardDescription>Policies and approvals remain global; branch overrides are scoped here.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 grid gap-3">
                      <Link
                        href={policyOverridesHref}
                        className="group flex items-center justify-between rounded-2xl border border-zc-border bg-zc-panel/20 p-4 hover:bg-zc-panel/35 hover:shadow-elev-2 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
                            <ShieldCheck className="h-4 w-4 text-zc-accent" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              Policy Overrides
                            </div>
                            <div className="mt-1 text-sm text-zc-muted">Branch-specific exceptions and rollouts</div>
                          </div>
                        </div>
                        <IconChevronRight className="h-4 w-4 text-zc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      </Link>

                      <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                        <div className="font-semibold text-zc-text">Super Admin shortcuts</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button asChild variant="outline">
                            <Link href={policiesHref}>Policies</Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href={approvalsHref}>Approvals</Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href={auditHref}>Audit Trail</Link>
                          </Button>
                        </div>
                        <div className="mt-2 text-xs">Tip: Keep definitions global; use overrides only for branch deviations.</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>

      <EditBranchModal open={editOpen} branch={row} onClose={() => setEditOpen(false)} onSaved={() => refresh(false)} />

      <DeleteConfirmModal
        open={deleteOpen}
        branch={row}
        onClose={() => setDeleteOpen(false)}
        onDeleted={async () => {
          router.replace("/superadmin/branches");
        }}
      />
    </AppShell>
  );
}
