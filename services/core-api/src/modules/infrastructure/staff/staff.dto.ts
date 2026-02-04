import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class StaffOnboardAssignmentDto {
  @IsString() branchId!: string;

  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() specialtyId?: string;

  @IsOptional() @IsString() @MinLength(2) designation?: string;
  @IsOptional() @IsString() branchEmpCode?: string;

  @IsOptional()
  @IsEnum([
    "PERMANENT",
    "TEMPORARY",
    "ROTATION",
    "VISITING",
    "LOCUM",
    "CONTRACTOR",
    "TRAINEE",
    "SHARED_SERVICE",
  ])
  assignmentType?:
    | "PERMANENT"
    | "TEMPORARY"
    | "ROTATION"
    | "VISITING"
    | "LOCUM"
    | "CONTRACTOR"
    | "TRAINEE"
    | "SHARED_SERVICE";

  @IsOptional() @IsEnum(["ACTIVE", "ENDED", "SUSPENDED"]) status?: "ACTIVE" | "ENDED" | "SUSPENDED";

  @IsOptional() @IsBoolean() isPrimary?: boolean;

  @IsOptional() @IsISO8601() effectiveFrom?: string;
  @IsOptional() @IsISO8601() effectiveTo?: string;
}

export class StaffOnboardDto {
  @IsOptional() @IsString() staffNo?: string;

  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsString() displayName?: string;

  @IsOptional() @IsEnum(["MEDICAL", "NON_MEDICAL"]) category?: "MEDICAL" | "NON_MEDICAL";

  @IsOptional()
  @IsEnum([
    "EMPLOYEE",
    "CONSULTANT",
    "VISITING_CONSULTANT",
    "LOCUM",
    "CONTRACTOR",
    "VENDOR_STAFF",
    "INTERN",
    "TRAINEE",
  ])
  engagementType?:
    | "EMPLOYEE"
    | "CONSULTANT"
    | "VISITING_CONSULTANT"
    | "LOCUM"
    | "CONTRACTOR"
    | "VENDOR_STAFF"
    | "INTERN"
    | "TRAINEE";

  @IsOptional() @IsEnum(["ACTIVE", "SUSPENDED", "OFFBOARDED"]) status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED";

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;

  @IsOptional() @IsString() homeBranchId?: string;
  @IsOptional() @IsString() hprId?: string;

  @IsOptional() @IsString() designationPrimary?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffOnboardAssignmentDto)
  assignments!: StaffOnboardAssignmentDto[];
}

export class ProvisionUserDto {
  @IsEmail() email!: string;

  // role template code (e.g. DOCTOR / NURSE / BILLING_CLERK)
  @IsString() @MinLength(2) roleCode!: string;

  // Optional override display name for login (defaults to staff.fullName)
  @IsOptional() @IsString() @MinLength(2) name?: string;

  // Optional: choose a preferred primary branch among staff assignments
  @IsOptional() @IsString() primaryBranchId?: string;
}
