import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
} from "class-validator";

export class SetBranchFacilitiesDto {
  @IsArray()
  @IsString({ each: true })
  facilityIds!: string[];
}

/* --------------------------------------------------------------------------
 * Departments
 * -------------------------------------------------------------------------- */

export class CreateDepartmentDto {
  /** Required only for GLOBAL principals; BRANCH principals derive from token. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Legacy support: if sent, service will respect it; otherwise DEPARTMENT_MASTER is used. */
  @IsOptional()
  @IsString()
  facilityId?: string;

  /** Optional hierarchy parent (same-branch only; service enforces depth/circular rules). */
  @IsOptional()
  @IsString()
  parentDepartmentId?: string | null;

  @Matches(/^[A-Z0-9_]{2,48}$/)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsIn(["CLINICAL", "SERVICE", "SUPPORT"])
  facilityType?: "CLINICAL" | "SERVICE" | "SUPPORT";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  costCenterCode?: string;

  /** Phone extensions for the department (e.g., ["221", "222"]). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];

  /** Operating hours JSON (validated in service via validator; DTO stays flexible). */
  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, any>;

  /** LocationNode ids tagged to this department (service enforces required + AREA+). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationNodeIds?: string[];

  /** Optional: if provided, must be included in locationNodeIds (service enforces). */
  @IsOptional()
  @IsString()
  primaryLocationNodeId?: string | null;

  /** Head of Department (Staff.id). */
  @IsOptional()
  @IsString()
  headStaffId?: string | null;

  /**
   * Optional: allow create-time specialty assignment.
   * For CLINICAL departments, DTO enforces at least 1 specialty (service enforces fully).
   */
  @ValidateIf((o: CreateDepartmentDto) => o.facilityType === "CLINICAL")
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  specialtyIds?: string[];

  /**
   * Optional: allow create-time primary specialty.
   * For CLINICAL, required by DTO (service enforces it must be within specialtyIds).
   */
  @ValidateIf((o: CreateDepartmentDto) => o.facilityType === "CLINICAL")
  @IsString()
  primarySpecialtyId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(["CLINICAL", "SERVICE", "SUPPORT"])
  facilityType?: "CLINICAL" | "SERVICE" | "SUPPORT";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  costCenterCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];

  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationNodeIds?: string[];

  @IsOptional()
  @IsString()
  primaryLocationNodeId?: string | null;

  @IsOptional()
  @IsString()
  headStaffId?: string | null;

  /** Optional hierarchy update (service enforces same-branch, no cycles, max depth). */
  @IsOptional()
  @IsString()
  parentDepartmentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDepartmentAssignmentsDto {
  @IsArray()
  @IsString({ each: true })
  doctorIds!: string[];

  @IsOptional()
  @IsString()
  headStaffId?: string | null;
}

export class DeactivateDepartmentDto {
  /** Default true in service/controller */
  @IsOptional()
  @IsBoolean()
  cascade?: boolean;

  /** If true, performs hard delete rules (controller/service decide). */
  @IsOptional()
  @IsBoolean()
  hard?: boolean;

  /** Required when hard !== true */
  @ValidateIf((o: DeactivateDepartmentDto) => o.hard !== true)
  @IsString()
  @MaxLength(280)
  reason!: string;
}

/* --------------------------------------------------------------------------
 * Specialties
 * -------------------------------------------------------------------------- */

export type SpecialtyKindDto = "SPECIALTY" | "SUPER_SPECIALTY";

export class CreateSpecialtyDto {
  /** Required only for GLOBAL principals; BRANCH principals derive from token. */
  @IsOptional()
  @IsString()
  branchId?: string;

  @Matches(/^[A-Z0-9_]{2,48}$/)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsIn(["SPECIALTY", "SUPER_SPECIALTY"])
  kind?: SpecialtyKindDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSpecialtyDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(["SPECIALTY", "SUPER_SPECIALTY"])
  kind?: SpecialtyKindDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetDepartmentSpecialtiesDto {
  @IsArray()
  @IsString({ each: true })
  specialtyIds!: string[];

  /** Optional: if provided, must be included in specialtyIds (service enforces) */
  @IsOptional()
  @IsString()
  primarySpecialtyId?: string | null;
}

/* --------------------------------------------------------------------------
 * Facility Catalog
 * -------------------------------------------------------------------------- */

export class CreateFacilityDto {
  @Matches(/^[A-Z0-9_]{2,48}$/)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsIn(["SERVICE", "CLINICAL", "SUPPORT"])
  category!: "SERVICE" | "CLINICAL" | "SUPPORT";

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
