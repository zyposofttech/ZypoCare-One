import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
} from "class-validator";
import { RESOURCE_TYPES, RX_RESOURCE_CODE_ANY } from "../../../../common/naming.util";
import type { ResourceType } from "../../../../common/naming.util";

const RESOURCE_CATEGORIES = ["BED", "PROCEDURE", "DIAGNOSTIC", "CONSULTATION", "OTHER"] as const;

const RESOURCE_STATES = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "MAINTENANCE",
  "BLOCKED",
  "INACTIVE",
  "SANITIZATION",
] as const;

export class CreateUnitResourceDto {
  // FK
  @IsString()
  unitId!: string;

  // FK to Room (null for mobile resources)
  @IsOptional()
  @IsString()
  roomId?: string | null;

  // Code + name
  @IsIn(RESOURCE_TYPES as unknown as ResourceType[])
  resourceType!: ResourceType;

  @Matches(RX_RESOURCE_CODE_ANY)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  // Physical asset tag
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assetTag?: string;

  // Category (optional — service will default based on type)
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

  // State (initial)
  @IsOptional()
  @IsIn(RESOURCE_STATES as unknown as string[])
  state?: (typeof RESOURCE_STATES)[number];

  // Used when state is RESERVED or BLOCKED
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

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
