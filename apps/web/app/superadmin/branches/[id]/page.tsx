"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/cn";
import { IconBuilding, IconChevronRight } from "@/components/icons";
import {
  AlertTriangle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  ArrowLeft,
  Copy,
  Check
} from "lucide-react";

// --- Types ---
type BranchCounts = {
  users?: number;
  departments?: number;
  patients?: number;
  wards?: number;
  oTs?: number;
  beds?: number;
};

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string | null;
  contactPhone1?: string | null;
  contactPhone2?: string | null;
  contactEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: BranchCounts;
};

type BranchForm = {
  name: string;
  city: string;
  address: string;
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
};

// --- Utilities ---

const pillTones = {
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  rose:
    "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
  cyan:
    "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
};

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
      <span className="font-semibold">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
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

// --- Small Components ---

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={onCopy}
      className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded text-xc-muted hover:bg-xc-panel hover:text-xc-text transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// --- Modals (Unchanged Logic) ---

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
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-200/40 bg-xc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-xc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-xc-muted">{description}</div> : null}
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
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BranchForm>({
    name: "",
    city: "",
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

    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          address: cleanOptional(form.address),
          contactPhone1: cleanOptional(form.contactPhone1),
          contactPhone2: cleanOptional(form.contactPhone2),
          contactEmail: cleanOptional(form.contactEmail),
        }),
      });
      await onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <ModalShell
      title="Edit Branch"
      description="Update address & contact details. Branch code is immutable in production."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Branch code</div>
            <Input value={branch.code} disabled className="mt-1 font-mono" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">City</div>
            <Input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} className="mt-1" />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Branch name</div>
          <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="mt-1" />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Address</div>
          <textarea
            value={form.address}
            onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            placeholder="Address line for this campus"
            className={cn(
              "mt-1 min-h-[90px] w-full rounded-lg border border-xc-border bg-transparent px-3 py-2 text-sm text-xc-text outline-none",
              "focus-visible:ring-2 focus-visible:ring-xc-ring"
            )}
          />
          <div className="mt-1 text-xs text-xc-muted">Optional. Visible in branch profile and exports.</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Contact phone 1</div>
            <Input
              value={form.contactPhone1}
              onChange={(e) => setForm((s) => ({ ...s, contactPhone1: e.target.value }))}
              placeholder="+91 9XXXXXXXXX"
              className="mt-1"
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Contact phone 2</div>
            <Input
              value={form.contactPhone2}
              onChange={(e) => setForm((s) => ({ ...s, contactPhone2: e.target.value }))}
              placeholder="Optional alternate number"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Contact email</div>
          <Input
            value={form.contactEmail}
            onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
            placeholder="branch@excelcare.local"
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </ModalShell>
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
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  async function onConfirm() {
    if (!branch?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, { method: "DELETE" });
      await onDeleted();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  const deps =
    Number(branch._count?.users ?? 0) +
    Number(branch._count?.departments ?? 0) +
    Number(branch._count?.patients ?? 0) +
    Number(branch._count?.wards ?? 0) +
    Number(branch._count?.oTs ?? 0) +
    Number(branch._count?.beds ?? 0);

  return (
    <ModalShell
      title="Delete Branch"
      description="Deletion is allowed only when the branch has no dependent data."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-xc-border bg-xc-panel/20 p-4">
        <div className="text-sm text-xc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-xc-text">
          {branch.name} <span className="text-xc-muted">({branch.code})</span>
        </div>
        <div className="mt-2 text-sm text-xc-muted">City: {branch.city}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MetricPill label="Users" value={Number(branch._count?.users ?? 0)} tone="indigo" />
          <MetricPill label="Departments" value={Number(branch._count?.departments ?? 0)} tone="emerald" />
          <MetricPill label="Wards" value={Number(branch._count?.wards ?? 0)} tone="amber" />
          <MetricPill label="Beds" value={Number(branch._count?.beds ?? 0)} tone="cyan" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy || deps > 0}>
          {deps > 0 ? "Cannot Delete (Has Data)" : busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

// --- Main Page Component ---

export default function BranchDetailPage() {
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

  async function refresh() {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow>(`/api/branches/${id}`);
      setRow(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load branch");
      setRow(null);
    } finally {
      // Small delay prevents UI flashing, feels smoother
      setTimeout(() => setLoading(false), 200);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const deps =
    Number(row?._count?.users ?? 0) +
    Number(row?._count?.departments ?? 0) +
    Number(row?._count?.patients ?? 0) +
    Number(row?._count?.wards ?? 0) +
    Number(row?._count?.oTs ?? 0) +
    Number(row?._count?.beds ?? 0);

  return (
    <AppShell title="Branch Details">
      <div className="grid gap-6">
        {/* --- Header Section (Design Preserved) --- */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-xc-muted">
                  <Link href="/superadmin/branches" className="hover:underline">
                    Branches
                  </Link>
                  <span className="mx-2 text-xc-muted/60">/</span>
                  <span className="text-xc-text">Details</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-9 w-64" /> : row?.name}
                </div>

                {!loading && row ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-xc-muted">
                    <span className="rounded-md border border-xc-border bg-xc-panel/25 px-2 py-0.5 font-mono text-[12px] text-xc-text">
                      {row.code}
                    </span>
                    <span className="text-xc-muted/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {row.city}
                    </span>
                    <span className="text-xc-muted/60">•</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                        deps > 0
                          ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                          : "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200"
                      )}
                    >
                      {deps > 0 ? "Active" : "Empty"}
                    </span>
                  </div>
                ) : loading ? (
                  <div className="mt-2 flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div>
                ) : null}
              </div>
            </div>

            {!loading && row ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <MetricPill label="Users" value={Number(row._count?.users ?? 0)} tone="indigo" />
                <MetricPill label="Departments" value={Number(row._count?.departments ?? 0)} tone="emerald" />
                <MetricPill label="Patients" value={Number(row._count?.patients ?? 0)} tone="rose" />
                <MetricPill label="Wards" value={Number(row._count?.wards ?? 0)} tone="amber" />
                <MetricPill label="Beds" value={Number(row._count?.beds ?? 0)} tone="cyan" />
              </div>
            ) : null}

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
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

        {/* --- Main Content Grid --- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Branch Profile</CardTitle>
              <CardDescription>All operational and clinical data is scoped under this branch.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
                  <Skeleton className="h-20" />
                </div>
              ) : row ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoTile
                    label="Branch ID"
                    value={
                      <div className="flex items-center">
                        <span className="font-mono text-xs break-all">{row.id}</span>
                        <CopyButton text={row.id} />
                      </div>
                    }
                  />
                  <InfoTile label="Branch Code" value={<span className="font-mono text-sm font-semibold">{row.code}</span>} />
                  <InfoTile label="Name" value={<span className="text-sm font-semibold">{row.name}</span>} />
                  <InfoTile label="City" value={<span className="text-sm font-semibold">{row.city}</span>} />

                  <InfoTile
                    label="Address"
                    value={
                      <div className="text-sm text-xc-text">
                        {valOrDash(row.address)}
                      </div>
                    }
                    className="md:col-span-2"
                    icon={<MapPin className="h-4 w-4" />}
                    tone="indigo"
                  />

                  <InfoTile
                    label="Contact Phones"
                    value={
                      <div className="text-sm text-xc-text">
                        <div>{valOrDash(row.contactPhone1)}</div>
                        <div className="text-xc-muted">{row.contactPhone2?.trim() ? row.contactPhone2 : ""}</div>
                        {!row.contactPhone1?.trim() && !row.contactPhone2?.trim() ? <span>—</span> : null}
                      </div>
                    }
                    icon={<Phone className="h-4 w-4" />}
                    tone="emerald"
                  />

                  <InfoTile
                    label="Contact Email"
                    value={<div className="text-sm text-xc-text">{valOrDash(row.contactEmail)}</div>}
                    icon={<Mail className="h-4 w-4" />}
                    tone="cyan"
                  />

                  <InfoTile label="Created At" value={<span className="text-sm text-xc-text">{fmtDate(row.createdAt)}</span>} />
                  <InfoTile label="Updated At" value={<span className="text-sm text-xc-text">{fmtDate(row.updatedAt)}</span>} />
                </div>
              ) : (
                <div className="text-sm text-xc-muted">No data.</div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Continue masters setup for this branch.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid gap-3">
                <Step href="/admin/departments" title="Departments" desc="Define clinical & non-clinical departments." />
                <Step href="/admin/staff" title="Staff Directory" desc="Create doctors, nursing, operations staff." />
                <Step href="/admin/wards" title="Wards & Beds" desc="Setup wards, bed board, OT/Lab masters." />
                <Step href="/admin/users" title="Users & Roles" desc="Create app users scoped to this branch." />
              </div>

              <div className="mt-5 rounded-xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                <strong>Tip:</strong> For multi-branch rollout, complete master setup per branch and then assign IAM users to the correct branchId.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditBranchModal open={editOpen} branch={row} onClose={() => setEditOpen(false)} onSaved={refresh} />

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
  tone?: "indigo" | "emerald" | "cyan";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
      : tone === "emerald"
        ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
        : tone === "cyan"
          ? "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/35 dark:bg-cyan-900/15"
          : "border-xc-border bg-xc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-xc-muted">
        {icon ? <span className="text-xc-muted">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function Step({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group block relative overflow-hidden rounded-2xl border border-xc-border bg-xc-panel/20 p-4 transition-all duration-300 hover:shadow-lg hover:border-indigo-400/50 hover:-translate-y-1 hover:bg-xc-panel/40"
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-xc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </div>
          <div className="mt-1 text-sm text-xc-muted">{desc}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
          <IconChevronRight className="h-4 w-4 text-xc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}