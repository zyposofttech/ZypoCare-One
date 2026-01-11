export type PolicyTemplateId =
  | "RETENTION_CLINICAL_RECORDS"
  | "CONSENT_DEFAULTS"
  | "AUDIT_LOGGING"
  | "EXPORT_GUARDRAILS"
  | "BREAK_GLASS";

export type RetentionClinicalRecordsValues = {
  opdYears: number;
  ipdYears: number;
  labYears: number;
  imagingYears: number;
  medicoLegalHoldEnabled: boolean;
  medicoLegalMinYears: number;
};

export type ConsentDefaultsValues = {
  defaultScope: Array<"VIEW" | "STORE" | "SHARE">;
  defaultStatus: "GRANTED" | "WITHDRAWN";
  shareToPatientPortal: boolean;
  smsConsentRequired: boolean;
};

export type AuditLoggingValues = {
  enabled: boolean;
  logPHIAccess: boolean;
  logExports: boolean;
  logBreakGlass: boolean;
  retentionDays: number;
};

export type ExportGuardrailsValues = {
  maxRows: number;
  requireReason: boolean;
  watermark: boolean;
  allowPHIExport: boolean;
  approvalRequiredAboveRows: number;
};

export type BreakGlassValues = {
  enabled: boolean;
  requireJustification: boolean;
  autoExpireMinutes: number;
  notifySecurity: boolean;
};

export type TemplateValues =
  | RetentionClinicalRecordsValues
  | ConsentDefaultsValues
  | AuditLoggingValues
  | ExportGuardrailsValues
  | BreakGlassValues;

export type PolicyTemplate = {
  /** Template id for UI selection */
  id: PolicyTemplateId;
  /** PolicyDefinition.code (stable) */
  code: string;
  /** PolicyDefinition.type */
  type: string;
  name: string;
  category: string;
  description: string;
  defaults: TemplateValues;
  /** Convert JSON payload stored in DB into layman editable values */
  fromPayload: (payload: any) => TemplateValues;
  buildPayload: (values: any) => any;
  summarize: (values: any) => string[];
};

function safeNum(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "RETENTION_CLINICAL_RECORDS",
    code: "RETENTION_CLINICAL_RECORDS",
    type: "RETENTION",
    name: "Clinical Records Retention",
    category: "Governance",
    description: "Retention periods for OPD/IPD/lab/imaging records with a medico-legal hold.",
    defaults: {
      opdYears: 5,
      ipdYears: 10,
      labYears: 2,
      imagingYears: 5,
      medicoLegalHoldEnabled: true,
      medicoLegalMinYears: 10,
    } satisfies RetentionClinicalRecordsValues,
    fromPayload: (p: any): RetentionClinicalRecordsValues => ({
      opdYears: safeNum(p?.opdYears, 5),
      ipdYears: safeNum(p?.ipdYears, 10),
      labYears: safeNum(p?.labYears, 2),
      imagingYears: safeNum(p?.imagingYears, 5),
      medicoLegalHoldEnabled: !!p?.medicoLegalHold?.enabled,
      medicoLegalMinYears: safeNum(p?.medicoLegalHold?.minYears, 10),
    }),
    buildPayload: (v: RetentionClinicalRecordsValues) => ({
      opdYears: safeNum(v.opdYears, 5),
      ipdYears: safeNum(v.ipdYears, 10),
      labYears: safeNum(v.labYears, 2),
      imagingYears: safeNum(v.imagingYears, 5),
      medicoLegalHold: {
        enabled: !!v.medicoLegalHoldEnabled,
        minYears: safeNum(v.medicoLegalMinYears, 10),
      },
    }),
    summarize: (v: RetentionClinicalRecordsValues) => [
      `OPD records retained for ${safeNum(v.opdYears, 5)} years.`,
      `IPD records retained for ${safeNum(v.ipdYears, 10)} years.`,
      `Lab records retained for ${safeNum(v.labYears, 2)} years.`,
      `Imaging retained for ${safeNum(v.imagingYears, 5)} years.`,
      v.medicoLegalHoldEnabled
        ? `Medico-legal hold enabled (minimum ${safeNum(v.medicoLegalMinYears, 10)} years).`
        : "Medico-legal hold disabled.",
    ],
  },
  {
    id: "CONSENT_DEFAULTS",
    code: "CONSENT_DEFAULTS",
    type: "CONSENT_DEFAULTS",
    name: "Consent Defaults",
    category: "Data & Privacy",
    description: "Default consent posture for disclosures and patient-facing sharing.",
    defaults: {
      defaultScope: ["VIEW", "STORE"],
      defaultStatus: "GRANTED",
      shareToPatientPortal: false,
      smsConsentRequired: true,
    } satisfies ConsentDefaultsValues,
    fromPayload: (p: any): ConsentDefaultsValues => ({
      defaultScope: Array.isArray(p?.defaultScope) ? p.defaultScope : ["VIEW", "STORE"],
      defaultStatus: p?.defaultStatus === "WITHDRAWN" ? "WITHDRAWN" : "GRANTED",
      shareToPatientPortal: !!p?.shareToPatientPortal,
      smsConsentRequired: !!p?.smsConsentRequired,
    }),
    buildPayload: (v: ConsentDefaultsValues) => ({
      defaultScope: Array.isArray(v.defaultScope) ? v.defaultScope : ["VIEW", "STORE"],
      defaultStatus: v.defaultStatus === "WITHDRAWN" ? "WITHDRAWN" : "GRANTED",
      shareToPatientPortal: !!v.shareToPatientPortal,
      smsConsentRequired: !!v.smsConsentRequired,
    }),
    summarize: (v: ConsentDefaultsValues) => {
      const scope = (v.defaultScope || []).join(", ") || "None";
      return [
        `Default consent status: ${v.defaultStatus}.`,
        `Default scope: ${scope}.`,
        v.shareToPatientPortal ? "Sharing to patient portal is enabled." : "Sharing to patient portal is disabled.",
        v.smsConsentRequired ? "SMS consent is required." : "SMS consent is not required.",
      ];
    },
  },
  {
    id: "AUDIT_LOGGING",
    code: "AUDIT_LOGGING",
    type: "AUDIT",
    name: "Audit Logging",
    category: "Governance",
    description: "Audit ledger granularity and retention for sensitive operations.",
    defaults: {
      enabled: true,
      logPHIAccess: true,
      logExports: true,
      logBreakGlass: true,
      retentionDays: 2555,
    } satisfies AuditLoggingValues,
    fromPayload: (p: any): AuditLoggingValues => ({
      enabled: !!p?.enabled,
      logPHIAccess: !!p?.logPHIAccess,
      logExports: !!p?.logExports,
      logBreakGlass: !!p?.logBreakGlass,
      retentionDays: safeNum(p?.retentionDays, 2555),
    }),
    buildPayload: (v: AuditLoggingValues) => ({
      enabled: !!v.enabled,
      logPHIAccess: !!v.logPHIAccess,
      logExports: !!v.logExports,
      logBreakGlass: !!v.logBreakGlass,
      retentionDays: safeNum(v.retentionDays, 2555),
    }),
    summarize: (v: AuditLoggingValues) => [
      v.enabled ? "Audit logging is enabled." : "Audit logging is disabled.",
      v.logPHIAccess ? "PHI access events are logged." : "PHI access events are not logged.",
      v.logExports ? "Export events are logged." : "Export events are not logged.",
      v.logBreakGlass ? "Break-glass events are logged." : "Break-glass events are not logged.",
      `Retention: ${safeNum(v.retentionDays, 2555)} days.`,
    ],
  },
  {
    id: "EXPORT_GUARDRAILS",
    code: "EXPORT_GUARDRAILS",
    type: "EXPORTS",
    name: "Export Guardrails",
    category: "Data & Privacy",
    description: "Controls for CSV/Excel exports including thresholds and justification requirements.",
    defaults: {
      maxRows: 50000,
      requireReason: true,
      watermark: true,
      allowPHIExport: false,
      approvalRequiredAboveRows: 10000,
    } satisfies ExportGuardrailsValues,
    fromPayload: (p: any): ExportGuardrailsValues => ({
      maxRows: safeNum(p?.maxRows, 50000),
      requireReason: !!p?.requireReason,
      watermark: !!p?.watermark,
      allowPHIExport: !!p?.allowPHIExport,
      approvalRequiredAboveRows: safeNum(p?.approvalRequiredAboveRows, 10000),
    }),
    buildPayload: (v: ExportGuardrailsValues) => ({
      maxRows: safeNum(v.maxRows, 50000),
      requireReason: !!v.requireReason,
      watermark: !!v.watermark,
      allowPHIExport: !!v.allowPHIExport,
      approvalRequiredAboveRows: safeNum(v.approvalRequiredAboveRows, 10000),
    }),
    summarize: (v: ExportGuardrailsValues) => [
      `Max rows per export: ${safeNum(v.maxRows, 50000)}.`,
      v.requireReason ? "Export reason is required." : "Export reason is not required.",
      v.watermark ? "Exports are watermarked." : "Exports are not watermarked.",
      v.allowPHIExport ? "PHI export is allowed." : "PHI export is blocked by default.",
      `Approval required above: ${safeNum(v.approvalRequiredAboveRows, 10000)} rows.`,
    ],
  },
  {
    id: "BREAK_GLASS",
    code: "BREAK_GLASS",
    type: "BREAK_GLASS",
    name: "Break-Glass Controls",
    category: "Access Control",
    description: "Emergency access policy with mandatory justification and elevated logging.",
    defaults: {
      enabled: true,
      requireJustification: true,
      autoExpireMinutes: 60,
      notifySecurity: true,
    } satisfies BreakGlassValues,
    fromPayload: (p: any): BreakGlassValues => ({
      enabled: !!p?.enabled,
      requireJustification: !!p?.requireJustification,
      autoExpireMinutes: safeNum(p?.autoExpireMinutes, 60),
      notifySecurity: !!p?.notifySecurity,
    }),
    buildPayload: (v: BreakGlassValues) => ({
      enabled: !!v.enabled,
      requireJustification: !!v.requireJustification,
      autoExpireMinutes: safeNum(v.autoExpireMinutes, 60),
      notifySecurity: !!v.notifySecurity,
    }),
    summarize: (v: BreakGlassValues) => [
      v.enabled ? "Break-glass is enabled." : "Break-glass is disabled.",
      v.requireJustification ? "Justification is mandatory." : "Justification is not mandatory.",
      `Auto-expire: ${safeNum(v.autoExpireMinutes, 60)} minutes.`,
      v.notifySecurity ? "Security notifications are enabled." : "Security notifications are disabled.",
    ],
  },
];

export function getTemplateById(id: PolicyTemplateId) {
  return POLICY_TEMPLATES.find((t) => t.id === id) || null;
}

export function guessTemplateFromPolicy(code?: string | null, type?: string | null): PolicyTemplateId {
  const c = (code || "").toUpperCase();
  const t = (type || "").toUpperCase();

  if (c.includes("RETENTION_CLINICAL")) return "RETENTION_CLINICAL_RECORDS";
  if (c.includes("CONSENT")) return "CONSENT_DEFAULTS";
  if (c.includes("AUDIT")) return "AUDIT_LOGGING";
  if (c.includes("EXPORT")) return "EXPORT_GUARDRAILS";
  if (c.includes("BREAK")) return "BREAK_GLASS";

  if (t.includes("RETENTION")) return "RETENTION_CLINICAL_RECORDS";
  if (t.includes("CONSENT")) return "CONSENT_DEFAULTS";
  if (t.includes("AUDIT")) return "AUDIT_LOGGING";
  if (t.includes("EXPORT")) return "EXPORT_GUARDRAILS";
  if (t.includes("BREAK")) return "BREAK_GLASS";

  return "EXPORT_GUARDRAILS";
}
