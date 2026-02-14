export enum DiagnosticKind {
  LAB = "LAB",
  IMAGING = "IMAGING",
  PROCEDURE = "PROCEDURE",
}

export enum DiagnosticResultDataType {
  NUMERIC = "NUMERIC",
  TEXT = "TEXT",
  BOOLEAN = "BOOLEAN",
  CHOICE = "CHOICE",
}

export enum DiagnosticTemplateKind {
  IMAGING_REPORT = "IMAGING_REPORT",
  LAB_REPORT = "LAB_REPORT",
}

export enum DiagnosticSectionType {
  LAB = "LAB",
  IMAGING = "IMAGING",
  CARDIOLOGY = "CARDIOLOGY",
  NEUROLOGY = "NEUROLOGY",
  PULMONOLOGY = "PULMONOLOGY",
  OTHER = "OTHER",
}

export enum DiagnosticCareContext {
  OPD = "OPD",
  IPD = "IPD",
  ER = "ER",
  DAYCARE = "DAYCARE",
  HOMECARE = "HOMECARE",
  ALL = "ALL",
}

export enum DiagnosticPanelType {
  PROFILE = "PROFILE",
  PACKAGE = "PACKAGE",
}

export enum DiagnosticRangeSource {
  MANUFACTURER = "MANUFACTURER",
  HOSPITAL_DEFINED = "HOSPITAL_DEFINED",
  LITERATURE = "LITERATURE",
  REGULATORY_BODY = "REGULATORY_BODY",
  CONSENSUS_GUIDELINE = "CONSENSUS_GUIDELINE",
  OTHER = "OTHER",
}
