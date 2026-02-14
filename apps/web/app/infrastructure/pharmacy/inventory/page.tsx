"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconSearch } from "@/components/icons";
import { Check, Package, Pencil, RefreshCw, X } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type StoreOption = { id: string; storeCode: string; storeName: string };
type ConfigRow = {
  id: string;
  pharmacyStoreId: string;
  drugMasterId: string;
  minimumStock: number | null;
  maximumStock: number | null;
  reorderLevel: number | null;
  reorderQuantity: number | null;
  safetyStock: number | null;
  abcClass: string | null;
  vedClass: string | null;
  drugMaster?: { drugCode: string; genericName: string; brandName: string | null };
};

/* ----------------------------- Helpers -------------------------------- */

function abcPillClass(abc: string | null) {
  switch (abc) {
    case "A":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
    case "B":
    case "C":
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function vedPillClass(ved: string | null) {
  switch (ved) {
    case "V":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200";
    case "E":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
    case "D":
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

/* -------------------------------- Page --------------------------------- */

export default function InventoryConfigPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_INVENTORY_READ");
  const canUpdate = hasPerm(user, "INFRA_PHARMACY_INVENTORY_UPDATE");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy-inventory",
    enabled: !!branchId,
  });

  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = React.useState("");
  const [configs, setConfigs] = React.useState<ConfigRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  // Inline editing
  const [editRow, setEditRow] = React.useState<string | null>(null);
  const [editData, setEditData] = React.useState<{
    minimumStock: number | null;
    maximumStock: number | null;
    reorderLevel: number | null;
    reorderQuantity: number | null;
    safetyStock: number | null;
    abcClass: string | null;
    vedClass: string | null;
  }>({
    minimumStock: null,
    maximumStock: null,
    reorderLevel: null,
    reorderQuantity: null,
    safetyStock: null,
    abcClass: null,
    vedClass: null,
  });
  const [saving, setSaving] = React.useState(false);

  /* ---- Load stores ---- */
  React.useEffect(() => {
    if (!branchId) return;
    apiFetch(`/infrastructure/pharmacy/stores?pageSize=200`)
      .then((data: any) => {
        const storeList: StoreOption[] = data.rows ?? [];
        setStores(storeList);
        if (storeList.length > 0 && !selectedStore) {
          setSelectedStore(storeList[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- Load configs ---- */
  const loadConfigs = React.useCallback(
    async (showToast = false) => {
      if (!selectedStore) return;
      setLoading(true);
      try {
        const data: any = await apiFetch(
          `/infrastructure/pharmacy/inventory-config?storeId=${selectedStore}`,
        );
        setConfigs(data.rows ?? []);
        if (showToast) {
          toast({ title: "Configs refreshed", description: `Loaded ${(data.rows ?? []).length} inventory configs.` });
        }
      } catch (err: any) {
        toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [selectedStore, toast],
  );

  React.useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  /* ---- Inline edit ---- */
  function startEdit(row: ConfigRow) {
    setEditRow(row.id);
    setEditData({
      minimumStock: row.minimumStock,
      maximumStock: row.maximumStock,
      reorderLevel: row.reorderLevel,
      reorderQuantity: row.reorderQuantity,
      safetyStock: row.safetyStock,
      abcClass: row.abcClass,
      vedClass: row.vedClass,
    });
  }

  function cancelEdit() {
    setEditRow(null);
    setEditData({
      minimumStock: null,
      maximumStock: null,
      reorderLevel: null,
      reorderQuantity: null,
      safetyStock: null,
      abcClass: null,
      vedClass: null,
    });
  }

  async function handleSave(row: ConfigRow) {
    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/inventory-config`, {
        method: "POST",
        body: {
          configs: [
            {
              pharmacyStoreId: row.pharmacyStoreId,
              drugMasterId: row.drugMasterId,
              minimumStock: editData.minimumStock,
              maximumStock: editData.maximumStock,
              reorderLevel: editData.reorderLevel,
              reorderQuantity: editData.reorderQuantity,
              safetyStock: editData.safetyStock,
              abcClass: editData.abcClass,
              vedClass: editData.vedClass,
            },
          ],
        },
      });
      cancelEdit();
      toast({ title: "Config Updated", description: "Inventory configuration saved successfully.", variant: "success" });
      void loadConfigs();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Search filter ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return configs;
    return configs.filter((c) => {
      const hay = `${c.drugMaster?.drugCode ?? ""} ${c.drugMaster?.genericName ?? ""} ${c.drugMaster?.brandName ?? ""} ${c.abcClass ?? ""} ${c.vedClass ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [configs, q]);

  /* ---- Overview stats ---- */
  const totalConfigs = configs.length;
  const withReorderLevel = configs.filter((c) => c.reorderLevel != null).length;
  const withAbcClass = configs.filter((c) => c.abcClass != null).length;

  return (
    <AppShell title="Infrastructure - Inventory Configuration">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Package className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Inventory Configuration</div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure min/max stock levels, reorder points, and ABC-VED classification per store.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void loadConfigs(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Store selector */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Select Store</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a pharmacy store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.storeCode} — {s.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search inventory configurations and edit stock parameters inline. Select a store above to view its drug-level settings.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Configs</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalConfigs}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">With Reorder Level</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{withReorderLevel}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">With ABC Classification</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{withAbcClass}</div>
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
                  placeholder="Search by drug code, name, ABC/VED class..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{configs.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Stock Level Configuration
              {selectedStore && ` — ${stores.find((s) => s.id === selectedStore)?.storeName ?? ""}`}
            </CardTitle>
            <CardDescription className="text-sm">Inventory parameters for each drug in this store.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Drug Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Drug Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Min Stock</th>
                  <th className="px-4 py-3 text-left font-semibold">Max Stock</th>
                  <th className="px-4 py-3 text-left font-semibold">Reorder Level</th>
                  <th className="px-4 py-3 text-left font-semibold">Reorder Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Safety Stock</th>
                  <th className="px-4 py-3 text-left font-semibold">ABC/VED</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading
                        ? "Loading inventory configs..."
                        : !selectedStore
                          ? "Select a store to view configurations."
                          : "No inventory configurations found for this store."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {c.drugMaster?.drugCode ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{c.drugMaster?.genericName ?? "—"}</div>
                      {c.drugMaster?.brandName ? (
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={c.drugMaster.brandName}>
                          {c.drugMaster.brandName}
                        </div>
                      ) : null}
                    </td>

                    {editRow === c.id ? (
                      <>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={editData.minimumStock ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, minimumStock: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={editData.maximumStock ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, maximumStock: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={editData.reorderLevel ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, reorderLevel: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={editData.reorderQuantity ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, reorderQuantity: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={editData.safetyStock ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, safetyStock: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Select
                              value={editData.abcClass ?? ""}
                              onValueChange={(v) => setEditData({ ...editData, abcClass: v || null })}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue placeholder="ABC" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={editData.vedClass ?? ""}
                              onValueChange={(v) => setEditData({ ...editData, vedClass: v || null })}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue placeholder="VED" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="V">V</SelectItem>
                                <SelectItem value="E">E</SelectItem>
                                <SelectItem value="D">D</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="success"
                              size="icon"
                              onClick={() => void handleSave(c)}
                              disabled={saving}
                              title="Save"
                              aria-label="Save"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={cancelEdit}
                              disabled={saving}
                              title="Cancel"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 tabular-nums text-zc-text">{c.minimumStock ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums text-zc-text">{c.maximumStock ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums text-zc-text">{c.reorderLevel ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums text-zc-text">{c.reorderQuantity ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums text-zc-text">{c.safetyStock ?? "—"}</td>
                        <td className="px-4 py-3">
                          {!c.abcClass && !c.vedClass ? (
                            <span className="text-zc-muted">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {c.abcClass ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                    abcPillClass(c.abcClass),
                                  )}
                                >
                                  {c.abcClass}
                                </span>
                              ) : null}
                              {c.vedClass ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                    vedPillClass(c.vedClass),
                                  )}
                                >
                                  {c.vedClass}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {canUpdate ? (
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => startEdit(c)}
                                title="Edit config"
                                aria-label="Edit config"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Guidance callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Inventory configuration guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Select a pharmacy store, then 2) Set min/max stock and reorder levels per drug, then 3) Assign ABC-VED classification for analytics and prioritization.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
