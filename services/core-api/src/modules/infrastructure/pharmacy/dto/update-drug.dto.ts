import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateDrugDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  genericName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string | null;

  @IsOptional()
  @IsIn([
    "TABLET", "CAPSULE", "INJECTION", "SYRUP", "OINTMENT", "DROPS",
    "INHALER", "SUPPOSITORY", "PATCH", "POWDER", "IV_FLUID", "OTHER",
  ])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dosageForm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  strength?: string | null;

  @IsOptional()
  @IsIn([
    "ORAL", "IV", "IM", "SC", "TOPICAL", "INHALATION", "RECTAL",
    "OPHTHALMIC", "NASAL", "SUBLINGUAL", "TRANSDERMAL",
  ])
  route?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  therapeuticClass?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  pharmacologicalClass?: string | null;

  @IsOptional()
  @IsIn(["GENERAL", "H", "H1", "X", "G"])
  scheduleClass?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNarcotic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPsychotropic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isControlled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAntibiotic?: boolean;

  @IsOptional()
  @IsIn(["UNRESTRICTED", "RESTRICTED", "RESERVE"])
  antibioticStewardshipLevel?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isHighAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLasa?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mrp?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchasePrice?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  hsnCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gstRate?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  packSize?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  defaultDosage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  maxDailyDose?: string | null;

  @IsOptional()
  contraindications?: any;

  @IsOptional()
  @IsIn(["APPROVED", "RESTRICTED", "NON_FORMULARY"])
  formularyStatus?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "RECALLED"])
  status?: string;
}
