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
import { AlertTriangle, Loader2, RefreshCw, FlaskConical, Scissors } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SeparationRow = {
  id: string;
  unitNumber: string;
  bloodGroup?: string;
  bagType: string;
  collectionStartAt?: string;
  status: string;
  volumeCollectedMl?: number;
};

type SeparationForm = {
  bloodUnitId: string;
  components: { componentType: string; volumeMl: string }[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const COMPONENT_TYPES = [
  "PRBC",
  "FFP",
  "PLATELET_RDP",
  "PLATELET_SDP",
  "CRYOPRECIPITATE",
  "CRYO_POOR_PLASMA",
] as const;

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

function formatBloodGroup(bg?: string) {
  if (!bg) return "-";
  return bg.replace(/_/g, " ");
}

function formatDate(d?: string) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

/* ------------------------------------------------------------------ */
/*  Separation Dialog                                                  */
/* ------------------------------------------------------------------ */

function SeparationDialog({
  open,
  row,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  open: boolean;
  row: SeparationRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [components, setComponents] = React.useState<{ componentType: string; volumeMl: string }[]>([
    { componentType: "", volumeMl: "" },
  ]);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setComponents([{ componentType: "", volumeMl: "" }]);
    }
  }, [open]);

  function addComponent() {
    setComponents((prev) => [...prev, { componentType: "", volumeMl: "" }]);
  }

  function removeComponent(idx: number) {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateComponent(idx: number, field: "componentType" | "volumeMl", value: string) {
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!row?.id) return setErr("No unit selected");

    const validComponents = components.filter((c) => c.componentType && c.volumeMl);
    if (validComponents.length === 0) {
      return setErr("Add at least one component with type and volume.");
    }

    for (const c of validComponents) {
      const vol = Number(c.volumeMl);
      if (!Number.isFinite(vol) || vol <= 0) {
        return setErr(`Invalid volume for ${c.componentType}. Must be a positive number.`);
      }
    }

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/separation", {
        method: "POST",
        body: JSON.stringify({
          bloodUnitId: row.id,
          components: validComponents.map((c) => ({
            componentType: c.componentType,
            volumeMl: Number(c.volumeMl),
          })),
          branchId,
        }),
      });

      await onSaved();
      toast({
        title: "Separation Recorded",
        description: `Unit ${row.unitNumber} separated into ${validComponents.length} component(s).`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Separation failed");
      toast({ variant: "destructive", title: "Separation failed", description: e?.message || "Separation failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !row) return null;

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
      <DialogContent className={drawerClassName("max-w-2xl")} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Scissors className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Record Separation
          </DialogTitle>
          <DialogDescription>
            Separate the parent unit into child blood components.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Parent Unit Info */}
        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">Parent Unit</div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-zc-muted">Unit #: </span>
              <span className="font-mono font-semibold text-zc-text">{row.unitNumber}</span>
            </div>
            <div>
              <span className="text-zc-muted">Blood Group: </span>
              <span className="font-semibold text-zc-text">{formatBloodGroup(row.bloodGroup)}</span>
            </div>
            <div>
              <span className="text-zc-muted">Bag Type: </span>
              <span className="text-zc-text">{row.bagType}</span>
            </div>
            <div>
              <span className="text-zc-muted">Volume: </span>
              <span className="text-zc-text">{row.volumeCollectedMl ?? "-"} ml</span>
            </div>
            <div>
              <span className="text-zc-muted">Collected At: </span>
              <span className="text-zc-text">{formatDate(row.collectionStartAt)}</span>
            </div>
            <div>
              <span className="text-zc-muted">Status: </span>
              <span className="text-zc-text">{row.status}</span>
            </div>
          </div>
        </div>

        {/* Child Components */}
        <div className="grid gap-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zc-text">Child Components</div>
            <Button variant="outline" size="sm" className="gap-1" onClick={addComponent}>
              + Add Component
            </Button>
          </div>

          {components.length === 0 ? (
            <div className="text-sm text-zc-muted text-center py-4">
              No components added. Click &quot;Add Component&quot; to begin.
            </div>
          ) : null}

          {components.map((c, idx) => (
            <div key={idx} className="flex items-end gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
              <div className="grid gap-2 flex-1">
                <Label className="text-xs">Component Type</Label>
                <Select value={c.componentType} onValueChange={(v) => updateComponent(idx, "componentType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 w-32">
                <Label className="text-xs">Volume (ml)</Label>
                <Input
                  type="number"
                  value={c.volumeMl}
                  onChange={(e) => updateComponent(idx, "volumeMl", e.target.value)}
                  placeholder="0"
                  min={1}
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeComponent(idx)}
                disabled={components.length <= 1}
                title="Remove component"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record Separation
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

export default function SeparationPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_COLLECTION_READ");
  const canCreate = hasPerm(user, "BB_COLLECTION_CREATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<SeparationRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [separateOpen, setSeparateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SeparationRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r) => {
      const hay = `${r.unitNumber} ${r.bloodGroup ?? ""} ${r.bagType} ${r.status}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<SeparationRow[]>(`/api/blood-bank/separation/worklist?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => (a.unitNumber || "").localeCompare(b.unitNumber || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Worklist refreshed", description: `Loaded ${sorted.length} units awaiting separation.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load separation worklist";
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

  return (
    <AppShell title="Component Separation">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FlaskConical className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Component Separation</div>
              <div className="mt-1 text-sm text-zc-muted">
                Separate collected whole-blood units into child components (PRBC, FFP, Platelets, etc.).
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
              Units awaiting separation from the blood bank collection worklist.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Awaiting Separation</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Separated Today</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">0</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Total Child Units</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">0</div>
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
                  placeholder="Search by unit number, blood group, bag type, status..."
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
            <CardTitle className="text-base">Separation Worklist</CardTitle>
            <CardDescription className="text-sm">Units ready for component separation. Click Separate to record child components.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Bag Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Volume (ml)</th>
                  <th className="px-4 py-3 text-left font-semibold">Collected At</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading worklist..." : "No units awaiting separation."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.unitNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                        {formatBloodGroup(r.bloodGroup)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{r.bagType}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.volumeCollectedMl ?? "-"}</span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{formatDate(r.collectionStartAt)}</td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                        {r.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canCreate ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelected(r);
                              setSeparateOpen(true);
                            }}
                            title="Separate unit"
                            aria-label="Separate unit"
                          >
                            <Scissors className="h-3.5 w-3.5" />
                            Separate
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

        {/* Info callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Separation workflow</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Collect whole-blood unit, then 2) Separate into components (PRBC, FFP, Platelets, etc.), then 3) Components proceed to testing and inventory.
              </div>
            </div>
          </div>
        </div>
      </div>

      <SeparationDialog
        open={separateOpen}
        row={selected}
        onClose={() => setSeparateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_COLLECTION_CREATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
