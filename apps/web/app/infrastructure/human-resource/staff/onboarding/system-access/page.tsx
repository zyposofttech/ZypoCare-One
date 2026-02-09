"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type SystemAccessMode = "NONE" | "LINK_EXISTING" | "CREATE_NEW";
type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

type SystemAccessDraft = {
  enabled: boolean;
  mode: SystemAccessMode;

  // LINK_EXISTING
  linked_user_id?: string;
  linked_user_email?: string;

  // CREATE_NEW
  new_user?: {
    username?: string;
    email?: string;
    phone?: string;
    display_name?: string;
  } | null;

  // RBAC bindings (contract-friendly)
  role_template_codes?: string[]; // e.g. ["HR_ADMIN", "DOCTOR_BASIC"]
  primary_role_code?: string | null;

  // Security knobs (contract-friendly)
  user_status?: UserStatus;
  must_change_password?: boolean;
  mfa_required?: boolean;

  notes?: string;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: SystemAccessDraft;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingSystemAccessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [form, setForm] = React.useState<SystemAccessDraft>({
    enabled: false,
    mode: "NONE",
    linked_user_id: "",
    linked_user_email: "",
    new_user: { username: "", email: "", phone: "", display_name: "" },
    role_template_codes: [],
    primary_role_code: null,
    user_status: "INVITED",
    must_change_password: true,
    mfa_required: false,
    notes: "",
  });

  const [roleCodesText, setRoleCodesText] = React.useState<string>("");
  const [primaryRoleText, setPrimaryRoleText] = React.useState<string>("");

  // Ensure stable draftId in URL (wizard relies on it)
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const sa = (draft.system_access ?? null) as SystemAccessDraft | null;

      const next: SystemAccessDraft = sa
        ? {
            enabled: !!sa.enabled,
            mode: (sa.mode ?? (sa.enabled ? "LINK_EXISTING" : "NONE")) as SystemAccessMode,

            linked_user_id: String(sa.linked_user_id ?? ""),
            linked_user_email: String(sa.linked_user_email ?? ""),

            new_user: sa.new_user
              ? {
                  username: String(sa.new_user.username ?? ""),
                  email: String(sa.new_user.email ?? ""),
                  phone: String(sa.new_user.phone ?? ""),
                  display_name: String(sa.new_user.display_name ?? ""),
                }
              : { username: "", email: "", phone: "", display_name: "" },

            role_template_codes: Array.isArray(sa.role_template_codes) ? sa.role_template_codes : [],
            primary_role_code: sa.primary_role_code ?? null,

            user_status: (sa.user_status ?? "INVITED") as UserStatus,
            must_change_password: sa.must_change_password ?? true,
            mfa_required: sa.mfa_required ?? false,

            notes: String(sa.notes ?? ""),
          }
        : {
            enabled: false,
            mode: "NONE",
            linked_user_id: "",
            linked_user_email: "",
            new_user: { username: "", email: "", phone: "", display_name: "" },
            role_template_codes: [],
            primary_role_code: null,
            user_status: "INVITED",
            must_change_password: true,
            mfa_required: false,
            notes: "",
          };

      setForm(next);

      const roleTxt = (next.role_template_codes ?? []).join(", ");
      setRoleCodesText(roleTxt);
      setPrimaryRoleText(String(next.primary_role_code ?? ""));

      setErrors({});
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  const prerequisites = React.useMemo(() => {
    // Contact step required (phone+email+address) already enforced on Contact page,
    // but we still gate here for clean flow.
    if (!draftId) return { ok: true, reason: "" };

    const draft = readDraft(draftId);
    const cd: any = draft.contact_details ?? {};
    const phone = normalizePhone(String(cd.mobile_primary ?? ""));
    const email = String(cd.email_official ?? "").trim().toLowerCase();
    const addr = String(cd.current_address ?? "").trim();

    const ok = /^\d{10}$/.test(phone) && isEmail(email) && !!addr;
    return {
      ok,
      reason: ok ? "" : "Contact step incomplete: primary mobile + official email + current address are required.",
    };
  }, [draftId]);

  function update<K extends keyof SystemAccessDraft>(key: K, value: SystemAccessDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function updateNewUser<K extends keyof NonNullable<SystemAccessDraft["new_user"]>>(key: K, value: string) {
    setForm((prev) => ({
      ...prev,
      new_user: {
        ...(prev.new_user ?? {}),
        [key]: value,
      },
    }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[`new_user.${String(key)}`];
      return next;
    });
  }

  function toggleEnabled(v: boolean) {
    setForm((prev) => {
      const next: SystemAccessDraft = {
        ...prev,
        enabled: v,
        mode: v ? (prev.mode === "NONE" ? "LINK_EXISTING" : prev.mode) : "NONE",
      };
      return next;
    });
    setDirty(true);
  }

  function setMode(mode: SystemAccessMode) {
    setForm((prev) => ({
      ...prev,
      mode,
      enabled: mode === "NONE" ? false : true,
    }));
    setDirty(true);
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (!prerequisites.ok) {
      e._global = prerequisites.reason;
      return e;
    }

    if (!form.enabled || form.mode === "NONE") {
      // No access enabled -> no required fields
      return e;
    }

    // roles
    const roleCodes = parseRoleCodes(roleCodesText);
    if (roleCodes.length === 0) e.role_template_codes = "At least one role template code is required.";

    const primary = String(primaryRoleText || "").trim();
    if (primary && roleCodes.length && !roleCodes.includes(primary)) {
      e.primary_role_code = "Primary role must be one of the selected role template codes.";
    }

    if (form.mode === "LINK_EXISTING") {
      const uid = String(form.linked_user_id ?? "").trim();
      const em = String(form.linked_user_email ?? "").trim();
      if (!uid && !em) e.linked_user_id = "Provide either User ID or Email to link an existing user.";
      if (em && !isEmail(em)) e.linked_user_email = "Invalid email format.";
    }

    if (form.mode === "CREATE_NEW") {
      const nu = form.new_user ?? {};
      const username = String(nu.username ?? "").trim();
      const email = String(nu.email ?? "").trim().toLowerCase();
      const phone = normalizePhone(String(nu.phone ?? ""));
      if (!username) e["new_user.username"] = "Username is required.";
      if (!email) e["new_user.email"] = "Email is required.";
      else if (!isEmail(email)) e["new_user.email"] = "Invalid email format.";
      // phone optional, but if present validate 10 digits (India assumption)
      if (phone && !/^\d{10}$/.test(phone)) e["new_user.phone"] = "Phone must be 10 digits.";
    }

    return e;
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    const ve = validate();
    setErrors(ve);

    if (Object.keys(ve).length) {
      toast({
        variant: "destructive",
        title: "Fix system access fields",
        description: ve._global ? ve._global : "Please fix the highlighted fields to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(id);

    const roleCodes = parseRoleCodes(roleCodesText);
    const primary = String(primaryRoleText || "").trim() || null;

    const normalized: SystemAccessDraft = !form.enabled || form.mode === "NONE"
      ? {
          enabled: false,
          mode: "NONE",
          role_template_codes: [],
          primary_role_code: null,
          user_status: "INVITED",
          must_change_password: true,
          mfa_required: false,
          notes: form.notes?.trim() ? form.notes.trim() : "",
        }
      : {
          enabled: true,
          mode: form.mode,

          linked_user_id: form.mode === "LINK_EXISTING" ? (String(form.linked_user_id ?? "").trim() || undefined) : undefined,
          linked_user_email: form.mode === "LINK_EXISTING"
            ? (String(form.linked_user_email ?? "").trim().toLowerCase() || undefined)
            : undefined,

          new_user: form.mode === "CREATE_NEW"
            ? {
                username: String(form.new_user?.username ?? "").trim() || undefined,
                email: String(form.new_user?.email ?? "").trim().toLowerCase() || undefined,
                phone: normalizePhone(String(form.new_user?.phone ?? "")) || undefined,
                display_name: String(form.new_user?.display_name ?? "").trim() || undefined,
              }
            : null,

          role_template_codes: roleCodes,
          primary_role_code: primary,

          user_status: form.user_status ?? "INVITED",
          must_change_password: !!form.must_change_password,
          mfa_required: !!form.mfa_required,
          notes: form.notes?.trim() ? form.notes.trim() : "",
        };

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      system_access: normalized,
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "System access saved to draft.",
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
      router.push(withDraftId("/infrastructure/staff/onboarding/review", draftId) as any);
    } catch {
      // handled
    }
  }

  const enabledBadge = form.enabled && form.mode !== "NONE";

  return (
    <OnboardingShell
      stepKey="system-access"
      title="System access"
      description="Link staff to a user account for login + bind role templates (RBAC)."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/assignments", draftId) as any)}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSaveOnly} disabled={loading}>
              Save
            </Button>
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={onSaveAndNext} disabled={loading}>
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 7: System access</div>
            <div className="mt-1 text-xs text-zc-muted">
              Enable access only if this staff should login to the system. Select role template codes for RBAC bindings.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!prerequisites.ok ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Contact incomplete
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Prereqs OK
              </Badge>
            )}

            {enabledBadge ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Access enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="border border-zc-border">
                Access disabled
              </Badge>
            )}

            <Badge variant="secondary" className="border border-zc-border">
              Mode: {form.mode}
            </Badge>

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

        {errors._global ? (
          <div className="rounded-md border border-red-500/50 bg-red-500/5 p-3 text-sm text-red-600">
            {errors._global}
          </div>
        ) : null}

        {/* Card 1: Toggle + mode */}
        <Card className="border-zc-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Access toggle</CardTitle>
            <CardDescription>Enable login access and select how to provision the user account.</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-zc-foreground">Enable system access</div>
                <div className="mt-1 text-xs text-zc-muted">If disabled, staff will exist without a login account.</div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!enabledBadge} onCheckedChange={(v) => toggleEnabled(!!v)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1">
                <Label className="text-xs text-zc-muted">Access mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setMode(v as SystemAccessMode)}
                  disabled={!form.enabled}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="LINK_EXISTING">Link existing user</SelectItem>
                    <SelectItem value="CREATE_NEW">Create new user</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs text-zc-muted">User status</Label>
                <Select
                  value={form.user_status ?? "INVITED"}
                  onValueChange={(v) => update("user_status", v as UserStatus)}
                  disabled={!enabledBadge}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVITED">Invited</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs text-zc-muted">Security</Label>
                <div className="flex items-center justify-between gap-2 rounded-md border border-zc-border px-3 py-2">
                  <div className="grid gap-1">
                    <div className="text-xs text-zc-muted">Must change password</div>
                    <div className="text-[11px] text-zc-muted">Recommended for new/invited users</div>
                  </div>
                  <Switch
                    checked={!!form.must_change_password}
                    onCheckedChange={(v) => update("must_change_password", !!v)}
                    disabled={!enabledBadge}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-md border border-zc-border px-3 py-2">
                  <div className="grid gap-1">
                    <div className="text-xs text-zc-muted">MFA required</div>
                    <div className="text-[11px] text-zc-muted">Optional enforcement</div>
                  </div>
                  <Switch
                    checked={!!form.mfa_required}
                    onCheckedChange={(v) => update("mfa_required", !!v)}
                    disabled={!enabledBadge}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Link/create */}
        <Card className="border-zc-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">User account</CardTitle>
            <CardDescription>Link an existing user or capture minimal fields to create a new user.</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
            {form.mode === "LINK_EXISTING" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Existing User ID" error={errors.linked_user_id}>
                  <Input
                    className={cn("border-zc-border", errors.linked_user_id ? "border-red-500" : "")}
                    value={String(form.linked_user_id ?? "")}
                    onChange={(e) => update("linked_user_id", e.target.value)}
                    placeholder="Optional (provide either User ID or Email)"
                    disabled={!enabledBadge}
                  />
                </Field>

                <Field label="Existing user email" error={errors.linked_user_email}>
                  <Input
                    className={cn("border-zc-border", errors.linked_user_email ? "border-red-500" : "")}
                    value={String(form.linked_user_email ?? "")}
                    onChange={(e) => update("linked_user_email", e.target.value)}
                    placeholder="Optional (provide either User ID or Email)"
                    disabled={!enabledBadge}
                  />
                </Field>

                <div className="md:col-span-2 rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
                  Tip: in the next iteration we can replace this with a searchable user picker (by email/phone).
                </div>
              </div>
            ) : form.mode === "CREATE_NEW" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Username" required error={errors["new_user.username"]}>
                  <Input
                    className={cn("border-zc-border", errors["new_user.username"] ? "border-red-500" : "")}
                    value={String(form.new_user?.username ?? "")}
                    onChange={(e) => updateNewUser("username", e.target.value)}
                    placeholder="Required"
                    disabled={!enabledBadge}
                  />
                </Field>

                <Field label="Email (login)" required error={errors["new_user.email"]}>
                  <Input
                    className={cn("border-zc-border", errors["new_user.email"] ? "border-red-500" : "")}
                    value={String(form.new_user?.email ?? "")}
                    onChange={(e) => updateNewUser("email", e.target.value)}
                    placeholder="Required"
                    disabled={!enabledBadge}
                  />
                </Field>

                <Field label="Display name" error={errors["new_user.display_name"]}>
                  <Input
                    className="border-zc-border"
                    value={String(form.new_user?.display_name ?? "")}
                    onChange={(e) => updateNewUser("display_name", e.target.value)}
                    placeholder="Optional"
                    disabled={!enabledBadge}
                  />
                </Field>

                <Field label="Phone (10 digits)" error={errors["new_user.phone"]}>
                  <Input
                    className={cn("border-zc-border", errors["new_user.phone"] ? "border-red-500" : "")}
                    value={String(form.new_user?.phone ?? "")}
                    onChange={(e) => updateNewUser("phone", e.target.value)}
                    placeholder="Optional"
                    disabled={!enabledBadge}
                  />
                </Field>
              </div>
            ) : (
              <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
                System access is disabled. Choose a mode and enable access to link/create a user.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Roles */}
        <Card className="border-zc-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Role templates</CardTitle>
            <CardDescription>These codes bind staff ↔ role templates (used by your tightened backend contract).</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Role template codes" required={enabledBadge} error={errors.role_template_codes} help="Comma-separated">
                <Input
                  className={cn("border-zc-border", errors.role_template_codes ? "border-red-500" : "")}
                  value={roleCodesText}
                  onChange={(e) => {
                    setRoleCodesText(e.target.value);
                    setDirty(true);
                    setErrors((x) => {
                      const n = { ...x };
                      delete n.role_template_codes;
                      return n;
                    });
                  }}
                  placeholder="e.g., HR_ADMIN, DOCTOR_BASIC"
                  disabled={!enabledBadge}
                />
              </Field>

              <Field label="Primary role code" error={errors.primary_role_code} help="Optional (must be included above)">
                <Input
                  className={cn("border-zc-border", errors.primary_role_code ? "border-red-500" : "")}
                  value={primaryRoleText}
                  onChange={(e) => {
                    setPrimaryRoleText(e.target.value);
                    setDirty(true);
                    setErrors((x) => {
                      const n = { ...x };
                      delete n.primary_role_code;
                      return n;
                    });
                  }}
                  placeholder="Optional"
                  disabled={!enabledBadge}
                />
              </Field>
            </div>

            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
              <div className="font-medium text-zc-foreground">Note</div>
              <div className="mt-1">
                This step stores *clean* RBAC payloads (role template codes + primary role) so frontend → backend integration remains stable.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Notes */}
        <Card className="border-zc-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
            <CardDescription>Optional notes for HR / IT while provisioning access.</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-2", loading ? "opacity-60" : "opacity-100")}>
            <Textarea
              className="border-zc-border"
              value={String(form.notes ?? "")}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional notes…"
            />
          </CardContent>
        </Card>

        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          <div className="font-medium text-zc-foreground">Next step</div>
          <div className="mt-1">
            Review &amp; submit: <span className="font-mono">/onboarding/review</span>
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

function parseRoleCodes(input: string): string[] {
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // ignore
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function normalizePhone(v: string) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}
