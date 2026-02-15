"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconFlask } from "@/components/icons";

import { ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";

import type { DiagnosticItemRow, PanelItemRow, SectionRow } from "../_shared/types";
import { safeArray, normalizeCode, validateCode, validateName } from "../_shared/utils";
import {
  Field,
  ModalHeader,
  NoBranchGuard,
  modalClassName,
  PageHeader,
  ErrorAlert,
  StatBox,
  SearchBar,
  OnboardingCallout,
  CodeBadge,
} from "../_shared/components";

/* =========================================================
   Panels page -- compose panel items from the catalog
   ========================================================= */

export default function PanelsPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Panels">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <PanelsContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

function PanelsContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPerm(user, "INFRA_DIAGNOSTICS_CREATE");
  const canUpdate = hasPerm(user, "INFRA_DIAGNOSTICS_UPDATE");
  const canDelete = hasPerm(user, "INFRA_DIAGNOSTICS_DELETE");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [panels, setPanels] = React.useState<DiagnosticItemRow[]>([]);
  const [allItems, setAllItems] = React.useState<DiagnosticItemRow[]>([]);
  const [panelId, setPanelId] = React.useState("");
  const [panelItems, setPanelItems] = React.useState<PanelItemRow[]>([]);
  const [addItemId, setAddItemId] = React.useState("none");
  const [saving, setSaving] = React.useState(false);
  const [createPanelOpen, setCreatePanelOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-panels" });

  async function loadLists() {
    setLoading(true);
    setErr(null);
    try {
      const itemRows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`);
      const nextItems = safeArray(itemRows);
      const nextPanels = nextItems.filter((p) => p.isPanel);
      setPanels(nextPanels);
      setAllItems(nextItems);
      if (!panelId && nextPanels?.[0]?.id) setPanelId(nextPanels[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load panels");
    } finally {
      setLoading(false);
    }
  }

  async function loadPanelItems(id: string) {
    if (!id) {
      setPanelItems([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<PanelItemRow[]>(`/api/infrastructure/diagnostics/items/${encodeURIComponent(id)}/panel-items?branchId=${encodeURIComponent(branchId)}`);
      setPanelItems(safeArray(rows));
    } catch (e: any) {
      setErr(e?.message || "Failed to load panel items");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadPanelItems(panelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  function addItem() {
    if (!canUpdate) return;
    if (!panelId || addItemId === "none") return;
    if (panelItems.some((p) => p.itemId === addItemId)) {
      toast({ title: "Item already added", description: "This item is already in the panel." });
      return;
    }
    const item = allItems.find((i) => i.id === addItemId);
    setPanelItems((prev) => [...prev, { panelId, itemId: addItemId, sortOrder: prev.length, isActive: true, item }]);
    setAddItemId("none");
  }

  function move(index: number, dir: -1 | 1) {
    if (!canUpdate) return;
    setPanelItems((prev) => {
      const next = [...prev];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      return next;
    });
  }

  function remove(index: number) {
    if (!canDelete) return;
    setPanelItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function savePanel() {
    if (!canUpdate) return;
    if (!panelId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(panelId)}/panel-items?branchId=${encodeURIComponent(branchId)}`, {
        method: "PUT",
        body: JSON.stringify({
          items: panelItems.map((p, idx) => ({ itemId: p.itemId, sortOrder: idx })),
        }),
      });
      toast({ title: "Panel saved" });
      await loadPanelItems(panelId);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Error", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  const selectedPanel = panels.find((p) => p.id === panelId);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return panelItems;
    return panelItems.filter((p) => {
      const hay = `${p.item?.name ?? ""} ${p.item?.code ?? ""} ${p.itemId}`.toLowerCase();
      return hay.includes(s);
    });
  }, [panelItems, q]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconFlask className="h-5 w-5 text-zc-accent" />}
        title="Panels"
        description="Compose panel items from the diagnostic catalog."
        loading={loading}
        onRefresh={() => { void loadLists(); void loadPanelItems(panelId); }}
        canCreate={canCreate}
        createLabel="Create Panel"
        onCreate={() => setCreatePanelOpen(true)}
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">
            Select a panel to view and manage its constituent items.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <StatBox label="Total Panels" value={panels.length} color="blue" />
            <StatBox label="Panel Items" value={panelItems.length} color="emerald" detail={selectedPanel ? <>Panel: <span className="font-semibold">{selectedPanel.name}</span></> : undefined} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Panel">
              <Select value={panelId} onValueChange={setPanelId} disabled={loading}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select panel" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {panels.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {canUpdate ? (
              <Field label="Add item">
                <div className="flex gap-2">
                  <Select value={addItemId} onValueChange={setAddItemId}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent className="max-h-[280px] overflow-y-auto">
                      <SelectItem value="none">Select item</SelectItem>
                      {allItems.filter((i) => i.id !== panelId).map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={addItem} disabled={!panelId || addItemId === "none"}>
                    Add
                  </Button>
                </div>
              </Field>
            ) : null}
          </div>

          <ErrorAlert message={err} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Panel Items</CardTitle>
          <CardDescription className="text-sm">Items included in the selected panel, ordered by sort priority.</CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search by item name or code..."
            filteredCount={filtered.length}
            totalCount={panelItems.length}
          />
        </CardContent>

        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Sort Order</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zc-muted">
                    {loading ? "Loading panel items..." : "No panel items added."}
                  </td>
                </tr>
              ) : null}

              {filtered.map((p, idx) => (
                <tr key={`${p.itemId}-${idx}`} className="border-t border-zc-border hover:bg-zc-panel/20">
                  <td className="px-4 py-3">
                    <CodeBadge>{p.item?.code || "ITEM"}</CodeBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zc-text">{p.item?.name || p.itemId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zc-muted">{idx}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => move(idx, -1)}
                            disabled={idx === 0}
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => move(idx, 1)}
                            disabled={idx === filtered.length - 1}
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(idx)}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canUpdate && panelItems.length > 0 ? (
          <div className="flex justify-end border-t border-zc-border px-4 py-3">
            <Button onClick={savePanel} disabled={!panelId || saving}>
              Save panel
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Recommended panel setup"
        description="1) Create panels from the catalog (items marked as panel), 2) Add individual test items to each panel, 3) Arrange items in the desired sort order, 4) Save to persist the panel composition."
      />

      {/* Create Panel Dialog */}
      <CreatePanelDialog
        open={createPanelOpen}
        onOpenChange={setCreatePanelOpen}
        branchId={branchId}
        onCreated={async (newId) => {
          await loadLists();
          setPanelId(newId);
        }}
      />
    </div>
  );
}

/* ---- Create Panel Dialog ---- */

function CreatePanelDialog({
  open,
  onOpenChange,
  branchId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  onCreated: (newId: string) => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");
  const [sections, setSections] = React.useState<SectionRow[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode("");
    setName("");
    setSectionId("");
    setErr(null);
    apiFetch<SectionRow[]>(`/api/infrastructure/diagnostics/sections?branchId=${encodeURIComponent(branchId)}`)
      .then((rows) => setSections(safeArray(rows)))
      .catch(() => {});
  }, [open, branchId]);

  async function save() {
    const codeErr = validateCode(code, "Panel");
    const nameErr = validateName(name, "Panel");
    if (codeErr || nameErr) { setErr(codeErr || nameErr); return; }
    if (!sectionId) { setErr("Section is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const created = await apiFetch<DiagnosticItemRow>("/api/infrastructure/diagnostics/items", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          code: normalizeCode(code),
          name: name.trim(),
          kind: "LAB",
          sectionId,
          isPanel: true,
          panelType: "FIXED",
        }),
      });
      toast({ title: "Panel created" });
      onOpenChange(false);
      if (created?.id) await onCreated(created.id);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[500px]")}>
        <ModalHeader title="Create Panel" description="Create a new panel to compose tests." onClose={() => onOpenChange(false)} />
        <div className="grid gap-4">
          <ErrorAlert message={err} />
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LFT_PANEL" />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Liver Function Test Panel" />
          </Field>
          <Field label="Section" required>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
