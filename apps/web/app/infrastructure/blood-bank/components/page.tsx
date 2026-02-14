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
import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, FlaskConical } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ComponentRow = {
  id: string;
  name: string;
  code: string;
  componentType: string;
  shelfLifeDays: number;
  prepMethod?: string;
  storageMinTempC?: number;
  storageMaxTempC?: number;
  volumeMinMl?: number;
  volumeMaxMl?: number;
  createdAt?: string;
};

type ComponentForm = {
  name: string;
  code: string;
  componentType: string;
  shelfLifeDays: string;
  prepMethod: string;
  storageMinTempC: string;
  storageMaxTempC: string;
  volumeMinMl: string;
  volumeMaxMl: string;
};

/* ------------------------------------------------------------------ */
/*  Component-type options                                            */
/* ------------------------------------------------------------------ */

const COMPONENT_TYPE_OPTIONS = [
  { value: "WHOLE_BLOOD", label: "Whole Blood" },
  { value: "PRBC", label: "PRBC" },
  { value: "FFP", label: "FFP" },
  { value: "PLATELET_RDP", label: "Platelet RDP" },
  { value: "PLATELET_SDP", label: "Platelet SDP" },
  { value: "CRYOPRECIPITATE", label: "Cryoprecipitate" },
  { value: "CRYO_POOR_PLASMA", label: "Cryo Poor Plasma" },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: ComponentForm = {
  name: "",
  code: "",
  componentType: "",
  shelfLifeDays: "",
  prepMethod: "",
  storageMinTempC: "",
  storageMaxTempC: "",
  volumeMinMl: "",
  volumeMaxMl: "",
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

function formatTemp(min?: number, max?: number): string {
  if (min == null && max == null) return "-";
  if (min != null && max != null) return `${min}\u00B0C \u2013 ${max}\u00B0C`;
  if (min != null) return `\u2265 ${min}\u00B0C`;
  return `\u2264 ${max}\u00B0C`;
}

function formatVolume(min?: number, max?: number): string {
  if (min == null && max == null) return "-";
  if (min != null && max != null) return `${min} \u2013 ${max} mL`;
  if (min != null) return `\u2265 ${min} mL`;
  return `\u2264 ${max} mL`;
}

function componentTypeLabel(value: string): string {
  const opt = COMPONENT_TYPE_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

/* ------------------------------------------------------------------ */
/*  EditorModal                                                       */
/* ------------------------------------------------------------------ */

function EditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: ComponentRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string | null;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<ComponentForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "edit" && initial) {
      setForm({
        name: initial.name ?? "",
        code: initial.code ?? "",
        componentType: initial.componentType ?? "",
        shelfLifeDays: initial.shelfLifeDays != null ? String(initial.shelfLifeDays) : "",
        prepMethod: initial.prepMethod ?? "",
        storageMinTempC: initial.storageMinTempC != null ? String(initial.storageMinTempC) : "",
        storageMaxTempC: initial.storageMaxTempC != null ? String(initial.storageMaxTempC) : "",
        volumeMinMl: initial.volumeMinMl != null ? String(initial.volumeMinMl) : "",
        volumeMaxMl: initial.volumeMaxMl != null ? String(initial.volumeMaxMl) : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, initial, mode]);

  function set<K extends keyof ComponentForm>(key: K, value: ComponentForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.name.trim()) return setErr("Name is required");
    if (!form.code.trim()) return setErr("Code is required");
    if (!form.componentType) return setErr("Component type is required");

    const shelfLife = Number(form.shelfLifeDays);
    if (!form.shelfLifeDays.trim() || !Number.isFinite(shelfLife) || shelfLife < 0) {
      return setErr("Shelf life (days) must be a non-negative number");
    }

    const storageMin = form.storageMinTempC.trim() ? Number(form.storageMinTempC) : undefined;
    const storageMax = form.storageMaxTempC.trim() ? Number(form.storageMaxTempC) : undefined;
    if (storageMin !== undefined && !Number.isFinite(storageMin)) return setErr("Min storage temp must be a valid number");
    if (storageMax !== undefined && !Number.isFinite(storageMax)) return setErr("Max storage temp must be a valid number");
    if (storageMin !== undefined && storageMax !== undefined && storageMin > storageMax) {
      return setErr("Min storage temp cannot exceed max storage temp");
    }

    const volMin = form.volumeMinMl.trim() ? Number(form.volumeMinMl) : undefined;
    const volMax = form.volumeMaxMl.trim() ? Number(form.volumeMaxMl) : undefined;
    if (volMin !== undefined && (!Number.isFinite(volMin) || volMin < 0)) return setErr("Min volume must be a non-negative number");
    if (volMax !== undefined && (!Number.isFinite(volMax) || volMax < 0)) return setErr("Max volume must be a non-negative number");
    if (volMin !== undefined && volMax !== undefined && volMin > volMax) {
      return setErr("Min volume cannot exceed max volume");
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        componentType: form.componentType,
        shelfLifeDays: shelfLife,
        prepMethod: form.prepMethod.trim() || null,
        storageMinTempC: storageMin ?? null,
        storageMaxTempC: storageMax ?? null,
        volumeMinMl: volMin ?? null,
        volumeMaxMl: volMax ?? null,
      };

      if (mode === "create") {
        payload.branchId = branchId;
        await apiFetch("/api/blood-bank/components", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!initial?.id) throw new Error("Missing component id");
        await apiFetch(`/api/blood-bank/components/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Component Created" : "Component Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} component "${form.name}"`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

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
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Create Component Type" : "Edit Component Type"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new blood component type with storage requirements and volume specifications."
              : "Update the blood component type details."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Section: Basic */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Basic</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Packed Red Blood Cells" />
              </div>

              <div className="grid gap-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. PRBC"
                  className="font-mono"
                  disabled={mode === "edit"}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Component Type</Label>
              <Select value={form.componentType} onValueChange={(v) => set("componentType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Section: Storage & Shelf Life */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Storage & Shelf Life</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Shelf Life (days)</Label>
                <Input
                  value={form.shelfLifeDays}
                  onChange={(e) => set("shelfLifeDays", e.target.value)}
                  placeholder="e.g. 35"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Preparation Method (optional)</Label>
                <Input
                  value={form.prepMethod}
                  onChange={(e) => set("prepMethod", e.target.value)}
                  placeholder="e.g. Centrifugation"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Storage Temp (&deg;C)</Label>
                <Input
                  value={form.storageMinTempC}
                  onChange={(e) => set("storageMinTempC", e.target.value)}
                  placeholder="e.g. 2"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Max Storage Temp (&deg;C)</Label>
                <Input
                  value={form.storageMaxTempC}
                  onChange={(e) => set("storageMaxTempC", e.target.value)}
                  placeholder="e.g. 6"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Volume */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Volume</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Volume (mL)</Label>
                <Input
                  value={form.volumeMinMl}
                  onChange={(e) => set("volumeMinMl", e.target.value)}
                  placeholder="e.g. 200"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Max Volume (mL)</Label>
                <Input
                  value={form.volumeMaxMl}
                  onChange={(e) => set("volumeMaxMl", e.target.value)}
                  placeholder="e.g. 350"
                  inputMode="numeric"
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
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create Component" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function BBComponentTypesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_COMPONENT_READ");
  const canCreate = hasPerm(user, "BB_COMPONENT_CREATE");
  const canUpdate = hasPerm(user, "BB_COMPONENT_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ComponentRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ComponentRow | null>(null);

  /* ---- derived data ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r) => {
      const hay = `${r.code} ${r.name} ${r.componentType} ${r.prepMethod ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const uniqueTypesInUse = React.useMemo(() => {
    const set = new Set(rows.map((r) => r.componentType));
    return set.size;
  }, [rows]);

  const avgShelfLife = React.useMemo(() => {
    if (!rows.length) return 0;
    const total = rows.reduce((acc, r) => acc + (r.shelfLifeDays ?? 0), 0);
    return Math.round(total / rows.length);
  }, [rows]);

  /* ---- data fetch ---- */
  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<ComponentRow[]>(`/api/blood-bank/components?branchId=${branchId}`);
      const sorted = [...(data ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Components refreshed", description: `Loaded ${sorted.length} component types.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load component types";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (branchId) void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- render ---- */
  return (
    <AppShell title="BB Component Types">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FlaskConical className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Component Types</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define blood component types, storage requirements and volume specifications for the blood bank.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Component
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search component types and manage master data. Define storage temperature ranges, shelf life and volume specifications.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {/* Stats */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Components</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Component Types in Use</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{uniqueTypesInUse}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Avg Shelf Life</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {avgShelfLife} <span className="text-sm font-normal">days</span>
                </div>
              </div>
            </div>

            {/* Search + count */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by code, name, type, method..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {/* Error banner */}
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
            <CardTitle className="text-base">Component Type Registry</CardTitle>
            <CardDescription className="text-sm">
              Master list of blood component types with storage and volume specifications.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Component Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Shelf Life</th>
                  <th className="px-4 py-3 text-left font-semibold">Storage Temp</th>
                  <th className="px-4 py-3 text-left font-semibold">Volume Range</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading component types..." : "No component types found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.code}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.name}</div>
                      {r.prepMethod ? (
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={r.prepMethod}>
                          {r.prepMethod}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{componentTypeLabel(r.componentType)}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.shelfLifeDays} days</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs text-zc-text">{formatTemp(r.storageMinTempC, r.storageMaxTempC)}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs text-zc-text">{formatVolume(r.volumeMinMl, r.volumeMaxMl)}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => {
                              setSelected(r);
                              setEditOpen(true);
                            }}
                            title="Edit component type"
                            aria-label="Edit component type"
                          >
                            <Pencil className="h-4 w-4" />
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
      </div>

      {/* Modals */}
      <EditorModal
        mode="create"
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_COMPONENT_CREATE"
        branchId={branchId ?? ""}
      />

      <EditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_COMPONENT_UPDATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
