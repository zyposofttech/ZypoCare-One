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
import { toast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconPlus, IconSearch } from "@/components/icons";
import { ChevronRight, FolderTree, Loader2, RefreshCw } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type CategoryNode = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  children?: CategoryNode[];
  _count?: { drugs: number };
};

/* ------------------------------- Helpers -------------------------------- */

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

/* ------------------------------- TreeRow -------------------------------- */

function TreeRow({
  node,
  depth,
  expanded,
  toggleExpand,
  onEdit,
  onDelete,
  canUpdate,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (id: string) => void;
  canUpdate: boolean;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(node.id);

  return (
    <>
      <tr className="border-t border-zc-border hover:bg-zc-panel/20">
        <td
          className="px-4 py-2.5"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-zc-panel/40"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-zc-muted transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2 py-0.5 font-mono text-xs text-zc-text">
              {node.code}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 font-medium text-zc-text">{node.name}</td>
        <td className="px-4 py-2.5 text-sm text-zc-muted">
          {node._count?.drugs ?? 0}
        </td>
        <td className="px-4 py-2.5 text-right">
          {canUpdate && (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(node)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(node.id)}
              >
                Delete
              </Button>
            </div>
          )}
        </td>
      </tr>
      {isExpanded &&
        node.children?.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            canUpdate={canUpdate}
          />
        ))}
    </>
  );
}

/* -------------------------------- Page --------------------------------- */

export default function DrugCategoriesPage() {
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_DRUG_READ");
  const canUpdate = hasPerm(user, "INFRA_PHARMACY_DRUG_UPDATE");

  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({ module: "pharmacy-categories", enabled: !!branchId });

  /* ---- data state ---- */
  const [tree, setTree] = React.useState<CategoryNode[]>([]);
  const [flatList, setFlatList] = React.useState<CategoryNode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryNode | null>(null);
  const [form, setForm] = React.useState<{
    code: string;
    name: string;
    parentId: string;
    sortOrder: string;
  }>({ code: "", name: "", parentId: "", sortOrder: "0" });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  /* ---- delete confirm state ---- */
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  /* ---- load tree ---- */
  const loadTree = React.useCallback(
    async (showToast = false) => {
      if (!branchId) return;
      setLoading(true);
      try {
        const data = await apiFetch(
          `/infrastructure/pharmacy/drug-categories/tree?branchId=${branchId}`,
        );
        const nodes: CategoryNode[] = Array.isArray(data) ? data : [];
        setTree(nodes);

        if (showToast) {
          toast({
            title: "Categories refreshed",
            description: `Loaded category tree.`,
          });
        }
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: e?.message || "Failed to load category tree",
        });
      } finally {
        setLoading(false);
      }
    },
    [branchId],
  );

  /* ---- load flat list (for parent select) ---- */
  const loadFlatList = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await apiFetch(
        `/infrastructure/pharmacy/drug-categories?branchId=${branchId}`,
      );
      setFlatList(data.rows ?? []);
    } catch {
      /* silent — flat list is supplementary */
    }
  }, [branchId]);

  /* ---- initial load ---- */
  React.useEffect(() => {
    if (!branchId) return;
    void loadTree();
    void loadFlatList();
  }, [branchId, loadTree, loadFlatList]);

  /* ---- expand / collapse ---- */
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---- filter tree by search query ---- */
  function filterTree(
    nodes: CategoryNode[],
    query: string,
  ): CategoryNode[] {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();

    return nodes.reduce<CategoryNode[]>((acc, node) => {
      const selfMatch =
        node.code.toLowerCase().includes(lower) ||
        node.name.toLowerCase().includes(lower);
      const filteredChildren = node.children
        ? filterTree(node.children, query)
        : [];

      if (selfMatch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children:
            selfMatch && !filteredChildren.length
              ? node.children
              : filteredChildren.length > 0
                ? filteredChildren
                : node.children,
        });
      }
      return acc;
    }, []);
  }

  const displayTree = filterTree(tree, q);

  /* ---- computed stats ---- */
  function countAll(nodes: CategoryNode[]): number {
    return nodes.reduce(
      (sum, n) => sum + 1 + countAll(n.children ?? []),
      0,
    );
  }
  const totalCategories = countAll(tree);
  const topLevel = tree.length;
  const withChildren = tree.filter(
    (n) => (n.children?.length ?? 0) > 0,
  ).length;

  /* ---- open create dialog ---- */
  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", parentId: "", sortOrder: "0" });
    setErr(null);
    void loadFlatList();
    setDialogOpen(true);
  }

  /* ---- open edit dialog ---- */
  function openEdit(node: CategoryNode) {
    setEditing(node);
    setForm({
      code: node.code,
      name: node.name,
      parentId: node.parentId ?? "",
      sortOrder: String(node.sortOrder),
    });
    setErr(null);
    void loadFlatList();
    setDialogOpen(true);
  }

  /* ---- save (create or update) ---- */
  async function handleSave() {
    setErr(null);

    if (!form.code.trim() && !editing) return setErr("Code is required");
    if (!form.name.trim()) return setErr("Name is required");

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(
          `/infrastructure/pharmacy/drug-categories/${editing.id}`,
          {
            method: "PATCH",
            body: {
              name: form.name.trim(),
              parentId: form.parentId || null,
              sortOrder: Number(form.sortOrder) || 0,
            },
          },
        );
        toast({
          title: "Category Updated",
          description: `Successfully updated "${form.name}".`,
          variant: "success",
        });
      } else {
        await apiFetch(`/infrastructure/pharmacy/drug-categories`, {
          method: "POST",
          body: {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            parentId: form.parentId || null,
            sortOrder: Number(form.sortOrder) || 0,
          },
        });
        toast({
          title: "Category Created",
          description: `Successfully created "${form.name}".`,
          variant: "success",
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm({ code: "", name: "", parentId: "", sortOrder: "0" });
      void loadTree();
      void loadFlatList();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(
        `/infrastructure/pharmacy/drug-categories/${deleteId}`,
        { method: "DELETE" },
      );
      toast({
        title: "Category Deleted",
        description: "Category removed successfully.",
        variant: "success",
      });
      setDeleteId(null);
      void loadTree();
      void loadFlatList();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e?.message || "Delete failed",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Drug Categories">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FolderTree className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Drug Categories
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Organize drugs into a hierarchical classification (ATC-based).
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void loadTree(true)}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>

            {canUpdate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={openCreate}
              >
                <IconPlus className="h-4 w-4" />
                Add Category
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner
          insights={insights}
          loading={insightsLoading}
          onDismiss={dismissInsight}
        />

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Browse and manage the drug category hierarchy. Add categories to
              classify drugs for reporting and formulary management.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Categories
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {totalCategories}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Top-Level
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {topLevel}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  With Children
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {withChildren}
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
                  placeholder="Search by code or name..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing{" "}
                <span className="font-semibold tabular-nums text-zc-text">
                  {totalCategories}
                </span>{" "}
                categories
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tree View */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Category Tree</CardTitle>
            <CardDescription className="text-sm">
              Expandable hierarchy of drug categories
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Drugs</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!displayTree.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {loading
                        ? "Loading categories..."
                        : "No categories found. Create your first drug category."}
                    </td>
                  </tr>
                ) : null}

                {displayTree.map((node) => (
                  <TreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                    canUpdate={canUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Guidance */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                Category hierarchy guide
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Organize drugs using ATC (Anatomical Therapeutic Chemical)
                classification or your own custom hierarchy. Categories can be
                nested to create multi-level trees.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setErr(null);
            setEditing(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent
          className={drawerClassName()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <FolderTree className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {editing ? "Edit Drug Category" : "Create Drug Category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the category details. Code cannot be changed after creation."
                : "Define a new drug category. Use ATC codes or your own classification scheme."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">
                Category Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value })
                    }
                    placeholder="e.g., ATC-A"
                    className="font-mono"
                    disabled={!!editing}
                  />
                  {!editing && (
                    <p className="text-[11px] text-zc-muted">
                      Unique category code. Will be uppercased on save.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Alimentary Tract and Metabolism"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Parent Category</Label>
                  <Select
                    value={form.parentId}
                    onValueChange={(v) =>
                      setForm({ ...form, parentId: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        None (top-level)
                      </SelectItem>
                      {flatList
                        .filter((c) => c.id !== editing?.id)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: e.target.value })
                    }
                    placeholder="0"
                    inputMode="numeric"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-zc-muted">
                    Lower numbers appear first within the same parent.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={saving || !canUpdate}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone. Categories with assigned drugs cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
