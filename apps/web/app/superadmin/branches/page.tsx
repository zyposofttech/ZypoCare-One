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
// Added useToast import
import { toast, useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth/store";

import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Building2, Loader2, Pencil, Trash2, Wand2 } from "lucide-react";

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
  code: string;
  name: string;
  city: string;

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
async function refresh(showToast = true) {
  try {
    const data = await apiFetch<BranchRow[]>("/api/branches");
    setRows(data);
    if (showToast) toast({ title: "Branches refreshed", description: `Loaded ${data.length} branches.` });
  } catch (e: any) {
    const msg = e?.message || "Failed to load branches";
    setErr(msg);
    toast({ variant: "destructive", title: "Refresh failed", description: msg });
  }
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

  if (l.includes("branch")) return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200";
  if (l.includes("user")) return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
  if (l.includes("dept")) return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (l.includes("bed")) return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200";

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

function countSum(rows: BranchRow[], key: keyof BranchCounts) {
  return rows.reduce((acc, r) => acc + (Number(r._count?.[key] ?? 0) || 0), 0);
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
  const { toast } = useToast(); // Initialized toast hook
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState(false);

  const [form, setForm] = React.useState<BranchForm>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    city: initial?.city ?? "",
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
      address: initial?.address ?? "",
      contactPhone1: initial?.contactPhone1 ?? "",
      contactPhone2: initial?.contactPhone2 ?? "",
      contactEmail: initial?.contactEmail ?? "",
    });
  }, [open, initial]);

  // Auto-generate code (CREATE only) until manual override
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
            address: form.address.trim(),
            contactPhone1: form.contactPhone1.trim(),
            contactPhone2: form.contactPhone2.trim() || null,
            contactEmail: form.contactEmail.trim().toLowerCase(),
          }),
        });
      }

      await onSaved();
      
      // Added Toast success message
      toast({
        title: mode === "create" ? "Branch Created" : "Branch Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} branch "${form.name}"`,
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      // Optional: Add error toast here if you want dual notification
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
        className="sm:max-w-[560px] border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
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
              ? "Set up a new hospital branch. Code is auto-generated from City + Branch Name, but you can customize it."
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
          <div className="grid grid-cols-2 gap-4">
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
              <Input
                value={form.city}
                onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                placeholder="e.g. Bengaluru"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Branch Code</Label>
              {mode === "create" && !manualCode && form.code ? (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
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

            <div className="grid grid-cols-2 gap-4">
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
                placeholder="campus.admin@excelcare.local"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>

          <Button
            onClick={() => void onSubmit()}
            disabled={busy}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create Branch" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const { toast } = useToast(); // Initialized toast hook
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
      
      // Added Toast success message
      toast({
        title: "Branch Deleted",
        description: `Successfully deleted branch "${branch.name}"`,
      });

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
      description="Deletion is blocked if the branch has any dependent data."
      onClose={onClose}
    >
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
          <Pill label="Users" value={Number(branch._count?.users ?? 0)} />
          <Pill label="Depts" value={Number(branch._count?.departments ?? 0)} />
          <Pill label="Beds" value={Number(branch._count?.beds ?? 0)} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-warn-rgb)/0.35)] bg-[rgb(var(--xc-warn-rgb)/0.12)] px-3 py-2 text-sm text-xc-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--xc-warn))]" />
          <div className="min-w-0">
            If this branch already has configured data, deletion will be rejected. Prefer disabling access or retiring via governance.
          </div>
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

export default function BranchesPage() {
  const user = useAuthStore((s) => s.user);

  // IMPORTANT: support both shapes coming from IAM / store
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user as any)?.roleCode === "SUPER_ADMIN";

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BranchRow | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow[]>(
        `/api/branches${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
      );
      setRows([...data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (e: any) {
      setErr(e?.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalUsers = countSum(rows, "users");
  const totalDepartments = countSum(rows, "departments");
  const totalBeds = countSum(rows, "beds");

  return (
    <AppShell title="Branches">
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-xc-border bg-xc-panel/30">
                <IconBuilding className="h-5 w-5 text-xc-accent" />
              </span>
              <div>
                <div className="text-3xl font-semibold tracking-tight">Branches</div>
                <div className="mt-1 text-sm text-xc-muted">
                  All users, departments, wards, and beds are created under a branch.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill label="Branches" value={rows.length} />
              <Pill label="Users" value={totalUsers} />
              <Pill label="Departments" value={totalDepartments} />
              <Pill label="Beds" value={totalBeds} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            {isSuperAdmin ? (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <IconPlus className="h-4 w-4" />
                Create Branch
              </Button>
            ) : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branch Registry</CardTitle>
            <CardDescription>
              Search branches and open details. Only Super Admin can create, edit, or delete branches.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {err ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-xc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") refresh();
                  }}
                  placeholder="Search by code, name, or city"
                  className="pl-10"
                />
              </div>
              <Button variant="secondary" className="gap-2" onClick={refresh} disabled={loading}>
                <IconSearch className="h-4 w-4" />
                Search
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-xc-border">
              <table className="w-full text-sm">
                <thead className="bg-xc-panel/20 text-left text-xc-muted">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Overview</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    return (
                      <tr key={b.id} className="border-t border-xc-border hover:bg-[rgb(var(--xc-hover-rgb)/0.06)]">
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg border border-xc-border bg-xc-panel/20 px-2.5 py-1 font-mono text-xs text-xc-text">
                            {b.code}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-xc-text">{b.name}</div>
                        </td>

                        <td className="px-4 py-3 text-xc-text">{b.city}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Pill label="Users" value={Number(b._count?.users ?? 0)} />
                            <Pill label="Depts" value={Number(b._count?.departments ?? 0)} />
                            <Pill label="Beds" value={Number(b._count?.beds ?? 0)} />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="outline" size="sm" className="gap-2">
                              <Link href={`/superadmin/branches/${b.id}`}>
                                Details <IconChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>

                            {isSuperAdmin ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    setSelected(b);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-2"
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
                    );
                  })}

                  {!rows.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-xc-muted">
                        {loading ? "Loading branches…" : "No branches found."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl border border-xc-border bg-xc-panel/20 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-xc-text">Recommended onboarding order</div>
                  <div className="mt-1 text-sm text-xc-muted">
                    Create branches first, then set up departments, staff, wards/beds, and finally IAM users scoped to the branch.
                  </div>
                </div>
                <Button asChild variant="outline" className="self-start md:self-auto">
                  <Link href="/admin/facility">Open Branch Admin Setup</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BranchEditorModal mode="create" open={createOpen} initial={null} onClose={() => setCreateOpen(false)} onSaved={refresh} />
      <BranchEditorModal mode="edit" open={editOpen} initial={selected} onClose={() => setEditOpen(false)} onSaved={refresh} />
      <DeleteConfirmModal open={deleteOpen} branch={selected} onClose={() => setDeleteOpen(false)} onDeleted={refresh} />
    </AppShell>
  );
}

function setRows(data: BranchRow[]) {
  throw new Error("Function not implemented.");
}
function setErr(msg: any) {
  throw new Error("Function not implemented.");
}

