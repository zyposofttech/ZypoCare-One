import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateServiceCatalogueDto {
  @IsOptional()
  @IsString()
  @MaxLength(48)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string | null;

  @IsOptional()
  @IsString()
  scope?: string | null;

  @IsOptional()
  @IsString()
  channel?: string | null;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  context?: string | null;

  @IsOptional()
  @IsString()
  payerGroup?: string | null;

  @IsOptional()
  @IsString()
  status?: string | null;
}
