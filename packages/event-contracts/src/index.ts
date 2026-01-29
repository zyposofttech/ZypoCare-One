// event-contracts
// Define the Subject Hierarchy we discussed earlier
export enum ZypoSubjects {
  // ADT (Admission, Discharge, Transfer)
  ADT_PATIENT_ADMITTED = 'zypo.main.adt.patient.admitted',
  ADT_BED_OCCUPIED = 'zypo.main.adt.bed.occupied',
  
  // Clinical
  CLINICAL_VITALS_UPDATE = 'zypo.main.clinical.vitals.update',
  
  // AI Commands (Request/Reply)
  AI_ANALYZE_CMD = 'zypo.main.ai.cmd.analyze',
  AI_ANALYZE_RESULT = 'zypo.main.ai.event.analysis.completed',
}

// Define the Payload Interface (Example)
export interface PatientAdmittedEvent {
  patientId: string;
  admissionDate: string;
  departmentId: string;
  severity: 'NORMAL' | 'CRITICAL';
}