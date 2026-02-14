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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus } from "@/components/icons";
import {
  AlertTriangle,
  Droplets,
  Loader2,
  Pencil,
  RefreshCw,
  Settings,
  ClipboardList,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FacilityConfig = {
  id?: string;
  branchId?: string;
  drugLicenseNo?: string | null;
  licenseValidTo?: string | null;
  sbtcRegNo?: string | null;
  nacoId?: string | null;
  facilityType?: string | null;
  operatingHoursJson?: string | null;
  physicalLayoutJson?: string | null;
  storageCapacityUnits?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type FacilityForm = {
  drugLicenseNo: string;
  licenseValidTo: string;
  sbtcRegNo: string;
  nacoId: string;
  facilityType: string;
  operatingHoursJson: string;
  physicalLayoutJson: string;
  storageCapacityUnits: string;
};

type MsbosRow = {
  id?: string;
  branchId?: string;
  procedureCode: string;
  procedureName: string;
  recommendedPRBC: number;
  recommendedFFP: number;
  recommendedPlatelet: number;
  createdAt?: string;
  updatedAt?: string;
};

type MsbosForm = {
  procedureCode: string;
  procedureName: string;
  recommendedPRBC: string;
  recommendedFFP: string;
  recommendedPlatelet: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const FACILITY_TYPES = [
  { value: "HOSPITAL_BASED", label: "Hospital Based" },
  { value: "STANDALONE", label: "Standalone" },
  { value: "STORAGE_CENTRE", label: "Storage Centre" },
  { value: "COMPONENT_SEPARATION_CENTRE", label: "Component Separation Centre" },
] as const;

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

function facilityTypeLabel(value: string | null | undefined): string {
  if (!value) return "\u2014";
  const match = FACILITY_TYPES.find((t) => t.value === value);
  return match ? match.label : value;
}

function emptyFacilityForm(): FacilityForm {
  return {
    drugLicenseNo: "",
    licenseValidTo: "",
    sbtcRegNo: "",
    nacoId: "",
    facilityType: "",
    operatingHoursJson: "",
    physicalLayoutJson: "",
    storageCapacityUnits: "",
  };
}

function facilityToForm(f: FacilityConfig | null): FacilityForm {
  if (!f) return emptyFacilityForm();
  return {
    drugLicenseNo: f.drugLicenseNo ?? "",
    licenseValidTo: f.licenseValidTo ? String(f.licenseValidTo).slice(0, 10) : "",
    sbtcRegNo: f.sbtcRegNo ?? "",
    nacoId: f.nacoId ?? "",
    facilityType: f.facilityType ?? "",
    operatingHoursJson: f.operatingHoursJson ?? "",
    physicalLayoutJson: f.physicalLayoutJson ?? "",
    storageCapacityUnits:
      f.storageCapacityUnits != null ? String(f.storageCapacityUnits) : "",
  };
}

function emptyMsbosForm(): MsbosForm {
  return {
    procedureCode: "",
    procedureName: "",
    recommendedPRBC: "",
    recommendedFFP: "",
    recommendedPlatelet: "",
  };
}

function msbosToForm(m: MsbosRow): MsbosForm {
  return {
    procedureCode: m.procedureCode ?? "",
    procedureName: m.procedureName ?? "",
    recommendedPRBC: String(m.recommendedPRBC ?? ""),
    recommendedFFP: String(m.recommendedFFP ?? ""),
    recommendedPlatelet: String(m.recommendedPlatelet ?? ""),
  };
}

/* ------------------------------------------------------------------ */
/*  Facility Editor Dialog                                             */
/* ------------------------------------------------------------------ */

function FacilityEditorDialog({
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  open: boolean;
  initial: FacilityConfig | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FacilityForm>(emptyFacilityForm());

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm(facilityToForm(initial));
  }, [open, initial]);

  function set<K extends keyof FacilityForm>(key: K, value: FacilityForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!branchId) return setErr("No branch selected");

    const storageNum = form.storageCapacityUnits.trim()
      ? Number(form.storageCapacityUnits)
      : undefined;
    if (
      storageNum !== undefined &&
      (!Number.isFinite(storageNum) || storageNum < 0)
    ) {
      return setErr("Storage capacity must be a non-negative number");
    }

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/facility", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          drugLicenseNo: form.drugLicenseNo.trim() || null,
          licenseValidTo: form.licenseValidTo || null,
          sbtcRegNo: form.sbtcRegNo.trim() || null,
          nacoId: form.nacoId.trim() || null,
          facilityType: form.facilityType || null,
          operatingHoursJson: form.operatingHoursJson.trim() || null,
          physicalLayoutJson: form.physicalLayoutJson.trim() || null,
          storageCapacityUnits: storageNum ?? null,
        }),
      });

      await onSaved();
      toast({
        title: "Facility Configuration Saved",
        description: "Blood bank facility configuration has been updated.",
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Save failed",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
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
              <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Configure Facility
          </DialogTitle>
          <DialogDescription>
            Set up or update the blood bank facility configuration for this
            branch, including licensing, facility type and physical layout.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Basic Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Drug License No.</Label>
                <Input
                  value={form.drugLicenseNo}
                  onChange={(e) => set("drugLicenseNo", e.target.value)}
                  placeholder="e.g. DL-12345"
                />
              </div>

              <div className="grid gap-2">
                <Label>License Valid To</Label>
                <Input
                  value={form.licenseValidTo}
                  onChange={(e) => set("licenseValidTo", e.target.value)}
                  type="date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SBTC Registration No.</Label>
                <Input
                  value={form.sbtcRegNo}
                  onChange={(e) => set("sbtcRegNo", e.target.value)}
                  placeholder="State Blood Transfusion Council Reg. No."
                />
              </div>

              <div className="grid gap-2">
                <Label>NACO ID</Label>
                <Input
                  value={form.nacoId}
                  onChange={(e) => set("nacoId", e.target.value)}
                  placeholder="National AIDS Control Organisation ID"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Facility Details */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Facility Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Facility Type</Label>
                <Select
                  value={form.facilityType}
                  onValueChange={(v) => set("facilityType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Operating Hours</Label>
                <Textarea
                  value={form.operatingHoursJson}
                  onChange={(e) => set("operatingHoursJson", e.target.value)}
                  placeholder='e.g. {"mon-sat":"08:00-20:00","sun":"closed"}'
                  className="min-h-[72px]"
                />
                <p className="text-[11px] text-zc-muted">
                  JSON or free-text description of operating hours.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Physical Layout */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Physical Layout
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Physical Layout</Label>
                <Textarea
                  value={form.physicalLayoutJson}
                  onChange={(e) => set("physicalLayoutJson", e.target.value)}
                  placeholder='e.g. {"donorArea":true,"componentLab":true,"storage":true}'
                  className="min-h-[72px]"
                />
                <p className="text-[11px] text-zc-muted">
                  JSON description of the physical layout and areas.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Storage Capacity (Units)</Label>
                <Input
                  value={form.storageCapacityUnits}
                  onChange={(e) => set("storageCapacityUnits", e.target.value)}
                  placeholder="e.g. 500"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">
                  Maximum number of blood units the facility can store.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  MSBOS Editor Dialog                                                */
/* ------------------------------------------------------------------ */

function MsbosEditorDialog({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: MsbosRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<MsbosForm>(emptyMsbosForm());

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm(mode === "edit" && initial ? msbosToForm(initial) : emptyMsbosForm());
  }, [open, initial, mode]);

  function set<K extends keyof MsbosForm>(key: K, value: MsbosForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);
    if (!branchId) return setErr("No branch selected");

    if (!form.procedureCode.trim()) return setErr("Procedure code is required");
    if (!form.procedureName.trim()) return setErr("Procedure name is required");

    const prbc = Number(form.recommendedPRBC || "0");
    const ffp = Number(form.recommendedFFP || "0");
    const platelet = Number(form.recommendedPlatelet || "0");

    if (!Number.isFinite(prbc) || prbc < 0)
      return setErr("PRBC units must be a non-negative number");
    if (!Number.isFinite(ffp) || ffp < 0)
      return setErr("FFP units must be a non-negative number");
    if (!Number.isFinite(platelet) || platelet < 0)
      return setErr("Platelet units must be a non-negative number");

    setBusy(true);
    try {
      await apiFetch("/api/blood-bank/msbos", {
        method: "POST",
        body: JSON.stringify({
          ...(mode === "edit" && initial?.id ? { id: initial.id } : {}),
          branchId,
          procedureCode: form.procedureCode.trim(),
          procedureName: form.procedureName.trim(),
          recommendedPRBC: prbc,
          recommendedFFP: ffp,
          recommendedPlatelet: platelet,
        }),
      });

      await onSaved();
      toast({
        title: mode === "create" ? "MSBOS Entry Created" : "MSBOS Entry Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} MSBOS entry for "${form.procedureName.trim()}"`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Save failed",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
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
              <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Add MSBOS Entry" : "Edit MSBOS Entry"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define the Maximum Surgical Blood Order Schedule entry for a procedure."
              : "Update the MSBOS recommendation for this procedure."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Procedure Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Procedure Code</Label>
                <Input
                  value={form.procedureCode}
                  onChange={(e) => set("procedureCode", e.target.value)}
                  placeholder="e.g. CABG-01"
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label>Procedure Name</Label>
                <Input
                  value={form.procedureName}
                  onChange={(e) => set("procedureName", e.target.value)}
                  placeholder="e.g. Coronary Artery Bypass Graft"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Recommended Units
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>PRBC Units</Label>
                <Input
                  value={form.recommendedPRBC}
                  onChange={(e) => set("recommendedPRBC", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">
                  Packed Red Blood Cells
                </p>
              </div>

              <div className="grid gap-2">
                <Label>FFP Units</Label>
                <Input
                  value={form.recommendedFFP}
                  onChange={(e) => set("recommendedFFP", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">
                  Fresh Frozen Plasma
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Platelet Units</Label>
                <Input
                  value={form.recommendedPlatelet}
                  onChange={(e) => set("recommendedPlatelet", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">
                  Platelet Concentrates
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Add Entry" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function BBFacilitySetupPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canReadFacility = hasPerm(user, "BB_FACILITY_READ");
  const canUpdateFacility = hasPerm(user, "BB_FACILITY_UPDATE");
  const canReadMsbos = hasPerm(user, "BB_MSBOS_READ");
  const canUpdateMsbos = hasPerm(user, "BB_MSBOS_UPDATE");

  /* ---- Facility state ---- */
  const [facility, setFacility] = React.useState<FacilityConfig | null>(null);
  const [facilityLoading, setFacilityLoading] = React.useState(false);
  const [facilityErr, setFacilityErr] = React.useState<string | null>(null);
  const [facilityOpen, setFacilityOpen] = React.useState(false);

  /* ---- MSBOS state ---- */
  const [msbosRows, setMsbosRows] = React.useState<MsbosRow[]>([]);
  const [msbosLoading, setMsbosLoading] = React.useState(false);
  const [msbosErr, setMsbosErr] = React.useState<string | null>(null);
  const [msbosQ, setMsbosQ] = React.useState("");

  const [msbosCreateOpen, setMsbosCreateOpen] = React.useState(false);
  const [msbosEditOpen, setMsbosEditOpen] = React.useState(false);
  const [selectedMsbos, setSelectedMsbos] = React.useState<MsbosRow | null>(
    null,
  );

  /* ---- Filtered MSBOS ---- */
  const filteredMsbos = React.useMemo(() => {
    const s = msbosQ.trim().toLowerCase();
    if (!s) return msbosRows;
    return msbosRows.filter((m) => {
      const hay =
        `${m.procedureCode} ${m.procedureName}`.toLowerCase();
      return hay.includes(s);
    });
  }, [msbosRows, msbosQ]);

  /* ---- Refresh functions ---- */
  async function refreshFacility(showToast = false) {
    if (!branchId) return;
    setFacilityErr(null);
    setFacilityLoading(true);
    try {
      const data = await apiFetch<FacilityConfig | null>(
        `/api/blood-bank/facility?branchId=${branchId}`,
      );
      setFacility(data ?? null);
      if (showToast) {
        toast({
          title: "Facility config refreshed",
          description: "Loaded latest facility configuration.",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load facility configuration";
      setFacilityErr(msg);
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: msg,
      });
    } finally {
      setFacilityLoading(false);
    }
  }

  async function refreshMsbos(showToast = false) {
    if (!branchId) return;
    setMsbosErr(null);
    setMsbosLoading(true);
    try {
      const data = await apiFetch<MsbosRow[]>(
        `/api/blood-bank/msbos?branchId=${branchId}`,
      );
      const sorted = [...(data ?? [])].sort((a, b) =>
        (a.procedureCode || "").localeCompare(b.procedureCode || ""),
      );
      setMsbosRows(sorted);
      if (showToast) {
        toast({
          title: "MSBOS refreshed",
          description: `Loaded ${sorted.length} MSBOS entries.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load MSBOS entries";
      setMsbosErr(msg);
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: msg,
      });
    } finally {
      setMsbosLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    await Promise.all([refreshFacility(showToast), refreshMsbos(showToast)]);
  }

  React.useEffect(() => {
    if (branchId) {
      void refreshAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- Derived stats ---- */
  const licenseStatus = facility?.drugLicenseNo || "Not Configured";
  const facilityTypeDisplay = facilityTypeLabel(facility?.facilityType);
  const msbosCount = msbosRows.length;

  const loading = facilityLoading || msbosLoading;

  return (
    <AppShell title="BB Facility Setup">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Droplets className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                BB Facility Setup
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage Blood Bank facility configuration and Maximum Surgical
                Blood Order Schedule (MSBOS) for the current branch.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 px-5"
              onClick={() => void refreshAll(true)}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>

            {canUpdateFacility ? (
              <Button
                variant="primary"
                className="gap-2 px-5"
                onClick={() => setFacilityOpen(true)}
              >
                <Settings className="h-4 w-4" />
                Configure Facility
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview Stats */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Blood bank facility configuration status and MSBOS summary for the
              current branch.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  License Status
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {licenseStatus}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Facility Type
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {facilityTypeDisplay}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  MSBOS Entries
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {msbosCount}
                </div>
              </div>
            </div>

            {facilityErr ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{facilityErr}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* MSBOS Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  MSBOS (Maximum Surgical Blood Order Schedule)
                </CardTitle>
                <CardDescription className="text-sm">
                  Pre-defined blood component requirements per surgical
                  procedure.
                </CardDescription>
              </div>
              {canUpdateMsbos ? (
                <Button
                  variant="primary"
                  className="gap-2 px-5"
                  onClick={() => setMsbosCreateOpen(true)}
                >
                  <IconPlus className="h-4 w-4" />
                  Add MSBOS Entry
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={msbosQ}
                  onChange={(e) => setMsbosQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by procedure code or name..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing{" "}
                <span className="font-semibold tabular-nums text-zc-text">
                  {filteredMsbos.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-zc-text">
                  {msbosRows.length}
                </span>
              </div>
            </div>

            {msbosErr ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{msbosErr}</div>
              </div>
            ) : null}
          </CardContent>

          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Procedure Code
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Procedure Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    PRBC Units
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    FFP Units
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Platelet Units
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!filteredMsbos.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {msbosLoading
                        ? "Loading MSBOS entries..."
                        : "No MSBOS entries found."}
                    </td>
                  </tr>
                ) : null}

                {filteredMsbos.map((m, idx) => (
                  <tr
                    key={m.id ?? idx}
                    className="border-t border-zc-border hover:bg-zc-panel/20"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {m.procedureCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">
                        {m.procedureName}
                      </div>
                    </td>

                    <td className="px-4 py-3 tabular-nums text-zc-text">
                      {m.recommendedPRBC}
                    </td>

                    <td className="px-4 py-3 tabular-nums text-zc-text">
                      {m.recommendedFFP}
                    </td>

                    <td className="px-4 py-3 tabular-nums text-zc-text">
                      {m.recommendedPlatelet}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdateMsbos ? (
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => {
                              setSelectedMsbos(m);
                              setMsbosEditOpen(true);
                            }}
                            title="Edit MSBOS entry"
                            aria-label="Edit MSBOS entry"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                Setup Guide
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Configure the Blood Bank Facility (license, type, layout),
                then 2) Define MSBOS entries for surgical procedures to
                standardise blood ordering across the branch.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FacilityEditorDialog
        open={facilityOpen}
        initial={facility}
        onClose={() => setFacilityOpen(false)}
        onSaved={() => refreshFacility(false)}
        canSubmit={canUpdateFacility}
        deniedMessage="Missing permission: BB_FACILITY_UPDATE"
        branchId={branchId ?? ""}
      />

      <MsbosEditorDialog
        mode="create"
        open={msbosCreateOpen}
        initial={null}
        onClose={() => setMsbosCreateOpen(false)}
        onSaved={() => refreshMsbos(false)}
        canSubmit={canUpdateMsbos}
        deniedMessage="Missing permission: BB_MSBOS_UPDATE"
        branchId={branchId ?? ""}
      />

      <MsbosEditorDialog
        mode="edit"
        open={msbosEditOpen}
        initial={selectedMsbos}
        onClose={() => setMsbosEditOpen(false)}
        onSaved={() => refreshMsbos(false)}
        canSubmit={canUpdateMsbos}
        deniedMessage="Missing permission: BB_MSBOS_UPDATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
