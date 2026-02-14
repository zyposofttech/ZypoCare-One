"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, Shield } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IqcRecord = {
  id?: string;
  date?: string;
  testSystem?: string;
  qcLevel?: string;
  values?: string;
  westgardResult?: string;
  performedBy?: string;
  performedAt?: string;
  notes?: string;
};

type EqasRecord = {
  id?: string;
  date?: string;
  program?: string;
  cycle?: string;
  testSystem?: string;
  result?: string;
  evaluatedBy?: string;
};

type CalibrationRecord = {
  id?: string;
  date?: string;
  equipmentId?: string;
  calibrationType?: string;
  result?: string;
  nextDueDate?: string;
  performedBy?: string;
};

type TabKey = "iqc" | "eqas" | "calibration";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function westgardColor(result?: string) {
  const v = (result || "").toUpperCase();
  if (v === "PASS")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (v === "FAIL")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  if (v === "WARNING")
    return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function calibrationResultColor(result?: string) {
  const v = (result || "").toUpperCase();
  if (v === "PASS")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (v === "FAIL")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function QualityControlPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_QC_READ");
  const canCreate = hasPerm(user, "BB_QC_CREATE");

  /* ---- Data state ---- */
  const [iqcRecords, setIqcRecords] = React.useState<IqcRecord[]>([]);
  const [eqasRecords, setEqasRecords] = React.useState<EqasRecord[]>([]);
  const [calibrationRecords, setCalibrationRecords] = React.useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  /* ---- UI state ---- */
  const [tab, setTab] = React.useState<TabKey>("iqc");
  const [q, setQ] = React.useState("");
  const [iqcOpen, setIqcOpen] = React.useState(false);
  const [eqasOpen, setEqasOpen] = React.useState(false);
  const [calibrationOpen, setCalibrationOpen] = React.useState(false);

  /* ---- IQC form state ---- */
  const [iqcForm, setIqcForm] = React.useState({
    testSystem: "",
    qcLevel: "",
    values: "",
    westgardResult: "",
    performedAt: "",
    notes: "",
  });
  const [iqcBusy, setIqcBusy] = React.useState(false);
  const [iqcErr, setIqcErr] = React.useState<string | null>(null);

  /* ---- EQAS form state ---- */
  const [eqasForm, setEqasForm] = React.useState({
    program: "",
    cycle: "",
    testSystem: "",
    result: "",
    evaluatedBy: "",
    date: "",
  });
  const [eqasBusy, setEqasBusy] = React.useState(false);
  const [eqasErr, setEqasErr] = React.useState<string | null>(null);

  /* ---- Calibration form state ---- */
  const [calForm, setCalForm] = React.useState({
    equipmentId: "",
    calibrationType: "",
    result: "",
    nextDueDate: "",
    performedBy: "",
  });
  const [calBusy, setCalBusy] = React.useState(false);
  const [calErr, setCalErr] = React.useState<string | null>(null);

  /* ---- Fetch ---- */
  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const [iqcRes, eqasRes, calRes]: any[] = await Promise.all([
        apiFetch(`/api/blood-bank/qc/iqc?branchId=${branchId}`).catch(() => undefined),
        apiFetch(`/api/blood-bank/qc/eqas?branchId=${branchId}`).catch(() => undefined),
        apiFetch(`/api/blood-bank/qc/calibration?branchId=${branchId}`).catch(() => undefined),
      ]);
      setIqcRecords(Array.isArray(iqcRes) ? iqcRes : []);
      setEqasRecords(Array.isArray(eqasRes) ? eqasRes : []);
      setCalibrationRecords(Array.isArray(calRes) ? calRes : []);
      if (showToast) {
        toast({ title: "QC data refreshed", description: "Loaded latest quality control records." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load QC data";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- Filtered rows per tab ---- */
  const filteredIqc = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return iqcRecords;
    return iqcRecords.filter((r) => {
      const hay = `${r.testSystem ?? ""} ${r.qcLevel ?? ""} ${r.westgardResult ?? ""} ${r.performedBy ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [iqcRecords, q]);

  const filteredEqas = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return eqasRecords;
    return eqasRecords.filter((r) => {
      const hay = `${r.program ?? ""} ${r.cycle ?? ""} ${r.testSystem ?? ""} ${r.evaluatedBy ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [eqasRecords, q]);

  const filteredCal = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return calibrationRecords;
    return calibrationRecords.filter((r) => {
      const hay = `${r.equipmentId ?? ""} ${r.calibrationType ?? ""} ${r.result ?? ""} ${r.performedBy ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [calibrationRecords, q]);

  const currentFiltered = tab === "iqc" ? filteredIqc : tab === "eqas" ? filteredEqas : filteredCal;
  const currentTotal = tab === "iqc" ? iqcRecords.length : tab === "eqas" ? eqasRecords.length : calibrationRecords.length;

  /* ---- Stats ---- */
  const allRecords = [...iqcRecords, ...eqasRecords, ...calibrationRecords];
  const totalRecords = allRecords.length;

  const passCount = iqcRecords.filter((r) => (r.westgardResult || "").toUpperCase() === "PASS").length;
  const passRate = iqcRecords.length > 0 ? Math.round((passCount / iqcRecords.length) * 100) : 0;

  const allDates = [
    ...iqcRecords.map((r) => r.performedAt || r.date || ""),
    ...eqasRecords.map((r) => r.date || ""),
    ...calibrationRecords.map((r) => r.date || ""),
  ].filter(Boolean).sort().reverse();
  const lastQcDate = allDates[0] ? new Date(allDates[0]).toLocaleDateString() : "N/A";

  /* ---- Submit IQC ---- */
  async function submitIqc() {
    setIqcErr(null);
    if (!canCreate) return setIqcErr("Missing permission: BB_QC_CREATE");
    if (!iqcForm.testSystem.trim()) return setIqcErr("Test system is required");
    if (!iqcForm.qcLevel) return setIqcErr("QC level is required");
    if (!iqcForm.westgardResult) return setIqcErr("Westgard result is required");

    setIqcBusy(true);
    try {
      await apiFetch("/api/blood-bank/qc/iqc", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          testSystem: iqcForm.testSystem.trim(),
          qcLevel: iqcForm.qcLevel,
          values: iqcForm.values.trim() || null,
          westgardResult: iqcForm.westgardResult,
          performedAt: iqcForm.performedAt || null,
          notes: iqcForm.notes.trim() || null,
        }),
      });
      toast({ title: "IQC Recorded", description: "Daily IQC record saved successfully.", variant: "success" });
      setIqcOpen(false);
      setIqcForm({ testSystem: "", qcLevel: "", values: "", westgardResult: "", performedAt: "", notes: "" });
      await refresh(false);
    } catch (e: any) {
      setIqcErr(e?.message || "Failed to save IQC record");
    } finally {
      setIqcBusy(false);
    }
  }

  /* ---- Submit EQAS ---- */
  async function submitEqas() {
    setEqasErr(null);
    if (!canCreate) return setEqasErr("Missing permission: BB_QC_CREATE");
    if (!eqasForm.program.trim()) return setEqasErr("Program is required");
    if (!eqasForm.cycle.trim()) return setEqasErr("Cycle is required");

    setEqasBusy(true);
    try {
      await apiFetch("/api/blood-bank/qc/eqas", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          program: eqasForm.program.trim(),
          cycle: eqasForm.cycle.trim(),
          testSystem: eqasForm.testSystem.trim() || null,
          result: eqasForm.result.trim() || null,
          evaluatedBy: eqasForm.evaluatedBy.trim() || null,
          date: eqasForm.date || null,
        }),
      });
      toast({ title: "EQAS Recorded", description: "EQAS result saved successfully.", variant: "success" });
      setEqasOpen(false);
      setEqasForm({ program: "", cycle: "", testSystem: "", result: "", evaluatedBy: "", date: "" });
      await refresh(false);
    } catch (e: any) {
      setEqasErr(e?.message || "Failed to save EQAS record");
    } finally {
      setEqasBusy(false);
    }
  }

  /* ---- Submit Calibration ---- */
  async function submitCalibration() {
    setCalErr(null);
    if (!canCreate) return setCalErr("Missing permission: BB_QC_CREATE");
    if (!calForm.equipmentId.trim()) return setCalErr("Equipment is required");
    if (!calForm.calibrationType.trim()) return setCalErr("Calibration type is required");
    if (!calForm.result) return setCalErr("Result is required");

    setCalBusy(true);
    try {
      await apiFetch("/api/blood-bank/qc/calibration", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          equipmentId: calForm.equipmentId.trim(),
          calibrationType: calForm.calibrationType.trim(),
          result: calForm.result,
          nextDueDate: calForm.nextDueDate || null,
          performedBy: calForm.performedBy.trim() || null,
        }),
      });
      toast({ title: "Calibration Recorded", description: "Calibration record saved successfully.", variant: "success" });
      setCalibrationOpen(false);
      setCalForm({ equipmentId: "", calibrationType: "", result: "", nextDueDate: "", performedBy: "" });
      await refresh(false);
    } catch (e: any) {
      setCalErr(e?.message || "Failed to save calibration record");
    } finally {
      setCalBusy(false);
    }
  }

  /* ---- Render ---- */
  return (
    <AppShell title="Quality Control">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Shield className="h-5 w-5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Quality Control</div>
              <div className="mt-1 text-sm text-zc-muted">
                Internal Quality Control, EQAS participation, and equipment calibration
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => {
                  if (tab === "iqc") setIqcOpen(true);
                  else if (tab === "eqas") setEqasOpen(true);
                  else setCalibrationOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                {tab === "iqc" ? "Record IQC" : tab === "eqas" ? "Record EQAS" : "Record Calibration"}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Stats */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Quality control metrics across IQC, EQAS, and calibration records.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Pass Rate (IQC)</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{passRate}%</div>
                <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  {passCount} of {iqcRecords.length} passed
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Records</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalRecords}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  IQC: <span className="font-semibold tabular-nums">{iqcRecords.length}</span> | EQAS: <span className="font-semibold tabular-nums">{eqasRecords.length}</span> | Cal: <span className="font-semibold tabular-nums">{calibrationRecords.length}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Last QC Date</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{lastQcDate}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1">
              {(["iqc", "eqas", "calibration"] as TabKey[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium",
                    tab === t
                      ? "bg-zc-accent text-zc-text"
                      : "text-zc-muted hover:bg-zc-panel/50",
                  )}
                >
                  {t === "iqc" ? `IQC (${iqcRecords.length})` : t === "eqas" ? `EQAS (${eqasRecords.length})` : `Calibration (${calibrationRecords.length})`}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search records..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{currentFiltered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{currentTotal}</span>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {tab === "iqc" ? "Internal Quality Control" : tab === "eqas" ? "External Quality Assessment" : "Equipment Calibration"}
            </CardTitle>
            <CardDescription className="text-sm">
              {tab === "iqc"
                ? "Daily IQC records with Westgard rule evaluation."
                : tab === "eqas"
                  ? "External quality assessment scheme participation records."
                  : "Equipment calibration and maintenance records."}
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            {/* IQC Table */}
            {tab === "iqc" ? (
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Test System</th>
                    <th className="px-4 py-3 text-left font-semibold">QC Level</th>
                    <th className="px-4 py-3 text-left font-semibold">Values</th>
                    <th className="px-4 py-3 text-left font-semibold">Westgard Result</th>
                    <th className="px-4 py-3 text-left font-semibold">Performed By</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredIqc.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? "Loading IQC records..." : "No IQC records found."}
                      </td>
                    </tr>
                  ) : null}
                  {filteredIqc.map((r, idx) => (
                    <tr key={r.id ?? idx} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3 text-zc-muted">{r.performedAt || r.date || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{r.testSystem || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.qcLevel || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted font-mono text-xs">{r.values || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", westgardColor(r.westgardResult))}>
                          {(r.westgardResult || "-").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.performedBy || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="success" size="icon" title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {/* EQAS Table */}
            {tab === "eqas" ? (
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Program</th>
                    <th className="px-4 py-3 text-left font-semibold">Cycle</th>
                    <th className="px-4 py-3 text-left font-semibold">Test System</th>
                    <th className="px-4 py-3 text-left font-semibold">Result</th>
                    <th className="px-4 py-3 text-left font-semibold">Evaluated By</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredEqas.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? "Loading EQAS records..." : "No EQAS records found."}
                      </td>
                    </tr>
                  ) : null}
                  {filteredEqas.map((r, idx) => (
                    <tr key={r.id ?? idx} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3 text-zc-muted">{r.date || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{r.program || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.cycle || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.testSystem || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.result || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.evaluatedBy || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="success" size="icon" title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {/* Calibration Table */}
            {tab === "calibration" ? (
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Equipment</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Result</th>
                    <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                    <th className="px-4 py-3 text-left font-semibold">Performed By</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredCal.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? "Loading calibration records..." : "No calibration records found."}
                      </td>
                    </tr>
                  ) : null}
                  {filteredCal.map((r, idx) => (
                    <tr key={r.id ?? idx} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3 text-zc-muted">{r.date || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{r.equipmentId || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.calibrationType || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", calibrationResultColor(r.result))}>
                          {(r.result || "-").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{r.nextDueDate || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted">{r.performedBy || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="success" size="icon" title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Quality control best practices</div>
              <div className="mt-1 text-sm text-zc-muted">
                Run daily IQC before processing patient samples. Participate in EQAS programs each cycle. Ensure all equipment calibrations are current and documented.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- IQC Dialog ---- */}
      <Dialog
        open={iqcOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIqcErr(null);
            setIqcOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Record Daily IQC
            </DialogTitle>
            <DialogDescription>
              Record internal quality control results and Westgard rule evaluation.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {iqcErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{iqcErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">IQC Details</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Test System</Label>
                  <Input
                    value={iqcForm.testSystem}
                    onChange={(e) => setIqcForm((s) => ({ ...s, testSystem: e.target.value }))}
                    placeholder="e.g. Hematology Analyzer"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>QC Level</Label>
                  <Select value={iqcForm.qcLevel} onValueChange={(v) => setIqcForm((s) => ({ ...s, qcLevel: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Level 1">Level 1</SelectItem>
                      <SelectItem value="Level 2">Level 2</SelectItem>
                      <SelectItem value="Level 3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Values</Label>
                  <Input
                    value={iqcForm.values}
                    onChange={(e) => setIqcForm((s) => ({ ...s, values: e.target.value }))}
                    placeholder="e.g. 12.5, 13.0, 12.8"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Westgard Result</Label>
                  <Select value={iqcForm.westgardResult} onValueChange={(v) => setIqcForm((s) => ({ ...s, westgardResult: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Performed At</Label>
                  <Input
                    type="date"
                    value={iqcForm.performedAt}
                    onChange={(e) => setIqcForm((s) => ({ ...s, performedAt: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Input
                    value={iqcForm.notes}
                    onChange={(e) => setIqcForm((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setIqcOpen(false)} disabled={iqcBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void submitIqc()}
                disabled={iqcBusy || !canCreate}
                title={!canCreate ? "Missing permission: BB_QC_CREATE" : undefined}
                className="gap-2"
              >
                {iqcBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Record IQC
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- EQAS Dialog ---- */}
      <Dialog
        open={eqasOpen}
        onOpenChange={(v) => {
          if (!v) {
            setEqasErr(null);
            setEqasOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Record EQAS Result
            </DialogTitle>
            <DialogDescription>
              Record external quality assessment scheme participation and results.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {eqasErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{eqasErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">EQAS Details</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Program</Label>
                  <Input
                    value={eqasForm.program}
                    onChange={(e) => setEqasForm((s) => ({ ...s, program: e.target.value }))}
                    placeholder="e.g. RIQAS, CAP"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Cycle</Label>
                  <Input
                    value={eqasForm.cycle}
                    onChange={(e) => setEqasForm((s) => ({ ...s, cycle: e.target.value }))}
                    placeholder="e.g. 2024-Q1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Test System</Label>
                  <Input
                    value={eqasForm.testSystem}
                    onChange={(e) => setEqasForm((s) => ({ ...s, testSystem: e.target.value }))}
                    placeholder="e.g. Blood Typing"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Result</Label>
                  <Input
                    value={eqasForm.result}
                    onChange={(e) => setEqasForm((s) => ({ ...s, result: e.target.value }))}
                    placeholder="e.g. Satisfactory"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Evaluated By</Label>
                  <Input
                    value={eqasForm.evaluatedBy}
                    onChange={(e) => setEqasForm((s) => ({ ...s, evaluatedBy: e.target.value }))}
                    placeholder="Evaluator name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={eqasForm.date}
                    onChange={(e) => setEqasForm((s) => ({ ...s, date: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setEqasOpen(false)} disabled={eqasBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void submitEqas()}
                disabled={eqasBusy || !canCreate}
                title={!canCreate ? "Missing permission: BB_QC_CREATE" : undefined}
                className="gap-2"
              >
                {eqasBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Record EQAS
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Calibration Dialog ---- */}
      <Dialog
        open={calibrationOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCalErr(null);
            setCalibrationOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Record Calibration
            </DialogTitle>
            <DialogDescription>
              Record equipment calibration results and schedule next due date.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {calErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{calErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Calibration Details</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Equipment</Label>
                  <Input
                    value={calForm.equipmentId}
                    onChange={(e) => setCalForm((s) => ({ ...s, equipmentId: e.target.value }))}
                    placeholder="e.g. Centrifuge-01"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Calibration Type</Label>
                  <Input
                    value={calForm.calibrationType}
                    onChange={(e) => setCalForm((s) => ({ ...s, calibrationType: e.target.value }))}
                    placeholder="e.g. Temperature, Speed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Result</Label>
                  <Select value={calForm.result} onValueChange={(v) => setCalForm((s) => ({ ...s, result: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={calForm.nextDueDate}
                    onChange={(e) => setCalForm((s) => ({ ...s, nextDueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Performed By</Label>
                  <Input
                    value={calForm.performedBy}
                    onChange={(e) => setCalForm((s) => ({ ...s, performedBy: e.target.value }))}
                    placeholder="Technician name"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setCalibrationOpen(false)} disabled={calBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void submitCalibration()}
                disabled={calBusy || !canCreate}
                title={!canCreate ? "Missing permission: BB_QC_CREATE" : undefined}
                className="gap-2"
              >
                {calBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Record Calibration
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
