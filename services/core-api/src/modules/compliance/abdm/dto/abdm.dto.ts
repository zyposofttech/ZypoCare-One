import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export enum AbdmEnvironment {
  SANDBOX = "SANDBOX",
  PRODUCTION = "PRODUCTION",
}

export enum HprRegistrationStatus {
  UNVERIFIED = "UNVERIFIED",
  VERIFIED = "VERIFIED",
  EXPIRED = "EXPIRED",
  MISMATCH = "MISMATCH",
}

/**
 * ABDM Config (ABHA)
 * Supports BOTH:
 * - New format: clientSecretEnc, callbackUrls[], featureTogglesJson
 * - Legacy/FE-friendly: clientSecret, callbackUrlsText, enable* booleans
 */
export class CreateAbdmConfigDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(AbdmEnvironment)
  environment!: AbdmEnvironment;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientId?: string;

  /** Preferred field stored in DB (still treated as sensitive) */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecretEnc?: string;

  /** Legacy alias from UI */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecret?: string;

  /** Preferred field */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  callbackUrls?: string[];

  /** Legacy alias from UI textarea */
  @IsString()
  @IsOptional()
  callbackUrlsText?: string;

  /** Preferred structure */
  @IsOptional()
  featureTogglesJson?: any;

  /** Legacy toggles (service maps -> featureTogglesJson) */
  @IsBoolean()
  @IsOptional()
  enableAbhaLinking?: boolean;

  @IsBoolean()
  @IsOptional()
  enableConsentFlow?: boolean;

  @IsBoolean()
  @IsOptional()
  enableHealthRecords?: boolean;
}

export class UpdateAbdmConfigDto {
  @IsEnum(AbdmEnvironment)
  @IsOptional()
  environment?: AbdmEnvironment;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecretEnc?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecret?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  callbackUrls?: string[];

  @IsString()
  @IsOptional()
  callbackUrlsText?: string;

  @IsOptional()
  featureTogglesJson?: any;

  @IsBoolean()
  @IsOptional()
  enableAbhaLinking?: boolean;

  @IsBoolean()
  @IsOptional()
  enableConsentFlow?: boolean;

  @IsBoolean()
  @IsOptional()
  enableHealthRecords?: boolean;
}

// ────────────────────────────────────────────────────────────────
// HFR Profile (Health Facility Registry)
// ────────────────────────────────────────────────────────────────

export class CreateHfrProfileDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  @MaxLength(300)
  facilityName!: string;

  @IsString()
  @MaxLength(100)
  ownershipType!: string;

  @IsString()
  @MaxLength(100)
  facilityType!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  systemsOfMedicine!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  servicesOffered!: string[];

  @IsString()
  @MaxLength(500)
  addressLine1!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  addressLine2?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsString()
  @MaxLength(10)
  pincode!: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  contactEmail?: string;
}

export class UpdateHfrProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  facilityName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  ownershipType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  facilityType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  systemsOfMedicine?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(200)
  servicesOffered?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  addressLine1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  addressLine2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  pincode?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  contactEmail?: string;
}

// ────────────────────────────────────────────────────────────────
// HPR Link (Health Professional Registry)
// ────────────────────────────────────────────────────────────────

export class CreateHprLinkDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  staffId!: string;

  @IsString()
  @MaxLength(100)
  hprId!: string;

  @IsString()
  @MaxLength(100)
  category!: string;
}

export class UpdateHprLinkDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsEnum(HprRegistrationStatus)
  @IsOptional()
  registrationStatus?: HprRegistrationStatus;
}

export class BulkImportHprDto {
  @IsString()
  workspaceId!: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @IsOptional()
  links?: Array<{ staffId: string; hprId: string; category: string }>;
}
