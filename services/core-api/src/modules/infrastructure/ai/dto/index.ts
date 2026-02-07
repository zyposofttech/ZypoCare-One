import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";

// ─── Hospital Profile (Smart Defaults Input) ────────────────────────────
export class HospitalProfileDto {
  @IsNumber() @Min(1) @Max(2000)
  bedCount!: number;

  @IsString()
  hospitalType!: string; // NURSING_HOME | CLINIC | SINGLE_SPECIALTY | MULTI_SPECIALTY | SUPER_SPECIALTY | TEACHING

  @IsString()
  cityTier!: string; // TIER_1 | TIER_2 | TIER_3 | RURAL

  @IsArray() @IsString({ each: true })
  specialties!: string[];

  @IsOptional() @IsBoolean()
  hasEmergency?: boolean;

  @IsOptional() @IsBoolean()
  hasICU?: boolean;

  @IsOptional() @IsBoolean()
  hasOT?: boolean;

  @IsOptional() @IsBoolean()
  hasBloodBank?: boolean;

  @IsOptional() @IsBoolean()
  hasDialysis?: boolean;

  @IsOptional() @IsBoolean()
  hasRadiology?: boolean;

  @IsOptional() @IsString()
  targetAccreditation?: string; // NABH | NABH_ENTRY | NONE
}

// ─── Template Recommendation ────────────────────────────────────────────
export class TemplateRecommendDto {
  @IsNumber() @Min(0) @Max(2000)
  bedCount!: number;

  @IsOptional() @IsNumber() @Min(0) @Max(50)
  specialtyCount?: number;

  @IsOptional() @IsString()
  hospitalType?: string;
}

// ─── Department Suggestion ──────────────────────────────────────────────
export class DepartmentSuggestDto {
  @IsArray() @IsString({ each: true })
  specialties!: string[];

  @IsOptional() @IsString()
  hospitalType?: string;
}

// ─── Diagnostic Pack Suggestion ─────────────────────────────────────────
export class DiagnosticPackSuggestDto {
  @IsArray() @IsString({ each: true })
  specialties!: string[];
}

// ─── Branch Query (common param) ────────────────────────────────────────
export class BranchQueryDto {
  @IsOptional() @IsString()
  branchId?: string;
}

// ─── GSTIN Validation ───────────────────────────────────────────────────
export class ValidateGstinDto {
  @IsString()
  gstin!: string;
}

// ─── PAN Validation ─────────────────────────────────────────────────────
export class ValidatePanDto {
  @IsString()
  pan!: string;
}

// ─── Credential Alert Query ─────────────────────────────────────────────
export class CredentialAlertQueryDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(365)
  days?: number;
}

// ─── Privilege Gap Query ────────────────────────────────────────────────
export class PrivilegeGapQueryDto {
  @IsOptional() @IsString()
  branchId?: string;
}

// ─── Equipment Compliance Query ─────────────────────────────────────────
export class EquipmentComplianceQueryDto {
  @IsOptional() @IsString()
  branchId?: string;
}

// ─── Fix Suggestions Query ──────────────────────────────────────────────
export class FixSuggestionsQueryDto {
  @IsOptional() @IsString()
  branchId?: string;
}
