import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCodeSetDto {
  @IsString()
  @MaxLength(64)
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
  kind?: string | null;
}
