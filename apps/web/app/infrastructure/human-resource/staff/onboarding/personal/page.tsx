"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type TitleCode = "DR" | "MR" | "MS" | "MRS" | "MX" | "PROF";
type GenderCode = "MALE" | "FEMALE" | "OTHER";
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "SEPARATED";

type PersonalDetailsDraft = {
  title?: TitleCode;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  display_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: GenderCode;
  blood_group?: BloodGroup;
  marital_status?: MaritalStatus;
};

type StaffOnboardingDraft = {
  // Keep aligned to backend DTO keys (snake_case) for clean future API wiring.
  personal_details?: PersonalDetailsDraft;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingPersonalPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [form, setForm] = React.useState<PersonalDetailsDraft>({
    title: undefined,
    first_name: "",
    middle_name: "",
    last_name: "",
    display_name: "",
    date_of_birth: "",
    gender: undefined,
    blood_group: undefined,
    marital_status: undefined,
  });

  const age = React.useMemo(() => computeAge(form.date_of_birth), [form.date_of_birth]);

  // Require draftId (this wizard is tied to a real Staff record created in Step 1)
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft from localStorage (server draft wiring can be added later without changing UI)
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const pd = draft.personal_details ?? {};
      setForm({
        title: pd.title,
        first_name: pd.first_name ?? "",
        middle_name: pd.middle_name ?? "",
        last_name: pd.last_name ?? "",
        display_name: pd.display_name ?? "",
        date_of_birth: pd.date_of_birth ?? "",
        gender: pd.gender,
        blood_group: pd.blood_group,
        marital_status: pd.marital_status,
      });
    } finally {
      setLoading(false);
      setDirty(false);
      setErrors({});
    }
  }, [draftId]);

  function update<K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function autoComputeDisplayName() {
    const dn = computeDisplayName(form.title, form.first_name, form.middle_name, form.last_name);
    update("display_name", dn);
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};
    if (!form.title) e.title = "Title is required.";
    if (!String(form.first_name ?? "").trim()) e.first_name = "First name is required.";
    if (!String(form.last_name ?? "").trim()) e.last_name = "Last name is required.";
    if (!String(form.display_name ?? "").trim()) e.display_name = "Display name is required.";
    if (!String(form.date_of_birth ?? "").trim()) e.date_of_birth = "Date of birth is required.";
    if (form.date_of_birth && !isValidYmd(form.date_of_birth)) e.date_of_birth = "Invalid date.";
    if (form.date_of_birth && computeAge(form.date_of_birth) === null) e.date_of_birth = "Date is out of range.";
    if (!form.gender) e.gender = "Gender is required.";
    return e;
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please fix the highlighted fields to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(id);
    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      personal_details: {
        ...existing.personal_details,
        ...normalizePersonalDraft(form),
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "Personal details saved to draft.",
    });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/staff/onboarding/contact", draftId) as any);
    } catch {
      // handled
    }
  }

  return (
    <OnboardingShell
      stepKey="personal"
      title="Personal details"
      description="Capture name, DOB, gender, blood group, and other identity basics."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-zc-border"
              onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/start", draftId) as any)}
            >
              Back
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSaveOnly} disabled={loading}>
              Save
            </Button>
            <Button
              className="bg-zc-accent text-white hover:bg-zc-accent/90"
              onClick={onSaveAndNext}
              disabled={loading}
            >
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 2: Personal information</div>
            <div className="mt-1 text-xs text-zc-muted">
              Title + name + DOB + gender are required. Display name is auto-computed but editable.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {age !== null ? (
              <Badge variant="secondary" className="border border-zc-border">
                Age: {age} years
              </Badge>
            ) : (
              <Badge variant="secondary" className="border border-zc-border text-zc-muted">
                Age: —
              </Badge>
            )}
            {dirty ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Unsaved changes
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Saved
              </Badge>
            )}
          </div>
        </div>

        <Separator className="bg-zc-border" />

        <div className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
          {/* Basic details */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Basic details</div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Title" required error={errors.title}>
                <Select value={form.title ?? ""} onValueChange={(v) => update("title", v as TitleCode)}>
                  <SelectTrigger className={cn("border-zc-border", errors.title ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DR">Dr.</SelectItem>
                    <SelectItem value="MR">Mr.</SelectItem>
                    <SelectItem value="MS">Ms.</SelectItem>
                    <SelectItem value="MRS">Mrs.</SelectItem>
                    <SelectItem value="MX">Mx.</SelectItem>
                    <SelectItem value="PROF">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="First name" required error={errors.first_name}>
                <Input
                  className={cn("border-zc-border", errors.first_name ? "border-red-500" : "")}
                  value={form.first_name ?? ""}
                  onChange={(e) => update("first_name", e.target.value)}
                  placeholder="e.g., Rajesh"
                />
              </Field>

              <Field label="Middle name" error={errors.middle_name}>
                <Input
                  className={cn("border-zc-border", errors.middle_name ? "border-red-500" : "")}
                  value={form.middle_name ?? ""}
                  onChange={(e) => update("middle_name", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Last name" required error={errors.last_name}>
                <Input
                  className={cn("border-zc-border", errors.last_name ? "border-red-500" : "")}
                  value={form.last_name ?? ""}
                  onChange={(e) => update("last_name", e.target.value)}
                  placeholder="e.g., Sharma"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <Field label="Display name" required help="Auto-computed, but editable" error={errors.display_name}>
                <Input
                  className={cn("border-zc-border", errors.display_name ? "border-red-500" : "")}
                  value={form.display_name ?? ""}
                  onChange={(e) => update("display_name", e.target.value)}
                  placeholder="e.g., Dr. Rajesh Kumar Sharma"
                />
              </Field>
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">&nbsp;</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zc-border"
                  onClick={autoComputeDisplayName}
                  disabled={loading}
                >
                  Auto compute
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* Personal details */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Personal details</div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Date of birth" required error={errors.date_of_birth}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.date_of_birth ? "border-red-500" : "")}
                  value={form.date_of_birth ?? ""}
                  onChange={(e) => update("date_of_birth", e.target.value)}
                />
              </Field>

              <Field label="Gender" required error={errors.gender}>
                <Select value={form.gender ?? ""} onValueChange={(v) => update("gender", v as GenderCode)}>
                  <SelectTrigger className={cn("border-zc-border", errors.gender ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Blood group" error={errors.blood_group}>
                <Select
                  value={form.blood_group ?? ""}
                  onValueChange={(v) => update("blood_group", (v || undefined) as BloodGroup)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.blood_group ? "border-red-500" : "")}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Marital status" error={errors.marital_status}>
                <Select
                  value={form.marital_status ?? ""}
                  onValueChange={(v) => update("marital_status", (v || undefined) as MaritalStatus)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.marital_status ? "border-red-500" : "")}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single</SelectItem>
                    <SelectItem value="MARRIED">Married</SelectItem>
                    <SelectItem value="DIVORCED">Divorced</SelectItem>
                    <SelectItem value="WIDOWED">Widowed</SelectItem>
                    <SelectItem value="SEPARATED">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Notes</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                This step saves into a <span className="font-semibold">local draft</span> keyed by{" "}
                <span className="font-mono">draftId</span>. We’ll wire this to backend onboarding draft endpoints next
                without changing the UX.
              </li>
              <li>
                Required gating across the full workflow: phone + email + address will be enforced before final review.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-zc-muted">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        {help ? <span className="text-[10px] text-zc-muted">{help}</span> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

function makeDraftId(): string {
  try {
    // modern browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // ignore
  }
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}

function readDraft(draftId: string): StaffOnboardingDraft {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StaffOnboardingDraft;
  } catch {
    return {};
  }
}

function writeDraft(draftId: string, draft: StaffOnboardingDraft) {
  try {
    localStorage.setItem(storageKey(draftId), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function computeDisplayName(
  title: TitleCode | undefined,
  first: string | undefined,
  middle: string | undefined,
  last: string | undefined,
) {
  const t = titleToLabel(title);
  const parts = [t, (first ?? "").trim(), (middle ?? "").trim(), (last ?? "").trim()].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function titleToLabel(title: TitleCode | undefined): string {
  if (!title) return "";
  switch (title) {
    case "DR":
      return "Dr.";
    case "MR":
      return "Mr.";
    case "MS":
      return "Ms.";
    case "MRS":
      return "Mrs.";
    case "MX":
      return "Mx.";
    case "PROF":
      return "Prof.";
    default:
      return "";
  }
}

function isValidYmd(v: string): boolean {
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  // ensure roundtrip
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === v;
}

function computeAge(ymd: string | undefined): number | null {
  if (!ymd || !isValidYmd(ymd)) return null;
  const dob = new Date(ymd + "T00:00:00Z");
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  let age = y - dob.getUTCFullYear();
  const mdiff = m - dob.getUTCMonth();
  if (mdiff < 0 || (mdiff === 0 && d < dob.getUTCDate())) age -= 1;

  if (age < 0 || age > 120) return null;
  return age;
}

function normalizePersonalDraft(d: PersonalDetailsDraft): PersonalDetailsDraft {
  const title = d.title;
  const first = String(d.first_name ?? "").trim();
  const middle = String(d.middle_name ?? "").trim();
  const last = String(d.last_name ?? "").trim();

  const displayRaw = String(d.display_name ?? "").trim();
  const display = displayRaw || computeDisplayName(title, first, middle, last);

  return {
    title,
    first_name: first || undefined,
    middle_name: middle || undefined,
    last_name: last || undefined,
    display_name: display || undefined,
    date_of_birth: String(d.date_of_birth ?? "").trim() || undefined,
    gender: d.gender,
    blood_group: d.blood_group,
    marital_status: d.marital_status,
  };
}
