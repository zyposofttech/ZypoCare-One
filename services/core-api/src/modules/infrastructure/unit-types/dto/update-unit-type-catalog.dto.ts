import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Length, Matches } from "class-validator";
import { UNIT_CATEGORIES } from "./create-unit-type-catalog.dto";

export class UpdateUnitTypeCatalogDto {
  @IsOptional()
  @IsString()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_-]+$/, { message: "Code can contain only A–Z, 0–9, underscore (_) and hyphen (-)." })
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(UNIT_CATEGORIES as unknown as string[])
  category?: (typeof UNIT_CATEGORIES)[number];

  @IsOptional()
  @IsBoolean()
  usesRoomsDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  schedulableByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  bedBasedDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPreAuthDefault?: boolean;

  @IsOptional()
  @IsObject()
  defaultOperatingHours?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  standardEquipment?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystemDefined?: boolean;

  @IsOptional()
  sortOrder?: number;
}
