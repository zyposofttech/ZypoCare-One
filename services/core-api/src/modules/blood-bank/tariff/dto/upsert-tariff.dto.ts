import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertTariffDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() componentMasterId?: string;
  @IsString() chargeType!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() @Min(0) gstPercent?: number;
  @IsOptional() @IsString() govSchemeCode?: string;
  @IsOptional() @IsNumber() @Min(0) govSchemeRate?: number;
}
