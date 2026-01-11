// apps/web/src/lib/policy-ui.ts
export type PolicyCode =
  | "RETENTION_CLINICAL_RECORDS"
  | "CONSENT_DEFAULTS"
  | "AUDIT_LOGGING"
  | "EXPORT_GUARDRAILS"
  | "BREAK_GLASS";

export function isKnownPolicyCode(code: string): code is PolicyCode {
  return [
    "RETENTION_CLINICAL_RECORDS",
    "CONSENT_DEFAULTS",
    "AUDIT_LOGGING",
    "EXPORT_GUARDRAILS",
    "BREAK_GLASS",
  ].includes(code);
}

export type SummaryItem = { label: string; value: string; hint?: string };

export function summarizePolicy(code: string, payload: any): SummaryItem[] {
  if (!payload || typeof payload !== "object") return [{ label: "Policy", value: "No configuration found" }];

  switch (code) {
    case "RETENTION_CLINICAL_RECORDS": {
      const hold = payload.medicoLegalHold ?? {};
      return [
        { label: "OPD retention", value: `${payload.opdYears ?? "—"} years` },
        { label: "IPD retention", value: `${payload.ipdYears ?? "—"} years` },
        { label: "Lab retention", value: `${payload.labYears ?? "—"} years` },
        { label: "Imaging retention", value: `${payload.imagingYears ?? "—"} years` },
        {
          label: "Medico-legal hold",
          value: hold.enabled ? "Enabled" : "Disabled",
          hint: hold.enabled ? `Minimum ${hold.minYears ?? "—"} years` : undefined,
        },
      ];
    }

    case "CONSENT_DEFAULTS":
      return [
        { label: "Default status", value: String(payload.defaultStatus ?? "—") },
        { label: "Default scope", value: Array.isArray(payload.defaultScope) ? payload.defaultScope.join(", ") : "—" },
        { label: "Share to patient portal", value: payload.shareToPatientPortal ? "Yes" : "No" },
        { label: "SMS consent required", value: payload.smsConsentRequired ? "Yes" : "No" },
      ];

    case "AUDIT_LOGGING":
      return [
        { label: "Audit enabled", value: payload.enabled ? "Yes" : "No" },
        { label: "Log PHI access", value: payload.logPHIAccess ? "Yes" : "No" },
        { label: "Log exports", value: payload.logExports ? "Yes" : "No" },
        { label: "Log break-glass", value: payload.logBreakGlass ? "Yes" : "No" },
        { label: "Retention", value: `${payload.retentionDays ?? "—"} days` },
      ];

    case "EXPORT_GUARDRAILS":
      return [
        { label: "Max rows", value: `${payload.maxRows ?? "—"}` },
        { label: "Require reason", value: payload.requireReason ? "Yes" : "No" },
        { label: "Watermark", value: payload.watermark ? "Yes" : "No" },
        { label: "Allow PHI export", value: payload.allowPHIExport ? "Yes" : "No" },
        { label: "Approval required above", value: `${payload.approvalRequiredAboveRows ?? "—"} rows` },
      ];

    case "BREAK_GLASS":
      return [
        { label: "Enabled", value: payload.enabled ? "Yes" : "No" },
        { label: "Require justification", value: payload.requireJustification ? "Yes" : "No" },
        { label: "Auto-expire", value: `${payload.autoExpireMinutes ?? "—"} minutes` },
        { label: "Notify security", value: payload.notifySecurity ? "Yes" : "No" },
      ];

    default:
      return [{ label: "Policy", value: "Custom policy (no UI template available)" }];
  }
}

export function defaultFormFor(code: PolicyCode, payload?: any): any {
  // If payload has a stored UI snapshot, prefer it.
  if (payload?._ui?.form) return payload._ui.form;

  switch (code) {
    case "RETENTION_CLINICAL_RECORDS":
      return {
        opdYears: payload?.opdYears ?? 5,
        ipdYears: payload?.ipdYears ?? 10,
        labYears: payload?.labYears ?? 2,
        imagingYears: payload?.imagingYears ?? 5,
        medicoLegalHoldEnabled: payload?.medicoLegalHold?.enabled ?? true,
        medicoLegalHoldMinYears: payload?.medicoLegalHold?.minYears ?? 10,
      };

    case "CONSENT_DEFAULTS":
      return {
        defaultStatus: payload?.defaultStatus ?? "GRANTED",
        defaultScope: Array.isArray(payload?.defaultScope) ? payload.defaultScope : ["VIEW", "STORE"],
        shareToPatientPortal: !!payload?.shareToPatientPortal,
        smsConsentRequired: payload?.smsConsentRequired ?? true,
      };

    case "AUDIT_LOGGING":
      return {
        enabled: payload?.enabled ?? true,
        logPHIAccess: payload?.logPHIAccess ?? true,
        logExports: payload?.logExports ?? true,
        logBreakGlass: payload?.logBreakGlass ?? true,
        retentionDays: payload?.retentionDays ?? 2555,
      };

    case "EXPORT_GUARDRAILS":
      return {
        maxRows: payload?.maxRows ?? 50000,
        requireReason: payload?.requireReason ?? true,
        watermark: payload?.watermark ?? true,
        allowPHIExport: payload?.allowPHIExport ?? false,
        approvalRequiredAboveRows: payload?.approvalRequiredAboveRows ?? 10000,
      };

    case "BREAK_GLASS":
      return {
        enabled: payload?.enabled ?? true,
        requireJustification: payload?.requireJustification ?? true,
        autoExpireMinutes: payload?.autoExpireMinutes ?? 60,
        notifySecurity: payload?.notifySecurity ?? true,
      };
  }
}

export function payloadFromForm(code: PolicyCode, form: any, prevPayload?: any): any {
  // Preserve unknown keys from previous payload (future-proof), but overwrite known fields.
  const base = prevPayload && typeof prevPayload === "object" ? { ...prevPayload } : {};

  switch (code) {
    case "RETENTION_CLINICAL_RECORDS":
      base.opdYears = Number(form.opdYears ?? 0) || 0;
      base.ipdYears = Number(form.ipdYears ?? 0) || 0;
      base.labYears = Number(form.labYears ?? 0) || 0;
      base.imagingYears = Number(form.imagingYears ?? 0) || 0;
      base.medicoLegalHold = {
        enabled: !!form.medicoLegalHoldEnabled,
        minYears: Number(form.medicoLegalHoldMinYears ?? 0) || 0,
      };
      break;

    case "CONSENT_DEFAULTS":
      base.defaultStatus = String(form.defaultStatus ?? "GRANTED");
      base.defaultScope = Array.isArray(form.defaultScope) ? form.defaultScope : ["VIEW", "STORE"];
      base.shareToPatientPortal = !!form.shareToPatientPortal;
      base.smsConsentRequired = !!form.smsConsentRequired;
      break;

    case "AUDIT_LOGGING":
      base.enabled = !!form.enabled;
      base.logPHIAccess = !!form.logPHIAccess;
      base.logExports = !!form.logExports;
      base.logBreakGlass = !!form.logBreakGlass;
      base.retentionDays = Number(form.retentionDays ?? 0) || 0;
      break;

    case "EXPORT_GUARDRAILS":
      base.maxRows = Number(form.maxRows ?? 0) || 0;
      base.requireReason = !!form.requireReason;
      base.watermark = !!form.watermark;
      base.allowPHIExport = !!form.allowPHIExport;
      base.approvalRequiredAboveRows = Number(form.approvalRequiredAboveRows ?? 0) || 0;
      break;

    case "BREAK_GLASS":
      base.enabled = !!form.enabled;
      base.requireJustification = !!form.requireJustification;
      base.autoExpireMinutes = Number(form.autoExpireMinutes ?? 0) || 0;
      base.notifySecurity = !!form.notifySecurity;
      break;
  }

  // Store a UI snapshot so future editing stays form-based.
  base._ui = { form, template: code };

  return base;
}
