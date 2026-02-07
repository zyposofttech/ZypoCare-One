import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsBoolean,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

const STAFF_CATEGORY = ["MEDICAL", "NON_MEDICAL"] as const;
const ENGAGEMENT = ["EMPLOYEE", "CONSULTANT", "VISITING", "LOCUM", "CONTRACTOR", "INTERN", "TRAINEE", "VENDOR"] as const;

const ONBOARDING_STATUS = ["DRAFT", "IN_REVIEW", "ACTIVE"] as const;

// These mirror your create DTO shape, but are OPTIONAL to support edit + legacy migration.
// NOTE: Do NOT store any raw national_id in DB; backend will hash + last4 only.
export class StaffProfilePersonalDetailsPatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  last_name?: string;

  @IsOptional()
  @IsISO8601()
  dob?: string;

  @IsOptional()
  @IsIn(["MALE", "FEMALE", "OTHER"] as unknown as string[])
  gender?: "MALE" | "FEMALE" | "OTHER";

  // Raw value may be sent for hashing; it must never be persisted as plaintext.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  national_id?: string;
}

export class StaffProfileEmergencyContactPatchDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(24) phone?: string;
}

export class StaffProfileContactDetailsPatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  mobile_primary?: string;

  @IsOptional()
  @IsEmail()
  email_official?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  current_address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfileEmergencyContactPatchDto)
  emergency_contact?: StaffProfileEmergencyContactPatchDto;
}

export class StaffProfileEmploymentDetailsPatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  staff_category?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @IsOptional()
  @IsISO8601()
  date_of_joining?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  employment_status?: string;
}

export class StaffProfileMedicalDetailsPatchDto {
  @IsOptional() @IsString() @MaxLength(64) license_number?: string;
  @IsOptional() @IsString() @MaxLength(120) issuing_council?: string;
  @IsOptional() @IsString() @MaxLength(120) specialization?: string;
  @IsOptional() @IsString() @MaxLength(120) qualification?: string;

  @IsOptional()
  clinical_privileges?: string[];
}

export class StaffProfileSystemAccessPatchDto {
  @IsOptional()
  @IsBoolean()
  is_login_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  role_id?: string;
}

export class UpdateStaffDto {
  // ---------------- Legacy flat fields (kept) ----------------
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsOptional()
  @IsIn(STAFF_CATEGORY as unknown as string[])
  category?: (typeof STAFF_CATEGORY)[number];

  @IsOptional()
  @IsIn(ENGAGEMENT as unknown as string[])
  engagementType?: (typeof ENGAGEMENT)[number];

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  // ABDM/HPR
  @IsOptional()
  @IsString()
  @MaxLength(64)
  hprId?: string | null;

  @IsOptional()
  @IsString()
  homeBranchId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  // ---------------- Unified profile patch payload (preferred for Create/Edit parity) ----------------
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfilePersonalDetailsPatchDto)
  personal_details?: StaffProfilePersonalDetailsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfileContactDetailsPatchDto)
  contact_details?: StaffProfileContactDetailsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfileEmploymentDetailsPatchDto)
  employment_details?: StaffProfileEmploymentDetailsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfileMedicalDetailsPatchDto)
  medical_details?: StaffProfileMedicalDetailsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffProfileSystemAccessPatchDto)
  system_access?: StaffProfileSystemAccessPatchDto;

  // ---------------- Direct JSON column patches (advanced/internal) ----------------
  @IsOptional() @IsObject() personalDetails?: Record<string, any> | null;
  @IsOptional() @IsObject() contactDetails?: Record<string, any> | null;
  @IsOptional() @IsObject() employmentDetails?: Record<string, any> | null;
  @IsOptional() @IsObject() medicalDetails?: Record<string, any> | null;
  @IsOptional() @IsObject() systemAccess?: Record<string, any> | null;

  // ---------------- Onboarding + document pointers ----------------
  @IsOptional()
  @IsIn(ONBOARDING_STATUS as unknown as string[])
  onboardingStatus?: (typeof ONBOARDING_STATUS)[number];

  @IsOptional() @IsString() profilePhotoDocumentId?: string | null;
  @IsOptional() @IsString() signatureDocumentId?: string | null;
  @IsOptional() @IsString() stampDocumentId?: string | null;
}
