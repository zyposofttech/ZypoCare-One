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

// --- Optional approval workflow helpers ---
// These do not require schema changes; they map to status transitions.
export class ApproveStaffAssignmentDto {
  // When approved, assignment status transitions to ACTIVE.
  // You may optionally set an activation date (defaults to now).
  @IsOptional()
  @IsDateString()
  activatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string | null;
}

export class RejectStaffAssignmentDto extends EndStaffAssignmentDto {}

// Compatibility with workflow addendum: /staff-branch-assignments/:id/approval
export class StaffAssignmentApprovalDto {
  @IsIn(["APPROVED", "REJECTED"] as unknown as string[])
  approvalStatus!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsDateString()
  actionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  approvalRemarks?: string | null;
}
