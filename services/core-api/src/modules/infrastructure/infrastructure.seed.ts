import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@zypocare/db";
import type { PrismaClient } from "@zypocare/db";
import type { UnitCategory } from "@zypocare/db/src/generated/client";
import { INFRA_POLICY } from "./infrastructure.constants";

const OH_24x7 = {
  mode: "WEEKLY",
  tz: "Asia/Kolkata",
  days: {
    MON: [{ start: "00:00", end: "23:59" }],
    TUE: [{ start: "00:00", end: "23:59" }],
    WED: [{ start: "00:00", end: "23:59" }],
    THU: [{ start: "00:00", end: "23:59" }],
    FRI: [{ start: "00:00", end: "23:59" }],
    SAT: [{ start: "00:00", end: "23:59" }],
    SUN: [{ start: "00:00", end: "23:59" }],
  },
};

const OH_BUSINESS = {
  mode: "WEEKLY",
  tz: "Asia/Kolkata",
  days: {
    MON: [{ start: "09:00", end: "18:00" }],
    TUE: [{ start: "09:00", end: "18:00" }],
    WED: [{ start: "09:00", end: "18:00" }],
    THU: [{ start: "09:00", end: "18:00" }],
    FRI: [{ start: "09:00", end: "18:00" }],
    SAT: [{ start: "09:00", end: "14:00" }],
    SUN: [],
  },
};

type UnitTypeSeed = {
  code: string;
  name: string;
  category: UnitCategory;
  usesRoomsDefault?: boolean;
  schedulableByDefault?: boolean;
  bedBasedDefault?: boolean;
  requiresPreAuthDefault?: boolean;
  defaultOperatingHours?: any;
  standardEquipment?: string[];
  isSystemDefined?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

const UNIT_TYPES: UnitTypeSeed[] = [
  // Legacy (kept for backward compatibility)
  {
    code: "WARD",
    name: "Ward / IPD (Legacy)",
    category: "INPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Hospital Bed", "Bedside Monitor"],
    isSystemDefined: true,
    sortOrder: 9,
    isActive: false,
  },

  // OUTPATIENT
  {
    code: "OPD",
    name: "Outpatient Department (OPD)",
    category: "OUTPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Examination Couch", "BP Apparatus", "Pulse Oximeter"],
    isSystemDefined: true,
    sortOrder: 10,
  },
  {
    code: "DAYC",
    name: "Day Care",
    category: "OUTPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Recliner Chair", "IV Stand"],
    isSystemDefined: true,
    sortOrder: 11,
  },

  // INPATIENT
  {
    code: "IPD_GEN",
    name: "General Ward (IPD)",
    category: "INPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Hospital Bed", "Bedside Monitor"],
    isSystemDefined: true,
    sortOrder: 20,
  },
  {
    code: "IPD_SEMI",
    name: "Semi-Private Ward (IPD)",
    category: "INPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Hospital Bed", "Bedside Monitor"],
    isSystemDefined: true,
    sortOrder: 21,
  },
  {
    code: "IPD_PVT",
    name: "Private Ward (IPD)",
    category: "INPATIENT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Hospital Bed", "Bedside Monitor", "Oxygen Outlet"],
    isSystemDefined: true,
    sortOrder: 22,
  },

  // CRITICAL CARE
  {
    code: "ER",
    name: "Emergency (ER)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: false,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Crash Cart", "Defibrillator", "Oxygen", "Suction"],
    isSystemDefined: true,
    sortOrder: 30,
  },
  {
    code: "ICU",
    name: "Intensive Care Unit (ICU)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Ventilator", "Patient Monitor", "Infusion Pump", "Syringe Pump"],
    isSystemDefined: true,
    sortOrder: 31,
  },
  {
    code: "ICCU",
    name: "Coronary Care Unit (ICCU)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Cardiac Monitor", "Defibrillator", "Infusion Pump"],
    isSystemDefined: true,
    sortOrder: 32,
  },
  {
    code: "HDU",
    name: "High Dependency Unit (HDU)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Patient Monitor", "Oxygen", "Suction"],
    isSystemDefined: true,
    sortOrder: 33,
  },
  {
    code: "NICU",
    name: "Neonatal ICU (NICU)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Incubator", "Radiant Warmer", "Neonatal Monitor"],
    isSystemDefined: true,
    sortOrder: 34,
  },
  {
    code: "PICU",
    name: "Pediatric ICU (PICU)",
    category: "CRITICAL_CARE",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: true,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Ventilator", "Patient Monitor", "Infusion Pump"],
    isSystemDefined: true,
    sortOrder: 35,
  },

  // PROCEDURE
  {
    code: "OT",
    name: "Operation Theatre (OT)",
    category: "PROCEDURE",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Anesthesia Workstation", "OT Table", "Surgical Lights", "Cautery"],
    isSystemDefined: true,
    sortOrder: 40,
  },
  {
    code: "PROC",
    name: "Procedure Unit",
    category: "PROCEDURE",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Procedure Table", "Monitor", "Oxygen"],
    isSystemDefined: true,
    sortOrder: 41,
  },
  {
    code: "ENDO",
    name: "Endoscopy Suite",
    category: "PROCEDURE",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Endoscopy Tower", "Monitor", "Suction"],
    isSystemDefined: true,
    sortOrder: 42,
  },
  {
    code: "CATH",
    name: "Cath Lab",
    category: "PROCEDURE",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Cath Lab System", "Hemodynamic Monitor"],
    isSystemDefined: true,
    sortOrder: 43,
  },
  {
    code: "DIAL",
    name: "Dialysis",
    category: "PROCEDURE",
    usesRoomsDefault: false,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Dialysis Machine", "Recliner Chair", "RO Plant"],
    isSystemDefined: true,
    sortOrder: 44,
  },
  {
    code: "LND",
    name: "Labour & Delivery",
    category: "PROCEDURE",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: true,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Delivery Bed", "Fetal Monitor", "Neonatal Warmer"],
    isSystemDefined: true,
    sortOrder: 45,
  },

  // DIAGNOSTIC
  {
    code: "LAB",
    name: "Laboratory",
    category: "DIAGNOSTIC",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Centrifuge", "Microscope", "Analyzer"],
    isSystemDefined: true,
    sortOrder: 50,
  },
  {
    code: "IMAG",
    name: "Imaging / Radiology",
    category: "DIAGNOSTIC",
    usesRoomsDefault: true,
    schedulableByDefault: true,
    bedBasedDefault: false,
    requiresPreAuthDefault: true,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["X-Ray", "Ultrasound", "CT", "MRI"],
    isSystemDefined: true,
    sortOrder: 51,
  },

  // SUPPORT
  {
    code: "PHARM",
    name: "Pharmacy",
    category: "SUPPORT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Refrigerator", "Temperature Logger"],
    isSystemDefined: true,
    sortOrder: 60,
  },
  {
    code: "STORE",
    name: "Stores",
    category: "SUPPORT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Racking System", "Barcode Scanner"],
    isSystemDefined: true,
    sortOrder: 61,
  },
  {
    code: "CSSD",
    name: "CSSD",
    category: "SUPPORT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_BUSINESS,
    standardEquipment: ["Autoclave", "ETO Sterilizer", "Washer Disinfector"],
    isSystemDefined: true,
    sortOrder: 62,
  },
  {
    code: "BBNK",
    name: "Blood Bank",
    category: "SUPPORT",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    bedBasedDefault: false,
    requiresPreAuthDefault: false,
    defaultOperatingHours: OH_24x7,
    standardEquipment: ["Blood Storage Refrigerator", "Platelet Agitator"],
    isSystemDefined: true,
    sortOrder: 63,
  },
];


const DIAGNOSTIC_PACK_SEEDS = [
  {
    code: "LAB_CORE_V1",
    name: "Lab Core Pack",
    labType: "LAB_CORE",
    description: "Core laboratory setup with common lab items.",
    payload: {
      servicePoints: [{ code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true }],
      sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
      categories: [{ code: "GEN", name: "General Lab", sectionCode: "LAB", sortOrder: 10 }],
      specimens: [
        { code: "SERUM", name: "Serum", container: "Vacutainer" },
        { code: "WB", name: "Whole Blood", container: "EDTA" },
        { code: "URINE", name: "Urine", container: "Urine cup" },
      ],
      items: [
        { code: "GLU", name: "Glucose (Fasting)", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "SERUM", isPanel: false },
        { code: "CBC", name: "Complete Blood Count", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "WB", isPanel: true },
        { code: "HGB", name: "Hemoglobin", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "WB", isPanel: false },
        { code: "WBC", name: "White Blood Cells", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "WB", isPanel: false },
        { code: "PLT", name: "Platelets", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "WB", isPanel: false },
        { code: "URINE-R", name: "Urine Routine", kind: "LAB", sectionCode: "LAB", categoryCode: "GEN", specimenCode: "URINE", isPanel: false },
      ],
      panelItems: [
        { panelCode: "CBC", itemCode: "HGB", sortOrder: 1 },
        { panelCode: "CBC", itemCode: "WBC", sortOrder: 2 },
        { panelCode: "CBC", itemCode: "PLT", sortOrder: 3 },
      ],
      parameters: [
        { itemCode: "GLU", code: "GLU", name: "Glucose", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "HGB", code: "HGB", name: "Hemoglobin", dataType: "NUMERIC", unit: "g/dL", precision: 1 },
        { itemCode: "WBC", code: "WBC", name: "WBC", dataType: "NUMERIC", unit: "10^3/uL", precision: 1 },
        { itemCode: "PLT", code: "PLT", name: "Platelets", dataType: "NUMERIC", unit: "10^3/uL", precision: 0 },
      ],
      ranges: [
        { itemCode: "GLU", parameterCode: "GLU", low: 70, high: 100, textRange: "Normal" },
        { itemCode: "HGB", parameterCode: "HGB", low: 12, high: 17, textRange: "Normal" },
        { itemCode: "WBC", parameterCode: "WBC", low: 4, high: 11, textRange: "Normal" },
        { itemCode: "PLT", parameterCode: "PLT", low: 150, high: 450, textRange: "Normal" },
      ],
      templates: [
        { itemCode: "GLU", kind: "LAB_REPORT", name: "Glucose Report", body: "Glucose (Fasting): {{value}} mg/dL" },
        { itemCode: "CBC", kind: "LAB_REPORT", name: "CBC Report", body: "Hemoglobin: {{hgb}}\nWBC: {{wbc}}\nPlatelets: {{plt}}" },
      ],
      capabilities: [
        { servicePointCode: "LAB", itemCode: "GLU", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "CBC", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "HGB", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "WBC", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "PLT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "URINE-R", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
      ],
    },
  },
  {
    code: "RADIOLOGY_CORE_V1",
    name: "Radiology Core Pack",
    labType: "RADIOLOGY",
    description: "Core radiology setup for X-Ray, USG, CT, MRI.",
    payload: {
      servicePoints: [
        { code: "XRAY", name: "X-Ray Unit", type: "RADIOLOGY", requiresPlacement: true },
        { code: "USG", name: "Ultrasound Unit", type: "RADIOLOGY", requiresPlacement: true },
        { code: "CT", name: "CT Scan Unit", type: "RADIOLOGY", requiresPlacement: true },
        { code: "MRI", name: "MRI Suite", type: "RADIOLOGY", requiresPlacement: true },
      ],
      sections: [{ code: "RADIOLOGY", name: "Radiology", sortOrder: 20 }],
      categories: [
        { code: "XRAY", name: "X-Ray", sectionCode: "RADIOLOGY", sortOrder: 10 },
        { code: "USG", name: "Ultrasound", sectionCode: "RADIOLOGY", sortOrder: 20 },
        { code: "CT", name: "CT Scan", sectionCode: "RADIOLOGY", sortOrder: 30 },
        { code: "MRI", name: "MRI", sectionCode: "RADIOLOGY", sortOrder: 40 },
      ],
      items: [
        { code: "XR-CHEST", name: "Chest X-Ray", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "XRAY", isPanel: false },
        { code: "XR-ABD", name: "Abdomen X-Ray", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "XRAY", isPanel: false },
        { code: "USG-ABD", name: "USG Abdomen", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "USG", isPanel: false },
        { code: "USG-PELVIS", name: "USG Pelvis", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "USG", isPanel: false },
        { code: "CT-BRAIN", name: "CT Brain", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "CT", isPanel: false },
        { code: "CT-CHEST", name: "CT Chest", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "CT", isPanel: false },
        { code: "MRI-BRAIN", name: "MRI Brain", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "MRI", isPanel: false },
        { code: "MRI-SPINE", name: "MRI Spine", kind: "IMAGING", sectionCode: "RADIOLOGY", categoryCode: "MRI", isPanel: false },
      ],
      templates: [
        { itemCode: "XR-CHEST", kind: "IMAGING_REPORT", name: "X-Ray Report", body: "Findings: {{findings}}\nImpression: {{impression}}" },
        { itemCode: "CT-BRAIN", kind: "IMAGING_REPORT", name: "CT Report", body: "Findings: {{findings}}\nImpression: {{impression}}" },
        { itemCode: "MRI-BRAIN", kind: "IMAGING_REPORT", name: "MRI Report", body: "Findings: {{findings}}\nImpression: {{impression}}" },
      ],
      capabilities: [
        { servicePointCode: "XRAY", itemCode: "XR-CHEST", modality: "XRAY", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "XRAY", itemCode: "XR-ABD", modality: "XRAY", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "USG", itemCode: "USG-ABD", modality: "ULTRASOUND", defaultDurationMins: 15, isPrimary: true },
        { servicePointCode: "USG", itemCode: "USG-PELVIS", modality: "ULTRASOUND", defaultDurationMins: 15, isPrimary: true },
        { servicePointCode: "CT", itemCode: "CT-BRAIN", modality: "CT", defaultDurationMins: 20, isPrimary: true },
        { servicePointCode: "CT", itemCode: "CT-CHEST", modality: "CT", defaultDurationMins: 20, isPrimary: true },
        { servicePointCode: "MRI", itemCode: "MRI-BRAIN", modality: "MRI", defaultDurationMins: 30, isPrimary: true },
        { servicePointCode: "MRI", itemCode: "MRI-SPINE", modality: "MRI", defaultDurationMins: 30, isPrimary: true },
      ],
    },
  },
  {
    code: "CARDIO_DIAGNOSTICS_V1",
    name: "Cardio Diagnostics Pack",
    labType: "CARDIO",
    description: "ECG, ECHO, TMT, Holter setup.",
    payload: {
      servicePoints: [{ code: "CARDIO", name: "Cardio Diagnostics", type: "CARDIO_DIAGNOSTICS", requiresPlacement: true }],
      sections: [{ code: "CARDIO", name: "Cardiology", sortOrder: 30 }],
      categories: [{ code: "CARDIO", name: "Cardio Diagnostics", sectionCode: "CARDIO", sortOrder: 10 }],
      items: [
        { code: "ECG", name: "ECG", kind: "PROCEDURE", sectionCode: "CARDIO", categoryCode: "CARDIO", isPanel: false },
        { code: "ECHO", name: "ECHO", kind: "PROCEDURE", sectionCode: "CARDIO", categoryCode: "CARDIO", isPanel: false },
        { code: "TMT", name: "TMT", kind: "PROCEDURE", sectionCode: "CARDIO", categoryCode: "CARDIO", isPanel: false },
        { code: "HOLTER", name: "Holter Monitoring", kind: "PROCEDURE", sectionCode: "CARDIO", categoryCode: "CARDIO", isPanel: false },
      ],
      templates: [
        { itemCode: "ECG", kind: "IMAGING_REPORT", name: "ECG Report", body: "Rate: {{rate}}\nRhythm: {{rhythm}}\nImpression: {{impression}}" },
        { itemCode: "ECHO", kind: "IMAGING_REPORT", name: "ECHO Report", body: "Findings: {{findings}}\nImpression: {{impression}}" },
      ],
      capabilities: [
        { servicePointCode: "CARDIO", itemCode: "ECG", modality: "ECG", defaultDurationMins: 15, isPrimary: true },
        { servicePointCode: "CARDIO", itemCode: "ECHO", modality: "ECHO", defaultDurationMins: 30, isPrimary: true },
        { servicePointCode: "CARDIO", itemCode: "TMT", modality: "TMT", defaultDurationMins: 45, isPrimary: true },
        { servicePointCode: "CARDIO", itemCode: "HOLTER", modality: "HOLTER", defaultDurationMins: 60, isPrimary: true },
      ],
    },
  },
  {
    code: "PULMONARY_DIAGNOSTICS_V1",
    name: "Pulmonary Diagnostics Pack",
    labType: "PULMONARY",
    description: "PFT and Spirometry setup.",
    payload: {
      servicePoints: [{ code: "PULM", name: "Pulmonary Diagnostics", type: "PULMONARY_DIAGNOSTICS", requiresPlacement: true }],
      sections: [{ code: "PULM", name: "Pulmonology", sortOrder: 40 }],
      categories: [{ code: "PULM", name: "Pulmonary Diagnostics", sectionCode: "PULM", sortOrder: 10 }],
      items: [
        { code: "PFT", name: "Pulmonary Function Test", kind: "PROCEDURE", sectionCode: "PULM", categoryCode: "PULM", isPanel: false },
        { code: "SPIRO", name: "Spirometry", kind: "PROCEDURE", sectionCode: "PULM", categoryCode: "PULM", isPanel: false },
      ],
      templates: [
        { itemCode: "PFT", kind: "IMAGING_REPORT", name: "PFT Report", body: "Summary: {{summary}}\nImpression: {{impression}}" },
      ],
      capabilities: [
        { servicePointCode: "PULM", itemCode: "PFT", modality: "PFT", defaultDurationMins: 20, isPrimary: true },
        { servicePointCode: "PULM", itemCode: "SPIRO", modality: "PFT", defaultDurationMins: 15, isPrimary: true },
      ],
    },
  },
  {
    code: "ENDOSCOPY_SUITE_V1",
    name: "Endoscopy Suite Pack",
    labType: "ENDOSCOPY",
    description: "Upper GI endoscopy and colonoscopy setup.",
    payload: {
      servicePoints: [{ code: "ENDO", name: "Endoscopy Suite", type: "ENDOSCOPY", requiresPlacement: true }],
      sections: [{ code: "ENDO", name: "Endoscopy", sortOrder: 50 }],
      categories: [{ code: "ENDO", name: "Endoscopy", sectionCode: "ENDO", sortOrder: 10 }],
      items: [
        { code: "UGI-ENDO", name: "Upper GI Endoscopy", kind: "PROCEDURE", sectionCode: "ENDO", categoryCode: "ENDO", isPanel: false },
        { code: "COLONO", name: "Colonoscopy", kind: "PROCEDURE", sectionCode: "ENDO", categoryCode: "ENDO", isPanel: false },
      ],
      templates: [
        { itemCode: "UGI-ENDO", kind: "IMAGING_REPORT", name: "Endoscopy Report", body: "Findings: {{findings}}\nImpression: {{impression}}" },
      ],
      capabilities: [
        { servicePointCode: "ENDO", itemCode: "UGI-ENDO", modality: "PROCEDURE_ROOM", defaultDurationMins: 30, isPrimary: true },
        { servicePointCode: "ENDO", itemCode: "COLONO", modality: "PROCEDURE_ROOM", defaultDurationMins: 45, isPrimary: true },
      ],
    },
  },
  {
    code: "MICROBIOLOGY_LAB_V1",
    name: "Microbiology Lab Pack",
    labType: "MICROBIOLOGY",
    description: "Basic microbiology setup with culture workflows.",
    payload: {
      servicePoints: [{ code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true }],
      sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
      categories: [{ code: "MICRO", name: "Microbiology", sectionCode: "LAB", sortOrder: 30 }],
      specimens: [
        { code: "URINE", name: "Urine", container: "Urine cup" },
        { code: "SWAB", name: "Swab", container: "Swab tube" },
      ],
      items: [
        { code: "URINE-CULT", name: "Urine Culture", kind: "LAB", sectionCode: "LAB", categoryCode: "MICRO", specimenCode: "URINE", isPanel: false },
        { code: "SWAB-CULT", name: "Swab Culture", kind: "LAB", sectionCode: "LAB", categoryCode: "MICRO", specimenCode: "SWAB", isPanel: false },
      ],
      parameters: [
        { itemCode: "URINE-CULT", code: "ORG", name: "Organism", dataType: "TEXT" },
        { itemCode: "SWAB-CULT", code: "ORG", name: "Organism", dataType: "TEXT" },
      ],
      templates: [
        { itemCode: "URINE-CULT", kind: "LAB_REPORT", name: "Culture Report", body: "Organism: {{value}}\nSensitivity: {{sensitivity}}" },
      ],
      capabilities: [
        { servicePointCode: "LAB", itemCode: "URINE-CULT", modality: "LAB", defaultDurationMins: 30, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "SWAB-CULT", modality: "LAB", defaultDurationMins: 30, isPrimary: true },
      ],
    },
  },
  {
    code: "BIOCHEMISTRY_LAB_V1",
    name: "Biochemistry Lab Pack",
    labType: "BIOCHEMISTRY",
    description: "Biochemistry tests: LFT, KFT, Lipid, Glucose, HbA1c.",
    payload: {
      servicePoints: [{ code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true }],
      sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
      categories: [{ code: "BIO", name: "Biochemistry", sectionCode: "LAB", sortOrder: 20 }],
      specimens: [
        { code: "SERUM", name: "Serum", container: "Vacutainer" },
        { code: "WB", name: "Whole Blood", container: "EDTA" },
      ],
      items: [
        { code: "GLU", name: "Glucose (Fasting)", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "KFT", name: "Kidney Function Test", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: true },
        { code: "UREA", name: "Urea", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "CREAT", name: "Creatinine", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "LIPID", name: "Lipid Profile", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: true },
        { code: "TC", name: "Total Cholesterol", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "TG", name: "Triglycerides", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "HDL", name: "HDL Cholesterol", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "LDL", name: "LDL Cholesterol", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "LFT", name: "Liver Function Test", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: true },
        { code: "SGPT", name: "ALT (SGPT)", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "SGOT", name: "AST (SGOT)", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "ALP", name: "Alkaline Phosphatase", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "TBIL", name: "Total Bilirubin", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "TSH", name: "TSH", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "SERUM", isPanel: false },
        { code: "HBA1C", name: "HbA1c", kind: "LAB", sectionCode: "LAB", categoryCode: "BIO", specimenCode: "WB", isPanel: false },
      ],
      panelItems: [
        { panelCode: "KFT", itemCode: "UREA", sortOrder: 1 },
        { panelCode: "KFT", itemCode: "CREAT", sortOrder: 2 },
        { panelCode: "LIPID", itemCode: "TC", sortOrder: 1 },
        { panelCode: "LIPID", itemCode: "TG", sortOrder: 2 },
        { panelCode: "LIPID", itemCode: "HDL", sortOrder: 3 },
        { panelCode: "LIPID", itemCode: "LDL", sortOrder: 4 },
        { panelCode: "LFT", itemCode: "SGPT", sortOrder: 1 },
        { panelCode: "LFT", itemCode: "SGOT", sortOrder: 2 },
        { panelCode: "LFT", itemCode: "ALP", sortOrder: 3 },
        { panelCode: "LFT", itemCode: "TBIL", sortOrder: 4 },
      ],
      parameters: [
        { itemCode: "GLU", code: "GLU", name: "Glucose", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "UREA", code: "UREA", name: "Urea", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "CREAT", code: "CREAT", name: "Creatinine", dataType: "NUMERIC", unit: "mg/dL", precision: 2 },
        { itemCode: "TC", code: "TC", name: "Total Cholesterol", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "TG", code: "TG", name: "Triglycerides", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "HDL", code: "HDL", name: "HDL", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "LDL", code: "LDL", name: "LDL", dataType: "NUMERIC", unit: "mg/dL", precision: 0 },
        { itemCode: "SGPT", code: "SGPT", name: "ALT (SGPT)", dataType: "NUMERIC", unit: "U/L", precision: 0 },
        { itemCode: "SGOT", code: "SGOT", name: "AST (SGOT)", dataType: "NUMERIC", unit: "U/L", precision: 0 },
        { itemCode: "ALP", code: "ALP", name: "ALP", dataType: "NUMERIC", unit: "U/L", precision: 0 },
        { itemCode: "TBIL", code: "TBIL", name: "Total Bilirubin", dataType: "NUMERIC", unit: "mg/dL", precision: 1 },
        { itemCode: "TSH", code: "TSH", name: "TSH", dataType: "NUMERIC", unit: "uIU/mL", precision: 2 },
        { itemCode: "HBA1C", code: "HBA1C", name: "HbA1c", dataType: "NUMERIC", unit: "%", precision: 1 },
      ],
      ranges: [
        { itemCode: "GLU", parameterCode: "GLU", low: 70, high: 100, textRange: "Normal" },
        { itemCode: "UREA", parameterCode: "UREA", low: 15, high: 45, textRange: "Normal" },
        { itemCode: "CREAT", parameterCode: "CREAT", low: 0.6, high: 1.3, textRange: "Normal" },
        { itemCode: "TC", parameterCode: "TC", low: 125, high: 200, textRange: "Normal" },
        { itemCode: "TG", parameterCode: "TG", low: 50, high: 150, textRange: "Normal" },
        { itemCode: "HDL", parameterCode: "HDL", low: 40, high: 60, textRange: "Normal" },
        { itemCode: "LDL", parameterCode: "LDL", low: 0, high: 130, textRange: "Normal" },
        { itemCode: "SGPT", parameterCode: "SGPT", low: 7, high: 56, textRange: "Normal" },
        { itemCode: "SGOT", parameterCode: "SGOT", low: 5, high: 40, textRange: "Normal" },
        { itemCode: "ALP", parameterCode: "ALP", low: 44, high: 147, textRange: "Normal" },
        { itemCode: "TBIL", parameterCode: "TBIL", low: 0.2, high: 1.2, textRange: "Normal" },
        { itemCode: "TSH", parameterCode: "TSH", low: 0.4, high: 4.0, textRange: "Normal" },
        { itemCode: "HBA1C", parameterCode: "HBA1C", low: 4.0, high: 5.6, textRange: "Normal" },
      ],
      templates: [
        { itemCode: "GLU", kind: "LAB_REPORT", name: "Glucose Report", body: "Glucose (Fasting): {{value}} mg/dL" },
        { itemCode: "LFT", kind: "LAB_REPORT", name: "LFT Report", body: "ALT: {{sgpt}}\nAST: {{sgot}}\nALP: {{alp}}\nTotal Bilirubin: {{tbil}}" },
        { itemCode: "KFT", kind: "LAB_REPORT", name: "KFT Report", body: "Urea: {{urea}}\nCreatinine: {{creat}}" },
      ],
      capabilities: [
        { servicePointCode: "LAB", itemCode: "GLU", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "KFT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "UREA", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "CREAT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "LIPID", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "TC", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "TG", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "HDL", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "LDL", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "LFT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "SGPT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "SGOT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "ALP", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "TBIL", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "TSH", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "HBA1C", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
      ],
    },
  },
  {
    code: "HEMATOLOGY_LAB_V1",
    name: "Hematology Lab Pack",
    labType: "HEMATOLOGY",
    description: "CBC and hematology tests setup.",
    payload: {
      servicePoints: [{ code: "LAB", name: "Central Laboratory", type: "LAB", requiresPlacement: true }],
      sections: [{ code: "LAB", name: "Laboratory", sortOrder: 10 }],
      categories: [{ code: "HEM", name: "Hematology", sectionCode: "LAB", sortOrder: 10 }],
      specimens: [{ code: "WB", name: "Whole Blood", container: "EDTA" }],
      items: [
        { code: "CBC", name: "Complete Blood Count", kind: "LAB", sectionCode: "LAB", categoryCode: "HEM", specimenCode: "WB", isPanel: true },
        { code: "HGB", name: "Hemoglobin", kind: "LAB", sectionCode: "LAB", categoryCode: "HEM", specimenCode: "WB", isPanel: false },
        { code: "WBC", name: "White Blood Cells", kind: "LAB", sectionCode: "LAB", categoryCode: "HEM", specimenCode: "WB", isPanel: false },
        { code: "PLT", name: "Platelets", kind: "LAB", sectionCode: "LAB", categoryCode: "HEM", specimenCode: "WB", isPanel: false },
      ],
      panelItems: [
        { panelCode: "CBC", itemCode: "HGB", sortOrder: 1 },
        { panelCode: "CBC", itemCode: "WBC", sortOrder: 2 },
        { panelCode: "CBC", itemCode: "PLT", sortOrder: 3 },
      ],
      parameters: [
        { itemCode: "HGB", code: "HGB", name: "Hemoglobin", dataType: "NUMERIC", unit: "g/dL", precision: 1 },
        { itemCode: "WBC", code: "WBC", name: "WBC", dataType: "NUMERIC", unit: "10^3/uL", precision: 1 },
        { itemCode: "PLT", code: "PLT", name: "Platelets", dataType: "NUMERIC", unit: "10^3/uL", precision: 0 },
      ],
      ranges: [
        { itemCode: "HGB", parameterCode: "HGB", low: 12, high: 17, textRange: "Normal" },
        { itemCode: "WBC", parameterCode: "WBC", low: 4, high: 11, textRange: "Normal" },
        { itemCode: "PLT", parameterCode: "PLT", low: 150, high: 450, textRange: "Normal" },
      ],
      templates: [
        { itemCode: "CBC", kind: "LAB_REPORT", name: "CBC Report", body: "Hemoglobin: {{hgb}}\nWBC: {{wbc}}\nPlatelets: {{plt}}" },
      ],
      capabilities: [
        { servicePointCode: "LAB", itemCode: "CBC", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "HGB", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "WBC", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
        { servicePointCode: "LAB", itemCode: "PLT", modality: "LAB", defaultDurationMins: 10, isPrimary: true },
      ],
    },
  },
];

@Injectable()
export class InfrastructureSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  async onModuleInit() {
    // Only run in dev seed mode
    if (process.env.AUTH_DEV_SEED !== "true") return;

    // Seed unit types
    for (const ut of UNIT_TYPES) {
      await this.prisma.unitTypeCatalog.upsert({
        where: { code: ut.code },
        update: {
          name: ut.name,
          category: ut.category,
          usesRoomsDefault: ut.usesRoomsDefault,
          schedulableByDefault: ut.schedulableByDefault,
          bedBasedDefault: ut.bedBasedDefault,
          requiresPreAuthDefault: ut.requiresPreAuthDefault,
          defaultOperatingHours: ut.defaultOperatingHours,
          standardEquipment: ut.standardEquipment ?? Prisma.JsonNull,
          isSystemDefined: true,
          sortOrder: ut.sortOrder,
          isActive: ut.isActive ?? true,
        },
        create: {
          code: ut.code,
          name: ut.name,
          category: ut.category,
          usesRoomsDefault: ut.usesRoomsDefault,
          schedulableByDefault: ut.schedulableByDefault,
          bedBasedDefault: ut.bedBasedDefault,
          requiresPreAuthDefault: ut.requiresPreAuthDefault,
          defaultOperatingHours: ut.defaultOperatingHours,
          standardEquipment: ut.standardEquipment ?? Prisma.JsonNull,
          isSystemDefined: true,
          sortOrder: ut.sortOrder,
          isActive: ut.isActive ?? true,
        },
      });
    }

    // Seed policy definition + strict baseline (BLOCK at scheduling time)
    const def = await this.prisma.policyDefinition.upsert({
      where: { code: INFRA_POLICY.PROCEDURE_PRECHECK },
      update: {
        name: "Procedure Pre-check Policy",
        type: "INFRA",
        description: "Controls consent/anesthesia/checklist enforcement at scheduling and execution.",
      },
      create: {
        code: INFRA_POLICY.PROCEDURE_PRECHECK,
        name: "Procedure Pre-check Policy",
        type: "INFRA",
        description: "Controls consent/anesthesia/checklist enforcement at scheduling and execution.",
      },
      select: { id: true },
    });

    // Ensure one approved global baseline exists
    const hasApproved = await this.prisma.policyVersion.findFirst({
      where: { policyId: def.id, scope: "GLOBAL", status: "APPROVED" },
      select: { id: true },
    });

    if (!hasApproved) {
      await this.prisma.policyVersion.create({
        data: {
          policyId: def.id,
          scope: "GLOBAL",
          version: 1,
          status: "APPROVED",
          effectiveAt: new Date(),
          applyToAllBranches: true,
          payload: {
            scheduling: { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" },
          },
        },
      });
    }

    // Seed diagnostic packs (templates)
    for (const pack of DIAGNOSTIC_PACK_SEEDS) {
      const row = await this.prisma.diagnosticPack.upsert({
        where: { code: pack.code },
        update: {
          name: pack.name,
          labType: pack.labType,
          description: pack.description,
          isActive: true,
        },
        create: {
          code: pack.code,
          name: pack.name,
          labType: pack.labType,
          description: pack.description,
          isActive: true,
        },
        select: { id: true },
      });

      await this.prisma.diagnosticPackVersion.upsert({
        where: { packId_version: { packId: row.id, version: 1 } },
        update: {
          status: "ACTIVE",
          notes: "Seeded v1",
          payload: pack.payload,
        },
        create: {
          packId: row.id,
          version: 1,
          status: "ACTIVE",
          notes: "Seeded v1",
          payload: pack.payload,
        },
      });
    }
  }
}
