"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";

import type { DiagnosticItemRow, PanelItemRow, SectionRow } from "../_shared/types";
import { safeArray, normalizeCode, validateCode, validateName } from "../_shared/utils";
import { Field, ModalHeader, modalClassName } from "../_shared/components";

/* =========================================================
   Panels page – compose panel items from the catalog
   ========================================================= */

export default function PanelsPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [panels, setPanels] = React.useState<DiagnosticItemRow[]>([]);
  const [allItems, setAllItems] = React.useState<DiagnosticItemRow[]>([]);
  const [panelId, setPanelId] = React.useState("");
  const [panelItems, setPanelItems] = React.useState<PanelItemRow[]>([]);
  const [addItemId, setAddItemId] = React.useState("none");
  const [saving, setSaving] = React.useState(false);
  const [createPanelOpen, setCreatePanelOpen] = React.useState(false);

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
    setPanelItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function savePanel() {
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

  return (
    <AppShell title="Diagnostics - Panels">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Panels</CardTitle>
            <CardDescription>Compose panel items from the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex justify-end">
              <Button onClick={() => setCreatePanelOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Panel
              </Button>
            </div>
            {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
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
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-2">
              {panelItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No panel items added.</div>
              ) : (
                panelItems.map((p, idx) => (
                  <div key={`${p.itemId}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">{p.item?.name || p.itemId}</div>
                      <div className="text-xs text-zc-muted">{p.item?.code || "ITEM"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => move(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => move(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(idx)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={savePanel} disabled={!panelId || saving}>
                Save panel
              </Button>
            </div>
          </CardContent>
        </Card>
        <CreatePanelDialog
          open={createPanelOpen}
          onOpenChange={setCreatePanelOpen}
          branchId={branchId}
          onCreated={async (newId) => {
            await loadLists();
            setPanelId(newId);
          }}
        />
      </RequirePerm>
    </AppShell>
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
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
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
