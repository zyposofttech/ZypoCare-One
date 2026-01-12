import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";

export class SetBranchFacilitiesDto {
  @IsArray()
  @IsString({ each: true })
  facilityIds!: string[];
}

export class CreateDepartmentDto {
  /** Required only for GLOBAL principals; BRANCH principals derive from token. */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  facilityId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

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

/* --------------------------------------------------------------------------
 * Specialties
 * -------------------------------------------------------------------------- */
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
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSpecialtyDto {

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetDepartmentSpecialtiesDto {
  @IsArray()
  @IsString({ each: true })
  specialtyIds!: string[];

  /** Optional: if provided, must be included in specialtyIds */
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
