"use client";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { AppLink as Link } from "@/components/app-link";
import {
  CompliancePageHead,
  CompliancePageInsights,
} from "@/components/copilot/ComplianceHelpInline";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ApiError, apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { Link2, Link2Off, Loader2, Lock, RefreshCw, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

const SCHEME = "PMJAY" as const;

type EmpanelmentStatus = "ACTIVE" | "PENDING" | "EXPIRED";
type RateCardStatus = "DRAFT" | "ACTIVE" | "FROZEN";

type Empanelment = {
  id: string;
  scheme: string;
  empanelmentNumber: string;
  shaCode: string;
  state: string;
  status: EmpanelmentStatus;
  createdAt: string;
  updatedAt: string;
  govSchemeConfigId?: string | null;
  lastSyncedAt?: string | null;
};

type RateCard = {
  id: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: RateCardStatus;
  itemCount: number;
};

type SyncResult = {
  empanelmentId: string;
  govSchemeConfigId: string;
  created: boolean;
  syncedFields: string[];
  rateCardSynced: boolean;
  rateCardItemCount: number;
  syncedAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "DRAFT":
    case "PENDING":
      return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "FROZEN":
      return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
    case "EXPIRED":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

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

function EmpanelmentEditorDialog({
  open,
  initial,
  branchId,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Empanelment | null;
  branchId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    empanelmentNumber: "",
    shaCode: "",
    state: "",
    status: "ACTIVE" as EmpanelmentStatus,
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({
      empanelmentNumber: initial?.empanelmentNumber ?? "",
      shaCode: initial?.shaCode ?? "",
      state: initial?.state ?? "",
      status: initial?.status ?? "ACTIVE",
    });
  }, [open, initial]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!branchId) return setErr("Select a branch first");
    if (!form.empanelmentNumber.trim()) return setErr("Empanelment number is required");

    setBusy(true);
    try {
      const method = initial ? "PATCH" : "POST";
      const url = initial
        ? `/api/compliance/schemes/empanelments/${initial.id}`
        : "/api/compliance/schemes/empanelments";

      await apiFetch(url, {
        method,
        body: {
          scheme: SCHEME,
          branchId,
          empanelmentNumber: form.empanelmentNumber.trim(),
          shaCode: form.shaCode.trim(),
          state: form.state.trim(),
          status: form.status,
        },
      });

      toast({
        title: initial ? "Empanelment updated" : "Empanelment created",
        variant: "success",
      });

      onClose();
      await onSaved();
    } catch (e) {
      setErr(errorMessage(e, "Failed to save empanelment"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent
        className={drawerClassName("max-w-3xl")}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {initial ? "Edit PMJAY Empanelment" : "Configure PMJAY Empanelment"}
          </DialogTitle>
          <DialogDescription>
            Set up branch-level PMJAY empanelment details before syncing to operations.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            {err}
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Empanelment Basics</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Empanelment Number</Label>
                <Input
                  value={form.empanelmentNumber}
                  onChange={(e) => set("empanelmentNumber", e.target.value)}
                  placeholder="e.g. IN-KA-12345"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as EmpanelmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Regulatory Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SHA Code</Label>
                <Input
                  value={form.shaCode}
                  onChange={(e) => set("shaCode", e.target.value)}
                  placeholder="e.g. SHA-KA"
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? "Save Changes" : "Create Empanelment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PmjayPage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [empanelment, setEmpanelment] = React.useState<Empanelment | null>(null);
  const [rateCards, setRateCards] = React.useState<RateCard[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({
    module: "compliance-schemes-pmjay",
  });

  const filteredRateCards = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rateCards;
    return rateCards.filter((r) => {
      const hay =
        `${r.version} ${r.status} ${r.itemCount} ${r.effectiveFrom} ${r.effectiveTo ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rateCards, q]);

  const refresh = React.useCallback(
    async (showToast = false) => {
      if (!activeBranchId) {
        setEmpanelment(null);
        setRateCards([]);
        return;
      }

      setErr(null);
      setLoading(true);
      try {
        const [empRes, rcRes] = await Promise.all([
          apiFetch<Empanelment[] | { items: Empanelment[] }>(
            `/api/compliance/schemes/empanelments?branchId=${activeBranchId}&scheme=${SCHEME}`,
          ),
          apiFetch<RateCard[] | { items: RateCard[] }>(
            `/api/compliance/schemes/rate-cards?branchId=${activeBranchId}&scheme=${SCHEME}`,
          ),
        ]);

        const empItems = Array.isArray(empRes) ? empRes : (empRes?.items ?? []);
        const rcItems = Array.isArray(rcRes) ? rcRes : (rcRes?.items ?? []);

        setEmpanelment(empItems[0] ?? null);
        setRateCards(
          [...rcItems].sort((a, b) => {
            const da = a.effectiveFrom || "";
            const db = b.effectiveFrom || "";
            return db.localeCompare(da);
          }),
        );

        if (showToast) {
          toast({
            title: "PMJAY refreshed",
            description: "Loaded latest empanelment and rate cards.",
          });
        }
      } catch (e) {
        const msg = errorMessage(e, "Failed to load PMJAY data");
        setErr(msg);
        toast({ variant: "destructive", title: "Refresh failed", description: msg });
      } finally {
        setLoading(false);
      }
    },
    [activeBranchId, toast],
  );

  React.useEffect(() => {
    void refresh(false);
  }, [refresh]);

  async function handleNewRateCard() {
    if (!activeBranchId) return;
    try {
      const res = await apiFetch<RateCard>("/api/compliance/schemes/rate-cards", {
        method: "POST",
        body: {
          scheme: SCHEME,
          branchId: activeBranchId,
        },
      });
      toast({ title: "Rate card created", variant: "success" });
      await refresh(false);
      if (res?.id) router.push(`/compliance/schemes/rate-cards/${res.id}`);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: errorMessage(e, "Failed to create rate card"),
      });
    }
  }

  async function handleFreeze(rateCardId: string) {
    try {
      await apiFetch(`/api/compliance/schemes/rate-cards/${rateCardId}/freeze`, {
        method: "POST",
        body: {},
      });
      toast({ title: "Rate card frozen", variant: "success" });
      await refresh(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Freeze failed",
        description: errorMessage(e, "Failed to freeze rate card"),
      });
    }
  }

  async function handlePushToInfra() {
    if (!empanelment) return;
    setSyncing(true);
    try {
      const res = await apiFetch<SyncResult>(
        `/api/compliance/schemes/sync/push/${empanelment.id}`,
        {
          method: "POST",
        },
      );
      toast({
        title: "Synced to operations",
        description: `${res.created ? "Created new" : "Updated existing"} infrastructure config.`,
        variant: "success",
      });
      await refresh(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: errorMessage(e, "Failed to sync PMJAY configuration"),
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleUnlink() {
    if (!empanelment) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/compliance/schemes/sync/unlink/${empanelment.id}`, {
        method: "POST",
      });
      toast({
        title: "Unlinked",
        description: "Empanelment unlinked from infrastructure config.",
        variant: "success",
      });
      await refresh(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Unlink failed",
        description: errorMessage(e, "Failed to unlink PMJAY configuration"),
      });
    } finally {
      setSyncing(false);
    }
  }

  const totalRateCards = rateCards.length;
  const activeRateCards = rateCards.filter((r) => r.status === "ACTIVE").length;
  const frozenRateCards = rateCards.filter((r) => r.status === "FROZEN").length;
  const linked = !!empanelment?.govSchemeConfigId;

  return (
    <AppShell title={`${SCHEME} Configuration`}>
      <RequirePerm perm="COMPLIANCE_SCHEME_EMPANEL">
        <div className="grid gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ShieldCheck className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">{SCHEME} Configuration</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Manage PMJAY empanelment and scheme rate cards for the active branch.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CompliancePageHead pageId="compliance-schemes-pmjay" />
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void refresh(true)}
                disabled={loading || syncing}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => setDialogOpen(true)}
                disabled={loading || syncing || !activeBranchId}
              >
                <Settings className="h-4 w-4" />
                {empanelment ? "Edit Empanelment" : "Configure Empanelment"}
              </Button>
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => void handleNewRateCard()}
                disabled={loading || syncing || !activeBranchId}
              >
                <IconPlus className="h-4 w-4" />
                New Rate Card
              </Button>
            </div>
          </div>

          <CompliancePageInsights pageId="compliance-schemes-pmjay" />

          <PageInsightBanner
            insights={insights}
            loading={insightsLoading}
            onDismiss={dismissInsight}
          />

          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">
                Search rate cards and manage PMJAY linkage with operations.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Empanelment
                  </div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                    {empanelment ? "Configured" : "Not Configured"}
                  </div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Status:{" "}
                    <span className="font-semibold tabular-nums">{empanelment?.status ?? "-"}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                    Rate Cards
                  </div>
                  <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                    {totalRateCards}
                  </div>
                  <div className="mt-1 text-[11px] text-sky-700/80 dark:text-sky-300/80">
                    Active: <span className="font-semibold tabular-nums">{activeRateCards}</span> |
                    Frozen: <span className="font-semibold tabular-nums">{frozenRateCards}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                    Operations Link
                  </div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                    {linked ? "Linked" : "Not Linked"}
                  </div>
                  <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                    Last Synced:{" "}
                    <span className="font-semibold">{formatDate(empanelment?.lastSyncedAt)}</span>
                  </div>
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
                    placeholder="Search by version, status, date or item count..."
                    className="pl-10"
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing{" "}
                  <span className="font-semibold tabular-nums text-zc-text">
                    {filteredRateCards.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold tabular-nums text-zc-text">
                    {rateCards.length}
                  </span>
                </div>
              </div>

              {err ? (
                <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <div className="min-w-0">{err}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Empanelment Registry</CardTitle>
              <CardDescription className="text-sm">
                Configure PMJAY empanelment details and synchronize to infrastructure operations.
              </CardDescription>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Scheme</th>
                    <th className="px-4 py-3 text-left font-semibold">Empanelment Number</th>
                    <th className="px-4 py-3 text-left font-semibold">SHA Code</th>
                    <th className="px-4 py-3 text-left font-semibold">State</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Operations</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!empanelment ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? (
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-zc-muted" />
                        ) : (
                          "No empanelment configured."
                        )}
                      </td>
                    </tr>
                  ) : null}

                  {empanelment ? (
                    <tr className="border-t border-zc-border hover:bg-zc-panel/20">
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                          {SCHEME}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-zc-text">
                        {empanelment.empanelmentNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{empanelment.shaCode || "-"}</td>
                      <td className="px-4 py-3 text-zc-muted">{empanelment.state || "-"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            statusBadgeClass(empanelment.status),
                          )}
                        >
                          {empanelment.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-zc-text text-sm">
                          {empanelment.govSchemeConfigId ? "Linked" : "Not Linked"}
                        </div>
                        <div className="mt-0.5 text-xs text-zc-muted">
                          Last Synced: {formatDate(empanelment.lastSyncedAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => setDialogOpen(true)}
                            title="Edit empanelment"
                            aria-label="Edit empanelment"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handlePushToInfra()}
                            disabled={syncing}
                            className="gap-1.5"
                          >
                            {syncing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                            {empanelment.govSchemeConfigId ? "Re-sync" : "Push"}
                          </Button>

                          {empanelment.govSchemeConfigId ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleUnlink()}
                              disabled={syncing}
                              className="gap-1.5"
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                              Unlink
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rate Card Registry</CardTitle>
              <CardDescription className="text-sm">
                Track PMJAY tariff versions and freeze finalized cards.
              </CardDescription>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Version</th>
                    <th className="px-4 py-3 text-left font-semibold">Effective From</th>
                    <th className="px-4 py-3 text-left font-semibold">Effective To</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Items</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!filteredRateCards.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? (
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-zc-muted" />
                        ) : (
                          "No rate cards found."
                        )}
                      </td>
                    </tr>
                  ) : null}

                  {filteredRateCards.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer"
                      onClick={() => router.push(`/compliance/schemes/rate-cards/${row.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/compliance/schemes/rate-cards/${row.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-zc-text">{row.version}</td>
                      <td className="px-4 py-3 text-zc-muted">{formatDate(row.effectiveFrom)}</td>
                      <td className="px-4 py-3 text-zc-muted">{formatDate(row.effectiveTo)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            statusBadgeClass(row.status),
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-zc-text">
                        {row.itemCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="success" size="icon">
                            <Link
                              href={`/compliance/schemes/rate-cards/${row.id}`}
                              title="View details"
                              aria-label="View details"
                            >
                              <IconChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>

                          {row.status === "DRAFT" || row.status === "ACTIVE" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleFreeze(row.id);
                              }}
                              className="gap-1.5"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Freeze
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Recommended setup order</div>
                <div className="mt-1 text-sm text-zc-muted">
                  1) Configure empanelment, 2) Create and finalize rate cards, then 3) Push to
                  operations.
                </div>
              </div>
            </div>
          </div>
        </div>

        <EmpanelmentEditorDialog
          open={dialogOpen}
          initial={empanelment}
          branchId={activeBranchId}
          onClose={() => setDialogOpen(false)}
          onSaved={() => refresh(false)}
        />
      </RequirePerm>
    </AppShell>
  );
}
