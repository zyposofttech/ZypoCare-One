import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class FormularyItemDto {
  @IsString()
  drugMasterId!: string;

  @IsIn(["APPROVED", "RESTRICTED", "NON_FORMULARY"])
  tier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateFormularyDto {
  @IsOptional()
  @IsDateString()
  effectiveDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  /**
   * If true, auto-add all ACTIVE drugs from DrugMaster into this draft formulary.
   * This satisfies: "Bulk assign drugs to tiers" + default tier expectations.
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeAllActiveDrugs?: boolean;

  /**
   * Default tier used when includeAllActiveDrugs = true
   */
  @IsOptional()
  @IsIn(["APPROVED", "RESTRICTED", "NON_FORMULARY"])
  defaultTier?: string;

  /**
   * Clone items from another formulary version into the new DRAFT
   */
  @IsOptional()
  @IsString()
  cloneFromFormularyId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormularyItemDto)
  items?: FormularyItemDto[];
}
