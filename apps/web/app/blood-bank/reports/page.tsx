"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  RefreshCw,
} from "lucide-react";

type ReportRun = {
  id: string;
  branchId: string;
  reportType: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  parameters: any;
  createdAt: string;
  createdByUser?: { id: string; name: string; email?: string } | null;
  submittedAt?: string | null;
  submittedByUser?: { id: string; name: string; email?: string } | null;
  approvedAt?: string | null;
  approvedByUser?: { id: string; name: string; email?: string } | null;
  rejectedReason?: string | null;
  data?: any;
};

const REPORT_TYPES = [
  {
    type: "NACO_ANNUAL",
    title: "NACO Annual Return",
    description: "Annual return required by NACO.",
    params: "year" as const,
  },
  {
    type: "SBTC_QUARTERLY",
    title: "SBTC Quarterly Return",
    description: "Quarterly return required by SBTC.",
    params: "yearQuarter" as const,
  },
  {
    type: "UTILIZATION",
    title: "Utilization Report",
    description: "Utilization across collection, issues, transfusions.",
    params: "range" as const,
  },
  {
    type: "HAEMOVIGILANCE",
    title: "Haemovigilance Report",
    description: "Transfusion reactions and haemovigilance summary.",
    params: "range" as const,
  },
  {
    type: "DISCARD_ANALYSIS",
    title: "Discard Analysis",
    description: "Discard reasons and trends.",
    params: "range" as const,
  },
  {
    type: "DONOR_DEFERRAL",
    title: "Donor Deferral",
    description: "Deferral counts and reasons.",
    params: "range" as const,
  },
  {
    type: "TTI_SEROPREVALENCE",
    title: "TTI Seroprevalence",
    description: "TTI summary across tests.",
    params: "range" as const,
  },
  {
    type: "DAILY_SUMMARY",
    title: "Daily Summary",
    description: "Daily snapshot for operations.",
    params: "date" as const,
  },
] as const;

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusBadge(status: ReportRun["status"]) {
  const map: Record<string, { label: string; variant: any }> = {
    DRAFT: { label: "Draft", variant: "secondary" },
    SUBMITTED: { label: "Submitted", variant: "default" },
    APPROVED: { label: "Approved", variant: "success" },
    REJECTED: { label: "Rejected", variant: "destructive" },
  };
  const m = map[status] ?? { label: status, variant: "secondary" };
  // @ts-ignore shadcn variants may differ; fallback via className below.
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

async function downloadWithAuth(url: string, filenameHint?: string) {
  const token = getAccessToken();
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename\*=UTF-8''([^;]+)|filename=\"?([^;\"]+)\"?/i.exec(cd);
  const filename =
    decodeURIComponent(match?.[1] || "") ||
    (match?.[2] ? match[2] : "") ||
    filenameHint ||
    "report";

  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const RunSchema = z.object({
  reportType: z.string().min(1),
  year: z.string().optional(),
  quarter: z.string().optional(),
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export default function BloodBankReportsPage() {
  const { toast } = useToast();
  const { selectedBranch } = useBranchContext();

  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(false);

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [selectedType, setSelectedType] = useState<(typeof REPORT_TYPES)[number] | null>(null);
  const [selectedRun, setSelectedRun] = useState<ReportRun | null>(null);

  const [form, setForm] = useState({
    reportType: "",
    year: "",
    quarter: "1",
    date: new Date().toISOString().slice(0, 10),
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState("pdf");

  const branchId = selectedBranch?.id;

  const typeMeta = useMemo(() => {
    const m = new Map(REPORT_TYPES.map((t) => [t.type, t] as const));
    return m;
  }, []);

  const loadRuns = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const data = await apiFetch<ReportRun[]>(`/api/blood-bank/reports/runs?branchId=${branchId}&take=50`);
      setRuns(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Failed to load report runs", description: e?.message ?? "" , variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const openRunDialog = (t: (typeof REPORT_TYPES)[number]) => {
    setSelectedType(t);
    setForm((p) => ({ ...p, reportType: t.type }));
    setRunDialogOpen(true);
  };

  const createRun = async () => {
    if (!branchId) return;
    const parsed = RunSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid inputs", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }

    const t = selectedType ?? typeMeta.get(form.reportType) ?? null;
    if (!t) {
      toast({ title: "Select a report type", variant: "destructive" });
      return;
    }

    const parameters: any = {};
    if (t.params === "year") parameters.year = Number(form.year);
    if (t.params === "yearQuarter") {
      parameters.year = Number(form.year);
      parameters.quarter = Number(form.quarter);
    }
    if (t.params === "date") parameters.date = form.date;
    if (t.params === "range") {
      parameters.from = form.from;
      parameters.to = form.to;
    }

    try {
      setBusyId("__create__");
      const run = await apiFetch<ReportRun>(`/api/blood-bank/reports/runs`, {
        method: "POST",
        body: JSON.stringify({ branchId, reportType: t.type, parameters }),
      });
      toast({ title: "Report run created", description: `Run ID: ${run.id}` });
      setRunDialogOpen(false);
      await loadRuns();
    } catch (e: any) {
      toast({ title: "Failed to create report run", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const doAction = async (id: string, action: "submit" | "approve" | "reject") => {
    if (!branchId) return;
    try {
      setBusyId(id);
      if (action === "reject") {
        await apiFetch(`/api/blood-bank/reports/runs/${id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: rejectReason || "Rejected" }),
        });
      } else {
        await apiFetch(`/api/blood-bank/reports/runs/${id}/${action}`, { method: "POST" });
      }
      toast({ title: `Report ${action}ed` });
      setRejectDialogOpen(false);
      setRejectReason("");
      await loadRuns();
    } catch (e: any) {
      toast({ title: `Failed to ${action}`, description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openView = async (id: string) => {
    try {
      setBusyId(id);
      const run = await apiFetch<ReportRun>(`/api/blood-bank/reports/runs/${id}`);
      setSelectedRun(run);
      setViewDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Failed to load report run", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const exportRun = async (id: string, reportType: string) => {
    try {
      setBusyId(id);
      await downloadWithAuth(`/api/blood-bank/reports/runs/${id}/export?format=${exportFormat}`, `${reportType}_${id}.${exportFormat}`);
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Run statutory and operational reports. Maker-checker supported via Submit → Approve/Reject.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadRuns} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REPORT_TYPES.map((t) => (
            <Card key={t.type} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t.title}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => openRunDialog(t)}>
                  <Play className="mr-2 h-4 w-4" />
                  Run report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent runs
            </CardTitle>
            <CardDescription>Generated report runs for the active branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Type</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">By</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        {loading ? "Loading…" : "No runs yet"}
                      </td>
                    </tr>
                  ) : (
                    runs.map((r) => {
                      const meta = typeMeta.get(r.reportType);
                      return (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="p-2">
                            <div className="font-medium">{meta?.title ?? r.reportType}</div>
                            <div className="text-xs text-muted-foreground">{r.id.slice(0, 8)}…</div>
                          </td>
                          <td className="p-2">{statusBadge(r.status)}</td>
                          <td className="p-2">{formatDate(r.createdAt)}</td>
                          <td className="p-2">{r.createdByUser?.name ?? "—"}</td>
                          <td className="p-2">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openView(r.id)}
                                disabled={busyId === r.id}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Select value={exportFormat} onValueChange={setExportFormat}>
                                <SelectTrigger className="h-9 w-[110px]">
                                  <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pdf">PDF</SelectItem>
                                  <SelectItem value="xlsx">Excel</SelectItem>
                                  <SelectItem value="csv">CSV</SelectItem>
                                  <SelectItem value="json">JSON</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => exportRun(r.id, r.reportType)}
                                disabled={busyId === r.id}
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {r.status === "DRAFT" && (
                                <Button size="sm" onClick={() => doAction(r.id, "submit")} disabled={busyId === r.id}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Submit
                                </Button>
                              )}
                              {r.status === "SUBMITTED" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => doAction(r.id, "approve")}
                                    disabled={busyId === r.id}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedRun(r);
                                      setRejectDialogOpen(true);
                                    }}
                                    disabled={busyId === r.id}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Run dialog */}
        <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Run report</DialogTitle>
              <DialogDescription>Configure parameters for the selected report and generate a draft run.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Report type</Label>
                <Select
                  value={form.reportType}
                  onValueChange={(v) => {
                    setForm((p) => ({ ...p, reportType: v }));
                    setSelectedType(typeMeta.get(v) ?? null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType?.params === "year" && (
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} placeholder="2026" />
                </div>
              )}

              {selectedType?.params === "yearQuarter" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} placeholder="2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quarter</Label>
                    <Select value={form.quarter} onValueChange={(v) => setForm((p) => ({ ...p, quarter: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedType?.params === "date" && (
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
              )}

              {selectedType?.params === "range" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input type="date" value={form.from} onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input type="date" value={form.to} onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRun} disabled={busyId === "__create__"}>
                <Play className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Report run details</DialogTitle>
              <DialogDescription>Review parameters and generated data. Use Export for official formats.</DialogDescription>
            </DialogHeader>

            {!selectedRun ? (
              <div className="text-sm text-muted-foreground">No selection</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{typeMeta.get(selectedRun.reportType)?.title ?? selectedRun.reportType}</div>
                    <div className="text-xs text-muted-foreground">{selectedRun.id}</div>
                  </div>
                  {statusBadge(selectedRun.status)}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="text-sm">{formatDate(selectedRun.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Created by</div>
                    <div className="text-sm">{selectedRun.createdByUser?.name ?? "—"}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Parameters</div>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-40">{JSON.stringify(selectedRun.parameters ?? {}, null, 2)}</pre>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Data preview</div>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-72">{JSON.stringify(selectedRun.data ?? {}, null, 2)}</pre>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject report run</DialogTitle>
              <DialogDescription>Provide a reason for rejection (visible in audit and run details).</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRun && doAction(selectedRun.id, "reject")}
                disabled={!selectedRun || busyId === selectedRun?.id}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
