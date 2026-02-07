import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
} from "class-validator";
import { RX_UNIT_CODE } from "../../../../common/naming.util";

export class CreateUnitDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  departmentId!: string;

  @IsString()
  unitTypeId!: string;

  // Unit must be bound to a specific location node under the branch
  @IsString()
  locationNodeId!: string;

  @Matches(RX_UNIT_CODE)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  /**
   * Onboarding capacity (optional).
   * - For room-based units, provide expected/initial total rooms.
   * - For open-bay units, backend will coerce to 0.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  totalRoomCount?: number;

  /**
   * Onboarding capacity (optional).
   * - For bed-based unit types, backend will enforce >= 1 if provided.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  totalBedCapacity?: number;

  // Optional commissioning/onboarded date (ISO string)
  @IsOptional()
  @IsDateString()
  commissioningDate?: string;

  // Convenience metadata (optional; can also be derived from Location tree)
  @IsOptional()
  @IsInt()
  @Min(0)
  floorNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  wingZone?: string;

  // Staff metadata (optional; staff module can later formalize this as a relation)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inchargeStaffId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nursingStation?: string;

  // Deprecated: derived from UnitTypeCatalog. Allowed for backward compatibility; service may ignore.
  @IsOptional()
  @IsBoolean()
  usesRooms?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
