"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Building2,
  ShieldCheck,
  ToggleRight,
  GitBranch,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PharmacistInCharge {
  id: string;
  empCode: string;
  name: string;
  designation: string;
}

interface ParentStore {
  id: string;
  storeCode: string;
  storeName: string;
}

interface ChildStore {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: string;
  status: string;
}

interface DrugLicenseHistoryEntry {
  id: string;
  licenseNumber: string;
  validFrom: string;
  validTo: string;
  documentUrl: string | null;
  createdAt: string;
}

interface OperatingHours {
  [day: string]: { open: string; close: string } | null;
}

interface PharmacyStore {
  id: string;
  branchId: string;
  storeCode: string;
  storeName: string;
  storeType: string;
  status: string;
  parentStoreId: string | null;
  locationNodeId: string | null;
  pharmacistInCharge: PharmacistInCharge | null;
  parentStore: ParentStore | null;
  childStores: ChildStore[];
  drugLicenseNumber: string | null;
  drugLicenseExpiry: string | null;
  is24x7: boolean;
  canDispense: boolean;
  canIndent: boolean;
  canReceiveStock: boolean;
  canReturnVendor: boolean;
  operatingHours: OperatingHours | null;
  autoIndentEnabled: boolean;
  drugLicenseHistory: DrugLicenseHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const STORE_TYPES = [
  "MAIN",
  "IP_PHARMACY",
  "OP_PHARMACY",
  "EMERGENCY",
  "OT_STORE",
  "ICU_STORE",
  "WARD_STORE",
  "NARCOTICS",
] as const;

const STATUSES = ["ACTIVE", "INACTIVE", "UNDER_SETUP"] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
      return "secondary";
    case "UNDER_SETUP":
      return "outline";
    default:
      return "outline";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function storeTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function PharmacyStoreDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { branch } = useBranchContext();
  const { toast } = useToast();

  const [store, setStore] = useState<PharmacyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  /* -- Renewal dialog state -- */
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalSaving, setRenewalSaving] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    licenseNumber: "",
    validFrom: "",
    validTo: "",
    documentUrl: "",
  });

  const authUser = useAuthStore((s) => s.user);
  const canUpdate = hasPerm(authUser, "INFRA_PHARMACY_STORE_UPDATE");

  /* -- Edit form state -- */
  const [editForm, setEditForm] = useState({
    storeName: "",
    storeType: "",
    parentStoreId: "",
    locationNodeId: "",
    drugLicenseNumber: "",
    drugLicenseExpiry: "",
    is24x7: false,
    canDispense: false,
    canIndent: false,
    canReceiveStock: false,
    canReturnVendor: false,
    autoIndentEnabled: false,
  });

  /* -- Fetch store detail -- */
  const fetchStore = useCallback(async () => {
    if (!branch?.id) return;
    setLoading(true);
    try {
      const data = await apiFetch<PharmacyStore>(
        `/infrastructure/pharmacy/stores/${id}`
      );
      setStore(data);
    } catch (err: any) {
      toast({
        title: "Error loading store",
        description: err?.message || "Failed to fetch pharmacy store details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, branch?.id, toast]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  /* -- Open edit dialog, pre-fill form -- */
  function openEditDialog() {
    if (!store) return;
    setEditForm({
      storeName: store.storeName,
      storeType: store.storeType,
      parentStoreId: store.parentStoreId ?? "",
      locationNodeId: store.locationNodeId ?? "",
      drugLicenseNumber: store.drugLicenseNumber ?? "",
      drugLicenseExpiry: store.drugLicenseExpiry
        ? store.drugLicenseExpiry.slice(0, 10)
        : "",
      is24x7: store.is24x7,
      canDispense: store.canDispense,
      canIndent: store.canIndent,
      canReceiveStock: store.canReceiveStock,
      canReturnVendor: store.canReturnVendor,
      autoIndentEnabled: store.autoIndentEnabled,
    });
    setEditOpen(true);
  }

  /* -- Save edits -- */
  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        storeName: editForm.storeName,
        storeType: editForm.storeType,
        is24x7: editForm.is24x7,
        canDispense: editForm.canDispense,
        canIndent: editForm.canIndent,
        canReceiveStock: editForm.canReceiveStock,
        canReturnVendor: editForm.canReturnVendor,
        autoIndentEnabled: editForm.autoIndentEnabled,
      };
      if (editForm.parentStoreId) body.parentStoreId = editForm.parentStoreId;
      if (editForm.locationNodeId)
        body.locationNodeId = editForm.locationNodeId;
      if (editForm.drugLicenseNumber)
        body.drugLicenseNumber = editForm.drugLicenseNumber;
      if (editForm.drugLicenseExpiry)
        body.drugLicenseExpiry = editForm.drugLicenseExpiry;

      await apiFetch(`/infrastructure/pharmacy/stores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      toast({ title: "Store updated", description: "Changes saved successfully." });
      setEditOpen(false);
      fetchStore();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update store.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* -- Change status -- */
  async function handleStatusChange(newStatus: string) {
    if (!store || store.status === newStatus) return;
    setStatusChanging(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/stores/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast({
        title: "Status updated",
        description: `Store status changed to ${newStatus}.`,
      });
      fetchStore();
    } catch (err: any) {
      toast({
        title: "Status change failed",
        description: err?.message || "Could not change store status.",
        variant: "destructive",
      });
    } finally {
      setStatusChanging(false);
    }
  }

  /* -- Save license renewal -- */
  async function handleSaveRenewal() {
    if (!renewalForm.licenseNumber || !renewalForm.validFrom || !renewalForm.validTo) {
      toast({
        title: "Validation error",
        description: "License Number, Valid From, and Valid To are required.",
        variant: "destructive",
      });
      return;
    }
    setRenewalSaving(true);
    try {
      const body: Record<string, unknown> = {
        licenseNumber: renewalForm.licenseNumber,
        validFrom: renewalForm.validFrom,
        validTo: renewalForm.validTo,
      };
      if (renewalForm.documentUrl) body.documentUrl = renewalForm.documentUrl;

      await apiFetch(`/infrastructure/pharmacy/stores/${id}/license-history`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast({ title: "Renewal added", description: "License renewal saved successfully." });
      setRenewalOpen(false);
      setRenewalForm({ licenseNumber: "", validFrom: "", validTo: "", documentUrl: "" });
      fetchStore();
    } catch (err: any) {
      toast({
        title: "Failed to add renewal",
        description: err?.message || "Could not save license renewal.",
        variant: "destructive",
      });
    } finally {
      setRenewalSaving(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  Render                                                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <AppShell>
      <RequirePerm perm="INFRA_PHARMACY_STORE_READ">
        <div className="space-y-6 p-6">
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/infrastructure/pharmacy/stores">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {loading ? "Loading..." : store?.storeName ?? "Store Detail"}
                </h1>
                {store && (
                  <p className="text-sm text-muted-foreground">
                    {store.storeCode}
                  </p>
                )}
              </div>
            </div>

            {store && (
              <div className="flex items-center gap-2">
                {/* Status change dropdown */}
                <Select
                  value={store.status}
                  onValueChange={handleStatusChange}
                  disabled={statusChanging}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={openEditDialog} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* ---- Loading state ---- */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ---- Content ---- */}
          {!loading && store && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="license" className="gap-2">
                  <FileText className="h-4 w-4" />
                  License History
                </TabsTrigger>
              </TabsList>

              {/* ============ Overview Tab ============ */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* -- Basic Info Card -- */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Store Code
                        </span>
                        <span className="text-sm font-medium">
                          {store.storeCode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Store Name
                        </span>
                        <span className="text-sm font-medium">
                          {store.storeName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Store Type
                        </span>
                        <Badge variant="outline">
                          {storeTypeLabel(store.storeType)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Status
                        </span>
                        <Badge variant={statusBadgeVariant(store.status)}>
                          {store.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Created
                        </span>
                        <span className="text-sm">
                          {formatDateTime(store.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Last Updated
                        </span>
                        <span className="text-sm">
                          {formatDateTime(store.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* -- License & Compliance Card -- */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4" />
                        License &amp; Compliance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Drug License Number
                        </span>
                        <span className="text-sm font-medium">
                          {store.drugLicenseNumber || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          License Expiry
                        </span>
                        <span className="text-sm">
                          {formatDate(store.drugLicenseExpiry)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Pharmacist In Charge
                        </span>
                        <span className="text-sm font-medium">
                          {store.pharmacistInCharge
                            ? `${store.pharmacistInCharge.name} (${store.pharmacistInCharge.empCode})`
                            : "—"}
                        </span>
                      </div>
                      {store.pharmacistInCharge?.designation && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Designation
                          </span>
                          <span className="text-sm">
                            {store.pharmacistInCharge.designation}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* -- Capabilities Card -- */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ToggleRight className="h-4 w-4" />
                        Capabilities
                      </CardTitle>
                      <CardDescription>
                        Store operational capabilities (read-only)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: "24x7 Operations", value: store.is24x7 },
                        { label: "Can Dispense", value: store.canDispense },
                        { label: "Can Indent", value: store.canIndent },
                        {
                          label: "Can Receive Stock",
                          value: store.canReceiveStock,
                        },
                        {
                          label: "Can Return to Vendor",
                          value: store.canReturnVendor,
                        },
                        {
                          label: "Auto Indent Enabled",
                          value: store.autoIndentEnabled,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{label}</span>
                          <Switch checked={value} disabled />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* -- Parent / Child Stores Card -- */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <GitBranch className="h-4 w-4" />
                        Store Hierarchy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Parent store */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Parent Store
                        </p>
                        {store.parentStore ? (
                          <Link
                            href={`/infrastructure/pharmacy/stores/${store.parentStore.id}`}
                            className="text-sm text-primary underline-offset-4 hover:underline"
                          >
                            {store.parentStore.storeName} (
                            {store.parentStore.storeCode})
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            None (top-level store)
                          </span>
                        )}
                      </div>

                      {/* Child stores */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Child Stores ({store.childStores.length})
                        </p>
                        {store.childStores.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            No child stores
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {store.childStores.map((child) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between rounded-md border p-2"
                              >
                                <div>
                                  <Link
                                    href={`/infrastructure/pharmacy/stores/${child.id}`}
                                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    {child.storeName}
                                  </Link>
                                  <p className="text-xs text-muted-foreground">
                                    {child.storeCode} &middot;{" "}
                                    {storeTypeLabel(child.storeType)}
                                  </p>
                                </div>
                                <Badge
                                  variant={statusBadgeVariant(child.status)}
                                >
                                  {child.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* -- Operating Hours -- */}
                {store.operatingHours && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Operating Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                        {Object.entries(store.operatingHours).map(
                          ([day, hours]) => (
                            <div
                              key={day}
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <span className="text-sm font-medium capitalize">
                                {day}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {hours
                                  ? `${hours.open} - ${hours.close}`
                                  : "Closed"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ============ License History Tab ============ */}
              <TabsContent value="license" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          Drug License History
                        </CardTitle>
                        <CardDescription>
                          Historical record of drug licenses for this store
                        </CardDescription>
                      </div>
                      {canUpdate && (
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => setRenewalOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Add Renewal
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {store.drugLicenseHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No license history records found.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                                License Number
                              </th>
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                                Valid From
                              </th>
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                                Valid To
                              </th>
                              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                                Document
                              </th>
                              <th className="py-2 text-left font-medium text-muted-foreground">
                                Created
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {store.drugLicenseHistory.map((entry) => (
                              <tr key={entry.id} className="border-b last:border-0">
                                <td className="py-2 pr-4 font-medium">
                                  {entry.licenseNumber}
                                </td>
                                <td className="py-2 pr-4">
                                  {formatDate(entry.validFrom)}
                                </td>
                                <td className="py-2 pr-4">
                                  {formatDate(entry.validTo)}
                                </td>
                                <td className="py-2 pr-4">
                                  {entry.documentUrl ? (
                                    <a
                                      href={entry.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline-offset-4 hover:underline"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="py-2">
                                  {formatDateTime(entry.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* ---- Not found state ---- */}
          {!loading && !store && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Pharmacy store not found.
                </p>
                <Link href="/infrastructure/pharmacy/stores">
                  <Button variant="outline">Back to Stores</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* ================================================================ */}
          {/*  Edit Dialog                                                     */}
          {/* ================================================================ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Pharmacy Store</DialogTitle>
                <DialogDescription>
                  Update store details. Store code cannot be changed.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Store Name */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-storeName">Store Name</Label>
                  <Input
                    id="edit-storeName"
                    value={editForm.storeName}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, storeName: e.target.value }))
                    }
                    placeholder="e.g. Main Pharmacy"
                  />
                </div>

                {/* Store Type */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-storeType">Store Type</Label>
                  <Select
                    value={editForm.storeType}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, storeType: v }))
                    }
                  >
                    <SelectTrigger id="edit-storeType">
                      <SelectValue placeholder="Select store type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {storeTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Parent Store ID */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-parentStoreId">
                    Parent Store ID (optional)
                  </Label>
                  <Input
                    id="edit-parentStoreId"
                    value={editForm.parentStoreId}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        parentStoreId: e.target.value,
                      }))
                    }
                    placeholder="UUID of parent store"
                  />
                </div>

                {/* Location Node ID */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-locationNodeId">
                    Location Node ID (optional)
                  </Label>
                  <Input
                    id="edit-locationNodeId"
                    value={editForm.locationNodeId}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        locationNodeId: e.target.value,
                      }))
                    }
                    placeholder="UUID of location node"
                  />
                </div>

                {/* Drug License Number */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-drugLicenseNumber">
                    Drug License Number
                  </Label>
                  <Input
                    id="edit-drugLicenseNumber"
                    value={editForm.drugLicenseNumber}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        drugLicenseNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. DL-2024-12345"
                  />
                </div>

                {/* Drug License Expiry */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-drugLicenseExpiry">
                    Drug License Expiry
                  </Label>
                  <Input
                    id="edit-drugLicenseExpiry"
                    type="date"
                    value={editForm.drugLicenseExpiry}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        drugLicenseExpiry: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Capability toggles */}
                <div className="space-y-4 pt-2">
                  <p className="text-sm font-medium">Capabilities</p>

                  {(
                    [
                      ["is24x7", "24x7 Operations"],
                      ["canDispense", "Can Dispense"],
                      ["canIndent", "Can Indent"],
                      ["canReceiveStock", "Can Receive Stock"],
                      ["canReturnVendor", "Can Return to Vendor"],
                      ["autoIndentEnabled", "Auto Indent Enabled"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <Label htmlFor={`edit-${key}`} className="text-sm">
                        {label}
                      </Label>
                      <Switch
                        id={`edit-${key}`}
                        checked={editForm[key]}
                        onCheckedChange={(checked) =>
                          setEditForm((f) => ({ ...f, [key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ================================================================ */}
          {/*  Renewal Dialog                                                  */}
          {/* ================================================================ */}
          <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add License Renewal</DialogTitle>
                <DialogDescription>
                  Record a new drug license renewal for this store.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="renewal-licenseNumber">License Number</Label>
                  <Input
                    id="renewal-licenseNumber"
                    value={renewalForm.licenseNumber}
                    onChange={(e) =>
                      setRenewalForm((f) => ({ ...f, licenseNumber: e.target.value }))
                    }
                    placeholder="e.g. DL-2025-67890"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="renewal-validFrom">Valid From</Label>
                  <Input
                    id="renewal-validFrom"
                    type="date"
                    value={renewalForm.validFrom}
                    onChange={(e) =>
                      setRenewalForm((f) => ({ ...f, validFrom: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="renewal-validTo">Valid To</Label>
                  <Input
                    id="renewal-validTo"
                    type="date"
                    value={renewalForm.validTo}
                    onChange={(e) =>
                      setRenewalForm((f) => ({ ...f, validTo: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="renewal-documentUrl">
                    Document URL (optional)
                  </Label>
                  <Input
                    id="renewal-documentUrl"
                    value={renewalForm.documentUrl}
                    onChange={(e) =>
                      setRenewalForm((f) => ({ ...f, documentUrl: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRenewalOpen(false)}
                  disabled={renewalSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveRenewal} disabled={renewalSaving}>
                  {renewalSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
