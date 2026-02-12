import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const SEVERITIES = ["MAJOR", "MODERATE", "MINOR"] as const;
const SOURCES = ["STANDARD", "CUSTOM"] as const;

export class CreateDrugInteractionDto {
  @IsString()
  drugAId!: string;

  @IsString()
  drugBId!: string;

  @IsIn(SEVERITIES)
  severity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recommendation?: string | null;

  @IsOptional()
  @IsIn(SOURCES)
  source?: string;
}

export class UpdateDrugInteractionDto {
  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recommendation?: string | null;
}
