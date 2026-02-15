import type {
  OtSpaceType,
  OtTheatreType,
  OtStaffRole,
  OtSurgeryCategory,
  OtSessionType,
  OtChargeComponentType,
  OtChargeModel,
  OtComplianceConfigType,
  OtChecklistPhase,
  OtZoneType,
  OtBookingApprovalMode,
  OtImplantCategory,
  OtDecommissionType,
  OtSuiteStatus,
} from "./types";

/* =========================================================
   Constants (aligned with Prisma enums)
   ========================================================= */

export const SPACE_TYPES: Array<{ value: OtSpaceType; label: string }> = [
  { value: "THEATRE", label: "Theatre" },
  { value: "RECOVERY_BAY", label: "Recovery Bay" },
  { value: "PREOP_HOLDING", label: "Pre-Op Holding" },
  { value: "INDUCTION_ROOM", label: "Induction Room" },
  { value: "SCRUB_ROOM", label: "Scrub Room" },
  { value: "STERILE_STORE", label: "Sterile Store" },
  { value: "ANESTHESIA_STORE", label: "Anesthesia Store" },
  { value: "STAFF_CHANGE", label: "Staff Changing Room" },
  { value: "OTHER", label: "Other" },
];

export const THEATRE_TYPES: Array<{ value: OtTheatreType; label: string }> = [
  { value: "STANDARD", label: "Standard" },
  { value: "LAMINAR_FLOW", label: "Laminar Flow" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "DAY_SURGERY", label: "Day Surgery" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "LAPAROSCOPIC", label: "Laparoscopic" },
];

export const STAFF_ROLES: Array<{ value: OtStaffRole; label: string }> = [
  { value: "OT_IN_CHARGE", label: "OT In-Charge" },
  { value: "SURGEON", label: "Surgeon" },
  { value: "ANESTHETIST", label: "Anesthetist" },
  { value: "ANESTHESIA_TECHNICIAN", label: "Anesthesia Technician" },
  { value: "SCRUB_NURSE", label: "Scrub Nurse" },
  { value: "CIRCULATING_NURSE", label: "Circulating Nurse" },
  { value: "OT_TECHNICIAN", label: "OT Technician" },
  { value: "RECOVERY_NURSE", label: "Recovery Nurse" },
  { value: "CSSD_TECHNICIAN", label: "CSSD Technician" },
  { value: "OT_ATTENDANT", label: "OT Attendant" },
];

export const SURGERY_CATEGORIES: Array<{ value: OtSurgeryCategory; label: string }> = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "COMPLEX", label: "Complex" },
  { value: "DAYCARE", label: "Day Care" },
];

export const SESSION_TYPES: Array<{ value: OtSessionType; label: string }> = [
  { value: "ELECTIVE", label: "Elective" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "BOTH", label: "Both" },
];

export const CHARGE_COMPONENT_TYPES: Array<{ value: OtChargeComponentType; label: string }> = [
  { value: "THEATRE_CHARGE", label: "Theatre Charge" },
  { value: "SURGEON_FEE", label: "Surgeon Fee" },
  { value: "ANESTHESIA_FEE", label: "Anesthesia Fee" },
  { value: "MATERIAL_CHARGE", label: "Material Charge" },
  { value: "NURSING_CHARGE", label: "Nursing Charge" },
  { value: "EQUIPMENT_CHARGE", label: "Equipment Charge" },
  { value: "RECOVERY_CHARGE", label: "Recovery Charge" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
];

export const CHARGE_MODELS: Array<{ value: OtChargeModel; label: string }> = [
  { value: "FLAT", label: "Flat" },
  { value: "HOURLY", label: "Hourly" },
  { value: "PER_CASE", label: "Per Case" },
  { value: "SLAB", label: "Slab" },
  { value: "PACKAGE", label: "Package" },
];

export const COMPLIANCE_CONFIG_TYPES: Array<{ value: OtComplianceConfigType; label: string }> = [
  { value: "WHO_CHECKLIST", label: "WHO Checklist" },
  { value: "INFECTION_CONTROL_ZONES", label: "Infection Control Zones" },
  { value: "FUMIGATION_SCHEDULE", label: "Fumigation Schedule" },
  { value: "BIOMEDICAL_WASTE", label: "Biomedical Waste" },
  { value: "FIRE_SAFETY", label: "Fire Safety" },
  { value: "SSI_SURVEILLANCE", label: "SSI Surveillance" },
];

export const CHECKLIST_PHASES: Array<{ value: OtChecklistPhase; label: string }> = [
  { value: "SIGN_IN", label: "Sign In" },
  { value: "TIME_OUT", label: "Time Out" },
  { value: "SIGN_OUT", label: "Sign Out" },
  { value: "PRE_OP", label: "Pre-Op" },
  { value: "POST_OP", label: "Post-Op" },
];

export const ZONE_TYPES: Array<{ value: OtZoneType; label: string }> = [
  { value: "UNRESTRICTED", label: "Unrestricted" },
  { value: "SEMI_RESTRICTED", label: "Semi-Restricted" },
  { value: "RESTRICTED", label: "Restricted" },
];

export const BOOKING_APPROVAL_MODES: Array<{ value: OtBookingApprovalMode; label: string }> = [
  { value: "DIRECT", label: "Direct" },
  { value: "APPROVAL_REQUIRED", label: "Approval Required" },
  { value: "AUTO_WITH_RULES", label: "Auto with Rules" },
];

export const IMPLANT_CATEGORIES: Array<{ value: OtImplantCategory; label: string }> = [
  { value: "ORTHOPEDIC", label: "Orthopedic" },
  { value: "CARDIAC", label: "Cardiac" },
  { value: "OPHTHALMIC", label: "Ophthalmic" },
  { value: "GENERAL", label: "General" },
];

export const DECOMMISSION_TYPES: Array<{ value: OtDecommissionType; label: string }> = [
  { value: "TEMPORARY", label: "Temporary (Under Maintenance)" },
  { value: "PERMANENT", label: "Permanent (Decommissioned)" },
];

export const SUITE_STATUSES: Array<{ value: OtSuiteStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "VALIDATED", label: "Validated" },
  { value: "ACTIVE", label: "Active" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
];

export const EQUIPMENT_CATEGORIES = [
  "ANESTHESIA_MACHINE",
  "VENTILATOR",
  "PATIENT_MONITOR",
  "ELECTROSURGICAL_UNIT",
  "SUCTION_MACHINE",
  "DEFIBRILLATOR",
  "OT_TABLE",
  "OT_LIGHT",
  "C_ARM",
  "LAPAROSCOPY_TOWER",
  "MICROSCOPE",
  "CAUTERY",
  "TOURNIQUET",
  "WARMING_DEVICE",
  "INFUSION_PUMP",
  "SYRINGE_PUMP",
  "CRASH_CART",
  "OTHER",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

/* ---- Day names for scheduling grid ---- */
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/* ---- Utilization metric codes ---- */
export const UTILIZATION_METRICS = [
  { code: "THEATRE_UTIL_PCT", label: "Theatre Utilization %" },
  { code: "TURNOVER_TIME_MIN", label: "Avg Turnover Time (min)" },
  { code: "FIRST_CASE_ONTIME_PCT", label: "First Case On-Time %" },
  { code: "CANCELLATION_RATE_PCT", label: "Cancellation Rate %" },
] as const;

/* ---- Notification event types ---- */
export const NOTIFICATION_EVENT_TYPES = [
  "SURGERY_SCHEDULED",
  "SURGERY_CANCELLED",
  "SURGERY_RESCHEDULED",
  "EQUIPMENT_DOWN",
  "EMERGENCY_ACTIVATION",
  "CONSENT_PENDING",
  "PRE_OP_INCOMPLETE",
  "RECOVERY_ESCALATION",
] as const;

export const NOTIFICATION_CHANNELS = ["SMS", "EMAIL", "IN_APP", "WHATSAPP"] as const;
