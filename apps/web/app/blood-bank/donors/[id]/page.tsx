"use client";

import * as React from "react";
import { useParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconChevronRight } from "@/components/icons";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Pencil,
  User,
  ArrowLeft,
} from "lucide-react";

// ---------------- Helpers ----------------

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POS: "A+",
  A_NEG: "A-",
  B_POS: "B+",
  B_NEG: "B-",
  AB_POS: "AB+",
  AB_NEG: "AB-",
  O_POS: "O+",
  O_NEG: "O-",
};

function displayBloodGroup(v?: string | null) {
  if (!v) return "-";
  return BLOOD_GROUP_LABELS[v] ?? v.replace("_", " ");
}

function fmtDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(d);
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function valOrDash(v?: string | number | null) {
  const s = String(v ?? "").trim();
  return s ? s : "-";
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

function statusColor(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ELIGIBLE")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "TEMPORARILY_DEFERRED")
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  if (s === "PERMANENTLY_DEFERRED")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function statusLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ELIGIBLE") return "Eligible";
  if (s === "TEMPORARILY_DEFERRED") return "Temporarily Deferred";
  if (s === "PERMANENTLY_DEFERRED") return "Permanently Deferred";
  return valOrDash(status);
}

// ---------------- Types ----------------

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

// ---------------- Edit Dialog ----------------

function EditDonorDialog({
  open,
  donor,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  donor: any;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<DonorForm>({
    name: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    donorType: "",
    mobile: "",
    aadhaarNo: "",
    address: "",
  });

  React.useEffect(() => {
    if (!open || !donor) return;
    setErr(null);
    setBusy(false);

    const fullName = [donor.firstName, donor.lastName].filter(Boolean).join(" ");
    const dob = donor.dateOfBirth
      ? new Date(donor.dateOfBirth).toISOString().slice(0, 10)
      : "";

    setForm({
      name: fullName,
      dateOfBirth: dob,
      gender: donor.gender ?? "",
      bloodGroup: donor.bloodGroup ?? "",
      donorType: donor.donorType ?? "",
      mobile: donor.mobile ?? "",
      aadhaarNo: donor.aadhaarNo ?? "",
      address: donor.address ?? "",
    });
  }, [open, donor]);

  function set<K extends keyof DonorForm>(key: K, value: DonorForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!donor?.id) return;

    if (!form.name.trim()) return setErr("Name is required");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/donors/${donor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          bloodGroup: form.bloodGroup || null,
          donorType: form.donorType || null,
          mobile: form.mobile.trim() || null,
          aadhaarNo: form.aadhaarNo.trim() || null,
          address: form.address.trim() || null,
        }),
      });

      await onSaved();

      toast({
        title: "Donor Updated",
        description: `Successfully updated donor "${form.name}"`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Save failed",
      });
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
      <DialogContent
        className={drawerClassName()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Edit Donor Profile
          </DialogTitle>
          <DialogDescription>
            Update donor identity, contact and blood group details.
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
          {/* Identity */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Identity</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="grid gap-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => set("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Blood Group</Label>
                <Select
                  value={form.bloodGroup}
                  onValueChange={(v) => set("bloodGroup", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_POS">A+</SelectItem>
                    <SelectItem value="A_NEG">A-</SelectItem>
                    <SelectItem value="B_POS">B+</SelectItem>
                    <SelectItem value="B_NEG">B-</SelectItem>
                    <SelectItem value="AB_POS">AB+</SelectItem>
                    <SelectItem value="AB_NEG">AB-</SelectItem>
                    <SelectItem value="O_POS">O+</SelectItem>
                    <SelectItem value="O_NEG">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Donor Details */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Donor Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Donor Type</Label>
                <Select
                  value={form.donorType}
                  onValueChange={(v) => set("donorType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOLUNTARY">Voluntary</SelectItem>
                    <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                    <SelectItem value="DIRECTED">Directed</SelectItem>
                    <SelectItem value="AUTOLOGOUS">Autologous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Mobile</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Aadhaar No</Label>
                <Input
                  value={form.aadhaarNo}
                  onChange={(e) => set("aadhaarNo", e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Full address"
                />
              </div>
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
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Main Page ----------------

export default function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_DONOR_READ");
  const canUpdate = hasPerm(user, "BB_DONOR_UPDATE");

  const [donor, setDonor] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "donations" | "deferrals" | "screenings"
  >("donations");

  async function refresh(showToast = false) {
    if (!branchId || !id) return;
    setErr(null);
    setLoading(true);
    try {
      const data: any = await apiFetch(`/api/blood-bank/donors/${id}`);
      setDonor(data);
      if (showToast) {
        toast({
          title: "Donor refreshed",
          description: "Donor data reloaded successfully.",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load donor";
      setErr(msg);
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, id]);

  // ---------- Loading / Not Found ----------

  if (loading) {
    return (
      <AppShell title="Donor Detail">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
      </AppShell>
    );
  }

  if (!donor) {
    return (
      <AppShell title="Donor Detail">
        <div className="py-12 text-center text-sm text-zc-muted">
          Donor not found.
        </div>
      </AppShell>
    );
  }

  // ---------- Derived ----------

  const donorName = [donor.firstName, donor.lastName].filter(Boolean).join(" ") || "Unknown";
  const totalDonations = donor.totalDonations ?? donor.bloodUnits?.length ?? 0;
  const lastDonation = donor.lastDonationDate
    ? fmtDate(donor.lastDonationDate)
    : "Never";
  const donorStatus = (donor.status ?? "ELIGIBLE").toUpperCase();

  const donations: any[] = donor.bloodUnits ?? donor.donations ?? [];
  const deferrals: any[] = donor.deferrals ?? [];
  const screenings: any[] = donor.screenings ?? [];

  return (
    <AppShell title="Donor Detail">
      <div className="grid gap-6">
        {/* Back Button */}
        <div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Donors
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <User className="h-5 w-5 text-indigo-600" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">
                Donor: {donor.donorNumber ?? donorName}
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                View donor profile, donation history, and deferral records
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 px-5"
              onClick={() => void refresh(true)}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>

            {canUpdate ? (
              <Button
                variant="primary"
                className="gap-2 px-5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : null}
          </div>
        </div>

        {/* Error Banner */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Stats */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Donor statistics and current eligibility status.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Donations
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {totalDonations}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Last Donation
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {lastDonation}
                </div>
              </div>

              {donorStatus === "ELIGIBLE" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Deferral Status
                  </div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    Eligible
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                  <div className="text-xs font-medium text-red-600 dark:text-red-400">
                    Deferral Status
                  </div>
                  <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">
                    {statusLabel(donor.status)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Donor Profile</CardTitle>
            <CardDescription className="text-sm">
              Personal information and identification details.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {/* Blood Group */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Blood Group
                </div>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
                    )}
                  >
                    {displayBloodGroup(donor.bloodGroup)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Status
                </div>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      statusColor(donor.status),
                    )}
                  >
                    {statusLabel(donor.status)}
                  </span>
                </div>
              </div>

              {/* Type */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Donor Type
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {valOrDash(donor.donorType)}
                </div>
              </div>

              {/* Mobile */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Mobile
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {valOrDash(donor.mobile)}
                </div>
              </div>

              {/* Aadhaar */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Aadhaar
                </div>
                <div className="mt-2 text-sm font-mono font-semibold text-zc-text">
                  {valOrDash(donor.aadhaarNo)}
                </div>
              </div>

              {/* Address */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Address
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {valOrDash(donor.address)}
                </div>
              </div>

              {/* Gender */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Gender
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {valOrDash(donor.gender)}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Date of Birth
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {fmtDate(donor.dateOfBirth)}
                </div>
              </div>

              {/* Total Donations */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Total Donations
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {totalDonations}
                </div>
              </div>

              {/* Last Donation Date */}
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4 md:col-span-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Last Donation Date
                </div>
                <div className="mt-2 text-sm font-semibold text-zc-text">
                  {lastDonation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Buttons */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription className="text-sm">
              Donation, deferral, and screening records for this donor.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["donations", "Donations"],
                  ["deferrals", "Deferrals"],
                  ["screenings", "Screenings"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    activeTab === key
                      ? "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200"
                      : "border-zc-border bg-zc-panel/30 text-zc-muted hover:bg-zc-panel/50 hover:text-zc-text",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Separator />

            {/* Donations Tab */}
            {activeTab === "donations" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Unit#
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Bag Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Collection Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Volume
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!donations.length ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-zc-muted"
                        >
                          No donation records found.
                        </td>
                      </tr>
                    ) : null}

                    {donations.map((d: any) => (
                      <tr
                        key={d.id}
                        className="border-t border-zc-border hover:bg-zc-panel/20"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-zc-text">
                            {valOrDash(d.unitNumber)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {fmtDate(d.collectionDate ?? d.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(d.bagType)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(d.collectionType)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {d.volumeMl ? `${d.volumeMl} ml` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              "border-zc-border bg-zc-panel/30 text-zc-muted",
                            )}
                          >
                            {valOrDash(d.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Deferrals Tab */}
            {activeTab === "deferrals" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Start Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Deferred By
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!deferrals.length ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-zc-muted"
                        >
                          No deferral records found.
                        </td>
                      </tr>
                    ) : null}

                    {deferrals.map((d: any) => (
                      <tr
                        key={d.id}
                        className="border-t border-zc-border hover:bg-zc-panel/20"
                      >
                        <td className="px-4 py-3 text-zc-muted">
                          {fmtDate(d.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              d.deferralType === "PERMANENT"
                                ? "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                                : "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
                            )}
                          >
                            {valOrDash(d.deferralType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(d.reason)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {fmtDate(d.deferFrom ?? d.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {fmtDate(d.deferUntil)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(d.deferredBy ?? d.deferredByName)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Screenings Tab */}
            {activeTab === "screenings" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Hb (g/dL)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Weight (kg)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">BP</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Temperature
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Eligibility
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!screenings.length ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-zc-muted"
                        >
                          No screening records found.
                        </td>
                      </tr>
                    ) : null}

                    {screenings.map((s: any) => (
                      <tr
                        key={s.id}
                        className="border-t border-zc-border hover:bg-zc-panel/20"
                      >
                        <td className="px-4 py-3 text-zc-muted">
                          {fmtDate(s.screeningDate ?? s.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {s.hemoglobin != null ? s.hemoglobin : "-"}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {s.weight != null ? s.weight : "-"}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(s.bloodPressure ?? s.bp)}
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {s.temperature != null ? `${s.temperature} C` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              (s.eligible ?? s.eligibility) === true ||
                                (s.eligible ?? s.eligibility) === "ELIGIBLE"
                                ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                                : "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
                            )}
                          >
                            {(s.eligible ?? s.eligibility) === true ||
                            (s.eligible ?? s.eligibility) === "ELIGIBLE"
                              ? "Eligible"
                              : "Not Eligible"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zc-muted">
                          {valOrDash(s.notes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Bottom Tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                Donor management tip
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Verify donor eligibility before each collection. Check deferral
                status and screening results to ensure compliance with blood
                bank regulations.
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditDonorDialog
        open={editOpen}
        donor={donor}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_DONOR_UPDATE"
      />
    </AppShell>
  );
}
