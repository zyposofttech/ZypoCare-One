export { generateSmartDefaults } from "./smart-defaults.engine";
export type { HospitalProfile, SmartDefaultsResult } from "./smart-defaults.engine";

export { recommendTemplate } from "./template-recommender.engine";
export type { TemplateRecommendation, TemplateSize } from "./template-recommender.engine";

export { runNABHChecks } from "./nabh-checker.engine";
export type { NABHReadinessResult, NABHChapterResult, NABHCheckResult } from "./nabh-checker.engine";

export { runConsistencyChecks } from "./consistency-checker.engine";
export type { ConsistencyResult, ConsistencyIssue } from "./consistency-checker.engine";

export { validateGSTIN, validatePAN, runEquipmentCompliance } from "./compliance-validator.engine";
export type { ValidationResult, EquipmentComplianceResult, EquipmentComplianceItem } from "./compliance-validator.engine";

export { runCredentialAlerts } from "./credential-alerter.engine";
export type { CredentialAlert, CredentialAlertResult } from "./credential-alerter.engine";

export { runPrivilegeGapCheck } from "./privilege-checker.engine";
export type { PrivilegeGap, PrivilegeGapResult } from "./privilege-checker.engine";

export { generateFixSuggestions } from "./fix-suggester.engine";
export type { FixSuggestion, FixSuggestionsResult } from "./fix-suggester.engine";

export { computeGoLiveScore } from "./go-live-scorer.engine";
export type { GoLiveScoreResult, GoLiveCategory } from "./go-live-scorer.engine";

export { runNamingCheck } from "./naming-enforcer.engine";
export type { NamingIssue, NamingCheckResult } from "./naming-enforcer.engine";
