/* =========================================================
   Diagnostics shared types (aligned to backend DTOs + Prisma)
   ========================================================= */

export type BranchRow = { id: string; code: string; name: string; city?: string | null };

export type DiagnosticKind = "LAB" | "IMAGING" | "PROCEDURE";
export type ResultDataType = "NUMERIC" | "TEXT" | "CHOICE" | "BOOLEAN";
export type TemplateKind = "IMAGING_REPORT" | "LAB_REPORT";

export type DiagnosticSectionType = "LAB" | "IMAGING" | "CARDIOLOGY" | "NEUROLOGY" | "PULMONOLOGY" | "OTHER";
export type DiagnosticCareContext = "OPD" | "IPD" | "ER" | "DAYCARE" | "HOMECARE" | "ALL";
export type DiagnosticPanelType = "PROFILE" | "PACKAGE";
export type DiagnosticRangeSource = "MANUFACTURER" | "HOSPITAL_DEFINED" | "LITERATURE" | "REGULATORY_BODY" | "CONSENSUS_GUIDELINE" | "OTHER";

export type SectionRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  type?: DiagnosticSectionType;
  headStaffId?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { categories: number; items: number };
};

export type CategoryRow = {
  id: string;
  branchId: string;
  sectionId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  section?: SectionRow;
};

export type SpecimenRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  container?: string | null;
  minVolumeMl?: number | null;
  handlingNotes?: string | null;
  fastingRequired?: boolean;
  fastingHours?: number | null;
  collectionInstructions?: string | null;
  storageTemperature?: string | null;
  isActive: boolean;
};

export type DiagnosticItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  kind: DiagnosticKind;
  sectionId: string;
  categoryId?: string | null;
  specimenId?: string | null;
  loincCode?: string | null;
  snomedCode?: string | null;
  searchAliases?: string[] | null;
  careContext?: DiagnosticCareContext;
  isPanel: boolean;
  panelType?: DiagnosticPanelType | null;
  tatMinsRoutine?: number | null;
  tatMinsStat?: number | null;
  preparationText?: string | null;
  consentRequired: boolean;
  requiresAppointment: boolean;
  requiresPcpndt?: boolean;
  sortOrder: number;
  isActive: boolean;
  section?: SectionRow;
  category?: CategoryRow | null;
  specimen?: SpecimenRow | null;
  _count?: { parameters: number; templates: number; panelChildren: number; panelParents: number };
};

export type PanelItemRow = { panelId: string; itemId: string; sortOrder: number; isActive: boolean; item?: DiagnosticItemRow };

export type ParameterRow = {
  id: string;
  testId: string;
  code: string;
  name: string;
  dataType: ResultDataType;
  unit?: string | null;
  precision?: number | null;
  allowedText?: string | null;
  isDerived?: boolean;
  formula?: string | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  isActive: boolean;
  ranges?: RangeRow[];
};

export type RangeRow = {
  id: string;
  parameterId: string;
  sex?: string | null;
  ageMinDays?: number | null;
  ageMaxDays?: number | null;
  low?: number | null;
  high?: number | null;
  textRange?: string | null;
  notes?: string | null;
  source?: DiagnosticRangeSource | null;
  isActive: boolean;
};

export type TemplateRow = {
  id: string;
  itemId: string;
  kind: TemplateKind;
  name: string;
  body: string;
  headerConfig?: any;
  footerConfig?: any;
  parameterLayout?: any;
  signatureRoles?: string[] | null;
  isActive: boolean;
};

/* ---- Service Points / Capabilities / Bootstrap ---- */

export type ServicePointType =
  | "LAB"
  | "RADIOLOGY"
  | "CARDIO_DIAGNOSTICS"
  | "NEURO_DIAGNOSTICS"
  | "PULMONARY_DIAGNOSTICS"
  | "ENDOSCOPY"
  | "OTHER";

export type LabType =
  | "LAB_CORE"
  | "RADIOLOGY"
  | "CARDIO"
  | "PULMONARY"
  | "ENDOSCOPY"
  | "MICROBIOLOGY"
  | "BIOCHEMISTRY"
  | "HEMATOLOGY"
  | "OTHER";

export type Modality =
  | "XRAY"
  | "ULTRASOUND"
  | "CT"
  | "MRI"
  | "MAMMOGRAPHY"
  | "FLUOROSCOPY"
  | "ECG"
  | "ECHO"
  | "TMT"
  | "HOLTER"
  | "PFT"
  | "EEG"
  | "EMG_NCV"
  | "LAB"
  | "SAMPLE_COLLECTION"
  | "PROCEDURE_ROOM"
  | "OTHER";

export type UnitRow = { id: string; code: string; name: string };
export type RoomRow = { id: string; code: string; name: string; unitId: string };
export type UnitResourceRow = { id: string; code: string; name: string; unitId: string; roomId?: string | null };
export type EquipmentAssetRow = { id: string; code: string; name: string; category?: string };

export type LocationTreeNode = {
  id: string;
  type: string;
  code: string;
  name: string;
  buildings?: LocationTreeNode[];
  floors?: LocationTreeNode[];
  zones?: LocationTreeNode[];
};

export type FlatLocationNode = { id: string; type: string; code: string; name: string; path: string };

export type DiagnosticServicePointRow = {
  id: string;
  branchId: string;
  locationNodeId: string;
  unitId?: string | null;
  code: string;
  name: string;
  type: ServicePointType;
  sortOrder: number;
  notes?: string | null;
  isActive: boolean;
  locationNode?: { id: string; type: string; code: string; name: string };
  unit?: UnitRow | null;
  operatingHours?: any;
  capacity?: number | null;
  _count?: { rooms: number; resources: number; equipment: number; staff?: number; sections?: number };
};

export type RoomMapRow = { id: string; branchId: string; servicePointId: string; roomId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; room?: any };
export type ResourceMapRow = { id: string; branchId: string; servicePointId: string; resourceId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; resource?: any };
export type EquipmentMapRow = { id: string; branchId: string; servicePointId: string; equipmentId: string; modality?: Modality | null; notes?: string | null; sortOrder: number; isActive: boolean; equipment?: any };

export type CapabilityRow = {
  id: string;
  branchId: string;
  servicePointId: string;
  diagnosticItemId: string;
  modality?: Modality | null;
  defaultDurationMins?: number | null;
  isPrimary: boolean;
  isActive: boolean;
  servicePoint?: DiagnosticServicePointRow;
  diagnosticItem?: DiagnosticItemRow;
  _count?: { allowedRooms: number; allowedResources: number; allowedEquipment: number };
};

export type AllowedRoomRow = { id: string; roomId: string; isActive: boolean; room?: any };
export type AllowedResourceRow = { id: string; resourceId: string; isActive: boolean; resource?: any };
export type AllowedEquipmentRow = { id: string; equipmentId: string; isActive: boolean; equipment?: any };
export type PackVersionStatus = "DRAFT" | "ACTIVE" | "RETIRED";
export type DiagnosticPackVersionRow = {
  id: string;
  packId: string;
  version: number;
  status: PackVersionStatus;
  notes?: string | null;
  payload: any;
  createdAt?: string;
};
export type DiagnosticPackRow = {
  id: string;
  code: string;
  name: string;
  labType?: string | null;
  description?: string | null;
  isActive: boolean;
  versions?: DiagnosticPackVersionRow[];
};

export type TabProps = { branchId: string };

export type GoLiveFix =
  | { kind: "catalog" }
  | { kind: "servicePoint"; servicePointId: string }
  | { kind: "panel"; panelId: string }
  | { kind: "labParams"; itemId: string }
  | { kind: "templates"; itemId: string }
  | { kind: "capability"; itemId: string; servicePointId?: string | null };
