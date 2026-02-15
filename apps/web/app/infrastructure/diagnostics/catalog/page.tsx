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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import type {
  SectionRow,
  CategoryRow,
  SpecimenRow,
  DiagnosticItemRow,
  DiagnosticKind,
  DiagnosticSectionType,
  DiagnosticCareContext,
  DiagnosticPanelType,
} from "../_shared/types";

import { DIAG_KINDS } from "../_shared/constants";

import {
  safeArray,
  normalizeCode,
  validateCode,
  validateName,
  toInt,
  toFloat,
} from "../_shared/utils";

import {
  Field,
  ToneBadge,
  ModalHeader,
  drawerClassName,
  toneForDiagnosticKind,
} from "../_shared/components";

/* =========================================================
   Page
   ========================================================= */

export default function CatalogPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Test Library">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <CatalogTab branchId={branchId} />
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   CatalogTab
   ========================================================= */

function CatalogTab({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [sections, setSections] = React.useState<SectionRow[]>([]);
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [specimens, setSpecimens] = React.useState<SpecimenRow[]>([]);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);

  const [kind, setKind] = React.useState<DiagnosticKind>("LAB");
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [panelFilter, setPanelFilter] = React.useState<"all" | "panel" | "test">("all");
  const [showFilters, setShowFilters] = React.useState(false);

  const [sectionId, setSectionId] = React.useState("all");
  const [categoryId, setCategoryId] = React.useState("all");

  const [sectionDialogOpen, setSectionDialogOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [specimenDialogOpen, setSpecimenDialogOpen] = React.useState(false);
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

  const [editingSection, setEditingSection] = React.useState<SectionRow | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRow | null>(null);
  const [editingSpecimen, setEditingSpecimen] = React.useState<SpecimenRow | null>(null);
  const [editingItem, setEditingItem] = React.useState<DiagnosticItemRow | null>(null);

  function qs(params: Record<string, any>) {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v === false) return;
      if (v === true) {
        u.set(k, "true");
        return;
      }
      const s = String(v);
      if (!s || s === "all") return;
      u.set(k, s);
    });
    return u.toString();
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const sec = await apiFetch<SectionRow[]>(`/api/infrastructure/diagnostics/sections?${qs({ branchId })}`);
      const cat = await apiFetch<CategoryRow[]>(`/api/infrastructure/diagnostics/categories?${qs({ branchId })}`);
      const sp = await apiFetch<SpecimenRow[]>(`/api/infrastructure/diagnostics/specimens?${qs({ branchId })}`);
      setSections(safeArray(sec));
      setCategories(safeArray(cat));
      setSpecimens(safeArray(sp));

      const itemQs: any = { branchId, kind, q: q.trim() || undefined };
      if (sectionId !== "all") itemQs.sectionId = sectionId;
      if (categoryId !== "all") itemQs.categoryId = categoryId;

      const its = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?${qs(itemQs)}`);
      let nextItems = safeArray(its);
      if (!includeInactive) nextItems = nextItems.filter((it) => it.isActive);
      if (panelFilter === "panel") nextItems = nextItems.filter((it) => it.isPanel);
      if (panelFilter === "test") nextItems = nextItems.filter((it) => !it.isPanel);
      setItems(nextItems);
    } catch (e: any) {
      setErr(e?.message || "Failed to load catalog");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, kind, includeInactive, panelFilter, sectionId, categoryId]);

  React.useEffect(() => {
    const t = setTimeout(() => void loadAll(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const visibleCategories = categories.filter((c) => c.sectionId === sectionId && c.isActive);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Catalog</CardTitle>
        <CardDescription>Sections, categories, specimens and diagnostic items. Payloads match Create/Update DTOs.</CardDescription>
      </CardHeader>

      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full gap-2 lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zc-muted" />
              <Input className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code/name" />
            </div>
            <Button variant="outline" className="h-10" onClick={loadAll} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Kind">
                <Select value={kind} onValueChange={(v) => setKind(v as DiagnosticKind)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAG_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Section filter">
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="all">All</SelectItem>
                    {sections.filter((s) => s.isActive).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Category filter">
                <Select value={categoryId} onValueChange={setCategoryId} disabled={sectionId === "all"}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="all">All</SelectItem>
                    {visibleCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
              <span className="text-sm text-zc-muted">Include Inactive</span>

              <Select value={panelFilter} onValueChange={(v) => setPanelFilter(v as any)}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  <SelectItem value="panel">Panels only</SelectItem>
                  <SelectItem value="test">Tests only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zc-muted">
            Showing <span className="font-semibold tabular-nums text-zc-text">{items.length}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setEditingSection(null); setSectionDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Section
            </Button>
            <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Category
            </Button>
            <Button variant="outline" onClick={() => { setEditingSpecimen(null); setSpecimenDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Specimen
            </Button>
            <Button onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Item
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="violet" className="font-mono">{it.code}</ToneBadge>
                    <div className="text-sm font-semibold text-zc-text">{it.name}</div>
                    <ToneBadge tone={toneForDiagnosticKind(it.kind)}>{it.kind}</ToneBadge>
                    {it.isPanel ? <ToneBadge tone="amber">PANEL</ToneBadge> : null}
                    {!it.isActive ? <ToneBadge tone="rose">INACTIVE</ToneBadge> : null}
                    {it.specimen?.code ? <ToneBadge tone="sky">Specimen: {it.specimen.code}</ToneBadge> : null}
                  </div>

                  <div className="mt-1 text-xs text-zc-muted">
                    Section: <span className="font-mono">{it.section?.code}</span> ·
                    Category: <span className="font-mono">{it.category?.code ?? "\u2014"}</span> ·
                    Routine TAT: <span className="font-mono">{it.tatMinsRoutine ?? "\u2014"}</span> mins ·
                    Stat TAT: <span className="font-mono">{it.tatMinsStat ?? "\u2014"}</span> mins
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingItem(it); setItemDialogOpen(true); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>

                  {it.isActive ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(it.id)}`, { method: "DELETE" });
                          toast({ title: "Deactivated", description: "Item marked inactive." });
                          await loadAll();
                        } catch (e: any) {
                          toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(it.id)}`, {
                            method: "PUT",
                            body: JSON.stringify({ branchId, isActive: true }),
                          });
                          toast({ title: "Activated", description: "Item is active again." });
                          await loadAll();
                        } catch (e: any) {
                          toast({ title: "Activate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dialogs */}
        <SectionDialog
          open={sectionDialogOpen}
          onOpenChange={setSectionDialogOpen}
          branchId={branchId}
          editing={editingSection}
          onSaved={loadAll}
        />

        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          branchId={branchId}
          editing={editingCategory}
          sections={sections}
          onSaved={loadAll}
        />

        <SpecimenDialog
          open={specimenDialogOpen}
          onOpenChange={setSpecimenDialogOpen}
          branchId={branchId}
          editing={editingSpecimen}
          onSaved={loadAll}
        />

        <ItemDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          branchId={branchId}
          editing={editingItem}
          sections={sections}
          categories={categories}
          specimens={specimens}
          onSaved={loadAll}
        />
      </CardContent>
    </Card>
  );
}

/* =========================================================
   Dialogs: Sections, Categories, Specimens, Items
   ========================================================= */

function SectionDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: SectionRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [sectionType, setSectionType] = React.useState<DiagnosticSectionType>("LAB");
  const [sortOrder, setSortOrder] = React.useState("");
  const [headStaffId, setHeadStaffId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setSectionType(editing?.type ?? "LAB");
    setSortOrder(editing?.sortOrder != null ? String(editing.sortOrder) : "");
    setHeadStaffId((editing as any)?.headStaffId ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Section");
    const nameErr = validateName(name, "Section");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/sections/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type: sectionType,
            sortOrder: toInt(sortOrder) ?? undefined,
            headStaffId: headStaffId.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/sections", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type: sectionType,
            sortOrder: toInt(sortOrder) ?? undefined,
            headStaffId: headStaffId.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Section updated" : "Section created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Section" : "Create Section"}
          description="Sections group diagnostic items in the catalog."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAB, RADIOLOGY" />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laboratory" />
          </Field>
          <Field label="Section Type" required>
            <Select value={sectionType} onValueChange={(v) => setSectionType(v as DiagnosticSectionType)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {(["LAB", "IMAGING", "CARDIOLOGY", "NEUROLOGY", "PULMONOLOGY", "OTHER"] as const).map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sort order">
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Section Head (Staff ID)" hint="Staff user ID for section head">
            <Input value={headStaffId} onChange={(e) => setHeadStaffId(e.target.value)} placeholder="Staff user ID" />
          </Field>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  sections,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: CategoryRow | null;
  sections: SectionRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [sectionId, setSectionId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSectionId(editing?.sectionId ?? "");
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setSortOrder(editing?.sortOrder != null ? String(editing.sortOrder) : "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Category");
    const nameErr = validateName(name, "Category");
    if (!sectionId) return setErr("Section is required");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/categories/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            sectionId,
            code: normalizeCode(code),
            name: name.trim(),
            sortOrder: toInt(sortOrder) ?? undefined,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/categories", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            sectionId,
            code: normalizeCode(code),
            name: name.trim(),
            sortOrder: toInt(sortOrder) ?? undefined,
          }),
        });
      }
      toast({ title: editing ? "Category updated" : "Category created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Category" : "Create Category"}
          description="Categories are scoped to a section."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <Field label="Section" required>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                {sections.filter((s) => s.isActive).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BIOCHEM" />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Biochemistry" />
          </Field>
          <Field label="Sort order">
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
          </Field>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecimenDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: SpecimenRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [container, setContainer] = React.useState("");
  const [minVolumeMl, setMinVolumeMl] = React.useState("");
  const [handlingNotes, setHandlingNotes] = React.useState("");
  const [fastingRequired, setFastingRequired] = React.useState(false);
  const [fastingHours, setFastingHours] = React.useState("");
  const [collectionInstructions, setCollectionInstructions] = React.useState("");
  const [storageTemperature, setStorageTemperature] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setContainer(editing?.container ?? "");
    setMinVolumeMl(editing?.minVolumeMl != null ? String(editing.minVolumeMl) : "");
    setHandlingNotes(editing?.handlingNotes ?? "");
    setFastingRequired(editing?.fastingRequired ?? false);
    setFastingHours(editing?.fastingHours != null ? String(editing.fastingHours) : "");
    setCollectionInstructions(editing?.collectionInstructions ?? "");
    setStorageTemperature(editing?.storageTemperature ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Specimen");
    const nameErr = validateName(name, "Specimen");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/specimens/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            container: container.trim() || null,
            minVolumeMl: toFloat(minVolumeMl),
            handlingNotes: handlingNotes.trim() || null,
            fastingRequired,
            fastingHours: toInt(fastingHours),
            collectionInstructions: collectionInstructions.trim() || null,
            storageTemperature: storageTemperature.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/specimens", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            container: container.trim() || undefined,
            minVolumeMl: toFloat(minVolumeMl) ?? undefined,
            handlingNotes: handlingNotes.trim() || undefined,
            fastingRequired,
            fastingHours: toInt(fastingHours) ?? undefined,
            collectionInstructions: collectionInstructions.trim() || undefined,
            storageTemperature: storageTemperature.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Specimen updated" : "Specimen created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Specimen" : "Create Specimen"}
          description="Specimens are referenced by lab items."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SERUM" />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Serum" />
          </Field>
          <Field label="Container">
            <Input value={container} onChange={(e) => setContainer(e.target.value)} placeholder="Vacutainer" />
          </Field>
          <Field label="Minimum volume (ml)">
            <Input value={minVolumeMl} onChange={(e) => setMinVolumeMl(e.target.value)} placeholder="2" />
          </Field>
          <Field label="Handling notes">
            <Textarea value={handlingNotes} onChange={(e) => setHandlingNotes(e.target.value)} placeholder="Keep chilled, process within 2 hours" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Storage Temperature">
              <Input value={storageTemperature} onChange={(e) => setStorageTemperature(e.target.value)} placeholder="2-8\u00b0C" />
            </Field>
            <Field label="Fasting Hours" hint={fastingRequired ? "Required" : "Only if fasting is required"}>
              <Input value={fastingHours} onChange={(e) => setFastingHours(e.target.value)} placeholder="8" disabled={!fastingRequired} />
            </Field>
          </div>
          <Field label="Collection Instructions">
            <Textarea value={collectionInstructions} onChange={(e) => setCollectionInstructions(e.target.value)} placeholder="Detailed collection procedure..." />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-sm font-semibold text-zc-text">Fasting Required</div>
            <Switch checked={fastingRequired} onCheckedChange={setFastingRequired} />
          </div>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  sections,
  categories,
  specimens,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: DiagnosticItemRow | null;
  sections: SectionRow[];
  categories: CategoryRow[];
  specimens: SpecimenRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<DiagnosticKind>("LAB");
  const [sectionId, setSectionId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("none");
  const [specimenId, setSpecimenId] = React.useState("none");
  const [tatRoutine, setTatRoutine] = React.useState("");
  const [tatStat, setTatStat] = React.useState("");
  const [preparationText, setPreparationText] = React.useState("");
  const [consentRequired, setConsentRequired] = React.useState(false);
  const [requiresAppointment, setRequiresAppointment] = React.useState(false);
  const [isPanel, setIsPanel] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [loincCode, setLoincCode] = React.useState("");
  const [snomedCode, setSnomedCode] = React.useState("");
  const [searchAliasesText, setSearchAliasesText] = React.useState("");
  const [careContext, setCareContext] = React.useState<DiagnosticCareContext>("ALL");
  const [requiresPcpndt, setRequiresPcpndt] = React.useState(false);
  const [panelType, setPanelType] = React.useState<DiagnosticPanelType | "none">("none");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "LAB");
    setSectionId(editing?.sectionId ?? "");
    setCategoryId(editing?.categoryId ?? "none");
    setSpecimenId(editing?.specimenId ?? "none");
    setTatRoutine(editing?.tatMinsRoutine != null ? String(editing.tatMinsRoutine) : "");
    setTatStat(editing?.tatMinsStat != null ? String(editing.tatMinsStat) : "");
    setPreparationText(editing?.preparationText ?? "");
    setConsentRequired(editing?.consentRequired ?? false);
    setRequiresAppointment(editing?.requiresAppointment ?? false);
    setIsPanel(editing?.isPanel ?? false);
    setIsActive(editing?.isActive ?? true);
    setLoincCode(editing?.loincCode ?? "");
    setSnomedCode(editing?.snomedCode ?? "");
    setSearchAliasesText(Array.isArray(editing?.searchAliases) ? (editing.searchAliases as string[]).join(", ") : "");
    setCareContext(editing?.careContext ?? "ALL");
    setRequiresPcpndt(editing?.requiresPcpndt ?? false);
    setPanelType(editing?.panelType ?? "none");
    setErr(null);
  }, [open, editing]);

  const visibleCategories = categories.filter((c) => c.sectionId === sectionId && c.isActive);

  async function save() {
    const codeErr = validateCode(code, "Item");
    const nameErr = validateName(name, "Item");
    if (!sectionId) return setErr("Section is required");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }

    const aliases = searchAliasesText.trim()
      ? searchAliasesText.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const payload: any = {
      branchId,
      code: normalizeCode(code),
      name: name.trim(),
      kind,
      sectionId,
      categoryId: categoryId === "none" ? null : categoryId,
      specimenId: specimenId === "none" ? null : specimenId,
      tatMinsRoutine: toInt(tatRoutine) ?? undefined,
      tatMinsStat: toInt(tatStat) ?? undefined,
      preparationText: preparationText.trim() || null,
      consentRequired,
      requiresAppointment,
      isPanel,
      isActive,
      loincCode: loincCode.trim() || null,
      snomedCode: snomedCode.trim() || null,
      searchAliases: aliases,
      careContext,
      requiresPcpndt,
      panelType: panelType === "none" ? null : panelType,
    };

    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast({ title: editing ? "Item updated" : "Item created" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Item" : "Create Item"}
          description="Catalog items can be lab tests, imaging, or procedures."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CBC" />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Complete Blood Count" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Kind" required>
              <Select value={kind} onValueChange={(v) => setKind(v as DiagnosticKind)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAG_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Section" required>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {sections.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category">
              <Select value={categoryId} onValueChange={setCategoryId} disabled={!sectionId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">No category</SelectItem>
                  {visibleCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Specimen" hint={kind !== "LAB" ? "Lab only" : undefined}>
              <Select value={specimenId} onValueChange={setSpecimenId} disabled={kind !== "LAB"}>
                <SelectTrigger className="h-10"><SelectValue placeholder="No specimen" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">No specimen</SelectItem>
                  {specimens.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="LOINC Code" hint="e.g. 718-7">
              <Input value={loincCode} onChange={(e) => setLoincCode(e.target.value)} placeholder="718-7" />
            </Field>
            <Field label="SNOMED Code" hint="e.g. 26604007">
              <Input value={snomedCode} onChange={(e) => setSnomedCode(e.target.value)} placeholder="26604007" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Care Context">
              <Select value={careContext} onValueChange={(v) => setCareContext(v as DiagnosticCareContext)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["ALL", "OPD", "IPD", "ER", "DAYCARE", "HOMECARE"] as const).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {isPanel ? (
              <Field label="Panel Type">
                <Select value={panelType} onValueChange={(v) => setPanelType(v as DiagnosticPanelType | "none")}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="PROFILE">Profile</SelectItem>
                    <SelectItem value="PACKAGE">Package</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
          <Field label="Search Aliases" hint="Comma-separated">
            <Input value={searchAliasesText} onChange={(e) => setSearchAliasesText(e.target.value)} placeholder="CBC, blood count, hemogram" />
          </Field>
          {kind === "LAB" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Routine TAT (mins)">
                <Input value={tatRoutine} onChange={(e) => setTatRoutine(e.target.value)} placeholder="60" />
              </Field>
              <Field label="Stat TAT (mins)">
                <Input value={tatStat} onChange={(e) => setTatStat(e.target.value)} placeholder="30" />
              </Field>
            </div>
          ) : (
            <Field label="Preparation text">
              <Textarea value={preparationText} onChange={(e) => setPreparationText(e.target.value)} placeholder="Any preparation notes" />
            </Field>
          )}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Panel item</div>
              <Switch checked={isPanel} onCheckedChange={setIsPanel} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Requires appointment</div>
              <Switch checked={requiresAppointment} onCheckedChange={setRequiresAppointment} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Consent required</div>
              <Switch checked={consentRequired} onCheckedChange={setConsentRequired} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Requires PCPNDT</div>
              <Switch checked={requiresPcpndt} onCheckedChange={setRequiresPcpndt} />
            </div>
          </div>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="text-sm font-semibold text-zc-text">Active</div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
