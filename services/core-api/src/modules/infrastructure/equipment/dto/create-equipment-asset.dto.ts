import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

/**
 * Equipment Register (EquipmentAsset)
 *
 * NOTE: Keep this DTO aligned to packages/db/prisma/schema.prisma.
 */
export class CreateEquipmentAssetDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsIn(["GENERAL", "RADIOLOGY", "ULTRASOUND"])
  category!: "GENERAL" | "RADIOLOGY" | "ULTRASOUND";

  @IsOptional()
  @IsString()
  make?: string | null;

  @IsOptional()
  @IsString()
  model?: string | null;

  @IsOptional()
  @IsString()
  serial?: string | null;

  @IsOptional()
  @IsString()
  ownerDepartmentId?: string | null;

  // Location binding
  @IsOptional()
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsString()
  roomId?: string | null;

  @IsOptional()
  @IsString()
  locationNodeId?: string | null;

  @IsOptional()
  @IsIn(["OPERATIONAL", "DOWN", "MAINTENANCE", "RETIRED"])
  operationalStatus?: "OPERATIONAL" | "DOWN" | "MAINTENANCE" | "RETIRED";

  // AMC/Warranty
  @IsOptional()
  @IsString()
  amcVendor?: string | null;

  @IsOptional()
  @IsDateString()
  amcValidFrom?: string | null;

  @IsOptional()
  @IsDateString()
  amcValidTo?: string | null;

  @IsOptional()
  @IsDateString()
  warrantyValidTo?: string | null;

  // Preventive Maintenance (PM)
  @IsOptional()
  @IsInt()
  @Min(1)
  pmFrequencyDays?: number | null;

  @IsOptional()
  @IsDateString()
  nextPmDueAt?: string | null;

  // Compliance (category-based)
  @IsOptional()
  @IsString()
  aerbLicenseNo?: string | null;

  @IsOptional()
  @IsDateString()
  aerbValidTo?: string | null;

  @IsOptional()
  @IsString()
  pcpndtRegNo?: string | null;

  @IsOptional()
  @IsDateString()
  pcpndtValidTo?: string | null;

  // Scheduling gate
  @IsOptional()
  @IsBoolean()
  isSchedulable?: boolean;
}
