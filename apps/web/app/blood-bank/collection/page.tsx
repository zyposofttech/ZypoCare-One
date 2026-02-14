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
import { AlertTriangle, Loader2, RefreshCw, Droplets, Play } from "lucide-react";

type WorklistRow = {
  id: string;
  donorNumber?: string;
  name: string;
  bloodGroup?: string;
  donorType: string;
  lastDonation?: string;
  eligibleSince?: string;
};

type CollectionForm = {
  donorId: string;
  bagType: string;
  collectionType: string;
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

export default function CollectionPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_COLLECTION_READ");
  const canCreate = hasPerm(user, "BB_COLLECTION_CREATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<WorklistRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<WorklistRow | null>(null);
  const [form, setForm] = React.useState<CollectionForm>({ donorId: "", bagType: "", collectionType: "" });
  const [saving, setSaving] = React.useState(false);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r) => {
      const hay = `${r.donorNumber ?? ""} ${r.name} ${r.bloodGroup ?? ""} ${r.donorType}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<WorklistRow[]>(`/api/blood-bank/collection/worklist?branchId=${branchId}`);
      setRows(data ?? []);

      if (showToast) {
        toast({ title: "Worklist refreshed", description: `Loaded ${(data ?? []).length} eligible donors.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load worklist";
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

  function openStartDialog(row: WorklistRow) {
    setSelected(row);
    setForm({ donorId: row.id, bagType: "", collectionType: "" });
    setSaveErr(null);
    setSaving(false);
    setDialogOpen(true);
  }

  async function onSubmitStart() {
    setSaveErr(null);
    if (!canCreate) return setSaveErr("Missing permission: BB_COLLECTION_CREATE");
    if (!form.bagType) return setSaveErr("Please select a bag type");
    if (!form.collectionType) return setSaveErr("Please select a collection type");

    setSaving(true);
    try {
      await apiFetch("/api/blood-bank/collection/start", {
        method: "POST",
        body: JSON.stringify({
          donorId: form.donorId,
          branchId,
          bagType: form.bagType,
          collectionType: form.collectionType,
        }),
      });

      toast({
        title: "Collection Started",
        description: `Started collection for ${selected?.name ?? "donor"}`,
        variant: "success",
      });

      setDialogOpen(false);
      void refresh(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to start collection");
      toast({ variant: "destructive", title: "Start failed", description: e?.message || "Failed to start collection" });
    } finally {
      setSaving(false);
    }
  }

  const worklistSize = rows.length;
  const inProgress = 0;
  const completedToday = 0;

  return (
    <AppShell title="Blood Collection">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Droplets className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Blood Collection</div>
              <div className="mt-1 text-sm text-zc-muted">
                Eligible donors ready for blood collection. Start a collection to begin the phlebotomy process.
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
              Search eligible donors and start blood collection sessions.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Worklist Size</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{worklistSize}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Total eligible donors
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">In-Progress</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{inProgress}</div>
                <div className="mt-1 text-[11px] text-sky-700/80 dark:text-sky-300/80">
                  Active collections
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed Today</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{completedToday}</div>
                <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  Collections completed
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
                  placeholder="Search by donor number, name, blood group, type..."
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
            <CardTitle className="text-base">Collection Worklist</CardTitle>
            <CardDescription className="text-sm">Eligible donors awaiting blood collection. Click Start Collection to begin.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Donor #</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Blood Group</th>
                  <th className="px-4 py-3 text-left font-semibold">Donor Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Donation</th>
                  <th className="px-4 py-3 text-left font-semibold">Eligible Since</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading worklist..." : "No eligible donors in worklist."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.donorNumber || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.bloodGroup?.replace(/_/g, " ") || "-"}</span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{r.donorType}</td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.lastDonation ? new Date(r.lastDonation).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.eligibleSince ? new Date(r.eligibleSince).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canCreate ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openStartDialog(r)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Start Collection
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

      {/* Start Collection Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setSaveErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName("max-w-2xl")} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Droplets className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Start Collection
            </DialogTitle>
            <DialogDescription>
              Configure the bag type and collection type, then start the phlebotomy session.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {saveErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{saveErr}</div>
            </div>
          ) : null}

          {/* Donor Summary Card */}
          {selected ? (
            <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
              <div className="text-sm font-semibold text-zc-text">
                {selected.name}{" "}
                {selected.donorNumber ? (
                  <span className="font-mono text-xs text-zc-muted">({selected.donorNumber})</span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zc-muted">
                <span>Blood Group: <span className="font-semibold text-zc-text">{selected.bloodGroup?.replace(/_/g, " ") || "-"}</span></span>
                <span>Type: <span className="font-semibold text-zc-text">{selected.donorType}</span></span>
                {selected.lastDonation ? (
                  <span>Last Donation: <span className="font-semibold text-zc-text">{new Date(selected.lastDonation).toLocaleDateString()}</span></span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Collection Details */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Collection Details</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Bag Type</Label>
                  <Select value={form.bagType} onValueChange={(v) => setForm((s) => ({ ...s, bagType: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bag type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="DOUBLE">Double</SelectItem>
                      <SelectItem value="TRIPLE">Triple</SelectItem>
                      <SelectItem value="QUADRUPLE">Quadruple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Collection Type</Label>
                  <Select value={form.collectionType} onValueChange={(v) => setForm((s) => ({ ...s, collectionType: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select collection type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHOLE_BLOOD_350">Whole Blood 350ml</SelectItem>
                      <SelectItem value="WHOLE_BLOOD_450">Whole Blood 450ml</SelectItem>
                      <SelectItem value="APHERESIS_SDP">Apheresis SDP</SelectItem>
                      <SelectItem value="APHERESIS_PLASMA">Apheresis Plasma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void onSubmitStart()}
                disabled={saving || !canCreate}
                title={!canCreate ? "Missing permission: BB_COLLECTION_CREATE" : undefined}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Start Collection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
