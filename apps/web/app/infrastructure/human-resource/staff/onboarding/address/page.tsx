"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type AddressDraft = {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

type AddressDetailsDraft = {
  current_address?: AddressDraft;
  permanent_address?: AddressDraft;
  is_same_as_current?: boolean;
};

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
  address_details?: AddressDetailsDraft;

  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingAddressPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [sameAsCurrent, setSameAsCurrent] = React.useState<boolean>(true);

  const [current, setCurrent] = React.useState<AddressDraft>({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const [permanent, setPermanent] = React.useState<AddressDraft>({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
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

      const ad = (draft.address_details ?? {}) as AddressDetailsDraft;
      const cd = (draft.contact_details ?? {}) as ContactDetailsDraft;

      const seededCurrent = ad.current_address ?? seedAddressFromString(cd.current_address);
      const seededPermanent = ad.permanent_address ?? seedAddressFromString(cd.permanent_address);

      const same = ad.is_same_as_current ?? false;

      setSameAsCurrent(!!same);

      setCurrent({
        address_line1: String(seededCurrent?.address_line1 ?? "").trim(),
        address_line2: String(seededCurrent?.address_line2 ?? "").trim(),
        city: String(seededCurrent?.city ?? "").trim(),
        state: String(seededCurrent?.state ?? "").trim(),
        country: String(seededCurrent?.country ?? "India").trim() || "India",
        pincode: String(seededCurrent?.pincode ?? "").trim(),
      });

      setPermanent({
        address_line1: String(seededPermanent?.address_line1 ?? "").trim(),
        address_line2: String(seededPermanent?.address_line2 ?? "").trim(),
        city: String(seededPermanent?.city ?? "").trim(),
        state: String(seededPermanent?.state ?? "").trim(),
        country: String(seededPermanent?.country ?? "India").trim() || "India",
        pincode: String(seededPermanent?.pincode ?? "").trim(),
      });
    } finally {
      setLoading(false);
      setDirty(false);
      setErrors({});
    }
  }, [draftId]);

  function updateCurrent<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setCurrent((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[`current.${String(key)}`];
      return next;
    });
  }

  function updatePermanent<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setPermanent((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[`permanent.${String(key)}`];
      return next;
    });
  }

  function toggleSameAsCurrent(next: boolean) {
    setSameAsCurrent(next);
    setDirty(true);
    if (next) {
      // mirror current -> permanent (UX-friendly)
      setPermanent((p) => ({
        ...p,
        address_line1: current.address_line1 ?? "",
        address_line2: current.address_line2 ?? "",
        city: current.city ?? "",
        state: current.state ?? "",
        country: current.country ?? "India",
        pincode: current.pincode ?? "",
      }));
    }
  }

  const currentPostalOk = React.useMemo(() => isPincode(current.pincode || ""), [current.pincode]);
  const permanentPostalOk = React.useMemo(() => isPincode(permanent.pincode || ""), [permanent.pincode]);

  const requiredComplete = React.useMemo(() => {
    const cOk =
      !!String(current.address_line1 || "").trim() &&
      !!String(current.city || "").trim() &&
      !!String(current.state || "").trim() &&
      !!String(current.country || "").trim() &&
      isPincode(current.pincode || "");

    if (sameAsCurrent) return cOk;

    const pOk =
      !!String(permanent.address_line1 || "").trim() &&
      !!String(permanent.city || "").trim() &&
      !!String(permanent.state || "").trim() &&
      !!String(permanent.country || "").trim() &&
      isPincode(permanent.pincode || "");

    return cOk && pOk;
  }, [current, permanent, sameAsCurrent]);

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (!String(current.address_line1 ?? "").trim()) e["current.address_line1"] = "Address line 1 is required.";
    if (!String(current.city ?? "").trim()) e["current.city"] = "City is required.";
    if (!String(current.state ?? "").trim()) e["current.state"] = "State is required.";
    if (!String(current.country ?? "").trim()) e["current.country"] = "Country is required.";
    if (!String(current.pincode ?? "").trim()) e["current.pincode"] = "Pincode is required.";
    else if (!isPincode(current.pincode ?? "")) e["current.pincode"] = "Pincode must be 6 digits.";

    if (!sameAsCurrent) {
      if (!String(permanent.address_line1 ?? "").trim()) e["permanent.address_line1"] = "Address line 1 is required.";
      if (!String(permanent.city ?? "").trim()) e["permanent.city"] = "City is required.";
      if (!String(permanent.state ?? "").trim()) e["permanent.state"] = "State is required.";
      if (!String(permanent.country ?? "").trim()) e["permanent.country"] = "Country is required.";
      if (!String(permanent.pincode ?? "").trim()) e["permanent.pincode"] = "Pincode is required.";
      else if (!isPincode(permanent.pincode ?? "")) e["permanent.pincode"] = "Pincode must be 6 digits.";
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
    const cdExisting = (existing.contact_details ?? {}) as ContactDetailsDraft;

    const normalizedCurrent: AddressDraft = {
      address_line1: String(current.address_line1 ?? "").trim(),
      address_line2: current.address_line2?.trim() ? String(current.address_line2).trim() : undefined,
      city: String(current.city ?? "").trim(),
      state: String(current.state ?? "").trim(),
      country: String(current.country ?? "").trim(),
      pincode: normalizePincode(current.pincode),
    };

    const normalizedPermanent: AddressDraft = sameAsCurrent
      ? { ...normalizedCurrent }
      : {
          address_line1: String(permanent.address_line1 ?? "").trim(),
          address_line2: permanent.address_line2?.trim() ? String(permanent.address_line2).trim() : undefined,
          city: String(permanent.city ?? "").trim(),
          state: String(permanent.state ?? "").trim(),
          country: String(permanent.country ?? "").trim(),
          pincode: normalizePincode(permanent.pincode),
        };

    // Also keep a readable string copy inside contact_details so older steps/review remain compatible.
    const currentStr = formatAddress(normalizedCurrent);
    const permanentStr = sameAsCurrent ? currentStr : formatAddress(normalizedPermanent);

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      address_details: {
        current_address: normalizedCurrent,
        permanent_address: normalizedPermanent,
        is_same_as_current: sameAsCurrent,
      },
      contact_details: {
        ...cdExisting,
        current_address: currentStr,
        permanent_address: permanentStr,
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "Address details saved to draft.",
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
      router.push(withDraftId("/infrastructure/staff/onboarding/identity", draftId) as any);
    } catch {
      // handled
    }
  }

  function copyCurrentToPermanent() {
    setPermanent({
      address_line1: current.address_line1 ?? "",
      address_line2: current.address_line2 ?? "",
      city: current.city ?? "",
      state: current.state ?? "",
      country: current.country ?? "India",
      pincode: current.pincode ?? "",
    });
    setSameAsCurrent(false);
    setDirty(true);
  }

  return (
    <OnboardingShell
      stepKey="address"
      title="Address"
      description="Structured current + permanent address. Pincode is validated (6 digits)."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/contact", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Step 4: Address</div>
            <div className="mt-1 text-xs text-zc-muted">
              Required: current address (line1, city, state, country, pincode) + permanent address (unless same as current).
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
          {/* Current Address */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current address (required)</div>
              <Badge
                variant="secondary"
                className={cn(
                  "border border-zc-border",
                  currentPostalOk ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}
              >
                {currentPostalOk ? "Pincode looks valid" : "Invalid pincode"}
              </Badge>
            </div>

            <Field label="Address line 1" required error={errors["current.address_line1"]}>
              <Textarea
                className={cn("border-zc-border", errors["current.address_line1"] ? "border-red-500" : "")}
                value={current.address_line1 ?? ""}
                onChange={(e) => updateCurrent("address_line1", e.target.value)}
                placeholder="House/Flat, Street, Area..."
              />
            </Field>

            <Field label="Address line 2" help="Optional (landmark, locality)" error={errors["current.address_line2"]}>
              <Textarea
                className={cn("border-zc-border", errors["current.address_line2"] ? "border-red-500" : "")}
                value={current.address_line2 ?? ""}
                onChange={(e) => updateCurrent("address_line2", e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="City" required error={errors["current.city"]}>
                <Input
                  className={cn("border-zc-border", errors["current.city"] ? "border-red-500" : "")}
                  value={current.city ?? ""}
                  onChange={(e) => updateCurrent("city", e.target.value)}
                  placeholder="City"
                />
              </Field>

              <Field label="State" required error={errors["current.state"]}>
                <Input
                  className={cn("border-zc-border", errors["current.state"] ? "border-red-500" : "")}
                  value={current.state ?? ""}
                  onChange={(e) => updateCurrent("state", e.target.value)}
                  placeholder="State"
                />
              </Field>

              <Field label="Country" required error={errors["current.country"]}>
                <Input
                  className={cn("border-zc-border", errors["current.country"] ? "border-red-500" : "")}
                  value={current.country ?? ""}
                  onChange={(e) => updateCurrent("country", e.target.value)}
                  placeholder="Country"
                />
              </Field>

              <Field label="Pincode" required error={errors["current.pincode"]}>
                <Input
                  className={cn("border-zc-border", errors["current.pincode"] ? "border-red-500" : "")}
                  value={current.pincode ?? ""}
                  onChange={(e) => updateCurrent("pincode", e.target.value)}
                  placeholder="6 digits"
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* Permanent Address */}
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Permanent address</div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={sameAsCurrent} onCheckedChange={toggleSameAsCurrent} />
                  <Label className="text-xs text-zc-muted">Same as current</Label>
                </div>

                {!sameAsCurrent ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "border border-zc-border",
                      permanentPostalOk ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {permanentPostalOk ? "Pincode looks valid" : "Invalid pincode"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="border border-zc-border">
                    Mirrors current
                  </Badge>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="h-7 border-zc-border px-2 text-xs"
                  onClick={copyCurrentToPermanent}
                  disabled={loading}
                >
                  Edit separately
                </Button>
              </div>
            </div>

            {sameAsCurrent ? (
              <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
                Permanent address will be stored identical to the current address.
              </div>
            ) : (
              <div className="grid gap-3">
                <Field label="Address line 1" required error={errors["permanent.address_line1"]}>
                  <Textarea
                    className={cn("border-zc-border", errors["permanent.address_line1"] ? "border-red-500" : "")}
                    value={permanent.address_line1 ?? ""}
                    onChange={(e) => updatePermanent("address_line1", e.target.value)}
                    placeholder="House/Flat, Street, Area..."
                  />
                </Field>

                <Field label="Address line 2" help="Optional (landmark, locality)" error={errors["permanent.address_line2"]}>
                  <Textarea
                    className={cn("border-zc-border", errors["permanent.address_line2"] ? "border-red-500" : "")}
                    value={permanent.address_line2 ?? ""}
                    onChange={(e) => updatePermanent("address_line2", e.target.value)}
                    placeholder="Optional"
                  />
                </Field>

                <div className="grid gap-3 md:grid-cols-4">
                  <Field label="City" required error={errors["permanent.city"]}>
                    <Input
                      className={cn("border-zc-border", errors["permanent.city"] ? "border-red-500" : "")}
                      value={permanent.city ?? ""}
                      onChange={(e) => updatePermanent("city", e.target.value)}
                      placeholder="City"
                    />
                  </Field>

                  <Field label="State" required error={errors["permanent.state"]}>
                    <Input
                      className={cn("border-zc-border", errors["permanent.state"] ? "border-red-500" : "")}
                      value={permanent.state ?? ""}
                      onChange={(e) => updatePermanent("state", e.target.value)}
                      placeholder="State"
                    />
                  </Field>

                  <Field label="Country" required error={errors["permanent.country"]}>
                    <Input
                      className={cn("border-zc-border", errors["permanent.country"] ? "border-red-500" : "")}
                      value={permanent.country ?? ""}
                      onChange={(e) => updatePermanent("country", e.target.value)}
                      placeholder="Country"
                    />
                  </Field>

                  <Field label="Pincode" required error={errors["permanent.pincode"]}>
                    <Input
                      className={cn("border-zc-border", errors["permanent.pincode"] ? "border-red-500" : "")}
                      value={permanent.pincode ?? ""}
                      onChange={(e) => updatePermanent("pincode", e.target.value)}
                      placeholder="6 digits"
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Next step</div>
            <div className="mt-1">
              Identity documents: <span className="font-mono">/onboarding/identity</span>
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

function isPincode(v: string) {
  return /^\d{6}$/.test(normalizePincode(v));
}

function normalizePincode(v: string | undefined) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}

function seedAddressFromString(raw?: string): AddressDraft {
  const s = String(raw ?? "").trim();
  if (!s) {
    return {
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
    };
  }

  const pinMatch = s.match(/(\d{6})(?!.*\d)/);
  const pincode = pinMatch ? pinMatch[1] : "";

  return {
    address_line1: s,
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    pincode,
  };
}

function formatAddress(a: AddressDraft): string {
  const parts = [
    a.address_line1?.trim(),
    a.address_line2?.trim(),
    a.city?.trim(),
    a.state?.trim(),
    a.country?.trim(),
    a.pincode?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}
