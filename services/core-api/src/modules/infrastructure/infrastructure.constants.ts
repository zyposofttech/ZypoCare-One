export const INFRA_POLICY = {
  PROCEDURE_PRECHECK: "PROCEDURE_PRECHECK_POLICY",
  BED_HOUSEKEEPING_GATE: "BED_HOUSEKEEPING_GATE",
  EQUIPMENT_COMPLIANCE: "EQUIPMENT_COMPLIANCE_ENFORCEMENT",
  NAMING_CONVENTION: "NAMING_CONVENTION_POLICY",
} as const;

export type PrecheckMode = "BLOCK" | "WARN";

export type ProcedurePrecheckPolicyPayload = {
  scheduling?: {
    consent?: PrecheckMode;
    anesthesia?: PrecheckMode;
    checklist?: PrecheckMode;
  };
};
