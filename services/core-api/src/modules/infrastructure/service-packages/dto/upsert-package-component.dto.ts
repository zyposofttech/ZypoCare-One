import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertPackageComponentDto {
  @IsString()
  serviceItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean;

  @IsOptional()
  rules?: any;
}
