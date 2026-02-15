"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { AlertTriangle, ArrowLeft, GitCompareArrows, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Patient = { id: string; name: string; uhid?: string | null };

type PatientSample = {
  id: string;
  requestId: string;
  sampleId: string;
  collectedAt?: string;
  verifiedByStaffId?: string | null;
  verificationMethod?: string | null;
  patientBloodGroup?: string | null;
  patientAntibodies?: string | null;
};

type BloodUnit = {
  id: string;
  unitNumber?: string;
  bloodGroup?: string | null;
  componentType?: string;
  expiryDate?: string | null;
  status?: string;
};

type CrossMatchTest = {
  id: string;
  bloodUnitId?: string;
  bloodUnit?: BloodUnit;
  method: string;
  result: string;
  validUntil?: string | null;
  certificateNumber?: string | null;
  createdAt?: string | null;
};

type BloodRequestDetail = {
  id: string;
  branchId: string;
  requestNumber: string;
  status: string;
  urgency: string;
  requestedComponent: string;
  quantityUnits: number;
  indication?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  patient?: Patient;
  patientSample?: PatientSample | null;
  crossMatches?: CrossMatchTest[];
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const BLOOD_GROUPS = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
  { value: "BOMBAY", label: "Bombay" },
  { value: "RARE_OTHER", label: "Rare/Other" },
] as const;

const METHODS = [
  { value: "IMMEDIATE_SPIN", label: "Immediate Spin" },
  { value: "AHG_INDIRECT_COOMBS", label: "AHG / Indirect Coombs" },
  { value: "ELECTRONIC", label: "Electronic" },
] as const;

const RESULTS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPATIBLE", label: "Compatible" },
  { value: "INCOMPATIBLE", label: "Incompatible" },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function valOrDash(v?: any) {
  const s = String(v ?? "").trim();
  return s ? s : "-";
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function badgeForStatus(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  if (s === "SAMPLE_RECEIVED") return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
  if (s === "CROSS_MATCHING") return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
  if (s === "READY") return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "ISSUED") return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
  if (s === "COMPLETED") return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (s === "CANCELLED") return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function resultPill(result: string) {
  const r = (result || "").toUpperCase();
  if (r === "COMPATIBLE") return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  if (r === "INCOMPATIBLE") return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  if (r === "PENDING") return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  return "border-zc-border bg-zc-panel/30 text-zc-muted";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BloodRequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "");

  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_REQUEST_READ");
  const canCrossMatch = hasPerm(user, "BB_CROSSMATCH_CREATE");

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<BloodRequestDetail | null>(null);
  const [suggestions, setSuggestions] = React.useState<BloodUnit[]>([]);

  // Sample form
  const [sampleId, setSampleId] = React.useState("");
  const [collectedAt, setCollectedAt] = React.useState("");
  const [verificationMethod, setVerificationMethod] = React.useState("WRISTBAND_SCAN");

  // Grouping form
  const [patientBloodGroup, setPatientBloodGroup] = React.useState<string>("");
  const [patientAntibodies, setPatientAntibodies] = React.useState<string>("");

  // Crossmatch form
  const [xmUnitId, setXmUnitId] = React.useState<string>("");
  const [xmMethod, setXmMethod] = React.useState<string>("IMMEDIATE_SPIN");
  const [xmResult, setXmResult] = React.useState<string>("PENDING");

  async function load() {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/blood-bank/requests/${id}`);
      setData(res as any);

      // Prefill forms from server
      const sample = (res as any)?.patientSample as PatientSample | null | undefined;
      if (sample?.sampleId) setSampleId(sample.sampleId);
      if (sample?.collectedAt) setCollectedAt(new Date(sample.collectedAt).toISOString().slice(0, 16));
      if (sample?.verificationMethod) setVerificationMethod(sample.verificationMethod);
      if (sample?.patientBloodGroup) setPatientBloodGroup(sample.patientBloodGroup);
      if (sample?.patientAntibodies) setPatientAntibodies(sample.patientAntibodies);

      // Suggestions depend on patient blood group being recorded
      try {
        const sug = await apiFetch(`/api/blood-bank/requests/suggestions/${id}`);
        setSuggestions(Array.isArray(sug) ? (sug as any) : []);
      } catch {
        setSuggestions([]);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load request");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitSample() {
    if (!canCrossMatch) {
      return toast({ variant: "destructive", title: "Unauthorized", description: "Missing permission: BB_CROSSMATCH_CREATE" });
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/blood-bank/requests/${id}/sample`, {
        method: "POST",
        body: JSON.stringify({
          sampleId: sampleId.trim() || undefined,
          collectedAt: collectedAt ? new Date(collectedAt).toISOString() : undefined,
          verificationMethod: verificationMethod || undefined,
        }),
      });
      toast({ title: "Sample registered", description: "Patient sample has been registered/updated.", variant: "success" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Sample registration failed");
      toast({ variant: "destructive", title: "Sample registration failed", description: e?.message || "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function submitGrouping() {
    if (!canCrossMatch) {
      return toast({ variant: "destructive", title: "Unauthorized", description: "Missing permission: BB_CROSSMATCH_CREATE" });
    }
    if (!patientBloodGroup) {
      return toast({ variant: "destructive", title: "Validation", description: "Patient blood group is required" });
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/blood-bank/requests/${id}/grouping`, {
        method: "POST",
        body: JSON.stringify({
          patientBloodGroup,
          patientAntibodies: patientAntibodies.trim() || undefined,
          verificationMethod: verificationMethod || undefined,
        }),
      });
      toast({ title: "Patient grouping recorded", description: "Patient grouping saved for this request.", variant: "success" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Grouping save failed");
      toast({ variant: "destructive", title: "Grouping save failed", description: e?.message || "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function submitCrossMatch() {
    if (!canCrossMatch) {
      return toast({ variant: "destructive", title: "Unauthorized", description: "Missing permission: BB_CROSSMATCH_CREATE" });
    }
    if (!xmUnitId.trim()) {
      return toast({ variant: "destructive", title: "Validation", description: "Blood Unit ID is required" });
    }
    setBusy(true);
    setErr(null);
    try {
      if (xmMethod === "ELECTRONIC") {
        await apiFetch(`/api/blood-bank/requests/${id}/electronic-xm`, {
          method: "POST",
          body: JSON.stringify({ unitId: xmUnitId.trim() }),
        });
      } else {
        await apiFetch(`/api/blood-bank/requests/${id}/cross-match`, {
          method: "POST",
          body: JSON.stringify({ bloodUnitId: xmUnitId.trim(), method: xmMethod, result: xmResult }),
        });
      }
      toast({ title: "Cross-match saved", description: "Cross-match test recorded.", variant: "success" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Cross-match failed");
      toast({ variant: "destructive", title: "Cross-match failed", description: e?.message || "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const r = data;
  const sample = r?.patientSample ?? null;

  return (
    <AppShell title="Requests">
      <div className="mx-auto max-w-[1100px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blood-bank/requests" prefetch={false}>
              <Button variant="outline" size="icon" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="text-lg font-semibold text-zc-text">Blood Request</div>
              <div className="text-sm text-zc-muted">Request details, patient sample, grouping & cross-match</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => load()} disabled={loading || busy}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Main info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <GitCompareArrows className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-base">{valOrDash(r?.requestNumber)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", badgeForStatus(r?.status || "-"))}>
                      {valOrDash(r?.status).replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zc-muted">Created: {fmtDateTime(r?.createdAt ?? null)}</span>
                  </div>
                </div>
              </div>

              {canRead ? (
                <div className="hidden sm:flex items-center gap-2 text-xs text-zc-muted">
                  <ShieldCheck className="h-4 w-4" />
                  Permission: BB_REQUEST_READ
                </div>
              ) : null}
            </CardTitle>
            <CardDescription className="text-sm">
              {r?.patient?.name ? (
                <span>
                  Patient: <span className="font-semibold text-zc-text">{r.patient.name}</span>
                  {r.patient.uhid ? <span className="text-zc-muted"> (UHID: {r.patient.uhid})</span> : null}
                </span>
              ) : (
                "-"
              )}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zc-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : !r ? (
              <div className="text-sm text-zc-muted">No data.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="text-xs text-zc-muted">Component</div>
                  <div className="mt-1 font-semibold text-zc-text">{valOrDash(r.requestedComponent)}</div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="text-xs text-zc-muted">Quantity</div>
                  <div className="mt-1 font-mono text-sm text-zc-text">{r.quantityUnits}</div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="text-xs text-zc-muted">Urgency</div>
                  <div className="mt-1 font-semibold text-zc-text">{valOrDash(r.urgency)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sample + Grouping */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patient Sample</CardTitle>
              <CardDescription className="text-sm">Register/verify the patient blood sample for this request.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              {sample ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-zc-muted">Sample ID</div>
                      <div className="font-mono text-xs text-zc-text">{valOrDash(sample.sampleId)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zc-muted">Collected</div>
                      <div className="text-xs text-zc-text">{fmtDateTime(sample.collectedAt ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zc-muted">Verification Method</div>
                      <div className="text-xs text-zc-text">{valOrDash(sample.verificationMethod)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zc-muted">Verified By</div>
                      <div className="text-xs text-zc-text">{valOrDash(sample.verifiedByStaffId)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                  No sample registered yet.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Sample ID</Label>
                  <Input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="Auto-generated if empty" />
                </div>

                <div className="grid gap-2">
                  <Label>Collected At</Label>
                  <Input
                    type="datetime-local"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Verification Method</Label>
                <Select value={verificationMethod} onValueChange={setVerificationMethod as any}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WRISTBAND_SCAN">Wristband Scan</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={submitSample} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Sample
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patient Grouping</CardTitle>
              <CardDescription className="text-sm">Record patient ABO/Rh grouping for this request (required for electronic XM).</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Patient Blood Group</Label>
                  <Select value={patientBloodGroup} onValueChange={setPatientBloodGroup as any}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Antibodies (if any)</Label>
                  <Input value={patientAntibodies} onChange={(e) => setPatientAntibodies(e.target.value)} placeholder="e.g. Anti-D" />
                </div>
              </div>

              {!sample ? (
                <div className="rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-warn))]">
                  Register sample first.
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button onClick={submitGrouping} disabled={busy || !sample}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Grouping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions + Crossmatch */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Compatible Unit Suggestions</CardTitle>
              <CardDescription className="text-sm">Auto-suggested units based on patient blood group & component.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {!suggestions.length ? (
                <div className="rounded-xl border border-dashed border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                  {sample?.patientBloodGroup ? "No compatible units available." : "Record patient grouping to see suggestions."}
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zc-text">{valOrDash(u.unitNumber)}</span>
                          <span className="text-xs text-zc-muted">{valOrDash(u.bloodGroup)}</span>
                          <span className="text-xs text-zc-muted">{valOrDash(u.componentType)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-zc-muted">Expiry: {fmtDateTime(u.expiryDate ?? null)}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setXmUnitId(u.id)}
                        title="Use this unit for cross-match"
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Record Cross-Match</CardTitle>
              <CardDescription className="text-sm">Record a manual cross-match result or run electronic XM.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-2">
                <Label>Blood Unit</Label>
                <Input value={xmUnitId} onChange={(e) => setXmUnitId(e.target.value)} placeholder="Paste BloodUnit ID (or click Use)" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Method</Label>
                  <Select value={xmMethod} onValueChange={setXmMethod as any}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Result</Label>
                  <Select value={xmResult} onValueChange={setXmResult as any}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {xmMethod === "ELECTRONIC" && !sample?.patientBloodGroup ? (
                <div className="rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-warn))]">
                  Electronic XM requires patient blood group to be recorded.
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button onClick={submitCrossMatch} disabled={busy || !sample}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Cross-Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crossmatch history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cross-Match History</CardTitle>
            <CardDescription className="text-sm">All cross-match tests recorded for this request.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {!r?.crossMatches?.length ? (
              <div className="rounded-xl border border-dashed border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                No cross-matches recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Unit</th>
                      <th className="px-4 py-3 text-left font-semibold">Method</th>
                      <th className="px-4 py-3 text-left font-semibold">Result</th>
                      <th className="px-4 py-3 text-left font-semibold">Certificate</th>
                      <th className="px-4 py-3 text-left font-semibold">Valid Until</th>
                      <th className="px-4 py-3 text-left font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.crossMatches.map((x) => (
                      <tr key={x.id} className="border-t border-zc-border">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-zc-text">{valOrDash(x.bloodUnit?.unitNumber ?? x.bloodUnitId)}</div>
                          <div className="text-xs text-zc-muted">{valOrDash(x.bloodUnit?.bloodGroup)}</div>
                        </td>
                        <td className="px-4 py-3 text-zc-muted">{valOrDash(x.method).replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", resultPill(x.result))}>
                            {valOrDash(x.result)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zc-text">{valOrDash(x.certificateNumber)}</td>
                        <td className="px-4 py-3 text-xs text-zc-muted">{fmtDateTime(x.validUntil ?? null)}</td>
                        <td className="px-4 py-3 text-xs text-zc-muted">{fmtDateTime(x.createdAt ?? null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
