"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "TABLET",
  "CAPSULE",
  "INJECTION",
  "SYRUP",
  "OINTMENT",
  "DROPS",
  "INHALER",
  "SUPPOSITORY",
  "PATCH",
  "POWDER",
  "IV_FLUID",
  "OTHER",
] as const;

const ROUTES = [
  "ORAL",
  "IV",
  "IM",
  "SC",
  "TOPICAL",
  "INHALATION",
  "RECTAL",
  "OPHTHALMIC",
  "NASAL",
  "SUBLINGUAL",
  "TRANSDERMAL",
] as const;

const SCHEDULE_CLASSES = ["GENERAL", "H", "H1", "X", "G"] as const;

const FORMULARY_STATUSES = [
  "APPROVED",
  "RESTRICTED",
  "NON_FORMULARY",
] as const;

const STATUSES = ["ACTIVE", "INACTIVE", "RECALLED"] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DrugInteractionSide {
  id: string;
  drugCode: string;
  genericName: string;
}

interface DrugInteractionAsA {
  drugB: DrugInteractionSide;
  severity: string;
  description: string;
}

interface DrugInteractionAsB {
  drugA: DrugInteractionSide;
  severity: string;
  description: string;
}

interface Drug {
  id: string;
  branchId: string;
  drugCode: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  category: (typeof CATEGORIES)[number];
  dosageForm: string;
  strength: string;
  route: (typeof ROUTES)[number];
  therapeuticClass: string;
  pharmacologicalClass: string;
  scheduleClass: (typeof SCHEDULE_CLASSES)[number];
  isNarcotic: boolean;
  isPsychotropic: boolean;
  isControlled: boolean;
  isAntibiotic: boolean;
  isHighAlert: boolean;
  isLasa: boolean;
  mrp: number;
  purchasePrice: number;
  hsnCode: string;
  gstRate: number;
  packSize: number;
  defaultDosage: unknown;
  maxDailyDose: unknown;
  contraindications: unknown;
  formularyStatus: (typeof FORMULARY_STATUSES)[number];
  status: (typeof STATUSES)[number];
  interactionsAsA: DrugInteractionAsA[];
  interactionsAsB: DrugInteractionAsB[];
}

/* ------------------------------------------------------------------ */
/*  Helper: status / schedule badge variant                            */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "default";
    case "INACTIVE":
    case "NON_FORMULARY":
      return "secondary";
    case "RECALLED":
    case "RESTRICTED":
      return "destructive";
    default:
      return "secondary";
  }
}

function scheduleBadgeVariant(
  sc: string
): "default" | "secondary" | "destructive" {
  return sc === "X" ? "destructive" : "secondary";
}

function severityBadgeVariant(
  severity: string
): "default" | "secondary" | "destructive" {
  switch (severity?.toUpperCase()) {
    case "SEVERE":
    case "MAJOR":
      return "destructive";
    case "MODERATE":
      return "default";
    default:
      return "secondary";
  }
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function labelize(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\s/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function DrugDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { branchId } = useBranchContext();
  const { toast } = useToast();

  const [drug, setDrug] = useState<Drug | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ---- form state ---- */
  const [form, setForm] = useState<Partial<Drug>>({});

  /* ---- fetch ---- */
  const fetchDrug = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await apiFetch(`/infrastructure/pharmacy/drugs/${id}`);
      setDrug(data);
      setForm(data);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load drug details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id && branchId) fetchDrug();
  }, [id, branchId, fetchDrug]);

  /* ---- save ---- */
  const handleSave = async () => {
    setConfirmOpen(false);
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        genericName: form.genericName,
        brandName: form.brandName,
        manufacturer: form.manufacturer,
        category: form.category,
        dosageForm: form.dosageForm,
        strength: form.strength,
        route: form.route,
        therapeuticClass: form.therapeuticClass,
        pharmacologicalClass: form.pharmacologicalClass,
        scheduleClass: form.scheduleClass,
        isNarcotic: form.isNarcotic,
        isPsychotropic: form.isPsychotropic,
        isControlled: form.isControlled,
        isAntibiotic: form.isAntibiotic,
        isHighAlert: form.isHighAlert,
        isLasa: form.isLasa,
        mrp: Number(form.mrp),
        purchasePrice: Number(form.purchasePrice),
        hsnCode: form.hsnCode,
        gstRate: Number(form.gstRate),
        packSize: Number(form.packSize),
        defaultDosage: form.defaultDosage,
        maxDailyDose: form.maxDailyDose,
        contraindications: form.contraindications,
        formularyStatus: form.formularyStatus,
        status: form.status,
      };
      const updated: any = await apiFetch(
        `/infrastructure/pharmacy/drugs/${id}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
      setDrug(updated);
      setForm(updated);
      toast({ title: "Success", description: "Drug record updated." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update drug",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---- form helpers ---- */
  const setField = (key: keyof Drug, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---- interactions merged list ---- */
  const interactions = [
    ...(drug?.interactionsAsA ?? []).map((i) => ({
      otherDrug: i.drugB,
      severity: i.severity,
      description: i.description,
    })),
    ...(drug?.interactionsAsB ?? []).map((i) => ({
      otherDrug: i.drugA,
      severity: i.severity,
      description: i.description,
    })),
  ];

  /* ---- boolean flags list ---- */
  const flags: { key: keyof Drug; label: string }[] = [
    { key: "isNarcotic", label: "Narcotic" },
    { key: "isPsychotropic", label: "Psychotropic" },
    { key: "isControlled", label: "Controlled" },
    { key: "isAntibiotic", label: "Antibiotic" },
    { key: "isHighAlert", label: "High Alert" },
    { key: "isLasa", label: "LASA" },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <AppShell title="Drug Details">
        <RequirePerm perm="INFRA_PHARMACY_DRUG_READ">
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Loading drug details...</p>
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!drug) {
    return (
      <AppShell title="Drug Details">
        <RequirePerm perm="INFRA_PHARMACY_DRUG_READ">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-muted-foreground">Drug not found.</p>
            <Link href="/infrastructure/pharmacy/drugs">
              <Button variant="outline">Back to Drugs</Button>
            </Link>
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  return (
    <AppShell title="Drug Details">
      <RequirePerm perm="INFRA_PHARMACY_DRUG_READ">
        <div className="space-y-6 p-6">
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/infrastructure/pharmacy/drugs">
                <Button variant="ghost" size="sm">
                  &larr; Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{drug.genericName}</h1>
                <p className="text-sm text-muted-foreground">
                  {drug.drugCode}
                  {drug.brandName ? ` — ${drug.brandName}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadgeVariant(drug.status)}>
                {drug.status}
              </Badge>
              <Badge variant={statusBadgeVariant(drug.formularyStatus)}>
                {drug.formularyStatus}
              </Badge>
            </div>
          </div>

          {/* ---- Tabs ---- */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="interactions">
                Interactions ({interactions.length})
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* ======================================================== */}
            {/*  OVERVIEW TAB                                             */}
            {/* ======================================================== */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* -- Identity Card -- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Identity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Row label="Drug Code" value={drug.drugCode} />
                    <Row label="Generic Name" value={drug.genericName} />
                    <Row label="Brand Name" value={drug.brandName || "—"} />
                    <Row
                      label="Manufacturer"
                      value={drug.manufacturer || "—"}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-40">
                        Category
                      </span>
                      <Badge variant="secondary">
                        {labelize(drug.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-40">Status</span>
                      <Badge variant={statusBadgeVariant(drug.status)}>
                        {drug.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* -- Classification Card -- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-40">
                        Schedule
                      </span>
                      <Badge
                        variant={scheduleBadgeVariant(drug.scheduleClass)}
                      >
                        {drug.scheduleClass}
                      </Badge>
                    </div>
                    <Row
                      label="Therapeutic Class"
                      value={drug.therapeuticClass || "—"}
                    />
                    <Row
                      label="Pharmacological Class"
                      value={drug.pharmacologicalClass || "—"}
                    />
                    <Row label="Route" value={drug.route} />
                    <Row
                      label="Dosage Form"
                      value={drug.dosageForm || "—"}
                    />
                    <Row label="Strength" value={drug.strength || "—"} />
                  </CardContent>
                </Card>

                {/* -- Flags Card -- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Flags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {flags.map((f) => {
                        const active = drug[f.key] as boolean;
                        return (
                          <Badge
                            key={f.key}
                            variant={active ? "destructive" : "secondary"}
                            className="justify-center py-1.5"
                          >
                            {f.label}: {active ? "Yes" : "No"}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* -- Pricing Card -- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Row
                      label="MRP"
                      value={
                        drug.mrp != null ? `₹${Number(drug.mrp).toFixed(2)}` : "—"
                      }
                    />
                    <Row
                      label="Purchase Price"
                      value={
                        drug.purchasePrice != null
                          ? `₹${Number(drug.purchasePrice).toFixed(2)}`
                          : "—"
                      }
                    />
                    <Row label="HSN Code" value={drug.hsnCode || "—"} />
                    <Row
                      label="GST Rate"
                      value={
                        drug.gstRate != null ? `${drug.gstRate}%` : "—"
                      }
                    />
                    <Row
                      label="Pack Size"
                      value={drug.packSize != null ? String(drug.packSize) : "—"}
                    />
                  </CardContent>
                </Card>

                {/* -- Dosage Card -- */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Dosage Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Row
                      label="Default Dosage"
                      value={formatJson(drug.defaultDosage)}
                    />
                    <Row
                      label="Max Daily Dose"
                      value={formatJson(drug.maxDailyDose)}
                    />
                    <Row
                      label="Contraindications"
                      value={formatJson(drug.contraindications)}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ======================================================== */}
            {/*  INTERACTIONS TAB                                         */}
            {/* ======================================================== */}
            <TabsContent value="interactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Drug-Drug Interactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {interactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No interactions recorded for this drug.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug Code</TableHead>
                          <TableHead>Generic Name</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interactions.map((ix, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Link
                                href={`/infrastructure/pharmacy/drugs/${ix.otherDrug.id}`}
                                className="text-primary underline"
                              >
                                {ix.otherDrug.drugCode}
                              </Link>
                            </TableCell>
                            <TableCell>{ix.otherDrug.genericName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={severityBadgeVariant(ix.severity)}
                              >
                                {ix.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {ix.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======================================================== */}
            {/*  SETTINGS TAB                                             */}
            {/* ======================================================== */}
            <TabsContent value="settings" className="mt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Drug Record</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* -- Basic fields -- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Generic Name"
                      value={form.genericName ?? ""}
                      onChange={(v) => setField("genericName", v)}
                    />
                    <FormField
                      label="Brand Name"
                      value={form.brandName ?? ""}
                      onChange={(v) => setField("brandName", v)}
                    />
                    <FormField
                      label="Manufacturer"
                      value={form.manufacturer ?? ""}
                      onChange={(v) => setField("manufacturer", v)}
                    />
                    <FormField
                      label="Dosage Form"
                      value={form.dosageForm ?? ""}
                      onChange={(v) => setField("dosageForm", v)}
                    />
                    <FormField
                      label="Strength"
                      value={form.strength ?? ""}
                      onChange={(v) => setField("strength", v)}
                    />
                    <FormField
                      label="Therapeutic Class"
                      value={form.therapeuticClass ?? ""}
                      onChange={(v) => setField("therapeuticClass", v)}
                    />
                    <FormField
                      label="Pharmacological Class"
                      value={form.pharmacologicalClass ?? ""}
                      onChange={(v) => setField("pharmacologicalClass", v)}
                    />
                    <FormField
                      label="HSN Code"
                      value={form.hsnCode ?? ""}
                      onChange={(v) => setField("hsnCode", v)}
                    />
                  </div>

                  {/* -- Select fields -- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormSelect
                      label="Category"
                      value={form.category ?? ""}
                      options={CATEGORIES}
                      onChange={(v) => setField("category", v)}
                    />
                    <FormSelect
                      label="Route"
                      value={form.route ?? ""}
                      options={ROUTES}
                      onChange={(v) => setField("route", v)}
                    />
                    <FormSelect
                      label="Schedule Class"
                      value={form.scheduleClass ?? ""}
                      options={SCHEDULE_CLASSES}
                      onChange={(v) => setField("scheduleClass", v)}
                    />
                    <FormSelect
                      label="Formulary Status"
                      value={form.formularyStatus ?? ""}
                      options={FORMULARY_STATUSES}
                      onChange={(v) => setField("formularyStatus", v)}
                    />
                    <FormSelect
                      label="Status"
                      value={form.status ?? ""}
                      options={STATUSES}
                      onChange={(v) => setField("status", v)}
                    />
                  </div>

                  {/* -- Numeric fields -- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormNumber
                      label="MRP (₹)"
                      value={form.mrp}
                      onChange={(v) => setField("mrp", v)}
                    />
                    <FormNumber
                      label="Purchase Price (₹)"
                      value={form.purchasePrice}
                      onChange={(v) => setField("purchasePrice", v)}
                    />
                    <FormNumber
                      label="GST Rate (%)"
                      value={form.gstRate}
                      onChange={(v) => setField("gstRate", v)}
                    />
                    <FormNumber
                      label="Pack Size"
                      value={form.packSize}
                      onChange={(v) => setField("packSize", v)}
                    />
                  </div>

                  {/* -- Boolean switches -- */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">
                      Compliance Flags
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {flags.map((f) => (
                        <div
                          key={f.key}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <Label htmlFor={f.key} className="text-sm">
                            {f.label}
                          </Label>
                          <Switch
                            id={f.key}
                            checked={!!form[f.key]}
                            onCheckedChange={(checked) =>
                              setField(f.key, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* -- JSON fields -- */}
                  <div className="grid grid-cols-1 gap-4">
                    <FormTextarea
                      label="Default Dosage (JSON)"
                      value={
                        typeof form.defaultDosage === "string"
                          ? form.defaultDosage
                          : JSON.stringify(form.defaultDosage ?? "", null, 2)
                      }
                      onChange={(v) => {
                        try {
                          setField("defaultDosage", JSON.parse(v));
                        } catch {
                          setField("defaultDosage", v);
                        }
                      }}
                    />
                    <FormTextarea
                      label="Max Daily Dose (JSON)"
                      value={
                        typeof form.maxDailyDose === "string"
                          ? form.maxDailyDose
                          : JSON.stringify(form.maxDailyDose ?? "", null, 2)
                      }
                      onChange={(v) => {
                        try {
                          setField("maxDailyDose", JSON.parse(v));
                        } catch {
                          setField("maxDailyDose", v);
                        }
                      }}
                    />
                    <FormTextarea
                      label="Contraindications (JSON)"
                      value={
                        typeof form.contraindications === "string"
                          ? form.contraindications
                          : JSON.stringify(
                              form.contraindications ?? "",
                              null,
                              2
                            )
                      }
                      onChange={(v) => {
                        try {
                          setField("contraindications", JSON.parse(v));
                        } catch {
                          setField("contraindications", v);
                        }
                      }}
                    />
                  </div>

                  {/* -- Actions -- */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setForm(drug)}
                      disabled={saving}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => setConfirmOpen(true)}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* -- Confirm dialog -- */}
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Update</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to update the drug record for{" "}
                    <span className="font-medium">{drug.genericName}</span>?
                  </p>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Confirm"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </RequirePerm>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Presentational sub-components                                      */
/* ------------------------------------------------------------------ */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm font-medium w-40 shrink-0">{label}</span>
      <span className="text-sm text-muted-foreground whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FormNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {labelize(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <textarea
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
