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
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

// Optional (if you already have branch selector store in app)
import { useActiveBranchStore } from "@/lib/branch/active-branch";

type AssignmentStatus = "DRAFT" | "REQUESTED" | "APPROVED" | "REJECTED" | "ENDED";

type AssignmentDraft = {
  id: string;

  // Minimal contract fields (clean for backend mapping)
  branch_id: string; // required
  department_id?: string;
  unit_id?: string;

  role_code?: string; // RoleTemplateCode / designation code
  role_name?: string; // display label

  is_primary: boolean;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD

  status: AssignmentStatus;

  // Approval workflow payload (frontend-friendly)
  request_reason?: string;
  approval?: {
    requested_at?: string; // ISO
    requested_by?: string; // userId (later)
    approved_at?: string; // ISO
    approved_by?: string; // userId (later)
    notes?: string;
  } | null;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;

  // We store assignments at top-level in the onboarding draft (easy to map later to StaffAssignment create/approve APIs)
  assignments?: AssignmentDraft[];
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingAssignmentsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [items, setItems] = React.useState<AssignmentDraft[]>([]);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AssignmentDraft>(() => makeBlankAssignment(activeBranchId ?? ""));

  // Ensure stable draftId in URL
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load from localStorage
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const list = Array.isArray(draft.assignments) ? draft.assignments : [];
      setItems(list);

      // If first time and no assignments, initialize with primary assignment using active branch (if any)
      if (list.length === 0) {
        const init = makeBlankAssignment(activeBranchId ?? "");
        init.is_primary = true;
        init.status = "REQUESTED";
        setItems([init]);
      }

      setEditingId(null);
      setForm(makeBlankAssignment(activeBranchId ?? ""));
      setErrors({});
      setDirty(false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const primaryCount = React.useMemo(() => items.filter((x) => x.is_primary).length, [items]);

  const isClinical = React.useMemo(() => {
    if (!draftId) return false;
    const d = readDraft(draftId);
    const sc = String((d.employment_details as any)?.staff_category ?? "").toUpperCase();
    return ["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"].includes(sc);
  }, [draftId]);

  function update<K extends keyof AssignmentDraft>(key: K, value: AssignmentDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function setPrimary(id: string) {
    setItems((prev) => prev.map((a) => ({ ...a, is_primary: a.id === id })));
    setDirty(true);
  }

  function startAdd() {
    setEditingId(null);
    setForm(makeBlankAssignment(activeBranchId ?? ""));
    setErrors({});
  }

  function startEdit(id: string) {
    const a = items.find((x) => x.id === id);
    if (!a) return;

    setEditingId(id);
    setForm({
      ...a,
      start_date: a.start_date ? String(a.start_date).slice(0, 10) : "",
      end_date: a.end_date ? String(a.end_date).slice(0, 10) : "",
      approval: a.approval ?? null,
    });
    setErrors({});
    setDirty(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setDirty(true);
    if (editingId === id) startAdd();
  }

  function validateAssignment(a: AssignmentDraft): FieldErrorMap {
    const e: FieldErrorMap = {};
    if (!String(a.branch_id || "").trim()) e.branch_id = "Branch is required.";

    if (a.start_date && !isValidYmd(a.start_date)) e.start_date = "Invalid date.";
    if (a.end_date && !isValidYmd(a.end_date)) e.end_date = "Invalid date.";

    if (a.start_date && a.end_date && isValidYmd(a.start_date) && isValidYmd(a.end_date)) {
      const s = new Date(a.start_date + "T00:00:00Z").getTime();
      const t = new Date(a.end_date + "T00:00:00Z").getTime();
      if (s > t) e.end_date = "End date must be after start date.";
    }

    return e;
  }

  function upsert() {
    const candidate: AssignmentDraft = {
      ...form,
      branch_id: String(form.branch_id ?? "").trim(),
      department_id: String(form.department_id ?? "").trim() || undefined,
      unit_id: String(form.unit_id ?? "").trim() || undefined,
      role_code: String(form.role_code ?? "").trim() || undefined,
      role_name: String(form.role_name ?? "").trim() || undefined,
      start_date: String(form.start_date ?? "").trim() || undefined,
      end_date: String(form.end_date ?? "").trim() || undefined,
      request_reason: String(form.request_reason ?? "").trim() || undefined,
      approval: form.approval ?? null,
      status: form.status ?? "REQUESTED",
      is_primary: !!form.is_primary,
    };

    const ve = validateAssignment(candidate);
    setErrors(ve);
    if (Object.keys(ve).length) {
      toast({
        variant: "destructive",
        title: "Fix assignment fields",
        description: "Please fix the highlighted fields before adding/updating.",
      });
      return;
    }

    setItems((prev) => {
      const id = editingId ?? candidate.id;
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...candidate, id };
        // Keep single-primary invariant
        if (candidate.is_primary) return copy.map((x) => ({ ...x, is_primary: x.id === id }));
        return copy;
      }

      const next = [...prev, candidate];

      // If none primary yet, auto-primary this one
      if (next.filter((x) => x.is_primary).length === 0) {
        next[0] = { ...next[0], is_primary: true };
      }

      // If this is primary, demote others
      if (candidate.is_primary) return next.map((x) => ({ ...x, is_primary: x.id === candidate.id }));
      return next;
    });

    toast({ title: editingId ? "Updated" : "Added", description: "Assignment saved in this step (draft)." });

    setEditingId(null);
    setForm(makeBlankAssignment(activeBranchId ?? ""));
    setErrors({});
    setDirty(true);
  }

  function validateStepOrThrow() {
    if (!items.length) {
      toast({ variant: "destructive", title: "Assignment required", description: "Add at least one assignment." });
      throw new Error("assignments_required");
    }
    const pc = items.filter((x) => x.is_primary).length;
    if (pc !== 1) {
      toast({
        variant: "destructive",
        title: "Primary assignment required",
        description: "Exactly one assignment must be marked as Primary.",
      });
      throw new Error("primary_required");
    }
    for (const a of items) {
      const ve = validateAssignment(a);
      if (Object.keys(ve).length) {
        toast({
          variant: "destructive",
          title: "Fix assignments",
          description: "One or more assignments have missing/invalid fields. Open and fix them.",
        });
        throw new Error("assignment_invalid");
      }
    }
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    validateStepOrThrow();

    const existing = readDraft(id);
    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      assignments: items,
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({ title: "Saved", description: "Assignments saved to draft." });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled via toast
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/staff/onboarding/system-access", draftId) as any);
    } catch {
      // handled via toast
    }
  }

  return (
    <OnboardingShell
      stepKey="assignments"
      title="Assignments"
      description="Add primary and secondary branch assignments. Requests can require approval as per workflow."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/credentials", draftId) as any)}
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 6: Assignments</div>
            <div className="mt-1 text-xs text-zc-muted">
              Add at least one assignment and mark exactly one as Primary. Use status “REQUESTED” when approval is needed.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isClinical ? (
              <Badge variant="secondary" className="border border-zc-border">
                Clinical staff
              </Badge>
            ) : (
              <Badge variant="secondary" className="border border-zc-border">
                Non-clinical staff
              </Badge>
            )}

            <Badge variant="secondary" className="border border-zc-border">
              Primary: {primaryCount}/1
            </Badge>

            <Badge variant="secondary" className="border border-zc-border">
              Total: {items.length}
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

        {/* Existing assignments list */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current assignments</div>
            <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={startAdd} disabled={loading}>
              Add new
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
              No assignments added yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((a) => (
                <div key={a.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.is_primary ? (
                          <Badge className="bg-zc-accent/15 text-zc-accent" variant="secondary">
                            Primary
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border border-zc-border">
                            Secondary
                          </Badge>
                        )}

                        <Badge variant="secondary" className="border border-zc-border">
                          {a.status}
                        </Badge>
                      </div>

                      <div className="mt-2 text-sm font-medium text-zc-foreground">
                        Branch: <span className="font-mono">{a.branch_id || "—"}</span>
                        {a.department_id ? (
                          <>
                            {" "}
                            • Dept: <span className="font-mono">{a.department_id}</span>
                          </>
                        ) : null}
                        {a.unit_id ? (
                          <>
                            {" "}
                            • Unit: <span className="font-mono">{a.unit_id}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-zc-muted">
                        {a.role_code || a.role_name ? (
                          <>
                            Role: <span className="font-mono">{a.role_code || a.role_name}</span>
                          </>
                        ) : (
                          <>Role: —</>
                        )}
                        {a.start_date ? <> • Start: {String(a.start_date).slice(0, 10)}</> : null}
                        {a.end_date ? <> • End: {String(a.end_date).slice(0, 10)}</> : null}
                      </div>

                      {a.request_reason ? (
                        <div className="mt-2 text-xs text-zc-muted">
                          Reason: <span className="text-zc-foreground/80">{a.request_reason}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!a.is_primary ? (
                        <Button
                          variant="outline"
                          className="h-8 border-zc-border px-3 text-xs"
                          onClick={() => setPrimary(a.id)}
                        >
                          Make Primary
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        className="h-8 border-zc-border px-3 text-xs"
                        onClick={() => startEdit(a.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 border-zc-border px-3 text-xs text-red-600 hover:text-red-600"
                        onClick={() => removeItem(a.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-zc-border" />

        {/* Add/Edit form */}
        <div className={cn("rounded-md border border-zc-border bg-zc-panel/40 p-4", loading ? "opacity-60" : "opacity-100")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
              {editingId ? "Edit assignment" : "Add assignment"}
            </div>
            {editingId ? (
              <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={startAdd}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Branch ID" required error={errors.branch_id}>
                <div className="flex items-center gap-2">
                  <Input
                    className={cn("border-zc-border", errors.branch_id ? "border-red-500" : "")}
                    value={String(form.branch_id ?? "")}
                    onChange={(e) => update("branch_id", e.target.value)}
                    placeholder="Required"
                  />
                  {activeBranchId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 border-zc-border px-3 text-xs"
                      onClick={() => update("branch_id", activeBranchId)}
                      title="Use currently selected active branch"
                    >
                      Use active
                    </Button>
                  ) : null}
                </div>
              </Field>

              <Field label="Department ID" help="Optional" error={errors.department_id}>
                <Input
                  className="border-zc-border"
                  value={String(form.department_id ?? "")}
                  onChange={(e) => update("department_id", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Unit ID" help="Optional" error={errors.unit_id}>
                <Input
                  className="border-zc-border"
                  value={String(form.unit_id ?? "")}
                  onChange={(e) => update("unit_id", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Status" required>
                <Select value={form.status} onValueChange={(v) => update("status", v as AssignmentStatus)}>
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="REQUESTED">Requested (approval)</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="ENDED">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Role code" help="Optional (RoleTemplate code)" error={errors.role_code}>
                <Input
                  className="border-zc-border"
                  value={String(form.role_code ?? "")}
                  onChange={(e) => update("role_code", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Role name" help="Optional (display label)" error={errors.role_name}>
                <Input
                  className="border-zc-border"
                  value={String(form.role_name ?? "")}
                  onChange={(e) => update("role_name", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Start date" error={errors.start_date}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.start_date ? "border-red-500" : "")}
                  value={String(form.start_date ?? "")}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </Field>

              <Field label="End date" error={errors.end_date}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.end_date ? "border-red-500" : "")}
                  value={String(form.end_date ?? "")}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Primary assignment">
                <Select
                  value={form.is_primary ? "YES" : "NO"}
                  onValueChange={(v) => update("is_primary", v === "YES")}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes (Primary)</SelectItem>
                    <SelectItem value="NO">No (Secondary)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Request reason" help="Optional (used in approval workflow)">
                <Textarea
                  className="border-zc-border"
                  value={String(form.request_reason ?? "")}
                  onChange={(e) => update("request_reason", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                className="border-zc-border"
                onClick={() => {
                  // Populate basic approval payload when status is REQUESTED
                  if (String(form.status) === "REQUESTED") {
                    update("approval", {
                      requested_at: new Date().toISOString(),
                      requested_by: "SELF",
                      notes: form.approval?.notes,
                    });
                  }
                  upsert();
                }}
                disabled={loading}
              >
                {editingId ? "Update assignment" : "Add assignment"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          <div className="font-medium text-zc-foreground">Next step</div>
          <div className="mt-1">
            System access: <span className="font-mono">/onboarding/system-access</span>
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

function makeBlankAssignment(defaultBranchId: string): AssignmentDraft {
  return {
    id: makeId(),
    branch_id: defaultBranchId || "",
    department_id: "",
    unit_id: "",
    role_code: "",
    role_name: "",
    is_primary: false,
    start_date: "",
    end_date: "",
    status: "REQUESTED",
    request_reason: "",
    approval: null,
  };
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

function isValidYmd(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === v;
}
