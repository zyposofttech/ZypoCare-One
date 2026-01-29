import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOrderSetDto {
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
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  channel?: string | null;
}
