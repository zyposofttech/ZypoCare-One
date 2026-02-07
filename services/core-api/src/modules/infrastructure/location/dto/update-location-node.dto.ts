import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";
import { RX_LOCATION_CODE_ANY } from "../../../../common/naming.util";

export class UpdateLocationNodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @Matches(RX_LOCATION_CODE_ANY)
  code?: string;

  // 2.2.2 Location Attributes
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  gpsLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  gpsLng?: number;

  // Stored on FLOOR nodes only
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floorNumber?: number;

  @IsOptional()
  @IsBoolean()
  wheelchairAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  stretcherAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyExit?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fireZone?: string;
}
