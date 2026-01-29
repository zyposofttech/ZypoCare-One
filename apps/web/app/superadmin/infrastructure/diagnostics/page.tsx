"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Compass,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Search,
  Trash2,
  TriangleAlert,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";

/* =========================================================
   Types (aligned to backend DTOs + Prisma responses)
   ========================================================= */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type DiagnosticKind = "LAB" | "IMAGING" | "PROCEDURE";
type ResultDataType = "NUMERIC" | "TEXT" | "CHOICE" | "BOOLEAN";
type TemplateKind = "IMAGING_REPORT" | "LAB_REPORT";

type SectionRow = { id: string; branchId: string; code: string; name: string; sortOrder: number; isActive: boolean };

type CategoryRow = {
  id: string;
  branchId: string;
  sectionId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  section?: SectionRow;
};

type SpecimenRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  container?: string | null;
  minVolumeMl?: number | null;
  handlingNotes?: string | null;
  isActive: boolean;
};

type DiagnosticItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  kind: DiagnosticKind;
  sectionId: string;
  categoryId?: string | null;
  specimenId?: string | null;
  isPanel: boolean;
  tatMinsRoutine?: number | null;
  tatMinsStat?: number | null;
  preparationText?: string | null;
  consentRequired: boolean;
  requiresAppointment: boolean;
  sortOrder: number;
  isActive: boolean;
  section?: SectionRow;
  category?: CategoryRow | null;
  specimen?: SpecimenRow | null;
  _count?: { parameters: number; templates: number; panelChildren: number; panelParents: number };
};

type PanelItemRow = { panelId: string; itemId: string; sortOrder: number; isActive: boolean; item?: DiagnosticItemRow };

type ParameterRow = {
  id: string;
  testId: string;
  code: string;
  name: string;
  dataType: ResultDataType;
  unit?: string | null;
  precision?: number | null;
  allowedText?: string | null;
  isActive: boolean;
  ranges?: RangeRow[];
};

type RangeRow = {
  id: string;
  parameterId: string;
  sex?: string | null;
  ageMinDays?: number | null;
  ageMaxDays?: number | null;
  low?: number | null;
  high?: number | null;
  textRange?: string | null;
  isActive: boolean;
};

type TemplateRow = { id: string; itemId: string; kind: TemplateKind; name: string; body: string; isActive: boolean };

/* ---- Service Points / Capabilities / Bootstrap ---- */

type ServicePointType =
  | "LAB"
  | "RADIOLOGY"
  | "CARDIO_DIAGNOSTICS"
  | "NEURO_DIAGNOSTICS"
  | "PULMONARY_DIAGNOSTICS"
  | "ENDOSCOPY"
  | "OTHER";

type LabType =
  | "LAB_CORE"
  | "RADIOLOGY"
  | "CARDIO"
  | "PULMONARY"
  | "ENDOSCOPY"
  | "MICROBIOLOGY"
  | "BIOCHEMISTRY"
  | "HEMATOLOGY"
  | "OTHER";

type Modality =
  | "XRAY"
  | "ULTRASOUND"
  | "CT"
  | "MRI"
  | "MAMMOGRAPHY"
  | "FLUOROSCOPY"
  | "ECG"
  | "ECHO"
  | "TMT"
  | "HOLTER"
  | "PFT"
  | "EEG"
  | "EMG_NCV"
  | "LAB"
  | "SAMPLE_COLLECTION"
  | "PROCEDURE_ROOM"
  | "OTHER";

type UnitRow = { id: string; code: string; name: string };
type RoomRow = { id: string; code: string; name: string; unitId: string };
type UnitResourceRow = { id: string; code: string; name: string; unitId: string; roomId?: string | null };
type EquipmentAssetRow = { id: string; code: string; name: string; category?: string };

type LocationTreeNode = {
  id: string;
  type: string;
  code: string;
  name: string;
  buildings?: LocationTreeNode[];
  floors?: LocationTreeNode[];
  zones?: LocationTreeNode[];
};

type FlatLocationNode = { id: string; type: string; code: string; name: string; path: string };

type DiagnosticServicePointRow = {
  id: string;
  branchId: string;
  locationNodeId: string;
  unitId?: string | null;
  code: string;
  name: string;
  type: ServicePointType;
  sortOrder: number;
  notes?: string | null;
  isActive: boolean;
  locationNode?: { id: string; type: string; code: string; name: string };
  unit?: UnitRow | null;
  _count?: { rooms: number; resources: number; equipment: number };
};

type RoomMapRow = { id: string; branchId: string; servicePointId: string; roomId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; room?: any };
type ResourceMapRow = { id: string; branchId: string; servicePointId: string; resourceId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; resource?: any };
type EquipmentMapRow = { id: string; branchId: string; servicePointId: string; equipmentId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; equipment?: any };

type CapabilityRow = {
  id: string;
  branchId: string;
  servicePointId: string;
  diagnosticItemId: string;
  modality?: Modality | null;
  defaultDurationMins?: number | null;
  isPrimary: boolean;
  isActive: boolean;
  servicePoint?: DiagnosticServicePointRow;
  diagnosticItem?: DiagnosticItemRow;
  _count?: { allowedRooms: number; allowedResources: number; allowedEquipment: number };
};

type AllowedRoomRow = { id: string; roomId: string; isActive: boolean; room?: any };
type AllowedResourceRow = { id: string; resourceId: string; isActive: boolean; resource?: any };
type AllowedEquipmentRow = { id: string; equipmentId: string; isActive: boolean; equipment?: any };
type PackVersionStatus = "DRAFT" | "ACTIVE" | "RETIRED";
type DiagnosticPackVersionRow = {
  id: string;
  packId: string;
  version: number;
  status: PackVersionStatus;
  notes?: string | null;
  payload: any;
  createdAt?: string;
};
type DiagnosticPackRow = {
  id: string;
  code: string;
  name: string;
  labType?: string | null;
  description?: string | null;
  isActive: boolean;
  versions?: DiagnosticPackVersionRow[];
};

/* =========================================================
   Constants (aligned with backend enums)
   ========================================================= */

const DIAG_KINDS: Array<{ value: DiagnosticKind; label: string }> = [
  { value: "LAB", label: "Lab" },
  { value: "IMAGING", label: "Imaging" },
  { value: "PROCEDURE", label: "Procedure" },
];

const RESULT_TYPES: Array<{ value: ResultDataType; label: string }> = [
  { value: "NUMERIC", label: "Numeric" },
  { value: "TEXT", label: "Text" },
  { value: "CHOICE", label: "Choice" },
  { value: "BOOLEAN", label: "Yes/No" },
];

const TEMPLATE_KINDS: Array<{ value: TemplateKind; label: string }> = [
  { value: "IMAGING_REPORT", label: "Imaging report" },
  { value: "LAB_REPORT", label: "Lab report" },
];

const SERVICE_POINT_TYPES: Array<{ value: ServicePointType; label: string }> = [
  { value: "LAB", label: "Lab" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "CARDIO_DIAGNOSTICS", label: "Cardio diagnostics" },
  { value: "NEURO_DIAGNOSTICS", label: "Neuro diagnostics" },
  { value: "PULMONARY_DIAGNOSTICS", label: "Pulmonary diagnostics" },
  { value: "ENDOSCOPY", label: "Endoscopy" },
  { value: "OTHER", label: "Other" },
];

const LAB_TYPE_OPTIONS: Array<{ value: LabType; label: string }> = [
  { value: "LAB_CORE", label: "Lab Core" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "CARDIO", label: "Cardio Diagnostics" },
  { value: "PULMONARY", label: "Pulmonary Diagnostics" },
  { value: "ENDOSCOPY", label: "Endoscopy Suite" },
  { value: "MICROBIOLOGY", label: "Microbiology Lab" },
  { value: "BIOCHEMISTRY", label: "Biochemistry Lab" },
  { value: "HEMATOLOGY", label: "Hematology Lab" },
  { value: "OTHER", label: "Other" },
];

const MODALITIES: Array<{ value: Modality; label: string }> = [
  { value: "XRAY", label: "X-Ray" },
  { value: "ULTRASOUND", label: "Ultrasound" },
  { value: "CT", label: "CT" },
  { value: "MRI", label: "MRI" },
  { value: "MAMMOGRAPHY", label: "Mammography" },
  { value: "FLUOROSCOPY", label: "Fluoroscopy" },
  { value: "ECG", label: "ECG" },
  { value: "ECHO", label: "ECHO" },
  { value: "TMT", label: "TMT" },
  { value: "HOLTER", label: "Holter" },
  { value: "PFT", label: "PFT" },
  { value: "EEG", label: "EEG" },
  { value: "EMG_NCV", label: "EMG/NCV" },
  { value: "LAB", label: "Lab" },
  { value: "SAMPLE_COLLECTION", label: "Sample collection" },
  { value: "PROCEDURE_ROOM", label: "Procedure room" },
  { value: "OTHER", label: "Other" },
];

/* =========================================================
   Utilities (aligned to backend regex + maxLen)
   ========================================================= */

const LS_KEY = "zc.superadmin.infrastructure.branchId";
const CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{0,63}$/; // backend: 1-64

function normalizeCode(v: any) {
  let code = String(v ?? "").trim().toUpperCase();
  code = code.replace(/[^A-Z0-9-]+/g, "-");
  code = code.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return code;
}

function isBlank(v: any) {
  return !String(v ?? "").trim();
}

function validateCode(v: any, label: string): string | null {
  const code = normalizeCode(v);
  if (!code) return `${label} code is required`;
  if (!CODE_REGEX.test(code)) return `${label} code must be 1-64 chars, letters/numbers/hyphen (e.g., TH01, OT-1, LAB1)`;
  return null;
}

function validateName(v: any, label: string): string | null {
  const name = String(v ?? "").trim();
  if (!name) return `${label} name is required`;
  if (name.length > 160) return `${label} name is too long`;
  return null;
}

function toInt(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function safeArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function normalizeEquipmentList(resp: unknown): EquipmentAssetRow[] {
  if (Array.isArray(resp)) return resp as EquipmentAssetRow[];
  const rows = (resp as any)?.rows;
  if (Array.isArray(rows)) return rows as EquipmentAssetRow[];
  return [];
}

function flattenLocationTree(nodes: LocationTreeNode[], parentPath = ""): FlatLocationNode[] {
  const out: FlatLocationNode[] = [];
  for (const n of safeArray<LocationTreeNode>(nodes)) {
    const path = parentPath ? `${parentPath} / ${n.name}` : n.name;
    out.push({ id: n.id, type: n.type, code: n.code, name: n.name, path });
    const kids = [...safeArray(n.buildings), ...safeArray(n.floors), ...safeArray(n.zones)];
    out.push(...flattenLocationTree(kids, path));
  }
  return out;
}

function normalizeLocationTree(res: any): LocationTreeNode[] {
  if (Array.isArray(res)) return res as LocationTreeNode[];
  return safeArray<LocationTreeNode>(res?.campuses);
}

function asRecord(v: any): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  return {};
}

/* =========================================================
   Page + Tabs
   ========================================================= */

type ActiveTab = "packs" | "servicePoints" | "catalog" | "panels" | "lab" | "templates" | "capabilities" | "goLive";
type TabProps = { branchId: string };

export default function DiagnosticsConfigPage() {
  const { toast } = useToast();

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState("");
  const [loadingBranches, setLoadingBranches] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("packs");

  // "Fix"-driven focus targets (from Go-Live checks)
  const [focusItemId, setFocusItemId] = React.useState<string | null>(null);
  const [focusPanelId, setFocusPanelId] = React.useState<string | null>(null);
  const [focusServicePointId, setFocusServicePointId] = React.useState<string | null>(null);

  const FLOW: Array<{ key: ActiveTab; title: string; help: string }> = React.useMemo(
    () => [
      { key: "packs", title: "Quick Start", help: "Apply a pack to bootstrap sections, tests, templates & routing defaults." },
      { key: "servicePoints", title: "Service Points", help: "Create labs/radiology units and map rooms/resources/equipment." },
      { key: "catalog", title: "Test Library", help: "Define sections, categories, specimens and diagnostic items." },
      { key: "panels", title: "Panels", help: "Build profiles/panels by composing multiple tests." },
      { key: "lab", title: "Result Schema", help: "For lab tests: define parameters and reference ranges." },
      { key: "templates", title: "Report Templates", help: "Create report templates for lab/imaging/procedure items." },
      { key: "capabilities", title: "Routing Rules", help: "Map items to service points (capabilities) with modality + constraints." },
      { key: "goLive", title: "Go‑Live Check", help: "Validate readiness and jump directly to fixes." },
    ],
    [],
  );

  const activeStepIndex = React.useMemo(() => FLOW.findIndex((s) => s.key === activeTab), [FLOW, activeTab]);

  function goTo(tab: ActiveTab, opts?: { itemId?: string | null; panelId?: string | null; servicePointId?: string | null }) {
    const norm = (v?: string | null) => {
      const s = (v ?? "").trim();
      return s ? s : null;
    };
    setActiveTab(tab);
    setFocusItemId(norm(opts?.itemId));
    setFocusPanelId(norm(opts?.panelId));
    setFocusServicePointId(norm(opts?.servicePointId));
  }

  React.useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setBranchId(saved);
    void loadBranches();
  }, []);

  React.useEffect(() => {
    if (branchId) localStorage.setItem(LS_KEY, branchId);
  }, [branchId]);

  async function loadBranches() {
    setLoadingBranches(true);
    try {
      const rows = await apiFetch<BranchRow[]>("/api/branches");
      setBranches(safeArray(rows));
      if (!branchId && rows?.[0]?.id) setBranchId(rows[0].id);
    } catch (e: any) {
      toast({ title: "Failed to load branches", description: e?.message || "Error", variant: "destructive" as any });
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }

  const branch = branches.find((b) => b.id === branchId) || null;

  return (
    <AppShell title="Diagnostics Configuration">
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardList className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Diagnostics Configuration</div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure catalog, panels, lab params, templates, service points, capabilities, and packs.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={loadBranches} disabled={loadingBranches}>
              <RefreshCw className={loadingBranches ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>
        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">Select a branch and follow a guided setup flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select a branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>
                      {b.city ? <span className="text-xs text-zc-muted"> - {b.city}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
              Recommended flow: <span className="font-semibold text-zc-text">Packs</span> → Service Points → Catalog → Panels → Lab Params → Templates → Capabilities → Go‑Live.
              {branch ? (
                <div className="mt-2 text-xs text-zc-muted">
                  Active branch: <span className="font-mono">{branch.code}</span> - {branch.name}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Guided setup flow */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Setup Flow</CardTitle>
                <CardDescription className="text-sm">{FLOW[Math.max(0, activeStepIndex)]?.help}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goTo(FLOW[Math.max(0, activeStepIndex - 1)]?.key ?? "packs")}
                  disabled={!branchId || activeStepIndex <= 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => goTo(FLOW[Math.min(FLOW.length - 1, activeStepIndex + 1)]?.key ?? "goLive")}
                  disabled={!branchId || activeStepIndex >= FLOW.length - 1}
                  className="gap-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-[260px,1fr]">
              <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-2">
                <div className="grid gap-1">
                  {FLOW.map((s, idx) => {
                    const isActive = s.key === activeTab;
                    const isDone = idx < activeStepIndex;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => goTo(s.key)}
                        disabled={!branchId}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition",
                          isActive
                            ? "border-indigo-200/80 bg-indigo-50/70 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-100"
                            : "border-transparent hover:border-zc-border hover:bg-zc-panel/20",
                          !branchId ? "opacity-60" : "",
                        )}
                      >
                        <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-lg border border-zc-border bg-zc-card text-xs font-semibold">
                          {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{s.title}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-zc-muted">{s.help}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0">
                {!branchId ? (
                  <Card>
                    <CardContent className="py-6 text-sm text-zc-muted">Select a branch to start.</CardContent>
                  </Card>
                ) : activeTab === "packs" ? (
                  <PacksTab branchId={branchId} />
                ) : activeTab === "servicePoints" ? (
                  <ServicePointsTab branchId={branchId} initialServicePointId={focusServicePointId} />
                ) : activeTab === "catalog" ? (
                  <CatalogTab branchId={branchId} />
                ) : activeTab === "panels" ? (
                  <PanelsTab branchId={branchId} initialPanelId={focusPanelId} />
                ) : activeTab === "lab" ? (
                  <LabParamsTab branchId={branchId} initialTestId={focusItemId} />
                ) : activeTab === "templates" ? (
                  <TemplatesTab branchId={branchId} initialItemId={focusItemId} />
                ) : activeTab === "capabilities" ? (
                  <CapabilitiesTab
                    branchId={branchId}
                    initialDiagnosticItemId={focusItemId}
                    initialServicePointId={focusServicePointId}
                    autoOpenCreate={Boolean(focusItemId || focusServicePointId)}
                  />
                ) : (
                  <GoLiveTab
                    branchId={branchId}
                    onFix={(fix) => {
                      if (fix.kind === "labParams") goTo("lab", { itemId: fix.itemId });
                      else if (fix.kind === "templates") goTo("templates", { itemId: fix.itemId });
                      else if (fix.kind === "capability") goTo("capabilities", { itemId: fix.itemId, servicePointId: fix.servicePointId ?? null });
                      else if (fix.kind === "panel") goTo("panels", { panelId: fix.panelId });
                      else if (fix.kind === "servicePoint") goTo("servicePoints", { servicePointId: fix.servicePointId });
                      else if (fix.kind === "catalog") goTo("catalog");
                      else goTo("servicePoints");
                    }}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}

/* =========================================================
   Small UI helpers
   ========================================================= */

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </div>
        {hint ? <div className="text-xs text-zc-muted">{hint}</div> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-rose-700 dark:text-rose-200">{error}</div> : null}
    </div>
  );
}


type BadgeTone = "slate" | "sky" | "emerald" | "violet" | "amber" | "rose";

function badgeToneClass(tone: BadgeTone) {
  switch (tone) {
    case "sky":
      return "border-sky-200/70 bg-sky-50/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
    case "emerald":
      return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
    case "violet":
      return "border-violet-200/70 bg-violet-50/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200";
    case "amber":
      return "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200";
    case "rose":
      return "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-text";
  }
}

function ToneBadge({
  tone,
  className,
  children,
}: {
  tone: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn("border", badgeToneClass(tone), className)}>
      {children}
    </Badge>
  );
}

function toneForDiagnosticKind(kind: DiagnosticKind): BadgeTone {
  if (kind === "LAB") return "emerald";
  if (kind === "IMAGING") return "sky";
  return "violet";
}

function toneForResultDataType(dt: ResultDataType): BadgeTone {
  if (dt === "NUMERIC") return "sky";
  if (dt === "CHOICE") return "violet";
  if (dt === "BOOLEAN") return "amber";
  return "slate";
}

function toneForServicePointType(t: ServicePointType): BadgeTone {
  if (t === "LAB") return "emerald";
  if (t === "RADIOLOGY") return "sky";
  if (t === "ENDOSCOPY") return "amber";
  return "violet";
}

function modalClassName(extra?: string) {
  return cn("rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card shadow-2xl shadow-indigo-500/10", extra);
}

function drawerClassName(extra?: string) {
  return cn(
    "h-screen w-[95vw] max-w-[980px]",
    "!left-auto !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0",
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
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  // onClose is kept for API compatibility with existing call sites.
  // DialogContent already renders its own close button; this header matches OT/Branch modal styling.
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

/* =========================================================
   TAB 8: Go‑Live Check (Readiness)
   ========================================================= */

type GoLiveFix =
  | { kind: "catalog" }
  | { kind: "servicePoint"; servicePointId: string }
  | { kind: "panel"; panelId: string }
  | { kind: "labParams"; itemId: string }
  | { kind: "templates"; itemId: string }
  | { kind: "capability"; itemId: string; servicePointId?: string | null };

function GoLiveTab({
  branchId,
  onFix,
}: {
  branchId: string;
  onFix: (fix: GoLiveFix) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [servicePoints, setServicePoints] = React.useState<DiagnosticServicePointRow[]>([]);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [caps, setCaps] = React.useState<CapabilityRow[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [sp, it, cp] = await Promise.all([
        apiFetch<DiagnosticServicePointRow[]>(`/api/infrastructure/diagnostics/service-points?branchId=${encodeURIComponent(branchId)}`),
        apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`),
        apiFetch<CapabilityRow[]>(`/api/infrastructure/diagnostics/capabilities?branchId=${encodeURIComponent(branchId)}`),
      ]);
      setServicePoints(safeArray(sp).filter((s) => s.isActive));
      setItems(safeArray(it).filter((i) => i.isActive));
      setCaps(safeArray(cp).filter((c) => c.isActive));
    } catch (e: any) {
      setErr(e?.message || "Failed to load readiness data");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const capCountByItem = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of caps) m.set(c.diagnosticItemId, (m.get(c.diagnosticItemId) ?? 0) + 1);
    return m;
  }, [caps]);

  const capCountByServicePoint = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of caps) m.set(c.servicePointId, (m.get(c.servicePointId) ?? 0) + 1);
    return m;
  }, [caps]);

  type Issue = {
    severity: "blocker" | "warn";
    title: string;
    detail: string;
    fix?: GoLiveFix;
  };

  const issues: Issue[] = React.useMemo(() => {
    const out: Issue[] = [];

    if (servicePoints.length === 0) {
      out.push({
        severity: "blocker",
        title: "No service points",
        detail: "Create at least one service point (Lab/Radiology/etc.) to route diagnostic items.",
        fix: { kind: "servicePoint", servicePointId: "" },
      });
    }

    const tests = items.filter((i) => !i.isPanel);
    if (tests.length === 0) {
      out.push({
        severity: "blocker",
        title: "No diagnostic items",
        detail: "Add at least one diagnostic item (lab test, imaging or procedure) in the test library.",
        fix: { kind: "catalog" },
      });
    }

    // Panels must have children
    for (const p of items.filter((i) => i.isPanel)) {
      const n = p._count?.panelChildren ?? 0;
      if (n === 0) {
        out.push({
          severity: "blocker",
          title: `Panel has no tests: ${p.name}`,
          detail: "Add at least one child test to the panel.",
          fix: { kind: "panel", panelId: p.id },
        });
      }
    }

    // Lab tests must have parameters
    for (const t of tests.filter((i) => i.kind === "LAB")) {
      const pcount = t._count?.parameters ?? 0;
      if (pcount === 0) {
        out.push({
          severity: "blocker",
          title: `Lab test missing parameters: ${t.name}`,
          detail: "Define at least one parameter (result schema) so results can be recorded.",
          fix: { kind: "labParams", itemId: t.id },
        });
      }
      const tmpl = t._count?.templates ?? 0;
      if (tmpl === 0) {
        out.push({
          severity: "warn",
          title: `Lab test missing template: ${t.name}`,
          detail: "Recommended: add a report template for consistent printing.",
          fix: { kind: "templates", itemId: t.id },
        });
      }
    }

    // Imaging/procedure should have templates
    for (const t of tests.filter((i) => i.kind !== "LAB")) {
      const tmpl = t._count?.templates ?? 0;
      if (tmpl === 0) {
        out.push({
          severity: "blocker",
          title: `Missing template: ${t.name}`,
          detail: "Add a report template for this diagnostic item.",
          fix: { kind: "templates", itemId: t.id },
        });
      }
    }

    // Every non-panel item should be routable
    for (const t of tests) {
      const ccount = capCountByItem.get(t.id) ?? 0;
      if (ccount === 0) {
        out.push({
          severity: "blocker",
          title: `No routing capability: ${t.name}`,
          detail: "Create a capability to route this item to a service point.",
          fix: { kind: "capability", itemId: t.id },
        });
      }
    }

    // Service points with zero capabilities (warning)
    for (const sp of servicePoints) {
      const n = capCountByServicePoint.get(sp.id) ?? 0;
      if (n === 0) {
        out.push({
          severity: "warn",
          title: `Service point has no routing rules: ${sp.name}`,
          detail: "Recommended: add at least one capability mapping so this service point can be used for orders.",
          fix: { kind: "capability", itemId: "", servicePointId: sp.id },
        });
      }
    }

    return out;
  }, [servicePoints, items, capCountByItem, capCountByServicePoint]);

  const blockers = issues.filter((i) => i.severity === "blocker").length;
  const warns = issues.filter((i) => i.severity === "warn").length;
  const ready = blockers === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Go‑Live Check</CardTitle>
        <CardDescription>Fast readiness validation with one-click navigation to fixes.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className={cn(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
          ready
            ? "border-emerald-200/70 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100"
            : "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100",
        )}>
          <div className="flex items-center gap-3">
            {ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <div>
              <div className="text-sm font-semibold">{ready ? "Ready to go live" : "Needs attention"}</div>
              <div className="text-xs opacity-80">{blockers} blocker(s), {warns} warning(s)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { void load(); toast({ title: "Re-running checks" }); }} disabled={loading} className="gap-2">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Re-run
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-xs text-zc-muted">Active service points</div>
            <div className="mt-1 text-2xl font-semibold">{servicePoints.length}</div>
          </div>
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-xs text-zc-muted">Active items (incl panels)</div>
            <div className="mt-1 text-2xl font-semibold">{items.length}</div>
          </div>
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-xs text-zc-muted">Active capabilities</div>
            <div className="mt-1 text-2xl font-semibold">{caps.length}</div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-2">
          {issues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No issues detected.</div>
          ) : (
            issues.map((i, idx) => (
              <div key={`${i.title}-${idx}`} className={cn(
                "flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3",
                i.severity === "blocker"
                  ? "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20"
                  : "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
              )}>
                <div className="min-w-0">
                  <div className={cn(
                    "text-sm font-semibold",
                    i.severity === "blocker" ? "text-rose-800 dark:text-rose-200" : "text-amber-800 dark:text-amber-200",
                  )}>
                    {i.title}
                  </div>
                  <div className="mt-1 text-xs text-zc-muted">{i.detail}</div>
                </div>
                {i.fix ? (
                  <Button
                    size="sm"
                    variant={i.severity === "blocker" ? "primary" : "outline"}
                    onClick={() => {
                      const fix = i.fix;
                      if (!fix) return;
                      if (fix.kind === "servicePoint" && (fix as any).servicePointId === "") {
                        onFix({ kind: "servicePoint", servicePointId: "" });
                        return;
                      }
                      onFix(fix);
                    }}
                    className="gap-2"
                  >
                    Fix
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   TAB 1: Catalog (Sections, Categories, Specimens, Items)
   ========================================================= */

function CatalogTab({ branchId }: TabProps) {
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
                    Category: <span className="font-mono">{it.category?.code ?? "—"}</span> ·
                    Routine TAT: <span className="font-mono">{it.tatMinsRoutine ?? "—"}</span> mins ·
                    Stat TAT: <span className="font-mono">{it.tatMinsStat ?? "—"}</span> mins
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
  const [sortOrder, setSortOrder] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setSortOrder(editing?.sortOrder != null ? String(editing.sortOrder) : "");
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
            sortOrder: toInt(sortOrder) ?? undefined,
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
            sortOrder: toInt(sortOrder) ?? undefined,
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
          <div className="grid gap-3 md:grid-cols-3">
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

/* =========================================================
   TAB 2: Panels
   ========================================================= */

function PanelsTab({
  branchId,
  initialPanelId,
}: {
  branchId: string;
  initialPanelId?: string | null;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [panels, setPanels] = React.useState<DiagnosticItemRow[]>([]);
  const [allItems, setAllItems] = React.useState<DiagnosticItemRow[]>([]);
  const [panelId, setPanelId] = React.useState("");
  const [panelItems, setPanelItems] = React.useState<PanelItemRow[]>([]);
  const [addItemId, setAddItemId] = React.useState("none");
  const [saving, setSaving] = React.useState(false);

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
    if (initialPanelId) setPanelId(initialPanelId);
  }, [initialPanelId]);

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Panels</CardTitle>
        <CardDescription>Compose panel items from the catalog.</CardDescription>
      </CardHeader>
      <CardContent>
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
  );
}

/* =========================================================
   TAB 3: Lab Params
   ========================================================= */

function LabParamsTab({
  branchId,
  initialTestId,
}: {
  branchId: string;
  initialTestId?: string | null;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [tests, setTests] = React.useState<DiagnosticItemRow[]>([]);
  const [testId, setTestId] = React.useState("");
  const [parameters, setParameters] = React.useState<ParameterRow[]>([]);
  const [paramDialogOpen, setParamDialogOpen] = React.useState(false);
  const [rangeDialogOpen, setRangeDialogOpen] = React.useState(false);
  const [editingParam, setEditingParam] = React.useState<ParameterRow | null>(null);
  const [editingRange, setEditingRange] = React.useState<RangeRow | null>(null);
  const [rangeParamId, setRangeParamId] = React.useState("");

  async function loadTests() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}&kind=LAB`);
      setTests(safeArray(rows).filter((r) => !r.isPanel));
      if (!testId && rows?.[0]?.id) setTestId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  }

  async function loadParameters(id: string) {
    if (!id) {
      setParameters([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<ParameterRow[]>(`/api/infrastructure/diagnostics/items/${encodeURIComponent(id)}/parameters?branchId=${encodeURIComponent(branchId)}`);
      setParameters(safeArray(rows));
    } catch (e: any) {
      setErr(e?.message || "Failed to load parameters");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (initialTestId) setTestId(initialTestId);
  }, [initialTestId]);

  React.useEffect(() => {
    void loadParameters(testId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lab Parameters</CardTitle>
        <CardDescription>Define parameters and reference ranges for lab tests.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}
        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Lab test">
              <Select value={testId} onValueChange={setTestId} disabled={loading}>
                <SelectTrigger className="h-10 w-[320px]"><SelectValue placeholder="Select test" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={() => { setEditingParam(null); setParamDialogOpen(true); }} disabled={!testId}>
              <Plus className="mr-2 h-4 w-4" /> Parameter
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          {parameters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No parameters configured.</div>
          ) : (
            parameters.map((p) => (
              <div key={p.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneBadge tone="violet" className="font-mono">{p.code}</ToneBadge>
                      <div className="text-sm font-semibold text-zc-text">{p.name}</div>
                      <ToneBadge tone={toneForResultDataType(p.dataType)}>{p.dataType}</ToneBadge>
                      {!p.isActive ? <ToneBadge tone="rose">INACTIVE</ToneBadge> : null}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Unit: <span className="font-mono">{p.unit || "-"}</span> | Precision: <span className="font-mono">{p.precision ?? "-"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingParam(p); setParamDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setRangeParamId(p.id); setEditingRange(null); setRangeDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Range
                    </Button>
                  </div>
                </div>
                {p.ranges?.length ? (
                  <div className="mt-3 grid gap-2">
                    {p.ranges.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zc-border bg-white/50 p-2 text-xs">
                        <div className="text-zc-muted">
                          Sex: <span className="font-mono">{r.sex || "-"}</span> | Age: <span className="font-mono">{r.ageMinDays ?? "-"}</span> - <span className="font-mono">{r.ageMaxDays ?? "-"}</span> days
                        </div>
                        <div className="text-zc-muted">
                          Low: <span className="font-mono">{r.low ?? "-"}</span> | High: <span className="font-mono">{r.high ?? "-"}</span> | Text: <span className="font-mono">{r.textRange || "-"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setRangeParamId(p.id); setEditingRange(r); setRangeDialogOpen(true); }}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/infrastructure/diagnostics/ranges/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                                toast({ title: "Range removed" });
                                await loadParameters(testId);
                              } catch (e: any) {
                                toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        <ParameterDialog
          open={paramDialogOpen}
          onOpenChange={setParamDialogOpen}
          branchId={branchId}
          testId={testId}
          editing={editingParam}
          onSaved={() => loadParameters(testId)}
        />
        <RangeDialog
          open={rangeDialogOpen}
          onOpenChange={setRangeDialogOpen}
          branchId={branchId}
          parameterId={rangeParamId}
          editing={editingRange}
          onSaved={() => loadParameters(testId)}
        />
      </CardContent>
    </Card>
  );
}

function ParameterDialog({
  open,
  onOpenChange,
  branchId,
  testId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  testId: string;
  editing: ParameterRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [dataType, setDataType] = React.useState<ResultDataType>("NUMERIC");
  const [unit, setUnit] = React.useState("");
  const [precision, setPrecision] = React.useState("");
  const [allowedText, setAllowedText] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setDataType(editing?.dataType ?? "NUMERIC");
    setUnit(editing?.unit ?? "");
    setPrecision(editing?.precision != null ? String(editing.precision) : "");
    setAllowedText(editing?.allowedText ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Parameter");
    const nameErr = validateName(name, "Parameter");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/parameters/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            dataType,
            unit: unit.trim() || null,
            precision: toInt(precision) ?? null,
            allowedText: allowedText.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(testId)}/parameters?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(code),
            name: name.trim(),
            dataType,
            unit: unit.trim() || undefined,
            precision: toInt(precision) ?? undefined,
            allowedText: allowedText.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Parameter updated" : "Parameter created" });
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
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Parameter" : "Add Parameter"}
          description="Define result data type and validation details."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HGB" />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hemoglobin" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Data type" required>
              <Select value={dataType} onValueChange={(v) => setDataType(v as ResultDataType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unit">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g/dL" />
            </Field>
            <Field label="Precision">
              <Input value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <Field label="Allowed text (for choice)">
            <Input value={allowedText} onChange={(e) => setAllowedText(e.target.value)} placeholder="Low,Normal,High" />
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
          <Button onClick={save} disabled={saving || !testId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RangeDialog({
  open,
  onOpenChange,
  branchId,
  parameterId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  parameterId: string;
  editing: RangeRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [sex, setSex] = React.useState("");
  const [ageMinDays, setAgeMinDays] = React.useState("");
  const [ageMaxDays, setAgeMaxDays] = React.useState("");
  const [low, setLow] = React.useState("");
  const [high, setHigh] = React.useState("");
  const [textRange, setTextRange] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSex(editing?.sex ?? "");
    setAgeMinDays(editing?.ageMinDays != null ? String(editing.ageMinDays) : "");
    setAgeMaxDays(editing?.ageMaxDays != null ? String(editing.ageMaxDays) : "");
    setLow(editing?.low != null ? String(editing.low) : "");
    setHigh(editing?.high != null ? String(editing.high) : "");
    setTextRange(editing?.textRange ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    if (!parameterId) return;
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/ranges/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            sex: sex.trim() || null,
            ageMinDays: toInt(ageMinDays),
            ageMaxDays: toInt(ageMaxDays),
            low: toFloat(low),
            high: toFloat(high),
            textRange: textRange.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/parameters/${encodeURIComponent(parameterId)}/ranges?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            sex: sex.trim() || undefined,
            ageMinDays: toInt(ageMinDays) ?? undefined,
            ageMaxDays: toInt(ageMaxDays) ?? undefined,
            low: toFloat(low) ?? undefined,
            high: toFloat(high) ?? undefined,
            textRange: textRange.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Range updated" : "Range added" });
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
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Range" : "Add Range"}
          description="Reference ranges for numeric or text results."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sex">
              <Input value={sex} onChange={(e) => setSex(e.target.value)} placeholder="M/F/Other" />
            </Field>
            <Field label="Text range">
              <Input value={textRange} onChange={(e) => setTextRange(e.target.value)} placeholder="Normal" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Age min (days)">
              <Input value={ageMinDays} onChange={(e) => setAgeMinDays(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Age max (days)">
              <Input value={ageMaxDays} onChange={(e) => setAgeMaxDays(e.target.value)} placeholder="365" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Low">
              <Input value={low} onChange={(e) => setLow(e.target.value)} placeholder="0" />
            </Field>
            <Field label="High">
              <Input value={high} onChange={(e) => setHigh(e.target.value)} placeholder="10" />
            </Field>
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
          <Button onClick={save} disabled={saving || !parameterId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   TAB 4: Templates
   ========================================================= */

function TemplatesTab({
  branchId,
  initialItemId,
}: {
  branchId: string;
  initialItemId?: string | null;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [itemId, setItemId] = React.useState("");
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<TemplateRow | null>(null);

  async function loadItems() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`);
      setItems(safeArray(rows));
      if (!itemId && rows?.[0]?.id) setItemId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates(id: string) {
    if (!id) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<TemplateRow[]>(`/api/infrastructure/diagnostics/items/${encodeURIComponent(id)}/templates?branchId=${encodeURIComponent(branchId)}`);
      setTemplates(safeArray(rows));
    } catch (e: any) {
      setErr(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (initialItemId) setItemId(initialItemId);
  }, [initialItemId]);

  React.useEffect(() => {
    void loadTemplates(itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Templates</CardTitle>
        <CardDescription>Report templates for lab or imaging items.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}
        <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Item">
              <Select value={itemId} onValueChange={setItemId} disabled={loading}>
                <SelectTrigger className="h-10 w-[320px]"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={() => { setEditingTemplate(null); setDialogOpen(true); }} disabled={!itemId}>
              <Plus className="mr-2 h-4 w-4" /> Template
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No templates available.</div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zc-text">{t.name}</div>
                    <div className="text-xs text-zc-muted">{t.kind}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(t); setDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(t.id)}`, { method: "DELETE" });
                          toast({ title: "Template deactivated" });
                          await loadTemplates(itemId);
                        } catch (e: any) {
                          toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-zc-muted whitespace-pre-wrap">{t.body}</div>
              </div>
            ))
          )}
        </div>
        <TemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          branchId={branchId}
          itemId={itemId}
          editing={editingTemplate}
          onSaved={() => loadTemplates(itemId)}
        />
      </CardContent>
    </Card>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  branchId,
  itemId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  itemId: string;
  editing: TemplateRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<TemplateKind>("IMAGING_REPORT");
  const [body, setBody] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "IMAGING_REPORT");
    setBody(editing?.body ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const nameErr = validateName(name, "Template");
    if (nameErr) {
      setErr(nameErr);
      return;
    }
    if (!body.trim()) {
      setErr("Template body is required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/templates/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            name: name.trim(),
            kind,
            body: body.trim(),
            isActive,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/items/${encodeURIComponent(itemId)}/templates?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            kind,
            body: body.trim(),
          }),
        });
      }
      toast({ title: editing ? "Template updated" : "Template created" });
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
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Template" : "Create Template"}
          description="Plain text report template (MVP)."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Imaging report" />
            </Field>
            <Field label="Kind" required>
              <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Body" required>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Template body..." />
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
          <Button onClick={save} disabled={saving || !itemId}>
            {editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   TAB 5: Service Points
   ========================================================= */

function ServicePointsTab({
  branchId,
  initialServicePointId,
}: {
  branchId: string;
  initialServicePointId?: string | null;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [servicePoints, setServicePoints] = React.useState<DiagnosticServicePointRow[]>([]);
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [locations, setLocations] = React.useState<FlatLocationNode[]>([]);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<ServicePointType | "all">("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DiagnosticServicePointRow | null>(null);
  const [roomsDialog, setRoomsDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [resourcesDialog, setResourcesDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [equipmentDialog, setEquipmentDialog] = React.useState<DiagnosticServicePointRow | null>(null);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHighlightId(initialServicePointId ?? null);
  }, [initialServicePointId]);

  async function loadLists() {
    setLoading(true);
    setErr(null);
    try {
      const locTree = await apiFetch<any>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`);
      setLocations(flattenLocationTree(normalizeLocationTree(locTree)));
      const unitRows = await apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(branchId)}`);
      setUnits(safeArray(unitRows));

      const qs = new URLSearchParams();
      qs.set("branchId", branchId);
      if (typeFilter !== "all") qs.set("type", typeFilter);
      const rows = await apiFetch<DiagnosticServicePointRow[]>(`/api/infrastructure/diagnostics/service-points?${qs.toString()}`);
      let next = safeArray(rows);
      if (!includeInactive) next = next.filter((r) => r.isActive);
      setServicePoints(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to load service points");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive, typeFilter]);

  React.useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`sp-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, servicePoints.length]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Service Points</CardTitle>
        <CardDescription>Define diagnostic service points and map rooms/resources/equipment.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Service point
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {showFilters ? (
          <div className="mt-3 grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <Field label="Type filter">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="h-10 w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
              <span className="text-sm text-zc-muted">Include Inactive</span>
            </div>
          </div>
        ) : null}

        <Separator className="my-4" />
        <div className="grid gap-3">
          {servicePoints.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No service points yet.</div>
          ) : (
            servicePoints.map((sp) => (
              <div
                key={sp.id}
                id={`sp-${sp.id}`}
                className={cn(
                  "rounded-xl border bg-zc-panel/10 p-3",
                  highlightId === sp.id
                    ? "border-indigo-300/70 bg-indigo-50/40 shadow-sm shadow-indigo-500/10 dark:border-indigo-900/60 dark:bg-indigo-950/15"
                    : "border-zc-border",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneBadge tone="violet" className="font-mono">{sp.code}</ToneBadge>
                      <div className="text-sm font-semibold text-zc-text">{sp.name}</div>
                      <ToneBadge tone={toneForServicePointType(sp.type)}>{sp.type}</ToneBadge>
                      {!sp.isActive ? <ToneBadge tone="rose">INACTIVE</ToneBadge> : null}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Location: <span className="font-mono">{sp.locationNode?.name || sp.locationNodeId}</span>
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Rooms: <span className="font-mono">{sp._count?.rooms ?? 0}</span> | Resources: <span className="font-mono">{sp._count?.resources ?? 0}</span> | Equipment: <span className="font-mono">{sp._count?.equipment ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(sp); setDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRoomsDialog(sp)}>Rooms</Button>
                    <Button variant="outline" size="sm" onClick={() => setResourcesDialog(sp)}>Resources</Button>
                    <Button variant="outline" size="sm" onClick={() => setEquipmentDialog(sp)}>Equipment</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                          toast({ title: "Service point deactivated" });
                          await loadLists();
                        } catch (e: any) {
                          toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <ServicePointDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          branchId={branchId}
          editing={editing}
          locations={locations}
          units={units}
          onSaved={loadLists}
        />
        <ServicePointRoomsDialog
          open={!!roomsDialog}
          onOpenChange={(v) => !v && setRoomsDialog(null)}
          branchId={branchId}
          servicePoint={roomsDialog}
        />
        <ServicePointResourcesDialog
          open={!!resourcesDialog}
          onOpenChange={(v) => !v && setResourcesDialog(null)}
          branchId={branchId}
          servicePoint={resourcesDialog}
        />
        <ServicePointEquipmentDialog
          open={!!equipmentDialog}
          onOpenChange={(v) => !v && setEquipmentDialog(null)}
          branchId={branchId}
          servicePoint={equipmentDialog}
        />
      </CardContent>
    </Card>
  );
}

function ServicePointDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  locations,
  units,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: DiagnosticServicePointRow | null;
  locations: FlatLocationNode[];
  units: UnitRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ServicePointType>("OTHER");
  const [locationNodeId, setLocationNodeId] = React.useState("");
  const [unitId, setUnitId] = React.useState("none");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setType(editing?.type ?? "OTHER");
    setLocationNodeId(editing?.locationNodeId ?? "");
    setUnitId(editing?.unitId ?? "none");
    setSortOrder(editing?.sortOrder != null ? String(editing.sortOrder) : "");
    setNotes(editing?.notes ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Service point");
    const nameErr = validateName(name, "Service point");
    if (!locationNodeId) return setErr("Location is required");
    if (codeErr || nameErr) {
      setErr(codeErr || nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type,
            locationNodeId,
            unitId: unitId === "none" ? null : unitId,
            sortOrder: toInt(sortOrder) ?? undefined,
            notes: notes.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/service-points", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: normalizeCode(code),
            name: name.trim(),
            type,
            locationNodeId,
            unitId: unitId === "none" ? undefined : unitId,
            sortOrder: toInt(sortOrder) ?? undefined,
            notes: notes.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Service point updated" : "Service point created" });
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
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Service Point" : "Create Service Point"}
          description="Service points are diagnostic units bound to a location."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAB" />
            </Field>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Central Lab" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as ServicePointType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location" required>
              <Select value={locationNodeId} onValueChange={setLocationNodeId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Unit (optional)">
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="No unit" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">No unit</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
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

function ServicePointRoomsDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<RoomRow[]>([]);
  const [rows, setRows] = React.useState<RoomMapRow[]>([]);
  const [roomId, setRoomId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const rooms = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(safeArray(rooms));
      const mapped = await apiFetch<RoomMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/rooms?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || roomId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/rooms?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({
          roomId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast({ title: "Room added" });
      setRoomId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Rooms"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Room">
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select room</SelectItem>
                  {available.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || roomId === "none"}>Add room</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No rooms mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.room?.name || r.roomId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/rooms/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ServicePointResourcesDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<UnitResourceRow[]>([]);
  const [rows, setRows] = React.useState<ResourceMapRow[]>([]);
  const [resourceId, setResourceId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const resources = await apiFetch<UnitResourceRow[]>(`/api/infrastructure/resources?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(safeArray(resources));
      const mapped = await apiFetch<ResourceMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/resources?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || resourceId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/resources?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({
          resourceId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast({ title: "Resource added" });
      setResourceId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Resources"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Resource">
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select resource</SelectItem>
                  {available.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || resourceId === "none"}>Add resource</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No resources mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.resource?.name || r.resourceId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/resources/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ServicePointEquipmentDialog({
  open,
  onOpenChange,
  branchId,
  servicePoint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  servicePoint: DiagnosticServicePointRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<EquipmentAssetRow[]>([]);
  const [rows, setRows] = React.useState<EquipmentMapRow[]>([]);
  const [equipmentId, setEquipmentId] = React.useState("none");
  const [modality, setModality] = React.useState<Modality>("OTHER");
  const [sortOrder, setSortOrder] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadAll(sp: DiagnosticServicePointRow) {
    setLoading(true);
    try {
      const equipment = await apiFetch(`/api/infrastructure/equipment?branchId=${encodeURIComponent(branchId)}`);
      setAvailable(normalizeEquipmentList(equipment));
      const mapped = await apiFetch<EquipmentMapRow[]>(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(sp.id)}/equipment?branchId=${encodeURIComponent(branchId)}`);
      setRows(safeArray(mapped));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && servicePoint) void loadAll(servicePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicePoint?.id]);

  async function add() {
    if (!servicePoint || equipmentId === "none") return;
    try {
      const created = await apiFetch<EquipmentMapRow>(
        `/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/equipment?branchId=${encodeURIComponent(branchId)}`,
        {
        method: "POST",
        body: JSON.stringify({
          equipmentId,
          modality,
          sortOrder: toInt(sortOrder) ?? undefined,
          notes: notes.trim() || undefined,
        }),
        },
      );
      toast({ title: "Equipment added" });
      if (created?.id) {
        setRows((prev) => {
          const next = prev.filter((r) => r.id !== created.id);
          return [created, ...next];
        });
      }
      setEquipmentId("none");
      setSortOrder("");
      setNotes("");
      await loadAll(servicePoint);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Map Equipment"
          description={servicePoint?.name || "Service point"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Equipment">
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">Select equipment</SelectItem>
                  {available.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Button onClick={add} disabled={loading || equipmentId === "none"}>Add equipment</Button>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No equipment mapped.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>
                    {r.equipment?.name || r.equipmentId} <span className="text-xs text-zc-muted">({r.modality || "OTHER"})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!servicePoint) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/service-points/${encodeURIComponent(servicePoint.id)}/equipment/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(servicePoint);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   TAB 6: Capabilities
   ========================================================= */

function CapabilitiesTab({
  branchId,
  initialDiagnosticItemId,
  initialServicePointId,
  autoOpenCreate,
}: {
  branchId: string;
  initialDiagnosticItemId?: string | null;
  initialServicePointId?: string | null;
  autoOpenCreate?: boolean;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [caps, setCaps] = React.useState<CapabilityRow[]>([]);
  const [servicePoints, setServicePoints] = React.useState<DiagnosticServicePointRow[]>([]);
  const [items, setItems] = React.useState<DiagnosticItemRow[]>([]);
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CapabilityRow | null>(null);
  const [allowedRooms, setAllowedRooms] = React.useState<CapabilityRow | null>(null);
  const [allowedResources, setAllowedResources] = React.useState<CapabilityRow | null>(null);
  const [allowedEquipment, setAllowedEquipment] = React.useState<CapabilityRow | null>(null);
  const autoOpenedRef = React.useRef<string>("");

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const sp = await apiFetch<DiagnosticServicePointRow[]>(`/api/infrastructure/diagnostics/service-points?branchId=${encodeURIComponent(branchId)}`);
      setServicePoints(safeArray(sp));
      const it = await apiFetch<DiagnosticItemRow[]>(`/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`);
      setItems(safeArray(it));

      const qs = new URLSearchParams();
      qs.set("branchId", branchId);
      const rows = await apiFetch<CapabilityRow[]>(`/api/infrastructure/diagnostics/capabilities?${qs.toString()}`);
      let next = safeArray(rows);
      if (!includeInactive) next = next.filter((c) => c.isActive);
      setCaps(next);
    } catch (e: any) {
      setErr(e?.message || "Failed to load capabilities");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!autoOpenCreate) return;
    const key = `${branchId}|${initialServicePointId ?? ""}|${initialDiagnosticItemId ?? ""}`;
    if (!initialServicePointId && !initialDiagnosticItemId) return;
    if (autoOpenedRef.current === key) return;
    if (!servicePoints.length || !items.length) return;
    setEditing(null);
    setDialogOpen(true);
    autoOpenedRef.current = key;
  }, [autoOpenCreate, branchId, initialServicePointId, initialDiagnosticItemId, servicePoints.length, items.length]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Capabilities</CardTitle>
        <CardDescription>Map diagnostic items to service points with modalities and constraints.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Capability
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {showFilters ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
            <span className="text-sm text-zc-muted">Include Inactive</span>
          </div>
        ) : null}

        <Separator className="my-4" />
        <div className="grid gap-3">
          {caps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No capabilities configured.</div>
          ) : (
            caps.map((c) => {
              const matchesItem = initialDiagnosticItemId ? c.diagnosticItemId === initialDiagnosticItemId : false;
              const matchesServicePoint = initialServicePointId ? c.servicePointId === initialServicePointId : false;
              const highlight = matchesItem || matchesServicePoint;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-xl border bg-zc-panel/10 p-3",
                    highlight
                      ? "border-indigo-300/70 bg-indigo-50/40 shadow-sm shadow-indigo-500/10 dark:border-indigo-900/60 dark:bg-indigo-950/15"
                      : "border-zc-border",
                  )}
                >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zc-text">
                      {c.diagnosticItem?.name || "Item"} @ {c.servicePoint?.name || "Service point"}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Modality: <span className="font-mono">{c.modality || "-"}</span> | Duration: <span className="font-mono">{c.defaultDurationMins ?? "-"}</span> mins
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">
                      Rooms: <span className="font-mono">{c._count?.allowedRooms ?? 0}</span> | Resources: <span className="font-mono">{c._count?.allowedResources ?? 0}</span> | Equipment: <span className="font-mono">{c._count?.allowedEquipment ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAllowedRooms(c)}>Rooms</Button>
                    <Button variant="outline" size="sm" onClick={() => setAllowedResources(c)}>Resources</Button>
                    <Button variant="outline" size="sm" onClick={() => setAllowedEquipment(c)}>Equipment</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(c.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                          toast({ title: "Capability deactivated" });
                          await loadAll();
                        } catch (e: any) {
                          toast({ title: "Deactivate failed", description: e?.message || "Error", variant: "destructive" as any });
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
        <CapabilityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          branchId={branchId}
          editing={editing}
          prefillServicePointId={initialServicePointId}
          prefillDiagnosticItemId={initialDiagnosticItemId}
          servicePoints={servicePoints}
          items={items}
          onSaved={loadAll}
        />
        <CapabilityRoomsDialog
          open={!!allowedRooms}
          onOpenChange={(v) => !v && setAllowedRooms(null)}
          branchId={branchId}
          capability={allowedRooms}
        />
        <CapabilityResourcesDialog
          open={!!allowedResources}
          onOpenChange={(v) => !v && setAllowedResources(null)}
          branchId={branchId}
          capability={allowedResources}
        />
        <CapabilityEquipmentDialog
          open={!!allowedEquipment}
          onOpenChange={(v) => !v && setAllowedEquipment(null)}
          branchId={branchId}
          capability={allowedEquipment}
        />
      </CardContent>
    </Card>
  );
}

function CapabilityDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  prefillServicePointId,
  prefillDiagnosticItemId,
  servicePoints,
  items,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: CapabilityRow | null;
  prefillServicePointId?: string | null;
  prefillDiagnosticItemId?: string | null;
  servicePoints: DiagnosticServicePointRow[];
  items: DiagnosticItemRow[];
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [servicePointId, setServicePointId] = React.useState("");
  const [diagnosticItemId, setDiagnosticItemId] = React.useState("");
  const [modality, setModality] = React.useState<Modality | "none">("none");
  const [defaultDurationMins, setDefaultDurationMins] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setServicePointId(editing?.servicePointId ?? (prefillServicePointId ?? ""));
    setDiagnosticItemId(editing?.diagnosticItemId ?? (prefillDiagnosticItemId ?? ""));
    setModality((editing?.modality as Modality) ?? "none");
    setDefaultDurationMins(editing?.defaultDurationMins != null ? String(editing.defaultDurationMins) : "");
    setIsPrimary(editing?.isPrimary ?? false);
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing, prefillServicePointId, prefillDiagnosticItemId]);

  async function save() {
    if (!servicePointId || !diagnosticItemId) {
      setErr("Service point and diagnostic item are required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            branchId,
            modality: modality === "none" ? null : modality,
            defaultDurationMins: toInt(defaultDurationMins) ?? null,
            isPrimary,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/capabilities", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            servicePointId,
            diagnosticItemId,
            modality: modality === "none" ? undefined : modality,
            defaultDurationMins: toInt(defaultDurationMins) ?? undefined,
            isPrimary,
          }),
        });
      }
      toast({ title: editing ? "Capability updated" : "Capability created" });
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
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title={editing ? "Edit Capability" : "Create Capability"}
          description="Connect an item to a service point and configure modality."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Service point" required>
              <Select value={servicePointId} onValueChange={setServicePointId} disabled={!!editing}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select service point" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {servicePoints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Diagnostic item" required>
              <Select value={diagnosticItemId} onValueChange={setDiagnosticItemId} disabled={!!editing}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Modality">
              <Select value={modality} onValueChange={(v) => setModality(v as any)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default duration (mins)">
              <Input value={defaultDurationMins} onChange={(e) => setDefaultDurationMins(e.target.value)} placeholder="30" />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
            <div className="text-sm font-semibold text-zc-text">Primary</div>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
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

function CapabilityRoomsDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<RoomRow[]>([]);
  const [rows, setRows] = React.useState<AllowedRoomRow[]>([]);
  const [roomId, setRoomId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const rooms = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?branchId=${encodeURIComponent(branchId)}`);
    setAvailable(safeArray(rooms));
    const mapped = await apiFetch<AllowedRoomRow[]>(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/rooms?branchId=${encodeURIComponent(branchId)}`);
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || roomId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/rooms?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ roomId }),
      });
      toast({ title: "Room allowed" });
      setRoomId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Allowed Rooms"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select room</SelectItem>
                {available.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={roomId === "none"}>Add</Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No allowed rooms.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>{r.room?.name || r.roomId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/rooms/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CapabilityResourcesDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<UnitResourceRow[]>([]);
  const [rows, setRows] = React.useState<AllowedResourceRow[]>([]);
  const [resourceId, setResourceId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const resources = await apiFetch<UnitResourceRow[]>(`/api/infrastructure/resources?branchId=${encodeURIComponent(branchId)}`);
    setAvailable(safeArray(resources));
    const mapped = await apiFetch<AllowedResourceRow[]>(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/resources?branchId=${encodeURIComponent(branchId)}`);
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || resourceId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/resources?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ resourceId }),
      });
      toast({ title: "Resource allowed" });
      setResourceId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Allowed Resources"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select resource" /></SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select resource</SelectItem>
                {available.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={resourceId === "none"}>Add</Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No allowed resources.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>{r.resource?.name || r.resourceId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/resources/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CapabilityEquipmentDialog({
  open,
  onOpenChange,
  branchId,
  capability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  capability: CapabilityRow | null;
}) {
  const { toast } = useToast();
  const [available, setAvailable] = React.useState<EquipmentAssetRow[]>([]);
  const [rows, setRows] = React.useState<AllowedEquipmentRow[]>([]);
  const [equipmentId, setEquipmentId] = React.useState("none");

  async function loadAll(cap: CapabilityRow) {
    const equipment = await apiFetch(`/api/infrastructure/equipment?branchId=${encodeURIComponent(branchId)}`);
    setAvailable(normalizeEquipmentList(equipment));
    const mapped = await apiFetch<AllowedEquipmentRow[]>(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(cap.id)}/equipment?branchId=${encodeURIComponent(branchId)}`);
    setRows(safeArray(mapped));
  }

  React.useEffect(() => {
    if (open && capability) void loadAll(capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capability?.id]);

  async function add() {
    if (!capability || equipmentId === "none") return;
    try {
      await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/equipment?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ equipmentId }),
      });
      toast({ title: "Equipment allowed" });
      setEquipmentId("none");
      await loadAll(capability);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClassName("w-[95vw] sm:max-w-[760px] max-h-[85vh] overflow-y-auto")}>
        <ModalHeader
          title="Allowed Equipment"
          description={capability?.diagnosticItem?.name || "Capability"}
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select equipment" /></SelectTrigger>
              <SelectContent className="max-h-[280px] overflow-y-auto">
                <SelectItem value="none">Select equipment</SelectItem>
                {available.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={equipmentId === "none"}>Add</Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">No allowed equipment.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-2 text-sm">
                  <div>{r.equipment?.name || r.equipmentId}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!capability) return;
                      try {
                        await apiFetch(`/api/infrastructure/diagnostics/capabilities/${encodeURIComponent(capability.id)}/equipment/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" });
                        toast({ title: "Removed" });
                        await loadAll(capability);
                      } catch (e: any) {
                        toast({ title: "Remove failed", description: e?.message || "Error", variant: "destructive" as any });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   TAB 7: Bootstrap
   ========================================================= */

function PacksTab({ branchId }: TabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [packs, setPacks] = React.useState<DiagnosticPackRow[]>([]);
  const [packId, setPackId] = React.useState("");
  const [versions, setVersions] = React.useState<DiagnosticPackVersionRow[]>([]);
  const [versionId, setVersionId] = React.useState("");
  const [locations, setLocations] = React.useState<FlatLocationNode[]>([]);
  const [placements, setPlacements] = React.useState<Record<string, string>>({});
  const [applying, setApplying] = React.useState(false);
  const [labType, setLabType] = React.useState<LabType>("LAB_CORE");
  const [quickLocationId, setQuickLocationId] = React.useState("");
  const [showQuickSetup, setShowQuickSetup] = React.useState(false);

  const [packDialogOpen, setPackDialogOpen] = React.useState(false);
  const [editingPack, setEditingPack] = React.useState<DiagnosticPackRow | null>(null);

  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [editingVersion, setEditingVersion] = React.useState<DiagnosticPackVersionRow | null>(null);

  async function loadPacks() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticPackRow[]>("/api/infrastructure/diagnostics/packs");
      setPacks(safeArray(rows));
      if (!packId && rows?.[0]?.id) setPackId(rows[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load packs");
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(id: string) {
    if (!id) {
      setVersions([]);
      setVersionId("");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<DiagnosticPackVersionRow[]>(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(id)}/versions`);
      const list = safeArray(rows);
      setVersions(list);
      const active = list.find((v) => v.status === "ACTIVE") || list[0];
      setVersionId(active?.id ?? "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const locTree = await apiFetch<any>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`);
      setLocations(flattenLocationTree(normalizeLocationTree(locTree)));
    } catch (e: any) {
      setErr(e?.message || "Failed to load locations");
    }
  }

  React.useEffect(() => {
    void loadPacks();
    void loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    void loadVersions(packId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  const selectedPack = packs.find((p) => p.id === packId) || null;
  const selectedVersion = versions.find((v) => v.id === versionId) || null;
  const labTypePacks = packs.filter((p) => (p.labType || "OTHER") === labType);
  const payload = selectedVersion?.payload || {};
  const servicePoints = safeArray<any>(payload.servicePoints).map((sp: any) => ({
    code: normalizeCode(sp.code),
    name: String(sp.name || sp.code || "").trim(),
    requiresPlacement: sp.requiresPlacement !== false,
  }));

  React.useEffect(() => {
    if (!labTypePacks.length) return;
    if (!labTypePacks.some((p) => p.id === packId)) {
      setPackId(labTypePacks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labType, packs]);

  async function applyPack() {
    if (!selectedVersion) return;
    const missing = servicePoints.filter((sp) => sp.requiresPlacement && !placements[sp.code]);
    if (missing.length) {
      setErr(`Missing placements: ${missing.map((m) => m.code).join(", ")}`);
      return;
    }
    setApplying(true);
    setErr(null);
    try {
      await apiFetch("/api/infrastructure/diagnostics/packs/apply", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          packVersionId: selectedVersion.id,
          placements: servicePoints
            .filter((sp) => sp.requiresPlacement)
            .map((sp) => ({ servicePointCode: sp.code, locationNodeId: placements[sp.code] })),
        }),
      });
      toast({ title: "Pack applied", description: "Diagnostics configuration imported." });
    } catch (e: any) {
      setErr(e?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  async function applyQuickSetup() {
    if (!selectedVersion) {
      setErr("Select a template version");
      return;
    }
    if (!quickLocationId) {
      setErr("Select a location");
      return;
    }
    const nextPlacements: Record<string, string> = {};
    servicePoints.filter((sp) => sp.requiresPlacement).forEach((sp) => {
      nextPlacements[sp.code] = quickLocationId;
    });
    if (!Object.keys(nextPlacements).length) {
      setErr("Selected template has no service points");
      return;
    }
    setPlacements(nextPlacements);
    setApplying(true);
    setErr(null);
    try {
      await apiFetch("/api/infrastructure/diagnostics/packs/apply", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          packVersionId: selectedVersion.id,
          placements: Object.entries(nextPlacements).map(([servicePointCode, locationNodeId]) => ({
            servicePointCode,
            locationNodeId,
          })),
        }),
      });
      toast({ title: "Template applied", description: "Lab setup imported." });
    } catch (e: any) {
      setErr(e?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Diagnostic Packs</CardTitle>
        <CardDescription>Backend-stored packs with versioning. Import, edit, and apply to a branch.</CardDescription>
      </CardHeader>
      <CardContent>
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-zc-text">Quick setup</div>
          <Button variant="outline" size="sm" onClick={() => setShowQuickSetup((s) => !s)}>
            {showQuickSetup ? "Hide Quick Setup" : "Show Quick Setup"}
          </Button>
        </div>

        {showQuickSetup ? (
          <div className="mb-4 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="text-sm font-semibold text-zc-text">Lab Type Setup</div>
            <div className="mt-1 text-xs text-zc-muted">
              Step 1: choose a lab type and location. Step 2: select a predefined template. Step 3: apply.
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Lab type" required>
                <Select value={labType} onValueChange={(v) => setLabType(v as LabType)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAB_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location" required>
                <Select value={quickLocationId} onValueChange={setQuickLocationId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Template" required>
                <Select value={packId} onValueChange={setPackId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {labTypePacks.length === 0 ? (
                      <SelectItem value="none" disabled>No templates for this lab type</SelectItem>
                    ) : (
                      labTypePacks.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={applyQuickSetup} disabled={applying || !selectedVersion || !quickLocationId || !labTypePacks.length}>
                Apply template
              </Button>
              <div className="text-xs text-zc-muted">Uses the active version of the selected template.</div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="rounded-xl border border-zc-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Packs</div>
              <Button size="sm" onClick={() => { setEditingPack(null); setPackDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
            <div className="grid gap-2">
              {packs.length === 0 ? (
                <div className="text-sm text-zc-muted">No packs yet.</div>
              ) : (
                packs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackId(p.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition",
                      packId === p.id
                        ? "border-zc-accent bg-zc-accent shadow-sm"
                        : "border-zc-border bg-zc-card hover:bg-zc-panel/20"
                    )}
                  >
                    <div className={cn("text-sm font-semibold", packId === p.id ? "text-white" : "text-zc-text")}>{p.name}</div>
                    <div className={cn("text-xs", packId === p.id ? "text-white/85" : "text-zc-muted")}>
                      {p.code}{p.labType ? ` - ${p.labType}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-zc-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">{selectedPack?.name || "Select a pack"}</div>
                  <div className="text-xs text-zc-muted">{selectedPack?.description || "Create or select a pack to manage versions."}</div>
                </div>
                {selectedPack ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingPack(selectedPack); setPackDialogOpen(true); }}>
                      Edit pack
                    </Button>
                    <Button size="sm" onClick={() => { setEditingVersion(null); setVersionDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Version
                    </Button>
                  </div>
                ) : null}
              </div>

              <Separator className="my-3" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Version">
                  <Select value={versionId} onValueChange={setVersionId} disabled={!selectedPack || loading}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select version" /></SelectTrigger>
                    <SelectContent className="max-h-[280px] overflow-y-auto">
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version} • {v.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { if (selectedVersion) { setEditingVersion(selectedVersion); setVersionDialogOpen(true); } }} disabled={!selectedVersion}>
                    Edit version
                  </Button>
                  <Button onClick={applyPack} disabled={!selectedVersion || applying}>
                    Apply pack
                  </Button>
                </div>
              </div>

              {selectedVersion ? (
                <div className="mt-4 grid gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Placements</div>
                  {servicePoints.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zc-border p-3 text-sm text-zc-muted">No service points in payload.</div>
                  ) : (
                    servicePoints.map((sp) => (
                      <Field key={sp.code} label={`Placement for ${sp.name} (${sp.code})`} required>
                        <Select
                          value={placements[sp.code] || ""}
                          onValueChange={(v) => setPlacements((prev) => ({ ...prev, [sp.code]: v }))}
                        >
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent className="max-h-[280px] overflow-y-auto">
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.id}>{l.path}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <PackDialog
          open={packDialogOpen}
          onOpenChange={setPackDialogOpen}
          editing={editingPack}
          onSaved={() => { void loadPacks(); }}
        />
        <PackVersionDialog
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          packId={packId}
          editing={editingVersion}
          onSaved={() => { if (packId) void loadVersions(packId); }}
        />
      </CardContent>
    </Card>
  );
}

const SAMPLE_PACK_PAYLOAD = {
  servicePoints: [
    { code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true },
  ],
  sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
  categories: [{ code: "BIOCHEM", name: "Biochemistry", sectionCode: "LAB", sortOrder: 10 }],
  specimens: [{ code: "SERUM", name: "Serum", container: "Vacutainer" }],
  items: [
    {
      code: "GLU",
      name: "Glucose (Fasting)",
      kind: "LAB",
      sectionCode: "LAB",
      categoryCode: "BIOCHEM",
      specimenCode: "SERUM",
      tatMinsRoutine: 60,
      isPanel: false,
    },
  ],
  parameters: [
    { itemCode: "GLU", code: "GLU", name: "Glucose", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
  ],
  ranges: [
    { itemCode: "GLU", parameterCode: "GLU", low: 70, high: 100, textRange: "Normal" },
  ],
  templates: [
    { itemCode: "GLU", kind: "LAB_REPORT", name: "Lab report", body: "Result: {{value}}" },
  ],
  capabilities: [
    { servicePointCode: "LAB", itemCode: "GLU", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
  ],
};

function PackDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DiagnosticPackRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [labType, setLabType] = React.useState<LabType | "none">("none");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setLabType((editing?.labType as LabType) ?? "none");
    setDescription(editing?.description ?? "");
    setIsActive(editing?.isActive ?? true);
    setErr(null);
  }, [open, editing]);

  async function save() {
    const codeErr = validateCode(code, "Pack");
    const nameErr = validateName(name, "Pack");
    if (!editing && codeErr) {
      setErr(codeErr);
      return;
    }
    if (nameErr) {
      setErr(nameErr);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            labType: labType === "none" ? null : labType,
            description: description.trim() || null,
            isActive,
          }),
        });
      } else {
        await apiFetch("/api/infrastructure/diagnostics/packs", {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(code),
            name: name.trim(),
            labType: labType === "none" ? undefined : labType,
            description: description.trim() || undefined,
          }),
        });
      }
      toast({ title: editing ? "Pack updated" : "Pack created" });
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
          title={editing ? "Edit Pack" : "Create Pack"}
          description="Pack metadata stored in the backend."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BASIC_DIAGNOSTICS" disabled={!!editing} />
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Basic Diagnostics Pack" />
          </Field>
          <Field label="Lab type">
            <Select value={labType} onValueChange={(v) => setLabType(v as LabType | "none")}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select lab type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lab type</SelectItem>
                {LAB_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
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

function PackVersionDialog({
  open,
  onOpenChange,
  packId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packId: string;
  editing: DiagnosticPackVersionRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [version, setVersion] = React.useState("");
  const [status, setStatus] = React.useState<PackVersionStatus>("DRAFT");
  const [notes, setNotes] = React.useState("");
  const [mode, setMode] = React.useState<"guided" | "json">("guided");
  const [payloadText, setPayloadText] = React.useState("");
  const [builder, setBuilder] = React.useState<any>({
    servicePoints: [],
    sections: [],
    categories: [],
    specimens: [],
    items: [],
    templates: [],
    capabilities: [],
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function normalizePayload(input: any) {
    const p = input ?? {};
    return {
      servicePoints: safeArray<any>(p.servicePoints).map((sp) => ({
        code: sp.code ?? "",
        name: sp.name ?? "",
        type: sp.type ?? "OTHER",
        requiresPlacement: sp.requiresPlacement !== false,
      })),
      sections: safeArray<any>(p.sections).map((s) => ({
        code: s.code ?? "",
        name: s.name ?? "",
      })),
      categories: safeArray<any>(p.categories).map((c) => ({
        code: c.code ?? "",
        name: c.name ?? "",
        sectionCode: c.sectionCode ?? "",
      })),
      specimens: safeArray<any>(p.specimens).map((s) => ({
        code: s.code ?? "",
        name: s.name ?? "",
        container: s.container ?? "",
        minVolumeMl: s.minVolumeMl != null ? String(s.minVolumeMl) : "",
        handlingNotes: s.handlingNotes ?? "",
      })),
      items: safeArray<any>(p.items).map((i) => ({
        code: i.code ?? "",
        name: i.name ?? "",
        kind: i.kind ?? "LAB",
        sectionCode: i.sectionCode ?? "",
        categoryCode: i.categoryCode ?? "",
        specimenCode: i.specimenCode ?? "",
        isPanel: Boolean(i.isPanel),
        requiresAppointment: Boolean(i.requiresAppointment),
        consentRequired: Boolean(i.consentRequired),
        preparationText: i.preparationText ?? "",
      })),
      templates: safeArray<any>(p.templates).map((t) => ({
        itemCode: t.itemCode ?? "",
        kind: t.kind ?? "IMAGING_REPORT",
        name: t.name ?? "",
        body: t.body ?? "",
      })),
      capabilities: safeArray<any>(p.capabilities).map((c) => ({
        servicePointCode: c.servicePointCode ?? "",
        itemCode: c.itemCode ?? "",
        modality: c.modality ?? "",
        defaultDurationMins: c.defaultDurationMins != null ? String(c.defaultDurationMins) : "",
        isPrimary: Boolean(c.isPrimary),
      })),
    };
  }

  function buildPayloadFromBuilder(b: any) {
    const payload: any = {};
    const servicePoints = safeArray<any>(b.servicePoints)
      .filter((sp) => sp.code || sp.name)
      .map((sp) => ({
        code: sp.code,
        name: sp.name,
        type: sp.type || "OTHER",
        requiresPlacement: sp.requiresPlacement !== false,
      }));
    if (servicePoints.length) payload.servicePoints = servicePoints;

    const sections = safeArray<any>(b.sections)
      .filter((s) => s.code || s.name)
      .map((s) => ({ code: s.code, name: s.name }));
    if (sections.length) payload.sections = sections;

    const categories = safeArray<any>(b.categories)
      .filter((c) => c.code || c.name)
      .map((c) => ({ code: c.code, name: c.name, sectionCode: c.sectionCode }));
    if (categories.length) payload.categories = categories;

    const specimens = safeArray<any>(b.specimens)
      .filter((s) => s.code || s.name)
      .map((s) => ({
        code: s.code,
        name: s.name,
        container: s.container?.trim() || undefined,
        minVolumeMl: toFloat(s.minVolumeMl) ?? undefined,
        handlingNotes: s.handlingNotes?.trim() || undefined,
      }));
    if (specimens.length) payload.specimens = specimens;

    const items = safeArray<any>(b.items)
      .filter((i) => i.code || i.name)
      .map((i) => ({
        code: i.code,
        name: i.name,
        kind: i.kind || "LAB",
        sectionCode: i.sectionCode,
        categoryCode: i.categoryCode || undefined,
        specimenCode: i.specimenCode || undefined,
        isPanel: Boolean(i.isPanel),
        requiresAppointment: Boolean(i.requiresAppointment),
        consentRequired: Boolean(i.consentRequired),
        preparationText: i.preparationText?.trim() || undefined,
      }));
    if (items.length) payload.items = items;

    const templates = safeArray<any>(b.templates)
      .filter((t) => t.itemCode && (t.name || t.body))
      .map((t) => ({
        itemCode: t.itemCode,
        kind: t.kind || "IMAGING_REPORT",
        name: t.name,
        body: t.body,
      }));
    if (templates.length) payload.templates = templates;

    const capabilities = safeArray<any>(b.capabilities)
      .filter((c) => c.servicePointCode && c.itemCode)
      .map((c) => ({
        servicePointCode: c.servicePointCode,
        itemCode: c.itemCode,
        modality: c.modality || undefined,
        defaultDurationMins: toInt(c.defaultDurationMins) ?? undefined,
        isPrimary: Boolean(c.isPrimary),
      }));
    if (capabilities.length) payload.capabilities = capabilities;

    return payload;
  }

  function addRow(key: string, row: any) {
    setBuilder((prev: any) => ({ ...prev, [key]: [...safeArray(prev[key]), row] }));
  }

  function updateRow(key: string, index: number, patch: any) {
    setBuilder((prev: any) => {
      const list = [...safeArray(prev[key])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [key]: list };
    });
  }

  function removeRow(key: string, index: number) {
    setBuilder((prev: any) => {
      const list = [...safeArray(prev[key])].filter((_: any, i: number) => i !== index);
      return { ...prev, [key]: list };
    });
  }

  React.useEffect(() => {
    if (!open) return;
    setVersion(editing?.version != null ? String(editing.version) : "");
    setStatus(editing?.status ?? "DRAFT");
    setNotes(editing?.notes ?? "");
    const initialPayload = editing?.payload ?? SAMPLE_PACK_PAYLOAD;
    setPayloadText(JSON.stringify(initialPayload, null, 2));
    setBuilder(normalizePayload(initialPayload));
    setMode("guided");
    setErr(null);
  }, [open, editing]);

  async function save() {
    if (!packId && !editing) {
      setErr("Select a pack first");
      return;
    }
    let payload: any;
    if (mode === "json") {
      try {
        payload = JSON.parse(payloadText);
      } catch {
        setErr("Payload JSON is invalid");
        return;
      }
    } else {
      let base: any = {};
      try {
        base = JSON.parse(payloadText);
      } catch {
        base = {};
      }
      const guided = buildPayloadFromBuilder(builder);
      payload = { ...asRecord(base), ...guided };
    }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/diagnostics/packs/versions/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            status,
            notes: notes.trim() || null,
            payload,
          }),
        });
      } else {
        await apiFetch(`/api/infrastructure/diagnostics/packs/${encodeURIComponent(packId)}/versions`, {
          method: "POST",
          body: JSON.stringify({
            version: version.trim() ? Number.parseInt(version, 10) : undefined,
            status,
            notes: notes.trim() || undefined,
            payload,
          }),
        });
      }
      toast({ title: editing ? "Version updated" : "Version created" });
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
          title={editing ? "Edit Pack Version" : "Create Pack Version"}
          description="Versions are immutable snapshots you can apply to branches."
          onClose={() => onOpenChange(false)}
        />
        <div className="grid gap-4">
          {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{err}</div> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Version">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Auto" disabled={!!editing} />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as PackVersionStatus)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="RETIRED">RETIRED</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zc-text">Payload Builder</div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "guided" ? "primary" : "outline"} onClick={() => setMode("guided")}>
                Guided
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "json" ? "primary" : "outline"}
                onClick={() => {
                  let base: any = {};
                  try {
                    base = JSON.parse(payloadText);
                  } catch {
                    base = {};
                  }
                  const guided = buildPayloadFromBuilder(builder);
                  setPayloadText(JSON.stringify({ ...base, ...guided }, null, 2));
                  setMode("json");
                }}
              >
                JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const payload = SAMPLE_PACK_PAYLOAD;
                  setBuilder(normalizePayload(payload));
                  setPayloadText(JSON.stringify(payload, null, 2));
                }}
              >
                Load Sample
              </Button>
            </div>
          </div>

          {mode === "json" ? (
            <Field label="Payload (JSON)">
              <Textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={16} />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      const payload = JSON.parse(payloadText);
                      setBuilder(normalizePayload(payload));
                      setMode("guided");
                      setErr(null);
                    } catch {
                      setErr("Payload JSON is invalid");
                    }
                  }}
                >
                  Apply JSON to form
                </Button>
              </div>
            </Field>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Service Points</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("servicePoints", { code: "", name: "", type: "OTHER", requiresPlacement: true })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.servicePoints.length === 0 ? (
                  <div className="text-sm text-zc-muted">No service points.</div>
                ) : (
                  builder.servicePoints.map((sp: any, idx: number) => (
                    <div key={`sp-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input value={sp.code} onChange={(e) => updateRow("servicePoints", idx, { code: e.target.value })} placeholder="CODE" />
                        <Input value={sp.name} onChange={(e) => updateRow("servicePoints", idx, { name: e.target.value })} placeholder="Name" />
                        <Select value={sp.type} onValueChange={(v) => updateRow("servicePoints", idx, { type: v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            {SERVICE_POINT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr,140px]">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Placement required</div>
                          <Switch checked={sp.requiresPlacement !== false} onCheckedChange={(v) => updateRow("servicePoints", idx, { requiresPlacement: Boolean(v) })} />
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => removeRow("servicePoints", idx)}>Remove</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Sections</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("sections", { code: "", name: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.sections.length === 0 ? (
                  <div className="text-sm text-zc-muted">No sections.</div>
                ) : (
                  builder.sections.map((s: any, idx: number) => (
                    <div key={`sec-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-3">
                      <Input value={s.code} onChange={(e) => updateRow("sections", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={s.name} onChange={(e) => updateRow("sections", idx, { name: e.target.value })} placeholder="Name" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("sections", idx)}>Remove</Button>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Categories</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("categories", { code: "", name: "", sectionCode: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.categories.length === 0 ? (
                  <div className="text-sm text-zc-muted">No categories.</div>
                ) : (
                  builder.categories.map((c: any, idx: number) => (
                    <div key={`cat-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-4">
                      <Input value={c.code} onChange={(e) => updateRow("categories", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={c.name} onChange={(e) => updateRow("categories", idx, { name: e.target.value })} placeholder="Name" />
                      <Input value={c.sectionCode} onChange={(e) => updateRow("categories", idx, { sectionCode: e.target.value })} placeholder="Section code" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("categories", idx)}>Remove</Button>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Specimens</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("specimens", { code: "", name: "", container: "", minVolumeMl: "", handlingNotes: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.specimens.length === 0 ? (
                  <div className="text-sm text-zc-muted">No specimens.</div>
                ) : (
                  builder.specimens.map((s: any, idx: number) => (
                    <div key={`spm-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3 md:grid-cols-5">
                      <Input value={s.code} onChange={(e) => updateRow("specimens", idx, { code: e.target.value })} placeholder="CODE" />
                      <Input value={s.name} onChange={(e) => updateRow("specimens", idx, { name: e.target.value })} placeholder="Name" />
                      <Input value={s.container} onChange={(e) => updateRow("specimens", idx, { container: e.target.value })} placeholder="Container" />
                      <Input value={s.minVolumeMl} onChange={(e) => updateRow("specimens", idx, { minVolumeMl: e.target.value })} placeholder="Min volume (ml)" />
                      <Button variant="destructive" size="sm" onClick={() => removeRow("specimens", idx)}>Remove</Button>
                      <div className="md:col-span-5">
                        <Input value={s.handlingNotes} onChange={(e) => updateRow("specimens", idx, { handlingNotes: e.target.value })} placeholder="Handling notes" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Items</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("items", { code: "", name: "", kind: "LAB", sectionCode: "", categoryCode: "", specimenCode: "", isPanel: false, requiresAppointment: false, consentRequired: false, preparationText: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.items.length === 0 ? (
                  <div className="text-sm text-zc-muted">No items.</div>
                ) : (
                  builder.items.map((i: any, idx: number) => (
                    <div key={`item-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={i.code} onChange={(e) => updateRow("items", idx, { code: e.target.value })} placeholder="CODE" />
                        <Input value={i.name} onChange={(e) => updateRow("items", idx, { name: e.target.value })} placeholder="Name" />
                        <Select value={i.kind} onValueChange={(v) => updateRow("items", idx, { kind: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIAG_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={i.sectionCode} onChange={(e) => updateRow("items", idx, { sectionCode: e.target.value })} placeholder="Section code" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={i.categoryCode} onChange={(e) => updateRow("items", idx, { categoryCode: e.target.value })} placeholder="Category code" />
                        <Input value={i.specimenCode} onChange={(e) => updateRow("items", idx, { specimenCode: e.target.value })} placeholder="Specimen code" />
                        <Input value={i.preparationText} onChange={(e) => updateRow("items", idx, { preparationText: e.target.value })} placeholder="Preparation text" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("items", idx)}>Remove</Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Panel</div>
                          <Switch checked={Boolean(i.isPanel)} onCheckedChange={(v) => updateRow("items", idx, { isPanel: Boolean(v) })} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Requires appointment</div>
                          <Switch checked={Boolean(i.requiresAppointment)} onCheckedChange={(v) => updateRow("items", idx, { requiresAppointment: Boolean(v) })} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                          <div className="text-xs font-semibold text-zc-muted">Consent required</div>
                          <Switch checked={Boolean(i.consentRequired)} onCheckedChange={(v) => updateRow("items", idx, { consentRequired: Boolean(v) })} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Templates</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("templates", { itemCode: "", kind: "IMAGING_REPORT", name: "", body: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.templates.length === 0 ? (
                  <div className="text-sm text-zc-muted">No templates.</div>
                ) : (
                  builder.templates.map((t: any, idx: number) => (
                    <div key={`tmpl-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input value={t.itemCode} onChange={(e) => updateRow("templates", idx, { itemCode: e.target.value })} placeholder="Item code" />
                        <Select value={t.kind} onValueChange={(v) => updateRow("templates", idx, { kind: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={t.name} onChange={(e) => updateRow("templates", idx, { name: e.target.value })} placeholder="Template name" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("templates", idx)}>Remove</Button>
                      </div>
                      <Textarea value={t.body} onChange={(e) => updateRow("templates", idx, { body: e.target.value })} rows={4} placeholder="Template body" />
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-zc-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zc-text">Capabilities</div>
                  <Button size="sm" variant="outline" onClick={() => addRow("capabilities", { servicePointCode: "", itemCode: "", modality: "", defaultDurationMins: "", isPrimary: false })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                {builder.capabilities.length === 0 ? (
                  <div className="text-sm text-zc-muted">No capabilities.</div>
                ) : (
                  builder.capabilities.map((c: any, idx: number) => (
                    <div key={`cap-${idx}`} className="mb-3 grid gap-3 rounded-lg border border-zc-border p-3">
                      <div className="grid gap-3 md:grid-cols-5">
                        <Input value={c.servicePointCode} onChange={(e) => updateRow("capabilities", idx, { servicePointCode: e.target.value })} placeholder="Service point code" />
                        <Input value={c.itemCode} onChange={(e) => updateRow("capabilities", idx, { itemCode: e.target.value })} placeholder="Item code" />
                        <Select value={c.modality || "none"} onValueChange={(v) => updateRow("capabilities", idx, { modality: v === "none" ? null : v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Modality" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={c.defaultDurationMins} onChange={(e) => updateRow("capabilities", idx, { defaultDurationMins: e.target.value })} placeholder="Duration (mins)" />
                        <Button variant="destructive" size="sm" onClick={() => removeRow("capabilities", idx)}>Remove</Button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 px-3">
                        <div className="text-xs font-semibold text-zc-muted">Primary</div>
                        <Switch checked={Boolean(c.isPrimary)} onCheckedChange={(v) => updateRow("capabilities", idx, { isPrimary: Boolean(v) })} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-xs text-zc-muted">
                Use JSON mode for advanced fields (parameters, ranges, or panel composition).
              </div>
            </div>
          )}
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
