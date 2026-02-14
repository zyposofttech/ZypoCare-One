import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsNumber,
} from "class-validator";
import {
  DiagnosticKind,
  DiagnosticResultDataType,
  DiagnosticTemplateKind,
  DiagnosticSectionType,
  DiagnosticCareContext,
  DiagnosticPanelType,
  DiagnosticRangeSource,
} from "../diagnostics.types";

// -------------------- Sections --------------------
export class ListSectionsQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(DiagnosticSectionType)
  type?: DiagnosticSectionType;

  @IsOptional()
  @IsString()
  headStaffId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateSectionDto {
  // branchId is optional to allow superadmin guards; enforced by service.
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DiagnosticSectionType)
  type?: DiagnosticSectionType;

  @IsOptional()
  @IsString()
  headStaffId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


// -------------------- Categories --------------------
export class ListCategoriesQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Specimens --------------------
export class ListSpecimensQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSpecimenDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  container?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  minVolumeMl?: number;

  @IsOptional()
  @IsString()
  handlingNotes?: string;

  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(72)
  fastingHours?: number;

  @IsOptional()
  @IsString()
  collectionInstructions?: string;

  @IsOptional()
  @IsString()
  storageTemperature?: string;
}

export class UpdateSpecimenDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  container?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  minVolumeMl?: number | null;

  @IsOptional()
  @IsString()
  handlingNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(72)
  fastingHours?: number | null;

  @IsOptional()
  @IsString()
  collectionInstructions?: string | null;

  @IsOptional()
  @IsString()
  storageTemperature?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Diagnostic Items --------------------
export class ListItemsQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsEnum(DiagnosticKind)
  kind?: DiagnosticKind;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isPanel?: boolean;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateDiagnosticItemDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DiagnosticKind)
  kind!: DiagnosticKind;

  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  // coding standards
  @IsOptional()
  @IsString()
  loincCode?: string;

  @IsOptional()
  @IsString()
  snomedCode?: string;

  @IsOptional()
  searchAliases?: string[];

  // care context
  @IsOptional()
  @IsEnum(DiagnosticCareContext)
  careContext?: DiagnosticCareContext;

  // lab
  @IsOptional()
  @IsString()
  specimenId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  tatMinsRoutine?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  tatMinsStat?: number;

  // imaging / procedures
  @IsOptional()
  @IsBoolean()
  requiresAppointment?: boolean;

  @IsOptional()
  @IsString()
  preparationText?: string;

  @IsOptional()
  @IsBoolean()
  consentRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPcpndt?: boolean;

  // panels
  @IsOptional()
  @IsBoolean()
  isPanel?: boolean;

  @IsOptional()
  @IsEnum(DiagnosticPanelType)
  panelType?: DiagnosticPanelType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  /**
   * Optional link to unified orderable catalog (ServiceItem)
   */
  @IsOptional()
  @IsString()
  serviceItemId?: string;
}

export class UpdateDiagnosticItemDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DiagnosticKind)
  kind?: DiagnosticKind;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  // coding standards
  @IsOptional()
  @IsString()
  loincCode?: string | null;

  @IsOptional()
  @IsString()
  snomedCode?: string | null;

  @IsOptional()
  searchAliases?: string[] | null;

  // care context
  @IsOptional()
  @IsEnum(DiagnosticCareContext)
  careContext?: DiagnosticCareContext;

  @IsOptional()
  @IsString()
  specimenId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  tatMinsRoutine?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  tatMinsStat?: number | null;

  @IsOptional()
  @IsBoolean()
  requiresAppointment?: boolean;

  @IsOptional()
  @IsString()
  preparationText?: string | null;

  @IsOptional()
  @IsBoolean()
  consentRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPcpndt?: boolean;

  @IsOptional()
  @IsBoolean()
  isPanel?: boolean;

  @IsOptional()
  @IsEnum(DiagnosticPanelType)
  panelType?: DiagnosticPanelType | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  /**
   * Optional link to unified orderable catalog (ServiceItem)
   */
  @IsOptional()
  @IsString()
  serviceItemId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Panel items --------------------
export class PanelItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class ReplacePanelItemsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PanelItemDto)
  items!: PanelItemDto[];
}

// -------------------- Parameters (Lab) --------------------
export class CreateParameterDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DiagnosticResultDataType)
  dataType!: DiagnosticResultDataType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  precision?: number;

  /**
   * For CHOICE: comma-separated values.
   */
  @IsOptional()
  @IsString()
  allowedText?: string;

  @IsOptional()
  @IsBoolean()
  isDerived?: boolean;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  criticalLow?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  criticalHigh?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateParameterDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DiagnosticResultDataType)
  dataType?: DiagnosticResultDataType;

  @IsOptional()
  @IsString()
  unit?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  precision?: number | null;

  @IsOptional()
  @IsString()
  allowedText?: string | null;

  @IsOptional()
  @IsBoolean()
  isDerived?: boolean;

  @IsOptional()
  @IsString()
  formula?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  criticalLow?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  criticalHigh?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Reference Ranges --------------------
export class CreateReferenceRangeDto {
  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMinDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMaxDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  low?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  high?: number;

  @IsOptional()
  @IsString()
  textRange?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(DiagnosticRangeSource)
  source?: DiagnosticRangeSource;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateReferenceRangeDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  sex?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMinDays?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMaxDays?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  low?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  high?: number | null;

  @IsOptional()
  @IsString()
  textRange?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(DiagnosticRangeSource)
  source?: DiagnosticRangeSource | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Report Templates (Imaging/Lab) --------------------
export class CreateTemplateDto {
  @IsOptional()
  @IsEnum(DiagnosticTemplateKind)
  kind?: DiagnosticTemplateKind;

  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Stored as plain text (MVP).
   */
  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  headerConfig?: any;

  @IsOptional()
  footerConfig?: any;

  @IsOptional()
  parameterLayout?: any;

  @IsOptional()
  signatureRoles?: string[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(DiagnosticTemplateKind)
  kind?: DiagnosticTemplateKind;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  headerConfig?: any;

  @IsOptional()
  footerConfig?: any;

  @IsOptional()
  parameterLayout?: any;

  @IsOptional()
  signatureRoles?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------- Additional list queries (kept unique to avoid name conflicts) --------------------
export class ListParametersQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  testId!: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

export class ListReferenceRangesQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  parameterId!: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

export class ListReportTemplatesQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
