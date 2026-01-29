import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpsertServiceChargeMappingDto {
  @IsString()
  serviceItemId!: string;

  @IsString()
  chargeMasterItemId!: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}