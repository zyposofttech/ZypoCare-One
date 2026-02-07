import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateUnitDto {
  // Optional: move unit to another location node (must belong to same branch)
  @IsOptional()
  @IsString()
  locationNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  // Capacity (optional)
  @IsOptional()
  @IsInt()
  @Min(0)
  totalRoomCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalBedCapacity?: number;

  @IsOptional()
  @IsDateString()
  commissioningDate?: string;

  // Convenience metadata
  @IsOptional()
  @IsInt()
  @Min(0)
  floorNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  wingZone?: string;

  // Staff metadata
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

  // Active flag is managed by activate/deactivate flows. Allowed for backward compatibility.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
