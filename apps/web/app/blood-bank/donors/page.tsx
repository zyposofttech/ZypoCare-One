"use client";
import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Users } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DonorRow = {
  id: string;
  donorNumber?: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  donorType: string;
  donorStatus: string;
  mobile?: string;
  aadhaarNo?: string;
  address?: string;
  donationCount?: number;
  createdAt?: string;
};

type DonorForm = {
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  donorType: string;
  mobile: string;
  aadhaarNo: string;
  address: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BLOOD_GROUPS = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
];

const DONOR_TYPES = [
  { value: "VOLUNTARY", label: "Voluntary" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "DIRECTED", label: "Directed" },
  { value: "AUTOLOGOUS", label: "Autologous" },
];

const GENDERS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const EMPTY_FORM: DonorForm = {
  name: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  donorType: "VOLUNTARY",
  mobile: "",
  aadhaarNo: "",
  address: "",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function bloodGroupLabel(value?: string) {
  if (!value) return "-";
  const found = BLOOD_GROUPS.find((g) => g.value === value);
  return found ? found.label : value.replace("_", " ");
}

function statusBadge(status: string) {
  if (status === "ELIGIBLE") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        ELIGIBLE
      </span>
    );
  }
  if (status === "TEMPORARILY_DEFERRED") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        TEMP DEFERRED
      </span>
    );
  }
  if (status === "PERMANENTLY_DEFERRED") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        PERM DEFERRED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Modal                                                       */
/* ------------------------------------------------------------------ */

function DonorEditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: DonorRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<DonorForm>({ ...EMPTY_FORM });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "edit" && initial) {
      setForm({
        name: initial.name ?? "",
        dateOfBirth: initial.dateOfBirth ? String(initial.dateOfBirth).slice(0, 10) : "",
        gender: initial.gender ?? "",
        bloodGroup: initial.bloodGroup ?? "",
        donorType: initial.donorType ?? "VOLUNTARY",
        mobile: initial.mobile ?? "",
        aadhaarNo: initial.aadhaarNo ?? "",
        address: initial.address ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, initial, mode]);

  function set<K extends keyof DonorForm>(key: K, value: DonorForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.name.trim()) return setErr("Donor name is required");
    if (!form.bloodGroup) return setErr("Blood group is required");
    if (!form.donorType) return setErr("Donor type is required");

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/blood-bank/donors", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender || null,
            bloodGroup: form.bloodGroup,
            donorType: form.donorType,
            mobile: form.mobile.trim() || null,
            aadhaarNo: form.aadhaarNo.trim() || null,
            address: form.address.trim() || null,
            branchId,
          }),
        });
      } else {
        if (!initial?.id) throw new Error("Missing donor id");
        await apiFetch(`/api/blood-bank/donors/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender || null,
            bloodGroup: form.bloodGroup,
            donorType: form.donorType,
            mobile: form.mobile.trim() || null,
            aadhaarNo: form.aadhaarNo.trim() || null,
            address: form.address.trim() || null,
          }),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Donor Registered" : "Donor Updated",
        description: `Successfully ${mode === "create" ? "registered" : "updated"} donor "${form.name}"`,
        variant: "success",
      });

      onClose();
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
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Register Donor" : "Edit Donor"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new blood donor with personal information, blood type, and contact details."
              : "Update donor personal information, blood type, and contact details."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Personal Information */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Personal Information</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rajesh Kumar" />
              </div>

              <div className="grid gap-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Blood & Donor Type */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Blood & Donor Type</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Donor Type</Label>
                <Select value={form.donorType} onValueChange={(v) => set("donorType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DONOR_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Contact</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div className="grid gap-2">
                <Label>Aadhaar No.</Label>
                <Input value={form.aadhaarNo} onChange={(e) => set("aadhaarNo", e.target.value)} placeholder="1234 5678 9012" className="font-mono" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, Area, City" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Register Donor" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DonorRegistryPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_DONOR_READ");
  const canCreate = hasPerm(user, "BB_DONOR_CREATE");
  const canUpdate = hasPerm(user, "BB_DONOR_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DonorRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DonorRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((d) => {
      const hay = `${d.donorNumber ?? ""} ${d.name} ${d.mobile ?? ""} ${d.bloodGroup ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<DonorRow[]>(`/api/blood-bank/donors?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Donors refreshed", description: `Loaded ${sorted.length} donors.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load donors";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const totalDonors = rows.length;
  const eligibleDonors = rows.filter((d) => d.donorStatus === "ELIGIBLE").length;
  const deferredDonors = rows.filter((d) => (d.donorStatus ?? "").includes("DEFERRED")).length;

  return (
    <AppShell title="Donor Registry">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Users className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Donor Registry</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage blood donors, registration, screening, and deferrals.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Register Donor
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search donors and open details. Register new donors, update records, and manage screening status.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Donors</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalDonors}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Eligible</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{eligibleDonors}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Deferred</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{deferredDonors}</div>
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
                  placeholder="Search by donor #, name, mobile, blood group..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
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

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Donor Registry</CardTitle>
            <CardDescription className="text-sm">Registered blood donors with screening status and donation history.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Donor #</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Donations</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading donors..." : "No donors found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <Link href={`/blood-bank/donors/${d.id}` as any} className="text-indigo-600 hover:underline dark:text-indigo-400 font-mono text-xs">
                        {d.donorNumber ?? "-"}
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{d.name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs">
                        {bloodGroupLabel(d.bloodGroup)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{d.mobile ?? "-"}</td>

                    <td className="px-4 py-3 text-zc-muted">{d.donorType}</td>

                    <td className="px-4 py-3">{statusBadge(d.donorStatus)}</td>

                    <td className="px-4 py-3">
                      <span className="font-semibold tabular-nums">{d.donationCount ?? 0}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/blood-bank/donors/${d.id}` as any} title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>

                        {canUpdate ? (
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => {
                              setSelected(d);
                              setEditOpen(true);
                            }}
                            title="Edit donor"
                            aria-label="Edit donor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Donor management tips</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Register donor with personal & blood type info, then 2) Complete screening questionnaire, then 3) Record donations and track deferrals.
              </div>
            </div>
          </div>
        </div>
      </div>

      <DonorEditorModal
        mode="create"
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_DONOR_CREATE"
        branchId={branchId ?? ""}
      />

      <DonorEditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_DONOR_UPDATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
