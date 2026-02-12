"use client";

import { useEffect, useState } from "react";
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Package, Star, Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PharmacyStore {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: string;
  status: string;
}

interface StoreMapping {
  pharmacyStore: PharmacyStore;
}

interface Supplier {
  id: string;
  branchId: string;
  supplierCode: string;
  supplierName: string;
  status: "ACTIVE" | "BLACKLISTED" | "INACTIVE";
  gstin: string | null;
  drugLicenseNumber: string | null;
  drugLicenseExpiry: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTermsDays: number | null;
  discountTerms: string | null;
  deliveryLeadTimeDays: number | null;
  productCategories: string[];
  rating: number | null;
  storeMappings: StoreMapping[];
  createdAt: string;
  updatedAt: string;
}

interface EditForm {
  supplierName: string;
  status: "ACTIVE" | "BLACKLISTED" | "INACTIVE";
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  drugLicenseNumber: string;
  drugLicenseExpiry: string;
  paymentTermsDays: string;
  discountTerms: string;
  deliveryLeadTimeDays: string;
  rating: string;
}

interface DrugMaster {
  id: string;
  drugCode: string;
  genericName: string;
  brandName: string;
  strength: string;
  dosageForm: string;
}

interface DrugMapping {
  id: string;
  supplierPrice: number;
  leadTimeDays: number;
  isPreferred: boolean;
  drug: DrugMaster;
}

interface DrugMappingForm {
  drugMasterId: string;
  supplierPrice: string;
  leadTimeDays: string;
  isPreferred: boolean;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "default" as const;
    case "BLACKLISTED":
      return "destructive" as const;
    case "INACTIVE":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

function renderRating(rating: number | null) {
  if (rating === null || rating === undefined) return "Not rated";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("½");
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) stars.push("☆");
  return `${stars.join("")} (${rating.toFixed(1)})`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { branch } = useBranchContext();
  const { toast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    supplierName: "",
    status: "ACTIVE",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    drugLicenseNumber: "",
    drugLicenseExpiry: "",
    paymentTermsDays: "",
    discountTerms: "",
    deliveryLeadTimeDays: "",
    rating: "",
  });

  // Drug Mappings state
  const [drugMappings, setDrugMappings] = useState<DrugMapping[]>([]);
  const [drugMappingsLoading, setDrugMappingsLoading] = useState(false);
  const [addDrugOpen, setAddDrugOpen] = useState(false);
  const [addingDrug, setAddingDrug] = useState(false);
  const [deletingDrugId, setDeletingDrugId] = useState<string | null>(null);
  const [drugForm, setDrugForm] = useState<DrugMappingForm>({
    drugMasterId: "",
    supplierPrice: "",
    leadTimeDays: "",
    isPreferred: false,
  });

  const fetchDrugMappings = async () => {
    try {
      setDrugMappingsLoading(true);
      const data = await apiFetch(
        `/infrastructure/pharmacy/suppliers/${id}/drugs`
      );
      setDrugMappings(data.mappings || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load drug mappings.",
        variant: "destructive",
      });
    } finally {
      setDrugMappingsLoading(false);
    }
  };

  const handleAddDrugMapping = async () => {
    try {
      setAddingDrug(true);
      await apiFetch(
        `/infrastructure/pharmacy/suppliers/${id}/drug-mappings`,
        {
          method: "POST",
          body: JSON.stringify({
            mappings: [
              {
                drugMasterId: drugForm.drugMasterId,
                supplierPrice: parseFloat(drugForm.supplierPrice),
                leadTimeDays: parseInt(drugForm.leadTimeDays, 10),
                isPreferred: drugForm.isPreferred,
              },
            ],
          }),
        }
      );
      setAddDrugOpen(false);
      setDrugForm({
        drugMasterId: "",
        supplierPrice: "",
        leadTimeDays: "",
        isPreferred: false,
      });
      toast({
        title: "Success",
        description: "Drug mapping added successfully.",
      });
      fetchDrugMappings();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to add drug mapping.",
        variant: "destructive",
      });
    } finally {
      setAddingDrug(false);
    }
  };

  const handleDeleteDrugMapping = async (mappingId: string) => {
    try {
      setDeletingDrugId(mappingId);
      await apiFetch(
        `/infrastructure/pharmacy/suppliers/${id}/drug-mappings/${mappingId}`,
        { method: "DELETE" }
      );
      toast({
        title: "Success",
        description: "Drug mapping removed successfully.",
      });
      fetchDrugMappings();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete drug mapping.",
        variant: "destructive",
      });
    } finally {
      setDeletingDrugId(null);
    }
  };

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/infrastructure/pharmacy/suppliers/${id}`);
      setSupplier(data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load supplier details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && branch?.id) {
      fetchSupplier();
      fetchDrugMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, branch?.id]);

  const openEditDialog = () => {
    if (!supplier) return;
    setEditForm({
      supplierName: supplier.supplierName || "",
      status: supplier.status,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstin: supplier.gstin || "",
      drugLicenseNumber: supplier.drugLicenseNumber || "",
      drugLicenseExpiry: supplier.drugLicenseExpiry
        ? supplier.drugLicenseExpiry.slice(0, 10)
        : "",
      paymentTermsDays:
        supplier.paymentTermsDays !== null
          ? String(supplier.paymentTermsDays)
          : "",
      discountTerms: supplier.discountTerms || "",
      deliveryLeadTimeDays:
        supplier.deliveryLeadTimeDays !== null
          ? String(supplier.deliveryLeadTimeDays)
          : "",
      rating: supplier.rating !== null ? String(supplier.rating) : "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const body: Record<string, any> = {
        supplierName: editForm.supplierName,
        status: editForm.status,
        contactPerson: editForm.contactPerson || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        address: editForm.address || null,
        gstin: editForm.gstin || null,
        drugLicenseNumber: editForm.drugLicenseNumber || null,
        drugLicenseExpiry: editForm.drugLicenseExpiry || null,
        paymentTermsDays: editForm.paymentTermsDays
          ? parseInt(editForm.paymentTermsDays, 10)
          : null,
        discountTerms: editForm.discountTerms || null,
        deliveryLeadTimeDays: editForm.deliveryLeadTimeDays
          ? parseInt(editForm.deliveryLeadTimeDays, 10)
          : null,
        rating: editForm.rating ? parseFloat(editForm.rating) : null,
      };

      const updated = await apiFetch(
        `/infrastructure/pharmacy/suppliers/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );

      setSupplier(updated);
      setEditOpen(false);
      toast({
        title: "Success",
        description: "Supplier updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update supplier.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppShell>
      <RequirePerm perm="INFRA_PHARMACY_SUPPLIER_READ">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/infrastructure/pharmacy/suppliers">
                <Button variant="outline" size="sm">
                  ← Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {loading
                    ? "Loading..."
                    : supplier?.supplierName || "Supplier Detail"}
                </h1>
                {supplier && (
                  <p className="text-sm text-muted-foreground">
                    Code: {supplier.supplierCode}
                  </p>
                )}
              </div>
            </div>
            {supplier && (
              <Button onClick={openEditDialog}>Edit Supplier</Button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading supplier details...</p>
            </div>
          )}

          {!loading && !supplier && (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Supplier not found.</p>
            </div>
          )}

          {!loading && supplier && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="drug-mappings" className="gap-1.5">
                  <Package className="h-4 w-4" />
                  Drug Mappings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Supplier identity and status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Supplier Code
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.supplierCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Supplier Name
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.supplierName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge variant={statusBadgeVariant(supplier.status)}>
                      {supplier.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Rating
                    </span>
                    <span className="text-sm font-medium">
                      {renderRating(supplier.rating)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Product Categories
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {supplier.productCategories &&
                      supplier.productCategories.length > 0 ? (
                        supplier.productCategories.map((cat, idx) => (
                          <Badge key={idx} variant="outline">
                            {cat}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created
                    </span>
                    <span className="text-sm">
                      {formatDate(supplier.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Updated
                    </span>
                    <span className="text-sm">
                      {formatDate(supplier.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Primary contact details for this supplier
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Contact Person
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.contactPerson || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Phone
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Email
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.email || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Address
                    </span>
                    <span className="text-sm font-medium text-right max-w-[60%]">
                      {supplier.address || "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* License & Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle>License & Compliance</CardTitle>
                  <CardDescription>
                    Regulatory and tax information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">GSTIN</span>
                    <span className="text-sm font-medium font-mono">
                      {supplier.gstin || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Drug License Number
                    </span>
                    <span className="text-sm font-medium font-mono">
                      {supplier.drugLicenseNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Drug License Expiry
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(supplier.drugLicenseExpiry)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Terms */}
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                  <CardDescription>
                    Payment, discount, and delivery terms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Payment Terms
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.paymentTermsDays !== null
                        ? `${supplier.paymentTermsDays} days`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Discount Terms
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.discountTerms || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Delivery Lead Time
                    </span>
                    <span className="text-sm font-medium">
                      {supplier.deliveryLeadTimeDays !== null
                        ? `${supplier.deliveryLeadTimeDays} days`
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Store Mappings */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Store Mappings</CardTitle>
                  <CardDescription>
                    Pharmacy stores linked to this supplier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {supplier.storeMappings &&
                  supplier.storeMappings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store Code</TableHead>
                          <TableHead>Store Name</TableHead>
                          <TableHead>Store Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplier.storeMappings.map((mapping) => (
                          <TableRow key={mapping.pharmacyStore.id}>
                            <TableCell className="font-mono text-sm">
                              {mapping.pharmacyStore.storeCode}
                            </TableCell>
                            <TableCell>
                              {mapping.pharmacyStore.storeName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {mapping.pharmacyStore.storeType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusBadgeVariant(
                                  mapping.pharmacyStore.status
                                )}
                              >
                                {mapping.pharmacyStore.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No stores mapped to this supplier.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
              </TabsContent>

              <TabsContent value="drug-mappings">
                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>Drug Mappings</CardTitle>
                      <CardDescription>
                        Drugs supplied by this vendor with pricing and lead times
                      </CardDescription>
                    </div>
                    <RequirePerm perm="INFRA_PHARMACY_SUPPLIER_WRITE">
                      <Button
                        size="sm"
                        onClick={() => setAddDrugOpen(true)}
                        className="gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Mapping
                      </Button>
                    </RequirePerm>
                  </CardHeader>
                  <CardContent>
                    {drugMappingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-muted-foreground">
                          Loading drug mappings...
                        </p>
                      </div>
                    ) : drugMappings.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Drug Code</TableHead>
                            <TableHead>Generic Name</TableHead>
                            <TableHead>Brand Name</TableHead>
                            <TableHead className="text-right">
                              Supplier Price
                            </TableHead>
                            <TableHead className="text-right">
                              Lead Time (days)
                            </TableHead>
                            <TableHead className="text-center">
                              Preferred
                            </TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {drugMappings.map((mapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell className="font-mono text-sm">
                                {mapping.drug.drugCode}
                              </TableCell>
                              <TableCell>{mapping.drug.genericName}</TableCell>
                              <TableCell>{mapping.drug.brandName}</TableCell>
                              <TableCell className="text-right">
                                {mapping.supplierPrice != null
                                  ? `₹${Number(mapping.supplierPrice).toFixed(2)}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {mapping.leadTimeDays ?? "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {mapping.isPreferred ? (
                                  <Star className="h-4 w-4 inline-block fill-yellow-400 text-yellow-400" />
                                ) : (
                                  <Star className="h-4 w-4 inline-block text-muted-foreground/30" />
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <RequirePerm perm="INFRA_PHARMACY_SUPPLIER_WRITE">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    disabled={deletingDrugId === mapping.id}
                                    onClick={() =>
                                      handleDeleteDrugMapping(mapping.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </RequirePerm>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No drug mappings found for this supplier.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-supplierName">Supplier Name</Label>
                  <Input
                    id="edit-supplierName"
                    value={editForm.supplierName}
                    onChange={(e) =>
                      updateField("supplierName", e.target.value)
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) =>
                      updateField(
                        "status",
                        val as "ACTIVE" | "BLACKLISTED" | "INACTIVE"
                      )
                    }
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contactPerson">Contact Person</Label>
                    <Input
                      id="edit-contactPerson"
                      value={editForm.contactPerson}
                      onChange={(e) =>
                        updateField("contactPerson", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-gstin">GSTIN</Label>
                    <Input
                      id="edit-gstin"
                      value={editForm.gstin}
                      onChange={(e) => updateField("gstin", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-drugLicenseNumber">
                      Drug License Number
                    </Label>
                    <Input
                      id="edit-drugLicenseNumber"
                      value={editForm.drugLicenseNumber}
                      onChange={(e) =>
                        updateField("drugLicenseNumber", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-drugLicenseExpiry">
                    Drug License Expiry
                  </Label>
                  <Input
                    id="edit-drugLicenseExpiry"
                    type="date"
                    value={editForm.drugLicenseExpiry}
                    onChange={(e) =>
                      updateField("drugLicenseExpiry", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-paymentTermsDays">
                      Payment Terms (days)
                    </Label>
                    <Input
                      id="edit-paymentTermsDays"
                      type="number"
                      value={editForm.paymentTermsDays}
                      onChange={(e) =>
                        updateField("paymentTermsDays", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-discountTerms">Discount Terms</Label>
                    <Input
                      id="edit-discountTerms"
                      value={editForm.discountTerms}
                      onChange={(e) =>
                        updateField("discountTerms", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-deliveryLeadTimeDays">
                      Lead Time (days)
                    </Label>
                    <Input
                      id="edit-deliveryLeadTimeDays"
                      type="number"
                      value={editForm.deliveryLeadTimeDays}
                      onChange={(e) =>
                        updateField("deliveryLeadTimeDays", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-rating">Rating (0-5)</Label>
                  <Input
                    id="edit-rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={editForm.rating}
                    onChange={(e) => updateField("rating", e.target.value)}
                  />
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
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Drug Mapping Dialog */}
          <Dialog open={addDrugOpen} onOpenChange={setAddDrugOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Drug Mapping</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="drug-drugMasterId">Drug ID</Label>
                  <Input
                    id="drug-drugMasterId"
                    placeholder="Enter Drug Master ID"
                    value={drugForm.drugMasterId}
                    onChange={(e) =>
                      setDrugForm((prev) => ({
                        ...prev,
                        drugMasterId: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="drug-supplierPrice">Supplier Price</Label>
                  <Input
                    id="drug-supplierPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={drugForm.supplierPrice}
                    onChange={(e) =>
                      setDrugForm((prev) => ({
                        ...prev,
                        supplierPrice: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="drug-leadTimeDays">Lead Time (days)</Label>
                  <Input
                    id="drug-leadTimeDays"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={drugForm.leadTimeDays}
                    onChange={(e) =>
                      setDrugForm((prev) => ({
                        ...prev,
                        leadTimeDays: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="drug-isPreferred"
                    checked={drugForm.isPreferred}
                    onCheckedChange={(checked) =>
                      setDrugForm((prev) => ({
                        ...prev,
                        isPreferred: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="drug-isPreferred" className="cursor-pointer">
                    Mark as preferred supplier for this drug
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDrugOpen(false)}
                  disabled={addingDrug}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDrugMapping}
                  disabled={
                    addingDrug ||
                    !drugForm.drugMasterId ||
                    !drugForm.supplierPrice
                  }
                >
                  {addingDrug ? "Adding..." : "Add Mapping"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
