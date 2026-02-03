"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Pencil, Wand2 } from "lucide-react";

type Permission = {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
};

const PERMISSION_CATEGORIES = [
  "IAM (Identity & Access)",
  "Clinical",
  "Nursing",
  "Billing",
  "Pharmacy",
  "Inventory",
  "Diagnostics",
  "Front Office",
  "Operations",
  "Statutory",
  "AI Copilot",
  "System",
];

// ✅ Keep dot-form codes as-is; uppercase only underscore-form codes
function normalizeCode(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.includes(".") ? raw : raw.toUpperCase();
}

function generateCodeFromCategoryAndName(category: string, name: string) {
  const cat = String(category || "")
    .trim()
    .toUpperCase()
    .replace(/\(.*?\)/g, "") // drop bracket hints like "IAM (..)"
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const nm = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const code = cat ? `${cat}_${nm}` : nm;
  return code.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
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

function categoryPill(category: string) {
  const c = String(category || "").toLowerCase();
  if (c.includes("iam")) {
    return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
  }
  if (c.includes("billing")) {
    return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  }
  if (c.includes("clinical")) {
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  }
  if (c.includes("system")) {
    return "border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-800/40 dark:bg-slate-900/20 dark:text-slate-200";
  }
  return "border-zc-border bg-zc-panel/15 text-zc-text";
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <div className="min-w-0">{message}</div>
    </div>
  );
}

export default function AccessPermissionsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  // ✅ Permission-first gating
  const canRead = hasPerm(user, "IAM_PERMISSION_READ");
  const canManage = hasPerm(user, "IAM_PERMISSION_MANAGE"); // includes create/sync/update metadata

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<Permission[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Create drawer
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [cCategory, setCCategory] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cCode, setCCode] = React.useState("");
  const [cDesc, setCDesc] = React.useState("");
  const [manualCode, setManualCode] = React.useState(false);

  // Details/Edit drawer
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"view" | "edit">("view");
  const [selected, setSelected] = React.useState<Permission | null>(null);

  const [eName, setEName] = React.useState("");
  const [eCategory, setECategory] = React.useState("");
  const [eDesc, setEDesc] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const searchFiltered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((p) => `${p.code} ${p.name} ${p.category}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((p) => {
      const cat = String(p.category || "").trim();
      if (cat) set.add(cat);
    });

    const ordered = PERMISSION_CATEGORIES.filter((cat) => set.has(cat));
    const extras = Array.from(set)
      .filter((cat) => !PERMISSION_CATEGORIES.includes(cat))
      .sort((a, b) => a.localeCompare(b));

    return ["all", ...ordered, ...extras];
  }, [rows]);

  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of searchFiltered) {
      const cat = String(p.category || "").trim();
      if (!cat) continue;
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [searchFiltered]);

  const filtered = React.useMemo(() => {
    if (activeCategory === "all") return searchFiltered;
    return searchFiltered.filter((p) => String(p.category || "").trim() === activeCategory);
  }, [searchFiltered, activeCategory]);

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  );

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageNumbers = React.useMemo(() => {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const categories = new Set(rows.map((p) => (p.category || "").trim()).filter(Boolean)).size;
    const visible = filtered.length;
    return { total, categories, visible };
  }, [rows, filtered]);

  async function refresh(showToast: boolean) {
    // ✅ Don’t call backend if user can’t read (enterprise-safe UX)
    if (!canRead) {
      setRows([]);
      setErr(null);
      return;
    }

    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<Permission[]>("/api/iam/permissions");
      setRows(res ?? []);
    } catch (e: any) {
      const msg = e?.message || "Failed to load permissions";
      setErr(msg);
      if (showToast) toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    // ✅ Reload only when read permission exists (and react to changes)
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory("all");
  }, [categories, activeCategory]);

  React.useEffect(() => {
    setPage(1);
  }, [q, activeCategory, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Auto-generate code unless user has opted to edit manually
  React.useEffect(() => {
    if (!createOpen) return;
    if (manualCode) return;
    setCCode(generateCodeFromCategoryAndName(cCategory, cName));
  }, [cCategory, cName, manualCode, createOpen]);

  function resetCreate() {
    setCCategory("");
    setCName("");
    setCCode("");
    setCDesc("");
    setManualCode(false);
  }

  function openDetails(p: Permission) {
    setSelected(p);
    setEditMode("view");
    setEName(p.name);
    setECategory(p.category || "");
    setEDesc(p.description ?? "");
    setErr(null);
    setEditOpen(true);
  }

  function openEdit(p: Permission) {
    setSelected(p);
    setEditMode("edit");
    setEName(p.name);
    setECategory(p.category || "");
    setEDesc(p.description ?? "");
    setErr(null);
    setEditOpen(true);
  }

  async function syncCatalog() {
    if (!canManage) {
      setErr("You don’t have permission to sync/manage the permission catalog.");
      return;
    }
    setErr(null);
    try {
      await apiFetch("/api/iam/permissions/sync", { method: "POST" });
      toast({
        variant: "success",
        title: "Catalog synced",
        description: "Permission catalog has been synchronized.",
      });
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Sync failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Sync failed", description: msg });
    }
  }

  async function createPermission() {
    if (!canManage) {
      setErr("You don’t have permission to create/manage permissions.");
      return;
    }
    setErr(null);

    const code = normalizeCode(cCode);
    const name = cName.trim();
    const category = cCategory.trim();
    const description = cDesc.trim();

    if (!category) return setErr("Category is required.");
    if (!name) return setErr("Name is required.");
    if (!code) return setErr("Code is required.");

    setCreating(true);
    try {
      await apiFetch("/api/iam/permissions", {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          category,
          description: description || undefined,
        }),
      });

      toast({ variant: "success", title: "Permission created", description: `${code}` });

      setCreateOpen(false);
      resetCreate();
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Create failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Create failed", description: msg });
    } finally {
      setCreating(false);
    }
  }

  async function saveMetadata() {
    if (!selected) return;
    if (!canManage) {
      setErr("You don’t have permission to update permission metadata.");
      return;
    }
    setErr(null);

    const name = eName.trim();
    const category = eCategory.trim();
    const description = eDesc.trim();

    if (!name) return setErr("Name is required.");
    if (!category) return setErr("Category is required.");

    setSaving(true);
    try {
      await apiFetch(`/api/iam/permissions/${encodeURIComponent(selected.code)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          category,
          // ✅ allow clearing description
          description: description ? description : null,
        }),
      });

      toast({ variant: "success", title: "Updated", description: `Updated ${selected.code}` });

      setEditOpen(false);
      setSelected(null);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Permissions">
      <div className="grid gap-6">
        {/* Header (match Roles page) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Permissions</div>
              <div className="mt-1 text-sm text-zc-muted">Permission codes are the atomic access controls.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refresh(true)}
              disabled={loading || !canRead}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canManage ? (
              <Button variant="outline" className="px-5 gap-2" onClick={() => void syncCatalog()} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
                Sync Catalog
              </Button>
            ) : null}

            {canManage ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Permission
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview (match Roles page) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Use Sync Catalog to align DB with your code-defined permission manifest. Metadata edits update display
              name/category/description.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Permissions</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Categories</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.categories}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Visible</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{stats.visible}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code, name, or category…"
                  className="pl-10"
                  disabled={!canRead}
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {err ? <ErrorBanner message={err} /> : null}

            {!canRead ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                You may not have permission to view permissions. Request{" "}
                <span className="font-semibold">IAM_PERMISSION_READ</span>.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Registry (unchanged below) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Permission Registry</CardTitle>
            <CardDescription className="text-sm">
              Open details to review metadata. Edit/sync is available only with IAM_PERMISSION_MANAGE.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="px-4 py-3">
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full space-y-3">
              <TabsList className="h-auto w-full flex-wrap rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs data-[state=active]:bg-zc-accent data-[state=active]:text-white",
                      "data-[state=active]:shadow-none",
                    )}
                  >
                    {cat === "all" ? "All" : cat}
                    {cat !== "all" ? (
                      <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                        {categoryCounts[cat] ?? 0}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeCategory} className="mt-0" />
            </Tabs>
          </div>

          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zc-muted">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                      Loading permissions…
                    </td>
                  </tr>
                ) : pageRows.length ? (
                  pageRows.map((p) => (
                    <tr key={p.code} className="border-t border-zc-border/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zc-text">{p.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{p.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            categoryPill(p.category),
                          )}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zc-muted">{p.description || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="icon"
                            onClick={() => openDetails(p)}
                            title="View details"
                            aria-label="View details"
                          >
                            <IconChevronRight className="h-4 w-4" />
                          </Button>

                          {canManage ? (
                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => openEdit(p)}
                              title="Edit permission"
                              aria-label="Edit permission"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zc-muted">
                      No permissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zc-muted">
              Showing{" "}
              <span className="font-semibold tabular-nums text-zc-text">
                {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold tabular-nums text-zc-text">{Math.min(page * pageSize, filtered.length)}</span>{" "}
              of <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zc-muted">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>

              {pageNumbers.map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "primary" : "outline"}
                  className="h-8 min-w-[32px] px-2 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}

              <Button
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        {/* ---------------- Create Permission Drawer ---------------- */}
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            if (!v) {
              resetCreate();
              setErr(null);
            }
            setCreateOpen(v);
          }}
        >
          <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Create Permission
              </DialogTitle>
              <DialogDescription>
                Prefer Sync Catalog for system permissions. Use create only for deliberate custom extensions.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {err ? <ErrorBanner message={err} /> : null}

            <div className="grid gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={cCategory} onValueChange={setCCategory} disabled={!canManage || creating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-zc-muted">You can still type a custom category in Edit mode later.</div>
                </div>

                <div className="grid gap-2">
                  <Label>Permission Name</Label>
                  <Input
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="e.g. Create Tariff Plan"
                    disabled={!canManage || creating}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Permission Code</Label>
                  {!manualCode && cCode ? (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                      <Wand2 className="h-3 w-3" /> Auto-generated
                    </span>
                  ) : null}
                </div>

                <Input
                  value={cCode}
                  onChange={(e) => {
                    setCCode(normalizeCode(e.target.value));
                    setManualCode(true);
                  }}
                  placeholder="CATEGORY_ACTION_NAME"
                  disabled={!canManage || creating}
                  className={cn(
                    "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                    (!canManage || creating) && "opacity-80",
                  )}
                />

                <p className="text-[11px] text-zc-muted">
                  Example: <span className="font-mono">BILLING_TARIFF_PLAN_UPDATE</span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  placeholder="Optional details"
                  disabled={!canManage || creating}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void createPermission()} disabled={!canManage || creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create Permission"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------------- Details/Edit Drawer ---------------- */}
        <Dialog
          open={editOpen}
          onOpenChange={(v) => {
            if (!v) {
              setSelected(null);
              setErr(null);
              setSaving(false);
            }
            setEditOpen(v);
          }}
        >
          <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                {editMode === "edit" ? "Edit Permission" : "Permission Details"}
              </DialogTitle>
              <DialogDescription>
                {selected ? <span className="font-mono text-xs">{selected.code}</span> : "Inspect permission metadata."}
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {err ? <ErrorBanner message={err} /> : null}

            {selected ? (
              <div className="grid gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      disabled={editMode !== "edit" || !canManage || saving}
                      placeholder="Permission name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input
                      value={selected.code}
                      disabled
                      className="font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 opacity-80"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input
                    value={eCategory}
                    onChange={(e) => setECategory(e.target.value)}
                    disabled={editMode !== "edit" || !canManage || saving}
                    placeholder="e.g. Billing"
                  />
                  <div className="text-xs text-zc-muted">Use clear category names to keep Access screens readable.</div>
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={eDesc}
                    onChange={(e) => setEDesc(e.target.value)}
                    disabled={editMode !== "edit" || !canManage || saving}
                    placeholder="Optional details"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-zc-muted">No permission selected.</div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Close
              </Button>

              {editMode === "edit" ? (
                <Button variant="info" onClick={() => void saveMetadata()} disabled={!canManage || saving || !selected}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
