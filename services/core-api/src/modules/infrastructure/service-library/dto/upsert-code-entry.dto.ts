import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertCodeEntryDto {
  @IsString()
  @MaxLength(96)
  code!: string;

  @IsString()
  @MaxLength(240)
  display!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  meta?: any;

  @IsOptional()
  @IsString()
  status?: string | null;
}
