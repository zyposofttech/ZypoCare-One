/* =========================================================
   OT Setup Module — Shared Types
   Aligned with Prisma schema + backend DTOs
   ========================================================= */

/* ---- Enums ---- */

export type OtSpaceType =
  | "THEATRE"
  | "RECOVERY_BAY"
  | "PREOP_HOLDING"
  | "INDUCTION_ROOM"
  | "SCRUB_ROOM"
  | "STERILE_STORE"
  | "ANESTHESIA_STORE"
  | "STAFF_CHANGE"
  | "OTHER";

export type OtTheatreType =
  | "STANDARD"
  | "LAMINAR_FLOW"
  | "HYBRID"
  | "DAY_SURGERY"
  | "EMERGENCY"
  | "LAPAROSCOPIC";

export type OtStaffRole =
  | "OT_IN_CHARGE"
  | "SURGEON"
  | "ANESTHETIST"
  | "ANESTHESIA_TECHNICIAN"
  | "SCRUB_NURSE"
  | "CIRCULATING_NURSE"
  | "OT_TECHNICIAN"
  | "RECOVERY_NURSE"
  | "CSSD_TECHNICIAN"
  | "OT_ATTENDANT";

export type OtSessionType = "ELECTIVE" | "EMERGENCY" | "BOTH";

export type OtSurgeryCategory = "MINOR" | "MAJOR" | "COMPLEX" | "DAYCARE";

export type OtChargeComponentType =
  | "THEATRE_CHARGE"
  | "SURGEON_FEE"
  | "ANESTHESIA_FEE"
  | "MATERIAL_CHARGE"
  | "NURSING_CHARGE"
  | "EQUIPMENT_CHARGE"
  | "RECOVERY_CHARGE"
  | "MISCELLANEOUS";

export type OtChargeModel = "FLAT" | "HOURLY" | "PER_CASE" | "SLAB" | "PACKAGE";

export type OtComplianceConfigType =
  | "WHO_CHECKLIST"
  | "INFECTION_CONTROL_ZONES"
  | "FUMIGATION_SCHEDULE"
  | "BIOMEDICAL_WASTE"
  | "FIRE_SAFETY"
  | "SSI_SURVEILLANCE";

export type OtChecklistPhase = "SIGN_IN" | "TIME_OUT" | "SIGN_OUT" | "PRE_OP" | "POST_OP";

export type OtZoneType = "UNRESTRICTED" | "SEMI_RESTRICTED" | "RESTRICTED";

export type OtBookingApprovalMode = "DIRECT" | "APPROVAL_REQUIRED" | "AUTO_WITH_RULES";

export type OtImplantCategory = "ORTHOPEDIC" | "CARDIAC" | "OPHTHALMIC" | "GENERAL";

export type OtCancellationAuthority = "SURGEON" | "ANESTHETIST" | "OT_IN_CHARGE" | "HOD" | "ADMIN";

export type OtDecommissionType = "TEMPORARY" | "PERMANENT";

export type OtReviewAction = "APPROVED" | "REJECTED" | "CONDITIONAL";

export type OtSuiteStatus = "DRAFT" | "IN_REVIEW" | "VALIDATED" | "ACTIVE" | "UNDER_MAINTENANCE" | "DECOMMISSIONED";

export type OtEmergencyCategory = "IMMEDIATE" | "URGENT" | "EXPEDITED";

/* ---- Row types ---- */

export type OtSuiteRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  locationNodeId?: string | null;
  status: OtSuiteStatus;
  lastValidationScore?: number | null;
  submittedForReviewAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  activatedAt?: string | null;
  decommissionedAt?: string | null;
  decommissionType?: OtDecommissionType | null;
  decommissionReason?: string | null;
  isActive: boolean;
  _count?: {
    spaces?: number;
    theatres?: number;
    equipment?: number;
    staffAssignments?: number;
  };
};

export type OtSpaceRow = {
  id: string;
  suiteId: string;
  code: string;
  name: string;
  type: OtSpaceType;
  details?: any;
  notes?: string | null;
  isActive: boolean;
};

export type OtTheatreRow = {
  id: string;
  suiteId: string;
  spaceId: string;
  name: string;
  code: string;
  type: OtTheatreType;
  area?: number | null;
  ceilingHeight?: number | null;
  isoClass?: string | null;
  airflow?: string | null;
  pressure?: string | null;
  gasO2?: boolean;
  gasO2Outlets?: number | null;
  gasN2O?: boolean;
  gasN2OOutlets?: number | null;
  gasAir?: boolean;
  gasAirOutlets?: number | null;
  gasVacuum?: boolean;
  gasVacuumOutlets?: number | null;
  upsOutlets?: number | null;
  isolatedPowerSupply?: boolean;
  tempMin?: number | null;
  tempMax?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
  luxLevel?: number | null;
  emergencyLighting?: boolean;
  specialtyCodes?: string[];
  turnaroundTimeMin?: number | null;
  cleaningTimeMin?: number | null;
  maxCasesPerDay?: number | null;
  defaultSlotMinor?: number | null;
  defaultSlotMajor?: number | null;
  defaultSlotComplex?: number | null;
  bufferEmergencyMin?: number | null;
  isEmergencyEligible?: boolean;
  is24x7Emergency?: boolean;
  isActive: boolean;
  space?: OtSpaceRow;
  tables?: { id: string; name: string }[];
};

export type OtEquipmentRow = {
  id: string;
  suiteId: string;
  spaceId?: string | null;
  name: string;
  category: string;
  qty: number;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status?: string;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDue?: string | null;
  amcVendor?: string | null;
  amcExpiry?: string | null;
  isActive: boolean;
  space?: OtSpaceRow;
};

export type OtStaffAssignmentRow = {
  id: string;
  suiteId: string;
  staffId: string;
  role: OtStaffRole;
  defaultShift?: string | null;
  isActive: boolean;
};

export type OtSurgeonPrivilegeRow = {
  id: string;
  suiteId: string;
  theatreSpaceId?: string | null;
  staffId: string;
  specialtyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
};

export type OtAnesthetistPrivilegeRow = {
  id: string;
  suiteId: string;
  theatreSpaceId?: string | null;
  staffId: string;
  concurrentCaseLimit?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
};

export type OtMinStaffingRuleRow = {
  id: string;
  suiteId: string;
  theatreSpaceId?: string | null;
  surgeryCategory: OtSurgeryCategory;
  minSurgeons: number;
  minAnesthetists: number;
  minScrubNurses: number;
  minCirculatingNurses: number;
  minOtTechnicians: number;
  minAnesthesiaTechnicians: number;
  isActive: boolean;
};

export type OtZoneAccessRuleRow = {
  id: string;
  suiteId: string;
  spaceId: string;
  zone: OtZoneType;
  allowedRoles: string[];
  isActive: boolean;
  space?: OtSpaceRow;
};

export type OtStoreLinkRow = {
  id: string;
  suiteId: string;
  pharmacyStoreId: string;
  linkType: string;
  isActive: boolean;
};

export type OtConsumableTemplateRow = {
  id: string;
  suiteId: string;
  name: string;
  surgeryCategory: OtSurgeryCategory;
  specialtyCode?: string | null;
  items: any;
  isActive: boolean;
};

export type OtImplantRuleRow = {
  id: string;
  suiteId: string;
  category: OtImplantCategory;
  mandatoryBarcodeScan: boolean;
  mandatoryBatchSerial: boolean;
  mandatoryManufacturer: boolean;
  mandatoryPatientConsent: boolean;
  isActive: boolean;
};

export type OtParLevelRow = {
  id: string;
  suiteId: string;
  itemName: string;
  drugMasterId?: string | null;
  minStock: number;
  reorderLevel: number;
  reorderQty: number;
  maxStock: number;
  isNeverOutOfStock: boolean;
  isActive: boolean;
};

export type OtSchedulingRuleRow = {
  id: string;
  suiteId: string;
  theatreSpaceId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionType: OtSessionType;
  lunchStart?: string | null;
  lunchEnd?: string | null;
  specialtyCode?: string | null;
  isEffectiveDated: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
};

export type OtSurgeryDefaultRow = {
  id: string;
  suiteId: string;
  category: OtSurgeryCategory;
  minDurationMin: number;
  defaultDurationMin: number;
  maxDurationMin: number;
  requiresIcuBooking: boolean;
  requiresBloodReservation: boolean;
  isActive: boolean;
};

export type OtEmergencyPolicyRow = {
  id: string;
  suiteId: string;
  hasDedicatedEmergencyOt: boolean;
  dedicatedTheatreSpaceId?: string | null;
  availability: string;
  escalationRule: string;
};

export type OtCancellationPolicyRow = {
  id: string;
  suiteId: string;
  minNoticeHours: number;
  cancellationAuthority: string[];
  mandatoryReasonRequired: boolean;
  reasons?: any;
  maxReschedulesPerCase: number;
  priorityBoostOnReschedule: boolean;
  autoNotifyPatient: boolean;
};

export type OtBookingApprovalRow = {
  id: string;
  suiteId: string;
  defaultMode: OtBookingApprovalMode;
  minorMode?: OtBookingApprovalMode;
  majorMode?: OtBookingApprovalMode;
  complexMode?: OtBookingApprovalMode;
  emergencyMode?: OtBookingApprovalMode;
  approvalTimeoutHours?: number;
};

export type OtUtilizationTargetRow = {
  id: string;
  suiteId: string;
  metricCode: string;
  targetValue: number;
  alertThresholdLow?: number | null;
  alertThresholdHigh?: number | null;
  isActive: boolean;
};

export type OtRecoveryProtocolRow = {
  id: string;
  suiteId: string;
  surgeryCategory: OtSurgeryCategory;
  monitoringFrequencyMin?: number;
  mandatoryVitals?: any;
  minRecoveryDurationMin?: number;
  dischargeScoreThreshold?: number;
  escalationRules?: any;
  dischargeSignOffRole?: string | null;
  isActive: boolean;
};

export type OtNotificationRuleRow = {
  id: string;
  suiteId: string;
  eventType: string;
  recipientRoles: string[];
  channels: string[];
  timing: string;
  isActive: boolean;
};

export type OtServiceLinkRow = {
  id: string;
  suiteId: string;
  serviceItemId: string;
  specialtyCode: string;
  surgeryCategory: OtSurgeryCategory;
  defaultTheatreType?: string | null;
  requiredEquipmentCategories?: string[];
  snomedCode?: string | null;
  icd10PcsCode?: string | null;
  isActive: boolean;
};

export type OtChargeComponentRow = {
  id: string;
  suiteId: string;
  componentType: OtChargeComponentType;
  chargeModel: OtChargeModel;
  serviceItemId?: string | null;
  glCode?: string | null;
  gstApplicable: boolean;
  defaultRate?: number;
  isActive: boolean;
};

export type OtChecklistTemplateRow = {
  id: string;
  suiteId: string;
  name: string;
  phase: OtChecklistPhase;
  templateType: string;
  items: any;
  version: number;
  isSystem: boolean;
  isActive: boolean;
};

export type OtComplianceConfigRow = {
  id: string;
  suiteId: string;
  configType: OtComplianceConfigType;
  config: any;
  lastAuditAt?: string | null;
  nextAuditDue?: string | null;
  isActive: boolean;
};

export type OtGoLiveCheckRow = {
  code: string;
  label: string;
  passed: boolean;
  severity: "BLOCKER" | "WARNING";
  detail?: string;
  fixRoute?: string;
};

export type OtReviewRecordRow = {
  id: string;
  suiteId: string;
  reviewerId: string;
  action: OtReviewAction;
  comments?: string | null;
  createdAt: string;
};

export type OtNabhCheckRow = {
  code: string;
  label: string;
  clause: string;
  status: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
  detail?: string;
};

export type OtBillingCompletenessRow = {
  totalServices: number;
  servicesWithCharges: number;
  servicesWithoutCharges: string[];
  partialServices: string[];
  completenessPercent: number;
};

export type OtPrivilegeGap = {
  theatreId: string;
  theatreName: string;
  specialty: string;
  missingRole: string;
  suggestion: string;
};
