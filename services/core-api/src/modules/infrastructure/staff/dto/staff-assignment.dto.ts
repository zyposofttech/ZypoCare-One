import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const ASSIGNMENT_TYPES = [
  "PERMANENT",
  "TEMPORARY",
  "ROTATION",
  "VISITING",
  "LOCUM",
  "CONTRACTOR",
  "DEPUTATION",
  "TRANSFER",
] as const;

const ASSIGNMENT_STATUS = ["ACTIVE", "PLANNED", "SUSPENDED", "ENDED"] as const;

export class StaffAssignmentInputDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  facilityId?: string | null;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  specialtyId?: string | null;

  @IsOptional()
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  branchEmpCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsOptional()
  @IsIn(ASSIGNMENT_TYPES as unknown as string[])
  assignmentType?: (typeof ASSIGNMENT_TYPES)[number];

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUS as unknown as string[])
  status?: (typeof ASSIGNMENT_STATUS)[number];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateStaffAssignmentDto {
  // branchId intentionally NOT editable here (treat branch move as “transfer” flow)

  @IsOptional()
  @IsString()
  facilityId?: string | null;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  specialtyId?: string | null;

  @IsOptional()
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  branchEmpCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsOptional()
  @IsIn(ASSIGNMENT_TYPES as unknown as string[])
  assignmentType?: (typeof ASSIGNMENT_TYPES)[number];

  @IsOptional()
  @IsIn(["ACTIVE", "PLANNED", "SUSPENDED"] as unknown as string[])
  status?: Exclude<(typeof ASSIGNMENT_STATUS)[number], "ENDED">;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class EndStaffAssignmentDto {
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string | null;
}
