"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconClipboard } from "@/components/icons";
import { cn } from "@/lib/cn";

import {
  Field,
  NoBranchGuard,
  PageHeader,
  ErrorAlert,
  OnboardingCallout,
} from "../_shared/components";

/* =========================================================
   Import / Export Page
   ========================================================= */

export default function ImportExportPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Import / Export">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <ImportExportContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   Content (rendered only when branchId is guaranteed)
   ========================================================= */

function ImportExportContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canWrite = hasPerm(user, "INFRA_DIAGNOSTICS_CREATE");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"export" | "import">("export");

  // Import state
  const [importJson, setImportJson] = React.useState("");
  const [validationResult, setValidationResult] = React.useState<any>(null);
  const [importing, setImporting] = React.useState(false);

  // Clone state
  const [cloneSourceBranchId, setCloneSourceBranchId] = React.useState(branchId);
  const [cloneTargetBranchId, setCloneTargetBranchId] = React.useState("");
  const [cloning, setCloning] = React.useState(false);
  const [cloneResult, setCloneResult] = React.useState<any>(null);

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-import-export" });

  async function handleExport() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/diagnostics/export?branchId=${encodeURIComponent(branchId)}`,
      );
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagnostics-export-${branchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (e: any) {
      setErr(e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!importJson.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(importJson);
      } catch {
        setErr("Invalid JSON format");
        setLoading(false);
        return;
      }
      const result = await apiFetch<any>(
        `/api/infrastructure/diagnostics/import?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ data: parsed, dryRun: true }),
        },
      );
      setValidationResult(result);
    } catch (e: any) {
      setErr(e?.message || "Validation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importJson.trim()) return;
    setImporting(true);
    setErr(null);
    try {
      const parsed = JSON.parse(importJson);
      const result = await apiFetch<any>(
        `/api/infrastructure/diagnostics/import?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ data: parsed, dryRun: false }),
        },
      );
      if (result.success) {
        toast({ title: "Import completed", description: `Created: ${result.counts.items} items, ${result.counts.parameters} parameters, ${result.counts.ranges} ranges` });
        setImportJson("");
        setValidationResult(null);
      } else {
        setErr(`Import failed: ${(result.errors ?? []).join(", ")}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string ?? "");
      setValidationResult(null);
    };
    reader.readAsText(file);
  }

  async function handleClone() {
    if (!cloneSourceBranchId.trim() || !cloneTargetBranchId.trim()) return;
    setCloning(true);
    setErr(null);
    setCloneResult(null);
    try {
      const result = await apiFetch<any>(
        `/api/infrastructure/diagnostics/clone`,
        {
          method: "POST",
          body: JSON.stringify({
            sourceBranchId: cloneSourceBranchId,
            targetBranchId: cloneTargetBranchId,
          }),
        },
      );
      setCloneResult(result);
      if (result.success) {
        toast({
          title: "Branch cloned successfully",
          description: result.counts
            ? `Cloned: ${Object.entries(result.counts).map(([k, v]) => `${v} ${k}`).join(", ")}`
            : undefined,
        });
      }
    } catch (e: any) {
      setErr(e?.message || "Clone failed");
    } finally {
      setCloning(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconClipboard className="h-5 w-5 text-zc-accent" />}
        title="Import / Export"
        description="Import and export diagnostic configuration data."
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Import / Export Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Import / Export</CardTitle>
          <CardDescription className="text-sm">Bulk import/export diagnostic configuration as JSON.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ErrorAlert message={err} />

          <div className="flex gap-2">
            <Button variant={mode === "export" ? "primary" : "outline"} size="sm" onClick={() => setMode("export")}>
              Export
            </Button>
            <Button variant={mode === "import" ? "primary" : "outline"} size="sm" onClick={() => setMode("import")}>
              Import
            </Button>
          </div>

          {mode === "export" ? (
            <div>
              <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                <div className="text-sm font-semibold mb-2">Export All Configuration</div>
                <div className="text-xs text-zc-muted mb-4">
                  Downloads a JSON file containing all sections, categories, specimens, items (with parameters, ranges, and templates) for the current branch.
                  This file can be used to import configuration into another branch.
                </div>
                <Button onClick={handleExport} disabled={loading}>
                  {loading ? "Exporting..." : "Download Export"}
                </Button>
                <div className="mt-3 rounded-lg border border-sky-200/60 bg-sky-50/30 p-2.5 text-xs text-sky-800 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-300">
                  <span className="font-semibold">Tip:</span> The exported JSON can be opened in Excel for review.
                  Excel template download support is planned for a future release.
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Upload JSON File</div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="max-w-[300px]"
                  />
                  <span className="text-xs text-zc-muted">or paste JSON below</span>
                </div>
              </div>

              <Field label="Import Data (JSON)">
                <Textarea
                  value={importJson}
                  onChange={(e) => { setImportJson(e.target.value); setValidationResult(null); }}
                  rows={10}
                  placeholder='{"sections": [...], "items": [...], ...}'
                  className="font-mono text-xs"
                />
              </Field>

              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={handleValidate} disabled={loading || !importJson.trim()}>
                  {loading ? "Validating..." : "Validate (Dry Run)"}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || !importJson.trim() || (validationResult && !validationResult.success)}
                >
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>

              {validationResult ? (
                <div className="mt-4">
                  <div className={cn(
                    "rounded-xl border p-3",
                    validationResult.success
                      ? "border-emerald-200/70 bg-emerald-50/40"
                      : "border-rose-200/70 bg-rose-50/60",
                  )}>
                    <div className="text-sm font-semibold">
                      {validationResult.success ? "Validation Passed" : "Validation Failed"}
                    </div>

                    {validationResult.counts ? (
                      <div className="mt-2 grid gap-2 md:grid-cols-4">
                        {Object.entries(validationResult.counts).map(([key, val]) => (
                          <div key={key} className="text-xs">
                            <span className="font-semibold capitalize">{key}:</span> {String(val)}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {(validationResult.errors ?? []).length > 0 ? (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-rose-700">Errors:</div>
                        {validationResult.errors.map((e: string, idx: number) => (
                          <div key={idx} className="text-xs text-rose-600">{e}</div>
                        ))}
                      </div>
                    ) : null}

                    {(validationResult.warnings ?? []).length > 0 ? (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-amber-700">Warnings:</div>
                        {validationResult.warnings.map((w: string, idx: number) => (
                          <div key={idx} className="text-xs text-amber-600">{w}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Cloning Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Clone Branch</CardTitle>
          <CardDescription className="text-sm">
            Clone all diagnostic configuration from one branch to another. This copies sections, categories, specimens, items, parameters, ranges, and templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {cloneResult && !cloneResult.success ? (
            <ErrorAlert message={`Clone failed: ${(cloneResult.errors ?? []).join(", ") || "Unknown error"}`} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Source Branch ID">
              <Input
                value={cloneSourceBranchId}
                onChange={(e) => { setCloneSourceBranchId(e.target.value); setCloneResult(null); }}
                placeholder="Source branch ID"
              />
            </Field>
            <Field label="Target Branch ID" required>
              <Input
                value={cloneTargetBranchId}
                onChange={(e) => { setCloneTargetBranchId(e.target.value); setCloneResult(null); }}
                placeholder="Enter target branch ID"
              />
            </Field>
          </div>

          <div>
            <Button
              onClick={handleClone}
              disabled={cloning || !cloneSourceBranchId.trim() || !cloneTargetBranchId.trim()}
            >
              {cloning ? "Cloning..." : "Clone Branch"}
            </Button>
          </div>

          {cloneResult && cloneResult.success ? (
            <div>
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                <div className="text-sm font-semibold text-emerald-800">Clone Successful</div>
                {cloneResult.counts ? (
                  <div className="mt-2 grid gap-2 md:grid-cols-4">
                    {Object.entries(cloneResult.counts).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="font-semibold capitalize">{key}:</span> {String(val)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Import / Export tips"
        description="Use Export to download a full JSON backup of the current branch configuration. Use Import to bulk-load configuration from a JSON file. Use Clone to copy all configuration from one branch to another."
      />
    </div>
  );
}
