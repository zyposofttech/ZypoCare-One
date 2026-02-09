"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams, useRouter } from "next/navigation";
import type { AppHref } from "@/lib/linking";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useAuthStore, hasPerm, hasAnyPerm } from "@/lib/auth/store";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { IconBuilding, IconChevronRight } from "@/components/icons";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Layers,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wand2,
} from "lucide-react";

// ---------------- Types ----------------

type BranchCounts = Record<string, number | undefined>;

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;

  isActive?: boolean;

  // Identity / legal
  legalEntityName?: string | null;

  // Address
  address?: string | null;
  pinCode?: string | null;
  state?: string | null;
  country?: string | null;

  // Contact
  contactPhone1?: string | null;
  contactPhone2?: string | null;
  contactEmail?: string | null;

  // Statutory / registrations
  gstNumber?: string | null;
  panNumber?: string | null;
  clinicalEstRegNumber?: string | null;
  rohiniId?: string | null;
  hfrId?: string | null;

  // Optional branding + public links
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

  // fallback if API sends direct counts
  facilitiesCount?: number;
  departmentsCount?: number;
  specialtiesCount?: number;
};


type BranchForm = {
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
  supportedLanguagesText: string;
};


// ---------------- Utilities ----------------

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
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

function fmtDate(v?: string) {
  if (!v) return "Ã¢â‚¬â€";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function valOrDash(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "Ã¢â‚¬â€";
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countOf(row: BranchRow | null, kind: "facilities" | "departments" | "specialties") {
  if (!row) return 0;

  // direct counts if API supplies them
  if (kind === "facilities" && row.facilitiesCount != null) return safeNum(row.facilitiesCount);
  if (kind === "departments" && row.departmentsCount != null) return safeNum(row.departmentsCount);
  if (kind === "specialties" && row.specialtiesCount != null) return safeNum(row.specialtiesCount);

  const c = row._count || {};

  // facilities count varies by schema naming
  if (kind === "facilities") {
    return safeNum(
      c.facilities ??
        c.branchFacilities ??
        c.branchFacility ??
        c.facilityLinks ??
        c.facilitySetup ??
        c.facilitySetupLinks,
    );
  }

  if (kind === "departments") return safeNum(c.departments ?? c.department);
  if (kind === "specialties") return safeNum(c.specialties ?? c.specialty);

  return 0;
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof pillTones;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTones[tone])}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function readinessFlag(ok: boolean, note?: string) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Pending{note ? ` Ã¢â‚¬Â¢ ${note}` : ""}
    </span>
  );
}

function normalizeGSTIN(input: string) {
  return String(input || "").trim().toUpperCase();
}

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

function normalizePIN(input: string) {
  return String(input || "").trim();
}

function validatePIN(pin: string): string | null {
  const v = normalizePIN(pin);
  if (!v) return "PIN code is required";
  if (!/^\d{6}$/.test(v)) return "PIN code must be 6 digits (example: 560100)";
  return null;
}

function validateEmailBasic(email: string): string | null {
  const v = String(email || "").trim().toLowerCase();
  if (!v) return "Contact email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email";
  return null;
}

function parseISODateToInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function jsonStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
    } catch {
      // ignore
    }
  }
  return [];
}

function workingHoursToText(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.text === "string") return v.text;
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function socialToField(v: any, key: string): string {
  if (!v || typeof v !== "object") return "";
  const s = String((v as any)[key] ?? "").trim();
  return s;
}


// ---------------- Small Components ----------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={onCopy}
      className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-zc-muted hover:bg-zc-panel hover:text-zc-text transition-colors"
      title="Copy"
      type="button"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function InfoTile({
  label,
  value,
  className,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "indigo" | "emerald" | "cyan" | "zinc" | "sky" | "violet" | "amber";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
      : tone === "emerald"
        ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
        : tone === "cyan"
          ? "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/35 dark:bg-cyan-900/15"
          : "border-zc-border bg-zc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
        {icon ? <span className="text-zc-muted">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  count,
  icon,
  href,
  tone = "zinc",
}: {
  title: string;
  description: string;
  count?: number;
  icon: React.ReactNode;
  href: string;
  tone?: keyof typeof pillTones;
}) {
  return (
    <Link
      href={href as any}
      className={cn(
        "group block rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all",
        "hover:bg-zc-panel/35 hover:shadow-elev-2 hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {title}
              </div>
              <div className="mt-1 text-sm text-zc-muted">{description}</div>
            </div>
          </div>

          {typeof count === "number" ? (
            <div className="mt-3">
              <MetricPill label="Records" value={count} tone={tone} />
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
          <IconChevronRight className="h-4 w-4 text-zc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

// ---------------- Modals ----------------

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-200/40 bg-zc-card shadow-elev-2 dark:border-indigo-900/40 animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              Ã¢Å“â€¢
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}


function EditBranchModal({
  open,
  branch,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<BranchForm>({
    name: "",
    city: "",

    legalEntityName: "",

    address: "",
    pinCode: "",
    state: "",
    country: "",

    contactPhone1: "",
    contactPhone2: "",
    contactEmail: "",

    gstNumber: "",
    panNumber: "",
    clinicalEstRegNumber: "",
    rohiniId: "",
    hfrId: "",

    logoUrl: "",
    website: "",

    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
    youtube: "",

    accreditationNabh: false,
    accreditationJci: false,

    bedCount: "",
    establishedDate: "",

    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
    fiscalYearStartMonth: "4",
    workingHoursText: "",

    emergency24x7: true,
    multiLanguageSupport: false,
    supportedLanguagesText: "",
  });

  React.useEffect(() => {
    if (!open || !branch) return;
    setErr(null);
    setBusy(false);

    const acc = jsonStringArray(branch.accreditations);
    const langs = jsonStringArray(branch.supportedLanguages);

    setForm({
      name: branch.name ?? "",
      city: branch.city ?? "",

      legalEntityName: branch.legalEntityName ?? "",

      address: branch.address ?? "",
      pinCode: branch.pinCode ?? "",
      state: branch.state ?? "",
      country: branch.country ?? "",

      contactPhone1: branch.contactPhone1 ?? "",
      contactPhone2: branch.contactPhone2 ?? "",
      contactEmail: branch.contactEmail ?? "",

      gstNumber: branch.gstNumber ?? "",
      panNumber: branch.panNumber ?? "",
      clinicalEstRegNumber: branch.clinicalEstRegNumber ?? "",
      rohiniId: branch.rohiniId ?? "",
      hfrId: branch.hfrId ?? "",

      logoUrl: branch.logoUrl ?? "",
      website: branch.website ?? "",

      facebook: socialToField(branch.socialLinks, "facebook"),
      instagram: socialToField(branch.socialLinks, "instagram"),
      linkedin: socialToField(branch.socialLinks, "linkedin"),
      x: socialToField(branch.socialLinks, "x"),
      youtube: socialToField(branch.socialLinks, "youtube"),

      accreditationNabh: acc.includes("NABH"),
      accreditationJci: acc.includes("JCI"),

      bedCount: branch.bedCount != null ? String(branch.bedCount) : "",
      establishedDate: parseISODateToInput(branch.establishedDate),

      defaultCurrency: (branch.defaultCurrency ?? "INR").toUpperCase(),
      timezone: branch.timezone ?? "Asia/Kolkata",
      fiscalYearStartMonth: String(branch.fiscalYearStartMonth ?? 4),
      workingHoursText: workingHoursToText(branch.workingHours),

      emergency24x7: branch.emergency24x7 ?? true,
      multiLanguageSupport: branch.multiLanguageSupport ?? false,
      supportedLanguagesText: langs.length ? langs.join(", ") : "",
    });
  }, [open, branch]);

  function cleanOptional(s: string) {
    const v = String(s ?? "").trim();
    return v ? v : "";
  }

  async function onSubmit() {
    if (!branch?.id) return;
    if (!canSubmit) return setErr(deniedMessage);
    setErr(null);

    // Required validations
    if (!form.name.trim()) return setErr("Branch name is required");
    if (!form.city.trim()) return setErr("City is required");
    if (!form.legalEntityName.trim()) return setErr("Legal entity name is required");
    if (!form.address.trim()) return setErr("Address is required");

    const pinErr = validatePIN(form.pinCode);
    if (pinErr) return setErr(pinErr);

    if (!form.contactPhone1.trim()) return setErr("Primary contact phone is required");

    const emailErr = validateEmailBasic(form.contactEmail);
    if (emailErr) return setErr(emailErr);

    const gstErr = validateGSTIN(form.gstNumber);
    if (gstErr) return setErr(gstErr);

    const panErr = validatePAN(form.panNumber);
    if (panErr) return setErr(panErr);

    if (!form.clinicalEstRegNumber.trim()) return setErr("Clinical establishment registration number is required");

    const accreditations = [
      ...(form.accreditationNabh ? ["NABH"] : []),
      ...(form.accreditationJci ? ["JCI"] : []),
    ];

    const supportedLanguages = form.supportedLanguagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const bedCount = form.bedCount.trim() ? Number(form.bedCount) : undefined;
    if (form.bedCount.trim() && !Number.isFinite(bedCount as any)) return setErr("Bed count must be a number");

    const fiscalMonth = form.fiscalYearStartMonth.trim() ? Number(form.fiscalYearStartMonth) : undefined;
    if (form.fiscalYearStartMonth.trim()) {
      if (!Number.isInteger(fiscalMonth as any) || (fiscalMonth as any) < 1 || (fiscalMonth as any) > 12) {
        return setErr("Fiscal year start month must be between 1 and 12");
      }
    }

    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),

          legalEntityName: form.legalEntityName.trim(),

          address: form.address.trim(),
          pinCode: normalizePIN(form.pinCode),
          state: cleanOptional(form.state),
          country: cleanOptional(form.country),

          contactPhone1: cleanOptional(form.contactPhone1),
          contactPhone2: cleanOptional(form.contactPhone2),
          contactEmail: form.contactEmail.trim().toLowerCase(),

          gstNumber: normalizeGSTIN(form.gstNumber),
          panNumber: normalizePAN(form.panNumber),
          clinicalEstRegNumber: form.clinicalEstRegNumber.trim(),
          rohiniId: cleanOptional(form.rohiniId),
          hfrId: cleanOptional(form.hfrId),

          logoUrl: cleanOptional(form.logoUrl),
          website: cleanOptional(form.website),

          facebook: cleanOptional(form.facebook),
          instagram: cleanOptional(form.instagram),
          linkedin: cleanOptional(form.linkedin),
          x: cleanOptional(form.x),
          youtube: cleanOptional(form.youtube),

          accreditations,

          bedCount,
          establishedDate: form.establishedDate ? form.establishedDate : undefined,

          defaultCurrency: (cleanOptional(form.defaultCurrency) || "INR").toUpperCase(),
          timezone: cleanOptional(form.timezone) || "Asia/Kolkata",
          fiscalYearStartMonth: fiscalMonth,
          workingHoursText: cleanOptional(form.workingHoursText),

          emergency24x7: Boolean(form.emergency24x7),
          multiLanguageSupport: Boolean(form.multiLanguageSupport),
          supportedLanguages,
        }),
      });

      toast({
        title: "Branch Updated",
        description: `Updated "${form.name.trim()}"`,
      });

      onClose();
      void Promise.resolve(onSaved()).catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ title: "Update failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Edit Branch
          </DialogTitle>
          <DialogDescription>
            Update legal identity, statutory IDs, contact, branding, and operational settings.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Basic */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Basic</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch code</div>
                <Input value={branch.code} disabled className="mt-1 font-mono" />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Branch name <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  City <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Legal & Compliance</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Legal entity name <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.legalEntityName}
                  onChange={(e) => setForm((s) => ({ ...s, legalEntityName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  GSTIN <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.gstNumber}
                  onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value.toUpperCase() }))}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  PAN <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.panNumber}
                  onChange={(e) => setForm((s) => ({ ...s, panNumber: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="mt-1 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Clinical establishment registration no. <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.clinicalEstRegNumber}
                  onChange={(e) => setForm((s) => ({ ...s, clinicalEstRegNumber: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">ROHINI ID</div>
                <Input
                  value={form.rohiniId}
                  onChange={(e) => setForm((s) => ({ ...s, rohiniId: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">HFR ID (ABDM)</div>
                <Input
                  value={form.hfrId}
                  onChange={(e) => setForm((s) => ({ ...s, hfrId: e.target.value }))}
                  className="mt-1"
                />
                <div className="mt-1 text-xs text-zc-muted">Auto-populated after ABDM registration (editable if needed).</div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Address</div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Address <span className="text-[rgb(var(--zc-danger))]">*</span>
              </div>
              <textarea
                value={form.address}
                onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                placeholder="Full address for this branch (include landmark if needed)"
                className={cn(
                  "mt-1 min-h-[90px] w-full rounded-lg border border-zc-border bg-transparent px-3 py-2 text-sm text-zc-text outline-none",
                  "focus-visible:ring-2 focus-visible:ring-zc-ring",
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  PIN code <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.pinCode}
                  onChange={(e) => setForm((s) => ({ ...s, pinCode: e.target.value }))}
                  placeholder="560100"
                  maxLength={6}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">State</div>
                <Input
                  value={form.state}
                  onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Country</div>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                  placeholder="India"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Contact</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Primary phone <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.contactPhone1}
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone1: e.target.value }))}
                  placeholder="+91 9XXXXXXXXX"
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Secondary phone</div>
                <Input
                  value={form.contactPhone2}
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone2: e.target.value }))}
                  placeholder="Optional alternate number"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Contact email <span className="text-[rgb(var(--zc-danger))]">*</span>
                </div>
                <Input
                  value={form.contactEmail}
                  onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                  placeholder="branch@hospital.com"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branding & Links</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Logo URL</div>
                <Input
                  value={form.logoUrl}
                  onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Website</div>
                <Input
                  value={form.website}
                  onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Facebook</div>
                <Input
                  value={form.facebook}
                  onChange={(e) => setForm((s) => ({ ...s, facebook: e.target.value }))}
                  placeholder="https://facebook.com/..."
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Instagram</div>
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm((s) => ({ ...s, instagram: e.target.value }))}
                  placeholder="https://instagram.com/..."
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">LinkedIn</div>
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm((s) => ({ ...s, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/..."
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">X (Twitter)</div>
                <Input
                  value={form.x}
                  onChange={(e) => setForm((s) => ({ ...s, x: e.target.value }))}
                  placeholder="https://x.com/..."
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">YouTube</div>
                <Input
                  value={form.youtube}
                  onChange={(e) => setForm((s) => ({ ...s, youtube: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Accreditation & Capacity */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Accreditation & Capacity</div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">NABH</div>
                  <div className="text-xs text-zc-muted">Accreditation status</div>
                </div>
                <Switch
                  checked={form.accreditationNabh}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, accreditationNabh: Boolean(v) }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">JCI</div>
                  <div className="text-xs text-zc-muted">Accreditation status</div>
                </div>
                <Switch
                  checked={form.accreditationJci}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, accreditationJci: Boolean(v) }))}
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Bed count</div>
                <Input
                  type="number"
                  value={form.bedCount}
                  onChange={(e) => setForm((s) => ({ ...s, bedCount: e.target.value }))}
                  placeholder="e.g. 250"
                  className="mt-1"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Established date</div>
                <Input
                  type="date"
                  value={form.establishedDate}
                  onChange={(e) => setForm((s) => ({ ...s, establishedDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="grid gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch Settings</div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Default currency</div>
                <Input
                  value={form.defaultCurrency}
                  onChange={(e) => setForm((s) => ({ ...s, defaultCurrency: e.target.value.toUpperCase() }))}
                  placeholder="INR"
                  className="mt-1 font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Timezone</div>
                <Input
                  value={form.timezone}
                  onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
                  placeholder="Asia/Kolkata"
                  className="mt-1"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Fiscal year start month</div>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.fiscalYearStartMonth}
                  onChange={(e) => setForm((s) => ({ ...s, fiscalYearStartMonth: e.target.value }))}
                  className="mt-1"
                />
                <div className="mt-1 text-xs text-zc-muted">India default is 4 (April).</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Working hours</div>
              <textarea
                value={form.workingHoursText}
                onChange={(e) => setForm((s) => ({ ...s, workingHoursText: e.target.value }))}
                placeholder="e.g. Mon-Sat 09:00-18:00"
                className={cn(
                  "mt-1 min-h-[80px] w-full rounded-lg border border-zc-border bg-transparent px-3 py-2 text-sm text-zc-text outline-none",
                  "focus-visible:ring-2 focus-visible:ring-zc-ring",
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">Emergency 24Ãƒâ€”7</div>
                  <div className="text-xs text-zc-muted">Branch handles emergency around the clock</div>
                </div>
                <Switch checked={form.emergency24x7} onCheckedChange={(v) => setForm((s) => ({ ...s, emergency24x7: Boolean(v) }))} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-zc-text">Multi-language</div>
                  <div className="text-xs text-zc-muted">Enable multilingual UI and docs</div>
                </div>
                <Switch
                  checked={form.multiLanguageSupport}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, multiLanguageSupport: Boolean(v) }))}
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Supported languages</div>
              <Input
                value={form.supportedLanguagesText}
                onChange={(e) => setForm((s) => ({ ...s, supportedLanguagesText: e.target.value }))}
                placeholder="e.g. English, Hindi, Kannada"
                className="mt-1"
              />
              <div className="mt-1 text-xs text-zc-muted">Comma-separated (used when multi-language is enabled).</div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy || !canSubmit} title={!canSubmit ? deniedMessage : undefined}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  const deps =
    countOf(branch, "facilities") + countOf(branch, "departments") + countOf(branch, "specialties");

  async function onConfirm() {
    if (!branch?.id) return;
    if (!canDelete) return setErr(deniedMessage);
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/api/branches/${branch.id}`, { method: "DELETE" });

      toast({
        title: "Branch Deleted (Hard)",
        description: `Hard deleted "${branch.name}"`,
        variant: "success",
      });

      await onDeleted();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      setErr(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  if (!open || !branch) return null;

  return (
    <ModalShell
      title="Hard Delete Branch"
      description="Hard delete is allowed only when there is no Facilities/Departments/Specialties setup for this branch. Prefer Deactivate for retirement unless this is a test branch."
      onClose={onClose}
    >
      {err ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="min-w-0">{err}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
        <div className="text-sm text-zc-muted">You are deleting</div>
        <div className="mt-1 text-base font-semibold text-zc-text">
          {branch.name} <span className="text-zc-muted">({branch.code})</span>
        </div>
        <div className="mt-2 text-sm text-zc-muted">City: {branch.city}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MetricPill label="Facilities" value={countOf(branch, "facilities")} tone="sky" />
          <MetricPill label="Departments" value={countOf(branch, "departments")} tone="emerald" />
          <MetricPill label="Specialties" value={countOf(branch, "specialties")} tone="violet" />
        </div>

        {deps > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-warn-rgb)/0.35)] bg-[rgb(var(--zc-warn-rgb)/0.12)] px-3 py-2 text-sm text-zc-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
            <div className="min-w-0">
              This branch already has setup data. Delete is blocked. Use governance/retirement instead.
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={busy || deps > 0 || !canDelete}
          title={!canDelete ? deniedMessage : undefined}
        >
          {deps > 0 ? "Cannot Delete (Has Setup)" : busy ? "DeletingÃ¢â‚¬Â¦" : "Hard Delete"}
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
    if (!branch?.id) return;
    if (!canUpdate) return setErr(deniedMessage);
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
            <MetricPill label="Facilities" value={countOf(branch, "facilities")} tone="sky" />
            <MetricPill label="Departments" value={countOf(branch, "departments")} tone="emerald" />
            <MetricPill label="Specialties" value={countOf(branch, "specialties")} tone="violet" />
          </div>
          <div className="mt-4 text-sm text-zc-muted">
            Tip: prefer deactivation for retirement. Hard delete should be used only for test branches with no dependent data.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={nextActive ? "success" : "secondary"}
            onClick={onConfirm}
            disabled={busy || !canUpdate}
            title={!canUpdate ? deniedMessage : undefined}
          >
            {busy ? "UpdatingÃ¢â‚¬Â¦" : nextActive ? "Reactivate" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Page ----------------

export default function BranchDetailPage() {
  const { toast } = useToast();

  const user = useAuthStore((s) => s.user);
  const permsLoaded = Array.isArray(user?.permissions);

  const canRead = hasPerm(user, "BRANCH_READ");
  const canUpdate = hasPerm(user, "BRANCH_UPDATE");
  const canDelete = hasPerm(user, "BRANCH_DELETE");

  // Facility/Department/Specialty setup permissions (used for the Setup tab + shortcuts)
  const canFacilitySetup = hasAnyPerm(user, [
    "FACILITY_CATALOG_READ",
    "FACILITY_CATALOG_CREATE",
    "BRANCH_FACILITY_READ",
    "BRANCH_FACILITY_UPDATE",
    "DEPARTMENT_READ",
    "DEPARTMENT_CREATE",
    "DEPARTMENT_UPDATE",
    "SPECIALTY_READ",
    "SPECIALTY_CREATE",
    "SPECIALTY_UPDATE",
    "DEPARTMENT_SPECIALTY_READ",
    "DEPARTMENT_SPECIALTY_UPDATE",
  ]);

  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  React.useEffect(() => {
    if (!permsLoaded) return;
    if (!canRead) {
      router.replace("/welcome" as any);
    }
  }, [permsLoaded, canRead, router]);

  const [row, setRow] = React.useState<BranchRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [toggleAction, setToggleAction] = React.useState<"deactivate" | "reactivate">("deactivate");
  const [activeTab, setActiveTab] = React.useState<"overview" | "setup">("overview");

  React.useEffect(() => {
    if (!canFacilitySetup && activeTab === "setup") setActiveTab("overview");
  }, [canFacilitySetup, activeTab]);

  const facilitySetupHref = `/infrastructure/facilities/`;
  const policyOverridesHref = `/admin/policy-overrides?branchId=${encodeURIComponent(id)}`;
  const policiesHref = `/policy/policies`;
  const approvalsHref = `/policy/approvals`;
  const auditHref = `/policy/audit`;

  async function refresh(showToast = false) {
    if (!id || !canRead) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(id)}`);
      setRow(data);

      if (showToast) {
        toast({
          title: "Branch refreshed",
          description: "Loaded latest branch details.",
          duration: 1800,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load branch";
      setErr(msg);
      setRow(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!canRead) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canRead]);

  const facilities = countOf(row, "facilities");
  const departments = countOf(row, "departments");
  const specialties = countOf(row, "specialties");

  const readyFacilities = facilities > 0;
  const readyDepartments = departments > 0;
  const readySpecialties = specialties > 0;

  // We canÃ¢â‚¬â„¢t know mapping completeness from branch counts alone; this is a safe minimum signal.
  const readyMapping = readyDepartments && readySpecialties;

  const accreditations = jsonStringArray(row?.accreditations);
  const supportedLangs = jsonStringArray(row?.supportedLanguages);
  const social = row?.socialLinks && typeof row.socialLinks === "object" ? (row.socialLinks as any) : null;
  const workingHoursText = workingHoursToText(row?.workingHours);


  return (
    <AppShell title="Branch Dashboard">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-10" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/branches" className="hover:underline">
                    Branches
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Details</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-9 w-64" /> : row?.name}
                </div>

                {!loading && row ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                    <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                      {row.code}
                    </span>
                    <span className="text-zc-muted/60">Ã¢â‚¬Â¢</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {row.city}
                    </span>
                    <span className="text-zc-muted/60">Ã¢â‚¬Â¢</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                        row.isActive !== false ? pillTones.emerald : pillTones.amber,
                      )}
                    >
                      {row.isActive !== false ? "Active" : "Inactive"}
                    </span>
                    <span className="text-zc-muted/60">Ã¢â‚¬Â¢</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                        readyFacilities || readyDepartments || readySpecialties ? pillTones.emerald : pillTones.zinc,
                      )}
                    >
                      {readyFacilities || readyDepartments || readySpecialties ? "Configured" : "New"}
                    </span>
                  </div>
                ) : loading ? (
                  <div className="mt-2 flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ) : null}
              </div>
            </div>

            {/* {!loading && row ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <MetricPill label="Facilities" value={facilities} tone="sky" />
                <MetricPill label="Departments" value={departments} tone="emerald" />
                <MetricPill label="Specialties" value={specialties} tone="violet" />
              </div>
            ) : null} */}

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}

            {permsLoaded && !canRead ? (
              <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                You donÃ¢â‚¬â„¢t have permission to view branch details. Request <span className="font-semibold">BRANCH_READ</span>.
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </Button>

            {canFacilitySetup ? (
              <Button asChild className="gap-2">
                <Link href={facilitySetupHref as any}>
                  <Wand2 className="h-4 w-4" />
                  Facility Setup
                </Link>
              </Button>
            ) : null}

            {canUpdate && !loading && row ? (
              <>
                <Button variant="secondary" className="gap-2" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>

                <Button
                  variant={row.isActive !== false ? "secondary" : "success"}
                  className="gap-2"
                  onClick={() => {
                    setToggleAction(row.isActive !== false ? "deactivate" : "reactivate");
                    setToggleOpen(true);
                  }}
                >
                  {row.isActive !== false ? "Deactivate" : "Reactivate"}
                </Button>

                {canDelete && row.isActive === false ? (
                  <Button variant="destructive" className="gap-2" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    Hard Delete
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Snapshot */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Snapshot</CardTitle>
                <CardDescription>Status, setup counts, and identifiers.</CardDescription>
              </div>
              {!loading && row ? (
                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Facilities" value={facilities} tone="sky" />
                  <MetricPill label="Departments" value={departments} tone="emerald" />
                  <MetricPill label="Specialties" value={specialties} tone="violet" />
                </div>
              ) : (
                <div className="text-sm text-zc-muted">--</div>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pb-6 pt-6">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : row ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                <InfoTile
                  label="Branch ID"
                  icon={<ClipboardList className="h-4 w-4" />}
                  tone="zinc"
                  value={
                    <div className="flex items-center">
                      <span className="font-mono text-xs break-all">{row.id}</span>
                      <CopyButton text={row.id} />
                    </div>
                  }
                />
                <InfoTile
                  label="Code"
                  icon={<Layers className="h-4 w-4" />}
                  tone="indigo"
                  value={<span className="font-mono text-sm font-semibold">{row.code}</span>}
                />
                <InfoTile
                  label="GSTIN"
                  icon={<Building2 className="h-4 w-4" />}
                  tone="emerald"
                  value={
                    <div className="flex items-center">
                      <span className="font-mono text-sm font-semibold">{valOrDash(row.gstNumber)}</span>
                      {row.gstNumber ? <CopyButton text={row.gstNumber} /> : null}
                    </div>
                  }
                />
                <InfoTile
                  label="PAN"
                  icon={<ClipboardList className="h-4 w-4" />}
                  tone="cyan"
                  value={
                    <div className="flex items-center">
                      <span className="font-mono text-sm font-semibold">{valOrDash(row.panNumber)}</span>
                      {row.panNumber ? <CopyButton text={row.panNumber} /> : null}
                    </div>
                  }
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <InfoTile
                  label="Clinical Reg No."
                  icon={<ClipboardList className="h-4 w-4" />}
                  tone="zinc"
                  value={<span className="text-sm font-semibold">{valOrDash(row.clinicalEstRegNumber)}</span>}
                />
                <InfoTile
                  label="HFR ID (ABDM)"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  tone="indigo"
                  value={<span className="text-sm font-semibold">{valOrDash(row.hfrId)}</span>}
                />
                <InfoTile
                  label="Settings"
                  icon={<Layers className="h-4 w-4" />}
                  tone="emerald"
                  value={
                    <div className="text-sm text-zc-text">
                      <div>
                        <span className="font-semibold">{valOrDash(row.defaultCurrency ?? "INR")}</span>{" "}
                        <span className="text-zc-muted">Ã¢â‚¬Â¢</span>{" "}
                        <span className="font-semibold">{valOrDash(row.timezone ?? "Asia/Kolkata")}</span>
                      </div>
                      <div className="text-xs text-zc-muted mt-1">
                        Fiscal start: {row.fiscalYearStartMonth ?? 4} Ã¢â‚¬Â¢ Emergency: {row.emergency24x7 === false ? "No" : "Yes"}
                      </div>
                    </div>
                  }
                />
              </div>
              </>
            ) : (
              <div className="text-sm text-zc-muted">No data.</div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Branch Details</CardTitle>
                <CardDescription>Overview, setup readiness, and governance shortcuts.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  {canFacilitySetup ? (
                    <TabsTrigger
                      value="setup"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Setup
                    </TabsTrigger>
                  ) : null}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="overview" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Branch Profile</CardTitle>
                      <CardDescription>Accounting and operational identity for this campus.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-14" />
                            <Skeleton className="h-14" />
                          </div>
                          <Skeleton className="h-20" />
                        </div>
                      ) : row ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Basic */}
                          <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
                            Identity
                          </div>
                          <InfoTile label="Branch Name" value={<span className="text-sm font-semibold">{row.name}</span>} />
                          <InfoTile label="City" value={<span className="text-sm font-semibold">{row.city}</span>} />

                          <InfoTile
                            label="Legal Entity Name"
                            value={<span className="text-sm text-zc-text">{valOrDash(row.legalEntityName)}</span>}
                            className="md:col-span-2"
                            tone="zinc"
                          />

                          {/* Statutory */}
                          <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
                            Statutory & Registration
                          </div>

                          <InfoTile
                            label="GSTIN"
                            value={<span className="font-mono text-sm font-semibold">{valOrDash(row.gstNumber)}</span>}
                            className="md:col-span-2"
                            icon={<Building2 className="h-4 w-4" />}
                            tone="emerald"
                          />

                          <InfoTile
                            label="PAN"
                            value={<span className="font-mono text-sm font-semibold">{valOrDash(row.panNumber)}</span>}
                            icon={<ClipboardList className="h-4 w-4" />}
                            tone="cyan"
                          />

                          <InfoTile
                            label="Clinical Establishment Reg No."
                            value={<span className="text-sm font-semibold">{valOrDash(row.clinicalEstRegNumber)}</span>}
                            icon={<ClipboardList className="h-4 w-4" />}
                            tone="zinc"
                          />

                          <InfoTile
                            label="ROHINI ID"
                            value={<span className="text-sm font-semibold">{valOrDash(row.rohiniId)}</span>}
                            tone="zinc"
                          />

                          <InfoTile
                            label="HFR ID (ABDM)"
                            value={<span className="text-sm font-semibold">{valOrDash(row.hfrId)}</span>}
                            icon={<ShieldCheck className="h-4 w-4" />}
                            tone="indigo"
                          />

                          {/* Address & Contact */}
                          <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
                            Address & Contact
                          </div>

                          <InfoTile
                            label="Address"
                            value={
                              <div className="text-sm text-zc-text">
                                <div>{valOrDash(row.address)}</div>
                                <div className="mt-1 text-xs text-zc-muted">
                                  PIN: <span className="font-mono text-zc-text">{valOrDash(row.pinCode)}</span>
                                  {row.state?.trim() ? <span className="text-zc-muted"> Ã¢â‚¬Â¢ {row.state}</span> : null}
                                  {row.country?.trim() ? <span className="text-zc-muted"> Ã¢â‚¬Â¢ {row.country}</span> : null}
                                </div>
                              </div>
                            }
                            className="md:col-span-2"
                            icon={<MapPin className="h-4 w-4" />}
                            tone="indigo"
                          />

                          <InfoTile
                            label="Contact Phones"
                            value={
                              <div className="text-sm text-zc-text">
                                <div>{valOrDash(row.contactPhone1)}</div>
                                {row.contactPhone2?.trim() ? <div className="text-zc-muted">{row.contactPhone2}</div> : null}
                                {!row.contactPhone1?.trim() && !row.contactPhone2?.trim() ? <span>Ã¢â‚¬â€</span> : null}
                              </div>
                            }
                            tone="cyan"
                          />

                          <InfoTile
                            label="Contact Email"
                            value={<div className="text-sm text-zc-text">{valOrDash(row.contactEmail)}</div>}
                            tone="zinc"
                          />

                          {/* Branding */}
                          <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
                            Branding & Public Links
                          </div>

                          <InfoTile
                            label="Website"
                            value={
                              row.website?.trim() ? (
                                <a className="text-sm font-semibold text-indigo-600 hover:underline" href={row.website} target="_blank" rel="noreferrer">
                                  {row.website}
                                </a>
                              ) : (
                                <span className="text-sm text-zc-text">Ã¢â‚¬â€</span>
                              )
                            }
                            tone="indigo"
                          />

                          <InfoTile
                            label="Logo URL"
                            value={
                              row.logoUrl?.trim() ? (
                                <a className="text-sm font-semibold text-indigo-600 hover:underline" href={row.logoUrl} target="_blank" rel="noreferrer">
                                  View
                                </a>
                              ) : (
                                <span className="text-sm text-zc-text">Ã¢â‚¬â€</span>
                              )
                            }
                            tone="zinc"
                          />

                          <InfoTile
                            label="Social Links"
                            className="md:col-span-2"
                            value={
                              social ? (
                                <div className="text-sm text-zc-text space-y-1">
                                  {Object.entries(social)
                                    .filter(([_, v]) => String(v ?? "").trim())
                                    .map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-zc-muted">{k}</span>
                                        <a className="truncate text-indigo-600 hover:underline" href={String(v) as any} target="_blank" rel="noreferrer">
                                          {String(v)}
                                        </a>
                                      </div>
                                    ))}
                                  {Object.entries(social).filter(([_, v]) => String(v ?? "").trim()).length === 0 ? <span>Ã¢â‚¬â€</span> : null}
                                </div>
                              ) : (
                                <span className="text-sm text-zc-text">Ã¢â‚¬â€</span>
                              )
                            }
                            tone="zinc"
                          />

                          <InfoTile
                            label="Accreditations"
                            value={
                              accreditations.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {accreditations.map((a) => (
                                    <span key={a} className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-zc-text">Ã¢â‚¬â€</span>
                              )
                            }
                            tone="emerald"
                          />

                          <InfoTile
                            label="Bed Count"
                            value={<span className="text-sm font-semibold">{row.bedCount != null ? row.bedCount : "Ã¢â‚¬â€"}</span>}
                            tone="zinc"
                          />

                          <InfoTile
                            label="Established Date"
                            value={<span className="text-sm font-semibold">{row.establishedDate ? fmtDate(row.establishedDate) : "Ã¢â‚¬â€"}</span>}
                            tone="zinc"
                          />

                          {/* Settings */}
                          <div className="md:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
                            Branch Settings
                          </div>

                          <InfoTile
                            label="Default Currency"
                            value={<span className="font-mono text-sm font-semibold">{valOrDash(row.defaultCurrency ?? "INR")}</span>}
                            tone="indigo"
                          />

                          <InfoTile
                            label="Timezone"
                            value={<span className="text-sm font-semibold">{valOrDash(row.timezone ?? "Asia/Kolkata")}</span>}
                            tone="indigo"
                          />

                          <InfoTile
                            label="Fiscal Year Start"
                            value={<span className="text-sm font-semibold">Month {row.fiscalYearStartMonth ?? 4}</span>}
                            tone="zinc"
                          />

                          <InfoTile
                            label="Working Hours"
                            value={<div className="text-sm text-zc-text whitespace-pre-wrap">{workingHoursText ? workingHoursText : "Ã¢â‚¬â€"}</div>}
                            className="md:col-span-2"
                            tone="zinc"
                          />

                          <InfoTile
                            label="Emergency 24Ãƒâ€”7"
                            value={<span className="text-sm font-semibold">{row.emergency24x7 === false ? "No" : "Yes"}</span>}
                            tone="emerald"
                          />

                          <InfoTile
                            label="Multi-language Support"
                            value={<span className="text-sm font-semibold">{row.multiLanguageSupport ? "Enabled" : "Disabled"}</span>}
                            tone="zinc"
                          />

                          <InfoTile
                            label="Supported Languages"
                            className="md:col-span-2"
                            value={
                              supportedLangs.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {supportedLangs.map((l) => (
                                    <span key={l} className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.sky)}>
                                      {l}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-zc-text">Ã¢â‚¬â€</span>
                              )
                            }
                            tone="sky"
                          />

                          <InfoTile
                            label="Created At"
                            value={<span className="text-sm text-zc-text">{fmtDate(row.createdAt)}</span>}
                          />
                          <InfoTile
                            label="Updated At"
                            value={<span className="text-sm text-zc-text">{fmtDate(row.updatedAt)}</span>}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-zc-muted">No data.</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Setup Health</CardTitle>
                      <CardDescription className="text-xs">Super Admin setup readiness for this branch.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Facilities</span>
                        {readinessFlag(readyFacilities)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Departments</span>
                        {readinessFlag(readyDepartments)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Specialties Catalog</span>
                        {readinessFlag(readySpecialties)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zc-muted">Dept - Specialty Mapping</span>
                        {readinessFlag(readyMapping, "Review in Setup")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="setup" className="mt-0">
                {!canFacilitySetup ? (
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    You donÃ¢â‚¬â„¢t have permission to manage branch setup. Request <span className="font-semibold">FACILITY/DEPARTMENT/SPECIALTY</span> permissions.
                  </div>
                ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="overflow-hidden lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Branch Setup</CardTitle>
                      <CardDescription>Super Admin configuration (before Branch Admin onboarding).</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 grid gap-3">
                      <ModuleCard
                        title="Facility Setup"
                        description="Facilities -> Departments -> Specialties -> Mapping"
                        count={undefined}
                        icon={<Wand2 className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref as any}
                        tone="zinc"
                      />
                      <ModuleCard
                        title="Facilities Enabled"
                        description="Branch facility catalog (enabled)"
                        count={facilities}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref as any}
                        tone="sky"
                      />
                      <ModuleCard
                        title="Departments"
                        description="Departments created under facilities"
                        count={departments}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref as any}
                        tone="emerald"
                      />
                      <ModuleCard
                        title="Specialties Catalog"
                        description="Branch-level specialties (master list)"
                        count={specialties}
                        icon={<Layers className="h-4 w-4 text-zc-accent" />}
                        href={facilitySetupHref as any}
                        tone="violet"
                      />
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Governance</CardTitle>
                      <CardDescription>Policies and approvals remain global; branch overrides are scoped here.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 grid gap-3">
                      <Link
                        href={policyOverridesHref as any}
                        className="group flex items-center justify-between rounded-2xl border border-zc-border bg-zc-panel/20 p-4 hover:bg-zc-panel/35 hover:shadow-elev-2 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
                            <ShieldCheck className="h-4 w-4 text-zc-accent" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              Policy Overrides
                            </div>
                            <div className="mt-1 text-sm text-zc-muted">Branch-specific exceptions and rollouts</div>
                          </div>
                        </div>
                        <IconChevronRight className="h-4 w-4 text-zc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      </Link>

                      <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                        <div className="font-semibold text-zc-text">Super Admin shortcuts</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button asChild variant="outline">
                            <Link href={policiesHref as any}>Policies</Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href={approvalsHref as any}>Approvals</Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href={auditHref as any}>Audit Trail</Link>
                          </Button>
                        </div>
                        <div className="mt-2 text-xs">Tip: Keep definitions global; use overrides only for branch deviations.</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>

      <EditBranchModal
        open={editOpen}
        branch={row}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BRANCH_UPDATE"
      />

      <ToggleActiveConfirmDialog
        open={toggleOpen}
        branch={row}
        action={toggleAction}
        onClose={() => setToggleOpen(false)}
        onChanged={() => refresh(false)}
        canUpdate={canUpdate}
        deniedMessage="Missing permission: BRANCH_UPDATE"
      />

      <DeleteConfirmModal
        open={deleteOpen}
        branch={row}
        onClose={() => setDeleteOpen(false)}
        onDeleted={async () => {
          router.replace("/branches" as any);
        }}
        canDelete={canDelete}
        deniedMessage="Missing permission: BRANCH_DELETE"
      />
    </AppShell>
  );
}
