import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const GENDER = ["MALE", "FEMALE", "OTHER"] as const;
const STAFF_CATEGORY = ["DOCTOR", "NURSE", "PARAMEDIC", "ADMIN", "IT", "SUPPORT", "HR"] as const;
const EMPLOYMENT_STATUS = ["PERMANENT", "CONTRACT", "VISITING"] as const;
const CLINICAL_PRIVILEGES = ["OPD", "IPD", "SURGERY", "ER"] as const;

export class StaffCreatePersonalDetailsDto {
  @IsString()
  @MinLength(1)
  first_name!: string;

  @IsString()
  @MinLength(1)
  last_name!: string;

  @IsDateString()
  dob!: string;

  @IsIn(GENDER as unknown as string[])
  gender!: (typeof GENDER)[number];

  // Raw value is accepted for validation + hashing; it must NOT be stored as plaintext.
  @IsString()
  @MinLength(3)
  national_id!: string;
}

export class StaffCreateEmergencyContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class StaffCreateContactDetailsDto {
  // E.164 compliant phone number
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  mobile_primary!: string;

  @IsEmail()
  email_official!: string;

  @IsString()
  current_address!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffCreateEmergencyContactDto)
  emergency_contact?: StaffCreateEmergencyContactDto;
}

export class StaffCreateEmploymentDetailsDto {
  @IsIn(STAFF_CATEGORY as unknown as string[])
  staff_category!: (typeof STAFF_CATEGORY)[number];

  // In your system this will typically be a DepartmentId (string), but we keep it as a string
  // to match the provided JSON schema.
  @IsString()
  department!: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsDateString()
  date_of_joining!: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_STATUS as unknown as string[])
  employment_status?: (typeof EMPLOYMENT_STATUS)[number];
}

export class StaffCreateMedicalDetailsDto {
  @IsString()
  @MinLength(2)
  license_number!: string;

  @IsString()
  @MinLength(2)
  issuing_council!: string;

  @IsString()
  @MinLength(2)
  specialization!: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsIn(CLINICAL_PRIVILEGES as unknown as string[], { each: true })
  clinical_privileges?: (typeof CLINICAL_PRIVILEGES)[number][];
}

export class StaffCreateSystemAccessDto {
  @IsOptional()
  @IsBoolean()
  is_login_enabled?: boolean;

  @IsOptional()
  @IsString()
  role_id?: string;
}

export class StaffCreateMasterDto {
  @IsString()
  @MinLength(3)
  employee_id!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => StaffCreatePersonalDetailsDto)
  personal_details!: StaffCreatePersonalDetailsDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => StaffCreateContactDetailsDto)
  contact_details!: StaffCreateContactDetailsDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => StaffCreateEmploymentDetailsDto)
  employment_details!: StaffCreateEmploymentDetailsDto;

  // Required only if staff_category is DOCTOR, NURSE, or PARAMEDIC
  @ValidateIf((o: StaffCreateMasterDto) => {
    const cat = o?.employment_details?.staff_category;
    return cat === "DOCTOR" || cat === "NURSE" || cat === "PARAMEDIC";
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => StaffCreateMedicalDetailsDto)
  medical_details?: StaffCreateMedicalDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffCreateSystemAccessDto)
  system_access?: StaffCreateSystemAccessDto;

  // If duplicates are detected, require explicit override
  @IsOptional()
  @IsBoolean()
  force_create?: boolean;
}
