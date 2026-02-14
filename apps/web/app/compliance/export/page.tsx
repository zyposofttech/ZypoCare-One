"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { IconReceipt } from "@/components/icons";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  Loader2,
  Package,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type ExportFormat = "json" | "csv";

type ExportSection = {
  id: string;
  label: string;
  description: string;
};

/* ----------------------------- Constants ----------------------------- */

const EXPORT_SECTIONS: ExportSection[] = [
  {
    id: "abdm_config",
    label: "ABDM Config",
    description: "ABHA, HFR, and HPR configuration data",
  },
  {
    id: "scheme_empanelments",
    label: "Scheme Empanelments",
    description: "PMJAY, CGHS, ECHS empanelment records",
  },
  {
    id: "rate_cards",
    label: "Rate Cards",
    description: "Government scheme rate cards and pricing",
  },
  {
    id: "nabh_checklist",
    label: "NABH Checklist",
    description: "NABH 6th Edition compliance checklist items",
  },
  {
    id: "evidence_artifacts",
    label: "Evidence Artifacts",
    description: "Uploaded compliance evidence documents and metadata",
  },
  {
    id: "audit_findings",
    label: "Audit Findings",
    description: "Internal audit findings and observations",
  },
  {
    id: "capa_actions",
    label: "CAPA Actions",
    description: "Corrective and preventive action records",
  },
  {
    id: "validation_report",
    label: "Validation Report",
    description: "Latest go-live validation results and gap analysis",
  },
];

/* ----------------------------- Page ----------------------------- */

export default function ExportPackPage() {
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const [workspaceId, setWorkspaceId] = React.useState("");
  const [format, setFormat] = React.useState<ExportFormat>("json");
  const [selectedSections, setSelectedSections] = React.useState<Set<string>>(
    new Set(EXPORT_SECTIONS.map((s) => s.id)),
  );
  const [exporting, setExporting] = React.useState(false);

  /* ---- Section toggle ---- */

  function toggleSection(sectionId: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedSections.size === EXPORT_SECTIONS.length) {
      setSelectedSections(new Set());
    } else {
      setSelectedSections(new Set(EXPORT_SECTIONS.map((s) => s.id)));
    }
  }

  /* ---- Export ---- */

  async function handleExport() {
    if (!activeBranchId) {
      toast({
        title: "Branch Required",
        description: "Please select an active branch first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSections.size === 0) {
      toast({
        title: "No sections selected",
        description:
          "Please select at least one section to include in the export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.set("branchId", activeBranchId);
      qs.set("format", format);
      if (workspaceId.trim()) qs.set("workspaceId", workspaceId.trim());

      // Include selected sections
      const sections = Array.from(selectedSections);
      qs.set("sections", sections.join(","));

      const response = await fetch(
        `/api/compliance/validator/export-pack?${qs.toString()}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.message || `Export failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const ext = format === "csv" ? "csv" : "json";
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `compliance-export-${timestamp}.${ext}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: "Export downloaded successfully" });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message || "Failed to generate export pack",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  /* ---- Render ---- */

  return (
    <AppShell title="Compliance Export">
      <RequirePerm perm="COMPLIANCE_EXPORT">
      <div className="grid gap-6 max-w-3xl">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconReceipt className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Export Pack
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Generate a compliance data export for external auditors or
                regulatory submissions.
              </div>
            </div>
          </div>
        </div>

        {/* ---- Info callout ---- */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Compliance Export Pack
              </p>
              <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300">
                Generate a comprehensive compliance pack for external auditors
                or regulatory submissions. Select the sections to include and
                choose your preferred format. The export will contain all
                relevant data for the selected workspace and branch.
              </p>
            </div>
          </div>
        </div>

        {/* ---- Configuration ---- */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Export Configuration</CardTitle>
            <p className="text-sm text-zc-muted">
              Configure the workspace, format, and sections for your export.
            </p>
          </CardHeader>
          <Separator />
          <CardContent className="grid gap-6 pt-6">
            {/* Workspace selector */}
            <div className="space-y-2">
              <Label htmlFor="exp-ws">Workspace ID (optional)</Label>
              <Input
                id="exp-ws"
                placeholder="Enter workspace ID or leave empty for all"
                className="max-w-md"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              />
              <p className="text-xs text-zc-muted">
                Leave empty to export data from all workspaces in the current
                branch.
              </p>
            </div>

            {/* Format selector */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormat("json")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
                    format === "json"
                      ? "border-zc-accent bg-zc-accent/5"
                      : "border-zc-border hover:border-zc-accent/40",
                  )}
                >
                  <FileJson
                    className={cn(
                      "h-6 w-6",
                      format === "json" ? "text-zc-accent" : "text-zc-muted",
                    )}
                  />
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        format === "json" ? "text-zc-text" : "text-zc-muted",
                      )}
                    >
                      JSON
                    </p>
                    <p className="text-xs text-zc-muted">
                      Structured data format
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
                    format === "csv"
                      ? "border-zc-accent bg-zc-accent/5"
                      : "border-zc-border hover:border-zc-accent/40",
                  )}
                >
                  <FileSpreadsheet
                    className={cn(
                      "h-6 w-6",
                      format === "csv" ? "text-zc-accent" : "text-zc-muted",
                    )}
                  />
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        format === "csv" ? "text-zc-text" : "text-zc-muted",
                      )}
                    >
                      CSV
                    </p>
                    <p className="text-xs text-zc-muted">
                      Spreadsheet compatible
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Sections to include */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sections to Include</Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-zc-accent hover:underline"
                >
                  {selectedSections.size === EXPORT_SECTIONS.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {EXPORT_SECTIONS.map((section) => {
                  const isSelected = selectedSections.has(section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-zc-accent/40 bg-zc-accent/5"
                          : "border-zc-border hover:border-zc-accent/20",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className="mt-0.5 text-xs text-zc-muted">
                          {section.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-zc-muted">
                {selectedSections.size} of {EXPORT_SECTIONS.length} sections
                selected
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ---- Generate button row ---- */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zc-muted">
            Format:{" "}
            <span className="font-medium uppercase">{format}</span>{" "}
            &middot; {selectedSections.size} section
            {selectedSections.size !== 1 ? "s" : ""}
          </p>
          <Button
            size="lg"
            onClick={handleExport}
            disabled={exporting || selectedSections.size === 0}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Generate Export Pack
          </Button>
        </div>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
