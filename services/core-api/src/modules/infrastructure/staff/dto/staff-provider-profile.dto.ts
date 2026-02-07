import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertStaffProviderProfileDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  providerCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  specialtyId?: string | null;

  // Flexible hooks for future modules
  @IsOptional()
  consultationModes?: any;

  @IsOptional()
  schedulingProfile?: any;

  @IsOptional()
  billingProfile?: any;

  @IsOptional()
  clinicalProfile?: any;
}
