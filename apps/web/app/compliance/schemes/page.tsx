"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import { RequirePerm } from "@/components/RequirePerm";
import { ArrowRight, AlertTriangle, FileText, Link2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type SchemeCode = "PMJAY" | "CGHS" | "ECHS";
type SchemeStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "NOT_CONFIGURED";

type SchemeEmpanelment = {
  id: string;
  scheme: SchemeCode;
  empanelmentNumber: string | null;
  status: SchemeStatus;
  rateCardCount: number;
  mappingCount: number;
  unmappedCount: number;
};

type SchemeSummary = {
  empanelments?: unknown;
  totalRateCards: number;
  totalMappings: number;
  totalUnmapped: number;
};

const SCHEMES: SchemeCode[] = ["PMJAY", "CGHS", "ECHS"];

function isSchemeCode(value: unknown): value is SchemeCode {
  return value === "PMJAY" || value === "CGHS" || value === "ECHS";
}

function normalizeStatus(value: unknown): SchemeStatus {
  if (value === "ACTIVE" || value === "PENDING" || value === "EXPIRED" || value === "NOT_CONFIGURED") return value;
  return "NOT_CONFIGURED";
}

function toCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyEmpanelment(scheme: SchemeCode): SchemeEmpanelment {
  return {
    id: "",
    scheme,
    empanelmentNumber: null,
    status: "NOT_CONFIGURED",
    rateCardCount: 0,
    mappingCount: 0,
    unmappedCount: 0,
  };
}

function normalizeEmpanelments(input: unknown): SchemeEmpanelment[] {
  const defaults = SCHEMES.map((scheme) => emptyEmpanelment(scheme));
  if (!Array.isArray(input)) return defaults;

  const byScheme = new Map<SchemeCode, SchemeEmpanelment>();
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const emp = row as Partial<SchemeEmpanelment> & { scheme?: unknown; status?: unknown };
    if (!isSchemeCode(emp.scheme)) continue;
    byScheme.set(emp.scheme, {
      id: typeof emp.id === "string" ? emp.id : "",
      scheme: emp.scheme,
      empanelmentNumber: typeof emp.empanelmentNumber === "string" ? emp.empanelmentNumber : null,
      status: normalizeStatus(emp.status),
      rateCardCount: toCount(emp.rateCardCount),
      mappingCount: toCount(emp.mappingCount),
      unmappedCount: toCount(emp.unmappedCount),
    });
  }

  return SCHEMES.map((scheme) => byScheme.get(scheme) ?? emptyEmpanelment(scheme));
}

/* --------------------------------- Helpers -------------------------------- */

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE": return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "PENDING": return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "EXPIRED": return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default: return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
  }
}

function statusLabel(status: string) {
  switch (status) { case "ACTIVE": return "Active"; case "PENDING": return "Pending"; case "EXPIRED": return "Expired"; case "NOT_CONFIGURED": return "Not Configured"; default: return status; }
}

function schemeHref(scheme: string) { return `/compliance/schemes/${scheme.toLowerCase()}`; }

function schemeColors(scheme: string) {
  switch (scheme) {
    case "PMJAY": return { stat: "border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-900/10", text: "text-orange-600 dark:text-orange-400", bold: "text-orange-700 dark:text-orange-300", hover: "hover:border-orange-300" };
    case "CGHS": return { stat: "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10", text: "text-blue-600 dark:text-blue-400", bold: "text-blue-700 dark:text-blue-300", hover: "hover:border-blue-300" };
    case "ECHS": return { stat: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10", text: "text-emerald-600 dark:text-emerald-400", bold: "text-emerald-700 dark:text-emerald-300", hover: "hover:border-emerald-300" };
    default: return { stat: "border-gray-200 bg-gray-50/50 dark:border-gray-900/50 dark:bg-gray-900/10", text: "text-gray-600 dark:text-gray-400", bold: "text-gray-700 dark:text-gray-300", hover: "hover:border-gray-300" };
  }
}

/* --------------------------------- Page ---------------------------------- */

export default function SchemesOverviewPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [data, setData] = React.useState<SchemeSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  /* ---- Resolve workspaceId from branch ---- */
  React.useEffect(() => {
    if (!activeBranchId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch<any[] | { items: any[] }>(
          "/api/compliance/workspaces?branchId=" + activeBranchId,
        );
        const rows = Array.isArray(resp) ? resp : resp?.items ?? [];
        if (!cancelled && rows[0]) setWorkspaceId(rows[0].id);
      } catch {
        // workspace resolution failed
      }
    })();
    return () => { cancelled = true; };
  }, [activeBranchId]);

  const refresh = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try { const res = await apiFetch<SchemeSummary>(`/api/compliance/schemes/summary?workspaceId=${workspaceId}`); setData(res); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [workspaceId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const empanelments = React.useMemo(() => normalizeEmpanelments(data?.empanelments), [data?.empanelments]);

  return (
    <AppShell title="Government Schemes">
      <RequirePerm perm="COMPLIANCE_SCHEME_EMPANEL">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30"><ShieldCheck className="h-5 w-5 text-zc-accent" /></span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Government Schemes</div>
              <div className="mt-1 text-sm text-zc-muted">Manage PMJAY, CGHS, and ECHS empanelments, rate cards, and service mappings.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-schemes" />
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh
            </Button>
            <Link href="/compliance/schemes/mapping">
              <Button variant="outline" className="px-5 gap-2"><Link2 className="h-4 w-4" />Mappings</Button>
            </Link>
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-schemes" />

        {/* ── Loading ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zc-muted" /></div>
        ) : (
          <>
            {/* ── Summary Stats ──────────────────────────────────────── */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Rate Cards</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{data?.totalRateCards ?? 0}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">Across all schemes</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Total Mappings</div>
                <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">{data?.totalMappings ?? 0}</div>
                <div className="mt-1 text-[11px] text-purple-700/80 dark:text-purple-300/80">External to internal service links</div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Unmapped Items</div>
                <div className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-300">{data?.totalUnmapped ?? 0}</div>
                <div className="mt-1 text-[11px] text-orange-700/80 dark:text-orange-300/80">
                  {(data?.totalUnmapped ?? 0) > 0 ? (
                    <Link href="/compliance/schemes/mapping?unmappedOnly=true" className="text-orange-600 hover:underline dark:text-orange-400 flex items-center gap-1">Review unmapped <ArrowRight className="h-3 w-3" /></Link>
                  ) : "All items mapped"}
                </div>
              </div>
            </div>

            {/* ── Scheme Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {empanelments.map((emp) => {
                const c = schemeColors(emp.scheme);
                return (
                  <Link key={emp.scheme} href={schemeHref(emp.scheme)} className="group">
                    <Card className={cn("h-full transition", c.hover)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <span className={cn("grid h-9 w-9 place-items-center rounded-xl border", c.stat)}>
                            {emp.scheme === "PMJAY" ? <ShieldCheck className={cn("h-4.5 w-4.5", c.text)} /> : <FileText className={cn("h-4.5 w-4.5", c.text)} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{emp.scheme}</CardTitle>
                            <CardDescription>{emp.empanelmentNumber ? `#${emp.empanelmentNumber}` : "Not configured"}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusBadgeClass(emp.status))}>{statusLabel(emp.status)}</span>
                          <ArrowRight className="h-4 w-4 text-zc-muted transition group-hover:translate-x-0.5" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div><div className="text-lg font-semibold">{emp.rateCardCount}</div><div className="text-zc-muted">Rate Cards</div></div>
                          <div><div className="text-lg font-semibold">{emp.mappingCount}</div><div className="text-zc-muted">Mappings</div></div>
                          <div><div className={cn("text-lg font-semibold", emp.unmappedCount > 0 && "text-orange-600")}>{emp.unmappedCount}</div><div className="text-zc-muted">Unmapped</div></div>
                        </div>
                        {emp.unmappedCount > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600"><AlertTriangle className="h-3.5 w-3.5" />{emp.unmappedCount} items need mapping</div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
