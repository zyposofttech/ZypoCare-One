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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

/**
 * Single-step merge:
 * - Personal details (name + DOB + gender)
 * - Contact details (phone + email + emergency + notes)
 * - Address details (structured current + permanent + sameAsCurrent)
 *
 * Saves into local draft: hrStaffOnboardingDraft:${draftId}
 * Keeps backward-compatible string address inside contact_details for Review/older steps.
 */

type TitleCode = "DR" | "MR" | "MS" | "MRS" | "MX" | "PROF";
type GenderCode = "MALE" | "FEMALE" | "OTHER";
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "SEPARATED";


type ProfessionalTrack = "CLINICAL" | "NON_CLINICAL";

type StaffCategory =
  | "DOCTOR"
  | "NURSE"
  | "PARAMEDIC"
  | "PHARMACIST"
  | "TECHNICIAN"
  | "ADMIN"
  | "STAFF"
  | "SECURITY"
  | "HOUSEKEEPING";

const CLINICAL_STAFF_CATEGORIES = new Set<StaffCategory>(["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"]);

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

  // start step fields (keep compatible)
  employee_id?: string;
  full_name?: string;
  staff_category?: "MEDICAL" | "NON_MEDICAL";
};

type ContactDetailsDraft = {
  mobile_primary?: string;
  mobile_secondary?: string;

  email_official?: string;
  email_personal?: string;

  // Backward compatible string addresses (also used by some Review logic)
  current_address?: string;
  permanent_address?: string;

  emergency_contact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;

  notes?: string;
};

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

type StaffOnboardingDraft = {
  personal_details?: PersonalDetailsDraft;
  contact_details?: ContactDetailsDraft;
  address_details?: AddressDetailsDraft;
  employment_details?: Record<string, any>;
  assignments?: any[];
  system_access?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

const BASE = "/infrastructure/human-resource/staff/onboarding";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function HrStaffOnboardingPersonalMergedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  // PROFESSIONAL IDENTITY (captured early)
  const [staffCategory, setStaffCategory] = React.useState<StaffCategory>("STAFF");


  // PERSONAL
  const [personal, setPersonal] = React.useState<PersonalDetailsDraft>({
    staff_category: "NON_MEDICAL",
    employee_id: "",
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

  // CONTACT
  const [contact, setContact] = React.useState<ContactDetailsDraft>({
    mobile_primary: "",
    mobile_secondary: "",
    email_official: "",
    email_personal: "",
    emergency_contact: { name: "", relation: "", phone: "" },
    notes: "",
  });

  // ADDRESS (structured)
  const [sameAsCurrent, setSameAsCurrent] = React.useState<boolean>(true);

  const [currentAddr, setCurrentAddr] = React.useState<AddressDraft>({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const [permanentAddr, setPermanentAddr] = React.useState<AddressDraft>({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const age = React.useMemo(() => computeAge(personal.date_of_birth), [personal.date_of_birth]);

  // Load draft
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);

      const pd = (draft.personal_details ?? {}) as PersonalDetailsDraft;
      const cd = (draft.contact_details ?? {}) as ContactDetailsDraft;
      const ad = (draft.address_details ?? {}) as AddressDetailsDraft;

      const edAny: any = (draft.employment_details ?? {}) as any;
      const sc = String(edAny?.staff_category ?? edAny?.professional_details?.staff_category ?? "STAFF").toUpperCase();
      const staffCat = (sc as StaffCategory) || "STAFF";
      setStaffCategory(staffCat);


      // Personal
      setPersonal({
        ...pd,
        employee_id: String((pd as any).employee_id ?? "").trim(),
        staff_category: (pd.staff_category ?? (CLINICAL_STAFF_CATEGORIES.has(staffCat) ? "MEDICAL" : "NON_MEDICAL")) as any,
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

      // Contact
      const emg = cd.emergency_contact ?? { name: "", relation: "", phone: "" };
      setContact({
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

      // Address (seed from structured, else derive from string)
      const seededCurrent = ad.current_address ?? seedAddressFromString(cd.current_address);
      const seededPermanent = ad.permanent_address ?? seedAddressFromString(cd.permanent_address);
      const same = ad.is_same_as_current ?? false;

      setSameAsCurrent(!!same);

      setCurrentAddr({
        address_line1: String(seededCurrent?.address_line1 ?? "").trim(),
        address_line2: String(seededCurrent?.address_line2 ?? "").trim(),
        city: String(seededCurrent?.city ?? "").trim(),
        state: String(seededCurrent?.state ?? "").trim(),
        country: String(seededCurrent?.country ?? "India").trim() || "India",
        pincode: String(seededCurrent?.pincode ?? "").trim(),
      });

      setPermanentAddr({
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

  // ----- update helpers -----
  function updateStaffCategory(next: StaffCategory) {
    setStaffCategory(next);
    // Auto-derive track from category (clinical roles default to Clinical)
    const isClinical = CLINICAL_STAFF_CATEGORIES.has(next);
    setPersonal((prev) => ({ ...prev, staff_category: isClinical ? "MEDICAL" : (prev.staff_category ?? "NON_MEDICAL") }));
    markDirtyClearError("staff_category");
    markDirtyClearError("staff_track");
  }

  function updateTrack(next: "MEDICAL" | "NON_MEDICAL") {
    setPersonal((prev) => ({ ...prev, staff_category: next }));
    markDirtyClearError("staff_track");
  }

  function markDirtyClearError(key: string) {
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function updatePersonal<K extends keyof PersonalDetailsDraft>(key: K, value: PersonalDetailsDraft[K]) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
    markDirtyClearError(String(key));
  }

  function updateContact<K extends keyof ContactDetailsDraft>(key: K, value: ContactDetailsDraft[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
    markDirtyClearError(String(key));
  }

  function updateEmergency<K extends keyof NonNullable<ContactDetailsDraft["emergency_contact"]>>(key: K, value: string) {
    setContact((prev) => ({
      ...prev,
      emergency_contact: {
        ...(prev.emergency_contact ?? {}),
        [key]: value,
      },
    }));
    markDirtyClearError(`emergency_contact.${String(key)}`);
  }

  function updateCurrent<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setCurrentAddr((prev) => ({ ...prev, [key]: value }));
    markDirtyClearError(`current.${String(key)}`);
  }

  function updatePermanent<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setPermanentAddr((prev) => ({ ...prev, [key]: value }));
    markDirtyClearError(`permanent.${String(key)}`);
  }

  function autoComputeDisplayName() {
    const dn = computeDisplayName(personal.title, personal.first_name, personal.middle_name, personal.last_name);
    updatePersonal("display_name", dn);
  }

  function toggleSame(next: boolean) {
    setSameAsCurrent(next);
    setDirty(true);
    if (next) {
      setPermanentAddr({
        address_line1: currentAddr.address_line1 ?? "",
        address_line2: currentAddr.address_line2 ?? "",
        city: currentAddr.city ?? "",
        state: currentAddr.state ?? "",
        country: currentAddr.country ?? "India",
        pincode: currentAddr.pincode ?? "",
      });
    }
  }

  React.useEffect(() => {
    if (!sameAsCurrent) return;
    setPermanentAddr({
      address_line1: currentAddr.address_line1 ?? "",
      address_line2: currentAddr.address_line2 ?? "",
      city: currentAddr.city ?? "",
      state: currentAddr.state ?? "",
      country: currentAddr.country ?? "India",
      pincode: currentAddr.pincode ?? "",
    });
  }, [sameAsCurrent, currentAddr]);

  function setFieldError(key: string, message?: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  function validateEmailField(key: string, value: string | undefined, required: boolean, label: string) {
    const msg = getEmailError(value, required, label);
    setFieldError(key, msg);
  }

  function validatePhoneField(key: string, value: string | undefined, required: boolean, label: string) {
    const msg = getPhoneError(value, required, label);
    setFieldError(key, msg);
  }

  function validateEmergencyGroup(
    next?: Partial<NonNullable<ContactDetailsDraft["emergency_contact"]>>,
  ) {
    const base = contact.emergency_contact ?? {};
    const merged = { ...base, ...(next ?? {}) };
    const emgName = String(merged?.name ?? "").trim();
    const emgRelation = String(merged?.relation ?? "").trim();
    const emgPhone = String(merged?.phone ?? "").trim();
    const emgAny = !!(emgName || emgRelation || emgPhone);

    if (!emgAny) {
      setFieldError("emergency_contact.name", null);
      setFieldError("emergency_contact.relation", null);
      setFieldError("emergency_contact.phone", null);
      return;
    }

    setFieldError("emergency_contact.name", emgName ? null : "Emergency contact name is required.");
    setFieldError("emergency_contact.relation", emgRelation ? null : "Emergency contact relation is required.");
    setFieldError("emergency_contact.phone", getPhoneError(emgPhone, true, "Emergency contact phone"));
  }

  // ----- validation -----
  function validateAll(): FieldErrorMap {
    const e: FieldErrorMap = {};

    // Professional identity required
    const sc = String(staffCategory ?? "").trim();
    if (!sc) e.staff_category = "Staff category is required.";

    const track = String(personal.staff_category ?? "").trim();
    if (!track) e.staff_track = "Track is required.";

    // Employee ID required (org policy)
    const emp = String(personal.employee_id ?? "").trim();
    if (!emp) e.employee_id = "Employee ID is required.";
    else if (emp.length > 32) e.employee_id = "Employee ID must be <= 32 characters.";
    else if (!/^[A-Za-z0-9._-]+$/.test(emp)) e.employee_id = "Only letters, numbers, dot (.), dash (-), underscore (_) allowed.";

    // Personal required
    if (!personal.title) e.title = "Title is required.";
    if (!String(personal.first_name ?? "").trim()) e.first_name = "First name is required.";
    if (!String(personal.last_name ?? "").trim()) e.last_name = "Last name is required.";
    if (!String(personal.date_of_birth ?? "").trim()) e.date_of_birth = "Date of birth is required.";
    if (personal.date_of_birth && !isValidYmd(personal.date_of_birth)) e.date_of_birth = "Invalid date.";
    if (personal.date_of_birth && computeAge(personal.date_of_birth) === null) e.date_of_birth = "Date is out of range.";
    if (!personal.gender) e.gender = "Gender is required.";

    // Contact required by workflow: phone + email
    const primaryPhoneErr = getPhoneError(contact.mobile_primary, true, "Primary mobile");
    if (primaryPhoneErr) e.mobile_primary = primaryPhoneErr;

    const officialEmailErr = getEmailError(contact.email_official, true, "Official email");
    if (officialEmailErr) e.email_official = officialEmailErr;

    // Optional validations
    const secondaryPhoneErr = getPhoneError(contact.mobile_secondary, false, "Secondary mobile");
    if (secondaryPhoneErr) e.mobile_secondary = secondaryPhoneErr;

    const personalEmailErr = getEmailError(contact.email_personal, false, "Personal email");
    if (personalEmailErr) e.email_personal = personalEmailErr;

    const emg = contact.emergency_contact ?? null;
    const emgName = String(emg?.name ?? "").trim();
    const emgRelation = String(emg?.relation ?? "").trim();
    const emgPhone = String(emg?.phone ?? "").trim();
    const emgAny = !!(emgName || emgRelation || emgPhone);
    if (emgAny) {
      if (!emgName) e["emergency_contact.name"] = "Emergency contact name is required.";
      if (!emgRelation) e["emergency_contact.relation"] = "Emergency contact relation is required.";
      const emgPhoneErr = getPhoneError(emgPhone, true, "Emergency contact phone");
      if (emgPhoneErr) e["emergency_contact.phone"] = emgPhoneErr;
    }

    // Address required (structured current always, permanent if not sameAsCurrent)
    if (!String(currentAddr.address_line1 ?? "").trim()) e["current.address_line1"] = "Address line 1 is required.";
    if (!String(currentAddr.city ?? "").trim()) e["current.city"] = "City is required.";
    else if (!isAlphaSpace(currentAddr.city ?? "")) e["current.city"] = "City must contain only letters.";
    if (!String(currentAddr.state ?? "").trim()) e["current.state"] = "State is required.";
    else if (!isIndianState(currentAddr.state ?? "")) e["current.state"] = "Select a valid Indian state.";
    if (!String(currentAddr.country ?? "").trim()) e["current.country"] = "Country is required.";
    if (!String(currentAddr.pincode ?? "").trim()) e["current.pincode"] = "Pincode is required.";
    else if (!isPincode(currentAddr.pincode ?? "")) e["current.pincode"] = "Pincode must be 6 digits.";

    if (!sameAsCurrent) {
      if (!String(permanentAddr.address_line1 ?? "").trim()) e["permanent.address_line1"] = "Address line 1 is required.";
      if (!String(permanentAddr.city ?? "").trim()) e["permanent.city"] = "City is required.";
      else if (!isAlphaSpace(permanentAddr.city ?? "")) e["permanent.city"] = "City must contain only letters.";
      if (!String(permanentAddr.state ?? "").trim()) e["permanent.state"] = "State is required.";
      else if (!isIndianState(permanentAddr.state ?? "")) e["permanent.state"] = "Select a valid Indian state.";
      if (!String(permanentAddr.country ?? "").trim()) e["permanent.country"] = "Country is required.";
      if (!String(permanentAddr.pincode ?? "").trim()) e["permanent.pincode"] = "Pincode is required.";
      else if (!isPincode(permanentAddr.pincode ?? "")) e["permanent.pincode"] = "Pincode must be 6 digits.";
    }

    return e;
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    const nextErrors = validateAll();
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

    const normalizedPersonal = normalizePersonalDraft({
      ...personal,
      display_name:
        String(personal.display_name ?? "").trim() ||
        computeDisplayName(personal.title, personal.first_name, personal.middle_name, personal.last_name),
    });

    const normalizedCurrent: AddressDraft = {
      address_line1: String(currentAddr.address_line1 ?? "").trim(),
      address_line2: currentAddr.address_line2?.trim() ? String(currentAddr.address_line2).trim() : undefined,
      city: String(currentAddr.city ?? "").trim(),
      state: String(currentAddr.state ?? "").trim(),
      country: String(currentAddr.country ?? "").trim(),
      pincode: normalizePincode(currentAddr.pincode),
    };

    const normalizedPermanent: AddressDraft = sameAsCurrent
      ? { ...normalizedCurrent }
      : {
          address_line1: String(permanentAddr.address_line1 ?? "").trim(),
          address_line2: permanentAddr.address_line2?.trim() ? String(permanentAddr.address_line2).trim() : undefined,
          city: String(permanentAddr.city ?? "").trim(),
          state: String(permanentAddr.state ?? "").trim(),
          country: String(permanentAddr.country ?? "").trim(),
          pincode: normalizePincode(permanentAddr.pincode),
        };

    // Backward compatible string copies
    const currentStr = formatAddress(normalizedCurrent);
    const permanentStr = sameAsCurrent ? currentStr : formatAddress(normalizedPermanent);

    const emg = contact.emergency_contact ?? { name: "", relation: "", phone: "" };
    const emgAny = !!(emg.name?.trim() || emg.relation?.trim() || emg.phone?.trim());

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      personal_details: {
        ...(existing.personal_details ?? {}),
        ...normalizedPersonal,
      },
      address_details: {
        current_address: normalizedCurrent,
        permanent_address: normalizedPermanent,
        is_same_as_current: sameAsCurrent,
      },
      employment_details: {
        ...(existing.employment_details ?? {}),
        staff_category: String(staffCategory ?? "STAFF").toUpperCase(),
        category: (personal.staff_category ?? "NON_MEDICAL"),
        professional_details: {
          ...(((existing.employment_details as any) ?? {})?.professional_details ?? {}),
          track: (personal.staff_category === "MEDICAL" ? "CLINICAL" : "NON_CLINICAL"),
          staff_category: String(staffCategory ?? "STAFF").toUpperCase(),
        },
      },
      contact_details: {
        ...(existing.contact_details ?? {}),
        mobile_primary: normalizePhone(contact.mobile_primary),
        mobile_secondary: contact.mobile_secondary?.trim() ? normalizePhone(contact.mobile_secondary) : undefined,

        email_official: (contact.email_official ?? "").trim().toLowerCase(),
        email_personal: contact.email_personal?.trim() ? contact.email_personal.trim().toLowerCase() : undefined,

        current_address: currentStr,
        permanent_address: permanentStr,

        emergency_contact: emgAny
          ? {
              name: emg.name?.trim() || undefined,
              relation: emg.relation?.trim() || undefined,
              phone: emg.phone?.trim() ? normalizePhone(emg.phone) : undefined,
            }
          : null,

        notes: contact.notes?.trim() ? contact.notes.trim() : undefined,
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({ title: "Saved", description: "Personal details saved to draft." });
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
      // After merge, jump directly to Identity
      router.push(withDraftId(`${BASE}/identity`, draftId) as any);
    } catch {
      // handled
    }
  }

  const currentPostalOk = React.useMemo(() => isPincode(currentAddr.pincode || ""), [currentAddr.pincode]);
  const permanentPostalOk = React.useMemo(() => isPincode(permanentAddr.pincode || ""), [permanentAddr.pincode]);

  return (
    <OnboardingShell
      stepKey="personal"
      onSaveDraft={async () => {
        saveDraftOrThrow();
      }}
      title="Personal details"
      description="Add Personal, Contact and Address Details for the staff member. This is the first step of the onboarding process."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">

          <div className="flex items-center gap-2">
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={onSaveAndNext} disabled={loading}>
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 1: Personal Details</div>
            <div className="mt-1 text-xs text-zc-muted">
              Required: staff category + track + employee ID + title + name + DOB + gender + primary mobile + official email + current address.
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
          {/* PERSONAL */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Basic details</div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Staff category" required error={errors.staff_category}>
                <Select value={staffCategory ?? ""} onValueChange={(v) => updateStaffCategory((v || "STAFF") as StaffCategory)}>
                  <SelectTrigger className={cn("border-zc-border", errors.staff_category ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="NURSE">Nurse</SelectItem>
                    <SelectItem value="PARAMEDIC">Paramedic</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="TECHNICIAN">Technician</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="HOUSEKEEPING">Housekeeping</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Track" required help="Clinical vs Non-clinical" error={errors.staff_track}>
                <Select value={(personal.staff_category ?? "") as any} onValueChange={(v) => updateTrack((v || "NON_MEDICAL") as any)}>
                  <SelectTrigger className={cn("border-zc-border", errors.staff_track ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDICAL">Clinical</SelectItem>
                    <SelectItem value="NON_MEDICAL">Non-clinical</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

             <Field label="Employee ID" required error={errors.employee_id}>
                <Input
                  className={cn("border-zc-border", errors.employee_id ? "border-red-500" : "")}
                  value={personal.employee_id ?? ""}
                  onChange={(e) => updatePersonal("employee_id", e.target.value)}
                  placeholder="e.g., EMP-000123"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Title" required error={errors.title}>
                <Select value={personal.title ?? ""} onValueChange={(v) => updatePersonal("title", v as TitleCode)}>
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
                  value={personal.first_name ?? ""}
                  onChange={(e) => updatePersonal("first_name", e.target.value)}
                  placeholder="e.g., Rajesh"
                />
              </Field>

              <Field label="Middle name" error={errors.middle_name}>
                <Input
                  className={cn("border-zc-border", errors.middle_name ? "border-red-500" : "")}
                  value={personal.middle_name ?? ""}
                  onChange={(e) => updatePersonal("middle_name", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Last name" required error={errors.last_name}>
                <Input
                  className={cn("border-zc-border", errors.last_name ? "border-red-500" : "")}
                  value={personal.last_name ?? ""}
                  onChange={(e) => updatePersonal("last_name", e.target.value)}
                  placeholder="e.g., Sharma"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
              
              <Field label="Display name" required help="Auto-computed, but editable" error={errors.display_name}>
                <Input
                  className={cn("border-zc-border", errors.display_name ? "border-red-500" : "")}
                  value={personal.display_name ?? ""}
                  onChange={(e) => updatePersonal("display_name", e.target.value)}
                  placeholder="e.g., Dr. Rajesh Kumar Sharma"
                />
              </Field>
              <div className="grid gap-2 md:self-end">
                <Label className="text-xs text-zc-muted">&nbsp;</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full border-zc-border"
                  onClick={autoComputeDisplayName}
                  disabled={loading}
                >
                  Auto compute
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Personal details</div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Date of birth" required error={errors.date_of_birth}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.date_of_birth ? "border-red-500" : "")}
                  value={personal.date_of_birth ?? ""}
                  onChange={(e) => updatePersonal("date_of_birth", e.target.value)}
                />
              </Field>

              <Field label="Gender" required error={errors.gender}>
                <Select value={personal.gender ?? ""} onValueChange={(v) => updatePersonal("gender", v as GenderCode)}>
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
                  value={personal.blood_group ?? ""}
                  onValueChange={(v) => updatePersonal("blood_group", (v || undefined) as BloodGroup)}
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
                  value={personal.marital_status ?? ""}
                  onValueChange={(v) => updatePersonal("marital_status", (v || undefined) as MaritalStatus)}
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

          {/* CONTACT */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Contact</div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Primary mobile (10 digits)" required error={errors.mobile_primary}>
                <Input
                  className={cn("border-zc-border", errors.mobile_primary ? "border-red-500" : "")}
                  value={contact.mobile_primary ?? ""}
                  onChange={(e) => updateContact("mobile_primary", normalizePhoneInput(e.target.value))}
                  onBlur={(e) => validatePhoneField("mobile_primary", e.currentTarget.value, true, "Primary mobile")}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                />
              </Field>

              <Field label="Official email" required error={errors.email_official}>
                <Input
                  className={cn("border-zc-border", errors.email_official ? "border-red-500" : "")}
                  value={contact.email_official ?? ""}
                  onChange={(e) => updateContact("email_official", e.target.value)}
                  onBlur={(e) => validateEmailField("email_official", e.currentTarget.value, true, "Official email")}
                  placeholder="name@hospital.com"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Secondary mobile (10 digits)" error={errors.mobile_secondary}>
                <Input
                  className={cn("border-zc-border", errors.mobile_secondary ? "border-red-500" : "")}
                  value={contact.mobile_secondary ?? ""}
                  onChange={(e) => updateContact("mobile_secondary", normalizePhoneInput(e.target.value))}
                  onBlur={(e) => validatePhoneField("mobile_secondary", e.currentTarget.value, false, "Secondary mobile")}
                  placeholder="Optional"
                  inputMode="numeric"
                  maxLength={10}
                />
              </Field>

              <Field label="Personal email" error={errors.email_personal}>
                <Input
                  className={cn("border-zc-border", errors.email_personal ? "border-red-500" : "")}
                  value={contact.email_personal ?? ""}
                  onChange={(e) => updateContact("email_personal", e.target.value)}
                  onBlur={(e) => validateEmailField("email_personal", e.currentTarget.value, false, "Personal email")}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* ADDRESS */}
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Address</div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={cn(
                    "border border-zc-border",
                    currentPostalOk
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {currentPostalOk ? "Current pincode valid" : "Current pincode invalid"}
                </Badge>

                

                {!sameAsCurrent ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "border border-zc-border",
                      permanentPostalOk
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {permanentPostalOk ? "Permanent pincode valid" : "Permanent pincode invalid"}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current address (required)</div>

              <Field label="Address line 1" required error={errors["current.address_line1"]}>
                <Textarea
                  className={cn("border-zc-border", errors["current.address_line1"] ? "border-red-500" : "")}
                  value={currentAddr.address_line1 ?? ""}
                  onChange={(e) => updateCurrent("address_line1", e.target.value)}
                  placeholder="House/Flat, Street, Area..."
                />
              </Field>

              <Field label="Address line 2" help="Optional (landmark, locality)" error={errors["current.address_line2"]}>
                <Textarea
                  className={cn("border-zc-border", errors["current.address_line2"] ? "border-red-500" : "")}
                  value={currentAddr.address_line2 ?? ""}
                  onChange={(e) => updateCurrent("address_line2", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label="City" required error={errors["current.city"]}>
                  <Input
                    className={cn("border-zc-border", errors["current.city"] ? "border-red-500" : "")}
                    value={currentAddr.city ?? ""}
                    onChange={(e) => updateCurrent("city", normalizeCityInput(e.target.value))}
                    placeholder="City"
                  />
                </Field>

                <Field label="State" required error={errors["current.state"]}>
                  <Select value={currentAddr.state ?? ""} onValueChange={(v) => updateCurrent("state", v)}>
                    <SelectTrigger className={cn("border-zc-border", errors["current.state"] ? "border-red-500" : "")}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Country" required error={errors["current.country"]}>
                  <Input
                    className={cn("border-zc-border", errors["current.country"] ? "border-red-500" : "")}
                    value={currentAddr.country ?? ""}
                    onChange={(e) => updateCurrent("country", e.target.value)}
                    placeholder="Country"
                  />
                </Field>

                <Field label="Pincode" required error={errors["current.pincode"]}>
                <Input
                  className={cn("border-zc-border", errors["current.pincode"] ? "border-red-500" : "")}
                  value={currentAddr.pincode ?? ""}
                  onChange={(e) => updateCurrent("pincode", normalizePincodeInput(e.target.value))}
                  placeholder="6 digits"
                  inputMode="numeric"
                  maxLength={6}
                />
              </Field>
              </div>
            </div>

            <div className="grid gap-3">
              <Separator className="bg-zc-border" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Permanent address (required)
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={sameAsCurrent} onCheckedChange={toggleSame} />
                  <Label className="text-xs text-zc-muted">Permanent same as current</Label>
                </div>
              </div>
              {sameAsCurrent ? (
                <div className="rounded-md border border-zc-border bg-zc-card/40 p-3 text-xs text-zc-muted">
                  Permanent address will be stored identical to the current address.
                </div>
              ) : null}
              <Field
                label="Address line 1"
                required
                error={sameAsCurrent ? undefined : errors["permanent.address_line1"]}
              >
                <Textarea
                  className={cn(
                    "border-zc-border",
                    sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                    !sameAsCurrent && errors["permanent.address_line1"] ? "border-red-500" : ""
                  )}
                  value={permanentAddr.address_line1 ?? ""}
                  onChange={(e) => updatePermanent("address_line1", e.target.value)}
                  placeholder="House/Flat, Street, Area..."
                  readOnly={sameAsCurrent}
                />
              </Field>

              <Field
                label="Address line 2"
                help="Optional (landmark, locality)"
                error={sameAsCurrent ? undefined : errors["permanent.address_line2"]}
              >
                <Textarea
                  className={cn(
                    "border-zc-border",
                    sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                    !sameAsCurrent && errors["permanent.address_line2"] ? "border-red-500" : ""
                  )}
                  value={permanentAddr.address_line2 ?? ""}
                  onChange={(e) => updatePermanent("address_line2", e.target.value)}
                  placeholder="Optional"
                  readOnly={sameAsCurrent}
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label="City" required error={sameAsCurrent ? undefined : errors["permanent.city"]}>
                <Input
                  className={cn(
                    "border-zc-border",
                    sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                    !sameAsCurrent && errors["permanent.city"] ? "border-red-500" : ""
                  )}
                  value={permanentAddr.city ?? ""}
                  onChange={(e) => updatePermanent("city", normalizeCityInput(e.target.value))}
                  placeholder="City"
                  readOnly={sameAsCurrent}
                />
              </Field>

                <Field label="State" required error={sameAsCurrent ? undefined : errors["permanent.state"]}>
                  <Select
                    value={permanentAddr.state ?? ""}
                    onValueChange={(v) => updatePermanent("state", v)}
                    disabled={sameAsCurrent}
                  >
                    <SelectTrigger
                      className={cn(
                        "border-zc-border",
                        sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                        !sameAsCurrent && errors["permanent.state"] ? "border-red-500" : ""
                      )}
                    >
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Country" required error={sameAsCurrent ? undefined : errors["permanent.country"]}>
                  <Input
                    className={cn(
                      "border-zc-border",
                      sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                      !sameAsCurrent && errors["permanent.country"] ? "border-red-500" : ""
                    )}
                    value={permanentAddr.country ?? ""}
                    onChange={(e) => updatePermanent("country", e.target.value)}
                    placeholder="Country"
                    readOnly={sameAsCurrent}
                  />
                </Field>

                <Field label="Pincode" required error={sameAsCurrent ? undefined : errors["permanent.pincode"]}>
                <Input
                  className={cn(
                    "border-zc-border",
                    sameAsCurrent ? "bg-zc-card/30 text-zc-muted" : "",
                    !sameAsCurrent && errors["permanent.pincode"] ? "border-red-500" : ""
                  )}
                  value={permanentAddr.pincode ?? ""}
                  onChange={(e) => updatePermanent("pincode", normalizePincodeInput(e.target.value))}
                  placeholder="6 digits"
                  inputMode="numeric"
                  maxLength={6}
                  readOnly={sameAsCurrent}
                />
              </Field>
              </div>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* Emergency + Notes */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Emergency contact (optional)</div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Name" error={errors["emergency_contact.name"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.name"] ? "border-red-500" : "")}
                  value={contact.emergency_contact?.name ?? ""}
                  onChange={(e) => updateEmergency("name", e.target.value)}
                  onBlur={(e) => validateEmergencyGroup({ name: e.currentTarget.value })}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Relation" error={errors["emergency_contact.relation"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.relation"] ? "border-red-500" : "")}
                  value={contact.emergency_contact?.relation ?? ""}
                  onChange={(e) => updateEmergency("relation", e.target.value)}
                  onBlur={(e) => validateEmergencyGroup({ relation: e.currentTarget.value })}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Phone (10 digits)" error={errors["emergency_contact.phone"]}>
                <Input
                  className={cn("border-zc-border", errors["emergency_contact.phone"] ? "border-red-500" : "")}
                  value={contact.emergency_contact?.phone ?? ""}
                  onChange={(e) => updateEmergency("phone", normalizePhoneInput(e.target.value))}
                  onBlur={(e) => validateEmergencyGroup({ phone: e.currentTarget.value })}
                  placeholder="Optional"
                  inputMode="numeric"
                  maxLength={10}
                />
              </Field>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-zc-muted">Notes</Label>
              <Textarea
                className="border-zc-border"
                value={contact.notes ?? ""}
                onChange={(e) => updateContact("notes", e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="rounded-md border border-zc-border bg-zc-card/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Next step</div>
            <div className="mt-1">
              Identity documents: <span className="font-mono">{BASE}/identity</span>
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

// ---------- draft helpers ----------
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

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

// ---------- validation helpers ----------
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim().toLowerCase());
}

function getEmailError(value: string | undefined, required: boolean, label: string): string | null {
  const v = String(value ?? "").trim();
  if (!v) return required ? `${label} is required.` : null;
  if (!isEmail(v)) return `${label} format is invalid.`;
  return null;
}

function normalizePhone(v: string | undefined) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}

function normalizePhoneInput(v: string | undefined) {
  return normalizePhone(v).slice(0, 10);
}

function getPhoneError(value: string | undefined, required: boolean, label: string): string | null {
  const v = normalizePhone(value);
  if (!v) return required ? `${label} is required.` : null;
  if (!/^[6-9]/.test(v)) return `${label} must start with 6, 7, 8, or 9.`;
  if (v.length !== 10) return `${label} must be exactly 10 digits.`;
  return null;
}

function normalizePincode(v: string | undefined) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}

function normalizePincodeInput(v: string | undefined) {
  return normalizePincode(v).slice(0, 6);
}

function isPincode(v: string) {
  return /^\d{6}$/.test(normalizePincode(v));
}

function normalizeCityInput(v: string | undefined) {
  return String(v || "").replace(/[^a-zA-Z ]/g, "");
}

function isAlphaSpace(v: string | undefined) {
  return /^[a-zA-Z ]+$/.test(String(v ?? "").trim());
}

function isIndianState(v: string | undefined) {
  return INDIAN_STATES.includes(String(v ?? "").trim());
}

// ---------- personal helpers ----------
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
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
    // keep start step fields if present
    employee_id: String(d.employee_id ?? "").trim() || undefined,
    full_name: d.full_name,
    staff_category: d.staff_category,

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

// ---------- address helpers ----------
function seedAddressFromString(raw?: string): AddressDraft {
  const s = String(raw ?? "").trim();
  if (!s) {
    return { address_line1: "", address_line2: "", city: "", state: "", country: "India", pincode: "" };
  }
  const pinMatch = s.match(/(\d{6})(?!.*\d)/);
  const pincode = pinMatch ? pinMatch[1] : "";
  return { address_line1: s, address_line2: "", city: "", state: "", country: "India", pincode };
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
