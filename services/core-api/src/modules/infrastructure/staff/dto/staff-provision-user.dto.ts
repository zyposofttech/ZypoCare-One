import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class StaffProvisionUserPreviewDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  // RoleTemplate code (e.g. DOCTOR / NURSE / BILLING_CLERK)
  @IsString()
  roleCode!: string;
}

export class StaffProvisionUserDto extends StaffProvisionUserPreviewDto {}
