import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Length, Matches } from "class-validator";

export const UNIT_CATEGORIES = [
  "OUTPATIENT",
  "INPATIENT",
  "CRITICAL_CARE",
  "PROCEDURE",
  "DIAGNOSTIC",
  "SUPPORT",
] as const;

export class CreateUnitTypeCatalogDto {
  @IsString()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_-]+$/, { message: "Code can contain only A–Z, 0–9, underscore (_) and hyphen (-)." })
  code!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  // ✅ New: classification
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

  // ✅ New: bed-based characteristic
  @IsOptional()
  @IsBoolean()
  bedBasedDefault?: boolean;

  // ✅ New: insurance/authorization flag
  @IsOptional()
  @IsBoolean()
  requiresPreAuthDefault?: boolean;

  // ✅ New: defaults (stored as JSON)
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
}
