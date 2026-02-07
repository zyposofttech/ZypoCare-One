"use client";
import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Building2, Loader2, Pencil, RefreshCw, ToggleLeft, ToggleRight, Trash2, Wand2 } from "lucide-react";

type BranchCounts = Record<string, number | undefined>;

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;

  isActive?: boolean;

  // Required configuration fields (API-enforced)
  legalEntityName?: string | null;

  address?: string | null;
  pinCode?: string | null;
  state?: string | null;
  country?: string | null;

  contactPhone1?: string | null;
  contactPhone2?: string | null;
  contactEmail?: string | null;

  gstNumber?: string | null;
  panNumber?: string | null;
  clinicalEstRegNumber?: string | null;
  rohiniId?: string | null;
  hfrId?: string | null;

  // Optional branding / links
  logoUrl?: string | null;
  website?: string | null;
  socialLinks?: any;
  accreditations?: any;
  bedCount?: number | null;
  establishedDate?: string | null;

  // Settings
  defaultCurrency?: string | null;
  timezone?: string | null;
  fiscalYearStartMonth?: number | null;
  workingHours?: any;
  emergency24x7?: boolean | null;
  multiLanguageSupport?: boolean | null;
  supportedLanguages?: any;

  createdAt?: string;
  updatedAt?: string;

  _count?: BranchCounts;

  // fallback shape if your API sends these directly
  facilitiesCount?: number;
  departmentsCount?: number;
  specialtiesCount?: number;
};

type BranchForm = {
  code: string;
  name: string;
  city: string;

  legalEntityName: string;

  address: string;
  pinCode: string;
  state: string;
  country: string;

  contactPhone1: string;
  contactPhone2: string;
  contactEmail: string;

  gstNumber: string;
  panNumber: string;
  clinicalEstRegNumber: string;
  rohiniId: string;
  hfrId: string;

  logoUrl: string;
  website: string;

  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  youtube: string;

  accreditationNabh: boolean;
  accreditationJci: boolean;

  bedCount: string;
  establishedDate: string;

  defaultCurrency: string;
  timezone: string;
  fiscalYearStartMonth: string;
  workingHoursText: string;
  emergency24x7: boolean;
  multiLanguageSupport: boolean;
  supportedLanguagesText: string; // comma-separated
};

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validateCode(code: string): string | null {
  const v = normalizeCode(code);
  if (!v) return "Branch code is required";
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(v)) {
    return "Code must be 2–32 chars, letters/numbers/hyphen (example: BLR-EC)";
  }
  return null;
}

function normalizeGSTIN(input: string) {
  return String(input || "").trim().toUpperCase();
}

/**
 * GSTIN format (India): 15 chars
 * Common validation regex (not perfect but strong enough for UI):
 *  2 digits + 5 letters + 4 digits + 1 letter + 1 alnum(1-9A-Z) + 'Z' + 1 alnum
 */
function validateGSTIN(gstin: string): string | null {
  const v = normalizeGSTIN(gstin);
  if (!v) return "GST Number (GSTIN) is required";
  if (v.length !== 15) return "GSTIN must be exactly 15 characters";
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!re.test(v)) return "Please enter a valid GSTIN (example: 29ABCDE1234F1Z5)";
  return null;
}

function normalizePAN(input: string) {
  return String(input || "").trim().toUpperCase();
}

function validatePAN(pan: string): string | null {
  const v = normalizePAN(pan);
  if (!v) return "PAN Number is required";
  const re = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!re.test(v)) return "Please enter a valid PAN (example: ABCDE1234F)";
  return null;
}

function validatePIN(pin: string): string | null {
  const v = String(pin || "").trim();
  if (!v) return "PIN code is required";
  if (!/^\d{6}$/.test(v)) return "PIN code must be 6 digits (e.g. 560100)";
  return null;
}

function getWorkingHoursText(input: any): string {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "object" && typeof input.text === "string") return input.text;
  return "";
}

function getSocialLink(input: any, key: string): string {
  if (!input || typeof input !== "object") return "";
  const v = (input as any)[key];
  return typeof v === "string" ? v : "";
}

function arrayToComma(input: any): string {
  if (!input) return "";
  if (Array.isArray(input)) return input.map((x) => String(x)).filter(Boolean).join(", ");
  return "";
}

function arrayHas(input: any, value: string): boolean {
  return Array.isArray(input) ? input.includes(value) : false;
}

function validateEmail(email: string): string | null {
  const v = String(email || "").trim();
  if (!v) return "Contact email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address";
  return null;
}

function validatePhone(phone: string, label: string): string | null {
  const v = String(phone || "").trim();
  if (!v) return `${label} is required`;
  if (!/^[0-9+][0-9()\-\s]{6,19}$/.test(v)) return `Please enter a valid ${label}`;
  return null;
}

function cityToCode(city: string): string {
  const c = (city || "").trim().toLowerCase();
  const map: Record<string, string> = {
    bengaluru: "BLR",
    bangalore: "BLR",
    mumbai: "MUM",
    bombay: "MUM",
    delhi: "DEL",
    "new delhi": "DEL",
    chennai: "CHE",
    kolkata: "KOL",
    hyderabad: "HYD",
    pune: "PUN",
    ahmedabad: "AMD",
  };
  if (map[c]) return map[c];
  const letters = c.replace(/[^a-z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "BR";
}

function wordsToInitials(input: string, maxLetters = 2): string {
  const parts = (input || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = parts
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .join("");

  if (initials.length >= 2) return initials.slice(0, maxLetters);

  const letters = (parts[0] || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, maxLetters);
}

function deriveBranchCode(name: string, city: string): string {
  const c = cityToCode(city);
  const n = wordsToInitials(name, 2);
  return `${c}-${n}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function pillTone(label: string) {
  const l = (label || "").toLowerCase();

  if (l.includes("facility"))
    return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
  if (l.includes("dept"))
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (l.includes("special"))
    return "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200";

  return "border-zc-border bg-zc-panel/30 text-zc-muted";
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

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTone(label))}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countOf(row: BranchRow, kind: "facilities" | "departments" | "specialties") {
  // direct counts from API (if present)
  if (kind === "facilities" && row.facilitiesCount != null) return safeNum(row.facilitiesCount);
  if (kind === "departments" && row.departmentsCount != null) return safeNum(row.departmentsCount);
  if (kind === "specialties" && row.specialtiesCount != null) return safeNum(row.specialtiesCount);

  // _count variants
  const c = row._count || {};
  if (kind === "facilities") return safeNum(c.facilities ?? c.branchFacilities ?? c.branchFacility ?? c.facilityLinks);
  if (kind === "departments") return safeNum(c.departments ?? c.department);
  if (kind === "specialties") return safeNum(c.specialties ?? c.specialty);

  return 0;
}

function countSum(rows: BranchRow[], kind: "facilities" | "departments" | "specialties") {
  return rows.reduce((acc, r) => acc + countOf(r, kind), 0);
}

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-zc-border bg-zc-card shadow-elev-2">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  branch,
  onClose,
  onDeleted,
  canDelete,
  deniedMessage,
}: {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
  canDelete: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  async function onConfirm() {
    if (!branch?.id) return;
    if (!canDelete) return setErr(deniedMessage);
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, { method: "DELETE" });
      await onDeleted();
      toast({
        title: "Branch Deleted (Hard)",
        description: `Hard deleted branch "${branch.name}"`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  const deps = countOf(branch, "facilities") + countOf(branch, "departments") + countOf(branch, "specialties");

  return (
    <ModalShell
      title="Hard Delete Branch"
      description="Hard delete is blocked if the branch has any configured setup data. Prefer Deactivate for retirement unless this is a test branch."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm font-semibold text-zc-text">
          {branch.name} <span className="font-mono text-xs text-zc-muted">({branch.code})</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Pill label="Facilities" value={countOf(branch, "facilities")} />
          <Pill label="Depts" value={countOf(branch, "departments")} />
          <Pill label="Specialties" value={countOf(branch, "specialties")} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
          <div className="min-w-0">
            If this branch already has Facilities/Departments/Specialties configured, deletion will be rejected. Prefer retiring via governance instead of deleting.
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy || deps > 0 || !canDelete} title={!canDelete ? deniedMessage : undefined} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Delete Permanently
        </Button>
      </div>
    </ModalShell>
  );
}

function ToggleActiveConfirmDialog({
  open,
  branch,
  action,
  onClose,
  onChanged,
  canUpdate,
  deniedMessage,
}: {
  open: boolean;
  branch: BranchRow | null;
  action: "deactivate" | "reactivate";
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  canUpdate: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }, [open]);

  const nextActive = action === "reactivate";
  const title = nextActive ? "Reactivate Branch" : "Deactivate Branch";
  const description = nextActive
    ? "This will re-enable the branch for operations. No data is deleted."
    : "This will retire the branch (soft toggle). No data is deleted, and you can reactivate later.";

  async function onConfirm() {
    if (!canUpdate) return setErr(deniedMessage);
    if (!branch?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}/${action}`, { method: "PATCH" });
      await onChanged();
      toast({
        title,
        description: `${nextActive ? "Reactivated" : "Deactivated"} "${branch.name}"`,
        variant: "success",
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className={drawerClassName("max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
          <div className="text-sm font-semibold text-zc-text">
            {branch.name} <span className="font-mono text-xs text-zc-muted">({branch.code})</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill label="Facilities" value={countOf(branch, "facilities")} />
            <Pill label="Depts" value={countOf(branch, "departments")} />
            <Pill label="Specialties" value={countOf(branch, "specialties")} />
          </div>
          <div className="mt-4 text-sm text-zc-muted">
            Tip: prefer deactivation for retirement. Hard delete should be used only for test branches with no dependent data.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={nextActive ? "success" : "secondary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Updating…" : nextActive ? "Reactivate" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BranchEditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: BranchRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState(false);

  const [form, setForm] = React.useState<BranchForm>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    city: initial?.city ?? "",

    legalEntityName: initial?.legalEntityName ?? "",

    address: initial?.address ?? "",
    pinCode: initial?.pinCode ?? "",
    state: initial?.state ?? "",
    country: initial?.country ?? "",

    contactPhone1: initial?.contactPhone1 ?? "",
    contactPhone2: initial?.contactPhone2 ?? "",
    contactEmail: initial?.contactEmail ?? "",

    gstNumber: initial?.gstNumber ?? "",
    panNumber: initial?.panNumber ?? "",
    clinicalEstRegNumber: initial?.clinicalEstRegNumber ?? "",
    rohiniId: initial?.rohiniId ?? "",
    hfrId: initial?.hfrId ?? "",

    logoUrl: initial?.logoUrl ?? "",
    website: initial?.website ?? "",

    facebook: getSocialLink(initial?.socialLinks, "facebook"),
    instagram: getSocialLink(initial?.socialLinks, "instagram"),
    linkedin: getSocialLink(initial?.socialLinks, "linkedin"),
    x: getSocialLink(initial?.socialLinks, "x"),
    youtube: getSocialLink(initial?.socialLinks, "youtube"),

    accreditationNabh: arrayHas(initial?.accreditations, "NABH"),
    accreditationJci: arrayHas(initial?.accreditations, "JCI"),

    bedCount: initial?.bedCount != null ? String(initial.bedCount) : "",
    establishedDate: initial?.establishedDate ? String(initial.establishedDate).slice(0, 10) : "",

    defaultCurrency: (initial?.defaultCurrency ?? "INR") || "INR",
    timezone: (initial?.timezone ?? "Asia/Kolkata") || "Asia/Kolkata",
    fiscalYearStartMonth: String(initial?.fiscalYearStartMonth ?? 4),
    workingHoursText: getWorkingHoursText(initial?.workingHours),
    emergency24x7: initial?.emergency24x7 ?? true,
    multiLanguageSupport: initial?.multiLanguageSupport ?? false,
    supportedLanguagesText: arrayToComma(initial?.supportedLanguages),
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setManualCode(false);

    setForm({
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      city: initial?.city ?? "",

      legalEntityName: initial?.legalEntityName ?? "",

      address: initial?.address ?? "",
      pinCode: initial?.pinCode ?? "",
      state: initial?.state ?? "",
      country: initial?.country ?? "",

      contactPhone1: initial?.contactPhone1 ?? "",
      contactPhone2: initial?.contactPhone2 ?? "",
      contactEmail: initial?.contactEmail ?? "",

      gstNumber: initial?.gstNumber ?? "",
      panNumber: initial?.panNumber ?? "",
      clinicalEstRegNumber: initial?.clinicalEstRegNumber ?? "",
      rohiniId: initial?.rohiniId ?? "",
      hfrId: initial?.hfrId ?? "",

      logoUrl: initial?.logoUrl ?? "",
      website: initial?.website ?? "",

      facebook: getSocialLink(initial?.socialLinks, "facebook"),
      instagram: getSocialLink(initial?.socialLinks, "instagram"),
      linkedin: getSocialLink(initial?.socialLinks, "linkedin"),
      x: getSocialLink(initial?.socialLinks, "x"),
      youtube: getSocialLink(initial?.socialLinks, "youtube"),

      accreditationNabh: arrayHas(initial?.accreditations, "NABH"),
      accreditationJci: arrayHas(initial?.accreditations, "JCI"),

      bedCount: initial?.bedCount != null ? String(initial.bedCount) : "",
      establishedDate: initial?.establishedDate ? String(initial.establishedDate).slice(0, 10) : "",

      defaultCurrency: (initial?.defaultCurrency ?? "INR") || "INR",
      timezone: (initial?.timezone ?? "Asia/Kolkata") || "Asia/Kolkata",
      fiscalYearStartMonth: String(initial?.fiscalYearStartMonth ?? 4),
      workingHoursText: getWorkingHoursText(initial?.workingHours),
      emergency24x7: initial?.emergency24x7 ?? true,
      multiLanguageSupport: initial?.multiLanguageSupport ?? false,
      supportedLanguagesText: arrayToComma(initial?.supportedLanguages),
    });
  }, [open, initial]);

  React.useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;
    if (manualCode) return;

    const next = deriveBranchCode(form.name, form.city);
    if (next && next !== form.code) setForm((s) => ({ ...s, code: next }));
  }, [open, mode, manualCode, form.name, form.city, form.code]);

  function set<K extends keyof BranchForm>(key: K, value: BranchForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (mode === "create") {
      const ce = validateCode(form.code);
      if (ce) return setErr(ce);
    }

    if (!form.name.trim()) return setErr("Branch name is required");
    if (!form.city.trim()) return setErr("City is required");
    if (!form.legalEntityName.trim()) return setErr("Legal entity name is required");

    const gstErr = validateGSTIN(form.gstNumber);
    if (gstErr) return setErr(gstErr);

    const panErr = validatePAN(form.panNumber);
    if (panErr) return setErr(panErr);

    if (!form.clinicalEstRegNumber.trim()) return setErr("Clinical establishment registration number is required");
    if (!form.address.trim()) return setErr("Branch address is required");

    const pinErr = validatePIN(form.pinCode);
    if (pinErr) return setErr(pinErr);

    const p1 = validatePhone(form.contactPhone1, "Contact number 1");
    if (p1) return setErr(p1);

    if (form.contactPhone2.trim()) {
      const p2 = validatePhone(form.contactPhone2, "Contact number 2");
      if (p2) return setErr(p2);
    }

    const em = validateEmail(form.contactEmail);
    if (em) return setErr(em);

    const fy = Number(form.fiscalYearStartMonth || "4");
    if (!Number.isInteger(fy) || fy < 1 || fy > 12) return setErr("Fiscal year start month must be between 1 and 12");

    const accreditations = [
      ...(form.accreditationNabh ? ["NABH"] : []),
      ...(form.accreditationJci ? ["JCI"] : []),
    ];

    const supportedLanguages = (form.supportedLanguagesText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const bedCount = form.bedCount.trim() ? Number(form.bedCount) : undefined;
    if (bedCount !== undefined && (!Number.isFinite(bedCount) || bedCount < 0)) {
      return setErr("Bed count must be a non-negative number");
    }

    setBusy(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/branches", {
          method: "POST",
          body: JSON.stringify({
            code: normalizeCode(form.code),
            name: form.name.trim(),
            city: form.city.trim(),

            legalEntityName: form.legalEntityName.trim(),

            address: form.address.trim(),
            pinCode: form.pinCode.trim(),
            state: form.state.trim() || undefined,
            country: form.country.trim() || undefined,

            contactPhone1: form.contactPhone1.trim(),
            contactPhone2: form.contactPhone2.trim() || null,
            contactEmail: form.contactEmail.trim().toLowerCase(),

            gstNumber: normalizeGSTIN(form.gstNumber),
            panNumber: normalizePAN(form.panNumber),
            clinicalEstRegNumber: form.clinicalEstRegNumber.trim(),
            rohiniId: form.rohiniId.trim() || null,
            hfrId: form.hfrId.trim() || null,

            logoUrl: form.logoUrl.trim() || null,
            website: form.website.trim() || null,

            facebook: form.facebook.trim() || null,
            instagram: form.instagram.trim() || null,
            linkedin: form.linkedin.trim() || null,
            x: form.x.trim() || null,
            youtube: form.youtube.trim() || null,

            accreditations,
            bedCount,
            establishedDate: form.establishedDate || null,

            defaultCurrency: (form.defaultCurrency.trim() || "INR").toUpperCase(),
            timezone: form.timezone.trim() || "Asia/Kolkata",
            fiscalYearStartMonth: fy,
            workingHoursText: form.workingHoursText.trim() || null,
            emergency24x7: Boolean(form.emergency24x7),
            multiLanguageSupport: Boolean(form.multiLanguageSupport),
            supportedLanguages: form.multiLanguageSupport ? supportedLanguages : [],
          }),
        });
      } else {
        if (!initial?.id) throw new Error("Missing branch id");
        await apiFetch(`/api/branches/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            city: form.city.trim(),

            legalEntityName: form.legalEntityName.trim(),

            address: form.address.trim(),
            pinCode: form.pinCode.trim(),
            state: form.state.trim() || null,
            country: form.country.trim() || null,

            contactPhone1: form.contactPhone1.trim(),
            contactPhone2: form.contactPhone2.trim() || null,
            contactEmail: form.contactEmail.trim().toLowerCase(),

            gstNumber: normalizeGSTIN(form.gstNumber),
            panNumber: normalizePAN(form.panNumber),
            clinicalEstRegNumber: form.clinicalEstRegNumber.trim(),
            rohiniId: form.rohiniId.trim() || null,
            hfrId: form.hfrId.trim() || null,

            logoUrl: form.logoUrl.trim() || null,
            website: form.website.trim() || null,

            facebook: form.facebook.trim() || null,
            instagram: form.instagram.trim() || null,
            linkedin: form.linkedin.trim() || null,
            x: form.x.trim() || null,
            youtube: form.youtube.trim() || null,

            accreditations,
            bedCount: form.bedCount.trim() ? Number(form.bedCount) : null,
            establishedDate: form.establishedDate || null,

            defaultCurrency: (form.defaultCurrency.trim() || "INR").toUpperCase(),
            timezone: form.timezone.trim() || "Asia/Kolkata",
            fiscalYearStartMonth: fy,
            workingHoursText: form.workingHoursText.trim() || null,
            emergency24x7: Boolean(form.emergency24x7),
            multiLanguageSupport: Boolean(form.multiLanguageSupport),
            supportedLanguages: form.multiLanguageSupport ? supportedLanguages : [],
          }),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Branch Created" : "Branch Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} branch "${form.name}"`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
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
          setManualCode(false);
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Create Branch" : "Edit Branch"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create the branch master (legal, contact, compliance & settings). Then configure Facilities → Departments → Specialties."
              : "Update branch identity, statutory numbers, contact and settings."}
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
          {/* Basics */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Basics</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Branch Name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Electronic City Campus" />
              </div>

              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bengaluru" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Legal Entity Name</Label>
              <Input value={form.legalEntityName} onChange={(e) => set("legalEntityName", e.target.value)} placeholder="e.g. ZypoCare Hospitals Pvt Ltd" />
              <p className="text-[11px] text-zc-muted">Printed on statutory reports, invoices and letterheads.</p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Branch Code</Label>
                {mode === "create" && !manualCode && form.code ? (
                  <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                    <Wand2 className="h-3 w-3" /> Auto-generated
                  </span>
                ) : null}
              </div>

              <div className="relative">
                <Input
                  value={form.code}
                  disabled={mode === "edit"}
                  onChange={(e) => {
                    set("code", e.target.value.toUpperCase());
                    if (mode === "create") setManualCode(true);
                  }}
                  placeholder="BLR-EC"
                  className={cn(
                    "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                    mode === "edit" && "opacity-80",
                  )}
                />

                {mode === "create" && !manualCode && form.code ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-7 w-7 text-zc-muted hover:text-zc-text"
                    title="Edit manually"
                    onClick={() => setManualCode(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                ) : null}
              </div>

              <p className="text-[11px] text-zc-muted">
                Example: <span className="font-mono">BLR-EC</span> (City code + Campus initials)
              </p>
            </div>
          </div>

          <Separator />

          {/* Statutory / Compliance */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Statutory & Registration</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>GST Number (GSTIN)</Label>
                <Input
                  value={form.gstNumber}
                  onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  maxLength={15}
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label>PAN Number</Label>
                <Input value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} placeholder="e.g. ABCDE1234F" maxLength={10} className="font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Clinical Establishment Registration No.</Label>
                <Input
                  value={form.clinicalEstRegNumber}
                  onChange={(e) => set("clinicalEstRegNumber", e.target.value)}
                  placeholder="Registration / License number"
                />
              </div>

              <div className="grid gap-2">
                <Label>ROHINI ID (optional)</Label>
                <Input value={form.rohiniId} onChange={(e) => set("rohiniId", e.target.value)} placeholder="If applicable" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>HFR ID (ABDM)</Label>
              <Input
                value={form.hfrId}
                onChange={(e) => set("hfrId", e.target.value)}
                placeholder="Auto-populated after ABDM registration"
                disabled={Boolean(initial?.hfrId)}
                className={cn(Boolean(initial?.hfrId) && "opacity-80")}
              />
              <p className="text-[11px] text-zc-muted">
                This is typically auto-populated after ABDM/HFR registration. You can leave it blank for now.
              </p>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Address</div>

            <div className="grid gap-2">
              <Label>Full Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, Area, Landmark, City, State"
                className="min-h-[84px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>PIN Code</Label>
                <Input value={form.pinCode} onChange={(e) => set("pinCode", e.target.value)} placeholder="560100" maxLength={6} className="font-mono" />
              </div>

              <div className="grid gap-2">
                <Label>State (optional)</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Karnataka" />
              </div>

              <div className="grid gap-2">
                <Label>Country (optional)</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Contact</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Phone (Primary)</Label>
                <Input value={form.contactPhone1} onChange={(e) => set("contactPhone1", e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div className="grid gap-2">
                <Label>Contact Phone (Secondary)</Label>
                <Input value={form.contactPhone2} onChange={(e) => set("contactPhone2", e.target.value)} placeholder="+91 91234 56789 (optional)" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Contact Email</Label>
              <Input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="campus.admin@zypocare.local" />
            </div>
          </div>

          <Separator />

          {/* Branding */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Branding & Links (optional)</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Logo URL</Label>
                <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" />
                <p className="text-[11px] text-zc-muted">Used for reports and letterheads.</p>
              </div>

              <div className="grid gap-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Facebook</Label>
                <Input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" />
              </div>
              <div className="grid gap-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" />
              </div>
              <div className="grid gap-2">
                <Label>LinkedIn</Label>
                <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/…" />
              </div>
              <div className="grid gap-2">
                <Label>X (Twitter)</Label>
                <Input value={form.x} onChange={(e) => set("x", e.target.value)} placeholder="https://x.com/…" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>YouTube</Label>
                <Input value={form.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/…" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Accreditation */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Accreditation & Licensing (optional)</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <Checkbox checked={form.accreditationNabh} onCheckedChange={(v) => set("accreditationNabh", v === true)} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">NABH</div>
                  <div className="text-xs text-zc-muted">Accredited by NABH</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <Checkbox checked={form.accreditationJci} onCheckedChange={(v) => set("accreditationJci", v === true)} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">JCI</div>
                  <div className="text-xs text-zc-muted">Accredited by JCI</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bed Count</Label>
                <Input value={form.bedCount} onChange={(e) => set("bedCount", e.target.value)} placeholder="e.g. 250" inputMode="numeric" />
                <p className="text-[11px] text-zc-muted">Helpful for licensing and regulatory reporting.</p>
              </div>

              <div className="grid gap-2">
                <Label>Established Date</Label>
                <Input value={form.establishedDate} onChange={(e) => set("establishedDate", e.target.value)} type="date" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Branch Settings</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Default Currency</Label>
                <Input value={form.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value.toUpperCase())} placeholder="INR" className="font-mono" />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Kolkata" className="font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Fiscal Year Start Month</Label>
                <Input
                  value={form.fiscalYearStartMonth}
                  onChange={(e) => set("fiscalYearStartMonth", e.target.value)}
                  placeholder="4 (April)"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">India default is April (4).</p>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Working Hours</Label>
                <Textarea
                  value={form.workingHoursText}
                  onChange={(e) => set("workingHoursText", e.target.value)}
                  placeholder="e.g. Mon–Sat 9:00–18:00; Sunday closed"
                  className="min-h-[72px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Emergency 24×7</div>
                  <div className="text-xs text-zc-muted">Marks branch as always open for emergency services.</div>
                </div>
                <Switch checked={form.emergency24x7} onCheckedChange={(v) => set("emergency24x7", v)} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Multi-language Support</div>
                  <div className="text-xs text-zc-muted">Enable language selection in branch UI.</div>
                </div>
                <Switch checked={form.multiLanguageSupport} onCheckedChange={(v) => set("multiLanguageSupport", v)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Supported Languages</Label>
              <Input
                value={form.supportedLanguagesText}
                onChange={(e) => set("supportedLanguagesText", e.target.value)}
                placeholder="en, hi, kn (comma-separated)"
                disabled={!form.multiLanguageSupport}
                className={cn(!form.multiLanguageSupport && "opacity-70")}
              />
              <p className="text-[11px] text-zc-muted">
                Enter language codes (comma-separated). This is used when multi-language support is enabled.
              </p>
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
              {mode === "create" ? "Create Branch" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default function BranchesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const searchParams = useSearchParams();

  const canRead = hasPerm(user, "BRANCH_READ");
  const canCreate = hasPerm(user, "BRANCH_CREATE");
  const canUpdate = hasPerm(user, "BRANCH_UPDATE");
  const canDelete = hasPerm(user, "BRANCH_DELETE");


  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [toggleAction, setToggleAction] = React.useState<"deactivate" | "reactivate">("deactivate");
  const [selected, setSelected] = React.useState<BranchRow | null>(null);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((b) => {
      const hay = `${b.code} ${b.name} ${b.legalEntityName ?? ""} ${b.city} ${b.gstNumber ?? ""} ${b.panNumber ?? ""} ${b.clinicalEstRegNumber ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow[]>("/api/branches");
      const sorted = [...(data ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(sorted);

      if (showToast) {
        toast({ title: "Branches refreshed", description: `Loaded ${sorted.length} branches.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load branches";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get("create") !== "1") return;
    if (!canCreate) return;
    setCreateOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    const qs = params.toString();
    router.replace(qs ? `/branches?${qs}` : "/branches");
  }, [searchParams, router, canCreate]);

  const totalFacilities = countSum(rows, "facilities");
  const totalDepartments = countSum(rows, "departments");
  const totalSpecialties = countSum(rows, "specialties");

  const activeBranches = rows.filter((r) => r.isActive !== false).length;
  const inactiveBranches = Math.max(0, rows.length - activeBranches);

  return (
    <AppShell title="Branches">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconBuilding className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Branches</div>
              <div className="mt-1 text-sm text-zc-muted">
                Corporate (Global) admins manage the branch registry. Use Deactivate/Reactivate (soft toggle) instead of deleting.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Keep outline for compatibility; you can later switch this to variant="info" once button variants are extended */}
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Branch
              </Button>
            ) : null}

          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search branches and open details. Corporate (Global) admins can create, edit and deactivate/reactivate branches.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Branches</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Active: <span className="font-semibold tabular-nums">{activeBranches}</span> • Inactive: <span className="font-semibold tabular-nums">{inactiveBranches}</span>
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Total Facilities</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{totalFacilities}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Total Specialties</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{totalSpecialties}</div>
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
                  placeholder="Search by code, name, legal entity, city, GSTIN, PAN…"
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
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
            <CardTitle className="text-base">Branch Registry</CardTitle>
            <CardDescription className="text-sm">Use Facility Setup to configure Facilities → Departments → Specialties → Mapping.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                  <th className="px-4 py-3 text-left font-semibold">GSTIN</th>
                  <th className="px-4 py-3 text-left font-semibold">Setup</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading branches…" : "No branches found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {b.code}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{b.name}</div>
                      {b.legalEntityName ? (
                        <div className="mt-0.5 text-xs text-zc-muted truncate" title={b.legalEntityName}>
                          {b.legalEntityName}
                        </div>
                      ) : null}
                      <div className="mt-1">
                        {b.isActive !== false ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            INACTIVE
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{b.city}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{b.gstNumber || "-"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Pill label="Facilities" value={countOf(b, "facilities")} />
                        <Pill label="Depts" value={countOf(b, "departments")} />
                        <Pill label="Specialties" value={countOf(b, "specialties")} />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/branches/${b.id}`} title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>

                        {canUpdate ? (
                          <>
                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => {
                                setSelected(b);
                                setEditOpen(true);
                              }}
                              title="Edit branch"
                              aria-label="Edit branch"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant={b.isActive !== false ? "secondary" : "success"}
                              size="icon"
                              onClick={() => {
                                setSelected(b);
                                setToggleAction(b.isActive !== false ? "deactivate" : "reactivate");
                                setToggleOpen(true);
                              }}
                              title={b.isActive !== false ? "Deactivate branch" : "Reactivate branch"}
                              aria-label={b.isActive !== false ? "Deactivate branch" : "Reactivate branch"}
                            >
                              {b.isActive !== false ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                            </Button>

                            {canDelete && b.isActive === false ? (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  setSelected(b);
                                  setDeleteOpen(true);
                                }}
                                title="Hard delete branch"
                                aria-label="Hard delete branch"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </>
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
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Recommended setup order</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Create Branch (Legal/Contact/Compliance/Settings) → 2) Facility Setup (Facilities → Departments → Specialties → Mapping) → 3) Branch Admin config (later).
              </div>
            </div>
          </div>
        </div>
      </div>

      <BranchEditorModal
  mode="create"
  open={createOpen}
  initial={null}
  onClose={() => setCreateOpen(false)}
  onSaved={() => refresh(false)}
  canSubmit={canCreate}
  deniedMessage="Missing permission: BRANCH_CREATE"
/>

<BranchEditorModal
  mode="edit"
  open={editOpen}
  initial={selected}
  onClose={() => setEditOpen(false)}
  onSaved={() => refresh(false)}
  canSubmit={canUpdate}
  deniedMessage="Missing permission: BRANCH_UPDATE"
/>

<ToggleActiveConfirmDialog
  open={toggleOpen}
  branch={selected}
  action={toggleAction}
  onClose={() => setToggleOpen(false)}
  onChanged={() => refresh(false)}
  canUpdate={canUpdate}
  deniedMessage="Missing permission: BRANCH_UPDATE"
/>

<DeleteConfirmModal
  open={deleteOpen}
  branch={selected}
  onClose={() => setDeleteOpen(false)}
  onDeleted={() => refresh(false)}
  canDelete={canDelete}
  deniedMessage="Missing permission: BRANCH_DELETE"
/>

    </AppShell>
  );
}
