"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth/store";

import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Building2, Loader2, Pencil, RefreshCw, Trash2, Wand2 } from "lucide-react";

/**
 * IMPORTANT:
 * Backend counts naming can vary depending on Prisma relations.
 * This UI supports a few common shapes:
 *  - _count.facilities | _count.branchFacilities
 *  - _count.specialties
 *  - _count.departments
 */
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

  // fallback shape if your API sends these directly
  facilitiesCount?: number;
  departmentsCount?: number;
  specialtiesCount?: number;
};

type BranchForm = {
  code: string;
  name: string;
  city: string;

  gstNumber: string;

  address: string;
  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;
};

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Branch code is required";
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(v)) {
    return "Code must be 2–32 chars, letters/numbers/hyphen (example: BLR-EC)";
  }
  return null;
}

function normalizeGSTIN(input: string) {
  return String(input || "").trim().toUpperCase();
}

/**
 * GSTIN format (India): 15 chars
 * Common validation regex (not perfect but strong enough for UI):
 *  2 digits + 5 letters + 4 digits + 1 letter + 1 alnum(1-9A-Z) + 'Z' + 1 alnum
 */
function validateGSTIN(gstin: string): string | null {
  const v = normalizeGSTIN(gstin);
  if (!v) return "GST Number (GSTIN) is required";
  if (v.length !== 15) return "GSTIN must be exactly 15 characters";
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!re.test(v)) return "Please enter a valid GSTIN (example: 29ABCDE1234F1Z5)";
  return null;
}

function validateEmail(email: string): string | null {
  const v = String(email || "").trim();
  if (!v) return "Contact email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address";
  return null;
}

function validatePhone(phone: string, label: string): string | null {
  const v = String(phone || "").trim();
  if (!v) return `${label} is required`;
  if (!/^[0-9+][0-9()\-\s]{6,19}$/.test(v)) return `Please enter a valid ${label}`;
  return null;
}

function cityToCode(city: string): string {
  const c = (city || "").trim().toLowerCase();
  const map: Record<string, string> = {
    bengaluru: "BLR",
    bangalore: "BLR",
    mumbai: "MUM",
    bombay: "MUM",
    delhi: "DEL",
    "new delhi": "DEL",
    chennai: "CHE",
    kolkata: "KOL",
    hyderabad: "HYD",
    pune: "PUN",
    ahmedabad: "AMD",
  };
  if (map[c]) return map[c];
  const letters = c.replace(/[^a-z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "BR";
}

function wordsToInitials(input: string, maxLetters = 2): string {
  const parts = (input || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = parts
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .join("");

  if (initials.length >= 2) return initials.slice(0, maxLetters);

  const letters = (parts[0] || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, maxLetters);
}

function deriveBranchCode(name: string, city: string): string {
  const c = cityToCode(city);
  const n = wordsToInitials(name, 2);
  return `${c}-${n}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function pillTone(label: string) {
  const l = (label || "").toLowerCase();

  if (l.includes("facility"))
    return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
  if (l.includes("dept"))
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (l.includes("special"))
    return "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200";

  return "border-xc-border bg-xc-panel/30 text-xc-muted";
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTone(label))}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countOf(row: BranchRow, kind: "facilities" | "departments" | "specialties") {
  // direct counts from API (if present)
  if (kind === "facilities" && row.facilitiesCount != null) return safeNum(row.facilitiesCount);
  if (kind === "departments" && row.departmentsCount != null) return safeNum(row.departmentsCount);
  if (kind === "specialties" && row.specialtiesCount != null) return safeNum(row.specialtiesCount);

  // _count variants
  const c = row._count || {};
  if (kind === "facilities") return safeNum(c.facilities ?? c.branchFacilities ?? c.branchFacility ?? c.facilityLinks);
  if (kind === "departments") return safeNum(c.departments ?? c.department);
  if (kind === "specialties") return safeNum(c.specialties ?? c.specialty);

  return 0;
}

function countSum(rows: BranchRow[], kind: "facilities" | "departments" | "specialties") {
  return rows.reduce((acc, r) => acc + countOf(r, kind), 0);
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-xc-border bg-xc-card shadow-elev-2">
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

  async function onConfirm() {
    if (!branch?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, { method: "DELETE" });
      await onDeleted();
      toast({
        title: "Branch Deleted",
        description: `Successfully deleted branch "${branch.name}"`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  const deps = countOf(branch, "facilities") + countOf(branch, "departments") + countOf(branch, "specialties");

  return (
    <ModalShell title="Delete Branch" description="Deletion is blocked if the branch has any configured setup data." onClose={onClose}>
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-xc-border bg-xc-panel/20 p-4">
        <div className="text-sm font-semibold text-xc-text">
          {branch.name} <span className="font-mono text-xs text-xc-muted">({branch.code})</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Pill label="Facilities" value={countOf(branch, "facilities")} />
          <Pill label="Depts" value={countOf(branch, "departments")} />
          <Pill label="Specialties" value={countOf(branch, "specialties")} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-warn-rgb)/0.35)] bg-[rgb(var(--xc-warn-rgb)/0.12)] px-3 py-2 text-sm text-xc-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--xc-warn))]" />
          <div className="min-w-0">
            If this branch already has Facilities/Departments/Specialties configured, deletion will be rejected. Prefer retiring via governance instead of deleting.
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy || deps > 0}>
          {deps > 0 ? "Cannot Delete (Has Setup Data)" : busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </ModalShell>
  );
}

function BranchEditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: BranchRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState(false);

  const [form, setForm] = React.useState<BranchForm>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    gstNumber: initial?.gstNumber ?? "",
    address: initial?.address ?? "",
    contactPhone1: initial?.contactPhone1 ?? "",
    contactPhone2: initial?.contactPhone2 ?? "",
    contactEmail: initial?.contactEmail ?? "",
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setManualCode(false);
    setForm({
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      gstNumber: initial?.gstNumber ?? "",
      address: initial?.address ?? "",
      contactPhone1: initial?.contactPhone1 ?? "",
      contactPhone2: initial?.contactPhone2 ?? "",
      contactEmail: initial?.contactEmail ?? "",
    });
  }, [open, initial]);

  React.useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;
    if (manualCode) return;

    const next = deriveBranchCode(form.name, form.city);
    if (next && next !== form.code) setForm((s) => ({ ...s, code: next }));
  }, [open, mode, manualCode, form.name, form.city, form.code]);

  async function onSubmit() {
    setErr(null);

    if (mode === "create") {
      const ce = validateCode(form.code);
      if (ce) return setErr(ce);
    }

    if (!form.name.trim()) return setErr("Branch name is required");
    if (!form.city.trim()) return setErr("City is required");

    const gstErr = validateGSTIN(form.gstNumber);
    if (gstErr) return setErr(gstErr);

    if (!form.address.trim()) return setErr("Branch address is required");

    const p1 = validatePhone(form.contactPhone1, "Contact number 1");
    if (p1) return setErr(p1);

    if (form.contactPhone2.trim()) {
      const p2 = validatePhone(form.contactPhone2, "Contact number 2");
      if (p2) return setErr(p2);
    }

    const em = validateEmail(form.contactEmail);
    if (em) return setErr(em);

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/branches", {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(form.code),
            name: form.name.trim(),
            city: form.city.trim(),
            gstNumber: normalizeGSTIN(form.gstNumber),
            address: form.address.trim(),
            contactPhone1: form.contactPhone1.trim(),
            contactPhone2: form.contactPhone2.trim() || null,
            contactEmail: form.contactEmail.trim().toLowerCase(),
          }),
        });
      } else {
        if (!initial?.id) throw new Error("Missing branch id");
        await apiFetch(`/api/branches/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            city: form.city.trim(),
            gstNumber: normalizeGSTIN(form.gstNumber),
            address: form.address.trim(),
            contactPhone1: form.contactPhone1.trim(),
            contactPhone2: form.contactPhone2.trim() || null,
            contactEmail: form.contactEmail.trim().toLowerCase(),
          }),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Branch Created" : "Branch Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} branch "${form.name}"`,
        variant: "success",
      });

      onClose();

      // refresh list after close
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setManualCode(false);
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent
        // ✅ CHANGED: w-[95vw] ensures mobile fit, max-h-[85vh] + overflow-y-auto handles scrolling
        className="w-[95vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Create Branch" : "Edit Branch"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create the branch first (including GSTIN). Then configure Facilities, Departments, and Specialties."
              : "Update branch details and contact information."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-5">
          {/* ✅ CHANGED: grid-cols-1 for mobile (stack), sm:grid-cols-2 for desktop (side-by-side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Branch Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Electronic City Campus"
              />
            </div>

            <div className="grid gap-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} placeholder="e.g. Bengaluru" />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Branch Code</Label>
              {mode === "create" && !manualCode && form.code ? (
                <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                  <Wand2 className="h-3 w-3" /> Auto-generated
                </span>
              ) : null}
            </div>

            <div className="relative">
              <Input
                value={form.code}
                disabled={mode === "edit"}
                onChange={(e) => {
                  setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }));
                  if (mode === "create") setManualCode(true);
                }}
                placeholder="BLR-EC"
                className={cn(
                  "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                  mode === "edit" && "opacity-80",
                )}
              />

              {mode === "create" && !manualCode && form.code ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 text-xc-muted hover:text-xc-text"
                  title="Edit manually"
                  onClick={() => setManualCode(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              ) : null}
            </div>

            <p className="text-[11px] text-xc-muted">
              Example: <span className="font-mono">BLR-EC</span> (City code + Campus initials)
            </p>
          </div>

          {/* GSTIN */}
          <div className="grid gap-2">
            <Label>GST Number (GSTIN)</Label>
            <Input
              value={form.gstNumber}
              onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value.toUpperCase() }))}
              placeholder="e.g. 29ABCDE1234F1Z5"
              maxLength={15}
              className="font-mono"
            />
            <p className="text-[11px] text-xc-muted">Used in Accounting, invoices, and statutory reporting.</p>
          </div>

          <div className="grid gap-2">
            <Label>Branch Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Street, Area, Landmark, City, State, PIN"
            />
            <p className="text-[11px] text-xc-muted">Used in reports, invoices, and branch communications.</p>
          </div>

          <Separator className="my-1" />

          <div className="grid gap-4">
            <div className="text-sm font-semibold text-xc-text">Contact Details</div>

            {/* ✅ CHANGED: grid-cols-1 for mobile, sm:grid-cols-2 for desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Number 1</Label>
                <Input
                  value={form.contactPhone1}
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone1: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="grid gap-2">
                <Label>Contact Number 2</Label>
                <Input
                  value={form.contactPhone2}
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone2: e.target.value }))}
                  placeholder="+91 91234 56789 (optional)"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Contact Email</Label>
              <Input
                value={form.contactEmail}
                onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                placeholder="campus.admin@zypocare.local"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {/* Footer already uses flex-col-reverse which is good for mobile */}
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button variant="primary" onClick={() => void onSubmit()} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create Branch" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default function BranchesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user as any)?.roleCode === "SUPER_ADMIN";

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BranchRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((b) => {
      const hay = `${b.code} ${b.name} ${b.city} ${b.gstNumber ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow[]>("/api/branches");
      const sorted = [...(data ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Branches refreshed", description: `Loaded ${sorted.length} branches.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load branches";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalFacilities = countSum(rows, "facilities");
  const totalDepartments = countSum(rows, "departments");
  const totalSpecialties = countSum(rows, "specialties");

  return (
    <AppShell title="Branches">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-xc-border bg-xc-panel/30">
              <IconBuilding className="h-5 w-5 text-xc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Branches</div>
              <div className="mt-1 text-sm text-xc-muted">
                Super Admin creates Branch, configures Facilities, Departments and Specialties.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Keep outline for compatibility; you can later switch this to variant="info" once button variants are extended */}
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {isSuperAdmin ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Branch
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search branches and open details. Only Super Admin can create, edit, delete and configure branch setup.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Branches</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Total Facilities</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{totalFacilities}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Total Specialties</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{totalSpecialties}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-xc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by code, name, city, or GSTIN…"
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-xc-muted">
                Showing <span className="font-semibold tabular-nums text-xc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-xc-text">{rows.length}</span>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Branch Registry</CardTitle>
            <CardDescription className="text-sm">Use Facility Setup to configure Facilities → Departments → Specialties → Mapping.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-xc-panel/20 text-xs text-xc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                  <th className="px-4 py-3 text-left font-semibold">GSTIN</th>
                  <th className="px-4 py-3 text-left font-semibold">Setup</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-xc-muted">
                      {loading ? "Loading branches…" : "No branches found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-xc-border hover:bg-xc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-xc-border bg-xc-accent/20 px-2.5 py-1 font-mono text-xs text-xc-text">
                        {b.code}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-xc-text">{b.name}</div>
                    </td>

                    <td className="px-4 py-3 text-xc-muted">{b.city}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-xc-text">{b.gstNumber || "-"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Pill label="Facilities" value={countOf(b, "facilities")} />
                        <Pill label="Depts" value={countOf(b, "departments")} />
                        <Pill label="Specialties" value={countOf(b, "specialties")} />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" className="px-3 gap-2">
                          <Link href={`/superadmin/branches/${b.id}`}>
                            Details <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>

                        {isSuperAdmin ? (
                          <>
                            <Button
                              variant="secondary"
                              className="px-3 gap-2"
                              onClick={() => {
                                setSelected(b);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>

                            <Button asChild variant="outline" className="px-3">
                              <Link href={`/superadmin/branches/${encodeURIComponent(b.id)}/facility-setup`}>Facility Setup</Link>
                            </Button>

                            <Button
                              variant="destructive"
                              className="px-3 gap-2"
                              onClick={() => {
                                setSelected(b);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
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

        {/* Onboarding callout */}
        <div className="rounded-2xl border border-xc-border bg-xc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-xc-text">Recommended setup order</div>
              <div className="mt-1 text-sm text-xc-muted">
                1) Create Branch (GSTIN) → 2) Facility Setup (Facilities → Departments → Specialties → Mapping) → 3) Branch Admin config (later).
              </div>
            </div>
          </div>
        </div>
      </div>

      <BranchEditorModal mode="create" open={createOpen} initial={null} onClose={() => setCreateOpen(false)} onSaved={() => refresh(false)} />
      <BranchEditorModal mode="edit" open={editOpen} initial={selected} onClose={() => setEditOpen(false)} onSaved={() => refresh(false)} />
      <DeleteConfirmModal open={deleteOpen} branch={selected} onClose={() => setDeleteOpen(false)} onDeleted={() => refresh(false)} />
    </AppShell>
  );
}
