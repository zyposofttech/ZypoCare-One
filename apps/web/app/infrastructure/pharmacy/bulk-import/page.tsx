"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { Loader2, Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type ImportResult = {
  created: number;
  updated?: number;
  errors: Array<{ index: number; error: string }>;
};

/* ------------------------------ Templates ------------------------------ */

const DRUG_TEMPLATE = JSON.stringify(
  [
    {
      drugCode: "DRUG-001",
      genericName: "Paracetamol",
      brandName: "Crocin",
      dosageForm: "TABLET",
      strength: "500mg",
      category: "GENERAL",
    },
  ],
  null,
  2,
);

const SUPPLIER_TEMPLATE = JSON.stringify(
  [
    {
      supplierName: "MedPharma Distributors",
      gstin: "27AADCB2230M1ZT",
      drugLicenseNumber: "DL-2024-001",
      contactPerson: "Dr. Smith",
      phone: "+91 98765 43210",
    },
  ],
  null,
  2,
);

const INTERACTION_TEMPLATE = JSON.stringify(
  [
    {
      drugAId: "drug-id-1",
      drugBId: "drug-id-2",
      severity: "MAJOR",
      description: "Increased bleeding risk",
      source: "STANDARD",
    },
  ],
  null,
  2,
);

/* ----------------------------- Import Card ----------------------------- */

type ImportCardProps = {
  title: string;
  description: string;
  template: string;
  placeholder: string;
  permitted: boolean;
  onImport: (json: string) => Promise<ImportResult>;
};

function ImportCard({
  title,
  description,
  template,
  placeholder,
  permitted,
  onImport,
}: ImportCardProps) {
  const [jsonText, setJsonText] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const handleShowTemplate = () => {
    setJsonText(template);
    setResult(null);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) {
      toast({ title: "Empty input", description: "Paste a JSON array to import.", variant: "warning" });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast({ title: "Invalid JSON", description: "The input is not valid JSON.", variant: "destructive" });
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      toast({
        title: "Invalid format",
        description: "Input must be a non-empty JSON array.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const res = await onImport(jsonText);
      setResult(res);
      if (res.errors.length === 0) {
        toast({
          title: "Import successful",
          description: `${res.created} created${res.updated ? `, ${res.updated} updated` : ""}.`,
          variant: "success",
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${res.created} created, ${res.errors.length} errors.`,
          variant: "warning",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-indigo-500" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <Textarea
          className="min-h-[180px] font-mono text-xs"
          placeholder={placeholder}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setResult(null);
          }}
          disabled={!permitted || importing}
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleShowTemplate}
            disabled={!permitted || importing}
          >
            Show Template
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={!permitted || importing || !jsonText.trim()}
          >
            {importing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import
              </>
            )}
          </Button>
        </div>

        {!permitted && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/50 p-2.5 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>You do not have permission to perform this import.</span>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {result.created} created
                {result.updated ? `, ${result.updated} updated` : ""}
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{result.errors.length} errors</span>
                </div>
                <div className="mt-1 max-h-32 overflow-y-auto text-xs text-zc-muted">
                  {result.errors.map((e, i) => (
                    <div key={i}>
                      Row {e.index + 1}: {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Page --------------------------------- */

export default function BulkImportPage() {
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canImportDrugs = hasPerm(user, "INFRA_PHARMACY_DRUG_CREATE");
  const canImportSuppliers = hasPerm(user, "INFRA_PHARMACY_SUPPLIER_CREATE");
  const canImportInteractions = hasPerm(user, "INFRA_PHARMACY_DRUG_UPDATE");

  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({
    module: "pharmacy-bulk-import",
    enabled: !!branchId,
  });

  /* ------------------------------ Handlers ------------------------------ */

  const handleDrugImport = React.useCallback(
    async (json: string): Promise<ImportResult> => {
      const drugs = JSON.parse(json);
      const res: any = await apiFetch("/infrastructure/pharmacy/drugs/bulk-import", {
        method: "POST",
        body: JSON.stringify({ drugs }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Import failed (${res.status})`);
      }
      return res.json();
    },
    [],
  );

  const handleSupplierImport = React.useCallback(
    async (json: string): Promise<ImportResult> => {
      const suppliers = JSON.parse(json);
      const res: any = await apiFetch("/infrastructure/pharmacy/suppliers/bulk-import", {
        method: "POST",
        body: JSON.stringify({ suppliers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Import failed (${res.status})`);
      }
      return res.json();
    },
    [],
  );

  const handleInteractionImport = React.useCallback(
    async (json: string): Promise<ImportResult> => {
      const interactions = JSON.parse(json);
      const res: any = await apiFetch("/infrastructure/pharmacy/interactions/bulk-import", {
        method: "POST",
        body: JSON.stringify({ interactions }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Import failed (${res.status})`);
      }
      return res.json();
    },
    [],
  );

  /* -------------------------------- View -------------------------------- */

  return (
    <AppShell title="Pharmacy Bulk Import">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zc-text">Bulk Import</h1>
            <p className="text-sm text-zc-muted">
              Import drugs, suppliers, and interactions in bulk using JSON data.
            </p>
          </div>
        </div>

        <Separator />

        {/* AI Page Insights */}
        <PageInsightBanner
          insights={insights}
          loading={insightsLoading}
          onDismiss={dismissInsight}
        />

        {/* Guidance box */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Bulk import guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                Paste a JSON array of records to import. Each record will be validated
                individually. Failed records will be reported with row numbers. Existing
                records with matching codes will be updated.
              </div>
            </div>
          </div>
        </div>

        {/* Import cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <ImportCard
            title="Drug Import"
            description="Import drugs from a JSON array. Each entry requires drugCode, genericName, dosageForm."
            template={DRUG_TEMPLATE}
            placeholder={`[\n  {\n    "drugCode": "DRUG-001",\n    "genericName": "Paracetamol",\n    "dosageForm": "TABLET"\n  }\n]`}
            permitted={canImportDrugs}
            onImport={handleDrugImport}
          />

          <ImportCard
            title="Supplier Import"
            description="Import suppliers from a JSON array. Each entry requires supplierName."
            template={SUPPLIER_TEMPLATE}
            placeholder={`[\n  {\n    "supplierName": "MedPharma Distributors",\n    "gstin": "27AADCB2230M1ZT"\n  }\n]`}
            permitted={canImportSuppliers}
            onImport={handleSupplierImport}
          />

          <ImportCard
            title="Interaction Import"
            description="Import drug interactions from a JSON array. Each entry requires drugAId, drugBId, severity."
            template={INTERACTION_TEMPLATE}
            placeholder={`[\n  {\n    "drugAId": "drug-id-1",\n    "drugBId": "drug-id-2",\n    "severity": "MAJOR"\n  }\n]`}
            permitted={canImportInteractions}
            onImport={handleInteractionImport}
          />
        </div>
      </div>
    </AppShell>
  );
}
