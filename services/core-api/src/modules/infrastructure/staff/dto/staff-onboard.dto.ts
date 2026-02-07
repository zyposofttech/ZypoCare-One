import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { StaffAssignmentInputDto } from "./staff-assignment.dto";
import { StaffIdentifierInputDto } from "./staff-identifier.dto";

const STAFF_CATEGORY = ["MEDICAL", "NON_MEDICAL"] as const;
const ENGAGEMENT = ["EMPLOYEE", "CONSULTANT", "VISITING", "LOCUM", "CONTRACTOR", "INTERN", "TRAINEE", "VENDOR"] as const;

export class StaffOnboardDto {
  // If present, we will ADD assignments to an existing enterprise staff record (no duplication)
  @IsOptional()
  @IsString()
  existingStaffId?: string;

  // If duplicates are detected, require explicit override
  @IsOptional()
  @IsBoolean()
  forceCreate?: boolean;

  @IsString()
  @MaxLength(32)
  empCode!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsIn(STAFF_CATEGORY as unknown as string[])
  category!: (typeof STAFF_CATEGORY)[number];

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

  @IsArray()
  @ArrayMinSize(1)
  assignments!: StaffAssignmentInputDto[];

    // Optional DPDP-safe identifiers used for dedupe + compliance (hash + last4 stored)
  @IsOptional()
  @IsArray()
  identifiers?: StaffIdentifierInputDto[];

}
