import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

const ROOM_TYPES = [
  "CONSULTATION",
  "PROCEDURE",
  "EXAMINATION",
  "PATIENT_ROOM",
  "ISOLATION",
  "NEGATIVE_PRESSURE",
  "POSITIVE_PRESSURE",
  "NURSING_STATION",
  "WAITING",
  "STORAGE",
  "UTILITY",
  "RECOVERY",
] as const;

const PRICING_TIERS = ["ECONOMY", "STANDARD", "DELUXE", "SUITE", "VIP"] as const;

const ISOLATION_TYPES = ["CONTACT", "DROPLET", "AIRBORNE", "PROTECTIVE"] as const;

const MAINTENANCE_STATUSES = [
  "OPERATIONAL",
  "UNDER_MAINTENANCE",
  "CLEANING_IN_PROGRESS",
  "BLOCKED",
  "OUT_OF_SERVICE",
] as const;

export class CreateUnitRoomDto {
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @Transform(({ value }) => String(value ?? "").trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @Length(2, 32, { message: "Room code must be between 2 and 32 characters." })
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/, {
    message:
      "Room code can contain only A–Z, 0–9, underscore (_) and hyphen (-), and must start with A–Z/0–9.",
  })
  code!: string;

  // ✅ Required by your interface
  @Transform(({ value }) => String(value ?? "").trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @Length(1, 32, { message: "Room number must be between 1 and 32 characters." })
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/, {
    message:
      "Room number can contain only A–Z, 0–9, underscore (_) and hyphen (-), and must start with A–Z/0–9.",
  })
  roomNumber!: string;

  @Transform(({ value }) => String(value ?? "").trim())
  @IsString()
  @IsNotEmpty()
  @Length(2, 160, { message: "Room name must be between 2 and 160 characters." })
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim().toUpperCase()))
  @IsIn(ROOM_TYPES as unknown as string[])
  roomType?: (typeof ROOM_TYPES)[number];

  // Physical Attributes
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  areaSqFt?: number;

  @IsOptional() @IsBoolean() hasAttachedBathroom?: boolean;
  @IsOptional() @IsBoolean() hasAC?: boolean;
  @IsOptional() @IsBoolean() hasTV?: boolean;
  @IsOptional() @IsBoolean() hasOxygen?: boolean;
  @IsOptional() @IsBoolean() hasSuction?: boolean;
  @IsOptional() @IsBoolean() hasVentilator?: boolean;
  @IsOptional() @IsBoolean() hasMonitor?: boolean;
  @IsOptional() @IsBoolean() hasCallButton?: boolean;

  // Capacity
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxOccupancy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  currentOccupancy?: number;

  // Pricing
  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim().toUpperCase()))
  @IsIn(PRICING_TIERS as unknown as string[])
  pricingTier?: (typeof PRICING_TIERS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  baseChargePerDay?: number;

  // Isolation
  @IsOptional()
  @IsBoolean()
  isIsolation?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim().toUpperCase()))
  @IsIn(ISOLATION_TYPES as unknown as string[])
  isolationType?: (typeof ISOLATION_TYPES)[number];

  // Status
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim().toUpperCase()))
  @IsIn(MAINTENANCE_STATUSES as unknown as string[])
  maintenanceStatus?: (typeof MAINTENANCE_STATUSES)[number];

  @IsOptional()
  @IsISO8601()
  lastCleanedAt?: string;
}
