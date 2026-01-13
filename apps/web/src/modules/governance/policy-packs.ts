import type { PolicyTemplateId } from "./policy-templates";
import { getTemplateById } from "./policy-templates";

export type PolicyPackItem = {
  templateId: PolicyTemplateId;
  /** Optional override to prefill layman fields (NOT JSON payload). */
  valuesOverride?: Record<string, any>;
  /** Optional human note shown in UI */
  note?: string;
};

export type PolicyPack = {
  id: string;
  name: string;
  tag: string;
  description: string;
  items: PolicyPackItem[];
};

function valuesFor(templateId: PolicyTemplateId, override?: Record<string, any>) {
  const tpl = getTemplateById(templateId);
  const base = tpl?.defaults ?? {};
  return { ...(base as any), ...(override ?? {}) };
}

export const POLICY_PACKS: PolicyPack[] = [
  {
    id: "zypocare_recommended_baseline",
    name: "ZypoCare Recommended Baseline",
    tag: "Recommended",
    description:
      "A balanced default pack for most hospitals: controlled exports, emergency access with audit, and reasonable retention settings.",
    items: [
      {
        templateId: "EXPORT_GUARDRAILS",
        valuesOverride: valuesFor("EXPORT_GUARDRAILS", {
          maxRows: 50000,
          requireReason: true,
          watermark: true,
          allowPHIExport: false,
          approvalRequiredAboveRows: 10000,
        }),
        note: "Keeps exports practical but controlled for privacy and misuse.",
      },
      {
        templateId: "BREAK_GLASS",
        valuesOverride: valuesFor("BREAK_GLASS", {
          enabled: true,
          requireJustification: true,
          autoExpireMinutes: 60,
          notifySecurity: true,
        }),
        note: "Emergency access with mandatory justification and auto-expiry.",
      },
      {
        templateId: "AUDIT_LOGGING",
        valuesOverride: valuesFor("AUDIT_LOGGING", {
          enabled: true,
          logPHIAccess: true,
          logExports: true,
          logBreakGlass: true,
          retentionDays: 2555,
        }),
        note: "Audit logging with safe retention defaults.",
      },
      {
        templateId: "CONSENT_DEFAULTS",
        valuesOverride: valuesFor("CONSENT_DEFAULTS", {
          defaultScope: ["VIEW", "STORE"],
          defaultStatus: "GRANTED",
          shareToPatientPortal: false,
          smsConsentRequired: true,
        }),
        note: "A conservative, patient-safe consent posture.",
      },
      {
        templateId: "RETENTION_CLINICAL_RECORDS",
        valuesOverride: valuesFor("RETENTION_CLINICAL_RECORDS", {
          opdYears: 5,
          ipdYears: 10,
          labYears: 2,
          imagingYears: 5,
          medicoLegalHoldEnabled: true,
          medicoLegalMinYears: 10,
        }),
        note: "Medico-legal safe clinical retention baseline.",
      },
    ],
  },
  {
    id: "privacy_compliance_strict",
    name: "Privacy & Compliance (Strict)",
    tag: "Strict",
    description:
      "For high compliance environments: stricter exports, stronger break-glass evidence, and longer retention.",
    items: [
      {
        templateId: "EXPORT_GUARDRAILS",
        valuesOverride: valuesFor("EXPORT_GUARDRAILS", {
          maxRows: 0,
          requireReason: true,
          watermark: true,
          allowPHIExport: false,
          approvalRequiredAboveRows: 0,
        }),
        note: "Effectively disables exports (maxRows=0). You can later enable selectively.",
      },
      {
        templateId: "BREAK_GLASS",
        valuesOverride: valuesFor("BREAK_GLASS", {
          enabled: true,
          requireJustification: true,
          autoExpireMinutes: 20,
          notifySecurity: true,
        }),
        note: "Shorter emergency sessions; security notifications enabled.",
      },
      {
        templateId: "AUDIT_LOGGING",
        valuesOverride: valuesFor("AUDIT_LOGGING", {
          enabled: true,
          logPHIAccess: true,
          logExports: true,
          logBreakGlass: true,
          retentionDays: 1825, // 5 years
        }),
        note: "5-year audit retention.",
      },
      {
        templateId: "RETENTION_CLINICAL_RECORDS",
        valuesOverride: valuesFor("RETENTION_CLINICAL_RECORDS", {
          opdYears: 10,
          ipdYears: 15,
          labYears: 5,
          imagingYears: 10,
          medicoLegalHoldEnabled: true,
          medicoLegalMinYears: 15,
        }),
        note: "Longer retention for high-compliance environments.",
      },
    ],
  },
  {
    id: "operational_high_throughput",
    name: "Operational (High Throughput)",
    tag: "Operational",
    description:
      "For busy hospitals: allows controlled reporting with higher export limits while keeping governance intact.",
    items: [
      {
        templateId: "EXPORT_GUARDRAILS",
        valuesOverride: valuesFor("EXPORT_GUARDRAILS", {
          maxRows: 100000,
          requireReason: true,
          watermark: true,
          allowPHIExport: false,
          approvalRequiredAboveRows: 25000,
        }),
        note: "Higher limits for operational reporting, while keeping approvals in place.",
      },
      {
        templateId: "BREAK_GLASS",
        valuesOverride: valuesFor("BREAK_GLASS", {
          enabled: true,
          requireJustification: true,
          autoExpireMinutes: 15,
          notifySecurity: false,
        }),
        note: "Shorter emergency sessions reduce misuse.",
      },
      {
        templateId: "AUDIT_LOGGING",
        valuesOverride: valuesFor("AUDIT_LOGGING", {
          enabled: true,
          logPHIAccess: true,
          logExports: true,
          logBreakGlass: true,
          retentionDays: 730, // 2 years
        }),
        note: "2-year retention for audit trail.",
      },
      {
        templateId: "CONSENT_DEFAULTS",
        valuesOverride: valuesFor("CONSENT_DEFAULTS", {
          defaultScope: ["VIEW", "STORE"],
          defaultStatus: "GRANTED",
          shareToPatientPortal: false,
          smsConsentRequired: true,
        }),
      },
    ],
  },
];
