"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import {
  ChevronDown,
  ChevronUp,
  Microscope,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import type { OtTheatreRow, OtSuiteRow, OtSpaceRow, OtTheatreType } from "../../_shared/types";
import { THEATRE_TYPES } from "../../_shared/constants";
import { humanize, safeArray } from "../../_shared/utils";
import {
  NoBranchGuard,
  OtPageHeader,
  SuiteContextBar,
  ErrorAlert,
  Field,
  ModalHeader,
  drawerClassName,
  CodeBadge,
  StatusPill,
  StatBox,
  SearchBar,
  SectionHeader,
  OnboardingCallout,
} from "../../_shared/components";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 03 — Theatre Configuration (OTS-013 through OTS-021)
   Theatre cards with Engineering, Specialties, Scheduling
   panels and OT Tables sub-section.
   ========================================================= */

export default function TheatresPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Theatres">
      <RequirePerm perm="ot.theatre.read">
        {branchId ? <TheatresContent branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Main content ---- */

function TheatresContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canUpdate = hasPerm(user, "ot.theatre.update");

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [theatres, setTheatres] = React.useState<OtTheatreRow[]>([]);
  const [q, setQ] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-theatres" });

  // Drawer state
  const [engDrawer, setEngDrawer] = React.useState<OtTheatreRow | null>(null);
  const [specDrawer, setSpecDrawer] = React.useState<OtTheatreRow | null>(null);
  const [schedDrawer, setSchedDrawer] = React.useState<OtTheatreRow | null>(null);

  // Table management
  const [addTableFor, setAddTableFor] = React.useState<OtTheatreRow | null>(null);
  const [newTableName, setNewTableName] = React.useState("");

  const qs = React.useCallback(() => `?branchId=${encodeURIComponent(branchId)}`, [branchId]);

  const load = React.useCallback(async (showToast = false) => {
    setErr(null);
    setLoading(true);
    try {
      const [suiteData, spacesData] = await Promise.all([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs()}`),
        apiFetch<any[]>(`/api/infrastructure/ot/suites/${suiteId}/spaces${qs()}`),
      ]);
      setSuite(suiteData);

      // Filter spaces of type THEATRE — the backend embeds theatre data in the space
      const spaces = safeArray<any>(spacesData);
      const theatreSpaces = spaces.filter((s: any) => s.type === "THEATRE");

      // Normalize to OtTheatreRow — the theatre data lives inside each space
      const rows: OtTheatreRow[] = theatreSpaces.map((s: any) => {
        const t = s.theatre ?? s;
        return {
          id: t.id ?? s.id,
          suiteId,
          spaceId: s.id,
          name: t.name ?? s.name,
          code: t.code ?? s.code,
          type: t.type ?? "STANDARD",
          area: t.area ?? null,
          ceilingHeight: t.ceilingHeight ?? null,
          isoClass: t.isoClass ?? null,
          airflow: t.airflow ?? null,
          pressure: t.pressure ?? null,
          gasO2: t.gasO2 ?? false,
          gasO2Outlets: t.gasO2Outlets ?? null,
          gasN2O: t.gasN2O ?? false,
          gasN2OOutlets: t.gasN2OOutlets ?? null,
          gasAir: t.gasAir ?? false,
          gasAirOutlets: t.gasAirOutlets ?? null,
          gasVacuum: t.gasVacuum ?? false,
          gasVacuumOutlets: t.gasVacuumOutlets ?? null,
          upsOutlets: t.upsOutlets ?? null,
          isolatedPowerSupply: t.isolatedPowerSupply ?? false,
          tempMin: t.tempMin ?? null,
          tempMax: t.tempMax ?? null,
          humidityMin: t.humidityMin ?? null,
          humidityMax: t.humidityMax ?? null,
          luxLevel: t.luxLevel ?? null,
          emergencyLighting: t.emergencyLighting ?? false,
          specialtyCodes: safeArray<string>(t.specialtyCodes),
          turnaroundTimeMin: t.turnaroundTimeMin ?? null,
          cleaningTimeMin: t.cleaningTimeMin ?? null,
          maxCasesPerDay: t.maxCasesPerDay ?? null,
          defaultSlotMinor: t.defaultSlotMinor ?? null,
          defaultSlotMajor: t.defaultSlotMajor ?? null,
          defaultSlotComplex: t.defaultSlotComplex ?? null,
          bufferEmergencyMin: t.bufferEmergencyMin ?? null,
          isEmergencyEligible: t.isEmergencyEligible ?? false,
          is24x7Emergency: t.is24x7Emergency ?? false,
          isActive: t.isActive ?? s.isActive ?? true,
          tables: safeArray(t.tables),
        };
      });

      setTheatres(rows);
      if (showToast) toast({ title: "Theatres refreshed" });
    } catch (e: any) {
      setErr(e?.message || "Failed to load theatres");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, qs, toast]);

  React.useEffect(() => { void load(false); }, [load]);

  // Filtered
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return theatres;
    return theatres.filter((t) => `${t.name} ${t.code} ${t.type}`.toLowerCase().includes(s));
  }, [theatres, q]);

  // Toggle expand
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Expand all
  function expandAll() {
    setExpanded(new Set(theatres.map((t) => t.id)));
  }

  // Delete table
  async function deleteTable(theatre: OtTheatreRow, tableId: string) {
    try {
      await apiFetch(
        `/api/infrastructure/ot/suites/${suiteId}/theatres/${theatre.id}/tables/${tableId}`,
        { method: "DELETE" },
      );
      toast({ title: "Table removed" });
      await load(false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  // Add table
  async function addTable() {
    if (!addTableFor || !newTableName.trim()) return;
    try {
      await apiFetch(
        `/api/infrastructure/ot/suites/${suiteId}/theatres/${addTableFor.id}/tables`,
        { method: "POST", body: JSON.stringify({ name: newTableName.trim() }) },
      );
      toast({ title: "Table added" });
      setAddTableFor(null);
      setNewTableName("");
      await load(false);
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message || "Error", variant: "destructive" as any });
    }
  }

  // Stats
  const activeCount = theatres.filter((t) => t.isActive).length;
  const typeCounts = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of theatres) m[t.type] = (m[t.type] || 0) + 1;
    return m;
  }, [theatres]);

  const theatreTypeBadge = (type: OtTheatreType) => {
    const map: Record<string, string> = {
      STANDARD: "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200",
      LAMINAR_FLOW: "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
      HYBRID: "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
      DAY_SURGERY: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
      EMERGENCY: "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
      LAPAROSCOPIC: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    };
    return map[type] ?? "border-zc-border bg-zc-panel/30 text-zc-text";
  };

  return (
    <div className="grid gap-6">
      {/* Suite context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* Header */}
      <OtPageHeader
        icon={<Microscope className="h-5 w-5 text-zc-accent" />}
        title="Theatre Configuration"
        description="Engineering specs, specialties, scheduling parameters, and OT tables for each theatre."
        loading={loading}
        onRefresh={() => void load(true)}
        extra={
          theatres.length > 0 ? (
            <Button variant="outline" className="gap-2 px-4" onClick={expandAll}>
              Expand All
            </Button>
          ) : null
        }
      />

      {/* Error */}
      <ErrorAlert message={err} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Stats */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">Summary of theatres in this OT suite.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox label="Total Theatres" value={loading ? "\u2014" : theatres.length} color="indigo" detail={`Active: ${activeCount}`} />
            <StatBox label="Standard" value={typeCounts["STANDARD"] ?? 0} color="blue" />
            <StatBox label="Laminar Flow" value={typeCounts["LAMINAR_FLOW"] ?? 0} color="violet" />
            <StatBox label="Emergency" value={typeCounts["EMERGENCY"] ?? 0} color="rose" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {theatres.length > 0 ? (
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by name, code, type..."
          filteredCount={filtered.length}
          totalCount={theatres.length}
        />
      ) : null}

      {/* Theatre cards */}
      {loading && theatres.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="flex items-center justify-center py-16 text-sm text-zc-muted">
            Loading theatres...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-zc-muted">
            {theatres.length === 0
              ? "No theatres found. Create spaces of type THEATRE in the Spaces page first."
              : "No theatres match your search."}
          </CardContent>
        </Card>
      ) : (
        filtered.map((theatre) => {
          const isOpen = expanded.has(theatre.id);
          return (
            <Card key={theatre.id} className="overflow-hidden">
              {/* Card header */}
              <button
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zc-panel/20"
                onClick={() => toggle(theatre.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-indigo-50/50 dark:bg-indigo-900/20">
                    <Microscope className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zc-text">{theatre.name}</span>
                      <CodeBadge>{theatre.code}</CodeBadge>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", theatreTypeBadge(theatre.type))}
                      >
                        {humanize(theatre.type)}
                      </Badge>
                      <StatusPill active={theatre.isActive} />
                    </div>
                    <div className="mt-0.5 text-xs text-zc-muted">
                      {theatre.specialtyCodes?.length
                        ? `Specialties: ${theatre.specialtyCodes.join(", ")}`
                        : "No specialties assigned"}
                      {theatre.tables?.length ? ` | Tables: ${theatre.tables.length}` : ""}
                    </div>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-zc-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-zc-muted" />
                )}
              </button>

              {/* Expanded content */}
              {isOpen ? (
                <div className="border-t border-zc-border">
                  {/* --- Engineering Specs (OTS-014) --- */}
                  <div className="px-5 py-4">
                    <SectionHeader title="Engineering Specifications">
                      {canUpdate ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEngDrawer(theatre)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      ) : null}
                    </SectionHeader>
                    <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                      <SpecItem label="Area" value={theatre.area != null ? `${theatre.area} sq ft` : null} />
                      <SpecItem label="Ceiling Height" value={theatre.ceilingHeight != null ? `${theatre.ceilingHeight} ft` : null} />
                      <SpecItem label="ISO Class" value={theatre.isoClass} />
                      <SpecItem label="Airflow" value={theatre.airflow} />
                      <SpecItem label="Pressure" value={theatre.pressure} />
                      <SpecItem label="Theatre Type" value={humanize(theatre.type)} />
                    </div>

                    {/* Gas Pipelines */}
                    <div className="mt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Gas Pipelines</div>
                      <div className="grid gap-2 md:grid-cols-4">
                        <GasPill label="O2" active={theatre.gasO2} outlets={theatre.gasO2Outlets} />
                        <GasPill label="N2O" active={theatre.gasN2O} outlets={theatre.gasN2OOutlets} />
                        <GasPill label="Air" active={theatre.gasAir} outlets={theatre.gasAirOutlets} />
                        <GasPill label="Vacuum" active={theatre.gasVacuum} outlets={theatre.gasVacuumOutlets} />
                      </div>
                    </div>

                    {/* Electrical */}
                    <div className="mt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Electrical</div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <SpecItem label="UPS Outlets" value={theatre.upsOutlets} />
                        <SpecItem label="Isolated Power Supply" value={theatre.isolatedPowerSupply ? "Yes" : "No"} />
                        <SpecItem label="Emergency Lighting" value={theatre.emergencyLighting ? "Yes" : "No"} />
                      </div>
                    </div>

                    {/* Environment */}
                    <div className="mt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Environment</div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <SpecItem
                          label="Temperature"
                          value={theatre.tempMin != null && theatre.tempMax != null ? `${theatre.tempMin}\u2013${theatre.tempMax}\u00B0C` : null}
                        />
                        <SpecItem
                          label="Humidity"
                          value={theatre.humidityMin != null && theatre.humidityMax != null ? `${theatre.humidityMin}\u2013${theatre.humidityMax}%` : null}
                        />
                        <SpecItem label="Lux Level" value={theatre.luxLevel != null ? `${theatre.luxLevel} lux` : null} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* --- Specialties (OTS-015) --- */}
                  <div className="px-5 py-4">
                    <SectionHeader title="Specialties" count={theatre.specialtyCodes?.length ?? 0}>
                      {canUpdate ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSpecDrawer(theatre)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      ) : null}
                    </SectionHeader>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {theatre.specialtyCodes?.length ? (
                        theatre.specialtyCodes.map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-zc-muted">No specialties assigned.</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* --- Scheduling Params (OTS-016) --- */}
                  <div className="px-5 py-4">
                    <SectionHeader title="Scheduling Parameters">
                      {canUpdate ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSchedDrawer(theatre)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      ) : null}
                    </SectionHeader>
                    <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                      <SpecItem label="Turnaround Time" value={theatre.turnaroundTimeMin != null ? `${theatre.turnaroundTimeMin} min` : null} />
                      <SpecItem label="Cleaning Time" value={theatre.cleaningTimeMin != null ? `${theatre.cleaningTimeMin} min` : null} />
                      <SpecItem label="Max Cases / Day" value={theatre.maxCasesPerDay} />
                      <SpecItem label="Slot (Minor)" value={theatre.defaultSlotMinor != null ? `${theatre.defaultSlotMinor} min` : null} />
                      <SpecItem label="Slot (Major)" value={theatre.defaultSlotMajor != null ? `${theatre.defaultSlotMajor} min` : null} />
                      <SpecItem label="Slot (Complex)" value={theatre.defaultSlotComplex != null ? `${theatre.defaultSlotComplex} min` : null} />
                      <SpecItem label="Emergency Buffer" value={theatre.bufferEmergencyMin != null ? `${theatre.bufferEmergencyMin} min` : null} />
                      <SpecItem label="Emergency Eligible" value={theatre.isEmergencyEligible ? "Yes" : "No"} />
                      <SpecItem label="24x7 Emergency" value={theatre.is24x7Emergency ? "Yes" : "No"} />
                    </div>
                  </div>

                  <Separator />

                  {/* --- OT Tables --- */}
                  <div className="px-5 py-4">
                    <SectionHeader title="OT Tables" count={theatre.tables?.length ?? 0}>
                      {canUpdate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => { setAddTableFor(theatre); setNewTableName(""); }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Table
                        </Button>
                      ) : null}
                    </SectionHeader>
                    <div className="mt-2 grid gap-2">
                      {theatre.tables?.length ? (
                        theatre.tables.map((tbl) => (
                          <div
                            key={tbl.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-zc-text">{tbl.name}</span>
                            {canUpdate ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                onClick={() => void deleteTable(theatre, tbl.id)}
                                title="Remove table"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zc-border p-4 text-xs text-zc-muted">
                          No OT tables configured.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })
      )}

      {/* Add table inline dialog */}
      {addTableFor ? (
        <Dialog open onOpenChange={(v) => { if (!v) setAddTableFor(null); }}>
          <DialogContent className={cn("w-[95vw] sm:max-w-[440px]")}>
            <ModalHeader
              title="Add OT Table"
              description={`Theatre: ${addTableFor.name}`}
              onClose={() => setAddTableFor(null)}
            />
            <div className="grid gap-4">
              <Field label="Table Name" required>
                <Input
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. OT Table 1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addTable(); } }}
                />
              </Field>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setAddTableFor(null)}>Cancel</Button>
              <Button onClick={() => void addTable()} disabled={!newTableName.trim()}>Add Table</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Engineering Drawer */}
      <EngineeringDrawer
        open={!!engDrawer}
        onOpenChange={(v) => { if (!v) setEngDrawer(null); }}
        suiteId={suiteId}
        theatre={engDrawer}
        onSaved={() => void load(false)}
      />

      {/* Specialties Drawer */}
      <SpecialtiesDrawer
        open={!!specDrawer}
        onOpenChange={(v) => { if (!v) setSpecDrawer(null); }}
        suiteId={suiteId}
        theatre={specDrawer}
        onSaved={() => void load(false)}
      />

      {/* Scheduling Drawer */}
      <SchedulingDrawer
        open={!!schedDrawer}
        onOpenChange={(v) => { if (!v) setSchedDrawer(null); }}
        suiteId={suiteId}
        theatre={schedDrawer}
        onSaved={() => void load(false)}
      />

      {/* Onboarding */}
      <OnboardingCallout
        title="Theatre Configuration Guide"
        description="1) Review engineering specs for each theatre, 2) Assign surgical specialties, 3) Configure scheduling parameters, 4) Add OT tables. Ensure all theatres are configured before running validation."
      />
    </div>
  );
}

/* =========================================================
   Spec display helpers
   ========================================================= */

function SpecItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-zc-border bg-zc-panel/10 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zc-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-zc-text">
        {value != null && value !== "" ? String(value) : "\u2014"}
      </div>
    </div>
  );
}

function GasPill({ label, active, outlets }: { label: string; active?: boolean; outlets?: number | null }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        active
          ? "border-emerald-200/70 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
          : "border-zc-border bg-zc-panel/10 text-zc-muted",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 font-medium">
        {active ? `Available${outlets ? ` (${outlets} outlets)` : ""}` : "Not available"}
      </div>
    </div>
  );
}

/* =========================================================
   Engineering Drawer (OTS-014)
   ========================================================= */

function EngineeringDrawer({
  open,
  onOpenChange,
  suiteId,
  theatre,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suiteId: string;
  theatre: OtTheatreRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Form state
  const [area, setArea] = React.useState("");
  const [ceilingHeight, setCeilingHeight] = React.useState("");
  const [isoClass, setIsoClass] = React.useState("");
  const [airflow, setAirflow] = React.useState("");
  const [pressure, setPressure] = React.useState("");
  const [theatreType, setTheatreType] = React.useState<OtTheatreType>("STANDARD");
  const [gasO2, setGasO2] = React.useState(false);
  const [gasO2Outlets, setGasO2Outlets] = React.useState("");
  const [gasN2O, setGasN2O] = React.useState(false);
  const [gasN2OOutlets, setGasN2OOutlets] = React.useState("");
  const [gasAir, setGasAir] = React.useState(false);
  const [gasAirOutlets, setGasAirOutlets] = React.useState("");
  const [gasVacuum, setGasVacuum] = React.useState(false);
  const [gasVacuumOutlets, setGasVacuumOutlets] = React.useState("");
  const [upsOutlets, setUpsOutlets] = React.useState("");
  const [isolatedPowerSupply, setIsolatedPowerSupply] = React.useState(false);
  const [tempMin, setTempMin] = React.useState("");
  const [tempMax, setTempMax] = React.useState("");
  const [humidityMin, setHumidityMin] = React.useState("");
  const [humidityMax, setHumidityMax] = React.useState("");
  const [luxLevel, setLuxLevel] = React.useState("");
  const [emergencyLighting, setEmergencyLighting] = React.useState(false);

  // Reset form on open
  React.useEffect(() => {
    if (!open || !theatre) return;
    setArea(theatre.area != null ? String(theatre.area) : "");
    setCeilingHeight(theatre.ceilingHeight != null ? String(theatre.ceilingHeight) : "");
    setIsoClass(theatre.isoClass ?? "");
    setAirflow(theatre.airflow ?? "");
    setPressure(theatre.pressure ?? "");
    setTheatreType(theatre.type ?? "STANDARD");
    setGasO2(!!theatre.gasO2);
    setGasO2Outlets(theatre.gasO2Outlets != null ? String(theatre.gasO2Outlets) : "");
    setGasN2O(!!theatre.gasN2O);
    setGasN2OOutlets(theatre.gasN2OOutlets != null ? String(theatre.gasN2OOutlets) : "");
    setGasAir(!!theatre.gasAir);
    setGasAirOutlets(theatre.gasAirOutlets != null ? String(theatre.gasAirOutlets) : "");
    setGasVacuum(!!theatre.gasVacuum);
    setGasVacuumOutlets(theatre.gasVacuumOutlets != null ? String(theatre.gasVacuumOutlets) : "");
    setUpsOutlets(theatre.upsOutlets != null ? String(theatre.upsOutlets) : "");
    setIsolatedPowerSupply(!!theatre.isolatedPowerSupply);
    setTempMin(theatre.tempMin != null ? String(theatre.tempMin) : "");
    setTempMax(theatre.tempMax != null ? String(theatre.tempMax) : "");
    setHumidityMin(theatre.humidityMin != null ? String(theatre.humidityMin) : "");
    setHumidityMax(theatre.humidityMax != null ? String(theatre.humidityMax) : "");
    setLuxLevel(theatre.luxLevel != null ? String(theatre.luxLevel) : "");
    setEmergencyLighting(!!theatre.emergencyLighting);
    setErr(null);
  }, [open, theatre]);

  function toNum(v: string): number | null {
    const n = Number(v);
    return v.trim() !== "" && !Number.isNaN(n) ? n : null;
  }

  async function save() {
    if (!theatre) return;
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(
        `/api/infrastructure/ot/theatres/suites/${suiteId}/theatres/${theatre.id}/engineering`,
        {
          method: "PATCH",
          body: JSON.stringify({
            area: toNum(area),
            ceilingHeight: toNum(ceilingHeight),
            isoClass: isoClass.trim() || null,
            airflow: airflow.trim() || null,
            pressure: pressure.trim() || null,
            theatreType,
            gasO2,
            gasO2Outlets: toNum(gasO2Outlets),
            gasN2O,
            gasN2OOutlets: toNum(gasN2OOutlets),
            gasAir,
            gasAirOutlets: toNum(gasAirOutlets),
            gasVacuum,
            gasVacuumOutlets: toNum(gasVacuumOutlets),
            upsOutlets: toNum(upsOutlets),
            isolatedPowerSupply,
            tempMin: toNum(tempMin),
            tempMax: toNum(tempMax),
            humidityMin: toNum(humidityMin),
            humidityMax: toNum(humidityMax),
            luxLevel: toNum(luxLevel),
            emergencyLighting,
          }),
        },
      );
      toast({ title: "Engineering specs updated" });
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
          title="Engineering Specifications"
          description={theatre?.name ?? "Theatre"}
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-5">
          <ErrorAlert message={err} />

          {/* Dimensions & Classification */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Dimensions & Classification</div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Area (sq ft)">
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. 400" />
            </Field>
            <Field label="Ceiling Height (ft)">
              <Input value={ceilingHeight} onChange={(e) => setCeilingHeight(e.target.value)} placeholder="e.g. 10" />
            </Field>
            <Field label="ISO Class">
              <Input value={isoClass} onChange={(e) => setIsoClass(e.target.value)} placeholder="e.g. ISO 5" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Airflow">
              <Input value={airflow} onChange={(e) => setAirflow(e.target.value)} placeholder="e.g. Laminar / Turbulent" />
            </Field>
            <Field label="Pressure">
              <Input value={pressure} onChange={(e) => setPressure(e.target.value)} placeholder="e.g. Positive" />
            </Field>
            <Field label="Theatre Type">
              <Select value={theatreType} onValueChange={(v) => setTheatreType(v as OtTheatreType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THEATRE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          {/* Gas Pipelines */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Gas Pipelines</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zc-text">Oxygen (O2)</span>
                <Switch checked={gasO2} onCheckedChange={setGasO2} />
              </div>
              {gasO2 ? (
                <Field label="O2 Outlets">
                  <Input value={gasO2Outlets} onChange={(e) => setGasO2Outlets(e.target.value)} placeholder="0" />
                </Field>
              ) : null}
            </div>
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zc-text">Nitrous Oxide (N2O)</span>
                <Switch checked={gasN2O} onCheckedChange={setGasN2O} />
              </div>
              {gasN2O ? (
                <Field label="N2O Outlets">
                  <Input value={gasN2OOutlets} onChange={(e) => setGasN2OOutlets(e.target.value)} placeholder="0" />
                </Field>
              ) : null}
            </div>
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zc-text">Medical Air</span>
                <Switch checked={gasAir} onCheckedChange={setGasAir} />
              </div>
              {gasAir ? (
                <Field label="Air Outlets">
                  <Input value={gasAirOutlets} onChange={(e) => setGasAirOutlets(e.target.value)} placeholder="0" />
                </Field>
              ) : null}
            </div>
            <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zc-text">Vacuum</span>
                <Switch checked={gasVacuum} onCheckedChange={setGasVacuum} />
              </div>
              {gasVacuum ? (
                <Field label="Vacuum Outlets">
                  <Input value={gasVacuumOutlets} onChange={(e) => setGasVacuumOutlets(e.target.value)} placeholder="0" />
                </Field>
              ) : null}
            </div>
          </div>

          <Separator />

          {/* Electrical */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Electrical</div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="UPS Outlets">
              <Input value={upsOutlets} onChange={(e) => setUpsOutlets(e.target.value)} placeholder="0" />
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <span className="text-sm font-medium text-zc-text">Isolated Power Supply</span>
              <Switch checked={isolatedPowerSupply} onCheckedChange={setIsolatedPowerSupply} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <span className="text-sm font-medium text-zc-text">Emergency Lighting</span>
              <Switch checked={emergencyLighting} onCheckedChange={setEmergencyLighting} />
            </div>
          </div>

          <Separator />

          {/* Environment */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Environment</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Temp Min (\u00B0C)">
                <Input value={tempMin} onChange={(e) => setTempMin(e.target.value)} placeholder="18" />
              </Field>
              <Field label="Temp Max (\u00B0C)">
                <Input value={tempMax} onChange={(e) => setTempMax(e.target.value)} placeholder="24" />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Humidity Min (%)">
                <Input value={humidityMin} onChange={(e) => setHumidityMin(e.target.value)} placeholder="30" />
              </Field>
              <Field label="Humidity Max (%)">
                <Input value={humidityMax} onChange={(e) => setHumidityMax(e.target.value)} placeholder="60" />
              </Field>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Lux Level">
              <Input value={luxLevel} onChange={(e) => setLuxLevel(e.target.value)} placeholder="e.g. 1000" />
            </Field>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save Engineering Specs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Specialties Drawer (OTS-015)
   ========================================================= */

function SpecialtiesDrawer({
  open,
  onOpenChange,
  suiteId,
  theatre,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suiteId: string;
  theatre: OtTheatreRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [codes, setCodes] = React.useState("");

  React.useEffect(() => {
    if (!open || !theatre) return;
    setCodes((theatre.specialtyCodes ?? []).join(", "));
    setErr(null);
  }, [open, theatre]);

  async function save() {
    if (!theatre) return;
    setSaving(true);
    setErr(null);
    try {
      const specialtyCodes = codes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await apiFetch(
        `/api/infrastructure/ot/theatres/suites/${suiteId}/theatres/${theatre.id}/specialties`,
        {
          method: "PATCH",
          body: JSON.stringify({ specialtyCodes }),
        },
      );
      toast({ title: "Specialties updated" });
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Preview tags
  const preview = codes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName("max-w-[640px]")}>
        <ModalHeader
          title="Theatre Specialties"
          description={theatre?.name ?? "Theatre"}
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-5">
          <ErrorAlert message={err} />

          <Field
            label="Specialty Codes"
            hint="Comma-separated codes, e.g. ORTHO, CARDIAC, GENERAL"
          >
            <Input
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="ORTHO, CARDIAC, GENERAL"
            />
          </Field>

          {/* Preview */}
          {preview.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted mb-2">Preview</div>
              <div className="flex flex-wrap gap-2">
                {preview.map((code, i) => (
                  <Badge key={`${code}-${i}`} variant="outline" className="text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save Specialties"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Scheduling Drawer (OTS-016)
   ========================================================= */

function SchedulingDrawer({
  open,
  onOpenChange,
  suiteId,
  theatre,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suiteId: string;
  theatre: OtTheatreRow | null;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [turnaroundTimeMin, setTurnaroundTimeMin] = React.useState("");
  const [cleaningTimeMin, setCleaningTimeMin] = React.useState("");
  const [maxCasesPerDay, setMaxCasesPerDay] = React.useState("");
  const [defaultSlotMinor, setDefaultSlotMinor] = React.useState("");
  const [defaultSlotMajor, setDefaultSlotMajor] = React.useState("");
  const [defaultSlotComplex, setDefaultSlotComplex] = React.useState("");
  const [bufferEmergencyMin, setBufferEmergencyMin] = React.useState("");
  const [isEmergencyEligible, setIsEmergencyEligible] = React.useState(false);
  const [is24x7Emergency, setIs24x7Emergency] = React.useState(false);

  React.useEffect(() => {
    if (!open || !theatre) return;
    setTurnaroundTimeMin(theatre.turnaroundTimeMin != null ? String(theatre.turnaroundTimeMin) : "");
    setCleaningTimeMin(theatre.cleaningTimeMin != null ? String(theatre.cleaningTimeMin) : "");
    setMaxCasesPerDay(theatre.maxCasesPerDay != null ? String(theatre.maxCasesPerDay) : "");
    setDefaultSlotMinor(theatre.defaultSlotMinor != null ? String(theatre.defaultSlotMinor) : "");
    setDefaultSlotMajor(theatre.defaultSlotMajor != null ? String(theatre.defaultSlotMajor) : "");
    setDefaultSlotComplex(theatre.defaultSlotComplex != null ? String(theatre.defaultSlotComplex) : "");
    setBufferEmergencyMin(theatre.bufferEmergencyMin != null ? String(theatre.bufferEmergencyMin) : "");
    setIsEmergencyEligible(!!theatre.isEmergencyEligible);
    setIs24x7Emergency(!!theatre.is24x7Emergency);
    setErr(null);
  }, [open, theatre]);

  function toNum(v: string): number | null {
    const n = Number(v);
    return v.trim() !== "" && !Number.isNaN(n) ? n : null;
  }

  async function save() {
    if (!theatre) return;
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(
        `/api/infrastructure/ot/theatres/suites/${suiteId}/theatres/${theatre.id}/scheduling-params`,
        {
          method: "PATCH",
          body: JSON.stringify({
            turnaroundTimeMin: toNum(turnaroundTimeMin),
            cleaningTimeMin: toNum(cleaningTimeMin),
            maxCasesPerDay: toNum(maxCasesPerDay),
            defaultSlotMinor: toNum(defaultSlotMinor),
            defaultSlotMajor: toNum(defaultSlotMajor),
            defaultSlotComplex: toNum(defaultSlotComplex),
            bufferEmergencyMin: toNum(bufferEmergencyMin),
            isEmergencyEligible,
            is24x7Emergency,
          }),
        },
      );
      toast({ title: "Scheduling parameters updated" });
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
      <DialogContent className={drawerClassName("max-w-[720px]")}>
        <ModalHeader
          title="Scheduling Parameters"
          description={theatre?.name ?? "Theatre"}
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-5">
          <ErrorAlert message={err} />

          {/* Timing */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Timing</div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Turnaround Time (min)" hint="Between cases">
              <Input value={turnaroundTimeMin} onChange={(e) => setTurnaroundTimeMin(e.target.value)} placeholder="15" />
            </Field>
            <Field label="Cleaning Time (min)">
              <Input value={cleaningTimeMin} onChange={(e) => setCleaningTimeMin(e.target.value)} placeholder="30" />
            </Field>
            <Field label="Max Cases / Day">
              <Input value={maxCasesPerDay} onChange={(e) => setMaxCasesPerDay(e.target.value)} placeholder="8" />
            </Field>
          </div>

          <Separator />

          {/* Default Slot Durations */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Default Slot Durations (minutes)</div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Minor Surgery">
              <Input value={defaultSlotMinor} onChange={(e) => setDefaultSlotMinor(e.target.value)} placeholder="45" />
            </Field>
            <Field label="Major Surgery">
              <Input value={defaultSlotMajor} onChange={(e) => setDefaultSlotMajor(e.target.value)} placeholder="120" />
            </Field>
            <Field label="Complex Surgery">
              <Input value={defaultSlotComplex} onChange={(e) => setDefaultSlotComplex(e.target.value)} placeholder="240" />
            </Field>
          </div>

          <Separator />

          {/* Emergency */}
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Emergency Configuration</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Emergency Buffer (min)" hint="Reserved buffer for emergencies">
              <Input value={bufferEmergencyMin} onChange={(e) => setBufferEmergencyMin(e.target.value)} placeholder="60" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div>
                <span className="text-sm font-medium text-zc-text">Emergency Eligible</span>
                <div className="text-xs text-zc-muted">Can this theatre handle emergency cases?</div>
              </div>
              <Switch checked={isEmergencyEligible} onCheckedChange={setIsEmergencyEligible} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div>
                <span className="text-sm font-medium text-zc-text">24x7 Emergency</span>
                <div className="text-xs text-zc-muted">Round-the-clock emergency availability?</div>
              </div>
              <Switch checked={is24x7Emergency} onCheckedChange={setIs24x7Emergency} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save Scheduling Params"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
