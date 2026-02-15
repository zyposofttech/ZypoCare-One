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
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconFlask } from "@/components/icons";

import {
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
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
  NoBranchGuard,
  ToneBadge,
  ModalHeader,
  drawerClassName,
  toneForDiagnosticKind,
  PageHeader,
  ErrorAlert,
  StatusPill,
  CodeBadge,
  StatBox,
  SearchBar,
  OnboardingCallout,
} from "../_shared/components";

/* =========================================================
   Page
   ========================================================= */

export default function CatalogPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - Test Library">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <CatalogTab branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   CatalogTab
   ========================================================= */

function CatalogTab({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPerm(user, "INFRA_DIAGNOSTICS_CREATE");
  const canUpdate = hasPerm(user, "INFRA_DIAGNOSTICS_UPDATE");
  const canDelete = hasPerm(user, "INFRA_DIAGNOSTICS_DELETE");

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

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-catalog" });

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

  const totalSections = sections.length;
  const totalCategories = categories.length;
  const totalSpecimens = specimens.length;
  const activeSections = sections.filter((s) => s.isActive).length;
  const activeItems = items.filter((i) => i.isActive).length;
  const panelCount = items.filter((i) => i.isPanel).length;

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => {
      const hay = `${it.code} ${it.name} ${it.loincCode ?? ""} ${it.snomedCode ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconFlask className="h-5 w-5 text-zc-accent" />}
        title="Test Library"
        description="Manage sections, categories, specimens and diagnostic items for the catalog."
        loading={loading}
        onRefresh={() => void loadAll()}
        canCreate={canCreate}
        createLabel="Create Item"
        onCreate={() => { setEditingItem(null); setItemDialogOpen(true); }}
        extra={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="px-4 gap-2" onClick={() => { setEditingSection(null); setSectionDialogOpen(true); }}>
                Section
              </Button>
              <Button variant="outline" className="px-4 gap-2" onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}>
                Category
              </Button>
              <Button variant="outline" className="px-4 gap-2" onClick={() => { setEditingSpecimen(null); setSpecimenDialogOpen(true); }}>
                Specimen
              </Button>
            </div>
          ) : null
        }
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">
            Search and filter the diagnostic catalog. Create, edit and deactivate items, sections, categories and specimens.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox label="Sections" value={totalSections} color="blue" detail={<>Active: <span className="font-semibold tabular-nums">{activeSections}</span></>} />
            <StatBox label="Categories" value={totalCategories} color="sky" />
            <StatBox label="Specimens" value={totalSpecimens} color="violet" />
            <StatBox label="Items Shown" value={filtered.length} color="emerald" detail={<>Panels: <span className="font-semibold tabular-nums">{panelCount}</span> | Active: <span className="font-semibold tabular-nums">{activeItems}</span></>} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>

          {showFilters ? (
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
                  <span className="text-sm text-zc-muted">Include Inactive</span>
                </div>
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

          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search by code, name, LOINC, SNOMED..."
            filteredCount={filtered.length}
            totalCount={items.length}
          />

          <ErrorAlert message={err} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnostic Items</CardTitle>
          <CardDescription className="text-sm">Lab tests, imaging studies, and procedures in the catalog.</CardDescription>
        </CardHeader>
        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Kind</th>
                <th className="px-4 py-3 text-left font-semibold">Section</th>
                <th className="px-4 py-3 text-left font-semibold">TAT</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                    {loading ? "Loading items..." : "No items found."}
                  </td>
                </tr>
              ) : null}

              {filtered.map((it) => (
                <tr key={it.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                  <td className="px-4 py-3">
                    <CodeBadge>{it.code}</CodeBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zc-text">{it.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {it.isPanel ? <ToneBadge tone="amber">PANEL</ToneBadge> : null}
                      {it.specimen?.code ? <ToneBadge tone="sky">Specimen: {it.specimen.code}</ToneBadge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ToneBadge tone={toneForDiagnosticKind(it.kind)}>{it.kind}</ToneBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-zc-text">{it.section?.name ?? "\u2014"}</div>
                    {it.category?.name ? (
                      <div className="text-xs text-zc-muted">{it.category.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-zc-muted">
                      <span className="font-mono">{it.tatMinsRoutine ?? "\u2014"}</span>
                      <span className="mx-1">/</span>
                      <span className="font-mono">{it.tatMinsStat ?? "\u2014"}</span>
                      <span className="ml-1">mins</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={it.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate ? (
                        <Button
                          variant="info"
                          size="icon"
                          onClick={() => { setEditingItem(it); setItemDialogOpen(true); }}
                          title="Edit item"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}

                      {canDelete ? (
                        it.isActive ? (
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(it.id)}`, { method: "DELETE" });
                                toast({ title: "Deactivated", description: "Item marked inactive." });
                                await loadAll();
                              } catch (e: any) {
                                toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                              }
                            }}
                            title="Deactivate item"
                            aria-label="Deactivate item"
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="icon"
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
                            title="Reactivate item"
                            aria-label="Reactivate item"
                          >
                            <ToggleRight className="h-4 w-4" />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Recommended catalog setup"
        description="1) Create Sections (Lab, Imaging, etc.), 2) Add Categories within sections, 3) Define Specimens for lab tests, 4) Create diagnostic Items linked to sections/categories/specimens."
      />

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
    </div>
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
          {err ? <ErrorAlert message={err} /> : null}
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
          {err ? <ErrorAlert message={err} /> : null}
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
          {err ? <ErrorAlert message={err} /> : null}
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
          {err ? <ErrorAlert message={err} /> : null}
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
