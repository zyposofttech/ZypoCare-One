import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class StaffLinkUserDto {
  @IsString()
  userId!: string;

  // Optional override role template code (e.g. DOCTOR / NURSE / BILLING_CLERK)
  @IsOptional()
  @IsString()
  @MinLength(2)
  roleCode?: string;

  // Optional preferred primary branch among staff assignments
  @IsOptional()
  @IsString()
  primaryBranchId?: string;

  // If staff already has a linked user, allow replacing it (will disable old user)
  @IsOptional()
  @IsBoolean()
  forceRelink?: boolean;

  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class StaffUnlinkUserDto {
  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
