import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

const DOC_TYPES = [
  "PROFILE_PHOTO",
  "SIGNATURE",
  "STAMP",
  "ID_PROOF",
  "EDUCATION_DEGREE",
  "TRAINING_CERTIFICATE",
  "EMPLOYMENT_CONTRACT",
  "MEDICAL_REG_EVIDENCE",
  "OTHER",
] as const;

const DOC_VERIF = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;

export class CreateStaffDocumentDto {
  @IsOptional()
  @IsIn(DOC_TYPES as unknown as string[])
  type?: (typeof DOC_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  refNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuedBy?: string | null;

  @IsOptional()
  @IsDateString()
  issuedAt?: string | null;

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  // Storage pointer (frontend uploads to file service, then passes the URL here)
  @IsString()
  @MaxLength(512)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileMime?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string | null;

  @IsOptional()
  tags?: any;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  staffAssignmentId?: string | null;

  // If true, automatically sets Staff.profilePhotoDocumentId/signatureDocumentId/stampDocumentId based on type
  @IsOptional()
  @IsBoolean()
  setAsStaffPointer?: boolean;
}

export class UpdateStaffDocumentDto {
  @IsOptional() @IsIn(DOC_TYPES as unknown as string[]) type?: (typeof DOC_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(160) title?: string | null;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @MaxLength(80) refNo?: string | null;
  @IsOptional() @IsString() @MaxLength(120) issuedBy?: string | null;
  @IsOptional() @IsDateString() issuedAt?: string | null;
  @IsOptional() @IsDateString() validFrom?: string | null;
  @IsOptional() @IsDateString() validTo?: string | null;

  @IsOptional() @IsString() @MaxLength(512) fileUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) fileMime?: string | null;
  @IsOptional() @IsInt() @Min(0) fileSizeBytes?: number | null;
  @IsOptional() @IsString() @MaxLength(128) checksum?: string | null;

  @IsOptional() tags?: any;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsBoolean() setAsStaffPointer?: boolean;
}

export class VerifyStaffDocumentDto {
  @IsIn(DOC_VERIF as unknown as string[])
  verificationStatus!: (typeof DOC_VERIF)[number];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  verificationNotes?: string | null;
}
