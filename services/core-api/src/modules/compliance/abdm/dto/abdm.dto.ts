import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

// ────────────────────────────────────────────────────────────────
// ABDM Config
// ────────────────────────────────────────────────────────────────

export class CreateAbdmConfigDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(["SANDBOX", "PRODUCTION"])
  environment!: "SANDBOX" | "PRODUCTION";

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecretEnc?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  callbackUrls?: string[];

  @IsOptional()
  featureTogglesJson?: any;
}

export class UpdateAbdmConfigDto {
  @IsEnum(["SANDBOX", "PRODUCTION"])
  @IsOptional()
  environment?: "SANDBOX" | "PRODUCTION";

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientSecretEnc?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  callbackUrls?: string[];

  @IsOptional()
  featureTogglesJson?: any;
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
  systemsOfMedicine!: string[];

  @IsArray()
  @IsString({ each: true })
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

  @IsString()
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
  systemsOfMedicine?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
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

  @IsString()
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

  @IsEnum(["UNVERIFIED", "VERIFIED", "EXPIRED", "MISMATCH"])
  @IsOptional()
  registrationStatus?: "UNVERIFIED" | "VERIFIED" | "EXPIRED" | "MISMATCH";
}
