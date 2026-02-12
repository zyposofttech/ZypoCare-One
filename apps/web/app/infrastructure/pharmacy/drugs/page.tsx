"use client";
import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import { IconPill, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { useFieldCopilot } from "@/lib/copilot/useFieldCopilot";
import { AIFieldWrapper } from "@/components/copilot/AIFieldWrapper";

/* -------------------------------- Types -------------------------------- */

type DrugCategory =
  | "GENERAL"
  | "ANTIBIOTIC"
  | "ANALGESIC"
  | "CARDIOVASCULAR"
  | "RESPIRATORY"
  | "GASTROINTESTINAL"
  | "NEUROLOGICAL"
  | "DERMATOLOGICAL"
  | "ONCOLOGY"
  | "OTHER";

type DosageForm =
  | "TABLET"
  | "CAPSULE"
  | "SYRUP"
  | "INJECTION"
  | "OINTMENT"
  | "DROPS"
  | "INHALER"
  | "SUPPOSITORY"
  | "PATCH"
  | "OTHER";

type DrugSchedule = "SCHEDULE_H" | "SCHEDULE_H1" | "SCHEDULE_X" | "OTC" | "NONE";

type DrugRow = {
  id: string;
  drugCode: string;
  genericName: string;
  brandName: string | null;
  category: DrugCategory;
  dosageForm: DosageForm;
  strength: string | null;
  schedule: DrugSchedule;
  manufacturer: string | null;
  hsnCode: string | null;
  formularyStatus: string;
  status: string;
  createdAt: string;
};

type DrugForm = {
  drugCode: string;
  genericName: string;
  brandName: string;
  category: DrugCategory;
  dosageForm: DosageForm;
  strength: string;
  schedule: DrugSchedule;
  manufacturer: string;
  hsnCode: string;
};

/* ------------------------------- Constants ------------------------------ */

const CATEGORIES: DrugCategory[] = [
  "GENERAL", "ANTIBIOTIC", "ANALGESIC", "CARDIOVASCULAR", "RESPIRATORY",
  "GASTROINTESTINAL", "NEUROLOGICAL", "DERMATOLOGICAL", "ONCOLOGY", "OTHER",
];

const DOSAGE_FORMS: DosageForm[] = [
  "TABLET", "CAPSULE", "SYRUP", "INJECTION", "OINTMENT",
  "DROPS", "INHALER", "SUPPOSITORY", "PATCH", "OTHER",
];

const SCHEDULES: DrugSchedule[] = ["OTC", "SCHEDULE_H", "SCHEDULE_H1", "SCHEDULE_X", "NONE"];

const SCHEDULE_LABELS: Record<DrugSchedule, string> = {
  SCHEDULE_H: "Sch. H",
  SCHEDULE_H1: "Sch. H1",
  SCHEDULE_X: "Sch. X",
  OTC: "OTC",
  NONE: "None",
};

const CATEGORY_LABELS: Record<DrugCategory, string> = {
  GENERAL: "General",
  ANTIBIOTIC: "Antibiotic",
  ANALGESIC: "Analgesic",
  CARDIOVASCULAR: "Cardiovascular",
  RESPIRATORY: "Respiratory",
  GASTROINTESTINAL: "Gastrointestinal",
  NEUROLOGICAL: "Neurological",
  DERMATOLOGICAL: "Dermatological",
  ONCOLOGY: "Oncology",
  OTHER: "Other",
};

const FORM_LABELS: Record<DosageForm, string> = {
  TABLET: "Tablet",
  CAPSULE: "Capsule",
  SYRUP: "Syrup",
  INJECTION: "Injection",
  OINTMENT: "Ointment",
  DROPS: "Drops",
  INHALER: "Inhaler",
  SUPPOSITORY: "Suppository",
  PATCH: "Patch",
  OTHER: "Other",
};

/* ------------------------------- Helpers -------------------------------- */

function emptyForm(): DrugForm {
  return {
    drugCode: "",
    genericName: "",
    brandName: "",
    category: "GENERAL",
    dosageForm: "TABLET",
    strength: "",
    schedule: "OTC",
    manufacturer: "",
    hsnCode: "",
  };
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

function schedulePillClasses(schedule: DrugSchedule) {
  switch (schedule) {
    case "SCHEDULE_X":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "SCHEDULE_H1":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "SCHEDULE_H":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

/* -------------------------------- Page --------------------------------- */

export default function DrugMasterPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "INFRA_PHARMACY_DRUG_READ");
  const canCreate = hasPerm(user, "INFRA_PHARMACY_DRUG_CREATE");

  // --- State ---
  const [q, setQ] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterSchedule, setFilterSchedule] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DrugRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 25;
  const [err, setErr] = React.useState<string | null>(null);

  // Dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState<DrugForm>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);

  // AI copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy-drugs",
    enabled: !!branchId,
  });

  const drugCodeCopilot = useFieldCopilot({
    module: "pharmacy-drug",
    field: "drugCode",
    value: form.drugCode,
    enabled: !!branchId && createOpen,
  });

  const genericNameCopilot = useFieldCopilot({
    module: "pharmacy-drug",
    field: "genericName",
    value: form.genericName,
    enabled: !!branchId && createOpen,
  });

  // --- Derived ---
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((d) => {
      const hay = `${d.drugCode} ${d.genericName} ${d.brandName ?? ""} ${d.manufacturer ?? ""} ${d.hsnCode ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const activeDrugs = rows.filter((r) => r.status === "ACTIVE").length;
  const scheduledDrugs = rows.filter((r) => r.schedule !== "OTC" && r.schedule !== "NONE").length;
  const totalPages = Math.ceil(total / pageSize);

  // --- Load ---
  const load = React.useCallback(async (showToast = false) => {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q.trim()) params.set("q", q.trim());
      if (filterCategory) params.set("category", filterCategory);
      if (filterSchedule) params.set("schedule", filterSchedule);

      const data = await apiFetch<{ rows: DrugRow[]; total: number }>(
        `/infrastructure/pharmacy/drugs?${params}`,
      );
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (showToast) {
        toast({ title: "Drugs refreshed", description: `Loaded ${data.total ?? 0} drugs.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load drugs";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }, [branchId, page, q, filterCategory, filterSchedule, toast]);

  React.useEffect(() => {
    void load(false);
  }, [load]);

  // --- Dialog helpers ---
  function openCreate() {
    setForm(emptyForm());
    setFormErr(null);
    setCreateOpen(true);
  }

  function set<K extends keyof DrugForm>(key: K, value: DrugForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setFormErr(null);

    if (!form.drugCode.trim()) return setFormErr("Drug code is required");
    if (!form.genericName.trim()) return setFormErr("Generic name is required");

    setSaving(true);
    try {
      await apiFetch("/infrastructure/pharmacy/drugs", {
        method: "POST",
        body: {
          drugCode: form.drugCode.trim().toUpperCase(),
          genericName: form.genericName.trim(),
          brandName: form.brandName.trim() || null,
          category: form.category,
          dosageForm: form.dosageForm,
          strength: form.strength.trim() || null,
          schedule: form.schedule,
          manufacturer: form.manufacturer.trim() || null,
          hsnCode: form.hsnCode.trim() || null,
        },
      });

      toast({
        title: "Drug Created",
        description: `Successfully created drug "${form.genericName}"`,
        variant: "success",
      });

      setCreateOpen(false);
      setForm(emptyForm());
      void load(false);
    } catch (e: any) {
      setFormErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Drug Master">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconPill className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Drug Master</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage the drug catalog — generics, brands, categories, dosage forms, and schedules.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void load(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate}>
                <IconPlus className="h-4 w-4" />
                Add Drug
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Overview Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search and filter the drug catalog. Use the filters to narrow down by category or schedule.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {/* Stat boxes */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Drugs</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{total}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Active Drugs</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{activeDrugs}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Scheduled Drugs</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{scheduledDrugs}</div>
                <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                  Sch. H / H1 / X controlled
                </div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full lg:w-72">
                  <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by code, name, brand, manufacturer..."
                    className="pl-10"
                  />
                </div>

                <Select value={filterCategory || "ALL"} onValueChange={(v) => { setFilterCategory(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSchedule || "ALL"} onValueChange={(v) => { setFilterSchedule(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Schedules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Schedules</SelectItem>
                    {SCHEDULES.map((s) => (
                      <SelectItem key={s} value={s}>{SCHEDULE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{total}</span>
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
            <CardTitle className="text-base">Drug Catalog</CardTitle>
            <CardDescription className="text-sm">
              Drug master records with generic names, brands, categories, and regulatory schedules.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Generic Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Brand</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Form</th>
                  <th className="px-4 py-3 text-left font-semibold">Strength</th>
                  <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading drugs..." : "No drugs found. Add your first drug to the catalog."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {d.drugCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{d.genericName}</div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {d.brandName || "\u2014"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted text-xs">
                      {CATEGORY_LABELS[d.category] ?? d.category}
                    </td>

                    <td className="px-4 py-3 text-zc-muted text-xs">
                      {FORM_LABELS[d.dosageForm] ?? d.dosageForm}
                    </td>

                    <td className="px-4 py-3 text-zc-muted text-xs">
                      {d.strength || "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          schedulePillClasses(d.schedule),
                        )}
                      >
                        {SCHEDULE_LABELS[d.schedule] ?? d.schedule}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {d.status === "ACTIVE" ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                          {d.status}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/infrastructure/pharmacy/drugs/${d.id}` as any} title="View drug details" aria-label="View drug details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-zc-border px-4 py-3">
              <div className="text-xs text-zc-muted">
                Page <span className="font-semibold tabular-nums text-zc-text">{page}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Bottom guidance callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Drug catalog best practices</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Use standard INN generic names, then 2) assign correct drug schedules (H/H1/X/OTC), then 3) map drugs to formulary and inventory stores.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Drug Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) {
            setFormErr(null);
            setCreateOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <IconPill className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Add Drug to Catalog
            </DialogTitle>
            <DialogDescription>
              Create a new drug master record. Fill in generic name, classification, and manufacturing details.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {formErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{formErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Section: Basics */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Basics</div>

              <div className="grid gap-2">
                <Label>Drug Code *</Label>
                <AIFieldWrapper warnings={drugCodeCopilot.warnings} suggestion={drugCodeCopilot.suggestion} validating={drugCodeCopilot.validating}>
                  <Input
                    value={form.drugCode}
                    onChange={(e) => set("drugCode", e.target.value.toUpperCase())}
                    placeholder="e.g., DRG-0001"
                    className="font-mono"
                  />
                </AIFieldWrapper>
                <p className="text-[11px] text-zc-muted">Unique identifier for this drug in the catalog.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Generic Name *</Label>
                  <AIFieldWrapper warnings={genericNameCopilot.warnings} suggestion={genericNameCopilot.suggestion} validating={genericNameCopilot.validating}>
                    <Input
                      value={form.genericName}
                      onChange={(e) => set("genericName", e.target.value)}
                      placeholder="e.g., Paracetamol"
                    />
                  </AIFieldWrapper>
                </div>

                <div className="grid gap-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={form.brandName}
                    onChange={(e) => set("brandName", e.target.value)}
                    placeholder="e.g., Crocin"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Classification */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Classification</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => set("category", v as DrugCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Dosage Form *</Label>
                  <Select value={form.dosageForm} onValueChange={(v) => set("dosageForm", v as DosageForm)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_FORMS.map((f) => (
                        <SelectItem key={f} value={f}>{FORM_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Strength</Label>
                  <Input
                    value={form.strength}
                    onChange={(e) => set("strength", e.target.value)}
                    placeholder="e.g., 500mg"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Select value={form.schedule} onValueChange={(v) => set("schedule", v as DrugSchedule)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULES.map((s) => (
                        <SelectItem key={s} value={s}>{SCHEDULE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-zc-muted">
                    Drug schedule as per CDSCO regulations (India).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Manufacturing */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Manufacturing</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={form.manufacturer}
                    onChange={(e) => set("manufacturer", e.target.value)}
                    placeholder="e.g., Sun Pharma"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>HSN Code</Label>
                  <Input
                    value={form.hsnCode}
                    onChange={(e) => set("hsnCode", e.target.value)}
                    placeholder="HSN code for GST"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-zc-muted">
                    Harmonized System Nomenclature code for GST classification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void onSubmit()}
                disabled={saving || !canCreate}
                title={!canCreate ? "Missing permission: INFRA_PHARMACY_DRUG_CREATE" : undefined}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Drug
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
