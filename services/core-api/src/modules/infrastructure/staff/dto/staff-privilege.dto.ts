import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const AREA = ["OPD", "IPD", "ER", "OT", "ICU", "DIAGNOSTICS", "LAB", "RADIOLOGY", "PHARMACY", "BILLING", "ADMIN"] as const;
const ACTION = ["VIEW", "ORDER", "PRESCRIBE", "PERFORM", "ATTEST", "DISCHARGE", "SIGN", "APPROVE", "OTHER"] as const;
const TARGET_TYPE = ["NONE", "SERVICE_ITEM", "DIAGNOSTIC_ITEM", "ORDER_SET", "OTHER"] as const;
const STATUS = ["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"] as const;

export class CreateStaffPrivilegeGrantDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  staffAssignmentId?: string | null;

  @IsIn(AREA as unknown as string[])
  area!: (typeof AREA)[number];

  @IsIn(ACTION as unknown as string[])
  action!: (typeof ACTION)[number];

  @IsOptional()
  @IsIn(TARGET_TYPE as unknown as string[])
  targetType?: (typeof TARGET_TYPE)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetId?: string | null;

  @IsOptional()
  targetMeta?: any;

  @IsOptional()
  @IsIn(STATUS as unknown as string[])
  status?: (typeof STATUS)[number];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string | null;
}

export class UpdateStaffPrivilegeGrantDto {
  @IsOptional() @IsIn(STATUS as unknown as string[]) status?: (typeof STATUS)[number];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string | null;

  @IsOptional()
  targetMeta?: any;
}
