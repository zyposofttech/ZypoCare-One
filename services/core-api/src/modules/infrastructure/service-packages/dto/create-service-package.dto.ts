import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateServicePackageDto {
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

  @IsOptional()
  @IsString()
  payerGroup?: string | null;

  @IsOptional()
  @IsString()
  context?: string | null;
}
