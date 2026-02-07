import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const CRED_TYPES = ["MEDICAL_REG", "NURSING_REG", "PHARMACY_REG", "TECH_CERT", "OTHER"] as const;
const VERIF = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;

export class CreateStaffCredentialDto {
  @IsOptional()
  @IsIn(CRED_TYPES as unknown as string[])
  type?: (typeof CRED_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authority?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string | null;

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @IsOptional()
  @IsIn(VERIF as unknown as string[])
  verificationStatus?: (typeof VERIF)[number];

  @IsOptional()
  @IsString()
  documentUrl?: string | null;
}

export class UpdateStaffCredentialDto extends CreateStaffCredentialDto {}
