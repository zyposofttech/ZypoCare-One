import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateStaffAssignmentDto {
  @IsString() @IsNotEmpty() staffId!: string;
  @IsString() @IsNotEmpty() role!: string; // OtStaffRole enum value
  @IsOptional() @IsString() defaultShift?: string;
}

export class UpdateStaffAssignmentDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() defaultShift?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSurgeonPrivilegeDto {
  @IsOptional() @IsString() theatreSpaceId?: string;
  @IsString() @IsNotEmpty() staffId!: string;
  @IsString() @IsNotEmpty() specialtyCode!: string;
  @IsString() @IsNotEmpty() effectiveFrom!: string;
  @IsOptional() @IsString() effectiveTo?: string;
}

export class CreateAnesthetistPrivilegeDto {
  @IsOptional() @IsString() theatreSpaceId?: string;
  @IsString() @IsNotEmpty() staffId!: string;
  @IsOptional() @IsInt() @Min(1) concurrentCaseLimit?: number;
  @IsString() @IsNotEmpty() effectiveFrom!: string;
  @IsOptional() @IsString() effectiveTo?: string;
}

export class CreateZoneAccessRuleDto {
  @IsString() @IsNotEmpty() spaceId!: string;
  @IsString() @IsNotEmpty() zone!: string; // OtZoneType enum value
  @IsArray() @IsString({ each: true }) allowedRoles!: string[];
}

export class CreateMinStaffingRuleDto {
  @IsOptional() @IsString() theatreSpaceId?: string;
  @IsString() @IsNotEmpty() surgeryCategory!: string; // OtSurgeryCategory enum value
  @IsOptional() @IsInt() @Min(0) minSurgeons?: number;
  @IsOptional() @IsInt() @Min(0) minAnesthetists?: number;
  @IsOptional() @IsInt() @Min(0) minScrubNurses?: number;
  @IsOptional() @IsInt() @Min(0) minCirculatingNurses?: number;
  @IsOptional() @IsInt() @Min(0) minOtTechnicians?: number;
  @IsOptional() @IsInt() @Min(0) minAnesthesiaTechnicians?: number;
}
