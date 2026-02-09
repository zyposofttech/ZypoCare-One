"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type ContactDetailsDraft = {
  mobile_primary?: string;
  mobile_secondary?: string;

  email_official?: string;
  email_personal?: string;

  current_address?: string;
  permanent_address?: string;

  emergency_contact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;

  notes?: string;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: ContactDetailsDraft;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingContactPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [form, setForm] = React.useState<ContactDetailsDraft>({
    mobile_primary: "",
    mobile_secondary: "",
    email_official: "",
    email_personal: "",
    current_address: "",
    permanent_address: "",
    emergency_contact: { name: "", relation: "", phone: "" },
    notes: "",
  });

  // Require draftId (staffId). If missing, go back to Start.
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft from localStorage
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const cd = (draft.contact_details ?? {}) as ContactDetailsDraft;

      const emg = cd.emergency_contact ?? { name: "", relation: "", phone: "" };

      setForm({
        mobile_primary: String(cd.mobile_primary ?? "").trim(),
        mobile_secondary: String(cd.mobile_secondary ?? "").trim(),
        email_official: String(cd.email_official ?? "").trim(),
        email_personal: String(cd.email_personal ?? "").trim(),
        current_address: String(cd.current_address ?? "").trim(),
        permanent_address: String(cd.permanent_address ?? "").trim(),
        emergency_contact: {
          name: String((emg as any)?.name ?? "").trim(),
          relation: String((emg as any)?.relation ?? "").trim(),
          phone: String((emg as any)?.phone ?? "").trim(),
        },
        notes: String(cd.notes ?? "").trim(),
      });
    } finally {
      setLoading(false);
      setDirty(false);
      setErrors({});
    }
  }, [draftId]);

  function update<K extends keyof ContactDetailsDraft>(key: K, value: ContactDetailsDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function updateEmergency<K extends keyof NonNullable<ContactDetailsDraft["emergency_contact"]>>(
    key: K,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      emergency_contact: {
        ...(prev.emergency_contact ?? {}),
        [key]: value,
      },
    }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[`emergency_contact.${String(key)}`];
      return next;
    });
  }

  const requiredComplete = React.useMemo(() => {
    return (
      isPhone10(form.mobile_primary || "") &&
      isEmail(form.email_official || "") &&
      String(form.current_address || "").trim().length > 0
    );
  }, [form.mobile_primary, form.email_official, form.current_address]);

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    // Required by workflow: phone + email + address must be present before saving
    if (!String(form.mobile_primary ?? "").trim()) e.mobile_primary = "Primary mobile is required.";
    else if (!isPhone10(form.mobile_primary ?? "")) e.mobile_primary = "Primary mobile must be exactly 10 digits.";

    if (!String(form.email_official ?? "").trim()) e.email_official = "Official email is required.";
    else if (!isEmail(form.email_official ?? "")) e.email_official = "Official email format is invalid.";

    if (!String(form.current_address ?? "").trim()) e.current_address = "Current address is required.";

    // Optional validations if present
    if (String(form.mobile_secondary ?? "").trim() && !isPhone10(form.mobile_secondary ?? "")) {
      e.mobile_secondary = "Secondary mobile must be exactly 10 digits.";
    }

    if (String(form.email_personal ?? "").trim() && !isEmail(form.email_personal ?? "")) {
      e.email_personal = "Personal email format is invalid.";
    }

    const emg = form.emergency_contact ?? null;
    const emgAny = !!(emg?.name?.trim() || emg?.relation?.trim() || emg?.phone?.trim());
    if (emgAny) {
      if (emg?.phone?.trim() && !isPhone10(emg.phone)) e["emergency_contact.phone"] = "Emergency phone must be 10 digits.";
      // name/relation optional (some hospitals keep only phone)
    }

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

    const emg = form.emergency_contact ?? { name: "", relation: "", phone: "" };
    const emgAny = !!(emg.name?.trim() || emg.relation?.trim() || emg.phone?.trim());

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      contact_details: {
        mobile_primary: normalizePhone(form.mobile_primary),
        mobile_secondary: form.mobile_secondary?.trim() ? normalizePhone(form.mobile_secondary) : undefined,

        email_official: (form.email_official ?? "").trim().toLowerCase(),
        email_personal: form.email_personal?.trim() ? form.email_personal.trim().toLowerCase() : undefined,

        current_address: (form.current_address ?? "").trim(),
        permanent_address: form.permanent_address?.trim() ? form.permanent_address.trim() : undefined,

        emergency_contact: emgAny
          ? {
              name: emg.name?.trim() || undefined,
              relation: emg.relation?.trim() || undefined,
              phone: emg.phone?.trim() ? normalizePhone(emg.phone) : undefined,
            }
          : null,

        notes: form.notes?.trim() ? form.notes.trim() : undefined,
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "Contact details saved to draft.",
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
      router.push(withDraftId("/infrastructure/staff/onboarding/employment", draftId) as any);
    } catch {
      // handled
    }
  }

  function copyCurrentToPermanent() {
    update("permanent_address", String(form.current_address ?? ""));
  }

  return (
    <OnboardingShell
      stepKey="contact"
      title="Contact details"
      description="Phone + official email + current address are required before you proceed."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/personal", draftId) as any)}
          >
            Back
          </Button>

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
            <div className="text-sm font-medium text-zc-foreground">Step 3: Contact information</div>
            <div className="mt-1 text-xs text-zc-muted">
              Required: primary mobile + official email + current address.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {requiredComplete ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Required complete
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Missing required
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
          {/* Primary Contact */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Primary</div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Primary mobile (10 digits)" required error={errors.mobile_primary}>
                <Input
                  className={cn("border-zc-border", errors.mobile_primary ? "border-red-500" : "")}
                  value={form.mobile_primary ?? ""}
                  onChange={(e) => update("mobile_primary", e.target.value)}
                  placeholder="10-digit mobile"
                />
              </Field>

              <Field label="Official email" required error={errors.email_official}>
                <Input
                  className={cn("border-zc-border", errors.email_official ? "border-red-500" : "")}
                  value={form.email_official ?? ""}
                  onChange={(e) => update("email_official", e.target.value)}
                  placeholder="name@hospital.com"
                />
              </Field>
            </div>

            <Field label="Current address" required error={errors.current_address}>
              <Textarea
                className={cn("border-zc-border", errors.current_address ? "border-red-500" : "")}
                value={form.current_address ?? ""}
                onChange={(e) => update("current_address", e.target.value)}
                placeholder="Current address"
              />
            </Field>
          </div>

          <Separator className="bg-zc-border" />

          {/* Additional Contact */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Additional</div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Secondary mobile (10 digits)" error={errors.mobile_secondary}>
                <Input
                  className={cn("border-zc-border", errors.mobile_secondary ? "border-red-500" : "")}
                  value={form.mobile_secondary ?? ""}
                  onChange={(e) => update("mobile_secondary", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Personal email" error={errors.email_personal}>
                <Input
                  className={cn("border-zc-border", errors.email_personal ? "border-red-500" : "")}
                  value={form.email_personal ?? ""}
                  onChange={(e) => update("email_personal", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-zc-muted">Permanent address</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 border-zc-border px-2 text-xs"
                  onClick={copyCurrentToPermanent}
                  disabled={loading}
                >
                  Copy current → permanent
                </Button>
              </div>
              <Textarea
                className={cn("border-zc-border", errors.permanent_address ? "border-red-500" : "")}
                value={form.permanent_address ?? ""}
                onChange={(e) => update("permanent_address", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* Emergency Contact */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Emergency contact (recommended)</div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Name" error={errors["emergency_contact.name"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.name"] ? "border-red-500" : "")}
                  value={form.emergency_contact?.name ?? ""}
                  onChange={(e) => updateEmergency("name", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Relation" error={errors["emergency_contact.relation"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.relation"] ? "border-red-500" : "")}
                  value={form.emergency_contact?.relation ?? ""}
                  onChange={(e) => updateEmergency("relation", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Phone (10 digits)" error={errors["emergency_contact.phone"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.phone"] ? "border-red-500" : "")}
                  value={form.emergency_contact?.phone ?? ""}
                  onChange={(e) => updateEmergency("phone", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          <div className="grid gap-2">
            <Label className="text-xs text-zc-muted">Notes</Label>
            <Textarea
              className="border-zc-border"
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Next step</div>
            <div className="mt-1">
              Employment details: <span className="font-mono">/onboarding/employment</span>
            </div>
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

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim().toLowerCase());
}

function isPhone10(v: string) {
  return /^\d{10}$/.test(normalizePhone(v));
}

function normalizePhone(v: string | undefined) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}
