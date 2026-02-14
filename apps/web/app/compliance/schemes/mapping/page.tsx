"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import {
  ArrowLeft,
  Check,
  Filter,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

/* ---------- Types ---------- */

type Mapping = {
  id: string;
  scheme: "PMJAY" | "CGHS" | "ECHS";
  externalCode: string;
  externalName: string;
  internalServiceId: string | null;
  internalServiceName: string | null;
  internalTariffItemId: string | null;
  internalTariffItemName: string | null;
  mapped: boolean;
};

type MappingsResponse = { mappings: Mapping[]; total: number };

/* ---------- Helpers ---------- */

function schemeBadgeClass(scheme: string) {
  switch (scheme) {
    case "PMJAY":
      return "border-orange-200/70 bg-orange-50/70 text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-200";
    case "CGHS":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "ECHS":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    default:
      return "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200";
  }
}

/* ---------- Component ---------- */

export default function MappingManagerPage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  /* -- State -- */
  const [mappings, setMappings] = React.useState<Mapping[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const [schemeFilter, setSchemeFilter] = React.useState<string>("ALL");
  const [unmappedOnly, setUnmappedOnly] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [addOpen, setAddOpen] = React.useState(false);
  const [addSaving, setAddSaving] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    scheme: "PMJAY" as string,
    externalCode: "",
    externalName: "",
    internalServiceId: "",
    internalTariffItemId: "",
  });

  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editMapping, setEditMapping] = React.useState<Mapping | null>(null);
  const [editForm, setEditForm] = React.useState({
    scheme: "PMJAY" as string,
    externalCode: "",
    externalName: "",
    internalServiceId: "",
    internalTariffItemId: "",
  });

  const [suggesting, setSuggesting] = React.useState(false);

  const mappedCount = mappings.filter((m) => m.mapped).length;
  const unmappedCount = mappings.filter((m) => !m.mapped).length;

  /* -- Data fetching -- */
  const fetchMappings = React.useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("branchId", activeBranchId);
      if (schemeFilter !== "ALL") params.set("scheme", schemeFilter);
      if (unmappedOnly) params.set("unmappedOnly", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await apiFetch<MappingsResponse>(
        `/api/compliance/schemes/mappings?${params.toString()}`,
      );
      setMappings(res.mappings ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, schemeFilter, unmappedOnly, searchQuery]);

  React.useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("unmappedOnly") === "true") setUnmappedOnly(true);
  }, []);

  /* -- Actions -- */
  const handleAdd = async () => {
    if (!addForm.externalCode.trim()) {
      toast({
        title: "Validation",
        description: "External code is required.",
        variant: "destructive",
      });
      return;
    }
    if (!addForm.externalName.trim()) {
      toast({
        title: "Validation",
        description: "External name is required.",
        variant: "destructive",
      });
      return;
    }
    setAddSaving(true);
    try {
      await apiFetch(`/api/compliance/schemes/mappings`, {
        method: "POST",
        body: {
          scheme: addForm.scheme,
          externalCode: addForm.externalCode.trim(),
          externalName: addForm.externalName.trim(),
          internalServiceId: addForm.internalServiceId.trim() || null,
          internalTariffItemId: addForm.internalTariffItemId.trim() || null,
          branchId: activeBranchId,
        },
      });
      toast({ title: "Success", description: "Mapping created." });
      setAddOpen(false);
      setAddForm({
        scheme: "PMJAY",
        externalCode: "",
        externalName: "",
        internalServiceId: "",
        internalTariffItemId: "",
      });
      fetchMappings();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  const openEditDialog = (mapping: Mapping) => {
    setEditMapping(mapping);
    setEditForm({
      scheme: mapping.scheme,
      externalCode: mapping.externalCode,
      externalName: mapping.externalName,
      internalServiceId: mapping.internalServiceId || "",
      internalTariffItemId: mapping.internalTariffItemId || "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editMapping) return;
    if (!editForm.externalCode.trim()) {
      toast({
        title: "Validation",
        description: "External code is required.",
        variant: "destructive",
      });
      return;
    }
    setEditSaving(true);
    try {
      await apiFetch(`/api/compliance/schemes/mappings/${editMapping.id}`, {
        method: "PATCH",
        body: {
          scheme: editForm.scheme,
          externalCode: editForm.externalCode.trim(),
          externalName: editForm.externalName.trim(),
          internalServiceId: editForm.internalServiceId.trim() || null,
          internalTariffItemId: editForm.internalTariffItemId.trim() || null,
        },
      });
      toast({ title: "Success", description: "Mapping updated." });
      setEditOpen(false);
      setEditMapping(null);
      fetchMappings();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await apiFetch(`/api/compliance/schemes/mappings/${mappingId}`, {
        method: "DELETE",
      });
      toast({ title: "Success", description: "Mapping deleted." });
      fetchMappings();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAutoSuggest = async () => {
    if (!activeBranchId) return;
    setSuggesting(true);
    try {
      await apiFetch(`/api/compliance/schemes/mappings/auto-suggest`, {
        method: "POST",
        body: {
          workspaceId: activeBranchId,
          scheme: schemeFilter !== "ALL" ? schemeFilter : undefined,
        },
      });
      toast({
        title: "Success",
        description: "Auto-suggest completed. Mappings refreshed.",
      });
      fetchMappings();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  /* ---------- Render ---------- */

  return (
    <AppShell title="Scheme Mapping Manager">
      <RequirePerm perm="COMPLIANCE_SCHEME_MAPPING">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/compliance/schemes">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-2xl border-zc-border"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Link2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Mapping Manager
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Map external government scheme codes to internal services and
                tariff items.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-schemes-mapping" />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fetchMappings()}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAutoSuggest}
              disabled={suggesting}
            >
              {suggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Auto-Suggest
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-schemes-mapping" />

        {/* ── Stat Boxes ─────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Total Mappings
            </div>
            <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
              {total}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Mapped
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {mappedCount}
            </div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Unmapped
            </div>
            <div className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-300">
              {unmappedCount}
            </div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
              Schemes
            </div>
            <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">
              {new Set(mappings.map((m) => m.scheme)).size || 0}
            </div>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Mappings</CardTitle>
                <CardDescription>
                  {total} mapping{total !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-zc-muted" />
                  <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Schemes</SelectItem>
                      <SelectItem value="PMJAY">PMJAY</SelectItem>
                      <SelectItem value="CGHS">CGHS</SelectItem>
                      <SelectItem value="ECHS">ECHS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={unmappedOnly}
                    onCheckedChange={setUnmappedOnly}
                    id="unmappedToggle"
                  />
                  <Label
                    htmlFor="unmappedToggle"
                    className="cursor-pointer text-sm"
                  >
                    Unmapped only
                  </Label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zc-muted" />
                  <Input
                    className="pl-10 w-64"
                    placeholder="Search by code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <Separator />

          {/* ── Table ──────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
            </div>
          ) : mappings.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              {searchQuery || unmappedOnly || schemeFilter !== "ALL"
                ? "No mappings match your filters."
                : "No mappings found. Add a mapping or use Auto-Suggest to get started."}
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Scheme
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      External Code
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      External Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Internal Service
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Internal Tariff Item
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Mapped
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-zc-border hover:bg-zc-panel/20"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            schemeBadgeClass(m.scheme),
                          )}
                        >
                          {m.scheme}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zc-text">
                        {m.externalCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-zc-text">
                        {m.externalName}
                      </td>
                      <td className="px-4 py-3 text-sm text-zc-text">
                        {m.internalServiceName || m.internalServiceId || (
                          <span className="text-zc-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zc-text">
                        {m.internalTariffItemName ||
                          m.internalTariffItemId || (
                            <span className="text-zc-muted">-</span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.mapped ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="info"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openEditDialog(m)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Info Callout ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="text-sm font-semibold text-zc-text">
            Auto-Suggest Feature
          </div>
          <div className="mt-1 text-sm text-zc-muted">
            Use the Auto-Suggest button to automatically match external scheme
            codes to your internal services based on name similarity. Review
            suggestions and manually adjust any incorrect mappings.
          </div>
        </div>

        {/* ── Add Mapping Dialog ─────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Mapping</DialogTitle>
              <DialogDescription>
                Map an external government scheme code to an internal service.
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Scheme *</Label>
                <Select
                  value={addForm.scheme}
                  onValueChange={(v) =>
                    setAddForm((f) => ({ ...f, scheme: v }))
                  }
                  disabled={addSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PMJAY">PMJAY</SelectItem>
                    <SelectItem value="CGHS">CGHS</SelectItem>
                    <SelectItem value="ECHS">ECHS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addExternalCode">External Code *</Label>
                <Input
                  id="addExternalCode"
                  value={addForm.externalCode}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, externalCode: e.target.value }))
                  }
                  placeholder="e.g. HBP-01-001"
                  disabled={addSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addExternalName">External Name *</Label>
                <Input
                  id="addExternalName"
                  value={addForm.externalName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, externalName: e.target.value }))
                  }
                  placeholder="e.g. Coronary Artery Bypass Grafting"
                  disabled={addSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addInternalServiceId">
                  Internal Service ID
                </Label>
                <Input
                  id="addInternalServiceId"
                  value={addForm.internalServiceId}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      internalServiceId: e.target.value,
                    }))
                  }
                  placeholder="UUID or code of internal service"
                  disabled={addSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addInternalTariffItemId">
                  Internal Tariff Item ID
                </Label>
                <Input
                  id="addInternalTariffItemId"
                  value={addForm.internalTariffItemId}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      internalTariffItemId: e.target.value,
                    }))
                  }
                  placeholder="UUID or code of tariff item"
                  disabled={addSaving}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={addSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={addSaving}
                className="gap-2"
              >
                {addSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Mapping Dialog ────────────────────────────────────── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Mapping</DialogTitle>
              <DialogDescription>
                Update the mapping between external and internal codes.
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Scheme</Label>
                <Select
                  value={editForm.scheme}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, scheme: v }))
                  }
                  disabled={editSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PMJAY">PMJAY</SelectItem>
                    <SelectItem value="CGHS">CGHS</SelectItem>
                    <SelectItem value="ECHS">ECHS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExternalCode">External Code *</Label>
                <Input
                  id="editExternalCode"
                  value={editForm.externalCode}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, externalCode: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExternalName">External Name *</Label>
                <Input
                  id="editExternalName"
                  value={editForm.externalName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, externalName: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editInternalServiceId">
                  Internal Service ID
                </Label>
                <Input
                  id="editInternalServiceId"
                  value={editForm.internalServiceId}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      internalServiceId: e.target.value,
                    }))
                  }
                  placeholder="UUID or code of internal service"
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editInternalTariffItemId">
                  Internal Tariff Item ID
                </Label>
                <Input
                  id="editInternalTariffItemId"
                  value={editForm.internalTariffItemId}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      internalTariffItemId: e.target.value,
                    }))
                  }
                  placeholder="UUID or code of tariff item"
                  disabled={editSaving}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditSave}
                disabled={editSaving}
                className="gap-2"
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
