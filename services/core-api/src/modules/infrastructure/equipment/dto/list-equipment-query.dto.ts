import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListEquipmentQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(["GENERAL", "RADIOLOGY", "ULTRASOUND"])
  category?: "GENERAL" | "RADIOLOGY" | "ULTRASOUND";

  @IsOptional()
  @IsIn(["OPERATIONAL", "DOWN", "MAINTENANCE", "RETIRED"])
  operationalStatus?: "OPERATIONAL" | "DOWN" | "MAINTENANCE" | "RETIRED";

  @IsOptional()
  @IsString()
  ownerDepartmentId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  locationNodeId?: string;

  /**
   * Set `0` for "already due".
   * Set `N` for "due within next N days".
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pmDueInDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amcExpiringInDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  warrantyExpiringInDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  complianceExpiringInDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
