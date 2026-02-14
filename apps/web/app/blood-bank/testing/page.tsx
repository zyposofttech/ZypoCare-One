"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, TestTubes, CheckCircle, FlaskConical } from "lucide-react";

type TestingRow = {
  id: string;
  unitNumber: string;
  bloodGroup?: string;
  status: string;
  groupingStatus?: string;
  ttiStatus?: string;
  verifiedAt?: string;
  collectionStartAt?: string;
};

type GroupingForm = {
  aboGroup: string;
  rhFactor: string;
  antibodyScreen: string;
};

type TTIRow = {
  testName: string;
  result: string;
  method: string;
  kitLotNumber: string;
};

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

function statusBadge(status?: string) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "DONE" || s === "COMPLETED")
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        DONE
      </span>
    );
  if (s === "REACTIVE")
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        REACTIVE
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      PENDING
    </span>
  );
}

function isToday(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const TTI_TESTS = ["HIV", "HBsAg", "HCV", "Syphilis", "Malaria"] as const;

function emptyTTIRows(): TTIRow[] {
  return TTI_TESTS.map((t) => ({ testName: t, result: "", method: "", kitLotNumber: "" }));
}

/* ------------------------------------------------------------------ */
/*  Grouping Dialog                                                    */
/* ------------------------------------------------------------------ */
function GroupingDialog({
  open,
  row,
  onClose,
  onSaved,
  branchId,
}: {
  open: boolean;
  row: TestingRow | null;
  onClose: () => void;
  onSaved: () => void;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<GroupingForm>({ aboGroup: "", rhFactor: "", antibodyScreen: "" });

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setForm({ aboGroup: "", rhFactor: "", antibodyScreen: "" });
    }
  }, [open]);

  function set<K extends keyof GroupingForm>(key: K, value: GroupingForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!form.aboGroup) return setErr("ABO Group is required");
    if (!form.rhFactor) return setErr("Rh Factor is required");
    if (!form.antibodyScreen) return setErr("Antibody Screen result is required");
    if (!row?.id) return;

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/testing/grouping", {
        method: "POST",
        body: JSON.stringify({
          bloodUnitId: row.id,
          aboGroup: form.aboGroup,
          rhFactor: form.rhFactor,
          antibodyScreen: form.antibodyScreen,
          branchId,
        }),
      });
      toast({ title: "Grouping Saved", description: `Recorded blood grouping for unit ${row.unitNumber}`, variant: "success" });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !row) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Record Blood Grouping
          </DialogTitle>
          <DialogDescription>
            Record the ABO group, Rh factor, and antibody screen result for this blood unit.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Unit Info Summary */}
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            Unit #{row.unitNumber}
            {row.bloodGroup ? <span className="ml-2 font-mono text-xs text-zc-muted">({row.bloodGroup})</span> : null}
          </div>
          <div className="mt-1 text-xs text-zc-muted">
            Status: {row.status}
            {row.collectionStartAt ? ` | Collected: ${new Date(row.collectionStartAt).toLocaleString()}` : ""}
          </div>
        </div>

        <div className="grid gap-6 mt-4">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Grouping Results</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>ABO Group</Label>
                <Select value={form.aboGroup} onValueChange={(v) => set("aboGroup", v)}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="O">O</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Rh Factor</Label>
                <Select value={form.rhFactor} onValueChange={(v) => set("rhFactor", v)}>
                  <SelectTrigger><SelectValue placeholder="Select Rh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POSITIVE">POSITIVE</SelectItem>
                    <SelectItem value="NEGATIVE">NEGATIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Antibody Screen</Label>
                <Select value={form.antibodyScreen} onValueChange={(v) => set("antibodyScreen", v)}>
                  <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEGATIVE">NEGATIVE</SelectItem>
                    <SelectItem value="POSITIVE">POSITIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onSubmit()} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Grouping
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  TTI Dialog                                                         */
/* ------------------------------------------------------------------ */
function TTIDialog({
  open,
  row,
  onClose,
  onSaved,
  branchId,
}: {
  open: boolean;
  row: TestingRow | null;
  onClose: () => void;
  onSaved: () => void;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [tests, setTests] = React.useState<TTIRow[]>(emptyTTIRows());

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setTests(emptyTTIRows());
    }
  }, [open]);

  function setTest(idx: number, key: keyof TTIRow, value: string) {
    setTests((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  }

  async function onSubmit() {
    setErr(null);
    if (!row?.id) return;

    for (const t of tests) {
      if (!t.result) return setErr(`Result is required for ${t.testName}`);
    }

    setBusy(true);
    try {
      for (const t of tests) {
        await apiFetch("/api/blood-bank/testing/tti", {
          method: "POST",
          body: JSON.stringify({
            bloodUnitId: row.id,
            testName: t.testName,
            result: t.result,
            method: t.method || undefined,
            kitLotNumber: t.kitLotNumber || undefined,
            branchId,
          }),
        });
      }
      toast({ title: "TTI Results Saved", description: `Recorded TTI results for unit ${row.unitNumber}`, variant: "success" });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !row) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <TestTubes className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Record TTI Results
          </DialogTitle>
          <DialogDescription>
            Record Transfusion Transmissible Infection (TTI) screening results for all 5 mandatory tests.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Unit Info Summary */}
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            Unit #{row.unitNumber}
            {row.bloodGroup ? <span className="ml-2 font-mono text-xs text-zc-muted">({row.bloodGroup})</span> : null}
          </div>
          <div className="mt-1 text-xs text-zc-muted">
            Status: {row.status}
            {row.collectionStartAt ? ` | Collected: ${new Date(row.collectionStartAt).toLocaleString()}` : ""}
          </div>
        </div>

        <div className="grid gap-6 mt-4">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">TTI Screening Tests</div>

            {tests.map((t, idx) => (
              <div key={t.testName} className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="text-sm font-semibold text-zc-text mb-3">{t.testName}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Result</Label>
                    <Select value={t.result} onValueChange={(v) => setTest(idx, "result", v)}>
                      <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NON_REACTIVE">NON_REACTIVE</SelectItem>
                        <SelectItem value="REACTIVE">REACTIVE</SelectItem>
                        <SelectItem value="INDETERMINATE">INDETERMINATE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Method</Label>
                    <Input value={t.method} onChange={(e) => setTest(idx, "method", e.target.value)} placeholder="e.g. ELISA, Rapid" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Kit Lot Number</Label>
                    <Input value={t.kitLotNumber} onChange={(e) => setTest(idx, "kitLotNumber", e.target.value)} placeholder="e.g. LOT-2024-001" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onSubmit()} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save TTI Results
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function TestingLabPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_TESTING_READ");
  const canCreate = hasPerm(user, "BB_TESTING_CREATE");
  const canVerify = hasPerm(user, "BB_TESTING_VERIFY");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<TestingRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [groupingOpen, setGroupingOpen] = React.useState(false);
  const [ttiOpen, setTtiOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TestingRow | null>(null);
  const [verifying, setVerifying] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r) => {
      const hay = `${r.unitNumber} ${r.bloodGroup ?? ""} ${r.status} ${r.groupingStatus ?? ""} ${r.ttiStatus ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<TestingRow[]>(`/api/blood-bank/testing/worklist?branchId=${branchId}`);
      setRows(data ?? []);
      if (showToast) {
        toast({ title: "Worklist refreshed", description: `Loaded ${(data ?? []).length} units.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load testing worklist";
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

  async function handleVerify(row: TestingRow) {
    if (!canVerify) return;
    setVerifying(row.id);
    try {
      await apiFetch("/api/blood-bank/testing/verify", {
        method: "POST",
        body: JSON.stringify({ bloodUnitId: row.id, branchId }),
      });
      toast({ title: "Results Verified", description: `Verified results for unit ${row.unitNumber}`, variant: "success" });
      await refresh(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification failed", description: e?.message || "Verification failed" });
    } finally {
      setVerifying(null);
    }
  }

  /* Stats */
  const totalInWorklist = rows.length;
  const pendingGrouping = rows.filter((r) => (r.groupingStatus || "PENDING").toUpperCase() !== "DONE").length;
  const verifiedToday = rows.filter((r) => isToday(r.verifiedAt)).length;

  return (
    <AppShell title="Testing Lab">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <TestTubes className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Testing Lab</div>
              <div className="mt-1 text-sm text-zc-muted">
                Worklist for blood grouping and TTI testing. Record results and verify before units proceed to inventory.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search units in the testing worklist. Record blood grouping and TTI results, then verify.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total in Worklist</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalInWorklist}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Grouping</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{pendingGrouping}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified Today</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{verifiedToday}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by unit number, blood group, status..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
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
            <CardTitle className="text-base">Testing Worklist</CardTitle>
            <CardDescription className="text-sm">Record grouping and TTI results for each blood unit, then verify before release.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Grouping</th>
                  <th className="px-4 py-3 text-left font-semibold">TTI</th>
                  <th className="px-4 py-3 text-left font-semibold">Verified</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading worklist..." : "No units found in testing worklist."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => {
                  const gStatus = (r.groupingStatus || "PENDING").toUpperCase();
                  const tStatus = (r.ttiStatus || "PENDING").toUpperCase();
                  const groupingDone = gStatus === "DONE";
                  const ttiDone = tStatus === "DONE" || tStatus === "REACTIVE";
                  const bothDone = groupingDone && ttiDone;
                  const isVerified = !!r.verifiedAt;

                  return (
                    <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {r.unitNumber}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-zc-text">{r.bloodGroup || "-"}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-text">
                          {r.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">{statusBadge(r.groupingStatus)}</td>

                      <td className="px-4 py-3">{statusBadge(r.ttiStatus)}</td>

                      <td className="px-4 py-3">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                            <CheckCircle className="h-3 w-3" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-zc-muted">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canCreate && !groupingDone ? (
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => {
                                setSelected(r);
                                setGroupingOpen(true);
                              }}
                              className="gap-1"
                            >
                              <FlaskConical className="h-3.5 w-3.5" />
                              Record Grouping
                            </Button>
                          ) : null}

                          {canCreate && !ttiDone ? (
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => {
                                setSelected(r);
                                setTtiOpen(true);
                              }}
                              className="gap-1"
                            >
                              <TestTubes className="h-3.5 w-3.5" />
                              Record TTI
                            </Button>
                          ) : null}

                          {canVerify && bothDone && !isVerified ? (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => void handleVerify(r)}
                              disabled={verifying === r.id}
                              className="gap-1"
                            >
                              {verifying === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Verify
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <GroupingDialog
        open={groupingOpen}
        row={selected}
        onClose={() => setGroupingOpen(false)}
        onSaved={() => refresh(false)}
        branchId={branchId ?? ""}
      />

      <TTIDialog
        open={ttiOpen}
        row={selected}
        onClose={() => setTtiOpen(false)}
        onSaved={() => refresh(false)}
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
