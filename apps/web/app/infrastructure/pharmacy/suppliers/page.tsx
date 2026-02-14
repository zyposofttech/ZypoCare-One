"use client";

import * as React from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { Loader2, RefreshCw, Truck } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type SupplierRow = {
  id: string;
  supplierCode: string;
  supplierName: string;
  gstin: string | null;
  drugLicenseNumber: string | null;
  drugLicenseExpiry: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  paymentTermsDays: number | null;
};

/* ------------------------------- Helpers ------------------------------- */

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

function fmtDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

function isLicenseExpiringSoon(d: string | null) {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff < 90;
}

/* -------------------------------- Page --------------------------------- */

export default function SuppliersPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_SUPPLIER_READ");
  const canCreate = hasPerm(user, "INFRA_PHARMACY_SUPPLIER_CREATE");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy-suppliers",
    enabled: !!branchId,
  });

  const [rows, setRows] = React.useState<SupplierRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  // Create dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<any>({});
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async (showToast = false) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const data: any = await apiFetch(`/infrastructure/pharmacy/suppliers?${params}`);
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (showToast) {
        toast({ title: "Suppliers refreshed", description: `Loaded ${data.total ?? 0} suppliers.` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchId, q, statusFilter, page]);

  React.useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({});
    setErr(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setErr(null);
    if (!form.supplierName?.trim()) return setErr("Supplier name is required");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/suppliers`, {
        method: "POST",
        body: form,
      });
      setDialogOpen(false);
      setForm({});
      toast({ title: "Supplier Created", description: `Successfully created supplier "${form.supplierName}"`, variant: "success" });
      load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
      toast({ title: "Create failed", description: e?.message || "Create failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Overview stats
  const activeSuppliers = rows.filter((s) => s.status === "ACTIVE").length;
  const expiringLicenses = rows.filter((s) => isLicenseExpiringSoon(s.drugLicenseExpiry)).length;

  return (
    <AppShell title="Infrastructure - Pharmacy Suppliers">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Truck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Suppliers &amp; Vendors</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage pharmaceutical suppliers, licenses, and payment terms.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void load(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate}>
                <IconPlus className="h-4 w-4" />
                Add Supplier
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search suppliers and view compliance details. Add new suppliers to expand your vendor network.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Suppliers</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{total}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Active Suppliers</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{activeSuppliers}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Expiring Licenses</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{expiringLicenses}</div>
                <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                  Within 90 days
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Search by code, name, GSTIN..."
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select value={statusFilter || "ALL"} onValueChange={(v) => { setStatusFilter(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span> of{" "}
                  <span className="font-semibold tabular-nums text-zc-text">{total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Supplier Registry</CardTitle>
            <CardDescription className="text-sm">All registered pharmaceutical suppliers for this branch</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">GSTIN</th>
                  <th className="px-4 py-3 text-left font-semibold">Drug License</th>
                  <th className="px-4 py-3 text-left font-semibold">License Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment Terms</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading suppliers..." : "No suppliers found. Create your first supplier."}
                    </td>
                  </tr>
                ) : null}

                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.supplierCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.supplierName}</div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.gstin || "\u2014"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.drugLicenseNumber || "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      {r.drugLicenseExpiry ? (
                        <span className={cn(
                          "text-sm",
                          isLicenseExpiringSoon(r.drugLicenseExpiry)
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : "text-zc-muted",
                        )}>
                          {fmtDate(r.drugLicenseExpiry)}
                        </span>
                      ) : (
                        <span className="text-zc-muted">{"\u2014"}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-zc-text">{r.contactPerson || "\u2014"}</div>
                      {r.phone ? <div className="mt-0.5 text-xs text-zc-muted">{r.phone}</div> : null}
                      {r.email ? <div className="mt-0.5 text-xs text-zc-muted">{r.email}</div> : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.paymentTermsDays != null ? `${r.paymentTermsDays} days` : "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      {r.status === "ACTIVE" ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          ACTIVE
                        </span>
                      ) : r.status === "BLACKLISTED" ? (
                        <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                          BLACKLISTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/infrastructure/pharmacy/suppliers/${r.id}` as any} title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zc-border px-4 py-3">
              <p className="text-xs text-zc-muted">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Guidance */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Supplier setup guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Register suppliers with valid GSTIN and drug licenses, then 2) Set payment and delivery terms, then 3) Map suppliers to pharmacy stores via indent mapping.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Supplier Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Add Supplier
            </DialogTitle>
            <DialogDescription>
              Register a new pharmaceutical supplier with compliance and contact details.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Basics */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Basics</div>

              <div className="grid gap-2">
                <Label>Supplier Name *</Label>
                <Input
                  value={form.supplierName ?? ""}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="e.g., MedPharma Distributors Pvt. Ltd."
                />
              </div>
            </div>

            <Separator />

            {/* Compliance */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Compliance</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={form.gstin ?? ""}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                    placeholder="15-digit GST number"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Drug License Number</Label>
                  <Input
                    value={form.drugLicenseNumber ?? ""}
                    onChange={(e) => setForm({ ...form, drugLicenseNumber: e.target.value })}
                    placeholder="License number"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Drug License Expiry</Label>
                <Input
                  type="date"
                  value={form.drugLicenseExpiry ?? ""}
                  onChange={(e) => setForm({ ...form, drugLicenseExpiry: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Contact</div>

              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input
                  value={form.contactPerson ?? ""}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Primary contact name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Full business address"
                />
              </div>
            </div>

            <Separator />

            {/* Terms */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Terms</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Payment Terms (days)</Label>
                  <Input
                    type="number"
                    value={form.paymentTermsDays ?? ""}
                    onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) || undefined })}
                    placeholder="e.g., 30"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Delivery Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={form.deliveryLeadTimeDays ?? ""}
                    onChange={(e) => setForm({ ...form, deliveryLeadTimeDays: Number(e.target.value) || undefined })}
                    placeholder="e.g., 7"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Discount Terms</Label>
                <Input
                  value={form.discountTerms ?? ""}
                  onChange={(e) => setForm({ ...form, discountTerms: e.target.value })}
                  placeholder="e.g., 5% flat or slab-based"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreate()}
                disabled={saving || !canCreate}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Supplier
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
