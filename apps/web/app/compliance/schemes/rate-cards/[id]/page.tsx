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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

/* ---------- Types ---------- */

type RateCardDetail = {
  id: string;
  version: string;
  scheme: string;
  status: "DRAFT" | "ACTIVE" | "FROZEN";
  effectiveFrom: string;
  effectiveTo: string | null;
  itemCount: number;
};

type RateCardItem = {
  id: string;
  code: string;
  name: string;
  rate: number;
  inclusions: string | null;
  exclusions: string | null;
};

type ItemsResponse = {
  items: RateCardItem[];
  nextCursor: string | null;
  total: number;
};

/* ---------- Helpers ---------- */

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "DRAFT":
      return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "FROZEN":
      return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
    default:
      return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* ---------- Component ---------- */

export default function RateCardDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  /* -- State -- */
  const [rateCard, setRateCard] = React.useState<RateCardDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<RateCardItem[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [totalItems, setTotalItems] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editItem, setEditItem] = React.useState<RateCardItem | null>(null);
  const [editForm, setEditForm] = React.useState({
    code: "",
    name: "",
    rate: "",
    inclusions: "",
    exclusions: "",
  });

  const isFrozen = rateCard?.status === "FROZEN";

  /* -- Data fetching -- */
  const fetchRateCard = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<RateCardDetail & { rateCard?: RateCardDetail }>(
        `/api/compliance/schemes/rate-cards/${id}`,
      );
      setRateCard(res.rateCard ?? res);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchItems = React.useCallback(
    async (cursor?: string | null, append = false) => {
      if (!id) return;
      if (!append) setItemsLoading(true);
      else setLoadingMore(true);
      try {
        const p = new URLSearchParams();
        if (cursor) p.set("cursor", cursor);
        if (searchQuery.trim()) p.set("search", searchQuery.trim());
        const qs = p.toString();
        const res = await apiFetch<ItemsResponse>(
          `/api/compliance/schemes/rate-cards/${id}/items${qs ? `?${qs}` : ""}`,
        );
        if (append) setItems((prev) => [...prev, ...(res.items ?? [])]);
        else setItems(res.items ?? []);
        setNextCursor(res.nextCursor ?? null);
        setTotalItems(res.total ?? 0);
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setItemsLoading(false);
        setLoadingMore(false);
      }
    },
    [id, searchQuery],
  );

  React.useEffect(() => {
    fetchRateCard();
  }, [fetchRateCard]);
  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* -- Actions -- */
  const handleFreeze = async () => {
    if (!id) return;
    try {
      await apiFetch(`/api/compliance/schemes/rate-cards/${id}/freeze`, {
        method: "POST",
        body: {},
      });
      toast({ title: "Success", description: "Rate card frozen." });
      fetchRateCard();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: "Validation",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch(
        `/api/compliance/schemes/rate-cards/${id}/items/bulk-upload`,
        { method: "POST", body: formData },
      );
      toast({ title: "Success", description: "Bulk upload completed." });
      setUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchItems();
      fetchRateCard();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (item: RateCardItem) => {
    setEditItem(item);
    setEditForm({
      code: item.code,
      name: item.name,
      rate: String(item.rate),
      inclusions: item.inclusions || "",
      exclusions: item.exclusions || "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    if (!editForm.name.trim()) {
      toast({
        title: "Validation",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }
    const rateNum = parseFloat(editForm.rate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast({
        title: "Validation",
        description: "Rate must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }
    setEditSaving(true);
    try {
      await apiFetch(
        `/api/compliance/schemes/rate-cards/${id}/items/${editItem.id}`,
        {
          method: "PATCH",
          body: {
            code: editForm.code.trim(),
            name: editForm.name.trim(),
            rate: rateNum,
            inclusions: editForm.inclusions.trim() || null,
            exclusions: editForm.exclusions.trim() || null,
          },
        },
      );
      toast({ title: "Success", description: "Item updated." });
      setEditOpen(false);
      setEditItem(null);
      fetchItems();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const searchTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 300);
  };

  /* ---------- Render ---------- */

  return (
    <AppShell title="Rate Card Detail">
      <RequirePerm perm="COMPLIANCE_SCHEME_RATECARD_CREATE">
      <div className="grid gap-6">
        {/* ── Loading / Not Found ───────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        ) : !rateCard ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <FileText className="h-10 w-10 text-zc-muted/50" />
            <p className="text-sm text-zc-muted">Rate card not found.</p>
            <Link href="/compliance/schemes">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Schemes
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <Link href="/compliance/schemes">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-2xl border-zc-border"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                  <FileText className="h-5 w-5 text-zc-accent" />
                </span>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold tracking-tight">
                    {rateCard.scheme} Rate Card &mdash; {rateCard.version}
                  </div>
                  <div className="mt-1 text-sm text-zc-muted">
                    {fmtDate(rateCard.effectiveFrom)}
                    {rateCard.effectiveTo
                      ? ` to ${fmtDate(rateCard.effectiveTo)}`
                      : " (no end date)"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    statusBadgeClass(rateCard.status),
                  )}
                >
                  {rateCard.status}
                </span>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    fetchRateCard();
                    fetchItems();
                  }}
                  disabled={loading || itemsLoading}
                >
                  <RefreshCw
                    className={
                      loading || itemsLoading
                        ? "h-4 w-4 animate-spin"
                        : "h-4 w-4"
                    }
                  />
                  Refresh
                </Button>
                {!isFrozen && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleFreeze}
                  >
                    <Lock className="h-4 w-4" />
                    Freeze
                  </Button>
                )}
              </div>
            </div>

            {/* ── Stat Boxes ──────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Version
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {rateCard.version}
                </div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  Scheme
                </div>
                <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">
                  {rateCard.scheme}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Status
                </div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
                  {rateCard.status}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Total Items
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {rateCard.itemCount}
                </div>
              </div>
            </div>

            {/* ── Items Table ─────────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Items</CardTitle>
                    <CardDescription>
                      {totalItems} item{totalItems !== 1 ? "s" : ""} in this
                      rate card
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zc-muted" />
                      <Input
                        className="pl-10 w-64"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                      />
                    </div>
                    {!isFrozen && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setUploadOpen(true)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Bulk Upload
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <Separator />

              {itemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
                </div>
              ) : items.length === 0 ? (
                <CardContent className="py-10 text-center text-sm text-zc-muted">
                  {searchQuery
                    ? "No items match your search."
                    : "No items in this rate card. Use Bulk Upload to add items."}
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Code
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Name
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Rate
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Inclusions
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Exclusions
                        </th>
                        {!isFrozen && (
                          <th className="px-4 py-3 text-right font-semibold">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-zc-border hover:bg-zc-panel/20"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-zc-text">
                            {item.code}
                          </td>
                          <td className="px-4 py-3 font-medium text-zc-text">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-zc-text">
                            {fmtCurrency(item.rate)}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-xs text-zc-muted">
                            {item.inclusions || "-"}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-xs text-zc-muted">
                            {item.exclusions || "-"}
                          </td>
                          {!isFrozen && (
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => openEditDialog(item)}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {nextCursor && (
                <>
                  <Separator />
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingMore}
                      onClick={() => fetchItems(nextCursor, true)}
                      className="gap-2"
                    >
                      {loadingMore && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Load More
                    </Button>
                  </div>
                </>
              )}
            </Card>

            {/* ── Info Callout ─────────────────────────────────────────── */}
            {isFrozen && (
              <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
                <div className="text-sm font-semibold text-zc-text">
                  Rate Card Frozen
                </div>
                <div className="mt-1 text-sm text-zc-muted">
                  This rate card has been frozen and can no longer be edited.
                  Create a new version if changes are needed.
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Bulk Upload Dialog ─────────────────────────────────────── */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Upload Items</DialogTitle>
              <DialogDescription>
                Upload a CSV file with columns: code, name, rate, inclusions,
                exclusions.
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV File *</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  disabled={uploading}
                />
              </div>
              <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-4 text-xs text-zc-muted">
                The CSV should have a header row. Existing items with matching
                codes will be updated.
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkUpload}
                disabled={uploading}
                className="gap-2"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Item Dialog ───────────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Update rate card item details.
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="editCode">Code</Label>
                <Input
                  id="editCode"
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="Item code"
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editName">Name *</Label>
                <Input
                  id="editName"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Item name"
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRate">Rate (INR) *</Label>
                <Input
                  id="editRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.rate}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, rate: e.target.value }))
                  }
                  placeholder="0.00"
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editInclusions">Inclusions</Label>
                <Input
                  id="editInclusions"
                  value={editForm.inclusions}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, inclusions: e.target.value }))
                  }
                  placeholder="e.g. Pre-op investigations, OT charges"
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExclusions">Exclusions</Label>
                <Input
                  id="editExclusions"
                  value={editForm.exclusions}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, exclusions: e.target.value }))
                  }
                  placeholder="e.g. Implant cost, post-op medicine"
                  disabled={editSaving}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditSave}
                disabled={editSaving}
                className="gap-2"
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
