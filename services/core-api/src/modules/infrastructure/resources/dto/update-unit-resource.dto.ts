import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const RESOURCE_CATEGORIES = ["BED", "PROCEDURE", "DIAGNOSTIC", "CONSULTATION", "OTHER"] as const;

export class UpdateUnitResourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  assetTag?: string;

  @IsOptional()
  @IsIn(RESOURCE_CATEGORIES as unknown as string[])
  resourceCategory?: (typeof RESOURCE_CATEGORIES)[number];

  // Specifications
  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  // Capabilities
  @IsOptional()
  @IsBoolean()
  hasMonitor?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOxygenSupply?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSuction?: boolean;

  @IsOptional()
  @IsBoolean()
  hasVentilatorSupport?: boolean;

  @IsOptional()
  @IsBoolean()
  isPowerRequired?: boolean;

  // Scheduling
  @IsOptional()
  @IsBoolean()
  isSchedulable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  slotDurationMinutes?: number;

  // Maintenance
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  // Status
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  commissionedAt?: string;

  // State mgmt (future)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedPatientId?: string;
}
