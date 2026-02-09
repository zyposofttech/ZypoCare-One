"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type ServiceChargeUnit =
  | "PER_UNIT"
  | "PER_VISIT"
  | "PER_TEST"
  | "PER_HOUR"
  | "PER_DAY"
  | "PER_SIDE"
  | "PER_LEVEL"
  | "PER_SESSION"
  | "PER_PROCEDURE"
  | "PER_PACKAGE";

type TaxType = "GST" | "TDS" | "OTHER";

type TaxCodeRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  taxType: TaxType;
  ratePercent: string | number;
  isActive: boolean;
  hsnSac?: string | null;
};

type ChargeMasterRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;

  category?: string | null;
  unit?: string | null;

  // Advanced billing (may be missing if backend not updated yet)
  chargeUnit?: ServiceChargeUnit | null;
  taxCodeId?: string | null;
  taxCode?: TaxCodeRow | null;
  isTaxInclusive?: boolean | null;
  hsnSac?: string | null;
  billingPolicy?: any | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  _count?: {
    tariffRates?: number;
    mappings?: number;
    servicePackages?: number;
  };
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
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

function activeBadge(isActive: boolean) {
  return isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>;
}

function unitLabel(u?: ServiceChargeUnit | null) {
  const x = u || "PER_UNIT";
  switch (x) {
    case "PER_UNIT":
      return "Per Unit";
    case "PER_VISIT":
      return "Per Visit";
    case "PER_TEST":
      return "Per Test";
    case "PER_HOUR":
      return "Per Hour";
    case "PER_DAY":
      return "Per Day";
    case "PER_SIDE":
      return "Per Side";
    case "PER_LEVEL":
      return "Per Level";
    case "PER_SESSION":
      return "Per Session";
    case "PER_PROCEDURE":
      return "Per Procedure";
    case "PER_PACKAGE":
      return "Per Package";
    default:
      return x;
  }
}

async function apiTry<T>(primary: string, fallback: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(primary, init as any);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      return await apiFetch<T>(fallback, init as any);
    }
    throw e;
  }
}

function looksLikeWhitelistError(msg?: string) {
  const s = (msg || "").toLowerCase();
  return (
    (s.includes("property") && s.includes("should not exist")) ||
    s.includes("whitelist") ||
    s.includes("forbidden") ||
    s.includes("non-whitelisted")
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminChargeMasterDetailPage() {
  const { toast } = useToast();
  // âœ… Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");
  const isNew = id === "new";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<ChargeMasterRow[]>([]);
  const [row, setRow] = React.useState<ChargeMasterRow | null>(null);

  const [taxCodes, setTaxCodes] = React.useState<TaxCodeRow[]>([]);

  // modals
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<ChargeMasterRow | null>(null);

  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [policyPayload, setPolicyPayload] = React.useState<any>(null);

  const [autoOpened, setAutoOpened] = React.useState(false);

  const mustSelectBranch = !branchId;

  async function loadBranches(forcePick = false): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;

    if (next && (forcePick || !branchId)) {
      if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next || "");
    }
    return next;
  }

  async function loadTaxCodesForBranch(bid: string) {
    try {
      const qs = buildQS({ branchId: bid, includeInactive: "true" });
      const res = await apiTry<any>(
        `/api/infrastructure/tax-codes?${qs}`,
        `/api/billing/tax-codes?${qs}`,
      );
      const list: TaxCodeRow[] = Array.isArray(res) ? res : res?.rows || [];
      setTaxCodes(list);
    } catch {
      setTaxCodes([]);
    }
  }

  async function loadChargeMasterList(bid: string) {
    try {
      const qs = buildQS({
        branchId: bid,
        includeInactive: "true",
        includeCounts: "true",
        includeTax: "true",
      });

      const res = await apiTry<any>(
        `/api/infrastructure/charge-master?${qs}`,
        `/api/infra/charge-master?${qs}`,
      );

      const list: ChargeMasterRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
    } catch {
      setRows([]);
    }
  }

  async function loadItem(showToast = false) {
    if (!id || isNew) return;
    setErr(null);
    setLoading(true);
    try {
      await loadBranches(false);
      const res = await apiTry<ChargeMasterRow>(
        `/api/infrastructure/charge-master/${encodeURIComponent(id)}`,
        `/api/infra/charge-master/${encodeURIComponent(id)}`,
      );
      const item = res || null;
      setRow(item);

      const bid = item?.branchId || "";
      if (bid) {
        if (isGlobalScope) setActiveBranchId(bid || null);
setBranchId(bid);
        await Promise.all([loadTaxCodesForBranch(bid), loadChargeMasterList(bid)]);
      } else {
        setTaxCodes([]);
        setRows([]);
      }

      if (showToast) {
        toast({ title: "Charge master refreshed", description: "Loaded latest details." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load charge master";
      setErr(msg);
      setRow(null);
      setRows([]);
      toast({ title: "Load failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    if (!isNew) {
      await loadItem(showToast);
      return;
    }

    setErr(null);
    setLoading(true);
    try {
      const bid = branchId || (await loadBranches(true));
      if (bid) {
        await Promise.all([loadTaxCodesForBranch(bid), loadChargeMasterList(bid)]);
      }
      if (showToast) {
        toast({ title: "Ready", description: "Branch scope and charge master are up to date." });
      }
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
      setErr(msg);
      toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    setAutoOpened(false);
    if (isNew) {
      void refreshAll(false);
      setRow(null);
      return;
    }
    void loadItem(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  React.useEffect(() => {
    if (!isNew || !branchId) return;
    void Promise.all([loadTaxCodesForBranch(branchId), loadChargeMasterList(branchId)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, isNew]);

  React.useEffect(() => {
    if (!isNew || autoOpened || !branchId) return;
    openCreate();
    setAutoOpened(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, autoOpened, branchId]);

  function onBranchChange(nextId: string) {
    if (!isNew) return;
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
}

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;

    const missingTax = rows.filter((r) => r.isActive && !r.taxCodeId).length;
    const missingUnit = rows.filter((r) => r.isActive && !r.chargeUnit).length;

    return { total, active, inactive, missingTax, missingUnit };
  }, [rows]);

  const branchLabel = React.useMemo(() => {
    if (!branchId) return "No branch selected";
    const b = branches.find((x) => x.id === branchId);
    return b ? `${b.code} - ${b.name} (${b.city})` : branchId;
  }, [branches, branchId]);

  function openCreate() {
    setEditMode("create");
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(row: ChargeMasterRow) {
    setEditMode("edit");
    setEditing(row);
    setEditOpen(true);
  }

  async function remove(row: ChargeMasterRow) {
    if (!row?.id) return;
    const ok = window.confirm("Delete this charge master item? (Only safe if not referenced anywhere.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/charge-master/${encodeURIComponent(row.id)}`,
        `/api/infra/charge-master/${encodeURIComponent(row.id)}`,
        { method: "DELETE" },
      );
      toast({ title: "Deleted", description: "Charge master item deleted." });
      await loadItem(false);
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "This backend may not support delete yet.",
        variant: "destructive" as any,
      });
    } finally {
      setBusy(false);
    }
  }

  async function quickToggle(row: ChargeMasterRow, nextActive: boolean) {
    const ok = window.confirm(nextActive ? "Activate this item?" : "Deactivate this item?");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/charge-master/${encodeURIComponent(row.id)}`,
        `/api/infra/charge-master/${encodeURIComponent(row.id)}`,
        { method: "PATCH", body: JSON.stringify({ isActive: nextActive }) },
      );
      toast({ title: "Updated", description: `Item is now ${nextActive ? "ACTIVE" : "INACTIVE"}.` });
      await loadItem(false);
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "This backend may not support PATCH yet.",
        variant: "destructive" as any,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Charge Master">
      <RequirePerm perm="INFRA_CHARGE_MASTER_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10" asChild>
              <Link href="/infrastructure/charge-master">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>

            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Receipt className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-tight">Charge Master</div>
              <div className="mt-1 text-sm text-zc-muted">
                Branch-scoped billable items used by tariff plans and packages.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button
              variant="outline"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={() => refreshAll(true)}
              disabled={loading || busy}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={openCreate}
              disabled={mustSelectBranch}
            >
              <Plus className="h-4 w-4" />
              New Item
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load charge master</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Best practice: every active item must have a charge unit and an active tax code.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              {isNew ? (
                <Select value={branchId || ""} onValueChange={onBranchChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    {branches.filter((b) => b.id).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2 text-sm text-zc-text">
                  {branchLabel}
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Items</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Inactive</div>
                <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{stats.inactive}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Active missing Tax</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.missingTax}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Active missing Unit</div>
                <div className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{stats.missingUnit}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="ok">Tariff uses ChargeMasterItem</Badge>
              <Badge variant="warning">Missing tax or unit {"->"} FixIt</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        {loading && !row && !isNew ? (
          <Card className="border-zc-border">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Loading item</CardTitle>
              <CardDescription>Fetching details for this charge master item.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : row ? (
          <ChargeMasterDetail
            row={row}
            busy={busy}
            onEdit={() => openEdit(row)}
            onToggle={() => quickToggle(row, !row.isActive)}
            onViewPolicy={() => {
              setPolicyPayload(row.billingPolicy ?? null);
              setPolicyOpen(true);
            }}
            onDelete={() => remove(row)}
          />
        ) : isNew ? (
          <Card className="border-zc-border">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Create a new charge master item</CardTitle>
              <CardDescription>Select a branch and add your first billable item.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                Once you save, the new item will appear in the main table.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zc-border">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Item not found</CardTitle>
              <CardDescription>The selected charge master item could not be found.</CardDescription>
            </CardHeader>
          </Card>
        )}
       
      </div>

      {/* Create/Edit drawer */}
      <ChargeMasterEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        branchId={branchId}
        editing={editing}
        taxCodes={taxCodes}
        onSaved={(saved) => {
          toast({ title: "Saved", description: "Charge master item saved successfully." });
          if (saved?.id && isNew) {
            router.replace(`/infrastructure/charge-master/${encodeURIComponent(saved.id as any)}`);
            return;
          }
          if (saved?.id && !isNew) {
            void loadItem(false);
            return;
          }
          void refreshAll(false);
        }}
      />

      {/* Policy viewer */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-zc-accent" />
              Billing Policy JSON
            </DialogTitle>
            <DialogDescription>Optional JSON: rounding, caps, package rules, refunds, etc.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <pre className="max-h-[60vh] overflow-auto text-xs leading-relaxed text-zc-text">
              {JSON.stringify(policyPayload ?? {}, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Detail Main Card                               */
/* -------------------------------------------------------------------------- */

function ChargeMasterDetail({
  row,
  busy,
  onEdit,
  onToggle,
  onViewPolicy,
  onDelete,
}: {
  row: ChargeMasterRow;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onViewPolicy: () => void;
  onDelete: () => void;
}) {
  const c = row._count || {};
  const missingTax = row.isActive && !row.taxCodeId;
  const missingUnit = row.isActive && !row.chargeUnit;

  return (
    <div className="grid gap-4">
      <Card className="border-zc-border">
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">
                <span className="font-mono">{row.code}</span> - {row.name}
              </CardTitle>
              <CardDescription>
                {activeBadge(row.isActive)} <span className="mx-2 text-zc-muted">-</span>
                Unit:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    missingUnit ? "text-amber-700 dark:text-amber-300" : "text-zc-text",
                  )}
                >
                  {row.chargeUnit ? unitLabel(row.chargeUnit) : "Missing"}
                </span>{" "}
                <span className="mx-2 text-zc-muted">-</span>
                Tax:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    missingTax ? "text-amber-700 dark:text-amber-300" : "text-zc-text",
                  )}
                >
                  {row.taxCode?.code || (row.taxCodeId ? "Linked" : "Missing")}
                </span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="info" className="gap-2" onClick={onEdit} disabled={busy}>
                <Wrench className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="success" className="gap-2" onClick={onViewPolicy} disabled={busy}>
                <Eye className="h-4 w-4" />
                Policy
              </Button>
              <Button
                variant={row.isActive ? "outline" : "primary"}
                className="gap-2"
                onClick={onToggle}
                disabled={busy}
              >
                <CheckCircle2 className="h-4 w-4" />
                {row.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="warning" className="gap-2" onClick={onDelete} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {(missingTax || missingUnit) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                <div>
                  <div className="font-semibold">Billing completeness warning</div>
                  <div className="mt-1 text-sm opacity-90">
                    Active items should have a charge unit and an active tax code to avoid FixIts and tariff gaps.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">Category</div>
              <div className="mt-1 text-sm font-semibold text-zc-text">{row.category || "-"}</div>
              <div className="mt-2 text-xs text-zc-muted">Updated: {fmtDateTime(row.updatedAt || null)}</div>
            </div>

            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">Usage</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">TariffRates: {c.tariffRates || 0}</Badge>
                <Badge variant="secondary">Mappings: {c.mappings || 0}</Badge>
                <Badge variant="secondary">Packages: {c.servicePackages || 0}</Badge>
              </div>
              <div className="mt-2 text-xs text-zc-muted">Unit field (display): {row.unit || "-"}</div>
            </div>
          </div>

          <Separator />

          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="text-sm font-semibold text-zc-text">Tax details</div>
            <div className="mt-1 text-sm text-zc-muted">
              Tax Code: <span className="font-semibold text-zc-text">{row.taxCode?.code || "-"}</span>{" "}
              {row.taxCode?.ratePercent != null ? (
                <>
                  - Rate: <span className="font-semibold text-zc-text">{String(row.taxCode.ratePercent)}%</span>
                </>
              ) : null}{" "}
              - Inclusive: <span className="font-semibold text-zc-text">{row.isTaxInclusive ? "Yes" : "No"}</span>
            </div>
            <div className="mt-1 text-sm text-zc-muted">
              HSN/SAC: <span className="font-semibold text-zc-text">{row.hsnSac || row.taxCode?.hsnSac || "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Create/Edit Drawer                            */
/* -------------------------------------------------------------------------- */

function ChargeMasterEditModal({
  open,
  onOpenChange,
  mode,
  branchId,
  editing,
  taxCodes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  editing: ChargeMasterRow | null;
  taxCodes: TaxCodeRow[];
  onSaved: (row?: ChargeMasterRow) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [tab, setTab] = React.useState<"basic" | "billing" | "policy">("basic");

  const [form, setForm] = React.useState<any>({
    code: "",
    name: "",
    category: "",
    unit: "",
    isActive: true,

    chargeUnit: "PER_UNIT" as ServiceChargeUnit,
    taxCodeId: "",
    isTaxInclusive: false,
    hsnSac: "",
    billingPolicyText: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setTab("basic");

    if (mode === "edit" && editing) {
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        category: editing.category || "",
        unit: editing.unit || "",
        isActive: Boolean(editing.isActive),

        chargeUnit: (editing.chargeUnit || "PER_UNIT") as ServiceChargeUnit,
        taxCodeId: editing.taxCodeId || "",
        isTaxInclusive: Boolean(editing.isTaxInclusive),
        hsnSac: editing.hsnSac || "",
        billingPolicyText: editing.billingPolicy != null ? JSON.stringify(editing.billingPolicy, null, 2) : "",
      });
    } else {
      setForm({
        code: "",
        name: "",
        category: "",
        unit: "",
        isActive: true,

        chargeUnit: "PER_UNIT",
        taxCodeId: "",
        isTaxInclusive: false,
        hsnSac: "",
        billingPolicyText: "",
      });
    }
  }, [open, mode, editing]);

  function patch(p: Partial<any>) {
    setForm((prev: any) => ({ ...prev, ...p }));
  }

  const activeTaxCodes = React.useMemo(() => taxCodes.filter((t) => t.isActive), [taxCodes]);

  async function save() {
    if (!branchId) return;

    const code = String(form.code || "").trim();
    const name = String(form.name || "").trim();

    if (!code || !name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    let billingPolicy: any = null;
    const bpText = String(form.billingPolicyText || "").trim();
    if (bpText) {
      try {
        billingPolicy = JSON.parse(bpText);
      } catch {
        toast({ title: "Invalid JSON", description: "Billing policy must be valid JSON (or leave blank)." });
        return;
      }
    }

    // UI-level enforcement: tax code must be active if selected
    const taxCodeId = String(form.taxCodeId || "").trim() || null;
    if (taxCodeId) {
      const tc = taxCodes.find((x) => x.id === taxCodeId);
      if (tc && !tc.isActive) {
        toast({
          title: "Inactive tax code",
          description: "Please choose an active tax code (or activate it in Tax Codes).",
          variant: "destructive" as any,
        });
        return;
      }
    }

    // Full payload (aligned schema)
    const payloadFull: any = {
      code,
      name,
      category: String(form.category || "").trim() || null,
      unit: String(form.unit || "").trim() || null,
      isActive: Boolean(form.isActive),

      chargeUnit: (form.chargeUnit || "PER_UNIT") as ServiceChargeUnit,
      taxCodeId,
      isTaxInclusive: Boolean(form.isTaxInclusive),
      hsnSac: String(form.hsnSac || "").trim() || null,
      billingPolicy,
    };

    // Minimal payload (current DTO in backend, if whitelist rejects advanced fields)
    const payloadMin: any = {
      code,
      name,
      category: payloadFull.category,
      unit: payloadFull.unit,
      isActive: payloadFull.isActive,
    };

    setSaving(true);
    try {
      let saved: ChargeMasterRow | undefined;
      if (mode === "create") {
        const urlA = `/api/infrastructure/charge-master?${buildQS({ branchId })}`;
        const urlB = `/api/infra/charge-master?${buildQS({ branchId })}`;

        try {
          saved = await apiTry<ChargeMasterRow>(urlA, urlB, { method: "POST", body: JSON.stringify(payloadFull) });
        } catch (e: any) {
          const msg = e?.message || "";
          if (e instanceof ApiError && e.status === 400 && looksLikeWhitelistError(msg)) {
            saved = await apiTry<ChargeMasterRow>(urlA, urlB, { method: "POST", body: JSON.stringify(payloadMin) });
            toast({
              title: "Saved (basic only)",
              description: "Backend DTO currently accepts only basic fields. We will add chargeUnit and taxCode support next.",
            });
          } else {
            throw e;
          }
        }
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        const urlA = `/api/infrastructure/charge-master/${encodeURIComponent(editing.id)}`;
        const urlB = `/api/infra/charge-master/${encodeURIComponent(editing.id)}`;

        try {
          saved = await apiTry<ChargeMasterRow>(urlA, urlB, { method: "PATCH", body: JSON.stringify(payloadFull) });
        } catch (e: any) {
          const msg = e?.message || "";
          if (e instanceof ApiError && e.status === 400 && looksLikeWhitelistError(msg)) {
            saved = await apiTry<ChargeMasterRow>(urlA, urlB, { method: "PATCH", body: JSON.stringify(payloadMin) });
            toast({
              title: "Updated (basic only)",
              description: "Backend update endpoint exists but rejects advanced fields. We will align DTO next.",
            });
          } else {
            throw e;
          }
        }
      }

      onOpenChange(false);
      onSaved(saved);
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Request failed.",
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Charge Master Item" : "Edit Charge Master Item"}
          </DialogTitle>
          <DialogDescription>
            Create billable items used by tariffs. Advanced billing fields depend on backend DTO alignment.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="px-6 pb-6 grid gap-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={tab === "basic" ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab("basic")}
            >
              Basic
            </Button>
            <Button
              type="button"
              variant={tab === "billing" ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab("billing")}
            >
              Billing
            </Button>
            <Button
              type="button"
              variant={tab === "policy" ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab("policy")}
            >
              Policy JSON
            </Button>
          </div>

          {tab === "basic" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input value={form.code || ""} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., LAB-CBC" />
              </div>

              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., Complete Blood Count" />
              </div>

              <div className="grid gap-2">
                <Label>Category (optional)</Label>
                <Input value={form.category || ""} onChange={(e) => patch({ category: e.target.value })} placeholder="e.g., LAB / RADIOLOGY / WARD / OT" />
              </div>

              <div className="grid gap-2">
                <Label>Unit (display, optional)</Label>
                <Input value={form.unit || ""} onChange={(e) => patch({ unit: e.target.value })} placeholder="e.g., Test / Day / Session" />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label>Active</Label>
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={Boolean(form.isActive)} onCheckedChange={(v) => patch({ isActive: v })} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">{form.isActive ? "Active" : "Inactive"}</div>
                    <div className="text-xs text-zc-muted">Inactive items should not be used for new tariffs</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "billing" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Charge Unit (enforced)</Label>
                <Select value={form.chargeUnit} onValueChange={(v) => patch({ chargeUnit: v as ServiceChargeUnit })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    {[
                      "PER_UNIT",
                      "PER_VISIT",
                      "PER_TEST",
                      "PER_HOUR",
                      "PER_DAY",
                      "PER_SIDE",
                      "PER_LEVEL",
                      "PER_SESSION",
                      "PER_PROCEDURE",
                      "PER_PACKAGE",
                    ].map((v) => (
                      <SelectItem key={v} value={v}>
                        {unitLabel(v as ServiceChargeUnit)} ({v})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-zc-muted">Tariff rate and billing must match this unit.</div>
              </div>

              <div className="grid gap-2">
                <Label>Tax Code</Label>
                <Select value={form.taxCodeId || ""} onValueChange={(v) => patch({ taxCodeId: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select tax code..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[360px] overflow-y-auto">
                    <SelectItem value="none">No Tax Code</SelectItem>
                    {activeTaxCodes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.code} - {t.name} - {String(t.ratePercent)}%
                      </SelectItem>
                    ))}
                    {taxCodes.filter((t) => !t.isActive).length > 0 ? (
                      <>
                        <Separator className="my-2" />
                        <div className="px-2 py-1 text-xs text-zc-muted">Inactive (not selectable)</div>
                        {taxCodes
                          .filter((t) => !t.isActive)
                          .map((t) => (
                            <div key={t.id} className="px-2 py-1 text-xs text-zc-muted opacity-70">
                              {t.code} - {t.name} - {String(t.ratePercent)}% (inactive)
                            </div>
                          ))}
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
                <div className="text-xs text-zc-muted">Must be active to avoid FixIts.</div>
              </div>

              <div className="grid gap-2">
                <Label>Tax Inclusive</Label>
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={Boolean(form.isTaxInclusive)} onCheckedChange={(v) => patch({ isTaxInclusive: v })} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">{form.isTaxInclusive ? "Inclusive" : "Exclusive"}</div>
                    <div className="text-xs text-zc-muted">Overrides plan defaults if backend supports</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>HSN/SAC (optional)</Label>
                <Input value={form.hsnSac || ""} onChange={(e) => patch({ hsnSac: e.target.value })} placeholder="e.g., 999312" />
              </div>
            </div>
          ) : null}

          {tab === "policy" ? (
            <div className="grid gap-2">
              <Label>Billing Policy JSON (optional)</Label>
              <Textarea
                value={form.billingPolicyText || ""}
                onChange={(e) => patch({ billingPolicyText: e.target.value })}
                placeholder={`{\n  "rounding": "NEAREST_1",\n  "capAmount": 25000,\n  "discountRules": [{ "type": "PERCENT", "value": 10 }]\n}`}
                className="min-h-[220px]"
              />
              <div className="text-xs text-zc-muted">
                Use this for advanced rules (caps, discounts, inclusions). Backend must store billingPolicy as JSON.
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
