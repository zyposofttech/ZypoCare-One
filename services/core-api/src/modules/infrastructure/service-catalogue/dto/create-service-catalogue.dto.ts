import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateServiceCatalogueDto {
  @IsString()
  @MaxLength(48)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string | null;

  // These are intentionally optional to keep compatibility across implementations.
  // If your schema uses enums for these, pass the enum string values.
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
}
