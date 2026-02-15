import type {
  DiagnosticKind,
  ResultDataType,
  TemplateKind,
  ServicePointType,
  LabType,
  Modality,
} from "./types";

/* =========================================================
   Constants (aligned with backend enums)
   ========================================================= */

export const DIAG_KINDS: Array<{ value: DiagnosticKind; label: string }> = [
  { value: "LAB", label: "Lab" },
  { value: "IMAGING", label: "Imaging" },
  { value: "PROCEDURE", label: "Procedure" },
];

export const RESULT_TYPES: Array<{ value: ResultDataType; label: string }> = [
  { value: "NUMERIC", label: "Numeric" },
  { value: "TEXT", label: "Text" },
  { value: "CHOICE", label: "Choice" },
  { value: "BOOLEAN", label: "Yes/No" },
];

export const TEMPLATE_KINDS: Array<{ value: TemplateKind; label: string }> = [
  { value: "IMAGING_REPORT", label: "Imaging report" },
  { value: "LAB_REPORT", label: "Lab report" },
];

export const SERVICE_POINT_TYPES: Array<{ value: ServicePointType; label: string }> = [
  { value: "LAB", label: "Lab" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "CARDIO_DIAGNOSTICS", label: "Cardio diagnostics" },
  { value: "NEURO_DIAGNOSTICS", label: "Neuro diagnostics" },
  { value: "PULMONARY_DIAGNOSTICS", label: "Pulmonary diagnostics" },
  { value: "ENDOSCOPY", label: "Endoscopy" },
  { value: "OTHER", label: "Other" },
];

export const LAB_TYPE_OPTIONS: Array<{ value: LabType; label: string }> = [
  { value: "LAB_CORE", label: "Lab Core" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "CARDIO", label: "Cardio Diagnostics" },
  { value: "PULMONARY", label: "Pulmonary Diagnostics" },
  { value: "ENDOSCOPY", label: "Endoscopy Suite" },
  { value: "MICROBIOLOGY", label: "Microbiology Lab" },
  { value: "BIOCHEMISTRY", label: "Biochemistry Lab" },
  { value: "HEMATOLOGY", label: "Hematology Lab" },
  { value: "OTHER", label: "Other" },
];

export const MODALITIES: Array<{ value: Modality; label: string }> = [
  { value: "XRAY", label: "X-Ray" },
  { value: "ULTRASOUND", label: "Ultrasound" },
  { value: "CT", label: "CT" },
  { value: "MRI", label: "MRI" },
  { value: "MAMMOGRAPHY", label: "Mammography" },
  { value: "FLUOROSCOPY", label: "Fluoroscopy" },
  { value: "ECG", label: "ECG" },
  { value: "ECHO", label: "ECHO" },
  { value: "TMT", label: "TMT" },
  { value: "HOLTER", label: "Holter" },
  { value: "PFT", label: "PFT" },
  { value: "EEG", label: "EEG" },
  { value: "EMG_NCV", label: "EMG/NCV" },
  { value: "LAB", label: "Lab" },
  { value: "SAMPLE_COLLECTION", label: "Sample collection" },
  { value: "PROCEDURE_ROOM", label: "Procedure room" },
  { value: "OTHER", label: "Other" },
];
