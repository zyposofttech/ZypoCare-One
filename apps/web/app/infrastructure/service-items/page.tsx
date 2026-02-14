"use client";

import * as React from "react";
import {
  CheckCircle,
  ClipboardList,
  Download,
  Eye,
  History,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Star,
  ToggleLeft,
  ToggleRight,
  Upload,
  Wrench,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type ChargeMasterItemRow = {
  id: string;
  branchId?: string;
  code: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  isActive?: boolean;
};

type ServiceChargeMappingRow = {
  id: string;
  serviceItemId: string;
  chargeMasterItemId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  chargeMasterItem?: ChargeMasterItemRow | null;
};

type SpecialtyRow = { id: string; name: string; code: string };

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  shortName?: string | null;
  displayName?: string | null;
  description?: string | null;
  searchAliases?: string[];
  category: string;
  subCategory?: string | null;
  unit?: string | null;
  specialtyId?: string | null;
  specialty?: { id: string; name: string } | null;
  requiresScheduling?: boolean;
  statAvailable?: boolean;
  defaultTatHours?: number | null;
  basePrice?: number | null;
  costPrice?: number | null;
  allowDiscount?: boolean;
  maxDiscountPercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTill?: string | null;
  isOrderable: boolean;
  isActive: boolean;
  isBillable?: boolean;
  consentRequired?: boolean;
  type?: string;
  genderRestriction?: string | null;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  cooldownMins?: number | null;
  preparationText?: string | null;
  instructionsText?: string | null;
  contraindicationsText?: string | null;
  requiresAppointment?: boolean;
  estimatedDurationMins?: number | null;
  prepMins?: number | null;
  recoveryMins?: number | null;
  tatMinsRoutine?: number | null;
  tatMinsStat?: number | null;
  chargeUnit?: string | null;
  taxApplicability?: string | null;
  lifecycleStatus?: string;
  mappings?: ServiceChargeMappingRow[];
};

type ServiceItemVersionRow = {
  id: string;
  serviceItemId: string;
  version: number;
  status: string;
  snapshot: any;
  createdByUserId?: string | null;
  createdByUser?: { id: string; name?: string } | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function qs(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s) return;
    usp.set(k, s);
  });
  return usp.toString();
}

function activeMapping(mappings?: ServiceChargeMappingRow[]) {
  if (!mappings || mappings.length === 0) return null;
  return mappings.find((m) => !m.effectiveTo) ?? mappings[0];
}

function dtLocalNow() {
  const now = new Date();
  // convert to local datetime-local string: YYYY-MM-DDTHH:mm
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDT(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
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

function ModalHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            {icon}
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <Separator className="my-4" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function ServiceItemsPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "service-items",
    enabled: !!branchId,
  });

  const [qText, setQText] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const [rows, setRows] = React.useState<ServiceItemRow[]>([]);

  // Create/Edit dialog state
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceItemRow | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fCategory, setFCategory] = React.useState("");
  const [fUnit, setFUnit] = React.useState("");
  const [fShortName, setFShortName] = React.useState("");
  const [fDisplayName, setFDisplayName] = React.useState("");
  const [fDescription, setFDescription] = React.useState("");
  const [fSearchAliases, setFSearchAliases] = React.useState("");
  const [fSubCategory, setFSubCategory] = React.useState("");
  const [fSpecialtyId, setFSpecialtyId] = React.useState("");
  const [fRequiresScheduling, setFRequiresScheduling] = React.useState(false);
  const [fStatAvailable, setFStatAvailable] = React.useState(false);
  const [fDefaultTatHours, setFDefaultTatHours] = React.useState("");
  const [fBasePrice, setFBasePrice] = React.useState("");
  const [fCostPrice, setFCostPrice] = React.useState("");
  const [fAllowDiscount, setFAllowDiscount] = React.useState(true);
  const [fMaxDiscountPercent, setFMaxDiscountPercent] = React.useState("");
  const [fEffectiveTill, setFEffectiveTill] = React.useState("");
  const [fOrderable, setFOrderable] = React.useState(true);
  const [fActive, setFActive] = React.useState(true);
  const [fChargeMasterCode, setFChargeMasterCode] = React.useState(""); // create-only
  const [fType, setFType] = React.useState("OTHER");
  const [fIsBillable, setFIsBillable] = React.useState(true);
  const [fConsentRequired, setFConsentRequired] = React.useState(false);
  const [fGenderRestriction, setFGenderRestriction] = React.useState("");
  const [fMinAgeYears, setFMinAgeYears] = React.useState("");
  const [fMaxAgeYears, setFMaxAgeYears] = React.useState("");
  const [fCooldownMins, setFCooldownMins] = React.useState("");
  const [fPreparationText, setFPreparationText] = React.useState("");
  const [fInstructionsText, setFInstructionsText] = React.useState("");
  const [fContraindicationsText, setFContraindicationsText] = React.useState("");
  const [fRequiresAppointment, setFRequiresAppointment] = React.useState(false);
  const [fEstimatedDurationMins, setFEstimatedDurationMins] = React.useState("");
  const [fPrepMins, setFPrepMins] = React.useState("");
  const [fRecoveryMins, setFRecoveryMins] = React.useState("");
  const [fTatMinsRoutine, setFTatMinsRoutine] = React.useState("");
  const [fTatMinsStat, setFTatMinsStat] = React.useState("");
  const [fChargeUnit, setFChargeUnit] = React.useState("");
  const [fTaxApplicability, setFTaxApplicability] = React.useState("");
  const [specialties, setSpecialties] = React.useState<SpecialtyRow[]>([]);

  // Favorites (localStorage)
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("zc:service-favorites");
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);
  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("zc:service-favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  // Bulk import
  const [importOpen, setImportOpen] = React.useState(false);

  // Version history
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsItem, setVersionsItem] = React.useState<any>(null);
  const [versions, setVersions] = React.useState<ServiceItemVersionRow[]>([]);
  const [versionsLoading, setVersionsLoading] = React.useState(false);

  async function loadVersions(serviceItemId: string) {
    setVersionsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/api/infrastructure/service-items/${serviceItemId}/versions`,
      );
      setVersions(Array.isArray(res) ? res : res?.rows || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  function openVersions(item: any) {
    setVersionsItem(item);
    setVersionsOpen(true);
    void loadVersions(item.id);
  }

  // Workflow actions
  async function updateLifecycleStatus(itemId: string, newStatus: string) {
    try {
      await apiFetch(
        `/api/infrastructure/services/${itemId}`,
        { method: "PATCH", body: JSON.stringify({ lifecycleStatus: newStatus }) },
      );
      toast({ title: "Status updated", description: `Service item status changed to ${newStatus}.` });
      await loadServices();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
    }
  }

  // Mapping dialog state
  const [mapOpen, setMapOpen] = React.useState(false);
  const [mapSvc, setMapSvc] = React.useState<ServiceItemRow | null>(null);
  const [effectiveFromLocal, setEffectiveFromLocal] = React.useState(dtLocalNow());
  const [replaceOpenMapping, setReplaceOpenMapping] = React.useState(true);

  const [cmQ, setCmQ] = React.useState("");
  const [cmRows, setCmRows] = React.useState<ChargeMasterItemRow[]>([]);
  const [cmPickId, setCmPickId] = React.useState<string | undefined>(undefined);

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = effectiveBranchId || null;
    const first = list[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next && isGlobalScope) setActiveBranchId(next);
  }

  async function loadSpecialties() {
    try {
      const list = await apiFetch<SpecialtyRow[]>("/api/specialties");
      setSpecialties(list || []);
    } catch { setSpecialties([]); }
  }

  async function loadServices(bid?: string) {
    const b = bid || branchId;
    if (!b) return;

    const query = qs({
      branchId: b,
      q: qText || undefined,
      includeInactive: includeInactive ? "true" : undefined, // backend checks includeInactive === "true"
    });

    const data = await apiFetch<ServiceItemRow[]>(`/api/infrastructure/services?${query}`);
    setRows(data || []);
  }

  async function searchChargeMaster(bid: string, query: string) {
    const queryString = qs({ branchId: bid, q: query || undefined });
    const data = await apiFetch<ChargeMasterItemRow[]>(`/api/infrastructure/charge-master?${queryString}`);
    setCmRows(data || []);
  }

  async function refresh() {
    setBusy(true);
    try {
      await loadServices();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadBranches(), loadSpecialties()]);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Branches failed", description: e?.message || "Unknown error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    if (isGlobalScope) setActiveBranchId(branchId ?? null);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      loadServices(branchId).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qText, includeInactive, branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      if (!mapOpen) return;
      searchChargeMaster(branchId, cmQ).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmQ, branchId, mapOpen]);

  function openCreate() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFShortName("");
    setFDisplayName("");
    setFDescription("");
    setFSearchAliases("");
    setFCategory("");
    setFSubCategory("");
    setFUnit("");
    setFSpecialtyId("");
    setFRequiresScheduling(false);
    setFStatAvailable(false);
    setFDefaultTatHours("");
    setFBasePrice("");
    setFCostPrice("");
    setFAllowDiscount(true);
    setFMaxDiscountPercent("");
    setFEffectiveTill("");
    setFOrderable(true);
    setFActive(true);
    setFChargeMasterCode("");
    setFType("OTHER");
    setFIsBillable(true);
    setFConsentRequired(false);
    setFGenderRestriction("");
    setFMinAgeYears("");
    setFMaxAgeYears("");
    setFCooldownMins("");
    setFPreparationText("");
    setFInstructionsText("");
    setFContraindicationsText("");
    setFRequiresAppointment(false);
    setFEstimatedDurationMins("");
    setFPrepMins("");
    setFRecoveryMins("");
    setFTatMinsRoutine("");
    setFTatMinsStat("");
    setFChargeUnit("");
    setFTaxApplicability("");
    setEditorOpen(true);
  }

  function openEdit(r: ServiceItemRow) {
    setEditing(r);
    setFCode(r.code || "");
    setFName(r.name || "");
    setFShortName(r.shortName || "");
    setFDisplayName(r.displayName || "");
    setFDescription(r.description || "");
    setFSearchAliases((r.searchAliases || []).join(", "));
    setFCategory(r.category || "");
    setFSubCategory(r.subCategory || "");
    setFUnit(r.unit || "");
    setFSpecialtyId(r.specialtyId || "");
    setFRequiresScheduling(!!r.requiresScheduling);
    setFStatAvailable(!!r.statAvailable);
    setFDefaultTatHours(r.defaultTatHours != null ? String(r.defaultTatHours) : "");
    setFBasePrice(r.basePrice != null ? String(r.basePrice) : "");
    setFCostPrice(r.costPrice != null ? String(r.costPrice) : "");
    setFAllowDiscount(r.allowDiscount !== false);
    setFMaxDiscountPercent(r.maxDiscountPercent != null ? String(r.maxDiscountPercent) : "");
    setFEffectiveTill(r.effectiveTill ? r.effectiveTill.slice(0, 10) : "");
    setFOrderable(!!r.isOrderable);
    setFActive(!!r.isActive);
    setFChargeMasterCode(""); // backend supports chargeMasterCode only on create
    setFType(r.type || "OTHER");
    setFIsBillable(r.isBillable !== false);
    setFConsentRequired(!!r.consentRequired);
    setFGenderRestriction(r.genderRestriction || "");
    setFMinAgeYears(r.minAgeYears != null ? String(r.minAgeYears) : "");
    setFMaxAgeYears(r.maxAgeYears != null ? String(r.maxAgeYears) : "");
    setFCooldownMins(r.cooldownMins != null ? String(r.cooldownMins) : "");
    setFPreparationText(r.preparationText || "");
    setFInstructionsText(r.instructionsText || "");
    setFContraindicationsText(r.contraindicationsText || "");
    setFRequiresAppointment(!!r.requiresAppointment);
    setFEstimatedDurationMins(r.estimatedDurationMins != null ? String(r.estimatedDurationMins) : "");
    setFPrepMins(r.prepMins != null ? String(r.prepMins) : "");
    setFRecoveryMins(r.recoveryMins != null ? String(r.recoveryMins) : "");
    setFTatMinsRoutine(r.tatMinsRoutine != null ? String(r.tatMinsRoutine) : "");
    setFTatMinsStat(r.tatMinsStat != null ? String(r.tatMinsStat) : "");
    setFChargeUnit(r.chargeUnit || "");
    setFTaxApplicability(r.taxApplicability || "");
    setEditorOpen(true);
  }

  async function saveServiceItem() {
    if (!branchId) {
      toast({ variant: "destructive", title: "Select branch", description: "Branch scope is required." });
      return;
    }

    if (!fCode.trim() || !fName.trim() || !fCategory.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Code, name and category are required." });
      return;
    }

    const aliases = fSearchAliases.split(",").map((s) => s.trim()).filter(Boolean);
    const payload: any = {
      code: fCode.trim(),
      name: fName.trim(),
      shortName: fShortName.trim() || null,
      displayName: fDisplayName.trim() || null,
      description: fDescription.trim() || null,
      searchAliases: aliases.length > 0 ? aliases : [],
      category: fCategory.trim(),
      subCategory: fSubCategory.trim() || null,
      unit: fUnit.trim() ? fUnit.trim() : null,
      specialtyId: fSpecialtyId || null,
      requiresScheduling: !!fRequiresScheduling,
      statAvailable: !!fStatAvailable,
      defaultTatHours: fDefaultTatHours ? Number(fDefaultTatHours) : null,
      basePrice: fBasePrice ? Number(fBasePrice) : null,
      costPrice: fCostPrice ? Number(fCostPrice) : null,
      allowDiscount: !!fAllowDiscount,
      maxDiscountPercent: fMaxDiscountPercent ? Number(fMaxDiscountPercent) : null,
      effectiveTill: fEffectiveTill || null,
      isOrderable: !!fOrderable,
      isActive: !!fActive,
      type: fType || "OTHER",
      isBillable: !!fIsBillable,
      consentRequired: !!fConsentRequired,
      genderRestriction: fGenderRestriction || null,
      minAgeYears: fMinAgeYears ? Number(fMinAgeYears) : null,
      maxAgeYears: fMaxAgeYears ? Number(fMaxAgeYears) : null,
      cooldownMins: fCooldownMins ? Number(fCooldownMins) : null,
      preparationText: fPreparationText.trim() || null,
      instructionsText: fInstructionsText.trim() || null,
      contraindicationsText: fContraindicationsText.trim() || null,
      requiresAppointment: !!fRequiresAppointment,
      estimatedDurationMins: fEstimatedDurationMins ? Number(fEstimatedDurationMins) : null,
      prepMins: fPrepMins ? Number(fPrepMins) : null,
      recoveryMins: fRecoveryMins ? Number(fRecoveryMins) : null,
      tatMinsRoutine: fTatMinsRoutine ? Number(fTatMinsRoutine) : null,
      tatMinsStat: fTatMinsStat ? Number(fTatMinsStat) : null,
      chargeUnit: fChargeUnit || null,
      taxApplicability: fTaxApplicability || null,
    };

    if (!editing && fChargeMasterCode.trim()) payload.chargeMasterCode = fChargeMasterCode.trim();

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/services/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Service item updated" });
      } else {
        const query = qs({ branchId });
        await apiFetch(`/api/infrastructure/services?${query}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Service item created" });
      }

      setEditorOpen(false);
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(r: ServiceItemRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/services/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      toast({ title: r.isActive ? "Service deactivated" : "Service activated" });
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleOrderable(r: ServiceItemRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/services/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isOrderable: !r.isOrderable }),
      });
      toast({ title: r.isOrderable ? "Marked non-orderable" : "Marked orderable" });
      await loadServices(branchId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  function openMapping(r: ServiceItemRow) {
    setMapSvc(r);
    setMapOpen(true);
    setEffectiveFromLocal(dtLocalNow());
    setReplaceOpenMapping(true);
    setCmQ("");
    setCmRows([]);
    setCmPickId(undefined);
  }

  async function closeActiveMappingIfNeeded(serviceItemId: string, effectiveToIso: string) {
    // backend patch adds this endpoint
    try {
      await apiFetch(`/api/infrastructure/services/mapping/close`, {
        method: "POST",
        body: JSON.stringify({ serviceItemId, effectiveTo: effectiveToIso }),
      });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 404) {
        throw new Error("Missing backend endpoint: POST /infrastructure/services/mapping/close");
      }
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("no active mapping")) return;
      throw e;
    }
  }

  async function saveMapping() {
    if (!branchId || !mapSvc) return;
    if (!cmPickId) {
      toast({ variant: "destructive", title: "Select charge master item", description: "Pick a charge master item to map." });
      return;
    }

    const effectiveFromIso = toIsoFromDateTimeLocal(effectiveFromLocal);

    setBusy(true);
    try {
      if (replaceOpenMapping) {
        await closeActiveMappingIfNeeded(mapSvc.id, effectiveFromIso);
      }

      await apiFetch(`/api/infrastructure/services/mapping`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: mapSvc.id,
          chargeMasterItemId: cmPickId,
          effectiveFrom: effectiveFromIso,
          effectiveTo: null,
        }),
      });

      toast({ title: "Charge mapping saved" });
      setMapOpen(false);
      await loadServices(branchId);
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      if (String(msg).includes("Missing backend endpoint")) {
        toast({
          variant: "destructive",
          title: "Backend change needed",
          description: "Your backend blocks overlapping mappings. Apply the backend patch below (close mapping endpoint).",
        });
      } else if (String(msg).toLowerCase().includes("overlapping")) {
        toast({
          variant: "destructive",
          title: "Mapping overlaps",
          description: "Backend blocks overlap. Enable \"Replace current mapping\" (or close effectiveTo) and try again.",
        });
      } else {
        toast({ variant: "destructive", title: "Mapping failed", description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  const metrics = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const orderable = rows.filter((r) => r.isOrderable).length;
    const missingMapping = rows.filter((r) => !activeMapping(r.mappings) || !!activeMapping(r.mappings)?.effectiveTo).length;
    return { total, active, orderable, missingMapping };
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    let list = rows;
    if (showFavoritesOnly) list = list.filter((item) => favorites.has(item.id));
    return list;
  }, [rows, showFavoritesOnly, favorites]);

  return (
    <AppShell title="Infrastructure - Service Items">
      <RequirePerm perm="INFRA_SERVICE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardList className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Items</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define orderable services (Lab/Radiology/Procedures) and map them to Charge Master.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh()} disabled={busy || loading}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="outline" className="px-5 gap-2" onClick={() => exportCsv(rows)} disabled={!branchId || rows.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            <Button variant="outline" className="px-5 gap-2" onClick={() => setImportOpen(true)} disabled={!branchId || busy || loading}>
              <Upload className="h-4 w-4" />
              Import
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={!branchId || busy || loading}>
              <Plus className="h-4 w-4" />
              New Service
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Select a branch, search services, and review ordering/mapping coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={(v) => setBranchId(v)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code}){b.city ? ` - ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{metrics.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{metrics.active}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Orderable</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{metrics.orderable}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Missing mapping</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.missingMapping}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  className="pl-10"
                  placeholder="Search code/name/category..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  disabled={!branchId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span>{showFavoritesOnly ? ` of ${rows.length}` : ""}
                </div>
                <Button
                  variant={showFavoritesOnly ? "primary" : "outline"}
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-white")} />
                  Favorites
                </Button>
                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(!!v)} disabled={!branchId} />
                  <span className="text-sm text-zc-muted">Include inactive</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage */}
        <Card>
          <CardHeader className="py-4">
            <div>
              <CardTitle className="text-base">Manage Service Items</CardTitle>
              <CardDescription>Update service details and charge master mapping.</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">{"\u2605"}</TableHead>
                    <TableHead className="w-[160px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Category</TableHead>
                    <TableHead className="w-[120px]">Flags</TableHead>
                    <TableHead className="w-[240px]">Charge Mapping</TableHead>
                    <TableHead className="w-[260px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /><Skeleton className="mt-1 h-3 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="mt-1 h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-zc-muted">
                        No service items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => {
                      const m = activeMapping(r.mappings);
                      const mappedOk = !!m && !m.effectiveTo;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleFavorite(r.id)}
                              className={cn("h-6 w-6 flex items-center justify-center rounded", favorites.has(r.id) ? "text-amber-500" : "text-zc-muted/40 hover:text-amber-400")}
                            >
                              <Star className={cn("h-4 w-4", favorites.has(r.id) && "fill-amber-500")} />
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-zc-muted">{r.unit ? `Unit: ${r.unit}` : "-"}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.category}</TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {r.isActive ? (
                                <Badge className="w-fit bg-emerald-600 text-white">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Inactive
                                </Badge>
                              )}
                              {r.isOrderable ? (
                                <Badge className="w-fit bg-sky-600 text-white">Orderable</Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Not orderable
                                </Badge>
                              )}
                              {r.lifecycleStatus && r.lifecycleStatus !== "PUBLISHED" && (
                                <Badge variant={r.lifecycleStatus === "DRAFT" ? "secondary" : r.lifecycleStatus === "IN_REVIEW" ? "warning" : r.lifecycleStatus === "APPROVED" ? "ok" : r.lifecycleStatus === "DEPRECATED" ? "destructive" : "secondary"} className="text-[10px] w-fit">
                                  {r.lifecycleStatus}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {mappedOk ? (
                              <div>
                                <div className="text-xs font-mono text-zc-muted">
                                  {m?.chargeMasterItem?.code || m?.chargeMasterItemId}
                                </div>
                                <div className="text-sm">{m?.chargeMasterItem?.name || "Charge master"}</div>
                                <div className="text-xs text-zc-muted">From: {formatDT(m?.effectiveFrom)}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-amber-700 dark:text-amber-300">
                                Not mapped
                                <div className="text-xs text-zc-muted">Map to Charge Master</div>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMapping(r)}>
                                  <LinkIcon className="mr-2 h-4 w-4" />
                                  Map to charge master
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void toggleOrderable(r)}>
                                  {r.isOrderable ? (
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                  )}
                                  {r.isOrderable ? "Mark non-orderable" : "Mark orderable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void toggleActive(r)}>
                                  {r.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Workflow</DropdownMenuLabel>
                                {r.lifecycleStatus === "DRAFT" && (
                                  <DropdownMenuItem onClick={() => updateLifecycleStatus(r.id, "IN_REVIEW")}>
                                    <Send className="mr-2 h-4 w-4" /> Submit for Review
                                  </DropdownMenuItem>
                                )}
                                {r.lifecycleStatus === "IN_REVIEW" && (
                                  <>
                                    <DropdownMenuItem onClick={() => updateLifecycleStatus(r.id, "APPROVED")}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateLifecycleStatus(r.id, "DRAFT")}>
                                      <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject (Back to Draft)
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {r.lifecycleStatus === "APPROVED" && (
                                  <DropdownMenuItem onClick={() => updateLifecycleStatus(r.id, "PUBLISHED")}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-blue-600" /> Publish
                                  </DropdownMenuItem>
                                )}
                                {r.lifecycleStatus === "PUBLISHED" && (
                                  <DropdownMenuItem onClick={() => updateLifecycleStatus(r.id, "DEPRECATED")}>
                                    <XCircle className="mr-2 h-4 w-4 text-amber-600" /> Deprecate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openVersions(r)}>
                                  <History className="mr-2 h-4 w-4" /> Version History
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ----------------------------- Create/Edit ----------------------------- */}
        <Dialog open={editorOpen} onOpenChange={(v) => setEditorOpen(v)}>
          <DialogContent className={drawerClassName("max-w-[820px]")}>
            <ModalHeader
              title={editing ? "Edit Service Item" : "Create Service Item"}
              description={
                "Backend endpoints: GET/POST /infrastructure/services and PATCH /infrastructure/services/:id"
              }
              icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Code</Label>
                  <Input className="mt-1 font-mono" value={fCode} onChange={(e) => setFCode(e.target.value)} placeholder="LAB-CBC" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input className="mt-1" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Complete Blood Count" />
                </div>
                <div>
                  <Label>Short Name</Label>
                  <Input className="mt-1" value={fShortName} onChange={(e) => setFShortName(e.target.value)} placeholder="CBC" />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input className="mt-1" value={fDisplayName} onChange={(e) => setFDisplayName(e.target.value)} placeholder="CBC - Complete Blood Count" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea className="mt-1" rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Detailed description..." />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    className="mt-1"
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value)}
                    placeholder="LAB / RADIOLOGY / PROCEDURE"
                  />
                </div>
                <div>
                  <Label>Sub-Category</Label>
                  <Input className="mt-1" value={fSubCategory} onChange={(e) => setFSubCategory(e.target.value)} placeholder="e.g. Haematology" />
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Select value={fType || "OTHER"} onValueChange={setFType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["DIAGNOSTIC", "PROCEDURE", "CONSULTATION", "NURSING", "ROOM_RENT", "CONSUMABLE", "PACKAGE", "LAB", "RADIOLOGY", "PHARMACY", "OTHER"].map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit (optional)</Label>
                  <Input className="mt-1" value={fUnit} onChange={(e) => setFUnit(e.target.value)} placeholder="Per test / Per study" />
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Select value={fSpecialtyId || "_none"} onValueChange={(v) => setFSpecialtyId(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="max-h-[280px] overflow-y-auto">
                      <SelectItem value="_none">None</SelectItem>
                      {specialties.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Search Aliases (comma-separated)</Label>
                  <Input className="mt-1" value={fSearchAliases} onChange={(e) => setFSearchAliases(e.target.value)} placeholder="blood count, CBC, hemogram" />
                </div>

                {/* Pricing */}
                <div>
                  <Label>Base Price</Label>
                  <Input className="mt-1" type="number" min="0" step="0.01" value={fBasePrice} onChange={(e) => setFBasePrice(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Cost Price</Label>
                  <Input className="mt-1" type="number" min="0" step="0.01" value={fCostPrice} onChange={(e) => setFCostPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Max Discount %</Label>
                  <Input className="mt-1" type="number" min="0" max="100" step="0.01" value={fMaxDiscountPercent} onChange={(e) => setFMaxDiscountPercent(e.target.value)} placeholder="e.g. 10" />
                </div>
                <div>
                  <Label>Default TAT (hours)</Label>
                  <Input className="mt-1" type="number" min="0" value={fDefaultTatHours} onChange={(e) => setFDefaultTatHours(e.target.value)} placeholder="e.g. 24" />
                </div>
                <div>
                  <Label>Effective Till</Label>
                  <Input className="mt-1" type="date" value={fEffectiveTill} onChange={(e) => setFEffectiveTill(e.target.value)} />
                </div>

                {/* Restrictions */}
                <div>
                  <Label>Gender Restriction</Label>
                  <Select value={fGenderRestriction || "_none"} onValueChange={(v) => setFGenderRestriction(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All genders" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">All Genders</SelectItem>
                      <SelectItem value="MALE">Male Only</SelectItem>
                      <SelectItem value="FEMALE">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Age (years)</Label>
                  <Input className="mt-1" type="number" min={0} value={fMinAgeYears} onChange={(e) => setFMinAgeYears(e.target.value)} placeholder="e.g., 0" />
                </div>
                <div>
                  <Label>Max Age (years)</Label>
                  <Input className="mt-1" type="number" min={0} value={fMaxAgeYears} onChange={(e) => setFMaxAgeYears(e.target.value)} placeholder="e.g., 120" />
                </div>
                <div>
                  <Label>Cooldown (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fCooldownMins} onChange={(e) => setFCooldownMins(e.target.value)} placeholder="e.g., 60" />
                  <div className="mt-1 text-xs text-zc-muted">Min minutes between repeat orders</div>
                </div>

                {/* Operational timing */}
                <Separator className="md:col-span-2 my-1" />
                <div className="md:col-span-2 text-sm font-semibold text-zc-muted">Operational Timing</div>

                <div>
                  <Label>Estimated Duration (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fEstimatedDurationMins} onChange={(e) => setFEstimatedDurationMins(e.target.value)} placeholder="e.g., 30" />
                </div>
                <div>
                  <Label>Preparation Time (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fPrepMins} onChange={(e) => setFPrepMins(e.target.value)} placeholder="e.g., 15" />
                </div>
                <div>
                  <Label>Recovery Time (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fRecoveryMins} onChange={(e) => setFRecoveryMins(e.target.value)} placeholder="e.g., 30" />
                </div>
                <div>
                  <Label>Routine TAT (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fTatMinsRoutine} onChange={(e) => setFTatMinsRoutine(e.target.value)} placeholder="e.g., 1440" />
                </div>
                <div>
                  <Label>STAT TAT (mins)</Label>
                  <Input className="mt-1" type="number" min={0} value={fTatMinsStat} onChange={(e) => setFTatMinsStat(e.target.value)} placeholder="e.g., 120" />
                </div>

                {/* Billing config */}
                <Separator className="md:col-span-2 my-1" />
                <div className="md:col-span-2 text-sm font-semibold text-zc-muted">Billing Configuration</div>

                <div>
                  <Label>Charge Unit</Label>
                  <Select value={fChargeUnit || "_none"} onValueChange={(v) => setFChargeUnit(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Not set</SelectItem>
                      {["PER_UNIT", "PER_SESSION", "PER_DAY", "PER_HOUR", "PER_VISIT", "PER_TEST", "PER_STUDY", "LUMP_SUM"].map((u) => (
                        <SelectItem key={u} value={u}>{u.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tax Applicability</Label>
                  <Select value={fTaxApplicability || "_none"} onValueChange={(v) => setFTaxApplicability(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Not set</SelectItem>
                      {["TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST"].map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clinical instructions */}
                <Separator className="md:col-span-2 my-1" />
                <div className="md:col-span-2 text-sm font-semibold text-zc-muted">Clinical Instructions</div>

                <div className="md:col-span-2">
                  <Label>Preparation Instructions</Label>
                  <Textarea className="mt-1" rows={2} value={fPreparationText} onChange={(e) => setFPreparationText(e.target.value)} placeholder="e.g., 12-hour fasting required..." />
                </div>
                <div className="md:col-span-2">
                  <Label>Patient Instructions</Label>
                  <Textarea className="mt-1" rows={2} value={fInstructionsText} onChange={(e) => setFInstructionsText(e.target.value)} placeholder="e.g., Bring previous reports..." />
                </div>
                <div className="md:col-span-2">
                  <Label>Contraindications</Label>
                  <Textarea className="mt-1" rows={2} value={fContraindicationsText} onChange={(e) => setFContraindicationsText(e.target.value)} placeholder="e.g., Not recommended for patients with..." />
                </div>

                {/* Toggles */}
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Billable</div>
                      <div className="text-xs text-zc-muted">Chargeable to patient</div>
                    </div>
                    <Switch checked={fIsBillable} onCheckedChange={(v) => setFIsBillable(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Consent Required</div>
                      <div className="text-xs text-zc-muted">Patient must give consent</div>
                    </div>
                    <Switch checked={fConsentRequired} onCheckedChange={(v) => setFConsentRequired(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Allow Discount</div>
                      <div className="text-xs text-zc-muted">Discounts can be applied</div>
                    </div>
                    <Switch checked={fAllowDiscount} onCheckedChange={(v) => setFAllowDiscount(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Requires Appointment</div>
                      <div className="text-xs text-zc-muted">Requires scheduled appointment</div>
                    </div>
                    <Switch checked={fRequiresAppointment} onCheckedChange={(v) => setFRequiresAppointment(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Requires Scheduling</div>
                      <div className="text-xs text-zc-muted">Needs appointment slot</div>
                    </div>
                    <Switch checked={fRequiresScheduling} onCheckedChange={(v) => setFRequiresScheduling(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">STAT Available</div>
                      <div className="text-xs text-zc-muted">Available as urgent/stat</div>
                    </div>
                    <Switch checked={fStatAvailable} onCheckedChange={(v) => setFStatAvailable(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Orderable</div>
                      <div className="text-xs text-zc-muted">Visible in ordering UIs</div>
                    </div>
                    <Switch checked={fOrderable} onCheckedChange={(v) => setFOrderable(!!v)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Active</div>
                      <div className="text-xs text-zc-muted">Hidden when inactive</div>
                    </div>
                    <Switch checked={fActive} onCheckedChange={(v) => setFActive(!!v)} />
                  </div>
                </div>

                {!editing ? (
                  <div className="md:col-span-2">
                    <Label>Charge Master Code (optional at create)</Label>
                    <Input
                      className="mt-1 font-mono"
                      value={fChargeMasterCode}
                      onChange={(e) => setFChargeMasterCode(e.target.value)}
                      placeholder="CM-LAB-CBC"
                    />
                    <div className="mt-1 text-xs text-zc-muted">
                      If skipped, backend creates a Fix-It task: <span className="font-mono">SERVICE_CHARGE_MAPPING_MISSING</span>.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void saveServiceItem()} disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* -------------------------------- Mapping ------------------------------ */}
        <Dialog open={mapOpen} onOpenChange={(v) => setMapOpen(v)}>
          <DialogContent className={drawerClassName("max-w-[980px]")}>
            <ModalHeader
              title="Charge Mapping"
              description={
                "Backend blocks overlapping mappings - this UI closes the current mapping first when \"Replace current mapping\" is enabled."
              }
              icon={<LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-5 space-y-3">
                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="text-sm font-semibold">Service</div>
                  <div className="mt-2">
                    <div className="font-mono text-xs text-zc-muted">{mapSvc?.code}</div>
                    <div className="text-base font-medium">{mapSvc?.name}</div>
                    <div className="text-xs text-zc-muted">
                      {mapSvc?.category}{mapSvc?.unit ? ` - ${mapSvc.unit}` : ""}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="text-sm font-semibold">Current mapping</div>
                  {mapSvc
                    ? (() => {
                        const m = activeMapping(mapSvc.mappings);
                        if (!m) {
                          return <div className="mt-2 text-sm text-zc-muted">No mappings yet.</div>;
                        }
                        return (
                          <div className="mt-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                            <div className="font-mono text-xs text-zc-muted">{m.chargeMasterItem?.code || m.chargeMasterItemId}</div>
                            <div className="text-sm font-medium">{m.chargeMasterItem?.name || "Charge master"}</div>
                            <div className="mt-1 text-xs text-zc-muted">
                              From: {formatDT(m.effectiveFrom)} - To: {formatDT(m.effectiveTo)}
                            </div>
                            {!m.effectiveTo ? (
                              <Badge className="mt-2 bg-emerald-600 text-white">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="mt-2">
                                Closed
                              </Badge>
                            )}
                          </div>
                        );
                      })()
                    : null}
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <Label>New mapping effective from</Label>
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={effectiveFromLocal}
                    onChange={(e) => setEffectiveFromLocal(e.target.value)}
                  />
                  <div className="mt-1 text-xs text-zc-muted">
                    This time is used to close the current mapping (effectiveTo) when Replace is enabled.
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Replace current mapping</div>
                      <div className="text-xs text-zc-muted">Auto-close open mapping to avoid overlap</div>
                    </div>
                    <Switch checked={replaceOpenMapping} onCheckedChange={(v) => setReplaceOpenMapping(!!v)} />
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="rounded-xl border border-zc-border bg-zc-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">Pick Charge Master</div>
                      <div className="text-xs text-zc-muted">Search by code/name (branch-scoped).</div>
                    </div>
                    {cmPickId ? <Badge className="bg-zc-primary text-white">Selected</Badge> : <Badge variant="secondary">Not selected</Badge>}
                  </div>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                    <Input className="pl-9" value={cmQ} onChange={(e) => setCmQ(e.target.value)} placeholder="Search charge master..." />
                  </div>

                  <div className="mt-3 max-h-[380px] overflow-auto rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[110px]">Unit</TableHead>
                          <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cmRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-zc-muted">
                              No results.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cmRows.slice(0, 80).map((cm) => {
                            const picked = cmPickId === cm.id;
                            return (
                              <TableRow key={cm.id} className={picked ? "bg-zc-panel/20" : undefined}>
                                <TableCell className="font-mono text-xs">{cm.code}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{cm.name}</div>
                                  {cm.category ? <div className="text-xs text-zc-muted">{cm.category}</div> : null}
                                </TableCell>
                                <TableCell className="text-xs text-zc-muted">{cm.unit || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant={picked ? "primary" : "outline"} onClick={() => setCmPickId(cm.id)}>
                                    {picked ? "Selected" : "Select"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setMapOpen(false)} disabled={busy}>
                Close
              </Button>
              <Button onClick={() => void saveMapping()} disabled={busy || !mapSvc || !cmPickId}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save Mapping"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ----------------------------- Version History ----------------------------- */}
        <VersionHistoryDialog
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          item={versionsItem}
          versions={versions}
          loading={versionsLoading}
        />

        {/* ----------------------------- Bulk Import ----------------------------- */}
        <BulkImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          branchId={branchId || ""}
          onImported={async () => {
            toast({ title: "Import complete", description: "Service items imported. Refreshing list..." });
            await loadServices(branchId);
          }}
        />
      </div>
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            VersionHistoryDialog                            */
/* -------------------------------------------------------------------------- */

function VersionHistoryDialog({
  open,
  onOpenChange,
  item,
  versions,
  loading: versionsLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any;
  versions: ServiceItemVersionRow[];
  loading: boolean;
}) {
  const [selectedVersion, setSelectedVersion] = React.useState<ServiceItemVersionRow | null>(null);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <History className="h-5 w-5 text-zc-accent" />
            Version History
          </DialogTitle>
          <DialogDescription>
            {item?.code} — {item?.name}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="flex-1 overflow-y-auto grid gap-4">
          {versionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-zc-panel/30 h-16" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
              <History className="h-6 w-6" />
              <p>No version history available yet.</p>
              <p className="text-xs">Versions are created when service items are modified through the approval workflow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions
                .sort((a, b) => b.version - a.version)
                .map((v) => (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-colors",
                      selectedVersion?.id === v.id
                        ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-600 dark:bg-indigo-900/20"
                        : "border-zc-border hover:bg-zc-panel/20",
                    )}
                    onClick={() => setSelectedVersion(selectedVersion?.id === v.id ? null : v)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zc-panel/40 font-mono text-sm font-bold">
                          v{v.version}
                        </span>
                        <div>
                          <div className="text-sm font-semibold">Version {v.version}</div>
                          <div className="text-xs text-zc-muted">
                            {new Date(v.createdAt).toLocaleString()}
                            {v.createdByUser?.name && ` by ${v.createdByUser.name}`}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          v.status === "PUBLISHED" ? "ok" :
                          v.status === "APPROVED" ? "info" :
                          v.status === "IN_REVIEW" ? "warning" :
                          v.status === "DEPRECATED" ? "destructive" :
                          "secondary"
                        }
                      >
                        {v.status}
                      </Badge>
                    </div>

                    {/* Snapshot details (expanded) */}
                    {selectedVersion?.id === v.id && v.snapshot && (
                      <div className="mt-3 pt-3 border-t border-zc-border">
                        <div className="text-xs font-semibold text-zc-muted mb-2">Snapshot Details</div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          {typeof v.snapshot === "object" && Object.entries(v.snapshot as Record<string, any>).slice(0, 20).map(([key, val]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-xs text-zc-muted min-w-[120px] font-mono">{key}:</span>
                              <span className="text-xs font-semibold break-all">
                                {val === null ? "null" : typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {typeof v.snapshot === "object" && Object.keys(v.snapshot as Record<string, any>).length > 20 && (
                          <div className="mt-2 text-xs text-zc-muted">... and {Object.keys(v.snapshot as Record<string, any>).length - 20} more fields</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CSV Export                                     */
/* -------------------------------------------------------------------------- */

const EXPORT_COLUMNS = [
  "code", "name", "shortName", "displayName", "category", "subCategory",
  "unit", "type", "isOrderable", "isActive", "isBillable",
  "basePrice", "costPrice", "maxDiscountPercent", "defaultTatHours",
  "genderRestriction", "minAgeYears", "maxAgeYears", "cooldownMins",
  "estimatedDurationMins", "prepMins", "recoveryMins", "tatMinsRoutine", "tatMinsStat",
  "chargeUnit", "taxApplicability", "consentRequired", "requiresScheduling",
  "requiresAppointment", "statAvailable", "allowDiscount", "effectiveTill", "lifecycleStatus",
] as const;

function exportCsv(rows: ServiceItemRow[]) {
  const header = EXPORT_COLUMNS.join(",");
  const lines = rows.map((r) => {
    return EXPORT_COLUMNS.map((col) => {
      const v = (r as any)[col];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(",");
  });

  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `service-items-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/*                            Bulk Import Dialog                               */
/* -------------------------------------------------------------------------- */

function BulkImportDialog({
  open,
  onOpenChange,
  branchId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<"upload" | "validate" | "commit">("upload");
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [validationResult, setValidationResult] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setParsedRows([]);
      setFileName("");
      setValidationResult(null);
    }
  }, [open]);

  function parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: any = {};
      headers.forEach((h, i) => {
        if (values[i] !== undefined && values[i] !== "") row[h] = values[i];
      });
      return row;
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const rows = parseCsv(text);
      setParsedRows(rows);
      setStep("validate");
    };
    reader.readAsText(file);
  }

  async function validate() {
    if (!parsedRows.length) return;
    setSaving(true);
    try {
      const result = await apiFetch<any>(`/api/infrastructure/import/validate?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ entityType: "SERVICE_ITEMS", rows: parsedRows, fileName }),
      });
      setValidationResult(result);
      if (result.invalidRows === 0) {
        setStep("commit");
      }
    } catch (e: any) {
      toast({ title: "Validation failed", description: e?.message || "Unknown error", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  async function commit() {
    if (!validationResult?.jobId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/infrastructure/import/commit`, {
        method: "POST",
        body: JSON.stringify({ jobId: validationResult.jobId }),
      });
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast({ title: "Commit failed", description: e?.message || "Unknown error", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    const header = EXPORT_COLUMNS.join(",");
    const example = "LAB-CBC,Complete Blood Count,,CBC,LAB,Haematology,Per test,DIAGNOSTIC,true,true,true,500,200,10,24,,0,,60,30,15,30,1440,120,PER_TEST,TAXABLE,false,false,false,true,true,,DRAFT";
    const csv = [header, example].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "service-items-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-zc-accent" />
            Bulk Import Service Items
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import or update service items in bulk. Two-step process: validate then commit.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        {step === "upload" && (
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <span className="text-xs text-zc-muted">CSV with all supported columns</span>
            </div>

            <div className="rounded-xl border-2 border-dashed border-zc-border p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-zc-muted mb-3" />
              <div className="text-sm text-zc-muted mb-3">
                Drop a CSV file or click to browse
              </div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
          </div>
        )}

        {step === "validate" && (
          <div className="grid gap-4 py-4">
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-sm font-semibold">File: {fileName}</div>
              <div className="text-xs text-zc-muted mt-1">{parsedRows.length} rows parsed</div>
            </div>

            {validationResult && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <div className="text-xs text-blue-600">Total</div>
                  <div className="text-lg font-bold text-blue-700">{validationResult.totalRows}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="text-xs text-emerald-600">Valid</div>
                  <div className="text-lg font-bold text-emerald-700">{validationResult.validRows}</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                  <div className="text-xs text-red-600">Invalid</div>
                  <div className="text-lg font-bold text-red-700">{validationResult.invalidRows}</div>
                </div>
              </div>
            )}

            {validationResult?.errors?.length > 0 && (
              <div className="max-h-[200px] overflow-auto rounded-xl border border-red-200 bg-red-50/30 p-3">
                <div className="text-xs font-semibold text-red-700 mb-2">Validation Errors</div>
                {validationResult.errors.slice(0, 50).map((err: any, i: number) => (
                  <div key={i} className="text-xs text-red-600">
                    Row {err.row}{err.field ? ` [${err.field}]` : ""}: {err.message}
                  </div>
                ))}
                {validationResult.errors.length > 50 && (
                  <div className="text-xs text-red-500 mt-1">... and {validationResult.errors.length - 50} more</div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "commit" && (
          <div className="grid gap-4 py-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <div className="text-sm font-semibold text-emerald-700">
                All {validationResult?.validRows} rows validated successfully
              </div>
              <div className="text-xs text-zc-muted mt-1">
                Click Commit to import/update service items. Existing items (by code) will be updated.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>

          {step === "validate" && !validationResult && (
            <Button onClick={() => void validate()} disabled={saving || parsedRows.length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Validate
            </Button>
          )}

          {step === "validate" && validationResult?.invalidRows > 0 && (
            <Button variant="outline" onClick={() => { setStep("upload"); setValidationResult(null); setParsedRows([]); }}>
              Re-upload
            </Button>
          )}

          {step === "commit" && (
            <Button variant="primary" onClick={() => void commit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Commit Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
