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

type PaymentMode = "BANK_TRANSFER" | "UPI" | "CASH" | "CHEQUE";
type SalaryType = "MONTHLY" | "DAILY" | "HOURLY" | "CONTRACT";
type TaxRegime = "OLD" | "NEW" | "NA";

type FinancialDraft = {
  // payroll
  payment_mode?: PaymentMode;
  salary_currency?: string; // INR default
  salary_type?: SalaryType;

  base_salary?: number | string;
  allowances?: number | string;
  deductions?: number | string;

  // bank/upi
  bank_account_holder_name?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  ifsc_code?: string;

  upi_id?: string;

  // statutory / compliance
  pan?: string;
  pf_uan?: string;
  esi_number?: string;
  tax_regime?: TaxRegime;

  notes?: string;
};

type EmploymentDetailsDraft = Record<string, any> & {
  financial_details?: FinancialDraft;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: EmploymentDetailsDraft;
  medical_details?: Record<string, any>;
  assignments?: any[];
  system_access?: Record<string, any>;
  background_verification?: Record<string, any>;
  police_verification?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingFinancialPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [fd, setFd] = React.useState<FinancialDraft>({
    payment_mode: "BANK_TRANSFER",
    salary_currency: "INR",
    salary_type: "MONTHLY",
    base_salary: "",
    allowances: "",
    deductions: "",
    bank_account_holder_name: "",
    bank_name: "",
    bank_branch: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
    pan: "",
    pf_uan: "",
    esi_number: "",
    tax_regime: "NA",
    notes: "",
  });

  // ensure stable draftId in URL
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// load from draft
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const d = readDraft(id);
      const ed = (d.employment_details ?? {}) as EmploymentDetailsDraft;
      const existing = (ed.financial_details ?? {}) as FinancialDraft;

      setFd({
        payment_mode: (existing.payment_mode as PaymentMode) ?? "BANK_TRANSFER",
        salary_currency: String(existing.salary_currency ?? "INR").trim() || "INR",
        salary_type: (existing.salary_type as SalaryType) ?? "MONTHLY",

        base_salary: existing.base_salary ?? "",
        allowances: existing.allowances ?? "",
        deductions: existing.deductions ?? "",

        bank_account_holder_name: String(existing.bank_account_holder_name ?? ""),
        bank_name: String(existing.bank_name ?? ""),
        bank_branch: String(existing.bank_branch ?? ""),
        account_number: String(existing.account_number ?? ""),
        ifsc_code: String(existing.ifsc_code ?? ""),

        upi_id: String(existing.upi_id ?? ""),

        pan: String(existing.pan ?? ""),
        pf_uan: String(existing.pf_uan ?? ""),
        esi_number: String(existing.esi_number ?? ""),
        tax_regime: (existing.tax_regime as TaxRegime) ?? "NA",

        notes: String(existing.notes ?? ""),
      });

      setErrors({});
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  function update<K extends keyof FinancialDraft>(key: K, value: FinancialDraft[K]) {
    setFd((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const n = { ...e };
      delete n[String(key)];
      return n;
    });
  }

  const computedNet = React.useMemo(() => {
    const b = parseNumber(fd.base_salary);
    const a = parseNumber(fd.allowances);
    const d = parseNumber(fd.deductions);
    if (b === null && a === null && d === null) return null;

    const bb = b ?? 0;
    const aa = a ?? 0;
    const dd = d ?? 0;
    return bb + aa - dd;
  }, [fd.base_salary, fd.allowances, fd.deductions]);

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    const mode = fd.payment_mode ?? "BANK_TRANSFER";

    // Payroll numbers: optional but if present must be valid >=0
    if (String(fd.base_salary ?? "").trim()) {
      const n = parseNumber(fd.base_salary);
      if (n === null || n < 0) e.base_salary = "Base salary must be a valid non-negative number.";
    }
    if (String(fd.allowances ?? "").trim()) {
      const n = parseNumber(fd.allowances);
      if (n === null || n < 0) e.allowances = "Allowances must be a valid non-negative number.";
    }
    if (String(fd.deductions ?? "").trim()) {
      const n = parseNumber(fd.deductions);
      if (n === null || n < 0) e.deductions = "Deductions must be a valid non-negative number.";
    }

    // Payment mode rules
    if (!fd.payment_mode) e.payment_mode = "Payment mode is required.";

    if (mode === "BANK_TRANSFER") {
      if (!String(fd.bank_account_holder_name ?? "").trim()) e.bank_account_holder_name = "Account holder name is required.";
      if (!String(fd.bank_name ?? "").trim()) e.bank_name = "Bank name is required.";
      if (!String(fd.account_number ?? "").trim()) e.account_number = "Account number is required.";
      if (!String(fd.ifsc_code ?? "").trim()) e.ifsc_code = "IFSC is required.";

      if (String(fd.account_number ?? "").trim() && !looksLikeAccountNumber(String(fd.account_number))) {
        e.account_number = "Account number looks invalid.";
      }
      if (String(fd.ifsc_code ?? "").trim() && !isValidIFSC(String(fd.ifsc_code))) {
        e.ifsc_code = "Invalid IFSC format (e.g., HDFC0001234).";
      }
    }

    if (mode === "UPI") {
      if (!String(fd.upi_id ?? "").trim()) e.upi_id = "UPI ID is required for UPI payment mode.";
      if (String(fd.upi_id ?? "").trim() && !isValidUPI(String(fd.upi_id))) e.upi_id = "Invalid UPI format (e.g., name@bank).";
    }

    // Statutory formats (optional, but validate if present)
    if (String(fd.pan ?? "").trim() && !isValidPAN(String(fd.pan))) e.pan = "Invalid PAN format (e.g., ABCDE1234F).";
    if (String(fd.pf_uan ?? "").trim() && !/^\d{12}$/.test(String(fd.pf_uan).trim())) e.pf_uan = "UAN must be 12 digits.";
    if (String(fd.esi_number ?? "").trim() && !/^\d{10,17}$/.test(String(fd.esi_number).trim()))
      e.esi_number = "ESI number should be 10–17 digits.";

    return e;
  }

  function saveDraftOrThrow() {
    if (!draftId) return;

    const ve = validate();
    setErrors(ve);
    if (Object.keys(ve).length) {
      toast({
        variant: "destructive",
        title: "Fix highlighted fields",
        description: "Some values are missing/invalid based on payment mode and statutory formats.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(draftId);
    const ed = (existing.employment_details ?? {}) as EmploymentDetailsDraft;

    const next: FinancialDraft = {
      payment_mode: fd.payment_mode ?? "BANK_TRANSFER",
      salary_currency: cleanStr(fd.salary_currency)?.toUpperCase() ?? "INR",
      salary_type: fd.salary_type ?? "MONTHLY",

      base_salary: parseNumber(fd.base_salary) ?? (cleanStr(fd.base_salary) ? fd.base_salary : undefined),
      allowances: parseNumber(fd.allowances) ?? (cleanStr(fd.allowances) ? fd.allowances : undefined),
      deductions: parseNumber(fd.deductions) ?? (cleanStr(fd.deductions) ? fd.deductions : undefined),

      bank_account_holder_name: cleanStr(fd.bank_account_holder_name),
      bank_name: cleanStr(fd.bank_name),
      bank_branch: cleanStr(fd.bank_branch),
      account_number: cleanStr(fd.account_number),
      ifsc_code: cleanStr(fd.ifsc_code)?.toUpperCase(),

      upi_id: cleanStr(fd.upi_id),

      pan: cleanStr(fd.pan)?.toUpperCase(),
      pf_uan: cleanStr(fd.pf_uan),
      esi_number: cleanStr(fd.esi_number),
      tax_regime: fd.tax_regime ?? "NA",

      notes: cleanStr(fd.notes),
    };

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      employment_details: {
        ...ed,
        financial_details: next,
      },
    };

    writeDraft(draftId, nextDraft);
    setDirty(false);

    toast({ title: "Saved", description: "Financial & payroll details saved to draft." });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // toast already shown
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      // If you have a photo/biometric step, change this to that route.
      router.push(withDraftId("/infrastructure/staff/onboarding/review", draftId) as any);
    } catch {
      // handled
    }
  }

  return (
    <OnboardingShell
      stepKey="financial"
      title="Payroll & financial"
      description="Payment mode, bank/UPI details, salary components and statutory identifiers."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/insurance", draftId) as any)}
            disabled={loading}
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
            <div className="text-sm font-medium text-zc-foreground">Step: Financial</div>
            <div className="mt-1 text-xs text-zc-muted">
              Store sensitive payroll and statutory details here. This draft will be converted into backend payroll/HR records during final submit.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-zc-border">
              Mode: {fd.payment_mode ?? "—"}
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

        {/* Payment Mode */}
        <div className={cn("rounded-md border border-zc-border bg-zc-panel/40 p-4", loading ? "opacity-60" : "opacity-100")}>
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Payment mode</div>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Field label="Payment mode" required error={errors.payment_mode}>
              <Select value={String(fd.payment_mode ?? "")} onValueChange={(v) => update("payment_mode", v as PaymentMode)}>
                <SelectTrigger className={cn("border-zc-border", errors.payment_mode ? "border-red-500" : "")}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Currency" required>
              <Input
                className="border-zc-border"
                value={String(fd.salary_currency ?? "INR")}
                onChange={(e) => update("salary_currency", e.target.value)}
                placeholder="INR"
              />
            </Field>

            <Field label="Salary type" required>
              <Select value={String(fd.salary_type ?? "MONTHLY")} onValueChange={(v) => update("salary_type", v as SalaryType)}>
                <SelectTrigger className="border-zc-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tax regime">
              <Select value={String(fd.tax_regime ?? "NA")} onValueChange={(v) => update("tax_regime", v as TaxRegime)}>
                <SelectTrigger className="border-zc-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">Not applicable</SelectItem>
                  <SelectItem value="OLD">Old</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        {/* Salary */}
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Salary components</div>
            <div className="text-xs text-zc-muted">
              Net (computed):{" "}
              <span className="font-mono text-zc-foreground">
                {computedNet === null ? "—" : `${String(fd.salary_currency ?? "INR").toUpperCase()} ${fmtNumber(computedNet)}`}
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="Base salary" error={errors.base_salary}>
              <Input
                inputMode="decimal"
                className={cn("border-zc-border", errors.base_salary ? "border-red-500" : "")}
                value={String(fd.base_salary ?? "")}
                onChange={(e) => update("base_salary", e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <Field label="Allowances" error={errors.allowances}>
              <Input
                inputMode="decimal"
                className={cn("border-zc-border", errors.allowances ? "border-red-500" : "")}
                value={String(fd.allowances ?? "")}
                onChange={(e) => update("allowances", e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <Field label="Deductions" error={errors.deductions}>
              <Input
                inputMode="decimal"
                className={cn("border-zc-border", errors.deductions ? "border-red-500" : "")}
                value={String(fd.deductions ?? "")}
                onChange={(e) => update("deductions", e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>

        {/* Bank / UPI */}
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Payout details</div>

          {fd.payment_mode === "UPI" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="UPI ID" required error={errors.upi_id} help="e.g., name@bank">
                <Input
                  className={cn("border-zc-border", errors.upi_id ? "border-red-500" : "")}
                  value={String(fd.upi_id ?? "")}
                  onChange={(e) => update("upi_id", e.target.value)}
                  placeholder="name@bank"
                />
              </Field>

              <div className="rounded-md border border-zc-border bg-zc-panel/30 p-3 text-xs text-zc-muted">
                For UPI payout, we store only the UPI handle. Avoid adding bank account fields unless required.
              </div>
            </div>
          ) : fd.payment_mode === "BANK_TRANSFER" ? (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Account holder name" required error={errors.bank_account_holder_name}>
                  <Input
                    className={cn("border-zc-border", errors.bank_account_holder_name ? "border-red-500" : "")}
                    value={String(fd.bank_account_holder_name ?? "")}
                    onChange={(e) => update("bank_account_holder_name", e.target.value)}
                    placeholder="As per bank records"
                  />
                </Field>

                <Field label="Bank name" required error={errors.bank_name}>
                  <Input
                    className={cn("border-zc-border", errors.bank_name ? "border-red-500" : "")}
                    value={String(fd.bank_name ?? "")}
                    onChange={(e) => update("bank_name", e.target.value)}
                    placeholder="e.g., HDFC Bank"
                  />
                </Field>

                <Field label="Bank branch">
                  <Input
                    className="border-zc-border"
                    value={String(fd.bank_branch ?? "")}
                    onChange={(e) => update("bank_branch", e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Account number" required error={errors.account_number}>
                  <Input
                    inputMode="numeric"
                    className={cn("border-zc-border", errors.account_number ? "border-red-500" : "")}
                    value={String(fd.account_number ?? "")}
                    onChange={(e) => update("account_number", e.target.value)}
                    placeholder="Numbers only"
                  />
                </Field>

                <Field label="IFSC" required error={errors.ifsc_code}>
                  <Input
                    className={cn("border-zc-border", errors.ifsc_code ? "border-red-500" : "")}
                    value={String(fd.ifsc_code ?? "")}
                    onChange={(e) => update("ifsc_code", e.target.value)}
                    placeholder="HDFC0001234"
                  />
                </Field>

                <div className="rounded-md border border-zc-border bg-zc-panel/30 p-3 text-xs text-zc-muted">
                  Bank details are sensitive. Ensure access is restricted to HR/Finance roles only.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-zc-border bg-zc-panel/30 p-3 text-xs text-zc-muted">
              No payout identifiers required for <span className="font-semibold">{fd.payment_mode}</span>. You can add notes below if needed.
            </div>
          )}
        </div>

        {/* Statutory */}
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Statutory identifiers</div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="PAN" error={errors.pan} help="Optional (format validated if entered)">
              <Input
                className={cn("border-zc-border", errors.pan ? "border-red-500" : "")}
                value={String(fd.pan ?? "")}
                onChange={(e) => update("pan", e.target.value)}
                placeholder="ABCDE1234F"
              />
            </Field>

            <Field label="PF UAN" error={errors.pf_uan} help="Optional (12 digits)">
              <Input
                inputMode="numeric"
                className={cn("border-zc-border", errors.pf_uan ? "border-red-500" : "")}
                value={String(fd.pf_uan ?? "")}
                onChange={(e) => update("pf_uan", e.target.value)}
                placeholder="12 digits"
              />
            </Field>

            <Field label="ESI number" error={errors.esi_number} help="Optional (10–17 digits)">
              <Input
                inputMode="numeric"
                className={cn("border-zc-border", errors.esi_number ? "border-red-500" : "")}
                value={String(fd.esi_number ?? "")}
                onChange={(e) => update("esi_number", e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes</div>
          <div className="mt-3">
            <Textarea
              className="min-h-[88px] border-zc-border"
              value={String(fd.notes ?? "")}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional notes for HR/Finance (do not enter passwords/OTP)."
            />
          </div>

          <div className="mt-3 rounded-md border border-zc-border bg-zc-panel/30 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Contract notes</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Saved to draft as <span className="font-mono">employment_details.financial_details</span> (snake_case).
              </li>
              <li>
                Bank/UPI fields are validated based on <span className="font-mono">payment_mode</span>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------------------------- UI Helper ---------------------------- */

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

/* ------------------------- Format / Validate ------------------------ */

function cleanStr(v: any): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function parseNumber(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function fmtNumber(v: number): string {
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v);
  } catch {
    return String(v);
  }
}

function looksLikeAccountNumber(v: string): boolean {
  const s = String(v ?? "").trim();
  // allow 6..20 digits, no spaces
  return /^\d{6,20}$/.test(s);
}

function isValidIFSC(v: string): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s);
}

function isValidPAN(v: string): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(s);
}

function isValidUPI(v: string): boolean {
  const s = String(v ?? "").trim();
  // simple pragmatic: handle@psp
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(s);
}

/* ------------------------- Draft Storage ---------------------------- */

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {}
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
